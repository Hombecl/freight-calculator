# FIX-AUDIT-A implementation report

Completed 2026-09-11. Read `CONVENTIONS.md`, `AUDIT-REPORT.md`, and `FIX-AUDIT-A.md`. All FIX-AUDIT-A findings are implemented. No commit, push, deployment, dependency addition, secret access, or prerender-script change was made. FIX-AUDIT-B files are untouched. The pre-existing untracked `node_modules` link was left unchanged.

## Requirements and files

| Finding | Implementation | Regression evidence |
|---|---|---|
| F02/F03 | `src/lib/legacyContainer.ts` applies `CONTAINER_PRESETS` payload and `fitsDoor` limits to legacy packing scenarios. `Calculator.tsx` uses the constrained count, volume, utilization, and carton list in both summary and existing 3D modal, with a bilingual constraint line. Lower cartons are retained when capping the scene. `CbmCalcPage.tsx` requires door fit as well as volume/interior fit, and explicitly labels a door-blocked fallback. | All three preset payload limits and boundaries; zero-weight behavior; door orientation checks; scene/stat count parity and geometry. Browser: 60×40×40 cm at 1,000 kg → 28 cartons in 20GP and 28 scene inputs; 230 cm cube → zero and door warning. CBM chooses 40HQ for the 230 cm cube and labels the 235 cm cube “by volume only — does not pass the door.” |
| F04 | Added `src/lib/queryNumber.ts`: distinguish absent/blank/nonfinite values from explicit zero, then retain each page's existing physical clamps. Replaced 31 query initializers across nine pages, listed below. | Zero, decimal, absent, blank, text, and nonfinite fixtures. Browser: storage URL with `p=20&r=0&hd=0&m=2` preserves both zeros on load and reload. |
| F05 | `functions/api/pack.ts` requires finite numeric integer `items[i].qty >= 1`; requires numeric positive l/w/h and numeric nonnegative weight when supplied. Errors return 400 with the exact field path. Removed item dimension, quantity, and weight coercion; omitted weight still defaults to zero. | Real handler tests reject zero/negative/fractional/string/null/missing quantities, invalid dimension/weight types, and null items; valid numeric requests conserve all units. |
| F06 | `src/lib/realism.ts` now topologically orders every positive-area support contact before the carton above it, then chooses ready cartons by x, y, z. `src/lib/exportPlan.ts` uses that shared order for both CSV and printable/PDF rows and explains it in crew instructions. | Audit bridge fixture outputs Base before Top in sequence, CSV, and printable HTML. Multiple supports, vertical chains, edge-only contacts, deterministic ordering, empty input, and unchanged source arrays also pass. |
| F10 | `src/lib/receiverProfiles.ts` preserves `partial` ahead of `needs_review`; failed rules remain in `profileChecks` and `reviewReasons`. Updated `functions/api/receiver-check.ts` GET semantics. | Real partial quote and handler response retain partial plus height failure. Complete-with-failure and complete-without-failure cases also pass; deterministic output and count conservation checked. |
| F15 | `functions/api/key.ts` and `lead.ts` validate the parsed JSON object before accessing fields. | Both real handlers return exactly `{error:'body must be a JSON object'}` with 400 for null, arrays, strings, numbers, and booleans, using isolated fake storage. |
| F21 | `WarehousePage.tsx` labels quantities as planned inventory, allows zero, rebuilds cargo from those quantities, preserves structures/zones, and confirms before removing placed pallets. Cancelling preserves the layout and dock state. Changed inputs show a pending-rebuild notice. Added pure `src/lib/warehouseInventory.ts` to count removals by physical cargo rather than unstable placement IDs. | Unit fixtures for quantities 0/1/6/12, rotated equivalents, and replacement types. Browser verifies cancel preservation, then 1/1, 6/6, and 0/0 after rebuild. Updated the superseded “never deletes” e2e test to assert that declining confirmation preserves manually placed pallets. |
| F12 | Moved the existing legacy FBA table unchanged into `src/data/fbaRates.ts`. `FBA_RATE_AS_OF` supplies the recorded 2025 date to the bilingual illustrative-estimate notice directly beside the fee; it names excluded programs/surcharges and tells users to verify in Seller Central and with their buyer. | Original seven base rates and metadata checked; browser date/notice assertion; desktop and 390px screenshot inspection. |
| F13 | `Calculator.tsx` displays editable air/sea rate inputs, source currency, and kg/cbm basis beside the cost output, preceded by “Illustrative default, not a quote.” Both packing and embed use the same controls. | Browser edits both rates to zero on `/packing` and `/embed` and verifies both displayed costs become 0.00. |
| F14 | All 11 entries in `src/data/competitors.json` have the exact owner-supplied `pricingSource.url` and `checkedAt: 2026-09-10`. `ComparePage.tsx` links the source domain/date under pricing and prefixes third-party pricing with “Reported by” (localized in Chinese). | Exact source mapping/date checks for all 11 competitors; browser verifies the Cube-IQ SourceForge link and attribution. |

Additional F04 pages beyond `PalletStorageCostPage.tsx`:

- `CbmCalcPage.tsx` — 5 initializers.
- `TiHiCalcPage.tsx` — 4.
- `PalletsPerContainerPage.tsx` — 1.
- `DimWeightCalcPage.tsx` — 4.
- `FreightClassCalcPage.tsx` — 5.
- `WarehouseSpaceCalcPage.tsx` — 2.
- `AisleWidthCalcPage.tsx` — 2.
- `PalletCalcPage.tsx` — 5.

Storage has 3 replacements. A final search found no remaining `Number(params.get(...)) || default` initializer in calculator pages. Valid zeros remain subject to existing minimum constraints where zero is physically disallowed.

## Validation

- `npm run typecheck && npm test` — passed, exit 0. Both application and Functions TypeScript projects pass. All 14 npm-test suite files pass, including the existing **5,954-check seeded batch (0 failures)** and **14 new regression groups** in `tests/audit-fixes-a.mjs`, registered in `package.json`.
- `node tests/e2e.mjs http://127.0.0.1:4186` — **78 passed, 0 failed**. Three new audit-A tests are before the `/zh` homepage test. The old warehouse regression was updated for the explicitly changed specification.
- `git diff --check` — passed. Explicit diff check confirms all excluded FIX-AUDIT-B files and `scripts/prerender.mjs` are unchanged.
- API tests use synthetic data and in-memory storage; no live issuance or leads were sent.

Browser environment: system Chrome, headless Playwright, local Vite at `http://127.0.0.1:4186`; desktop 1440×900 plus FBA at 390×844. The in-app Browser connection failed before navigation with `codex/sandbox-state-meta: missing field sandboxPolicy`; used the repository's required Playwright e2e path. The normal Vite command could not write its config cache through the shared `node_modules` symlink, so the local server used Vite's programmatic API with `configFile:false` and `/tmp/fix-a-vite-cache`. No config or dependency file was changed for this workaround.

| Rendered QA check | Result |
|---|---|
| Correct URL/title and meaningful page content | Passed for container, warehouse, FBA, packing |
| Framework error overlays | None |
| Runtime errors / console warnings in focused inspection | None captured |
| Screenshots | Reviewed payload warning/count, adjacent packing rates/costs, and readable mobile FBA notice |
| Interaction proof | Payload/door scene count, rebuild accept/cancel, bookmark reload, and rate-driven cost changes passed |

Local evidence, outside the repository:

- `/tmp/fix-a-tests-final.log` — final npm test output.
- `/tmp/fix-a-e2e-final.log` — final 78-test browser run.
- `/tmp/fix-a-targeted.log` — three focused audit-A browser tests.
- `/tmp/fix-a-visual.json` — page identity, nonblank/overlay checks, and empty captured error list.
- `/tmp/fix-a/container.png`, `/tmp/fix-a/warehouse.png`, `/tmp/fix-a/fba.png`, `/tmp/fix-a/packing.png`, `/tmp/fix-a-fba-mobile.png` — screenshots.

## Limits and skipped work

No requested FIX-AUDIT-A finding was skipped.

- The pre-existing FBA data records only **2025**, not an exact effective day. The constant retains that recorded granularity; no date, replacement tariff, or current-verification claim was invented. Metadata marks the schedule illustrative/unverified. This task does not implement a complete current Amazon tariff model.
- Competitor sources/dates are those explicitly verified and supplied by the owner in the spec; this implementation did not conduct a new pricing survey.
- Container capacity remains a heuristic geometry estimate with preset payload and door screening. CBM recommendations still do not prove a complete physical loading arrangement. Zero carton weight supplies no useful payload constraint.
- Support ordering uses positive footprint overlap and a 1e-6 cm vertical contact tolerance; it does not add structural-strength certification. The legacy 3D regression checks the exact carton list supplied to the existing renderer, not an independent WebGL mesh inventory.
- Warehouse layouts that cannot hold the planned inventory report unplaced quantities; confirming a rebuild can remove previously placed cargo. Structures and zones remain fixed.
- Existing mobile navigation overflow and other audit findings outside FIX-AUDIT-A remain outside this change. Production APIs, deployments, authenticated persistence, and real operational acceptance were not exercised.
