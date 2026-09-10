import { quoteOrder, parseQuoteRequest, QUOTE_LIMITS, type OrderQuoteRequest, type OrderQuote } from './orderQuote';
import { PalletInputError } from './palletEstimate';
import { CHECK_SEMANTICS, type Check } from './packChecks';
import type { PackingOptions } from './binPacking';

export interface OrderOptionsRequest extends OrderQuoteRequest {
  targetPalletCount?: number;
  adjustments?: Array<{ sku: string; minQty: number; maxQty: number; qtyStep?: number }>;
  economics?: {
    palletFreight?: number; handlingPerPallet?: number;
    contributionPerUnit?: Record<string, number>; deferralCostPerUnit?: Record<string, number>; currency?: string;
  };
  searchBudget?: number;
}
export const OPTIONS_ENGINE = 'order-options-v1';
export const OPTIONS_LIMITS = { ...QUOTE_LIMITS, bodyBytes: 48 * 1024, searchBudget: 200 } as const;
type Change = { sku: string; from: number; to: number; delta: number };
type Economics = { freightSaved: number; handlingSaved: number; contributionDeferred: number; deferralCost: number; netSavings: number } | { netSavings: null; reason: string };
export interface OrderOptions {
  engineVersion: string; inputHash: string; orderId: string | null;
  baseline: { palletCount: number; quote: OrderQuote }; target: number;
  searched: { candidates: number; budget: number; phase1: number; phase2: number };
  alternatives: Array<{ id: string; palletCount: number; strategy: string; packing: PackingOptions; quantityChanges: Change[]; quote: OrderQuote; candidateHash: string; economics: Economics }>;
  outcome: 'found' | 'none_within_search' | 'already_at_target';
  checks: Check[]; semantics: string; notes: string[];
}
const object = (v: unknown, field: string): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new PalletInputError(field, 'must be an object');
  return v as Record<string, unknown>;
};
const integer = (v: unknown, field: string, min: number, max: number) => {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw new PalletInputError(field, `must be a whole number from ${min} to ${max}`);
  return v;
};
const money = (v: unknown, field: string) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1e12) throw new PalletInputError(field, 'must be a finite non-negative number up to 1000000000000');
  return v;
};
// Sort object keys recursively, preserving array order (SKU order affects packing).
const stable = (v: unknown): unknown => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object'
  ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, x]) => [k, stable(x)])) : v;
const hash = async (v: unknown) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(stable(v))))), b => b.toString(16).padStart(2, '0')).join('');

const suppliedCost = (map: Record<string, number> | undefined, sku: string) => map && Object.prototype.hasOwnProperty.call(map, sku) ? map[sku] : undefined;

function economicsFor(e: OrderOptionsRequest['economics'], changes: Change[], saved: number): Economics {
  if (!e || e.palletFreight === undefined || e.handlingPerPallet === undefined || changes.some(c => suppliedCost(e.contributionPerUnit, c.sku) === undefined || (c.delta < 0 && suppliedCost(e.deferralCostPerUnit, c.sku) === undefined))) {
    return { netSavings: null, reason: 'Add costs to compute: supply freight and handling per pallet, contribution for changed SKUs, and deferral cost for reduced SKUs (explicit zero is accepted).' };
  }
  const freightSaved = saved * e.palletFreight;
  const handlingSaved = saved * e.handlingPerPallet;
  const contributionDeferred = changes.reduce((n, c) => n - c.delta * suppliedCost(e.contributionPerUnit, c.sku)!, 0);
  const deferralCost = changes.reduce((n, c) => n + Math.max(0, -c.delta) * (suppliedCost(e.deferralCostPerUnit, c.sku) ?? 0), 0);
  return { freightSaved, handlingSaved, contributionDeferred, deferralCost, netSavings: freightSaved + handlingSaved - contributionDeferred - deferralCost };
}

/** Bounded search using the existing quote/planning/packing chain; baseline is outside the candidate budget. */
export async function findOrderOptions(input: unknown): Promise<OrderOptions> {
  const raw = object(input, 'request');
  const parsed = parseQuoteRequest(input);
  const budget = raw.searchBudget === undefined ? 60 : integer(raw.searchBudget, 'searchBudget', 1, 200);
  const explicitTarget = raw.targetPalletCount === undefined ? undefined : integer(raw.targetPalletCount, 'targetPalletCount', 1, QUOTE_LIMITS.pallets);
  if (raw.adjustments !== undefined && !Array.isArray(raw.adjustments)) throw new PalletInputError('adjustments', 'must be an array');
  const seen = new Set<string>();
  const adjustments = ((raw.adjustments ?? []) as unknown[]).map((v, i) => {
    const a = object(v, `adjustments[${i}]`), f = `adjustments[${i}]`;
    if (typeof a.sku !== 'string' || !parsed.items.some(it => it.sku === a.sku) || seen.has(a.sku)) throw new PalletInputError(`${f}.sku`, 'must name a unique existing SKU');
    seen.add(a.sku);
    const minQty = integer(a.minQty, `${f}.minQty`, 0, QUOTE_LIMITS.cartons);
    const maxQty = integer(a.maxQty, `${f}.maxQty`, minQty, QUOTE_LIMITS.cartons);
    const qtyStep = a.qtyStep === undefined ? 1 : integer(a.qtyStep, `${f}.qtyStep`, 1, QUOTE_LIMITS.cartons);
    const current = parsed.items.find(it => it.sku === a.sku)!.qty;
    if (current < minQty || current > maxQty) throw new PalletInputError(f, 'range must include the current quantity');
    return { sku: a.sku, minQty, maxQty, qtyStep };
  }).sort((a, b) => parsed.items.findIndex(it => it.sku === a.sku) - parsed.items.findIndex(it => it.sku === b.sku));
  let economics: OrderOptionsRequest['economics'];
  if (raw.economics !== undefined) {
    const e = object(raw.economics, 'economics');
    economics = {};
    for (const k of ['palletFreight', 'handlingPerPallet'] as const) if (e[k] !== undefined) economics[k] = money(e[k], `economics.${k}`);
    for (const k of ['contributionPerUnit', 'deferralCostPerUnit'] as const) if (e[k] !== undefined) {
      economics[k] = Object.fromEntries(Object.entries(object(e[k], `economics.${k}`)).map(([sku, v]) => {
        if (!parsed.items.some(it => it.sku === sku)) throw new PalletInputError(`economics.${k}.${sku}`, 'unknown SKU');
        return [sku, money(v, `economics.${k}.${sku}`)];
      }));
    }
    if (e.currency !== undefined) {
      if (typeof e.currency !== 'string' || !/^[A-Z]{3}$/.test(e.currency)) throw new PalletInputError('economics.currency', 'must be a three-letter uppercase currency code');
      economics.currency = e.currency;
    }
  }
  const baselineQuote = await quoteOrder(input);
  const baselineCount = baselineQuote.summary.palletCount;
  const target = explicitTarget ?? Math.max(1, baselineCount - 1);
  const inputHash = await hash({ engine: OPTIONS_ENGINE, quote: baselineQuote.inputHash, target, adjustments, economics, budget });
  const alternatives: OrderOptions['alternatives'] = [];
  const searched = { candidates: 0, budget, phase1: 0, phase2: 0 };
  const request: OrderQuoteRequest = { ...(input as OrderQuoteRequest), items: (input as OrderQuoteRequest).items.map((it, i) => ({ ...it, sku: parsed.items[i].sku })), actuals: undefined };
  const candidateKeys = new Set<string>();
  const tryCandidate = async (quantities: number[], packing: PackingOptions, phase: 'phase1' | 'phase2') => {
    if (searched.candidates >= budget) return;
    const total = quantities.reduce((a, b) => a + b, 0);
    if (!total || total > QUOTE_LIMITS.cartons) return;
    const key = JSON.stringify({ quantities, packing });
    if (candidateKeys.has(key)) return;
    candidateKeys.add(key);
    searched.candidates++; searched[phase]++;
    const candidate = { ...request, packing, items: request.items.flatMap((it, i) => quantities[i] ? [{ ...it, qty: quantities[i] }] : []) };
    const quote = await quoteOrder(candidate);
    const quantityChanges = parsed.items.flatMap((it, i) => quantities[i] === it.qty ? [] : [{ sku: it.sku, from: it.qty, to: quantities[i], delta: quantities[i] - it.qty }]);
    const count = quote.summary.palletCount;
    // Extra units may fill spare capacity without a new pallet. Reductions/repacking must save a pallet.
    const additionOnly = quantityChanges.length > 0 && quantityChanges.every(c => c.delta > 0);
    if (quote.status !== 'complete' || (additionOnly ? count > baselineCount : count >= baselineCount)) return;
    // Explicit numeric guard also covers missing-tare gross-weight warnings.
    if (quote.pallets.some(p => (parsed.limits.maxLoadedHeight !== undefined && Math.max(0, ...p.boxes.map(b => b.py + b.h)) + parsed.pallet.baseHeight + parsed.allowance.height > parsed.limits.maxLoadedHeight + 1e-6) || (parsed.limits.maxGrossWeight !== undefined && p.boxes.reduce((n, b) => n + (b.weight ?? 0), 0) + (parsed.tare ?? 0) + parsed.allowance.weight > parsed.limits.maxGrossWeight + 1e-6))) return;
    const candidateHash = await hash({ engine: OPTIONS_ENGINE, quote: quote.inputHash, packing });
    // Same quantities/count from several strategies are one practical alternative.
    if (alternatives.some(a => a.palletCount === count && JSON.stringify(a.quantityChanges) === JSON.stringify(quantityChanges))) return;
    alternatives.push({ id: `option-${candidateHash.slice(0, 16)}`, palletCount: count, strategy: `${packing.strategy ?? 'best-of-three'}/${packing.ordering ?? 'standard'}`, packing, quantityChanges, quote, candidateHash, economics: economicsFor(economics, quantityChanges, baselineCount - count) });
  };
  const current = parsed.items.map(it => it.qty);
  if (baselineQuote.status !== 'complete' || baselineCount > target) {
    for (const ordering of [undefined, 'heaviest-first', 'largest-footprint-first', 'tallest-first', 'reverse'] as const) {
      for (const strategy of ['default', 'height', 'footprint'] as const) {
        if (searched.candidates >= budget) break;
        await tryCandidate(current, { strategy, ordering }, 'phase1');
      }
    }
    if (!alternatives.length && adjustments.length && searched.candidates < budget) {
      const choices = adjustments.map(a => {
        const index = parsed.items.findIndex(it => it.sku === a.sku), from = current[index], values: number[] = [];
        for (let q = from - a.qtyStep; q >= a.minQty; q -= a.qtyStep) values.push(q);
        for (let q = from + a.qtyStep; q <= a.maxQty; q += a.qtyStep) values.push(q);
        return { index, values };
      });
      for (const c of choices) for (const qty of c.values) {
        if (searched.candidates >= budget) break;
        const q = [...current]; q[c.index] = qty;
        await tryCandidate(q, {}, 'phase2');
      }
      pairs: for (let i = 0; i < choices.length; i++) for (let j = i + 1; j < choices.length; j++) {
        for (const a of choices[i].values) for (const b of choices[j].values) {
          if (searched.candidates >= budget) break pairs;
          const q = [...current]; q[choices[i].index] = a; q[choices[j].index] = b;
          await tryCandidate(q, {}, 'phase2');
        }
      }
    }
  }
  alternatives.sort((a, b) => a.palletCount - b.palletCount || a.quantityChanges.reduce((n, c) => n + Math.abs(c.delta), 0) - b.quantityChanges.reduce((n, c) => n + Math.abs(c.delta), 0) || (b.economics.netSavings ?? -Infinity) - (a.economics.netSavings ?? -Infinity) || a.id.localeCompare(b.id));
  const best = alternatives.slice(0, 3);
  const conservation = best.every(a => parsed.items.every(it => {
    const c = a.quantityChanges.find(c => c.sku === it.sku), permission = adjustments.find(p => p.sku === it.sku);
    const qty = c?.to ?? it.qty;
    return (!c || (permission && qty >= permission.minQty && qty <= permission.maxQty && c.delta % permission.qtyStep === 0)) && (a.quote.byItem.find(b => b.sku === it.sku)?.placed ?? 0) === qty;
  }));
  return {
    engineVersion: `${baselineQuote.engineVersion}+${OPTIONS_ENGINE}`, inputHash, orderId: baselineQuote.orderId,
    baseline: { palletCount: baselineCount, quote: baselineQuote }, target, searched, alternatives: best,
    outcome: baselineQuote.status === 'complete' && baselineCount <= target ? 'already_at_target' : best.length ? 'found' : 'none_within_search',
    checks: [
      { code: 'ORDER_OPTIONS_CONSERVATION', status: conservation ? 'pass' : 'fail', assumption: 'Every original SKU is placed at its original quantity plus only explicitly permitted changes; zero means all its units are deferred.' },
      { code: 'LIMITS_UNCHANGED', status: 'pass', assumption: 'Every candidate uses the original pallet envelope, maxPallets, packaging and receiver limits. Only complete quotes qualify.' },
      { code: 'SEARCH_BUDGET', status: searched.candidates >= budget ? 'warn' : 'pass', observed: searched.candidates, limit: budget, assumption: 'Baseline excluded; each candidate plan consumes one slot. Exhaustion is not proof that no better option exists.' },
    ], semantics: CHECK_SEMANTICS,
    notes: ['BEST_OPTION_FOUND_NOT_MINIMUM', 'TARGET_IS_A_GOAL: fewer-pallet improvements may fall short of target; additions may fill capacity at the baseline pallet count.', 'QUANTITY_STEP_ANCHORED_AT_CURRENT', 'ECONOMICS: customer-supplied costs; added contribution reduces contributionDeferred; omitted required costs are not assumed zero.'],
  };
}
