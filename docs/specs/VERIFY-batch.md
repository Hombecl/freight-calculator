# Adversarial verification pass — product batch 01/01b/02/04/05

You are NOT the author. Your job is to break these libraries and prove the
UI shows what the math says. Write tests that FAIL if the code is wrong;
fix nothing unless the fix is a one-line obvious bug (then say so).

Targets: src/lib/orderOptions.ts, src/lib/palletEstimate.ts (layered),
src/lib/caseDesign.ts, src/lib/consolidation.ts, src/lib/boxCatalog.ts,
src/lib/orderQuote.ts, and the pages that render them.

Write `tests/verify-batch.mjs` (add to package.json test chain) with
property-style tests using a seeded PRNG (write your own LCG), ≥200 random
cases per library, asserting for EVERY result:
1. Conservation: requested units == placed + unplaced/remainder, per SKU.
2. Geometry: no overlapping boxes (3D AABB), all boxes inside the vessel,
   every box supported ≥60% (recompute from placements; do not trust the
   engine's flag), keepUpright honoured (h stays vertical), maxStack never
   exceeded using recursive equal-share load propagation.
3. Limits: no result labelled complete/pass violates pallet.maxHeight,
   maxWeight, receiver limits, container maxWeight, or door aperture
   (when supplied). needs_review/partial must be set whenever a check
   fails. `not_evaluated` appears exactly when its input is missing.
4. Units: the same physical input in cm-kg and in-lb yields the same
   inputHash and identical cm results (±1e-6).
5. Determinism: two calls → deep-equal results.
6. Economics/billing arithmetic recomputed independently from the
   response fields (order-options netSavings, box-catalog billed weight
   = max(actual, L·W·H/divisor, minBillable) × count, consolidation cost,
   case-design cost per unit).
7. Monotonicity sanity: raising maxPallets never increases unplaced;
   enlarging a box never makes an order stop fitting; more catalogSize
   never worsens coverage (coverageFirst).
8. Order-options: every alternative's quantities lie within the declared
   [minQty,maxQty] on the declared step and locked SKUs are unchanged;
   alternatives never have more pallets than baseline unless they add
   units; "found" never appears with zero alternatives.
9. Layered strategy: for ≥50 random single-SKU orders where TI×HI
   (from src/lib/pallets.ts) says N cases fit under the height/weight
   caps, estimatePallet must place ≥ N (it may not do worse than the
   uniform grid).

UI/animation proof (Playwright, system Chrome, against `vite preview
--host 127.0.0.1 --port 4175` of a fresh `npx vite build` — build:spa only,
no prerender): for /order-quote (options build view), /case-designer
(detail), /consolidation (container 3D), /box-catalog (single-order 3D):
- the `data-testid` placed count equals the plan's count in the JSON you
  compute in Node for the same inputs (do it: run the library in the test
  and compare to the DOM);
- for PalletEstimateView animations: press play, wait for the last step,
  assert the rendered box count equals the plan's cartonCount and that
  step k renders exactly k boxes for k in {1, ⌈n/2⌉, n};
- no console errors on any of the four pages.
Put the browser checks in `tests/verify-ui.mjs` (not in npm test; run it
yourself and record results).

Deliver `docs/specs/VERIFY-REPORT.md`: every failure found (with the
minimal repro input), which are real bugs vs test mistakes, what you
fixed (one-liners only) and what you left for the author. Do not commit.
