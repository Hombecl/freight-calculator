# Spec 03 implementation report

Date: 2026-09-11

## Delivered

- `src/data/receiverProfiles.json`: exactly four starting profiles: `amazon-fba-us`, `ltl-standard-us`, `eur-retail-dc`, and `custom`. Each includes source/date metadata. Generic LTL and EUR numbers are explicitly templates, not verified carrier or retailer policies.
- `src/lib/receiverProfiles.ts`: profile validation, `loadProfiles`, `profileToQuoteLimits`, unit-aware profile application, SHA-256 profile versions, rule evaluation, customer approval metadata, and shared receiver-check orchestration. One check is returned per rule. Height, gross weight, footprint, overhang, stack and upright are screened; manual rules return `not_evaluated` with the exact assumption “crew confirms on the build sheet”. Missing inputs remain explicit; missing tare warns. Failed profile rules produce `needs_review` with their original rule codes. Unplaced cargo remains accounted for in the underlying quote.
- `src/lib/orderQuote.ts`: additive `buildInput` metadata retains canonical pallet, carton and packaging inputs for orientation screening, unrounded limit comparisons and accurate deck height. Existing fields and engine/hash behavior remain unchanged.
- `functions/api/receiver-check.ts`: POST accepts `profileId` or a complete `profile` with the order request. GET provides the documented example, limits, semantics and shipped profile summaries. Includes keyed rate limiting (anonymous 10/min, 100/day), CORS, streamed size enforcement, 400 field errors, 404 unknown profiles, 413/415 responses, tier and invalid-key warning.
- `src/pages/ReceiverProfilesPage.tsx`: bilingual template listing and source/date badges, buyer-verification ribbons, duplicate/edit forms, pallet/limit fields, structured rule editing including manual rules, customer approval fields, unverified-field editing, local save, JSON import/export. Shipped profiles cannot be overwritten by local IDs.
- `src/lib/receiverStorage.ts`: storage key conventions, pure parsing of saved profile collections and imported quotes. Browser storage access stays in pages.
- `src/lib/buildSheet.ts`: pure actuals validation, timestamp normalization, cm/kg measurement conversion into original request units, photo/crew preservation, quote variance updates and profile/checklist snapshots.
- `src/pages/BuildSheetPage.tsx`: paste/upload/sessionStorage quote loading, profile selection, per-pallet `buildSteps` lists and animated `PalletEstimateView`, per-pallet rule checklists, measured height/gross weight, shipment pallet count, local data-URL photo, crew initials and timestamp. Save writes the complete quote and actuals to `dp_quote_<orderId>`. Reload restores saved evidence for the same input hash. Printing uses per-pallet page breaks and compact step columns.
- `src/components/PalletEstimateView.tsx`: before-print handling reveals all cartons and stops animation. The build sheet uses `sheet-placed-count` to expose the actual rendered carton count.
- `src/pages/OrderQuotePage.tsx`: shipped/custom profile selector applies pallet values and receiver limits, appends profile checks, carries the quote and profile snapshot through `dp_build_sheet`, and restores stored requests/actuals and variance. Profile screening is retained when choosing an order option. Includes return navigation from the sheet.
- Route/discovery wiring: `src/App.tsx`, `scripts/release-routes.mjs`, `src/components/layout/Footer.tsx`, and `public/llms.txt`. Both pages are available through the existing English/Traditional Chinese routing mechanism, with Helmet metadata and tracked actions.
- API discovery: `src/lib/apiTiers.ts`, `src/pages/ApiPricingPage.tsx`, and a bilingual `/api-docs#receiver-check` section in `src/pages/ApiDocsPage.tsx`.

## Amazon source verification

Executed the specifically requested curl fetch:

```sh
curl -L --max-time 30 'https://sellercentral.amazon.com/help/hub/reference/external/G201750310' -o /tmp/receiver-amazon.html -w '\nHTTP %{http_code}\n'
```

Result: `curl: (6) Could not resolve host: sellercentral.amazon.com`, HTTP `000`; no page body was received.

Consequently, the Amazon template contains **no pallet dimensions, limits or asserted rule values**. Its `unverified` list names the omitted pallet fields, height/gross/overhang/clampable fields and all five proposed rules. `verifiedAt: 2026-09-11` records the attempted check date; `verificationNote` explicitly records the failed fetch and absence of verified values. These details are visible in the UI and returned with profile metadata. The height-failure test uses explicitly customer-supplied test data, not a claimed Amazon policy.

## Validation

- Final `npm run typecheck && npm test`: **passed**, exit 0. Both app and Cloudflare Functions TypeScript projects passed; all **nine test scripts** passed.
- Added `tests/receiver-profiles.mjs` to `npm test`: **12 named test groups passed**. Coverage includes shipped templates/source metadata, rule mapping, pass/fail/warn/not_evaluated branches, manual wording, height review codes, all profile field categories, hash sensitivity/determinism, imperial conversion, conservation, bounds/no overlaps, build-step/SVG carton counts, device-profile parsing, actuals/photo/variance round trips and validation, and endpoint 200/400/404/413/415 plus GET/OPTIONS.
- Added **two e2e tests** before the existing Chinese-homepage test in `tests/e2e.mjs`: source badges; session-carried build steps/render counts, actuals save/reload, and return-to-quote variance. `node --check tests/e2e.mjs` passed.
- Attempted `npm run e2e -- http://127.0.0.1:4174`: **blocked before any browser test ran**. System Chrome terminated during launch with SIGABRT and the sandbox reported EPERM during process cleanup. No e2e pass or visual print verification is claimed.
- SPA bundling via Vite's programmatic build with a temporary cache/output directory: **passed**, 1,729 modules transformed. This avoided writing into the workspace's pre-existing external `node_modules` symlink. No dependencies were installed and `scripts/prerender.mjs` was not changed.
- `git diff --check`: passed.

## Known limits and omissions

- Amazon numeric/rule values were intentionally omitted under the spec's unreadable-source fallback. No other retailer numbers were added.
- Customer approvals are recorded as supplied, not authenticated or certified. All outputs remain screening/heuristic estimates, not acceptance or chargeback predictions.
- Footprint checks do not establish GMA construction/four-way entry; upright geometry does not establish printed-arrow direction. Stacking relies on the engine's enforcement of supplied carton strength values; older quotes without original orientation inputs explicitly cannot evaluate upright rules.
- Photos and actuals remain on the device. PNG/JPEG/WebP photos are limited to 2 MB each; localStorage quota failures surface as errors. Nothing uploads photos.
- Browser execution and physical print pagination could not be verified in this sandbox. Per-pallet print breaks are implemented; unusually long user-entered rules or printer settings may require print scaling.
- No implementation feature was intentionally deferred. The unavailable browser run and source fetch are recorded above rather than represented as successful verification.

No commit, push, deployment, secret access, dependency addition, or prerender-script change was performed. The pre-existing untracked `node_modules` symlink was left intact.
