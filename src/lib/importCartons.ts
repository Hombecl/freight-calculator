/**
 * importCartons.ts — turn a customer's existing carton list (CSV, pasted
 * Excel cells, or .xlsx) into planner specs. This is the switching-cost
 * killer (ENTERPRISE.md §4): "drop the Excel you already have into the tool".
 *
 * Normalizes explicit/header/default units to cm/kg. Headers are detected in English and
 * Chinese; if no header row is found, columns are assumed positional:
 * label, length, width, height, weight, qty.
 */

import type { PackItemSpec } from './binPacking';

const PALETTE = [0xfbbf24, 0x60a5fa, 0x34d399, 0xf472b6, 0xa78bfa, 0xf87171, 0x38bdf8, 0xfb923c];

export interface ImportResult {
  specs: PackItemSpec[];
  warnings: string[];
  rows?: { row: number; raw: string; normalized?: string; error?: string }[];
  acceptedQty?: number;
  excludedRows?: number;
}
export type LengthUnit = 'cm' | 'mm' | 'm' | 'in';
export type WeightUnit = 'kg' | 'g' | 'lb';
export interface ImportOptions {
  lengthUnit?: LengthUnit;
  weightUnit?: WeightUnit;
  columns?: Partial<Record<Field, number>>;
  headerRow?: boolean;
  excludeRows?: number[];
}
export const IMPORT_FIELDS: Field[] = ['label','l','w','h','weight','qty','maxStack','fragile','keepUpright','group','unloadOrder'];
export type ImportRows = (string | number | boolean | null | undefined)[][];
export function detectColumns(rows: ImportRows) {
  const fields = (rows[0] ?? []).map(c => matchField(String(c ?? '')));
  const headerRow = fields.filter(Boolean).length >= 3;
  const columns: Partial<Record<Field, number>> = headerRow ? {} : {label:0,l:1,w:2,h:3,weight:4,qty:5};
  if (headerRow) fields.forEach((f,i) => { if(f && columns[f] === undefined) columns[f]=i; });
  return {columns,headerRow};
}
const LENGTH = {cm:1, mm:.1, m:100, in:2.54};
const MASS = {kg:1, g:.001, lb:.45359237};
function unitIn(text: string, kind: 'length'|'weight'): string | undefined {
  const aliases = kind === 'length' ? /\b(mm|cm|m|inches|inch|in)\b|毫米|厘米|公分|英寸|吋/gi : /\b(kgs?|grams?|g|lbs?|pounds?)\b|公斤|千克|磅/gi;
  const found = [...text.matchAll(aliases)].map(m => ({inches:'in',inch:'in',毫米:'mm',厘米:'cm',公分:'cm',英寸:'in',吋:'in',kgs:'kg',公斤:'kg',千克:'kg',lbs:'lb',pound:'lb',pounds:'lb',磅:'lb',gram:'g',grams:'g'} as Record<string,string>)[m[0].toLowerCase()] ?? m[0].toLowerCase());
  if(new Set(found).size>1) throw new Error('Conflicting units; correct the source or column heading');
  return found[0];
}
function numeric(value: unknown): number {
  const text=String(value ?? '').trim().replace(/,(?=\d{1,2}$)/,'.');
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?(?:\s*[a-zA-Z一-鿿]+)?$/.test(text)) throw new Error('Invalid number');
  const n=parseFloat(text); if(!Number.isFinite(n)||n<0)throw new Error('Negative or invalid number'); return n;
}
function countValue(value:unknown) { if(!/^\d+$/.test(String(value).trim()))throw new Error('Count must be a positive integer');return numeric(value); }
function measure(value:unknown, header:string, kind:'length'|'weight', fallback:string) {
  const text=String(value??'').trim(), a=unitIn(text.replace(/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?/i,''),kind), b=unitIn(header,kind);
  const suffix=text.replace(/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?\s*/i,'');
  if(suffix && !a) throw new Error('Unknown unit');
  if(a&&b&&a!==b)throw new Error('Cell and header units conflict; correct before importing');
  return numeric(value)*(kind==='length'?LENGTH[(a??b??fallback) as LengthUnit]:MASS[(a??b??fallback) as WeightUnit]);
}
/** Convert normalized cm/kg specs for a tool whose input form uses another unit. */
export function specsInUnits(result: ImportResult, units: 'cm-kg'|'in-lb') {
  const L=units==='in-lb'?1/2.54:1,W=units==='in-lb'?1/.45359237:1;
  return result.specs.map(s=>({...s,l:s.l*L,w:s.w*L,h:s.h*L,weight:s.weight*W,...(s.maxStack===undefined?{}:{maxStack:s.maxStack*W})}));
}

export type Field = 'label' | 'l' | 'w' | 'h' | 'weight' | 'qty' | 'group' | 'unloadOrder' | 'fragile' | 'keepUpright' | 'maxStack';

const ALIASES: Record<Field, string[]> = {
  maxStack: ['maxstack', 'max stack', 'max on top', 'stack', 'top load', '頂部承重'],
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

/** Every result uses cm/kg. Original cells remain available for review. */
export function rowsToSpecs(rows: ImportRows, options: ImportOptions = {}): ImportResult {
  const detected=detectColumns(rows), header=options.headerRow??detected.headerRow;
  const columns=options.columns??detected.columns;
  const warnings:string[]=[],specs:PackItemSpec[]=[],review:NonNullable<ImportResult['rows']>=[];
  if(!rows.length)return {specs,warnings:['No rows found'],rows:[],acceptedQty:0,excludedRows:0};
  if(!header)warnings.push('No header row detected — review column mapping and selected units');
  if(new Set(Object.values(columns)).size!==Object.values(columns).length)return {specs,warnings:['Duplicate column mapping — choose a different column for each field']};
  const data=header?rows.slice(1):rows;
  data.forEach((r,idx)=>{
    if(!r.some(v=>String(v??'').trim()))return;
    const row=idx+(header?2:1),raw=r.map(v=>String(v??'')).join(' · ');
    if(options.excludeRows?.includes(row)){review.push({row,raw,error:'Excluded by you'});return;}
    const get=(f:Field)=>columns[f]===undefined?undefined:r[columns[f]!];
    const heading=(f:Field)=>header?String(rows[0][columns[f]!]??''):'';
    const measured=(f:Field,kind:'length'|'weight')=>{try{return measure(get(f),heading(f),kind,kind==='length'?(options.lengthUnit??'cm'):(options.weightUnit??'kg'));}catch(e){throw new Error(`${f}: ${e instanceof Error?e.message:String(e)}`);}};
    try {
      const l=measured('l','length'),w=measured('w','length'),h=measured('h','length');
      if(l<=0||w<=0||h<=0)throw new Error('Dimensions must be positive');
      const qty=String(get('qty')??'').trim()===''?1:countValue(get('qty'));
      if(!Number.isInteger(qty)||qty<1)throw new Error('Quantity must be a positive integer');
      const weightKnown=String(get('weight')??'').trim()!=='';
      const weight=weightKnown?measured('weight','weight'):0;
      if(!weightKnown)warnings.push(`Row ${row}: weight not provided — payload estimate incomplete`);
      const spec:PackItemSpec={id:`imp${idx}-${l}x${w}x${h}`,label:String(get('label')??'').trim()||`Carton ${idx+1}`,l,w,h,qty,weight,weightKnown,color:PALETTE[specs.length%PALETTE.length]};
      if(String(get('maxStack')??'').trim())spec.maxStack=measured('maxStack','weight');
      if(truthy(get('fragile')))spec.maxStack=0;
      if(truthy(get('keepUpright')))spec.keepUpright=true;
      const group=String(get('group')??'').trim();if(group)spec.group=group;
      if(String(get('unloadOrder')??'').trim()) {const n=countValue(get('unloadOrder'));if(!Number.isInteger(n)||n<1)throw new Error('Stop must be a positive integer');spec.unloadOrder=n;}
      specs.push(spec);review.push({row,raw,normalized:`${Number(l.toFixed(6))} × ${Number(w.toFixed(6))} × ${Number(h.toFixed(6))} cm · ${weightKnown?Number(weight.toFixed(6))+' kg':'weight unknown'} · ${qty} pcs`});
    }catch(e){const error=e instanceof Error?e.message:String(e);warnings.push(`Row ${row}: ${error} — skipped`);review.push({row,raw,error});}
  });
  if(!specs.length)warnings.push('No usable rows — correct dimensions and mapping');
  return {specs,warnings,rows:review,acceptedQty:specs.reduce((n,s)=>n+s.qty,0),excludedRows:review.filter(r=>r.error).length};
}
export function parseText(text:string, options:ImportOptions={}):ImportResult {return rowsToSpecs(parseDelimited(text),options);}
export async function readImportFile(file:File):Promise<{name:string;rows:ImportRows}[]> {
  if(file.size>5_000_000)throw new Error('File too large — maximum 5 MB');
  if(/\.(csv|txt|tsv)$/i.test(file.name))return [{name:file.name,rows:parseDelimited(await file.text())}];
  const XLSX=await import('xlsx');const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
  return wb.SheetNames.map(name=>({name,rows:XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true}) as ImportRows}));
}
export async function parseFile(file:File,options:ImportOptions={},sheetIndex=0):Promise<ImportResult>{
  const sheets=await readImportFile(file);if(!sheets[sheetIndex])throw new Error('Worksheet not found');return rowsToSpecs(sheets[sheetIndex].rows,options);
}

export const TEMPLATE_CSV =
  'name,length,width,height,weight,qty,fragile,this way up,group,unload\n' +
  'Master carton,60,40,40,18,120,,,,\n' +
  'Display units,45,35,25,6,30,yes,,,1\n' +
  'Flat-pack,120,80,15,32,40,,yes,PO-1001,2\n';
