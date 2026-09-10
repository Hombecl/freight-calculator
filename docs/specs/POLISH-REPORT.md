# POLISH batch UI report

Implemented the four-page polish against `CONVENTIONS.md`, `POLISH-batch-ui.md`, and the `OrderQuotePage.tsx` reference. No commit, push, deployment, dependency, library, endpoint, contract, or test-file changes.

## Files and requirements

| File | Implementation |
| --- | --- |
| `src/pages/ConsolidationPage.tsx` | One card per PO, compact carton-row tables, and a right-hand container/LCL/rules card. Results use plan cards, container tables (preset, POs, carton count, utilization, weight, check pills and existing actions), and red-outlined remainder lines. The page-only default is two POs of 12 and 10 upright 60×40×40 cm, 12 kg cartons, with 20GP×1, 40GP×1 and 40HQ×1 allowed. |
| `src/pages/BoxCatalogPage.tsx` | Three numbered input cards; two-column billing fields; catalog and totals comparison table cards; baseline header and cells only when a baseline exists; conditional green savings banner; scrollable per-order table; assumption-titled check pills; styled downloads; single-order picker card with preview beside the form. |
| `src/pages/ReceiverProfilesPage.tsx` | Template grid with names, source/domain and verified-date badges, template ribbons, limits summaries, and existing duplicate/edit actions. Edit form is a card with a rules table. Missing limits remain explicitly unspecified; original verification notes remain visible. |
| `src/pages/BuildSheetPage.tsx` | Paste/upload/profile input card and top-right print action. Per-pallet cards place the build-step table (#, SKU label/identity, x/y/z, layer) left and the existing `PalletEstimateView` with its play controls right. Checklist and bordered actuals form follow below. Original print CSS is unchanged. Layers label distinct starting heights in ascending order. |

All four retain their original Helmet title/description and every existing test ID. They now include bilingual introductions, limits lines, related-tool CTA rows, reference-style headings, rounded cards, inputs, primary/download buttons, table headers, status treatments and amber notes. Existing event handlers, imports/exports, storage behavior, computation and renderer components are retained. Mobile containment keeps wide tables scrollable inside their cards.

## Validation

- `npm run typecheck && npm test`: passed on the final source. All 13 test scripts completed. Reported counts: 45 core tests; 17 pallet-estimate checks; 17 order-options checks; 13 case-design checks; 13 consolidation tests; 14 box-catalog checks; 12 receiver-profile tests; and 5,954 batch verification checks with zero failures. Other scripts report assertion success without a numeric total. Log: `/tmp/polish-tests-final.log`.
- `npx vite build`: passed; no prerender script invoked. Log: `/tmp/polish-build-final.log`.
- `npx vite preview --host 127.0.0.1 --port 4175`, then `node tests/e2e.mjs http://127.0.0.1:4175`: **75 passed, 0 failed**. Includes consolidation plan/3D counts, box optimization/picking/coverage, receiver source badges, build steps and actuals persistence. Log: `/tmp/polish-e2e-final.log`.
- Temporary library assertion extracts the actual consolidation page initializer through the TypeScript AST, checks every requested example value and allowed container, and calls `consolidate()`: **plan 1 `ALL_CARGO_PLACED: pass`, 22 cartons, zero remainder**. Reconfirmed using `node --import tsx /tmp/polish-verify.mts`; no repository test changed.
- Source comparison confirms unchanged Helmet blocks and identical existing test-ID inventories. `git diff --check`: passed.

## Rendered QA

Flow: open each tool → run the example or open the profile editor/load a quote → verify the result cards, tables and preserved controls.

Environment: local production preview, system Chrome via Playwright; desktop 1440×900 and mobile 390×900. The Browser plugin connection failed with `codex/sandbox-state-meta: missing field sandboxPolicy`; the explicitly requested repository Playwright workflow was used instead.

| Check | Result |
| --- | --- |
| Page identity / nonblank content | Pass for all four pages and the reference |
| Framework overlays | None |
| Console warnings/errors and page errors | None in the completed visual run |
| Interactions | Consolidation planning, catalog optimization and single-order picking, profile duplication/editor display, quote loading; full e2e additionally verifies actuals round-trip |
| Desktop/mobile layout | All four edited pages have no document-level horizontal overflow at either tested width |
| Screenshot evidence | Captured all four pages plus the reference at both widths; cards, table hierarchy and side-by-side forms/previews inspected |

Evidence: `/tmp/polish-{consolidation,box-catalog,receiver-profiles,build-sheet,order-quote}-{1440,390}.png`; visual log `/tmp/polish-visual-final.log`. Mobile QA identified and fixed intrinsic input-card sizing, uncontained screen-reader badge text and actuals-field sizing. The unchanged order-quote reference has existing mobile overflow; it is outside this task.

## Limits / skipped work

- No requested implementation item was skipped. Libraries, contracts, tests and shared renderers were deliberately left unchanged as required.
- Physical printing, other browser engines and exhaustive custom-data combinations were not visually checked. Existing print CSS was preserved verbatim.
- An extra optional baseline-absent/rule-save/Chinese-mobile script did not complete: its first run timed out on an overly exact temporary label selector; after correcting that selector, a new Chrome launch was blocked (`SIGABRT` / `EPERM`). Those additional scenarios are not claimed as browser-verified. This does not change the successful full test/e2e and completed desktop/mobile visual results above.
- Preview is available at `http://127.0.0.1:4175` while its process remains active. Temporary QA artifacts are outside the repository.
