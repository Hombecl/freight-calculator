import { computeStats, packWithConstraints, type PackItemSpec, type ZoneInfo } from './binPacking';
import { containerChecks, CONTAINER_PRESETS, CHECK_SEMANTICS, fitsDoor, type Check } from './packChecks';
import { PalletInputError } from './palletEstimate';
import type { PlannerBox } from './plannerBox';

export const CONSOLIDATION_ENGINE = 'consolidation-v1';
export const CONSOLIDATION_LIMITS = { pos: 30, types: 60, cartons: 3000, bodyBytes: 65536, searchBudget: 120 } as const;
export interface ConsolidationRequest {
  units?: 'cm-kg' | 'in-lb';
  pos: Array<{ poId: string; supplier?: string; readyDate?: string; priority?: number;
    items: Array<{ sku?: string; label?: string; l: number; w: number; h: number; qty: number; weight: number; keepUpright?: boolean; maxStack?: number; fragile?: boolean }> }>;
  window?: { from?: string; to?: string };
  containers: Array<{ preset: '20gp' | '40gp' | '40hq'; maxCount?: number; ratePerContainer?: number }>;
  lcl?: { ratePerCbm?: number; minCbm?: number };
  rules?: { keepPoTogether?: boolean; maxSuppliersPerContainer?: number; unloadOrderByPo?: boolean };
  searchBudget?: number;
}
const obj = (v: unknown, f: string): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new PalletInputError(f, 'must be an object');
  return v as Record<string, unknown>;
};
const num = (v: unknown, f: string, min: number, max: number, fallback?: number, integer = false): number => {
  if (v === undefined && fallback !== undefined) return fallback;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) throw new PalletInputError(f, `must be ${integer ? 'an integer ' : ''}${min}–${max}`);
  return v;
};
const str = (v: unknown, f: string, required = false): string | undefined => {
  if (v === undefined && !required) return undefined;
  if (typeof v !== 'string' || !v.trim() || v.trim().length > 80) throw new PalletInputError(f, 'must be a non-empty string of at most 80 characters');
  return v.trim();
};
const bool = (v: unknown, f: string, fallback = false): boolean => {
  if (v === undefined) return fallback;
  if (typeof v !== 'boolean') throw new PalletInputError(f, 'must be boolean');
  return v;
};
const date = (v: unknown, f: string) => {
  const s = str(v, f);
  if (s !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(Date.parse(s)) || new Date(s).toISOString().slice(0, 10) !== s)) throw new PalletInputError(f, 'must be a valid ISO date YYYY-MM-DD');
  return s;
};
const cmp = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const palette = [0x60a5fa, 0xfbbf24, 0x34d399, 0xf472b6, 0xa78bfa, 0xfb923c];
const volume = (s: { l: number; w: number; h: number; qty?: number }) => s.l * s.w * s.h * (s.qty ?? 1) / 1e6;
const weight = (kg: number) => ({ kg, lb: kg / 0.45359237 });
const dimensions = (cm: number) => ({ cm, in: cm / 2.54 });
async function hash(v: unknown) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(v)));
  return Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');
}
export function parseConsolidationRequest(input: unknown) {
  const o = obj(input, 'request');
  const units = o.units === undefined ? 'cm-kg' : o.units;
  if (units !== 'cm-kg' && units !== 'in-lb') throw new PalletInputError('units', 'must be cm-kg or in-lb');
  const L = units === 'in-lb' ? 2.54 : 1, W = units === 'in-lb' ? 0.45359237 : 1;
  if (!Array.isArray(o.pos) || !o.pos.length || o.pos.length > 30) throw new PalletInputError('pos', 'must contain 1–30 POs');
  let types = 0, cartons = 0;
  const seen = new Set<string>();
  const pos = o.pos.map((raw, i) => {
    const p = obj(raw, `pos[${i}]`), f = `pos[${i}]`;
    const poId = str(p.poId, `${f}.poId`, true)!;
    if (seen.has(poId)) throw new PalletInputError(`${f}.poId`, 'duplicate PO');
    seen.add(poId);
    if (!Array.isArray(p.items) || !p.items.length) throw new PalletInputError(`${f}.items`, 'must be a non-empty array');
    const skus = new Set<string>();
    const items = p.items.map((rawItem, j) => {
      const it = obj(rawItem, `${f}.items[${j}]`), k = `${f}.items[${j}]`;
      const sku = str(it.sku, `${k}.sku`) ?? `sku${j}`;
      if (skus.has(sku)) throw new PalletInputError(`${k}.sku`, 'duplicate SKU within PO');
      skus.add(sku);
      const qty = num(it.qty, `${k}.qty`, 1, 3000, undefined, true);
      types++; cartons += qty;
      const fragile = bool(it.fragile, `${k}.fragile`);
      const maxStack = it.maxStack === undefined ? undefined : num(it.maxStack, `${k}.maxStack`, 0, 100000) * W;
      return { id: `po${i}-sku${j}`, sku, label: str(it.label, `${k}.label`) ?? sku,
        l: num(it.l, `${k}.l`, 0.1, 10000) * L, w: num(it.w, `${k}.w`, 0.1, 10000) * L, h: num(it.h, `${k}.h`, 0.1, 10000) * L,
        weight: num(it.weight, `${k}.weight`, 0, 100000) * W, qty, color: palette[i % palette.length], group: poId,
        keepUpright: bool(it.keepUpright, `${k}.keepUpright`, true), maxStack: fragile ? 0 : maxStack };
    });
    return { poId, supplier: str(p.supplier, `${f}.supplier`), readyDate: date(p.readyDate, `${f}.readyDate`), priority: num(p.priority, `${f}.priority`, 1, 100000, 2, true), items };
  });
  if (types > 60) throw new PalletInputError('pos', 'max 60 item types');
  if (cartons > 3000) throw new PalletInputError('pos', 'max 3000 cartons');
  const win = o.window === undefined ? {} : obj(o.window, 'window');
  const window = { from: date(win.from, 'window.from'), to: date(win.to, 'window.to') };
  if (window.from && window.to && window.from > window.to) throw new PalletInputError('window.to', 'must be on or after from');
  if (!Array.isArray(o.containers) || !o.containers.length || o.containers.length > 3) throw new PalletInputError('containers', 'must contain 1–3 unique presets');
  const presets = new Set<string>();
  const containers = o.containers.map((raw, i) => {
    const c = obj(raw, `containers[${i}]`), f = `containers[${i}]`;
    if (typeof c.preset !== 'string' || !['20gp', '40gp', '40hq'].includes(c.preset) || presets.has(c.preset)) throw new PalletInputError(`${f}.preset`, 'must be a unique 20gp, 40gp or 40hq');
    presets.add(c.preset);
    return { preset: c.preset as ConsolidationRequest['containers'][number]['preset'], maxCount: num(c.maxCount, `${f}.maxCount`, 0, 120, 12, true), ratePerContainer: c.ratePerContainer === undefined ? undefined : num(c.ratePerContainer, `${f}.ratePerContainer`, 0, 1e9) };
  }).sort((a, b) => cmp(a.preset, b.preset));
  const r = o.rules === undefined ? {} : obj(o.rules, 'rules');
  const rules = { keepPoTogether: bool(r.keepPoTogether, 'rules.keepPoTogether'), unloadOrderByPo: bool(r.unloadOrderByPo, 'rules.unloadOrderByPo'), maxSuppliersPerContainer: num(r.maxSuppliersPerContainer, 'rules.maxSuppliersPerContainer', 1, 30, 30, true) };
  const l = o.lcl === undefined ? undefined : obj(o.lcl, 'lcl');
  const lcl = l && { ratePerCbm: l.ratePerCbm === undefined ? undefined : num(l.ratePerCbm, 'lcl.ratePerCbm', 0, 1e9), minCbm: num(l.minCbm, 'lcl.minCbm', 0, 1e6, 0) };
  return { pos, window, containers, rules, lcl, searchBudget: num(o.searchBudget, 'searchBudget', 1, 120, 40, true) };
}
export interface ConsolidationContainer {
  preset: '20gp' | '40gp' | '40hq'; index: number; pos: string[]; cartons: number; volumeUtilPct: number;
  weight: { kg: number; lb: number }; boxes: PlannerBox[]; zones: ZoneInfo[]; checks: Check[];
  dimensions: { l: { cm: number; in: number }; w: { cm: number; in: number }; h: { cm: number; in: number } };
}
export interface ConsolidationPlan {
  id: string; containers: ConsolidationContainer[];
  remainder: { cartons: number; cbm: number; byPo: Array<{ poId: string; cartons: number; cbm: number; items: Array<{ sku: string; qty: number }> }> };
  lcl?: { cbm: number; cost?: number };
  cost: { containers: number; lcl: number; total: number; perUnit: number; currency: string } | null;
  checks: Check[]; candidateHash: string;
}
export async function consolidate(input: unknown) {
  const p = parseConsolidationRequest(input), inputHash = await hash({ engineVersion: CONSOLIDATION_ENGINE, ...p });
  const skipped: Array<{ poId: string; reason: string }> = [];
  const pos = p.pos.filter(po => {
    const reason = (p.window.from || p.window.to) && !po.readyDate ? 'readyDate missing for shipment window' : p.window.from && po.readyDate! < p.window.from ? 'readyDate before window' : p.window.to && po.readyDate! > p.window.to ? 'readyDate after window' : '';
    if (reason) skipped.push({ poId: po.poId, reason });
    return !reason;
  }).sort((a, b) => a.priority - b.priority || cmp(a.readyDate ?? '9999', b.readyDate ?? '9999') || b.items.reduce((s, it) => s + volume(it), 0) - a.items.reduce((s, it) => s + volume(it), 0) || cmp(a.poId, b.poId));
  const specs = pos.flatMap((po, i) => po.items.map(it => ({ ...it, ...(p.rules.unloadOrderByPo ? { unloadOrder: i + 1 } : {}) })));
  const cargo = { cartons: specs.reduce((s, it) => s + it.qty, 0), cbm: specs.reduce((s, it) => s + volume(it), 0), weight: weight(specs.reduce((s, it) => s + it.weight * it.qty, 0)) };
  type Mix = typeof p.containers;
  const mixes: Mix[] = [], fallback: Mix[] = [];
  const allRates = p.containers.every(c => c.ratePerContainer !== undefined);
  const mixCost = (m: Mix) => m.reduce((s, c) => s + (c.ratePerContainer ?? 0), 0);
  const compare = (a: Mix, b: Mix) => (allRates ? mixCost(a) - mixCost(b) : 0) || a.length - b.length || cmp(a.map(c => c.preset).join(), b.map(c => c.preset).join());
  // Enumerate counts, not permutations; counts beyond the upper volume bound
  // cannot produce an in-band mix. A single oversized container is retained as fallback.
  const enumerate = (i: number, m: Mix, v: number) => {
    if (i === p.containers.length) {
      if (!m.length) return;
      if (v >= cargo.cbm / .85 && v <= cargo.cbm / .55) { mixes.push([...m]); mixes.sort(compare); if (mixes.length > 12) mixes.pop(); }
      fallback.push([...m]);
      fallback.sort((a, b) => {
        const av = a.reduce((s, c) => s + volume(CONTAINER_PRESETS[c.preset]), 0), bv = b.reduce((s, c) => s + volume(CONTAINER_PRESETS[c.preset]), 0);
        return Math.abs(av - cargo.cbm / .85) - Math.abs(bv - cargo.cbm / .85) || compare(a, b);
      });
      if (fallback.length > 12) fallback.pop();
      return;
    }
    const c = p.containers[i], cv = volume(CONTAINER_PRESETS[c.preset]);
    const max = Math.min(c.maxCount, Math.max(1, Math.ceil(cargo.cbm / .55 / cv)), 120 - m.length);
    for (let n = 0; n <= max; n++) enumerate(i + 1, [...m, ...Array.from({ length: n }, () => c)], v + n * cv);
  };
  enumerate(0, [], 0);
  const usedFallback = !mixes.length && cargo.cartons > 0;
  const candidates = cargo.cartons ? (mixes.length ? mixes : fallback.length ? fallback.sort(compare) : [[]]) : [[]];
  let packs = 0, searchedMixes = 0;
  const plans: ConsolidationPlan[] = [];
  for (const mix of candidates) {
    if (packs >= p.searchBudget) break;
    searchedMixes++;
    let remaining = specs.map(it => ({ ...it }));
    const containers: ConsolidationContainer[] = [];
    for (let ci = 0; ci < mix.length && remaining.some(it => it.qty) && packs < p.searchBudget; ci++) {
      const c = mix[ci], envelope = CONTAINER_PRESETS[c.preset];
      let selected: PackItemSpec[] = [];
      const suppliers = new Set<string>();
      let result: ReturnType<typeof packWithConstraints> = { boxes: [], zones: [], unplaced: 0, stats: computeStats([], envelope) };
      // Each trial consumes a packing run. Whole-PO trials are retained only
      // when all selected cargo fits; a deferred PO rolls to the next vessel.
      for (const po of pos) {
        const items = remaining.filter(it => it.group === po.poId && it.qty > 0 && fitsDoor(it, envelope.door));
        if (!items.length) continue;
        const supplier = po.supplier ?? `unknown:${po.poId}`;
        if (!suppliers.has(supplier) && suppliers.size >= p.rules.maxSuppliersPerContainer) continue;
        if (packs >= p.searchBudget) break;
        const trial = packWithConstraints(envelope, [...selected, ...items]); packs++;
        if (p.rules.keepPoTogether && trial.unplaced && ci < mix.length - 1) {
          if (selected.length) continue;
          // Before splitting an oversized PO, try remaining vessel types alone.
          let fitsLater = false;
          for (const later of [...new Set(mix.slice(ci + 1).map(x => x.preset))]) {
            if (packs >= p.searchBudget) break;
            const laterEnvelope = CONTAINER_PRESETS[later];
            if (!remaining.filter(it => it.group === po.poId && it.qty).every(it => fitsDoor(it, laterEnvelope.door))) continue;
            const probe = packWithConstraints(laterEnvelope, items); packs++;
            if (!probe.unplaced) { fitsLater = true; break; }
          }
          if (fitsLater) continue;
        }
        // Do not displace an earlier-priority PO to make room for a later PO.
        if (selected.some(it => trial.boxes.filter(b => b.id.startsWith(`${it.id}-`)).length < result.boxes.filter(b => b.id.startsWith(`${it.id}-`)).length)) continue;
        selected = [...selected, ...items]; result = trial;
        if (trial.boxes.some(b => b.group === po.poId)) suppliers.add(supplier);
      }
      if (!result.boxes.length) continue;
      const counts = new Map<string, number>();
      for (const it of selected) counts.set(it.id, result.boxes.filter(b => b.id.startsWith(`${it.id}-`)).length);
      remaining = remaining.map(it => ({ ...it, qty: it.qty - (counts.get(it.id) ?? 0) }));
      const placedSpecs = selected.map(it => ({ ...it, qty: counts.get(it.id) ?? 0 })).filter(it => it.qty);
      const index = containers.length;
      containers.push({ preset: c.preset, index, pos: [...new Set(result.boxes.map(b => b.group!))], cartons: result.boxes.length, volumeUtilPct: result.stats.volumeUtil, weight: weight(result.stats.totalWeight),
        boxes: result.boxes.map(b => ({ ...b, id: `container${index}-${b.id}` })), zones: result.zones,
        dimensions: { l: dimensions(envelope.l), w: dimensions(envelope.w), h: dimensions(envelope.h) },
        checks: containerChecks({ container: envelope, specs: placedSpecs, boxes: result.boxes, unplaced: 0, totalWeight: result.stats.totalWeight }) });
    }
    const byPo = pos.map(po => {
      const items = remaining.filter(it => it.group === po.poId && it.qty);
      return { poId: po.poId, cartons: items.reduce((s, it) => s + it.qty, 0), cbm: items.reduce((s, it) => s + volume(it), 0), items: items.map(it => ({ sku: it.sku, qty: it.qty })) };
    }).filter(po => po.cartons);
    const remainder = { cartons: byPo.reduce((s, po) => s + po.cartons, 0), cbm: byPo.reduce((s, po) => s + po.cbm, 0), byPo };
    const lclCbm = remainder.cartons ? Math.max(remainder.cbm, p.lcl?.minCbm ?? 0) : 0;
    const lclCost = p.lcl?.ratePerCbm === undefined ? undefined : lclCbm * p.lcl.ratePerCbm;
    const rated = containers.every(c => p.containers.find(x => x.preset === c.preset)!.ratePerContainer !== undefined) && (!remainder.cartons || lclCost !== undefined);
    const containerCost = containers.reduce((s, c) => s + (p.containers.find(x => x.preset === c.preset)!.ratePerContainer ?? 0), 0);
    const split = pos.filter(po => containers.filter(c => c.pos.includes(po.poId)).length + Number(byPo.some(x => x.poId === po.poId)) > 1).map(po => po.poId);
    const checks: Check[] = [
      { code: 'ALL_CARGO_PLACED', status: remainder.cartons ? 'fail' : 'pass', observed: cargo.cartons - remainder.cartons, limit: cargo.cartons, assumption: 'FCL placements only; LCL is a volume/cost estimate, not a verified load.' },
      { code: 'PO_TOGETHER', status: split.length ? 'warn' : 'pass', ids: split, assumption: 'A PO in multiple containers or both FCL and remainder is split. Whole-PO preference is heuristic, not guaranteed.' },
      { code: 'WINDOW_RESPECTED', status: p.window.from || p.window.to ? 'pass' : 'not_evaluated', assumption: p.window.from || p.window.to ? 'Inclusive ready-date window; missing dates excluded. Priority does not override eligibility.' : 'No shipment window supplied.' },
      { code: 'RATES_PROVIDED', status: rated ? 'pass' : 'not_evaluated', assumption: 'All used containers and any LCL remainder need rates in one user-supplied currency; origin/destination charges and cut-offs are not modelled.' },
    ];
    const plan = { id: `mix-${searchedMixes}`, containers, remainder, ...(p.lcl ? { lcl: { cbm: lclCbm, ...(lclCost === undefined ? {} : { cost: lclCost }) } } : {}),
      cost: rated ? { containers: containerCost, lcl: lclCost ?? 0, total: containerCost + (lclCost ?? 0), perUnit: cargo.cartons ? (containerCost + (lclCost ?? 0)) / cargo.cartons : 0, currency: 'user-supplied' } : null, checks };
    const { id: _id, ...candidate } = plan;
    const candidateHash = await hash({ inputHash, ...candidate });
    if (!plans.some(p => p.candidateHash === candidateHash)) plans.push({ ...plan, candidateHash });
  }
  plans.sort((a, b) => Number(!!a.remainder.cartons) - Number(!!b.remainder.cartons) || (a.cost && b.cost ? a.cost.total - b.cost.total : 0) || a.containers.length - b.containers.length || b.containers.reduce((s, c) => s + c.volumeUtilPct, 0) / (b.containers.length || 1) - a.containers.reduce((s, c) => s + c.volumeUtilPct, 0) / (a.containers.length || 1) || cmp(a.id, b.id));
  return { engineVersion: CONSOLIDATION_ENGINE, inputHash, eligible: { poIds: pos.map(po => po.poId), skipped }, cargo, plans: plans.slice(0, 3),
    outcome: (plans.some(p => p.containers.length > 0) || !cargo.cartons ? 'found' : 'none_fit_budget') as 'found' | 'none_fit_budget', searched: { mixes: searchedMixes, packs, budget: p.searchBudget }, semantics: CHECK_SEMANTICS,
    notes: ['Bounded deterministic heuristic: best options found, not an optimum or a booking. Rates are yours, in one currency. Origin/destination charges and cut-offs are not modelled unless included in your rates.', 'Boxes and zones use cm/kg; dimensions and weights also include in/lb. Missing suppliers count separately. Default maxCount is 12 per preset. Fragile means zero weight on top.', ...(usedFallback ? ['No mix in the 55–85% volume band; closest-volume allowed mixes were screened as an explicit fallback.'] : [])] };
}
export type ConsolidationResult = Awaited<ReturnType<typeof consolidate>>;
export const CONSOLIDATION_EXAMPLE: ConsolidationRequest = { pos: [
  { poId: 'PO-1001', supplier: 'Factory A', readyDate: '2026-09-15', priority: 1, items: [{ sku: 'A', l: 100, w: 100, h: 100, qty: 12, weight: 50 }] },
  { poId: 'PO-1002', supplier: 'Factory B', readyDate: '2026-09-16', priority: 2, items: [{ sku: 'B', l: 100, w: 100, h: 100, qty: 10, weight: 40 }] },
], containers: [{ preset: '20gp', maxCount: 2 }, { preset: '40gp', maxCount: 1 }, { preset: '40hq', maxCount: 1 }], rules: { keepPoTogether: true } };
