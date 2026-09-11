# 01b implementation report

## Built

- `src/lib/binPacking.ts`: exposes `layered` in `PackingOptions` and `packContainer`. Each SKU's allowed orientations are evaluated as uniform footprint grids using the same tolerance/block-count approach as TI-HI. Complete layers are stacked by descending maxStack, then descending unit weight, with stable input-order ties. Missing maxStack retains the existing unlimited assumption. Layer placement uses the existing support-area check and recursive equal-share load propagation. A failed layer restores placements, ancestor loads, payload, IDs and extreme points. All remaining units go through the existing Extreme-Point pass in the space left by committed layers; requested ordering applies to that remainder pass.
- `src/lib/palletEstimate.ts`: adds layered as the fourth trial, preserving fewest unplaced then lowest cargo height. Stable ties retain the earlier legacy strategy. Method metadata now says best-of-four.
- `src/lib/orderQuote.ts`: accepts explicit `packing.strategy: 'layered'`, enabling validated quote replay and existing hash generation.
- `src/lib/orderOptions.ts`: updates best-of metadata. The 15 explicit phase-one candidates and search-budget semantics remain unchanged; the baseline and quantity-adjustment trials automatically use the improved estimator.
- `tests/pallet-estimate.mjs`: regression written and observed failing with `2 !== 1` before implementation. Adds independent bounds, overlap, support, upright, payload, identity, conservation and recursive stack-load verification; rollback/remainder and legacy-winner checks.
- `tests/order-quote.mjs`: verifies layered selection and deterministic quote/hash replay. Updates full-example expectations to retain truthful receiver screening (see below); isolates the missing-tare warning test from the newly triggered height failure.
- `tests/e2e.mjs`: adds the exact example-minus-gift-tins UI regression before the Chinese homepage test, checking one pallet and all 30 cartons in the download. Updates the full-example status assertion.
- `package.json`: runs the same eight suites with `node --import tsx` instead of the tsx CLI. The CLI's IPC socket failed with sandbox EPERM; the Node loader runs the same tests successfully without that socket. No dependency changes.

## Results

All loaded heights below include the pallet base, excluding packaging allowance.

| Input | Before | After |
| --- | --- | --- |
| 24 tea + 6 teaware, specified GMA pallet | 2 pallets: 21 cartons at 99.5 cm, 9 at 39.5 cm | 1 pallet: all 30 at 124.5 cm, layered |
| PALLET_EXAMPLE | 1 pallet: all 20 at 125 cm, footprint | Identical placements, count and height; footprint wins the tie with layered |

The specification's 102.5/42.5 cm figures include the quote's 3 cm packaging allowance. On that same basis the new tea/teaware result is 127.5 cm. The new layout has two complete nine-carton tea layers, one complete six-carton teaware layer, and six remaining tea cartons placed by EP. Cargo height is 110 cm; cargo weight is 238.8 kg.

A losing layered case is one freely rotatable 20×20×100 cm, 8 kg carton on PALLET_EXAMPLE's pallet: layered places it at 115 cm loaded height, while height places it at 35 cm. Best-of selects height at 35 cm. Tests also compare legacy winners over 18 mixed-load variants, preserving their exact boxes whenever they beat or tie layered.

The full three-SKU QUOTE_EXAMPLE now fits all 40 cartons on one pallet at 179.5 cm loaded height. Its 3 cm packaging gives 182.5 cm against the unchanged 182 cm receiver limit. `needs_review` and the failed LOADED_HEIGHT check are expected. Tests were updated to check this consequence instead of relaxing the limit or forcing the older incomplete first-pallet result. The order-options five-to-four-pallet fixture still passes unchanged.

## Validation

- `npm run typecheck && npm test`: passed, exit 0.
- All eight test suites passed: unit (45 named checks), functions (1 reported group), pallet-estimate (15 checks: original 12 plus 3), order-planning (3 reported groups), api-key, order-quote, pack-checks, order-options (17 checks). The three assertion-based suites do not report numeric test counts.
- Existing API 200/400/413/415, validation, deterministic hash and result, geometry, conservation, saved-plan and renderer coverage passed.
- 200-carton estimate measured approximately 36 ms in the final run; this is a local observation, not a performance guarantee.
- `git diff --check`: passed.
- `npm run e2e`: attempted; Chrome aborted at launch with SIGABRT and EPERM during cleanup. No browser tests executed, so the added browser regression remains unverified here.
- Inspected `scripts/benchmark.mjs`: container-only Bischoff/Ratcliff instances, calling the unchanged default `packContainer` strategy. No pallet benchmark exists there; it was not run.

## Limits and scope

This remains a deterministic heuristic, not a minimum-pallet or minimum-height proof. Complete layers use a single block orientation, without pinwheel/interlocking or alternate layer-order search. Failed complete layers fall back to EP rather than trying every alternate layer grid. Unknown maxStack remains unlimited with existing warning/check semantics; geometric support does not establish transit stability.

No new page, endpoint, renderer, dependency or third-party data was introduced, so corresponding registration and bilingual-page requirements did not apply. Existing check/hash/engine metadata flows remain in place. No limits were relaxed, cargo dropped, secrets accessed, or commits, pushes or deployments made. Browser execution is the only unavailable validation.
