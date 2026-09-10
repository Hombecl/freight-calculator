# 01 — "Avoid the next pallet": /api/order-options + panel on /order-quote

## Outcome sold
At order confirmation, show whether the order can ship on fewer pallets —
either by repacking unchanged quantities, or by a *permitted* quantity
adjustment on named SKUs — and what each option costs/saves. Buyer: export
sales coordinator / shipping manager. Dollar event: one extra handling unit.

## Library `src/lib/orderOptions.ts`
Wraps `quoteOrder` / `planOrder` (do not fork the packer).

```ts
export interface OrderOptionsRequest extends OrderQuoteRequest {
  targetPalletCount?: number;          // default = baseline.palletCount - 1, min 1
  adjustments?: Array<{ sku: string; minQty: number; maxQty: number; qtyStep?: number }>; // default: all locked
  economics?: {
    palletFreight?: number;            // cost per pallet shipped (customer-supplied)
    handlingPerPallet?: number;
    contributionPerUnit?: Record<string, number>;   // by sku
    deferralCostPerUnit?: Record<string, number>;   // by sku (cost of shipping deferred units later)
    currency?: string;
  };
  searchBudget?: number;               // max candidate plans, default 60, max 200
}
export async function findOrderOptions(input: unknown): Promise<OrderOptions>
```
Algorithm (bounded, deterministic):
1. Baseline = `quoteOrder(request)` (unchanged).
2. Phase 1 — unchanged quantities, alternative packings: run the three
   pallet strategies and also item orderings (heaviest-first, largest-
   footprint-first, tallest-first, reverse) through `planOrder`; keep any
   plan with `status === 'complete'` and fewer pallets than baseline.
3. Phase 2 — only if Phase 1 found nothing and `adjustments` non-empty:
   for each adjustable SKU, try quantities from current down to `minQty`
   in `qtyStep` (default 1) and up to `maxQty` (add without new pallet),
   single-SKU changes first, then pairs, until `searchBudget` is spent.
   Every candidate must be `complete` under the SAME pallet envelope and
   receiver limits (never relax); quantity outside [minQty,maxQty] is never
   produced; locked SKUs never change.
4. Return ≤3 alternatives ranked by (palletCount asc, |units changed| asc,
   netSavings desc when economics given).
Response:
```ts
{
  engineVersion, inputHash, orderId, baseline: { palletCount, quote: OrderQuote },
  target: number,
  searched: { candidates: number, budget: number, phase1: number, phase2: number },
  alternatives: Array<{
    id: string; palletCount: number; strategy: string;
    quantityChanges: Array<{ sku, from, to, delta }>;   // [] for repack-only
    quote: OrderQuote;                                   // full result incl. checks[]
    candidateHash: string;
    economics: { freightSaved, handlingSaved, contributionDeferred, deferralCost, netSavings } | { netSavings: null, reason }
  }>,
  outcome: 'found' | 'none_within_search' | 'already_at_target',
  checks: Check[],   // ORDER_OPTIONS_CONSERVATION (pass when every alternative's units == request ± permitted changes), LIMITS_UNCHANGED (pass), SEARCH_BUDGET (warn if exhausted)
  semantics, notes: ['BEST_OPTION_FOUND_NOT_MINIMUM', ...]
}
```
## Endpoint `functions/api/order-options.ts`
Anonymous limits 5/min, 50/day (register in apiTiers). Body limit 48 KB.

## UI — panel on `/order-quote` (edit `src/pages/OrderQuotePage.tsx`)
After a result with `palletCount ≥ 2`, show a card "Avoid another pallet":
- target (default palletCount-1), per-SKU adjustable toggle with min/max,
  optional economics fields (pallet freight, handling, contribution/unit,
  deferral/unit), "Search options" button (runs library in-browser,
  `track('order_options_run', outcome)`).
- Results: up to 3 cards: pallet count, quantity changes table, net
  savings (or "add costs to compute"), checks badges, and a "View build"
  toggle that renders the chosen alternative's pallets with
  `PalletEstimateView` (step animation) — **the rendered box count must
  equal `pallet.cartonCount`**; expose `data-testid="option-placed-count"`.
- "Use this option" replaces the current request quantities (with confirm)
  and re-runs the quote; downloads (CSV/JSON) then reflect the option.
- Wording: "Best option found within N candidates", never "minimum".
## Extend actuals
`actuals.summary?: { actualPalletCount?: number; selectedOptionId?: string; measuredAt?: string }`
accepted by `quoteOrder` (validate; echo in response `variance.summary`).
## Tests `tests/order-options.mjs`
Include: repack-only finds fewer pallets on a contrived order where
default strategy wastes space; adjustment respects min/max/step and locked
SKUs; conservation check on every alternative; never relaxes limits
(receiver limit fail must not appear in alternatives); economics math;
`none_within_search` outcome; determinism; endpoint codes.
e2e: on /order-quote, load example, set maxPallets high so baseline ≥2
pallets, run options, assert a result card or the "no option" message
renders and `option-placed-count` equals the card's carton count when
"View build" is opened.
