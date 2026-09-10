import type { PackingOptions } from './binPacking';
import { CHECK_SEMANTICS } from './packChecks';
/**
 * orderQuote.ts — "pallet count and loaded dimensions BEFORE freight quoting".
 *
 * Why this exists (2026-09-10): the first real API inbound was a warehouse
 * automation engineer who wanted a pallet's likely height at order time, to
 * feed a freight quote. planOrder() already computes the placements; what a
 * quoting workflow additionally needs is:
 *   - stable identity (orderId, sku ids) so results can be reconciled later,
 *   - explicit units in, always cm/kg internally, both units out,
 *   - gross weight (cargo + pallet tare) and outer dimensions incl. packaging
 *     allowance — the numbers a carrier's rating API actually asks for,
 *   - a receiving/carrier limit profile checked separately from the packing
 *     envelope, with every check reporting observed / limit / assumption,
 *   - needs_review instead of a silent whole-order quote when something is
 *     missing or a limit fails,
 *   - inputHash + engineVersion so a quote can be reproduced and disputed,
 *   - predicted-vs-measured variance from actuals, which is the evidence
 *     that eventually earns "won't be rebilled" — we do not claim it yet.
 *
 * Pure and deterministic given the same input (the hash is over the canonical
 * cm/kg request). Runs in the browser, Node and Cloudflare Workers.
 */

import { planOrder, ORDER_ENGINE, type OrderPlan } from './orderPlanning';
import { PalletInputError, PALLET_LIMITS, type PalletRequest } from './palletEstimate';

export const QUOTE_ENGINE = 'quote-v1';
export const QUOTE_LIMITS = { ...PALLET_LIMITS, pallets: 20, orderIdChars: 80, skuChars: 60 } as const;

export type QuoteUnits = 'cm-kg' | 'in-lb';
const CM_PER_IN = 2.54;
const KG_PER_LB = 0.45359237;

export interface OrderQuoteRequest {
  /** Optional reproducible packing selection; omitted preserves the original best-of-three behavior. */
  packing?: PackingOptions;
  /** caller's order reference; echoed back and used as the meter id */
  orderId?: string;
  /** units of every dimension/weight in THIS request; default cm-kg */
  units?: QuoteUnits;
  pallet: {
    l: number; w: number;
    baseHeight: number;
    /** packing envelope: total height cap incl. base */
    maxHeight: number;
    /** packing envelope: cargo payload cap (excl. tare) */
    maxWeight: number;
    /** empty pallet weight; needed for gross weight. Missing → assumption noted */
    tareWeight?: number;
  };
  /** added to every pallet's outer dims/weight: stretch wrap, top cap, slip sheet */
  packagingAllowance?: { height?: number; weight?: number };
  /** what the RECEIVER / CARRIER accepts — checked, not packed against */
  limits?: { name?: string; maxLoadedHeight?: number; maxGrossWeight?: number };
  items: Array<{
    /** stable SKU/carton id from the caller's system (falls back to label) */
    sku?: string;
    label?: string;
    l: number; w: number; h: number;
    qty: number;
    weight: number;
    keepUpright?: boolean;
    maxStack?: number;
  }>;
  maxPallets?: number;
  /** measured results, keyed by pallet index ("0", "1", …), same units as request */
  actuals?: { [index: `${number}`]: { height?: number; grossWeight?: number; note?: string }; summary?: { actualPalletCount?: number; selectedOptionId?: string; measuredAt?: string } };
}

export type CheckStatus = 'pass' | 'fail' | 'warn' | 'not_evaluated';
export interface QuoteCheck {
  code: string;
  status: CheckStatus;
  observed?: number | string;
  limit?: number | string;
  /** what we assumed to reach this verdict — always stated */
  assumption: string;
  pallet?: number;
}

const str = (v: unknown, field: string, max: number, required = false): string | undefined => {
  if (v === undefined || v === null || v === '') {
    if (required) throw new PalletInputError(field, 'required');
    return undefined;
  }
  if (typeof v !== 'string') throw new PalletInputError(field, 'must be a string');
  const s = v.trim();
  if (s.length > max) throw new PalletInputError(field, `max ${max} characters`);
  return s;
};
const num = (v: unknown, field: string, min: number, max: number, required = false): number | undefined => {
  if (v === undefined || v === null || v === '') {
    if (required) throw new PalletInputError(field, 'required');
    return undefined;
  }
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new PalletInputError(field, 'must be a number');
  if (v < min || v > max) throw new PalletInputError(field, `must be ${min}–${max}`);
  return v;
};
const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

/** Validate + normalise to a canonical cm/kg request. */
export function parseQuoteRequest(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new PalletInputError('request', 'must be an object');
  const o = input as Record<string, unknown>;
  const packing: PackingOptions = {};
  if (o.packing !== undefined) {
    if (!o.packing || typeof o.packing !== 'object' || Array.isArray(o.packing)) throw new PalletInputError('packing', 'must be an object');
    const p = o.packing as Record<string, unknown>;
    if (p.strategy !== undefined) {
      if (!['default', 'height', 'footprint'].includes(p.strategy as string)) throw new PalletInputError('packing.strategy', 'unknown strategy');
      packing.strategy = p.strategy as PackingOptions['strategy'];
    }
    if (p.ordering !== undefined) {
      if (!['heaviest-first', 'largest-footprint-first', 'tallest-first', 'reverse'].includes(p.ordering as string)) throw new PalletInputError('packing.ordering', 'unknown ordering');
      packing.ordering = p.ordering as PackingOptions['ordering'];
    }
  }
  const units: QuoteUnits = o.units === undefined ? 'cm-kg' : o.units === 'cm-kg' || o.units === 'in-lb' ? o.units : (() => { throw new PalletInputError('units', "must be 'cm-kg' or 'in-lb'"); })();
  const L = units === 'in-lb' ? CM_PER_IN : 1;
  const W = units === 'in-lb' ? KG_PER_LB : 1;
  const orderId = str(o.orderId, 'orderId', QUOTE_LIMITS.orderIdChars);

  const p = (o.pallet ?? {}) as Record<string, unknown>;
  const pallet = {
    l: num(p.l, 'pallet.l', 1, 1000, true)! * L,
    w: num(p.w, 'pallet.w', 1, 1000, true)! * L,
    baseHeight: num(p.baseHeight, 'pallet.baseHeight', 0, 100, true)! * L,
    maxHeight: num(p.maxHeight, 'pallet.maxHeight', 1, 1000, true)! * L,
    maxWeight: num(p.maxWeight, 'pallet.maxWeight', 1, 100000, true)! * W,
  };
  const tareWeight = num(p.tareWeight, 'pallet.tareWeight', 0, 1000);
  const tare = tareWeight === undefined ? undefined : tareWeight * W;
  if (pallet.maxHeight <= pallet.baseHeight) throw new PalletInputError('pallet.maxHeight', 'must exceed baseHeight');

  const a = (o.packagingAllowance ?? {}) as Record<string, unknown>;
  const allowance = {
    height: (num(a.height, 'packagingAllowance.height', 0, 100) ?? 0) * L,
    weight: (num(a.weight, 'packagingAllowance.weight', 0, 100) ?? 0) * W,
  };
  const lim = (o.limits ?? {}) as Record<string, unknown>;
  const limits = {
    name: str(lim.name, 'limits.name', 80),
    maxLoadedHeight: (() => { const v = num(lim.maxLoadedHeight, 'limits.maxLoadedHeight', 1, 1000); return v === undefined ? undefined : v * L; })(),
    maxGrossWeight: (() => { const v = num(lim.maxGrossWeight, 'limits.maxGrossWeight', 1, 100000); return v === undefined ? undefined : v * W; })(),
  };

  if (!Array.isArray(o.items) || !o.items.length) throw new PalletInputError('items', 'must be a non-empty array');
  if (o.items.length > QUOTE_LIMITS.types) throw new PalletInputError('items', `max ${QUOTE_LIMITS.types} carton types`);
  const seen = new Set<string>();
  const items = o.items.map((raw, i) => {
    const it = (raw ?? {}) as Record<string, unknown>;
    const f = (k: string) => `items[${i}].${k}`;
    const label = str(it.label, f('label'), 80);
    const sku = str(it.sku, f('sku'), QUOTE_LIMITS.skuChars) ?? label ?? `sku${i}`;
    if (seen.has(sku)) throw new PalletInputError(f('sku'), `duplicate sku "${sku}"`);
    seen.add(sku);
    const qty = num(it.qty, f('qty'), 1, QUOTE_LIMITS.cartons, true)!;
    if (!Number.isInteger(qty)) throw new PalletInputError(f('qty'), 'must be a whole number');
    const maxStack = num(it.maxStack, f('maxStack'), 0, 100000);
    return {
      sku,
      label: label ?? sku,
      l: num(it.l, f('l'), 0.1, 1000, true)! * L,
      w: num(it.w, f('w'), 0.1, 1000, true)! * L,
      h: num(it.h, f('h'), 0.1, 1000, true)! * L,
      qty,
      weight: num(it.weight, f('weight'), 0, 10000, true)! * W,
      keepUpright: it.keepUpright === undefined ? true : Boolean(it.keepUpright),
      ...(maxStack === undefined ? {} : { maxStack: maxStack * W }),
    };
  });
  const totalCartons = items.reduce((s, it) => s + it.qty, 0);
  if (totalCartons > QUOTE_LIMITS.cartons) throw new PalletInputError('items', `max ${QUOTE_LIMITS.cartons} cartons per order (got ${totalCartons})`);

  const maxPallets = num(o.maxPallets, 'maxPallets', 1, QUOTE_LIMITS.pallets) ?? QUOTE_LIMITS.pallets;
  if (!Number.isInteger(maxPallets)) throw new PalletInputError('maxPallets', 'must be a whole number');

  const actuals: Record<string, { height?: number; grossWeight?: number; note?: string }> = {};
  let actualSummary: NonNullable<OrderQuoteRequest['actuals']>['summary'];
  if (o.actuals !== undefined) {
    if (!o.actuals || typeof o.actuals !== 'object' || Array.isArray(o.actuals)) throw new PalletInputError('actuals', 'must be an object keyed by pallet index');
    for (const [k, v] of Object.entries(o.actuals as Record<string, unknown>)) {
      if (k === 'summary') {
        if (!v || typeof v !== 'object' || Array.isArray(v)) throw new PalletInputError('actuals.summary', 'must be an object');
        const a = v as Record<string, unknown>;
        for (const key of ['actualPalletCount', 'selectedOptionId', 'measuredAt']) {
          if (a[key] === null || a[key] === '') throw new PalletInputError(`actuals.summary.${key}`, 'must not be null or empty');
        }
        const count = num(a.actualPalletCount, 'actuals.summary.actualPalletCount', 0, 100000);
        if (count !== undefined && !Number.isInteger(count)) throw new PalletInputError('actuals.summary.actualPalletCount', 'must be a whole number');
        const selectedOptionId = str(a.selectedOptionId, 'actuals.summary.selectedOptionId', 80);
        const measuredAt = str(a.measuredAt, 'actuals.summary.measuredAt', 40);
        if (measuredAt !== undefined) {
          const match = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.exec(measuredAt);
          const calendar = match && new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
          if (!match || !calendar || !Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== measuredAt.slice(0, 10) || !Number.isFinite(Date.parse(measuredAt))) throw new PalletInputError('actuals.summary.measuredAt', 'must be a valid ISO timestamp with timezone');
        }
        actualSummary = { ...(count === undefined ? {} : { actualPalletCount: count }), ...(selectedOptionId === undefined ? {} : { selectedOptionId }), ...(measuredAt === undefined ? {} : { measuredAt }) };
        continue;
      }
      if (!/^\d+$/.test(k) || +k >= maxPallets) throw new PalletInputError(`actuals.${k}`, 'key must be a pallet index below maxPallets');
      const av = (v ?? {}) as Record<string, unknown>;
      const height = num(av.height, `actuals.${k}.height`, 0.1, 1000);
      const grossWeight = num(av.grossWeight, `actuals.${k}.grossWeight`, 0.1, 100000);
      const note = str(av.note, `actuals.${k}.note`, 500);
      if (height === undefined && grossWeight === undefined && !note) continue;
      actuals[k] = {
        ...(height === undefined ? {} : { height: height * L }),
        ...(grossWeight === undefined ? {} : { grossWeight: grossWeight * W }),
        ...(note ? { note } : {}),
      };
    }
  }

  const canonical: PalletRequest = {
    pallet,
    items: items.map(({ sku: _sku, ...rest }) => rest),
  };
  return { orderId, units, packing, pallet, tare, allowance, limits, items, maxPallets, actuals, actualSummary, canonical };
}
export type ParsedQuote = ReturnType<typeof parseQuoteRequest>;

/** SHA-256 hex of the canonical cm/kg planning input — stable across unit systems. */
export async function inputHash(parsed: ParsedQuote): Promise<string> {
  const payload = JSON.stringify({
    engine: [ORDER_ENGINE, QUOTE_ENGINE],
    pallet: parsed.pallet,
    tare: parsed.tare ?? null,
    allowance: parsed.allowance,
    limits: parsed.limits,
    items: parsed.items,
    maxPallets: parsed.maxPallets,
    ...(Object.keys(parsed.packing).length ? { packing: parsed.packing } : {}),
  });
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

const both = (cm: number) => ({ cm: round(cm), in: round(cm / CM_PER_IN) });
const bothW = (kg: number) => ({ kg: round(kg), lb: round(kg / KG_PER_LB) });

export async function quoteOrder(input: unknown) {
  const parsed = parseQuoteRequest(input);
  const { pallet, tare, allowance, limits, items, maxPallets, actuals } = parsed;
  const plan: OrderPlan = planOrder({ request: parsed.canonical, maxPallets }, parsed.packing);
  const hash = await inputHash(parsed);

  const orderChecks: QuoteCheck[] = [];
  const stackMissing = items.filter((it) => it.maxStack === undefined).map((it) => it.sku);
  orderChecks.push({
    code: 'ORDER_COMPLETE',
    status: plan.status === 'complete' ? 'pass' : 'fail',
    observed: `${plan.placedCount}/${plan.requestedCount} cartons placed on ${plan.palletCount} pallet(s)`,
    limit: `maxPallets ${maxPallets}`,
    assumption: `${Object.keys(parsed.packing).length ? 'Selected packing heuristic' : 'Best-of-three heuristics'}; fewer pallets or a lower height may exist. A partial order must not be quoted as a whole shipment.`,
  });
  orderChecks.push({
    code: 'TARE_PROVIDED',
    status: tare === undefined ? 'warn' : 'pass',
    observed: tare === undefined ? 'missing' : `${round(tare)} kg`,
    assumption: tare === undefined ? 'Gross weight below EXCLUDES the empty pallet; add pallet.tareWeight for carrier-ready weights.' : 'Gross weight = cargo + tare + packaging allowance.',
  });
  orderChecks.push({
    code: 'STACK_LIMITS_PROVIDED',
    status: stackMissing.length ? 'warn' : 'pass',
    observed: stackMissing.length ? `${stackMissing.length} sku(s) without maxStack` : 'all skus',
    assumption: stackMissing.length ? 'Cartons without maxStack were treated as unlimited crush strength; heights may be optimistic for weak board.' : 'Per-carton maxStack enforced with load propagation.',
  });
  orderChecks.push({
    code: 'UNITS_EXPLICIT',
    status: 'pass',
    observed: parsed.units,
    assumption: 'All internal math in cm/kg; both unit systems returned.',
  });

  const pallets = plan.pallets.map((p, i) => {
    const grossWeight = p.cargoWeight + (tare ?? 0) + allowance.weight;
    const outerHeight = p.loadedHeight + allowance.height;
    const checks: QuoteCheck[] = [];
    if (limits.maxLoadedHeight !== undefined) {
      checks.push({
        code: 'LOADED_HEIGHT', pallet: i,
        status: outerHeight <= limits.maxLoadedHeight + 1e-6 ? 'pass' : 'fail',
        observed: round(outerHeight), limit: round(limits.maxLoadedHeight),
        assumption: `Outer height = pallet base + cargo + packaging allowance (${round(allowance.height)} cm), compared with ${limits.name ?? 'receiver'} limit.`,
      });
    } else {
      checks.push({ code: 'LOADED_HEIGHT', pallet: i, status: 'not_evaluated', observed: round(outerHeight), assumption: 'No limits.maxLoadedHeight supplied; only the packing envelope (pallet.maxHeight) was enforced.' });
    }
    if (limits.maxGrossWeight !== undefined) {
      checks.push({
        code: 'GROSS_WEIGHT', pallet: i,
        status: tare === undefined ? 'warn' : grossWeight <= limits.maxGrossWeight + 1e-6 ? 'pass' : 'fail',
        observed: round(grossWeight), limit: round(limits.maxGrossWeight),
        assumption: tare === undefined ? 'Tare missing — gross weight is cargo only and the limit cannot be confirmed.' : `Gross = cargo + tare + packaging allowance (${round(allowance.weight)} kg), compared with ${limits.name ?? 'receiver'} limit.`,
      });
    } else {
      checks.push({ code: 'GROSS_WEIGHT', pallet: i, status: 'not_evaluated', observed: round(grossWeight), assumption: 'No limits.maxGrossWeight supplied; only the payload envelope (pallet.maxWeight) was enforced.' });
    }
    for (const ec of p.checks) if (!['PLACEMENT_COMPLETE', 'PAYLOAD'].includes(ec.code)) checks.push({ ...ec, pallet: i });
    checks.push({
      code: 'FOOTPRINT', pallet: i, status: 'pass',
      observed: `${round(pallet.l)}×${round(pallet.w)} cm`,
      assumption: 'Every carton is placed inside the pallet footprint; no overhang is modelled, so outer L/W equal the pallet.',
    });
    const actual = actuals[String(i)];
    const variance = actual ? {
      ...(actual.height === undefined ? {} : { height: { predicted: round(outerHeight), measured: round(actual.height), delta: round(actual.height - outerHeight), deltaPct: round(((actual.height - outerHeight) / outerHeight) * 100, 1) } }),
      ...(actual.grossWeight === undefined ? {} : { grossWeight: { predicted: round(grossWeight), measured: round(actual.grossWeight), delta: round(actual.grossWeight - grossWeight), deltaPct: round(((actual.grossWeight - grossWeight) / grossWeight) * 100, 1) } }),
      ...(actual.note ? { note: actual.note } : {}),
    } : undefined;
    return {
      index: i,
      cartonCount: p.placedCount,
      loadedHeight: both(p.loadedHeight),
      outerDims: { l: both(pallet.l), w: both(pallet.w), h: both(outerHeight) },
      cargoWeight: bothW(p.cargoWeight),
      grossWeight: bothW(grossWeight),
      byItem: p.byItem.map((b) => ({ sku: items[Number(b.id.replace('sku', ''))]?.sku ?? b.id, label: b.label, placed: b.placed })),
      checks,
      ...(variance ? { variance } : {}),
      boxes: p.boxes,
    };
  });

  const allChecks = [...orderChecks, ...pallets.flatMap((p) => p.checks)];
  const failed = allChecks.filter((c) => c.status === 'fail');
  const status: 'complete' | 'partial' | 'needs_review' =
    plan.status === 'partial' ? 'partial' : failed.length ? 'needs_review' : 'complete';
  const reviewReasons = failed.map((c) => c.code + (c.pallet !== undefined ? `@pallet${c.pallet}` : ''));

  const totalGross = pallets.reduce((s, p) => s + p.grossWeight.kg, 0);
  const maxOuterH = pallets.reduce((m, p) => Math.max(m, p.outerDims.h.cm), 0);
  return {
    semantics: CHECK_SEMANTICS,
    ...(parsed.actualSummary === undefined ? {} : { variance: { summary: parsed.actualSummary } }),
    engineVersion: `${ORDER_ENGINE}+${QUOTE_ENGINE}`,
    inputHash: hash,
    orderId: parsed.orderId ?? null,
    units: { request: parsed.units, response: 'both (cm/in, kg/lb)' },
    status,
    reviewReasons,
    summary: {
      palletCount: pallets.length,
      cartonsRequested: plan.requestedCount,
      cartonsPlaced: plan.placedCount,
      cartonsUnplaced: plan.unplacedCount,
      totalGrossWeight: bothW(totalGross),
      maxOuterHeight: both(maxOuterH),
      footprint: { l: both(pallet.l), w: both(pallet.w) },
      totalFootprintArea: { m2: round((pallet.l * pallet.w * pallets.length) / 10000, 3), ft2: round((pallet.l * pallet.w * pallets.length) / 929.0304, 2) },
    },
    limits: { name: limits.name ?? null, maxLoadedHeight: limits.maxLoadedHeight === undefined ? null : both(limits.maxLoadedHeight), maxGrossWeight: limits.maxGrossWeight === undefined ? null : bothW(limits.maxGrossWeight) },
    checks: orderChecks,
    pallets,
    byItem: plan.byItem.map((b, i) => ({ sku: items[i].sku, label: b.label, requested: b.requested, placed: b.placed, remaining: b.remaining })),
    meter: { unit: 'order', id: parsed.orderId ?? hash.slice(0, 16) },
    notes: [
      'HEURISTIC_ESTIMATE: pallet count and heights are not proven minimal.',
      'SCREENING_NOT_CERTIFICATION: checks compare numbers you supplied; they do not certify transport stability, dangerous-goods compatibility or receiver acceptance.',
      'NO_OVERHANG_MODEL: cartons are kept inside the footprint; outer L/W equal the pallet.',
    ],
  };
}
export type OrderQuote = Awaited<ReturnType<typeof quoteOrder>>;

const cell = (v: string | number) => {
  const t = String(v);
  return `"${(/^[=+\-@\t\r]/.test(t) ? "'" : '') + t.replace(/"/g, '""')}"`;
};

/** Carrier-input CSV: one row per pallet, both unit systems, ready for an LTL rating form. */
export function quoteCsv(q: OrderQuote): string {
  const head = ['order_id', 'pallet', 'cartons', 'length_in', 'width_in', 'height_in', 'weight_lb', 'length_cm', 'width_cm', 'height_cm', 'weight_kg', 'status', 'checks_failed'];
  const rows = q.pallets.map((p) => [
    q.orderId ?? '', p.index + 1, p.cartonCount,
    p.outerDims.l.in, p.outerDims.w.in, p.outerDims.h.in, p.grossWeight.lb,
    p.outerDims.l.cm, p.outerDims.w.cm, p.outerDims.h.cm, p.grossWeight.kg,
    q.status, p.checks.filter((c) => c.status === 'fail').map((c) => c.code).join(';'),
  ]);
  return [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

export const QUOTE_EXAMPLE: OrderQuoteRequest = {
  orderId: 'SO-10482',
  units: 'cm-kg',
  pallet: { l: 121.92, w: 101.6, baseHeight: 14.5, maxHeight: 180, maxWeight: 900, tareWeight: 22 },
  packagingAllowance: { height: 3, weight: 1.5 },
  limits: { name: 'LTL carrier standard', maxLoadedHeight: 182, maxGrossWeight: 1000 },
  items: [
    { sku: 'TEA-1KG-CASE', label: 'Loose-leaf 1 kg × 6', l: 40, w: 30, h: 25, qty: 24, weight: 7.2, keepUpright: true, maxStack: 60 },
    { sku: 'TIN-GIFT-12', label: 'Gift tins × 12', l: 45, w: 35, h: 30, qty: 10, weight: 9.5, keepUpright: true },
    { sku: 'TEAWARE-SET', label: 'Teaware set', l: 50, w: 40, h: 35, qty: 6, weight: 11, keepUpright: true, maxStack: 20 },
  ],
  maxPallets: 5,
};
