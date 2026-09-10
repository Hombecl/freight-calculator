# Spec 02 implementation report

Implemented `/case-designer`, `/zh/case-designer`, and `/api/case-design`. No commit, push, deployment, dependency addition, secret access, or prerender-script edit was performed.

## Files and requirements

- `src/lib/caseDesign.ts`: pure, shared browser/Node/Workers library. Validates every request field without coercion; normalizes to cm/kg and returns paired cm/in and kg/lb measurements. SHA-256 hashes canonical input with the engine version.
- Enumeration includes ordered integer factorisations, six product orientations or two upright orientations, board on both sides, and headspace above the product. Quantities are sampled evenly, including both endpoints, at most 24 values. Round-robin enumeration across quantities prevents the first quantity monopolizing the 400-design budget. Outer dimensions deduplicate at 0.1 cm; dimensions used in calculations remain unrounded.
- Estimated board mass is outer surface area × 0.6 kg/m². Supplied weight and longest-side constraints reject candidates. Defaults are 0.4 cm board per side and 0.5 cm headspace, including when request units are imperial.
- Pallet TI uses shared `perLayer`; HI is capped by usable height and whole-layer payload. Counts, loaded height, cargo weight, cube fill and layer arrangement are returned. Overhang expands each side of the planning envelope.
- `src/lib/pallets.ts` and `src/pages/PalletsPerContainerPage.tsx`: extracted the existing mixed-orientation `floorFit` into the pure shared library without changing that page's formula. Case design uses it with loaded height, at most two tiers, preset door clearance and payload including assumed 25 kg pallet tare.
- Container-only requests call `packContainer` with one upright case spec and at most 2,000 cases. The response explicitly accounts for tested requested, placed and unplaced cases. Container counts and utilization use placed cases, never requested-but-unplaced cargo.
- Ranking minimizes supplied board + handling + freight cost per sellable unit. Without costs, ranks units/container descending then pallet cube fill. Both pallet and container freight are additive when supplied. Returns at most the requested 1–10 candidates, default five. Empty search results are explicit.
- Every candidate and the overall result carry the six required checks with explicit statuses and assumptions. Overall result includes `CHECK_SEMANTICS`, engine version, input hash, search counts/limits and both required geometry/optimality notes.
- `functions/api/case-design.ts`: keyed 10/minute and 100/day anonymous limits, 32 KB streamed-body ceiling, strict JSON media type, CORS including both auth headers, field-specific validation errors, GET example/schema guidance, tier and invalid-key warning.
- `src/lib/apiTiers.ts` and `src/pages/ApiPricingPage.tsx`: endpoint limit and bilingual pricing label registration.
- `src/pages/CaseDesignerPage.tsx`: bilingual two-column form, units conversion, product orientations, case constraints, EUR/GMA/Industrial/custom pallet controls, optional pallet/container/cost inputs, candidate table, baseline comparison, details, 21-column CSV, request JSON, curl example, related CTAs, metadata, limits and assumptions, McKee-helper link and all three requested analytics events.
- The current-case comparison uses the same pure evaluator and validates dimensions/quantity before comparing. It identifies supplied-limit failures on the baseline.
- Detail reuses `LayerDiagram` and `PalletEstimateView`, including build steps. `casePalletView` uses a one-case `estimatePallet` seed where its existing input schema permits, then returns only the view fields with the exact shared `palletBoxes` column layout. This preserves the existing estimator's 200-case contract and avoids its known disagreement with uniform TI-HI. No seed counts or checks leak into the resulting view. Larger pallet counts are rendered in full.
- `src/components/LayerDiagram.tsx`: now uses shared `layerArrangement`, including its floating-point tolerance, so exact imperial dimensions have matching mathematical and drawn counts.
- `src/App.tsx`, `scripts/release-routes.mjs`, `src/components/layout/Footer.tsx`, `public/llms.txt`: route, lazy import, bilingual layout routing, release route, footer and LLM discovery registration.
- `src/pages/ApiDocsPage.tsx`: bilingual API section covering request/response, units, ranking, limits, assumptions, errors and curl usage.
- `tests/case-design.mjs` and `package.json`: 13 test groups added to the required test command.
- `tests/e2e.mjs`: new default-run/detail/rendered-count test before the Chinese homepage test.

## Validation

`npm run typecheck && npm test` completed successfully after the final implementation changes. All nine test scripts passed. Reported groups include 45 core unit tests, 12 pallet-estimate groups, 17 order-options groups and 13 new case-design groups; the other existing suites report aggregate assertion success rather than numerical test totals. `git diff --check` passed.

The 13 new groups cover all 18 ordered factorisations for n=12; sampling and enumeration limits; dimensions deduplication; upright and all-six orientations; board/headspace math; both search-result statuses; pass/fail/warn/not_evaluated checks; weight/dimension/fit rejection; TI-HI agreement; pallet and container conservation; no overlaps and bounds; mixed floor fit, overhang, two tiers, door and payload limits; floor loading including the explicit 2,000-case cap; cost ranking reversal and breakdown; canonical imperial equivalence, determinism and input immutability; every request field; actual SVG box counts including >200-case pallets; endpoint 200/400/413/415/429, streamed bodies, CORS, GET and invalid keys.

### Browser QA

- Environment: local Vite at `http://127.0.0.1:4174`, system Chrome through Playwright; desktop 1440×1000 and mobile 390×844.
- Browser plugin invocation failed with `codex/sandbox-state-meta: missing field sandboxPolicy`. Used the repository's explicitly requested Playwright testing path as fallback.
- Vite's normal startup could not write its temporary config through the existing shared `node_modules` symlink. Started Vite programmatically with the same React plugin and a `/tmp` cache, without changing repository config or dependencies.
- Page identity, nonblank content, absence of framework overlays and interaction checks passed. No page JavaScript errors were recorded. Chinese mobile rendering had no document-level horizontal overflow.
- Default run → first candidate → detail: table cases/pallet and actual rendered SVG count both **99**.
- Current-case comparison and request-JSON download passed. Custom pallet control focuses editable dimensions. Previous-carton and Show-all controls changed/restored the actual rendered count. CSV download passed and all rows had the same 21 columns.
- Full repository e2e run: **67 passed, 1 failed**. The new case-designer test passed. The separate existing `order-options: applying a permitted reduction updates order quantities and result` test failed at `locator.check` with a 15-second timeout; that flow was not modified for spec 02. Full log: `/tmp/case-design-e2e.log`. The required `npm test` command is green.
- Screenshots inspected: `/tmp/case-design-desktop.png`, `/tmp/case-design-mobile.png`. Test log: `/tmp/case-design-tests.log`.

## Known limits and deliberate interpretations

- This is a bounded best-options search, not an optimality proof or an ECT/BCT structural design. All n products fit their enumerated rectangular arrangement; interlocking cases and mixed product orientations inside one case are not searched.
- Inputs allow 1–2,000 units/case. Broad ranges and the 400-design ceiling can omit better designs. Floor loading remains a general heuristic and its 2,000-case cap can understate capacity; the cap and tested remainder are explicit.
- Pallet payload uses complete column layers. Container stacking assumes adequate strength, up to two tiers, and 25 kg pallet tare. Preset doors are screened geometrically; custom container requests do not supply door dimensions. Dunnage, forklift maneuvering and structural strength are not certified.
- Board area/mass/cost estimates exclude flaps, seams, dividers and manufacturing waste. Missing cost components are zero, clearly disclosed; the result is not a complete landed-cost quote.
- Pallet cube fill uses the available cargo envelope, including explicitly allowed overhang. The diagram uses that effective envelope. Container fill uses outer case cube, excluding pallet timber.
- No new renderer or public estimator-contract change was introduced. When a valid design lies outside `estimatePallet`'s narrower input schema, its view uses the shared exact column layout directly instead of relaxing that schema.
- No requested product feature was intentionally skipped. Live deployment/auth billing and non-Chrome browsers were not exercised.
