/**
 * importCartons.ts — turn a customer's existing carton list (CSV, pasted
 * Excel cells, or .xlsx) into planner specs. This is the switching-cost
 * killer (ENTERPRISE.md §4): "drop the Excel you already have into the tool".
 *
 * Assumes cm / kg (stated in the UI). Headers are detected in English and
 * Chinese; if no header row is found, columns are assumed positional:
 * label, length, width, height, weight, qty.
 */

import type { PackItemSpec } from './binPacking';

const PALETTE = [0xfbbf24, 0x60a5fa, 0x34d399, 0xf472b6, 0xa78bfa, 0xf87171, 0x38bdf8, 0xfb923c];

export interface ImportResult {
  specs: PackItemSpec[];
  warnings: string[];
}

type Field = 'label' | 'l' | 'w' | 'h' | 'weight' | 'qty' | 'group' | 'unloadOrder' | 'fragile' | 'keepUpright';

const ALIASES: Record<Field, string[]> = {
  label: ['name', 'label', 'carton', 'sku', 'item', 'product', 'description', 'desc', '名稱', '名称', '品名', '產品', '产品', '箱型'],
  l: ['l', 'length', 'len', 'long', '長', '长', '長度', '长度'],
  w: ['w', 'width', 'wide', 'breadth', '闊', '阔', '寬', '宽', '闊度', '寬度'],
  h: ['h', 'height', 'high', 'depth', '高', '高度'],
  weight: ['weight', 'wt', 'kg', 'kgs', 'gross', 'gw', '重', '重量', '毛重'],
  qty: ['qty', 'quantity', 'pcs', 'count', 'no', 'number', 'cartons', 'boxes', '數量', '数量', '箱數', '箱数', '件數', '件数'],
  group: ['group', 'batch', 'po', '組', '组', '批次'],
  unloadOrder: ['unload', 'stop', 'drop', 'order', 'sequence', '卸貨', '卸货', '站'],
  fragile: ['fragile', 'nostack', 'no stack', '易碎'],
  keepUpright: ['upright', 'this way up', 'thiswayup', '直立', '不可倒置', '唔可倒置'],
};

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase().replace(/[_\-.()]/g, ' ').replace(/\s+/g, ' ');

const CJK = /[一-鿿]/;

function matchField(header: string): Field | null {
  const h = norm(header);
  if (!h) return null;
  // pass 1: exact match wins across ALL fields ("weight" must not be eaten by "w")
  for (const [field, aliases] of Object.entries(ALIASES) as [Field, string[]][]) {
    if (aliases.some((a) => h === a)) return field;
  }
  // pass 2: substring, but only for aliases long enough to be unambiguous
  // (single-letter "l"/"w"/"h" would otherwise match "fragile"/"unload"/"weight");
  // CJK aliases are dense, so any length qualifies
  for (const [field, aliases] of Object.entries(ALIASES) as [Field, string[]][]) {
    if (aliases.some((a) => (a.length >= 3 || CJK.test(a)) && h.includes(a))) return field;
  }
  // pass 3: "l (cm)" style — single letter followed by a unit
  const m = h.match(/^([lwh])\b/);
  if (m) return m[1] as Field;
  return null;
}

/** "60cm" → 60 · "1,5" → 1.5 · "12 kg" → 12 */
function num(v: unknown): number {
  const s = String(v ?? '').replace(/,(?=\d{1,2}$)/, '.').replace(/[^\d.]/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

const truthy = (v: unknown) => /^(y|yes|true|1|✓|是|係)/i.test(String(v ?? '').trim());

/** Split CSV/TSV text into rows. Tab wins if present (Excel paste); quoted fields supported. */
export function parseDelimited(text: string): string[][] {
  const delim = text.includes('\t') ? '\t' : (text.split(';').length > text.split(',').length ? ';' : ',');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQ = false;
      else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

/** Map raw rows → specs. Detects a header row; falls back to positional columns. */
export function rowsToSpecs(rows: (string | number | boolean | null | undefined)[][]): ImportResult {
  const warnings: string[] = [];
  if (!rows.length) return { specs: [], warnings: ['No rows found'] };

  // header detection: ≥3 recognized fields in the first non-empty row
  const first = rows[0].map((c) => matchField(String(c ?? '')));
  const recognized = first.filter(Boolean).length;
  let colMap: Partial<Record<Field, number>> = {};
  let dataRows = rows;

  if (recognized >= 3) {
    first.forEach((f, i) => { if (f && colMap[f] === undefined) colMap[f] = i; });
    dataRows = rows.slice(1);
  } else {
    colMap = { label: 0, l: 1, w: 2, h: 3, weight: 4, qty: 5 };
    warnings.push('No header row detected — assumed columns: name, length, width, height, weight, qty (cm/kg)');
  }

  const specs: PackItemSpec[] = [];
  dataRows.forEach((r, idx) => {
    const get = (f: Field) => (colMap[f] !== undefined ? r[colMap[f]!] : undefined);
    const l = num(get('l'));
    const w = num(get('w'));
    const h = num(get('h'));
    if (l <= 0 || w <= 0 || h <= 0) {
      if (r.some((x) => String(x ?? '').trim() !== '')) warnings.push(`Row ${idx + 1}: missing/invalid dimensions — skipped`);
      return;
    }
    const qty = Math.max(1, Math.round(num(get('qty')) || 1));
    const spec: PackItemSpec = {
      id: `imp${idx}-${l}x${w}x${h}`,
      label: String(get('label') ?? '').trim() || `Carton ${specs.length + 1}`,
      l, w, h,
      weight: num(get('weight')),
      qty,
      color: PALETTE[specs.length % PALETTE.length],
    };
    const group = String(get('group') ?? '').trim();
    if (group) spec.group = group;
    const uo = num(get('unloadOrder'));
    if (uo >= 1) spec.unloadOrder = Math.round(uo);
    if (truthy(get('fragile'))) spec.maxStack = 0;
    if (truthy(get('keepUpright'))) spec.keepUpright = true;
    specs.push(spec);
  });

  if (!specs.length) warnings.push('No usable rows — need length, width, height (cm) per carton type');
  if (specs.length > 50) warnings.push(`${specs.length} carton types is a lot — the optimizer may take a while`);
  return { specs, warnings };
}

export function parseText(text: string): ImportResult {
  return rowsToSpecs(parseDelimited(text));
}

/** .xlsx / .xls / .csv file → specs. SheetJS loads lazily (separate chunk). */
export async function parseFile(file: File): Promise<ImportResult> {
  if (/\.(csv|txt|tsv)$/i.test(file.name)) {
    return parseText(await file.text());
  }
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }) as (string | number)[][];
  return rowsToSpecs(rows);
}

export const TEMPLATE_CSV =
  'name,length,width,height,weight,qty,fragile,this way up,group,unload\n' +
  'Master carton,60,40,40,18,120,,,,\n' +
  'Display units,45,35,25,6,30,yes,,,1\n' +
  'Flat-pack,120,80,15,32,40,,yes,PO-1001,2\n';
