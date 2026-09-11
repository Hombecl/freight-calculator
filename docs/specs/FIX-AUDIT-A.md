# FIX-AUDIT-A — engine, API and legacy-calculator findings from docs/specs/AUDIT-REPORT.md

Fix these findings exactly; add a regression test for each in the existing
suite that owns the file (or `tests/audit-fixes-a.mjs`, added to npm test).
Do not touch the files listed for FIX-AUDIT-B (OrderQuotePage, CaseDesignerPage,
ConsolidationPage, BoxCatalogPage, ReceiverProfilesPage, BuildSheetPage,
ApiPricingPage, ApiDocsPage, importCartons.ts, PlannerPage export gate).

- **F02/F03 (S1) `/container` + `/cbm-calculator`**: `src/components/Calculator.tsx`
  loading stats must cap the carton count by preset payload (carton gross ×
  count ≤ maxWeight) AND reject carton types that cannot pass the preset door
  (use `fitsDoor` + `CONTAINER_PRESETS` from `src/lib/packChecks.ts`); show a
  visible warning line stating which constraint bound the count. `CbmCalcPage`:
  "Smallest container that fits" must also require door fit; otherwise say
  "by volume only — does not pass the door" explicitly.
- **F04 (S1) `PalletStorageCostPage`**: distinguish absent/invalid query values
  from a valid 0 (`Number.isFinite(parsed) ? parsed : default`), for every
  `Number(...) || default` initializer in that page. Grep the other calculator
  pages for the same pattern and fix identically (list them in the report).
- **F05 (S1) `functions/api/pack.ts`**: `items[].qty` must be a finite integer
  ≥ 1 (400 with `field: items[i].qty` otherwise); same for l/w/h/weight types
  (reject strings). No coercion.
- **F06 (S1) `src/lib/realism.ts loadingSequence` + `exportPlan.ts`**: order by
  support dependency first (a box is listed only after every box that
  supports ≥ part of its base, computed from geometry), then back-to-door
  (x), then bottom-up (y), then z. Add the audit's bridge fixture as a test.
- **F10 (S2) `src/lib/receiverProfiles.ts attachProfile`**: `partial` takes
  precedence over `needs_review`; profile rule failures are still listed in
  `profileChecks[]` and `reviewReasons[]`. Update `/api/receiver-check` GET
  semantics text accordingly.
- **F15 (S2) `functions/api/key.ts`, `lead.ts`**: null / non-object JSON body
  → 400 `{error:'body must be a JSON object'}`.
- **F21 (S2) `src/pages/WarehousePage.tsx`**: "Cargo placed N/M" must compare
  like with like — either M = current planned inventory (what quantity
  fields mean) and auto-arrange rebuilds from those quantities, or the
  palette quantities are clearly labelled as templates and the counter
  shows placed only. Choose the first (rebuild-from-quantities with a
  confirm when it would remove placed pallets) and add an e2e assertion.
- **F12 (S2) `/fba` in `Calculator.tsx`**: label the fee as "illustrative
  estimate — US FBA size-tier base rates as of <date in code>, excludes
  surcharges, category and low-price programs; verify in Seller Central"
  directly beside the number, with the date sourced from a constant in the
  data file. Do not invent new rates.
- **F13 (S2) `/packing`, `/embed`**: show the air/sea rate inputs (editable,
  with currency and unit basis) next to the cost figure and a one-line
  "illustrative default, not a quote" note before the cost is shown.
- **F14 (S2) `src/data/competitors.json` + `ComparePage.tsx`**: add
  `pricingSource: {url, checkedAt}` per competitor. Use these verified
  sources (checked 2026-09-10 by the owner's assistant):
  CubeMaster → https://www.cubemaster.net/subscription/pricing.asp ;
  SeaRates → https://www.searates.com/pricing/load-calculator ;
  Cargo-Planner, EasyCargo, 3DBinPacking, CargoWiz, Goodloading →
  https://containermath.com/blog/best-container-loading-software (third-party) ;
  Cube-IQ, TOPS Pro, PackApp, StackBuilder → https://sourceforge.net/software/load-planning/ (third-party).
  Render "Source: <domain>, checked <date>" under each pricing line and
  soften any dollar figure whose source is third-party with "reported by".
Run `npm run typecheck && npm test`; write `docs/specs/FIX-AUDIT-A-REPORT.md`. Do not commit.
