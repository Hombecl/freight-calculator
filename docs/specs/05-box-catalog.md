# 05 — Box-catalog optimizer for parcel shippers: /box-catalog + /api/box-catalog

## Outcome sold
A parcel shipper with many SKUs and a handful of box sizes wants the
**few box sizes** that minimise dimensional-weight billing and void fill
across their real order mix — and, for any single order, which box to use.
This is the small, buyable slice of cartonization (Paccurate is the
enterprise version). Buyer: fulfilment operations manager / e-commerce ops
lead. Dollar event: DIM weight paid on air on every parcel.

## Library `src/lib/boxCatalog.ts` (pure)
```ts
export interface BoxCatalogRequest {
  units?: 'cm-kg' | 'in-lb';
  skus: Array<{ sku: string; l: number; w: number; h: number; weight: number; keepUpright?: boolean; fragile?: boolean }>;
  orders: Array<{ orderId?: string; lines: Array<{ sku: string; qty: number }>; count?: number }>;   // count = how many times this order shape occurs (history compression)
  currentBoxes?: Array<{ id: string; l: number; w: number; h: number; maxWeight?: number; cost?: number }>;
  candidateBoxes?: Array<{ id: string; l: number; w: number; h: number; maxWeight?: number; cost?: number }>;  // pool to choose from; if absent, generate a grid (see below)
  catalogSize: number;                                 // how many boxes the catalog may hold (1..12)
  billing: { dimDivisor: number; unit: 'cm-kg' | 'in-lb'; minBillableWeight?: number; ratePerKgOrLb?: number };
  voidFillCostPerLitre?: number;
  searchBudget?: number;                               // catalog combinations evaluated, default 200, max 1000
}
export async function optimizeBoxCatalog(input: unknown): Promise<BoxCatalogResult>
```
Algorithm (bounded, deterministic):
1. Per order shape: total units ≤ 60, distinct SKUs ≤ 10. Fit test for a
   box = `packContainer(box, lines as specs)`; an order "fits" a box if
   `unplaced === 0`. Cache fits per (orderShape, box).
2. Candidate pool: user-supplied, else a grid built from the order
   shapes' bounding needs: for each order, the min bounding box of its
   packed result in the smallest cube-ish container that fits (greedy
   growth), rounded up to 1 cm (0.5 in); dedupe; cap 40 candidates.
3. Catalog search: greedy forward selection + local swap — start with the
   box that fits the most volume-weighted orders, add the box that most
   reduces total billed weight, repeat to `catalogSize`; then try single
   swaps within `searchBudget`. Objective per order: billed weight =
   max(actual, L·W·H/divisor) (+ minBillable) × rate + void fill (box
   volume − items volume) × cost, × `count`. Orders that fit no box in a
   catalog get `unfit` and are charged at the largest candidate + flagged.
4. Baseline = `currentBoxes` when given (same objective) so the result
   says "saves X per 1,000 orders vs today".
Response:
```ts
{ engineVersion, inputHash,
  catalog: Array<{ id, dims:{cm,in}, usedByOrders, sharePct }>,
  perOrder: Array<{ orderId?, boxId | null, billedWeight:{kg,lb}, actualWeight, dimWeight, voidLitres, cost? }>,
  totals: { orders, billedWeight, dimPenaltyWeight, voidLitres, cost?, unfitOrders },
  baseline?: { ...same totals for currentBoxes }, savings?: { billedWeightPct, costPer1000Orders },
  checks: Check[] /* ALL_ORDERS_FIT (fail if unfit>0), DIVISOR_STATED, RATE_PROVIDED (not_evaluated), CATALOG_SIZE_RESPECTED */,
  searched: {candidates, combos, budget}, semantics, notes: ['HEURISTIC_CATALOG_NOT_OPTIMUM', 'NO_CUSHIONING_MODEL'] }
```
Also export `chooseBox(order, catalog)` for the single-order use (same fit test, smallest billed weight).

## Endpoint `functions/api/box-catalog.ts` — 5/min, 50/day anon; 96 KB body; ≤ 300 SKUs, ≤ 500 order shapes.

## Page `/box-catalog` (+zh) `src/pages/BoxCatalogPage.tsx`
- Step 1 SKUs (paste/upload via `importCartons`), Step 2 order history
  (paste: orderId, sku, qty rows — group into shapes with counts), Step 3
  current boxes + candidate boxes (optional) + catalog size + billing
  (divisor presets: FBA 139 in³/lb, UPS/FedEx 139, express 5,000 cm³/kg,
  IATA 6,000 — reuse constants from the DIM weight page).
- "Optimize catalog" → catalog table (box, dims, share of orders), totals
  vs baseline (billed weight, DIM penalty, void litres, cost per 1,000
  orders), per-order table (filterable), unfit orders highlighted.
- "Which box for this order?" mini-form using `chooseBox`, with a 3D view
  of the packed box (`InteractiveLoadPlanner` read-only, or the planner's
  small preview) — `data-testid="box-placed-count"` equals the order's
  units.
- Downloads: catalog CSV, per-order CSV, request JSON; curl.
- Honest box: heuristic; no cushioning/dunnage model; divisor and rates are
  yours; Paccurate/Packsize exist for enterprise.
- Track: `tool_box_catalog`, `box_catalog_run`.

## Tests `tests/box-catalog.mjs`
Fit test = packContainer semantics (fragile/upright honoured); billed
weight math incl. min billable and both unit systems; greedy selection
returns exactly `catalogSize` boxes when enough candidates; unfit orders
flagged and counted; baseline vs new savings math; `chooseBox` picks the
smallest billed weight; determinism; limits/validation; endpoint codes.
e2e: page with example data optimizes to a catalog table and the
single-order picker renders a box with placed count equal to units.
