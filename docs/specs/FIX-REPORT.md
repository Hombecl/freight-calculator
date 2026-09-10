# FIX verification findings report — 2026-09-11

Implemented F1–F5. `npm run typecheck && npm test` passes, including all 5,954 adversarial verification property groups with zero failures. No commit was made.

## Requirements and files

- **F1 — late support:** `src/lib/binPacking.ts` detects proposed boxes touching the underside of existing cargo. It rebuilds all supporter sets in an isolated trial graph and propagates own weight plus accumulated load from highest to lowest, splitting equally across every current supporter. Any maxStack excess rejects the position without mutating the committed graph; search continues. Accepted graphs replace supporter/load state. Layer rollback restores supporter sets as well as loads. Ordinary placements retain incremental propagation. `tests/pallet-estimate.mjs` adds the report's five-carton fixture, audited from returned geometry by the independent equal-share oracle for the default selection and all four explicit strategies.
- **F2 — canonical identity:** new `src/lib/hashing.ts` recursively rounds numbers with `Number(n.toFixed(6))`, sorts object keys, and preserves array order. `orderQuote.ts`, `orderOptions.ts`, `consolidation.ts`, `boxCatalog.ts`, and `caseDesign.ts` use it for hashed payloads, including applicable candidate hashes. Box generation always rounds up on the canonical 1 cm grid; `grid` is absent from the hashed payload. `/api-docs` documents imperial generation and both-unit output. The existing half-inch-grid assertion in `tests/box-catalog.mjs` was updated to assert integer cm dimensions for both request units; its fit and geometry assertions remain intact. No verification-batch grid assertion changed.
- **F3 — common status:** consolidation plans return `complete` with zero remaining eligible cartons, otherwise `partial`. The top level is complete when a complete plan is found, including empty eligible cargo, otherwise partial. Box catalog returns complete exactly when unfitOrders is zero. Existing outcome fields remain unchanged. Verification status assertions now also pin exact complete/partial values. `/api-docs` documents these fields.
- **F4 — legacy exception:** `parsePalletRequest` rejects any supplied top-level `units` property with the specified PalletInputError and redirect to `/api/order-quote`. `estimatePallet` stays synchronous, with its existing version and cm/kg response; no hash or engineVersion was added. `/api-docs` states this exception for pallet-estimate and order-plan. Only the two explicitly superseded verification assertions were replaced: legacy version presence and imperial rejection. Pallet tests additionally cover metric, imperial, null and undefined units properties, including nested order-plan requests.
- **F5 — gross weight:** retained the existing fail-before-missing-tare condition in `orderQuote.ts`. The known-excess regression passes.

## Benchmark

Ran `node scripts/benchmark.mjs` before and after the production changes, using the same default 30 instances per file (90 total).

| Dataset | Before average fill | After average fill |
| --- | ---: | ---: |
| thpack1 | 80.9% | 80.9% |
| thpack2 | 80.1% | 80.1% |
| thpack3 | 79.8% | 79.8% |
| Overall | **80.3%** | **80.3%** |

Reported change: **0.0 percentage points**, within the 0.5-point limit. Per-file reported minima and maxima also match. Logs: `/tmp/fix-benchmark-before.log` and `/tmp/fix-benchmark-after.log`.

## Validation

- `npm run typecheck && npm test`: passed both TypeScript projects and all 13 test scripts.
- Adversarial batch: seed `0x51a7b00c`, 200 cases per library across six libraries (1,200 total), 160 nonzero TI×HI fixtures, **5,954 checks passed / zero failed**, including **24/24 endpoint checks**.
- Pallet estimate suite: **17 checks passed**, including the new regression and units rejection.
- Existing suites also report 45 unit tests, 17 options checks, 13 case-design checks, 13 consolidation tests and 14 catalog checks; remaining scripts report aggregate success.
- Direct canonical helper checks passed for nested rounding, key sorting, array order, undefined/negative-zero JSON behavior and input immutability.
- `git diff --check`: passed. Final full-suite log: `/tmp/fix-tests.log`.

The first full-suite run stopped at the old half-inch catalog-grid assertion. After aligning that assertion with F2, the entire required command was rerun successfully. No assertions were weakened outside the explicitly changed F2/F4 contracts, and no tests were skipped or converted to expected failures.

## Limits and scope

Hash identities change under the new canonical serialization; numbers differing below its six-decimal resolution can share an identity by design. Packing remains a heuristic, and the academic benchmark is fill evidence, not certification of load safety. Legacy pallet-estimate/order-plan remain cm/kg-only APIs with version identity. Browser/e2e checks were not rerun for these library and documentation fixes; the required typecheck and full test suite were completed. No dependencies, secrets, prerender script, commits, pushes or deployments were changed or performed. No requested implementation item was skipped.
