# FIX-AUDIT-B — new-batch page findings from docs/specs/AUDIT-REPORT.md

Fix these exactly; add regression coverage (e2e where UI, unit where lib).
Do not touch files owned by FIX-AUDIT-A (Calculator.tsx, CbmCalcPage,
PalletStorageCostPage, functions/api/pack.ts|key.ts|lead.ts, realism.ts,
exportPlan.ts, receiverProfiles.ts, WarehousePage.tsx, competitors.json,
ComparePage.tsx).

- **F01 (S1) `OrderQuotePage.tsx`**: any edit to a physical input (cartons,
  pallet, allowance, limits, units, maxPallets) marks the current result
  STALE: show a banner "Inputs changed — re-run to update", disable
  downloads / verify / build-sheet handoff / options search until re-run.
  The request JSON download must always equal the inputs that produced the
  shown result (freeze a copy of the request at run time and export that).
- **F07 (S2) zh double prefix**: in the five pages (OrderQuote, Consolidation,
  BoxCatalog, ReceiverProfiles, BuildSheet) use router-relative `<Link to>`
  paths (no manual `/zh` prefix) — `BrowserRouter basename` already handles
  it. Add an e2e test that clicks every cross-tool link on `/zh/order-quote`
  and asserts the destination renders an `h1`.
- **F08 (S2) case-designer overhang**: `casePalletView` must pass the REAL
  deck (pallet l×w) to `PalletEstimateView` and offset cargo so the allowed
  overhang shows as cargo beyond the deck edge; add a prop to the view for
  `deck` vs `cargoEnvelope` if needed (additive, default = current).
- **F09 (S2) `CaseDesignerPage.tsx`**: a failed run clears or visibly
  freezes old results and disables downloads (same STALE pattern as F01).
- **F11 (S2) `OrderQuotePage.tsx` curl**: make the snippet a single valid
  shell command (comment on its own line above; continuation backslashes on
  every header line).
- **F16 (S3) mobile**: `/order-quote`, `/api-docs`, `/planner`, `/warehouse`
  must not exceed 390 px document width: wrap tables/code in
  `overflow-x-auto` containers, stack the carton editor rows on `sm:`;
  add an e2e assertion (`document.documentElement.scrollWidth <= 392` at
  390 viewport) for these four routes.
- **F17 (S3) a11y**: every carton-table input on `/order-quote` gets an
  `aria-label` like "A length cm"; same for the shared `Calculator.tsx`
  inputs is out of scope here (A owns that file) — note it.
- **F18 (S3) `src/lib/importCartons.ts` + `OrderQuotePage`**: support a
  `maxStack`/`max on top` column (aliases: maxstack, max stack, stack, top
  load, 頂部承重); the import panel shows the units the importer assumes and
  offers "rows are in in/lb" toggle that converts on import.
- **F19 (S3) zh**: translate the remaining English strings on zh
  consolidation / receiver-profiles / build-sheet / box-catalog pages
  (rule texts, check assumptions rendered from data → provide zh in
  `receiverProfiles.json` `textZh`, and map check `assumption` codes to zh
  via a small dictionary in the pages). Amazon template: replace the raw
  DNS-failure note with a customer-facing sentence in both languages.
- **F20 (S4) `ApiPricingPage.tsx`**: derive endpoint counts/lists from
  `ENDPOINT_BASE_LIMITS`; FAQ "what counts as a call" lists all.
- **F22 (S3) `PlannerPage.tsx` export gate**: state before the click that
  export asks for an email (small caption under the export buttons) and
  make the product-updates opt-in a separate unchecked checkbox.
Run `npm run typecheck && npm test`; write `docs/specs/FIX-AUDIT-B-REPORT.md`. Do not commit.
