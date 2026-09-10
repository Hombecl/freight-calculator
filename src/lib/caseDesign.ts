import { canonicalJson } from './hashing';
import { PalletInputError, estimatePallet } from './palletEstimate';
import { perLayer, layerArrangement, palletBoxes, floorFit, PALLET_TARE_KG } from './pallets';
import { packContainer } from './binPacking';
import { CHECK_SEMANTICS, CONTAINER_PRESETS, type Check } from './packChecks';

export interface CaseDesignRequest {
  units?: 'cm-kg' | 'in-lb';
  product: { l: number; w: number; h: number; weight: number; keepUpright?: boolean; label?: string };
  unitsPerCase: { min: number; max: number } | number;
  caseConstraints?: { maxWeight?: number; maxDim?: number; boardThickness?: number; headspace?: number; allowedOrientations?: 'any' | 'upright' };
  pallet?: { l: number; w: number; baseHeight: number; maxHeight: number; maxWeight: number; overhang?: number };
  container?: { preset?: '20gp' | '40gp' | '40hq'; l?: number; w?: number; h?: number; maxWeight?: number };
  costs?: { boardCostPerM2?: number; freightPerContainer?: number; freightPerPallet?: number; handlingPerCase?: number; currency?: string };
  candidates?: number;
}
export const CASE_ENGINE = 'case-design-v1';
export const CASE_LIMITS = { rangeValues: 24, enumerations: 400, floorCases: 2000, candidates: 10, bodyBytes: 32768 } as const;
export const CASE_EXAMPLE: CaseDesignRequest = { product: { l: 10, w: 8, h: 15, weight: .3, keepUpright: true }, unitsPerCase: { min: 6, max: 12 }, caseConstraints: { maxWeight: 20 }, pallet: { l: 120, w: 80, baseHeight: 15, maxHeight: 180, maxWeight: 1000 }, container: { preset: '40hq' } };
const obj = (v: unknown, f: string): Record<string, unknown> => { if (!v || typeof v !== 'object' || Array.isArray(v)) throw new PalletInputError(f, 'must be an object'); return v as Record<string, unknown>; };
const num = (v: unknown, f: string, min: number, max: number, integer = false) => { if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) throw new PalletInputError(f, `must be ${integer ? 'an integer' : 'a number'} from ${min} to ${max}`); return v; };
const length = (cm: number) => ({ cm, in: cm / 2.54 });
const weight = (kg: number) => ({ kg, lb: kg / .45359237 });
export function parseCaseRequest(input: unknown) {
  const o = obj(input, 'request');
  if (o.units !== undefined && o.units !== 'cm-kg' && o.units !== 'in-lb') throw new PalletInputError('units', 'must be cm-kg or in-lb');
  const L = o.units === 'in-lb' ? 2.54 : 1, W = o.units === 'in-lb' ? .45359237 : 1;
  const n = (v: unknown, f: string, scale = L, zero = false, max = 2000) => Number((num(v, f, zero ? 0 : .001 / scale, max / scale) * scale).toFixed(9));
  const p = obj(o.product, 'product');
  if (p.keepUpright !== undefined && typeof p.keepUpright !== 'boolean') throw new PalletInputError('product.keepUpright', 'must be boolean');
  if (p.label !== undefined && (typeof p.label !== 'string' || !p.label.trim() || p.label.length > 60)) throw new PalletInputError('product.label', 'must be 1–60 characters');
  const product = { l: n(p.l, 'product.l'), w: n(p.w, 'product.w'), h: n(p.h, 'product.h'), weight: n(p.weight, 'product.weight', W, false, 10000), keepUpright: p.keepUpright === true, label: (p.label as string | undefined)?.trim() ?? 'Product' };
  const range = typeof o.unitsPerCase === 'number' ? { min: o.unitsPerCase, max: o.unitsPerCase } : obj(o.unitsPerCase, 'unitsPerCase');
  const min = num(range.min, 'unitsPerCase.min', 1, 2000, true), max = num(range.max, 'unitsPerCase.max', min, 2000, true);
  const c = o.caseConstraints === undefined ? {} : obj(o.caseConstraints, 'caseConstraints');
  if (c.allowedOrientations !== undefined && c.allowedOrientations !== 'any' && c.allowedOrientations !== 'upright') throw new PalletInputError('caseConstraints.allowedOrientations', 'must be any or upright');
  const constraints = { boardThickness: c.boardThickness === undefined ? .4 : n(c.boardThickness, 'caseConstraints.boardThickness', L, true, 10), headspace: c.headspace === undefined ? .5 : n(c.headspace, 'caseConstraints.headspace', L, true, 100), maxWeight: c.maxWeight === undefined ? undefined : n(c.maxWeight, 'caseConstraints.maxWeight', W, false, 10000), maxDim: c.maxDim === undefined ? undefined : n(c.maxDim, 'caseConstraints.maxDim'), upright: product.keepUpright || c.allowedOrientations === 'upright' };
  let pallet;
  if (o.pallet !== undefined) {
    const p = obj(o.pallet, 'pallet');
    pallet = { l: n(p.l, 'pallet.l', L, false, 300), w: n(p.w, 'pallet.w', L, false, 300), baseHeight: n(p.baseHeight, 'pallet.baseHeight', L, true, 50), maxHeight: n(p.maxHeight, 'pallet.maxHeight', L, false, 400), maxWeight: n(p.maxWeight, 'pallet.maxWeight', W, false, 10000), overhang: p.overhang === undefined ? 0 : n(p.overhang, 'pallet.overhang', L, true, 25) };
    if (pallet.maxHeight <= pallet.baseHeight) throw new PalletInputError('pallet.maxHeight', 'must exceed baseHeight');
  }
  let container;
  if (o.container !== undefined) {
    const c = obj(o.container, 'container');
    if (c.preset !== undefined && !['20gp', '40gp', '40hq'].includes(c.preset as string)) throw new PalletInputError('container.preset', 'must be 20gp, 40gp or 40hq');
    const preset = c.preset ? CONTAINER_PRESETS[c.preset as string] : undefined;
    container = { l: c.l === undefined && preset ? preset.l : n(c.l, 'container.l'), w: c.w === undefined && preset ? preset.w : n(c.w, 'container.w'), h: c.h === undefined && preset ? preset.h : n(c.h, 'container.h'), maxWeight: c.maxWeight === undefined ? preset?.maxWeight : n(c.maxWeight, 'container.maxWeight', W, false, 100000), door: preset?.door };
  }
  let costs;
  if (o.costs !== undefined) {
    const c = obj(o.costs, 'costs');
    if (c.currency !== undefined && (typeof c.currency !== 'string' || !/^[A-Z]{3}$/.test(c.currency))) throw new PalletInputError('costs.currency', 'use a three-letter uppercase currency');
    const price = (key: string) => c[key] === undefined ? undefined : num(c[key], `costs.${key}`, 0, 1e9);
    costs = { boardCostPerM2: price('boardCostPerM2'), freightPerContainer: price('freightPerContainer'), freightPerPallet: price('freightPerPallet'), handlingPerCase: price('handlingPerCase'), currency: c.currency as string ?? 'USD' };
    if (costs.freightPerContainer !== undefined && !container) throw new PalletInputError('costs.freightPerContainer', 'requires container');
    if (costs.freightPerPallet !== undefined && !pallet) throw new PalletInputError('costs.freightPerPallet', 'requires pallet');
  }
  return { product, min, max, constraints, pallet, container, costs, candidates: o.candidates === undefined ? 5 : num(o.candidates, 'candidates', 1, 10, true) };
}
export type ParsedCaseRequest = ReturnType<typeof parseCaseRequest>;
export function factorisations(n: number) {
  const out: { a: number; b: number; c: number }[] = [];
  for (let a = 1; a <= n; a++) if (n % a === 0) for (let b = 1; b <= n / a; b++) if (n % (a * b) === 0) out.push({ a, b, c: n / a / b });
  return out;
}
export function sampleCaseCounts(min: number, max: number) {
  const count = Math.min(max - min + 1, CASE_LIMITS.rangeValues);
  return Array.from({ length: count }, (_, i) => count === 1 ? min : Math.round(min + i * (max - min) / (count - 1)));
}
type Arrangement = { a: number; b: number; c: number; orientation: string };
export interface CaseCandidate {
  id: string; unitsPerCase: number; arrangement: Arrangement;
  caseOuter: { l: ReturnType<typeof length>; w: ReturnType<typeof length>; h: ReturnType<typeof length> }; caseWeight: ReturnType<typeof weight>;
  pallet?: { ti: number; hi: number; casesPerPallet: number; unitsPerPallet: number; loadedHeight: ReturnType<typeof length>; cargoWeight: ReturnType<typeof weight>; cubeUtilPct: number; layerDiagram: { rows: number; cols: number; orientation: string } };
  container?: { palletsPerContainer?: number; casesPerContainer: number; unitsPerContainer: number; volumeUtilPct: number; requestedCases?: number; unplacedCases?: number };
  costPerUnit?: { value: number; currency: string; breakdown: { board: number; handling: number; freight: number } };
  checks: Check[]; assumptions: string[];
}
/** Shared evaluation also screens a user's existing case for the comparison band. */
export function evaluateCase(r: ParsedCaseRequest, d: { l: number; w: number; h: number }, n: number, arrangement: Arrangement, id: string): CaseCandidate {
  const area = 2 * (d.l * d.w + d.l * d.h + d.w * d.h) / 10000, kg = n * r.product.weight + area * .6;
  const assumptions = ['Board mass = outer surface area × 0.6 kg/m²; excludes seams, flaps, dividers and waste.', `Board added to both sides; headspace ${r.constraints.headspace} cm.`, 'Column stacks only; no interlocking patterns or structural strength evaluation.'];
  const check = (code: string, observed: number | undefined, limit: number | undefined, assumption: string): Check => ({ code, status: observed === undefined || limit === undefined ? 'not_evaluated' : observed <= limit + 1e-6 ? 'pass' : 'fail', observed, limit, assumption });
  const checks = [check('CASE_WEIGHT', kg, r.constraints.maxWeight, 'Estimated gross case kg vs supplied ceiling.'), check('CASE_DIM', Math.max(d.l, d.w, d.h), r.constraints.maxDim, 'Longest outer side cm vs supplied cap.')];
  const out: CaseCandidate = { id, unitsPerCase: n, arrangement, caseOuter: { l: length(d.l), w: length(d.w), h: length(d.h) }, caseWeight: weight(kg), checks, assumptions };
  const p = r.pallet;
  if (p) {
    const l = p.l + 2 * p.overhang, w = p.w + 2 * p.overhang;
    const ti = perLayer(d.l, d.w, l, w), hi = ti ? Math.max(0, Math.min(Math.floor((p.maxHeight - p.baseHeight) / d.h + 1e-6), Math.floor(p.maxWeight / (ti * kg) + 1e-6))) : 0;
    const count = ti * hi, a = layerArrangement(d.l, d.w, l, w);
    out.pallet = { ti, hi, casesPerPallet: count, unitsPerPallet: count * n, loadedHeight: length(p.baseHeight + hi * d.h), cargoWeight: weight(count * kg), cubeUtilPct: count * d.l * d.w * d.h / (l * w * (p.maxHeight - p.baseHeight)) * 100, layerDiagram: { rows: a.ny, cols: a.nx, orientation: a.rotated ? 'rotated' : 'original' } };
    assumptions.push('Overhang expands each deck side; pallet tare assumed 25 kg for container payload. Double stacking assumes adequate strength, not verified.');
  }
  checks.push(check('PALLET_HEIGHT', out.pallet?.loadedHeight.cm, p?.maxHeight, 'Total loaded height including base in cm.'), check('PALLET_PAYLOAD', out.pallet?.cargoWeight.kg, p?.maxWeight, 'Cargo kg; excludes pallet tare.'), { code: 'BOARD_MASS_ASSUMED', status: 'warn', observed: area * .6, assumption: assumptions[0] }, { code: 'COST_INPUTS_PROVIDED', status: r.costs ? 'pass' : 'not_evaluated', assumption: r.costs ? 'Only supplied costs included; missing costs are zero, not a complete landed-cost quote.' : 'No costs supplied; ranked by units/container then pallet cube fill.' });
  if (r.container && !checks.some(c => c.status === 'fail')) {
    const c = r.container;
    let count = 0, pallets: number | undefined, requestedCases: number | undefined, unplacedCases: number | undefined;
    if (p && out.pallet) {
      const loaded = out.pallet.loadedHeight.cm;
      const passes = !c.door || (loaded <= c.door.h && Math.min(p.l + 2 * p.overhang, p.w + 2 * p.overhang) <= c.door.w);
      pallets = passes && out.pallet.casesPerPallet ? Math.min(floorFit(p.l + 2 * p.overhang, p.w + 2 * p.overhang, c.l, c.w) * Math.min(2, Math.floor(c.h / loaded + 1e-6)), Math.floor((c.maxWeight ?? Infinity) / (out.pallet.cargoWeight.kg + PALLET_TARE_KG) + 1e-6)) : 0;
      count = pallets * out.pallet.casesPerPallet;
    } else {
      requestedCases = Math.min(2000, Math.floor(c.l * c.w * c.h / (d.l * d.w * d.h) + 1e-6), Math.floor((c.maxWeight ?? Infinity) / kg + 1e-6));
      const fits = !c.door || (d.h <= c.door.h && Math.min(d.l, d.w) <= c.door.w);
      const packed = packContainer(c, [{ ...d, id: 'case', label: 'Case', weight: kg, qty: fits ? requestedCases : 0, keepUpright: true, color: 0x2563eb }]);
      count = packed.boxes.length; unplacedCases = requestedCases - count;
      assumptions.push('Floor-load screening capped at 2,000 cases; unplacedCases accounts for the tested supply, not a customer order. Cases remain upright.');
    }
    out.container = { palletsPerContainer: pallets, casesPerContainer: count, unitsPerContainer: count * n, volumeUtilPct: count * d.l * d.w * d.h / (c.l * c.w * c.h) * 100, requestedCases, unplacedCases };
  }
  if (r.costs) {
    const c = r.costs;
    const board = area * (c.boardCostPerM2 ?? 0) / n, handling = (c.handlingPerCase ?? 0) / n;
    const freight = (c.freightPerContainer ?? 0) / (out.container?.unitsPerContainer || 1) + (c.freightPerPallet ?? 0) / (out.pallet?.unitsPerPallet || 1);
    if ((!c.freightPerContainer || out.container?.unitsPerContainer) && (!c.freightPerPallet || out.pallet?.unitsPerPallet)) out.costPerUnit = { value: board + handling + freight, currency: c.currency, breakdown: { board, handling, freight } };
  }
  return out;
}
export async function designCases(input: unknown) {
  const r = parseCaseRequest(input), counts = sampleCaseCounts(r.min, r.max), candidates: CaseCandidate[] = [], seen = new Set<string>();
  const { l, w, h } = r.product;
  const orientations = [[l,w,h,'lwh'],[w,l,h,'wlh'],[l,h,w,'lhw'],[h,w,l,'hwl'],[w,h,l,'whl'],[h,l,w,'hlw']] as const;
  // Round-robin across counts prevents early counts exhausting the enumeration budget.
  const queues = counts.map(n => factorisations(n).flatMap(a => orientations.slice(0, r.constraints.upright ? 2 : 6).map(o => ({ n, a, o }))));
  let enumerated = 0, rejected = 0;
  for (let index = 0; queues.some(q => index < q.length) && enumerated < 400; index++) for (const queue of queues) {
    const item = queue[index]; if (!item || enumerated >= 400) continue;
    const { n, a, o } = item, board = 2 * r.constraints.boardThickness;
    const d = { l: a.a * o[0] + board, w: a.b * o[1] + board, h: a.c * o[2] + board + r.constraints.headspace };
    const key = [d.l,d.w,d.h].map(v => v.toFixed(1)).join(':');
    if (seen.has(key)) continue; seen.add(key); enumerated++;
    const candidate = evaluateCase(r, d, n, { ...a, orientation: o[3] }, `case-${enumerated}`);
    if (candidate.checks.some(c => c.status === 'fail') || (candidate.pallet && !candidate.pallet.casesPerPallet) || (candidate.container && !candidate.container.unitsPerContainer)) { rejected++; continue; }
    candidates.push(candidate);
  }
  candidates.sort((a,b) => (r.costs ? (a.costPerUnit?.value ?? Infinity) - (b.costPerUnit?.value ?? Infinity) : 0) || (b.container?.unitsPerContainer ?? 0) - (a.container?.unitsPerContainer ?? 0) || (b.pallet?.cubeUtilPct ?? 0) - (a.pallet?.cubeUtilPct ?? 0) || a.id.localeCompare(b.id));
  const selected = candidates.slice(0,r.candidates);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalJson({ engine: CASE_ENGINE, request: r })));
  const checks: Check[] = ['CASE_WEIGHT','CASE_DIM','PALLET_HEIGHT','PALLET_PAYLOAD','BOARD_MASS_ASSUMED','COST_INPUTS_PROVIDED'].map(code => {
    const list = selected.map(c => c.checks.find(k => k.code === code)!);
    return list.length ? { ...list[0], observed: list[0].observed === undefined ? undefined : Math.max(...list.map(c => Number(c.observed))), ids: selected.map(c => c.id) } : { code, status: code === 'BOARD_MASS_ASSUMED' ? 'warn' : 'not_evaluated', assumption: 'No feasible candidate found within bounded search; no plan passes by implication.' };
  });
  return { status: selected.length ? 'found' as const : 'none_within_search' as const, candidates: selected, checks, engineVersion: CASE_ENGINE, inputHash: Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2,'0')).join(''), semantics: CHECK_SEMANTICS, notes: ['GEOMETRY_ONLY_NOT_STRUCTURAL_DESIGN','BEST_OPTIONS_FOUND_NOT_OPTIMUM'], searched: { counts, enumerated, rejected, capped: enumerated === 400 }, limits: CASE_LIMITS };
}
export type CaseDesignResult = Awaited<ReturnType<typeof designCases>>;
/** Seed with the existing estimator, then use the exact shared TI-HI column layout.
 * A single-case seed preserves the public estimator's 200-carton input contract.
 * Return only the view's plan fields, so seed counts/checks cannot contradict TI-HI. */
export function casePalletView(candidate: CaseCandidate, request: ParsedCaseRequest) {
  const p = request.pallet, result = candidate.pallet;
  if (!p || !result || !result.casesPerPallet) return undefined;
  const d = { l: candidate.caseOuter.l.cm, w: candidate.caseOuter.w.cm, h: candidate.caseOuter.h.cm, weight: candidate.caseWeight.kg };
  const deck = { ...p, l: p.l + 2*p.overhang, w: p.w + 2*p.overhang };
  // One-case seed remains valid even for very large generated outer dimensions.
  const seed = d.l <= 400 && d.w <= 400 && d.h <= 400 && deck.l <= 300 && deck.w <= 300 && d.weight <= 10000 && d.weight >= .01 && Math.min(d.l,d.w,d.h) >= .1 ? estimatePallet({ pallet: deck, items: [{ ...d, qty: 1, label: 'Case', keepUpright: true }] }) : undefined;
  return { pallet: seed?.pallet ?? deck, loadedHeight: result.loadedHeight.cm, boxes: palletBoxes(result.casesPerPallet, d, deck) };
}
