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
};

const KEY = { pt: 'c_pt', cpp: 'c_cpp', plt: 'c_plt', lh: 'c_lh' } as const;

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
  const s = q.toString();
  return s ? `${to}?${s}` : to;
}

/** True when a previous step actually handed something over. */
export function hasCarry(c: ChainCarry): boolean {
  return Boolean(c.pt || c.cpp || c.plt || c.lh);
}
