/**
 * palletChainState — carry a pallet plan across the four chain steps.
 *
 * The chain (POSITIONING.md §4) is: cartons per pallet -> pallets per container
 * -> floor space -> storage cost. Until now each step was a standalone
 * calculator, so a visitor who worked out "142 cartons per pallet, 18 pallets"
 * on step 1 had to retype all of it on step 2. That is almost certainly why the
 * chain is not completed.
 *
 * ⛔ Why namespaced keys instead of forwarding the existing query string: the
 * steps already use the SAME letters for DIFFERENT things.
 *
 *     p  ->  pallet TYPE ('eur') on /pallet-calculator + /pallets-per-container
 *            pallet COUNT (500)  on /warehouse-space-calculator + /pallet-storage-cost-calculator
 *     h  ->  carton height on step 1, loaded pallet height on step 2
 *     m  ->  mode ('cap') on step 3, months (3) on step 4
 *
 * Forwarding `p=gma` into step 3 would evaluate `Number('gma') || 500` and
 * silently seed 500 pallets — no error, just a wrong number the user has no way
 * to spot. So the handoff uses its own `c_*` namespace that cannot collide, and
 * a page's own explicit param always wins over the carried value.
 */

export type ChainCarry = {
  /** pallet type key, e.g. 'eur' | 'gma' */
  pt?: string;
  /** cartons per pallet (step 1 result) */
  cpp?: number;
  /** pallets needed (step 1 result, only when a quantity was entered) */
  plt?: number;
  /** loaded pallet height in cm (step 1 result) */
  lh?: number;
  /** carton geometry, so the end of the chain can rebuild a REAL packed plan
   *  (savePlan needs container+specs+boxes, not a summary) — cm, and weight kg */
  cl?: number;
  cw?: number;
  ch?: number;
  cwt?: number;
};

const KEY = {
  pt: 'c_pt', cpp: 'c_cpp', plt: 'c_plt', lh: 'c_lh',
  cl: 'c_cl', cw: 'c_cw', ch: 'c_ch', cwt: 'c_cwt',
} as const;

/** Read whatever a previous step carried in. Missing/!finite values are dropped. */
export function readCarry(params: URLSearchParams): ChainCarry {
  const num = (v: string | null) => {
    if (v == null || v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const pt = params.get(KEY.pt) ?? undefined;
  return {
    pt: pt && /^[a-z0-9_-]{1,12}$/i.test(pt) ? pt : undefined,
    cpp: num(params.get(KEY.cpp)),
    plt: num(params.get(KEY.plt)),
    lh: num(params.get(KEY.lh)),
    cl: num(params.get(KEY.cl)),
    cw: num(params.get(KEY.cw)),
    ch: num(params.get(KEY.ch)),
    cwt: num(params.get(KEY.cwt)),
  };
}

/**
 * Seed a page's initial state: the page's OWN param wins (the user may have
 * deep-linked or edited it), the carried value is only a fallback, and the
 * page default is the last resort.
 */
export function seedNum(own: string | null, carried: number | undefined, fallback: number): number {
  const n = own == null || own === '' ? NaN : Number(own);
  if (Number.isFinite(n) && n > 0) return n;
  return carried ?? fallback;
}

export function seedStr(own: string | null, carried: string | undefined, fallback: string): string {
  return own || carried || fallback;
}

/** Build a chain href that carries the plan forward. Undefined values are omitted. */
export function chainHref(to: string, carry: ChainCarry): string {
  const q = new URLSearchParams();
  if (carry.pt) q.set(KEY.pt, carry.pt);
  if (carry.cpp && Number.isFinite(carry.cpp)) q.set(KEY.cpp, String(Math.round(carry.cpp)));
  if (carry.plt && Number.isFinite(carry.plt)) q.set(KEY.plt, String(Math.round(carry.plt)));
  if (carry.lh && Number.isFinite(carry.lh)) q.set(KEY.lh, String(Math.round(carry.lh)));
  // carton dims keep one decimal — rounding 30.5 cm to 31 would change the fit
  for (const k of ['cl', 'cw', 'ch', 'cwt'] as const) {
    const v = carry[k];
    if (v && Number.isFinite(v)) q.set(KEY[k], String(Math.round(v * 10) / 10));
  }
  const s = q.toString();
  return s ? `${to}?${s}` : to;
}

/**
 * Merge a page's own URL state with the chain handoff params.
 *
 * ⛔ Every chain page keeps its inputs in the URL with
 * `setParams({...}, { replace: true })`, and an object literal REPLACES the whole
 * query string — which silently erased the c_* handoff on mount. Seeding still
 * appeared to work (useState initialisers run before the effect), so the bug was
 * invisible: the chain survived exactly one hop, the save step vanished on step
 * 4, and copy-linking a mid-chain URL lost the plan. Always wrap a chain page's
 * setParams payload in this.
 */
export function withCarry(own: Record<string, string>, carry: ChainCarry): Record<string, string> {
  const merged: Record<string, string> = { ...own };
  const q = new URLSearchParams(chainHref('', carry).replace(/^\?/, ''));
  for (const [k, v] of q) merged[k] = v;
  return merged;
}

/** Enough carton geometry to rebuild a real packed plan? */
export function canRebuildPlan(c: ChainCarry): boolean {
  return Boolean(c.pt && c.cl && c.cw && c.ch);
}

/** True when a previous step actually handed something over. */
export function hasCarry(c: ChainCarry): boolean {
  return Boolean(c.pt || c.cpp || c.plt || c.lh || c.cl);
}
