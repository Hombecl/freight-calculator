import { packContainer, type PackItemSpec } from './binPacking';
import { CHECK_SEMANTICS, type Check } from './packChecks';
import { PalletInputError } from './palletEstimate';
export type Units = 'cm-kg' | 'in-lb';
export interface CatalogBox {
    id: string;
    l: number;
    w: number;
    h: number;
    maxWeight?: number;
    cost?: number;
}
export interface BoxCatalogRequest {
    units?: Units;
    skus: Array<{
        sku: string;
        l: number;
        w: number;
        h: number;
        weight: number;
        keepUpright?: boolean;
        fragile?: boolean;
    }>;
    orders: Array<{
        orderId?: string;
        lines: Array<{
            sku: string;
            qty: number;
        }>;
        count?: number;
    }>;
    currentBoxes?: CatalogBox[];
    candidateBoxes?: CatalogBox[];
    catalogSize: number;
    billing: {
        dimDivisor: number;
        unit: Units;
        minBillableWeight?: number;
        ratePerKgOrLb?: number;
    };
    voidFillCostPerLitre?: number;
    searchBudget?: number;
}
export const BOX_LIMITS = {
    skus: 300, orders: 500, candidates: 40, unitsPerOrder: 60, distinctSkus: 10, bodyBytes: 96 * 1024, searchBudget: 1000
};
export const BOX_ENGINE = 'box-catalog-v1';
const LB = 0.45359237;
const weight = (kg: number) => ({ kg, lb: kg / LB });
const volume = (b: {
    l: number;
    w: number;
    h: number;
}) => b.l * b.w * b.h;
function obj(v: unknown, f: string): Record<string, unknown> {
    if (!v || typeof v !== 'object' || Array.isArray(v))
        throw new PalletInputError(f, 'must be an object');
    return v as Record<string, unknown>;
}
function num(v: unknown, f: string, min: number, max: number, fallback?: number): number {
    if (v === undefined && fallback !== undefined)
        return fallback;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max)
        throw new PalletInputError(f, `must be ${min}–${max}`);
    return v;
}
function integer(v: unknown, f: string, min: number, max: number, fallback?: number) {
    const n = num(v, f, min, max, fallback);
    if (!Number.isInteger(n))
        throw new PalletInputError(f, 'must be an integer');
    return n;
}
function str(v: unknown, f: string) {
    if (typeof v !== 'string' || !v.trim() || v.trim().length > 80)
        throw new PalletInputError(f, 'must be a nonempty string, max 80 characters');
    return v.trim();
}
function array(v: unknown, f: string, max: number) {
    if (!Array.isArray(v) || !v.length || v.length > max)
        throw new PalletInputError(f, `requires 1–${max} entries`);
    return v;
}
function units(v: unknown, f: string): Units {
    if (v !== 'cm-kg' && v !== 'in-lb')
        throw new PalletInputError(f, 'must be cm-kg or in-lb');
    return v;
}
export function parseBoxCatalog(input: unknown) {
    const o = obj(input, 'request'), u = units(o.units === undefined ? 'cm-kg' : o.units, 'units'), L = u === 'in-lb' ? 2.54 : 1, W = u === 'in-lb' ? LB : 1;
    const dims = (v: Record<string, unknown>, f: string, max = 1000) => ({ l: num(v.l, `${f}.l`, .1, max) * L, w: num(v.w, `${f}.w`, .1, max) * L, h: num(v.h, `${f}.h`, .1, max) * L });
    const seen = new Set<string>();
    const skus = array(o.skus, 'skus', 300).map((v, i) => {
        const f = `skus[${i}]`, s = obj(v, f), sku = str(s.sku, `${f}.sku`);
        if (seen.has(sku))
            throw new PalletInputError(`${f}.sku`, 'duplicate');
        seen.add(sku);
        for (const k of ['keepUpright', 'fragile'])
            if (s[k] !== undefined && typeof s[k] !== 'boolean')
                throw new PalletInputError(`${f}.${k}`, 'must be boolean');
        return {
            sku, ...dims(s, f), weight: num(s.weight, `${f}.weight`, 0, 10000) * W, keepUpright: s.keepUpright === true, fragile: s.fragile === true
        };
    });
    const orders = array(o.orders, 'orders', 500).map((v, i) => {
        const f = `orders[${i}]`, s = obj(v, f), quantities = new Map<string, number>();
        array(s.lines, `${f}.lines`, 60).forEach((v, j) => {
            const k = `${f}.lines[${j}]`, line = obj(v, k), sku = str(line.sku, `${k}.sku`);
            if (!seen.has(sku))
                throw new PalletInputError(`${k}.sku`, 'unknown SKU');
            quantities.set(sku, (quantities.get(sku) ?? 0) + integer(line.qty, `${k}.qty`, 1, 60));
        });
        if (quantities.size > 10 || [...quantities.values()].reduce((a, b) => a + b, 0) > 60)
            throw new PalletInputError(`${f}.lines`, 'max 10 distinct SKUs and 60 units');
        return { ...(s.orderId === undefined ? {} : { orderId: str(s.orderId, `${f}.orderId`) }), count: integer(s.count, `${f}.count`, 1, 1000000, 1), lines: [...quantities].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([sku, qty]) => ({ sku, qty })) };
    });
    function boxes(v: unknown, f: string): CatalogBox[] | undefined {
        if (v === undefined)
            return undefined;
        const ids = new Set<string>();
        return array(v, f, 40).map((v, i) => {
            const k = `${f}[${i}]`, b = obj(v, k), id = str(b.id, `${k}.id`);
            if (ids.has(id))
                throw new PalletInputError(`${k}.id`, 'duplicate');
            ids.add(id);
            return {
                id, ...dims(b, k, 60000), ...(b.maxWeight === undefined ? {} : { maxWeight: num(b.maxWeight, `${k}.maxWeight`, 0, 100000) * W }), ...(b.cost === undefined ? {} : { cost: num(b.cost, `${k}.cost`, 0, 1000000) })
            };
        });
    }
    const b = obj(o.billing, 'billing');
    return {
        skus, orders, currentBoxes: boxes(o.currentBoxes, 'currentBoxes'), candidateBoxes: boxes(o.candidateBoxes, 'candidateBoxes'), catalogSize: integer(o.catalogSize, 'catalogSize', 1, 12), billing: {
            unit: units(b.unit, 'billing.unit'), dimDivisor: num(b.dimDivisor, 'billing.dimDivisor', .001, 1000000), minBillableWeight: num(b.minBillableWeight, 'billing.minBillableWeight', 0, 1000000, 0), ...(b.ratePerKgOrLb === undefined ? {} : { ratePerKgOrLb: num(b.ratePerKgOrLb, 'billing.ratePerKgOrLb', 0, 1000000) })
        }, voidFillCostPerLitre: num(o.voidFillCostPerLitre, 'voidFillCostPerLitre', 0, 1000000, 0), searchBudget: integer(o.searchBudget, 'searchBudget', 1, 1000, 200), grid: u === 'in-lb' ? 1.27 : 1
    };
}
type Parsed = ReturnType<typeof parseBoxCatalog>;
function specs(p: Parsed, order: Parsed['orders'][number]): PackItemSpec[] {
    return order.lines.map(line => {
        const s = p.skus.find(s => s.sku === line.sku)!;
        return {
            ...s, id: s.sku, label: s.sku, qty: line.qty, color: 0x60a5fa, ...(s.fragile ? { maxStack: 0 } : {})
        };
    });
}
function metrics(p: Parsed, items: PackItemSpec[], b: CatalogBox) {
    const actual = items.reduce((n, s) => n + s.weight * s.qty, 0), itemVolume = items.reduce((n, s) => n + volume(s) * s.qty, 0);
    const dim = volume(b) / (p.billing.unit === 'in-lb' ? 2.54 ** 3 : 1) / p.billing.dimDivisor * (p.billing.unit === 'in-lb' ? LB : 1);
    const billed = Math.max(actual, dim, p.billing.minBillableWeight * (p.billing.unit === 'in-lb' ? LB : 1)), voidLitres = Math.max(0, volume(b) - itemVolume) / 1000;
    const cost = p.billing.ratePerKgOrLb === undefined ? undefined : billed / (p.billing.unit === 'in-lb' ? LB : 1) * p.billing.ratePerKgOrLb + voidLitres * p.voidFillCostPerLitre + (b.cost ?? 0);
    return {
        billedWeight: weight(billed), actualWeight: weight(actual), dimWeight: weight(dim), voidLitres, ...(cost === undefined ? {} : { cost })
    };
}
function generated(p: Parsed): CatalogBox[] {
    const unique = new Map<string, CatalogBox>();
    for (const order of p.orders) {
        const items = specs(p, order);
        let side = Math.max(...items.flatMap(s => [s.l, s.w, s.h]), Math.cbrt(items.reduce((n, s) => n + volume(s) * s.qty, 0)));
        let fit = packContainer({ l: side, w: side, h: side }, items);
        for (let i = 0; fit.unplaced && i < 60; i++) {
            side *= 1.15;
            fit = packContainer({ l: side, w: side, h: side }, items);
        }
        if (fit.unplaced)
            throw new PalletInputError('orders', 'candidate generation could not fit all units');
        const ceil = (n: number) => Math.ceil((n - 1e-8) / p.grid) * p.grid;
        const b = {
            id: '', l: ceil(Math.max(...fit.boxes.map(b => b.px + b.l))), w: ceil(Math.max(...fit.boxes.map(b => b.pz + b.w))), h: ceil(Math.max(...fit.boxes.map(b => b.py + b.h)))
        };
        const key = `${b.l},${b.w},${b.h}`;
        if (!unique.has(key))
            unique.set(key, { ...b, id: `generated-${unique.size + 1}` });
    }
    // Retain the largest bounding needs when the grid exceeds its cap; omissions remain explicit unfit orders.
    return [...unique.values()].sort((a, b) => volume(b) - volume(a)).slice(0, 40);
}
export async function optimizeBoxCatalog(input: unknown) {
    const p = parseBoxCatalog(input), pool = p.candidateBoxes ?? generated(p), items = p.orders.map(o => specs(p, o));
    const cache = new Map<string, boolean>();
    const fits = (i: number, b: CatalogBox) => {
        const key = JSON.stringify([p.orders[i].lines, b]);
        if (!cache.has(key))
            cache.set(key, packContainer(b, items[i]).unplaced === 0);
        return cache.get(key)!;
    };
    const fallback = [...pool].sort((a, b) => volume(b) - volume(a))[0];
    function evaluate(catalog: CatalogBox[]) {
        const perOrder = p.orders.map((o, i) => {
            const options = catalog.filter(b => fits(i, b)).map(b => ({ b, m: metrics(p, items[i], b) }));
            options.sort((a, b) => (a.m.cost ?? a.m.billedWeight.kg) - (b.m.cost ?? b.m.billedWeight.kg) || volume(a.b) - volume(b.b));
            const chosen = options[0];
            return {
                ...o, boxId: chosen?.b.id ?? null, unfit: !chosen, ...(chosen?.m ?? metrics(p, items[i], fallback))
            };
        });
        const sum = (fn: (o: typeof perOrder[number]) => number) => perOrder.reduce((n, o) => n + fn(o) * o.count, 0);
        return { perOrder, totals: {
                orders: sum(() => 1), billedWeight: weight(sum(o => o.billedWeight.kg)), dimPenaltyWeight: weight(sum(o => Math.max(0, o.dimWeight.kg - o.actualWeight.kg))), voidLitres: sum(o => o.voidLitres), ...(p.billing.ratePerKgOrLb === undefined ? {} : { cost: sum(o => o.cost!) }), unfitOrders: sum(o => o.unfit ? 1 : 0)
            } };
    }
    let combos = 0;
    const score = (c: CatalogBox[]) => {
        combos++;
        const t = evaluate(c).totals;
        return t.cost ?? t.billedWeight.kg;
    };
    const coverage = (b: CatalogBox) => p.orders.reduce((n, o, i) => n + (fits(i, b) ? items[i].reduce((v, s) => v + volume(s) * s.qty, 0) * o.count : 0), 0);
    const ranked = pool.map(b => ({ b, coverage: coverage(b) })).sort((a, b) => b.coverage - a.coverage || volume(a.b) - volume(b.b));
    let selected = [ranked[0].b];
    const target = Math.min(p.catalogSize, pool.length);
    while (selected.length < target) {
        let best = pool.find(b => !selected.includes(b))!, bestScore = Infinity;
        for (const b of pool.filter(b => !selected.includes(b))) {
            if (combos >= p.searchBudget)
                break;
            const s = score([...selected, b]);
            if (s < bestScore) {
                best = b;
                bestScore = s;
            }
        }
        selected.push(best);
    }
    let currentScore = combos < p.searchBudget ? score(selected) : (evaluate(selected).totals.cost ?? evaluate(selected).totals.billedWeight.kg);
    let improved = true;
    while (improved && combos < p.searchBudget) {
        improved = false;
        for (let i = 0; i < selected.length && combos < p.searchBudget; i++)
            for (const b of pool) {
                if (selected.includes(b) || combos >= p.searchBudget)
                    continue;
                const trial = selected.map((old, j) => j === i ? b : old), s = score(trial);
                if (s < currentScore - 1e-9) {
                    selected = trial;
                    currentScore = s;
                    improved = true;
                }
            }
    }
    const result = evaluate(selected), baseline = p.currentBoxes ? evaluate(p.currentBoxes).totals : undefined;
    const checks: Check[] = [
        {
            code: 'ALL_ORDERS_FIT', status: result.totals.unfitOrders ? 'fail' : 'pass', observed: result.totals.unfitOrders, limit: 0, assumption: 'Unfit orders are charged using the largest candidate by volume, not a shipping quote.'
        },
        {
            code: 'DIVISOR_STATED', status: 'pass', observed: p.billing.dimDivisor, assumption: `User supplied ${p.billing.unit} divisor; no carrier rounding.`
        },
        { code: 'RATE_PROVIDED', status: p.billing.ratePerKgOrLb === undefined ? 'not_evaluated' : 'pass', assumption: 'Cost requires ratePerKgOrLb; all monetary inputs must use the same currency.' },
        {
            code: 'CATALOG_SIZE_RESPECTED', status: 'pass', observed: selected.length, limit: p.catalogSize, assumption: 'Catalog size is a maximum; fewer candidates means fewer boxes.'
        },
    ];
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({ engine: BOX_ENGINE, ...p })));
    return {
        engineVersion: BOX_ENGINE, inputHash: [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join(''), catalog: selected.map(b => {
            const usedByOrders = result.perOrder.filter(o => o.boxId === b.id).reduce((n, o) => n + o.count, 0);
            return {
                ...b, dims: { cm: { l: b.l, w: b.w, h: b.h }, in: { l: b.l / 2.54, w: b.w / 2.54, h: b.h / 2.54 } }, usedByOrders, sharePct: usedByOrders / result.totals.orders * 100
            };
        }), ...result, ...(baseline ? { baseline, savings: { billedWeightPct: baseline.billedWeight.kg ? (baseline.billedWeight.kg - result.totals.billedWeight.kg) / baseline.billedWeight.kg * 100 : 0, ...(baseline.cost === undefined ? {} : { costPer1000Orders: (baseline.cost - result.totals.cost!) / baseline.orders * 1000 }) } } : {}), checks, searched: { candidates: pool.length, combos, budget: p.searchBudget }, semantics: CHECK_SEMANTICS, notes: ['HEURISTIC_CATALOG_NOT_OPTIMUM', 'NO_CUSHIONING_MODEL']
    };
}
export type BoxCatalogResult = Awaited<ReturnType<typeof optimizeBoxCatalog>>;
/** Single-order request supplies SKU definitions and billing; catalog dimensions use request units. */
export async function chooseBox(order: Omit<BoxCatalogRequest, 'orders' | 'catalogSize' | 'candidateBoxes'> & {
    lines: BoxCatalogRequest['orders'][number]['lines'];
    orderId?: string;
}, catalog: CatalogBox[]) {
    const request = {
        ...order, orders: [{ orderId: order.orderId, lines: order.lines }], candidateBoxes: catalog, catalogSize: 1
    };
    const p = parseBoxCatalog(request), s = specs(p, p.orders[0]);
    const options = p.candidateBoxes!.map(b => ({ b, plan: packContainer(b, s), m: metrics(p, s, b) })).filter(o => !o.plan.unplaced).sort((a, b) => a.m.billedWeight.kg - b.m.billedWeight.kg || volume(a.b) - volume(b.b));
    const choice = options[0];
    const result = await optimizeBoxCatalog({ ...request, ...(choice ? { candidateBoxes: [catalog[p.candidateBoxes!.indexOf(choice.b)]] } : {}) });
    return {
        ...result, boxId: choice?.b.id ?? null, box: choice?.b ?? null, plan: choice?.plan ?? { boxes: [], unplaced: s.reduce((n, s) => n + s.qty, 0) }
    };
}
export const BOX_EXAMPLE: BoxCatalogRequest = {
    skus: [{
            sku: 'A', l: 10, w: 10, h: 10, weight: .2
        }], orders: [{ orderId: 'one', lines: [{ sku: 'A', qty: 1 }], count: 80 }, { orderId: 'two', lines: [{ sku: 'A', qty: 2 }], count: 20 }], currentBoxes: [{
            id: 'old', l: 30, w: 30, h: 30
        }], candidateBoxes: [{
            id: 'small', l: 10, w: 10, h: 10
        }, {
            id: 'double', l: 20, w: 10, h: 10
        }, {
            id: 'large', l: 30, w: 30, h: 30
        }], catalogSize: 2, billing: { unit: 'cm-kg', dimDivisor: 5000, ratePerKgOrLb: 2 }
};
