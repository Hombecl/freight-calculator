/**
 * exportPlan.ts — turn a load plan into shareable artifacts.
 *
 * Zero dependencies. CSV is a real file download; the PDF is produced through
 * the browser's own print-to-PDF on a clean printable page (no jsPDF/html2canvas
 * bundle cost). This is the deliverable freight forwarders actually pay for.
 */

import type { PlannerBox } from '../components/InteractiveLoadPlanner';
import type { PackStats, ZoneInfo, PackContainer } from './binPacking';

export interface PlanMeta {
  title: string;
  containerLabel: string;
  container: PackContainer;
  unit: string; // 'cm'
  weightUnit?: string; // 'kg'
  date: string; // caller supplies (Date.now not available in some runtimes)
}

import { loadingSequence } from './realism';

const esc = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Which load zone a box falls in, judged by its centre X (robust at borders). */
const zoneOf = (b: PlannerBox, zones: ZoneInfo[]) => {
  const cx = b.px + b.l / 2;
  return zones.find((z) => cx >= z.xStart && cx < z.xEnd)?.unloadOrder
    ?? zones[zones.length - 1]?.unloadOrder ?? '';
};

export function toPackingCSV(
  boxes: PlannerBox[], zones: ZoneInfo[], meta: PlanMeta,
): string {
  const header = [
    'LoadOrder', 'Label', 'Group', 'UnloadOrder', 'Zone',
    `L(${meta.unit})`, `W(${meta.unit})`, `H(${meta.unit})`,
    `Weight(${meta.weightUnit ?? 'kg'})`,
    `PosX(${meta.unit})`, `PosY(${meta.unit})`, `PosZ(${meta.unit})`,
  ];
  const rows = loadingSequence(boxes).map((b, i) => [
    i + 1, b.label, b.group ?? '', b.unloadOrder ?? '', zoneOf(b, zones),
    b.l, b.w, b.h, b.weight ?? '',
    Math.round(b.px), Math.round(b.py), Math.round(b.pz),
  ]);
  return [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
}

export function downloadText(filename: string, text: string, mime = 'text/csv') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface PrintablePlanOpts {
  meta: PlanMeta;
  stats: PackStats;
  zones: ZoneInfo[];
  boxes: PlannerBox[];
  totalRequested: number;
  imageDataUrl: string | null;
}

/** Open a clean printable page and trigger the browser's print/save-as-PDF. */
export function openPrintablePlan(opts: PrintablePlanOpts) {
  const win = window.open('', '_blank');
  if (!win) return; // pop-up blocked
  win.document.write(buildPrintableHTML(opts));
  win.document.close();
}

/** Pure HTML builder for the printable plan (also used to render previews). */
export function buildPrintableHTML(opts: PrintablePlanOpts): string {
  const { meta, stats, zones, boxes, totalRequested, imageDataUrl } = opts;

  const rows = loadingSequence(boxes).map((b, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><span class="sw" style="background:#${b.color.toString(16).padStart(6, '0')}"></span>${escapeHtml(b.label)}</td>
      <td>${escapeHtml(b.group ?? '')}</td>
      <td>${b.unloadOrder ?? ''}</td>
      <td>${b.l}×${b.w}×${b.h}</td>
      <td>${b.weight ?? ''}</td>
      <td>${Math.round(b.px)}, ${Math.round(b.py)}, ${Math.round(b.pz)}</td>
    </tr>`).join('');

  const zoneStrip = zones.length > 1
    ? `<p><b>Load zones (back → door):</b> ${zones.map((z) =>
        `#${z.unloadOrder} (${boxes.filter((b) => zoneOf(b, zones) === z.unloadOrder).length})`).join(' · ')}</p>`
    : '';

  const balance = Math.abs(stats.cogOffsetPct.x) > 15 || Math.abs(stats.cogOffsetPct.z) > 15 ? 'Off-centre' : 'Balanced';

  return `<!doctype html><html><head><meta charset="utf-8">
<title>${escapeHtml(meta.title)}</title>
<style>
  * { font-family: -apple-system, Segoe UI, Roboto, sans-serif; }
  body { margin: 32px; color: #1e293b; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  .sub { color: #64748b; font-size: 12px; margin-bottom: 16px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin: 12px 0 18px; font-size: 13px; }
  .grid b { color: #334155; }
  img { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; margin: 8px 0 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { text-align: left; padding: 4px 6px; border-bottom: 1px solid #e2e8f0; }
  th { background: #f1f5f9; }
  .sw { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 5px; vertical-align: middle; }
  .foot { margin-top: 20px; color: #94a3b8; font-size: 10px; }
  @media print { body { margin: 12mm; } button { display: none; } }
</style></head><body>
  <button onclick="window.print()" style="float:right;padding:8px 14px;border:0;border-radius:6px;background:#2563eb;color:#fff;cursor:pointer">Print / Save PDF</button>
  <h1>${escapeHtml(meta.title)}</h1>
  <div class="sub">${escapeHtml(meta.containerLabel)} · ${meta.container.l}×${meta.container.w}×${meta.container.h} ${meta.unit} · ${meta.date}</div>
  ${imageDataUrl ? `<img src="${imageDataUrl}" alt="3D load plan">` : ''}
  <div class="grid">
    <div><b>Cartons packed:</b> ${stats.placedCount} / ${totalRequested}</div>
    <div><b>Volume utilisation:</b> ${stats.volumeUtil.toFixed(1)}%</div>
    <div><b>Total weight:</b> ${stats.totalWeight.toFixed(0)} ${meta.weightUnit ?? 'kg'}${stats.weightUtil != null ? ` (${stats.weightUtil.toFixed(0)}%)` : ''}</div>
    <div><b>CoG balance:</b> ${balance} (${stats.cogOffsetPct.x >= 0 ? '+' : ''}${stats.cogOffsetPct.x.toFixed(0)}%, ${stats.cogOffsetPct.z >= 0 ? '+' : ''}${stats.cogOffsetPct.z.toFixed(0)}%)</div>
  </div>
  ${zoneStrip}
  <p style="font-size:12px;margin:4px 0"><b>Loading sequence:</b> load #1 first — start at the back of the container, floor level first. Tape this sheet at the door.</p>
  <table>
    <thead><tr><th>Load #</th><th>Carton</th><th>Group</th><th>Unload</th><th>Dims (${meta.unit})</th><th>Wt</th><th>Pos x,y,z</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="foot">Generated by DimPack3D — dimpack3d.com</div>
</body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

// ============================================================
// Warehouse floor-plan export
// ============================================================

export interface WarehousePrintOpts {
  floor: { l: number; w: number };
  aisle: number;
  dock: string;
  boxes: PlannerBox[];
  stats: { floorUtil: number; unreachable: string[]; floorCargo: number; rackPositions: number };
  imageDataUrl: string | null;
  date: string;
}

const DOCK_NAMES: Record<string, string> = { E: 'Right', W: 'Left', S: 'Front', N: 'Back' };

/** Printable warehouse floor plan: snapshot + stats + item schedule + access report. */
export function buildWarehousePrintableHTML(o: WarehousePrintOpts): string {
  // group identical items for the schedule
  const groups = new Map<string, { label: string; kind: string; dims: string; count: number }>();
  for (const b of o.boxes) {
    const kind = (b as PlannerBox & { kind?: string }).kind ?? 'cargo';
    const key = `${b.label}|${kind}|${b.l}x${b.w}x${b.h}`;
    const g = groups.get(key) ?? { label: b.label, kind, dims: `${b.l}×${b.w}×${b.h}`, count: 0 };
    g.count++;
    groups.set(key, g);
  }
  const rows = [...groups.values()].map((g) => `
    <tr><td>${escapeHtml(g.label)}</td><td>${g.kind}</td><td>${g.dims}</td><td>${g.count}</td></tr>`).join('');

  const cut = o.stats.unreachable.length;
  const access = cut === 0
    ? '<span style="color:#059669;font-weight:700">✓ Every item is forklift-reachable from the dock</span>'
    : `<span style="color:#dc2626;font-weight:700">⚠ ${cut} item(s) NOT reachable at this aisle width</span>`;

  return `<!doctype html><html><head><meta charset="utf-8">
<title>Warehouse Floor Plan</title>
<style>
  * { font-family: -apple-system, Segoe UI, Roboto, sans-serif; }
  body { margin: 32px; color: #1e293b; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  .sub { color: #64748b; font-size: 12px; margin-bottom: 16px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin: 12px 0 18px; font-size: 13px; }
  .grid b { color: #334155; }
  img { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; margin: 8px 0 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 5px 7px; border-bottom: 1px solid #e2e8f0; }
  th { background: #f1f5f9; }
  .foot { margin-top: 20px; color: #94a3b8; font-size: 10px; }
  @media print { body { margin: 12mm; } button { display: none; } }
</style></head><body>
  <button onclick="window.print()" style="float:right;padding:8px 14px;border:0;border-radius:6px;background:#2563eb;color:#fff;cursor:pointer">Print / Save PDF</button>
  <h1>Warehouse Floor Plan</h1>
  <div class="sub">${(o.floor.l / 100).toFixed(1)} × ${(o.floor.w / 100).toFixed(1)} m · dock: ${DOCK_NAMES[o.dock] ?? o.dock} edge · forklift aisle ${(o.aisle / 100).toFixed(1)} m · ${o.date}</div>
  ${o.imageDataUrl ? `<img src="${o.imageDataUrl}" alt="3D floor plan">` : ''}
  <div class="grid">
    <div><b>Pallet positions:</b> ${o.stats.floorCargo + o.stats.rackPositions} (${o.stats.floorCargo} floor + ${o.stats.rackPositions} rack)</div>
    <div><b>Floor coverage:</b> ${o.stats.floorUtil.toFixed(1)}%</div>
    <div style="grid-column: span 2"><b>Forklift access:</b> ${access}</div>
  </div>
  <table>
    <thead><tr><th>Item</th><th>Type</th><th>Footprint (cm)</th><th>Count</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="foot">Generated by DimPack3D — dimpack3d.com/warehouse</div>
</body></html>`;
}

/** Open the warehouse plan in a printable window (browser print → PDF). */
export function openWarehousePrintable(o: WarehousePrintOpts) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(buildWarehousePrintableHTML(o));
  win.document.close();
}
