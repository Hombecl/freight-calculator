# 05b implementation report

Implemented coverage-first box catalog optimization. No commit, push or deployment performed.

## Files and requirements

- `src/lib/boxCatalog.ts`: validates optional boolean `coverageFirst`, defaulting to true. Greedy selection (including the first box) and swaps compare count-weighted unfit orders first, then billed weight or cost. False uses only the billed-weight/cost objective for analysis. Engine version is now `box-catalog-v2`; normalized objective choice participates in the input hash.
- Results expose `unfitSharePct`, retain `ALL_ORDERS_FIT: fail` for incomplete coverage, and include `COVERAGE_LIMITED_BY_CATALOG_SIZE` when unfit orders remain. Check wording identifies the result as the best coverage found within the search budget.
- Savings compare only orders fitting both baseline and selected catalogs. `basisOrders` and `excludedUnfit` count history occurrences, with `partial: true` whenever either catalog excludes orders. Cost per 1,000 uses the comparable-order count. With zero comparable orders, savings numbers are zero and the zero basis/exclusions remain explicit. Without `currentBoxes`, both baseline and savings are omitted.
- `src/pages/BoxCatalogPage.tsx`: prominent bilingual unfit-share message, default-on coverage toggle under Advanced (disabling is labelled for analysis only), and savings basis/exclusion/partial labels. Downloaded request JSON includes the choice.
- `functions/api/box-catalog.ts` and `src/pages/ApiDocsPage.tsx`: document the objective switch and comparable-order savings semantics; existing endpoint handling and response fields remain available.
- `tests/box-catalog.mjs`: added two regression groups and expanded validation/no-baseline assertions. The generated-pool regression uses three SKUs with counts 500/300/200 and a 45×35×30 baseline. It explicitly verifies a generated 20×15×10 box and a box covering the other shapes, checks geometry/conservation, and demonstrates full coverage with two boxes versus 200 unfit orders in analysis mode. An incompatible three-box pool verifies no pair covers all shapes, selection covers 800 orders, and savings exclude 200. Additional assertions cover baseline exclusions, no comparable orders, rate/no-rate objectives, normalized defaults, hashes, and invalid booleans.
- `tests/e2e.mjs`: added a browser test before the Chinese homepage test for the Advanced toggle, 100% unfit message, partial comparison, and savings omission without a baseline.

## Validation

- `TMPDIR=/private/tmp npm run typecheck && TMPDIR=/private/tmp npm test`: passed. Both TypeScript configurations and all nine test suites passed, including 14 box-catalog groups (previously 12), with existing endpoint 200/400/413/415, geometry, conservation and determinism checks.
- The first exact `npm run typecheck && npm test` attempt passed typecheck but encountered a sandbox EPERM on tsx's default temporary IPC path; setting TMPDIR to the allowed directory resolved it.
- `git diff --check`: passed.
- Browser execution was blocked: after relocating Vite's cache outside the shared node_modules directory, the sandbox denied listening on `127.0.0.1:4174` with EPERM. The new e2e test is added but has not been executed.

## Known limits and skipped work

- Search remains a bounded greedy/swap heuristic, not a proof of optimal coverage or that no feasible cover exists. Exhausted budgets fill remaining slots deterministically. The coverage-limited note describes the returned catalog; documentation explicitly qualifies it with the search budget.
- Existing fallback charges remain in totals/per-order metrics for compatibility; they never enter savings for unfit orders. Existing packing, generated-pool limits and physical assumptions are unchanged.
- No implementation requirement was skipped. Browser runtime verification is the environment-blocked exception described above. No dependencies, secrets, routes or prerender changes were needed.
