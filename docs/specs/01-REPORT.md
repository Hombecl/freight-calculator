# Spec 01 implementation report

Implemented on 2026-09-11. No commit, push or deployment performed.

## Built and requirement coverage

| Files | Implementation |
| --- | --- |
| `src/lib/orderOptions.ts` | `OrderOptionsRequest`, `OrderOptions`, `findOrderOptions`, engine identity and limits. Baseline calls `quoteOrder` unchanged. Deterministic two-phase search, default budget 60 / maximum 200 candidate plans, maximum three alternatives, required ranking and all three outcomes. SHA-256 request/candidate hashes, full nested quotes, explicit quantity changes, economics, checks, shared semantics and `BEST_OPTION_FOUND_NOT_MINIMUM`. |
| `src/lib/binPacking.ts`, `src/lib/palletEstimate.ts`, `src/lib/orderPlanning.ts` | Optional strategy and item-order controls flow through the existing packer. No packing algorithm was forked. Phase 1 runs default/height/footprint strategies, then their combinations with heaviest-first, largest-footprint-first, tallest-first and reverse SKU order: up to 15 plans. Default behavior remains unchanged. |
| `src/lib/orderOptions.ts` | Phase 2 runs only if phase 1 finds no qualifying repack. Tries single-SKU reductions/additions before pairs. Only named, validated permissions can change quantities. Same footprint, height/payload envelope, upright/crush settings, packaging, maxPallets and receiver limits are retained. Alternatives must have quote status `complete`; an additional check against unrounded placements prevents a receiver-limit breach being hidden by output rounding or a missing-tare warning. |
| `functions/api/order-options.ts` | GET/POST/OPTIONS, documented example, CORS including X-API-Key and Authorization, `rateLimitKeyed`, streamed 49,152-byte body cap, 400 with field on input errors, 413/415/429 handling, anonymous tier and invalid-key warning. |
| `src/lib/apiTiers.ts`, `src/pages/ApiPricingPage.tsx` | Registered anonymous limits: 5/minute and 50/day; bilingual endpoint label in pricing. |
| `src/pages/OrderQuotePage.tsx` | Bilingual “Avoid another pallet” card after a current quote with at least two pallets. Target, per-SKU adjustable toggles, min/max/step, optional freight/handling/contribution/deferral/currency fields, browser library search, and `track('order_options_run', outcome)`. Up to three result cards include quantity changes, savings or missing-cost message, checks, target progress, and build toggles. Edited requests hide stale options until re-quoted. |
| `src/components/PalletEstimateView.tsx`, `src/lib/orderPlanning.ts` | Reused existing SVG renderer and `buildSteps` animation with the alternative's actual box placements. Viewer accepts the required subset of pallet estimate fields. `option-placed-count` comes from the boxes actually displayed, excluding the pallet base; `option-pallet` carries the expected carton count. Initial full view matches `pallet.cartonCount`; step controls intentionally display a subset. Corrected the SVG title to one text child, eliminating a warning found by the render test. |
| `src/pages/OrderQuotePage.tsx`, `src/lib/orderQuote.ts` | “Use this option” requires confirmation, applies changed quantities, records selectedOptionId, and re-runs the selected build. Added optional validated `packing {strategy,ordering}` to quote requests so selected repacks can be reproduced by re-running, server comparison and JSON exports. CSV/full-result exports use the updated quote. Default requests retain their previous packing and hash behavior; explicit selections participate in the hash. |
| `src/lib/orderQuote.ts` | Validates `actuals.summary {actualPalletCount,selectedOptionId,measuredAt}` and echoes `variance.summary`. Actuals remain outside planning identity. Existing per-pallet variance remains supported. The page preserves summary metadata during unit conversion. Added `CHECK_SEMANTICS` to quote responses. |
| `src/pages/ApiDocsPage.tsx`, `public/llms.txt` | Added endpoint documentation, request options, search/outcome/economics semantics, limits, errors, actuals summary and selected-build replay. |
| `tests/order-options.mjs`, `package.json` | Added 17 named test groups to the required `npm test` chain. |
| `tests/e2e.mjs` | Added three tests before the `/zh` homepage test: example search/result-or-none with build counts; deterministic repack including SVG count, animation, cancel/confirm and downloads; permitted quantity reduction with locked-SKU preservation. |

The existing `/order-quote` page already has bilingual Helmet metadata, a lazy route within Layout in `src/App.tsx`, a release route in `scripts/release-routes.mjs`, and a Footer link. No new page was requested, so no duplicate route or navigation entry was added. No third-party prices, rules or tariffs were introduced: all economics are caller-supplied.

## Search and economics details

- The baseline is outside the candidate budget. Every candidate quote consumes one slot, even when rejected. Empty shipments and candidates above the existing 200-carton limit are excluded before planning.
- Quantity ranges are whole numbers between 0 and 200, include the current quantity, and use a positive whole-number step anchored at the current quantity. Zero explicitly defers that SKU in full; it is recorded in quantityChanges and omitted from the non-empty candidate shipment.
- Repacking/reductions must save at least one pallet. Addition-only alternatives may fill capacity without exceeding the baseline pallet count, as required by “add without new pallet.” Target is a goal: incremental improvements may still fall short, and the UI labels that condition.
- Search uses original SKU order for singles/pairs. Equivalent quantity/count alternatives from different strategies are deduplicated. Ranking is pallet count ascending, absolute unit changes ascending, then net savings descending, with a deterministic identity tie-break.
- Net savings = freight saved + handling saved − deferred contribution − deferral cost. Added units have negative deferred contribution, representing the additional contribution. Missing freight, handling, changed-SKU contribution or reduced-SKU deferral costs produce `netSavings: null`; explicit zero is supported. Non-negative finite costs and a three-uppercase-letter currency label are validated.
- `ORDER_OPTIONS_CONSERVATION` checks every original SKU against its permitted quantity and actual placed count. `LIMITS_UNCHANGED` states the preserved limits. `SEARCH_BUDGET` warns when the candidate cap is reached. Nested quotes retain warnings and `not_evaluated` checks, never treating missing inputs as passes.

## Verification

Final required command:

```text
npm run typecheck && npm test
Exit code: 0
```

Both TypeScript projects passed. All **8 test files** in `npm test` completed successfully. The new file reports **17 passed test groups**; existing suites include 45 unit cases and 12 pallet-estimate cases, plus the functions, order-planning, API-key, order-quote and pack-checks assertion suites. No aggregate assertion count is claimed for suites that do not print one.

New tests cover:

1. A contrived baseline of five pallets improved to four with unchanged quantities; phase 2 suppressed.
2. Min/max/step and locked-SKU preservation.
3. Singles before pairs and a paired reduction that succeeds.
4. Added units using existing spare capacity.
5. Explicit full-SKU deferral and exclusion of empty shipments.
6. Receiver height/weight failures and missing-tare screening.
7. Envelope, payload, upright/crush and packaging constraints.
8. Economics arithmetic, added contribution, missing costs and explicit zeros.
9. Ranking and three-option cap.
10. None/already-at-target/partial-baseline branches and budget warning/pass.
11. Determinism, hash sensitivity, unchanged input, actuals excluded from hashes and selected-build replay.
12. Imperial inputs and both output unit systems.
13. Actuals summary validation and echo alongside existing per-pallet variance.
14. Options field validation with field paths.
15. Rendered SVG cargo identity/count exactly matching each alternative pallet's cartonCount.
16. Unrounded limit screening and own-property lookup for SKU economics maps.
17. Endpoint 200/400/413/415/429, streamed overflow, exact size boundary, minute/day quotas, CORS, GET, invalid keys and tier.

Conservation, unique box identities, no overlaps, footprint/height bounds and complete placement are checked across the returned alternatives in the applicable cases.

Additional checks:

- `npm run build:spa`: passed. Vite emitted an existing stale Browserslist-data advisory; no dependency changes were made. This build preceded the final small copy/validation refinements, which passed the final typecheck and tests.
- `node --check tests/e2e.mjs`: passed.
- `git diff --check`: passed before writing this report.

## Browser QA and remaining limits

Flow intended for browser verification: `/order-quote` → quote an order → search options → view the chosen build → cancel/confirm use → verify updated quantities and downloads.

Browser availability: listed, but invocation failed. The exact Browser tool error was `codex/sandbox-state-meta: missing field sandboxPolicy`. Starting the existing Vite development server also failed with `listen EPERM: operation not permitted 127.0.0.1:4174`. The session does not permit escalation. No alternate browser or port was used to work around these restrictions.

| Browser check | Result |
| --- | --- |
| Page identity and non-blank page | Blocked; no served browser session established |
| Framework overlay and browser console health | Not evaluated |
| Desktop/mobile screenshot evidence | Not captured |
| Interactive search/apply/animation/download execution | Three e2e cases authored and syntax-checked, but not run |
| SVG count evidence | Passed through React static rendering of real alternatives; this is not a claim of browser interaction coverage |

The search is bounded and heuristic, not a proof of a minimum or the absence of a better option. It can exhaust its budget before considering pairs. Missing tare/crush/receiver inputs retain the existing warning/not-evaluated semantics, and do not establish transport stability or receiver acceptance. Costs are a caller-supplied comparison, not a freight tariff.

No implementation requirement was intentionally omitted. Live browser/e2e execution and screenshot review remain unverified because of the environment blockers above. No commits, dependencies, secrets, deployment files or `scripts/prerender.mjs` were changed.
