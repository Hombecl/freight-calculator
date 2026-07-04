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
    '#', 'Label', 'Group', 'UnloadOrder', 'Zone',
    `L(${meta.unit})`, `W(${meta.unit})`, `H(${meta.unit})`,
    `Weight(${meta.weightUnit ?? 'kg'})`,
    `PosX(${meta.unit})`, `PosY(${meta.unit})`, `PosZ(${meta.unit})`,
  ];
  const rows = boxes.map((b, i) => [
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

/** Open a clean printable page and trigger the browser's print/save-as-PDF. */
export function openPrintablePlan(opts: {
  meta: PlanMeta;
  stats: PackStats;
  zones: ZoneInfo[];
  boxes: PlannerBox[];
  totalRequested: number;
  imageDataUrl: string | null;
}) {
  const { meta, stats, zones, boxes, totalRequested, imageDataUrl } = opts;
  const win = window.open('', '_blank');
  if (!win) return; // pop-up blocked

  const rows = boxes.map((b, i) => `
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
    ? `<p><b>Load zones (back → door):</b> ${zones.map((z) => `#${z.unloadOrder} (${z.count})`).join(' · ')}</p>`
    : '';

  const balance = Math.abs(stats.cogOffsetPct.x) > 15 || Math.abs(stats.cogOffsetPct.z) > 15 ? 'Off-centre' : 'Balanced';

  win.document.write(`<!doctype html><html><head><meta charset="utf-8">
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
  <table>
    <thead><tr><th>#</th><th>Carton</th><th>Group</th><th>Unload</th><th>Dims (${meta.unit})</th><th>Wt</th><th>Pos x,y,z</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="foot">Generated by DimPack3D — dimpack3d.com</div>
</body></html>`);
  win.document.close();
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}
