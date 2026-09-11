# FIX-AUDIT-B implementation report

Date: 2026-09-11. Implemented against `CONVENTIONS.md`, `AUDIT-REPORT.md`, and `FIX-AUDIT-B.md`. No commit, push, or deployment.

## Requirements and files

| Finding | Implementation |
| --- | --- |
| F01 | `src/pages/OrderQuotePage.tsx` clones the request before calculation and exports/verifies that snapshot. Request edits show **Inputs changed — re-run to update**. Stale state persists even if values are restored manually. CSV/request/result downloads and API verification are disabled; the build-sheet link blocks activation and leaves keyboard navigation; options search is unavailable until rerun. Failed runs clear the result. |
| F07 | Removed manual `/zh` prefixes from router links in OrderQuote, Consolidation, BoxCatalog, ReceiverProfiles and BuildSheet pages. Browser regression calculates a Chinese quote and clicks every cross-tool link, including result actions and links inside details, checking a destination page heading. |
| F08 | `src/lib/caseDesign.ts` returns the real pallet deck, a separate cargo envelope and cargo positions offset by negative overhang. `PalletEstimateView.tsx` fits its scale to cargo extents without enlarging the deck. `LayerDiagram.tsx` has an additive, zero-default overhang option, so the top view also retains the real deck. `CaseDesignerPage.tsx` passes that option. Rendered SVG regression checks a 120×80 deck and cargo at −10 cm. |
| F09 | `CaseDesignerPage.tsx` clears candidates, selection, comparison and result downloads on form edits, unit/preset changes and before a run. Invalid reruns cannot retain old usable results. |
| F11 | Quote curl uses a separate comment line and continuation backslashes. Browser regression executes the rendered snippet against a shell function named `curl`, checking header/body arguments without making a network request. |
| F16 | Quote carton rows stack below `sm`, with visible field labels. Shrinkable sections and local scrolling prevent grid contents from expanding the document. API docs also wrap long inline text. Shared `Layout.tsx` route markers and scoped `src/index.css` rules fix planner/warehouse grid and code overflow without editing `WarehousePage.tsx`. All four routes pass the ≤392px document-width assertion at a 390px viewport. |
| F17 | Every quote carton-table input has a row-specific accessible name, including dimensions/weight units, quantity, upright and top load. Shared Calculator inputs remain outside this task, as explicitly assigned to A. |
| F18 | `src/lib/importCartons.ts` accepts maxStack, max stack, max on top, stack, top load and 頂部承重. Zero is preserved; invalid negative/nonfinite/text top loads produce row warnings. Quote import displays assumed units and offers an in/lb checkbox for pasted and file imports, converting dimensions, weight and top load into the current editor units. |
| F19 | `src/data/receiverProfiles.json` includes Chinese names, customer-facing verification notes and rule `textZh`. Amazon’s raw DNS diagnostic is replaced by bilingual instructions to obtain the applicable buyer requirements and fill a copied profile. `src/lib/auditPageLocale.ts` supplies shared presentation dictionaries for check labels/assumptions, profile text, unverified fields and screening semantics. Consolidation, ReceiverProfiles, BuildSheet and BoxCatalog pages use them. Custom rule translations can be edited and survive profile JSON storage through the existing parser. |
| F20 | `ApiPricingPage.tsx` derives its endpoint count, introductory list and complete FAQ path list from `ENDPOINT_BASE_LIMITS`. Existing plan limit lists continue using the same source. |
| F22 | `PlannerPage.tsx` discloses the email requirement underneath export buttons before activation. `PaywallModal.tsx` makes product-update consent explicit in a separate, unchecked optional checkbox, using the existing opt-in storage/submission path. Unlocking export does not require checking it. |

## Regression coverage and validation

- `npm run typecheck && npm test`: **passed** after the final implementation changes. Both application and Functions TypeScript configurations pass.
- New `tests/fix-audit-b.mjs`: **35 regression cases passed**, covering all top-load aliases, zero/invalid/absent values, real deck/overhang coordinates, bounds, count conservation, determinism and bilingual presentation helpers. Added to `package.json` test script.
- Existing seeded batch: **5,954 checks, zero failures**, across 1,360 fixtures. Existing unit, endpoint, quote, case, consolidation, box and receiver suites also pass.
- Updated `tests/case-design.mjs` to check overhang geometry in its translated cargo-envelope coordinate frame; existing no-overlap and bounds checks remain active.
- New `tests/fix-audit-b-e2e.mjs`: **7 browser flows passed**. Imported and invoked by `tests/e2e.mjs` before `i18n: /zh homepage`. Targeted command: `node tests/fix-audit-b-e2e.mjs http://127.0.0.1:4187`.
- Browser flows cover snapshot exports/stale actions/accessibility/curl, imperial import, every Chinese quote cross-tool link, rendered overhang plus invalid-case clearing, four mobile routes, dynamic pricing and Chinese explanations, and optional email-update consent.
- Additional desktop smoke check: six routes had expected titles and nonempty page headings, zero Vite overlays and zero captured JavaScript `pageerror` events.
- `git diff --check`: passed.

## Browser environment and evidence

System Chrome through the repository’s installed Playwright, local Vite at `http://127.0.0.1:4187`, 1440×900 desktop and 390×844 mobile. The in-app Browser invocation failed with `codex/sandbox-state-meta: missing field sandboxPolicy`; the explicitly requested repository e2e workflow was used as fallback. No packages were installed. Vite used a temporary cache under `/tmp` because the existing `node_modules` symlink points outside the writable worktree.

Visually inspected local screenshots: `/tmp/fix-b-quote-mobile.png` (stacked editor with visible labels) and `/tmp/fix-b-case-overhang.png` (real deck and overhanging cargo). Final full test output: `/tmp/fix-b-final-validation.log`.

## Limits and scope

- No FIX-AUDIT-A-owned file was edited, including `WarehousePage.tsx`, `Calculator.tsx`, `receiverProfiles.ts`, endpoint handlers reserved for A, realism/export libraries, or competitor files. Shared Calculator accessibility remains A’s responsibility.
- No dependencies, secrets, endpoint contracts, or prerender script were changed. The existing untracked `node_modules` symlink was left in place.
- The complete legacy browser suite was not rerun; all seven new integrated browser flows and the required full unit/API suite were run. Production API parity, other browsers, exhaustive viewport/animation combinations and real email delivery were not tested.
- Supplied customer text/identifiers and API field names remain as entered. Built-in Chinese copy is supplied explicitly; arbitrary customer-authored English is not automatically translated.
- Overhang visualization is geometric, not a material-strength or transit-stability certification. Existing import rounding and general parser behavior outside top-load handling remain unchanged.
