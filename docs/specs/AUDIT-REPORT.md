# DimPack3D independent audit

Audit date: 2026-09-11. Source revision: `a3fea215d44a045331b9c7f79d6a149672e1657b`.
Scope/instructions: [AUDIT-full.md](AUDIT-full.md). No changes to `src/`, no fixes, no commit.

## Executive verdict

**Do not ship this as a dependable freight-quoting or crew-instruction system yet.**
The new calculation handlers are substantially more disciplined than the older tools.
All 27 valid synthetic requests matched between local handlers and the live calculation APIs.
Nevertheless, the quote page can export a request and result for different shipments.
The old container calculator ignores payload and door constraints; stored zero rates change on reopening.
Packing API quantity coercion changes requested cargo, and a packing-list sequence can put a supported carton before its support.
Chinese cross-tool navigation is broken on several priority pages.
Case-design overhang drawings enlarge the pallet itself, hiding the real unsupported edge.
The product is useful for preliminary screening, but the report's S1/S2 findings need resolution before operational reliance.
This is broad audit evidence, **not a completed certification of every state**; remaining coverage gaps are listed below.

## Evidence and method

- Used the existing production preview at `http://127.0.0.1:4175`; did not start a server or rebuild it. In-app browser setup failed with a tool sandbox metadata error before navigation. Used the installed Playwright package with system Chrome instead.
- Enumerated routes from `src/App.tsx`, competitor variants from `src/data/competitors.json`, and all 14 public handler files under `functions/api/` (`_rateLimit.ts` is a helper, not an endpoint).
- Captured 40 route states at 1440px and 390px, controls, text, initial keyboard focus and browser exceptions in [pages.json](audit-evidence/pages.json). These are initial-state observations, not 40 completed user tasks. The broader inventory includes informational tool landing pages.
- Ran `npm test`: passed, including the repository's 5,954-check seeded batch. Ran `npm run typecheck`: passed. Existing tests are supporting evidence, not independent recomputation.
- Wrote independent arithmetic/geometry checks: exact block fixtures, count conservation, bounds, overlap, 60% support, gross/base/allowance accounting, weighted CoG, unit conversions, case dimensions and board mass, billing, and consolidation cost. Independent expected values do not call the production solver. Calling the production handler is the *observation* side of the comparison.
- Tested actual handlers in-process with isolated synthetic storage for auxiliary endpoints. No real key issuance, leads, shared plans, messages or account changes were made. Synthetic live calculation requests contain no customer data.
- [http.json](audit-evidence/http.json): preview GETs at `/api/*` return SPA HTML, so preview API verification cannot work. Live GET documentation works for the nine calculation endpoints and `/api/key`; `/api/share` without ID returns 400 and `/api/stats` without authorization returns 403. GET on POST-only `/api/lead` and `/api/hit` falls back to HTML.
- [live-calculations.json](audit-evidence/live-calculations.json): all **27/27** synthetic live POSTs (three per calculation endpoint) returned 200 and matched checked hashes/output structures from the local handlers. This establishes parity for those fixtures, not equivalence for all inputs.
- Every finding below distinguishes reproduced incorrect output, misleading presentation and coverage limitations. Screenshot filenames are relative to this report.

## Findings, sorted by severity

S1 = wrong number/plan shown to a user; S2 = misleading presentation/broken flow; S3 = UX friction; S4 = polish. Effort estimates are implementation estimates, not commitments.

| ID / severity | Page or endpoint; minimal reproduction | Expected → observed | Evidence | Proposed fix (file level) / effort |
|---|---|---|---|---|
| F01 **S1** | `/order-quote`: quote untouched example, change **Tare weight kg** from 22 to 100, download request and full result without rerunning. | Both exports describe one frozen calculation, or exports are disabled pending rerun → displayed/result gross **357.3 kg**, request recomputes to **435.3 kg**, different input hashes. Old result has no stale banner. | [stale-parity.json](audit-evidence/stale-parity.json), [screenshot](audit-evidence/quote-stale-export.png), `stale-request.json`, `stale-result.json`. | `src/pages/OrderQuotePage.tsx`: invalidate the result on physical input edits or bind every result action to `quotedRequest`, with a visible stale state. **M** |
| F02 **S1** | `/container`: 20GP, cartons **60×40×40 cm, 1,000 kg** each. | At most **28** cartons by 28,200 kg payload before geometry → **255 cartons**, implying **255,000 kg**, without a payload warning. | [screenshot](audit-evidence/legacy-container-1.png), [text](audit-evidence/legacy-container-1.txt); `Calculator.tsx` loadingStats only uses geometric count. | `src/components/Calculator.tsx`: enforce preset payload using carton gross, reflect constrained count in stats and 3D. **M** |
| F03 **S1** | `/container`: 20GP, one type **230×230×230 cm**, 100 kg. Related `/cbm-calculator?l=230&w=230&h=230&q=1&wt=1000`. | Cube cannot pass a **228 cm** high door in any orientation → container quick calculator reports **2**; CBM page calls 20GP the “Smallest container that fits.” | [container screenshot](audit-evidence/legacy-container-2.png), [CBM screenshot](audit-evidence/cbm-door.png). | `src/components/Calculator.tsx`, `src/pages/CbmCalcPage.tsx`: use shared door apertures; label volume-only recommendations explicitly. **M** |
| F04 **S1** | `/pallet-storage-cost-calculator?p=20&r=0&hd=0&m=2`, including reopening a copied URL after entering zero. | 20×0×2 + 20×0 = **0 USD** → **920 USD**; both zero inputs become 20 and 6. | [screenshot](audit-evidence/storage-2.png), [text](audit-evidence/storage-2.txt), [strict regression](audit-evidence/calculators-storage.json). | `src/pages/PalletStorageCostPage.tsx`: distinguish absent/invalid query values from valid zero; audit equivalent `Number(...) || default` initializers. **S** |
| F05 **S1** | `POST /api/pack`, container 100³ cm, one 40×40×50 cm carton specification; vary `qty` through **0, -1, 1.5, "text"**. | Reject invalid quantity with 400 (or an explicit zero contract) → 200 with respectively **1, 1, 2, 0** boxes; text reports zero unplaced too. | [engine.json](audit-evidence/engine.json), entries `pack rejects qty …`. Reproduced in real handler; malformed cases not sent live. | `functions/api/pack.ts`: validate finite numeric integer quantity before expansion; reject invalid types rather than rounding/coercing. **S** |
| F06 **S1** | Packing-list/PDF exporter: base at `(20,0,0)`, size `80×100×10`; top at `(0,10,0)`, size `100×100×10` (positions x,y,z; size l,w,h). Top has **80% support**. | Base must be placed before top → `loadingSequence` sorts x first and exports **Top before Base**. | [bridge.csv](audit-evidence/bridge.csv), [more-physical.json](audit-evidence/more-physical.json), `loading sequence supports first` in engine evidence. This is a constructed valid plan, not a claimed naturally generated fixture. | `src/lib/realism.ts` and `src/lib/exportPlan.ts`: topological support ordering, then back-to-door tie-breaks. Keep pallet `buildSteps`, which already orders bottom-first. **M** |
| F07 **S2** | Chinese `/zh/order-quote` → Manage receiver profiles; Chinese consolidation/box-catalog/receiver-profiles/build-sheet cross-tool links. | `/zh/receiver-profiles`, etc. → **`/zh/zh/...`**, blank page. | [locales.json](audit-evidence/locales.json), [blank destination](audit-evidence/zh-order-quote-broken.png). | Corresponding five `src/pages/*Page.tsx` files: router-relative paths; `BrowserRouter` already supplies `/zh`. **S** |
| F08 **S2** | `/case-designer`: default inputs, **Overhang per side = 10 cm**, select a candidate. | Show a 120×80 deck with cargo extending beyond it → view passes **140×100** as the pallet and draws that larger base. Real overhang disappears. | [case-overhang.json](audit-evidence/case-overhang.json), [screenshot](audit-evidence/case-overhang.png). | `src/lib/caseDesign.ts` (`casePalletView`) and `src/components/PalletEstimateView.tsx`: separate actual deck from allowed cargo envelope; offset cargo coordinates correctly. **M** |
| F09 **S2** | `/case-designer`: run default design, set product length to -1, run again. | Invalid current inputs cannot leave usable-looking old recommendations → error plus **five old candidates** and active downloads remain. | [screenshot](audit-evidence/case-invalid-stale.png), [regressions.json](audit-evidence/regressions.json). | `src/pages/CaseDesignerPage.tsx`: clear or visibly freeze stale output and disable dependent actions after edits/failed runs. **S** |
| F10 **S2** | `POST /api/receiver-check`: one pallet allowed, 30 cartons 40×40×50 cm at 20 kg, maxStack 5, 120×80 deck, base 15, packing cap 115; custom receiver height 20. | Preserve **partial** when cartons remain; separately flag receiver failure → **needs_review**, despite cartons unplaced. Contradicts endpoint docs defining needs_review as placed-but-limit-failed. | [receiver-partial-result.json](audit-evidence/receiver-partial-result.json), [more-physical.json](audit-evidence/more-physical.json). | `src/lib/receiverProfiles.ts` `attachProfile`: give partial precedence; represent receiver failure independently. **S** |
| F21 **S2** | `/warehouse`: default floor, set EUR quantity to 1 and GMA quantity to 0 (UI clamps it to 1), then Auto-arrange. Repeat EUR 6/12. | Placed/requested refers to one inventory, or palette/placed are separate → **39/2, 39/7, 39/13** “Cargo placed.” Tidy retains old cargo; quantity fields only change denominator. | [warehouse.json](audit-evidence/warehouse.json), [screenshot](audit-evidence/warehouse-1.png). | `src/pages/WarehousePage.tsx`: distinguish palette templates from planned inventory; derive matching counts or offer explicit rebuild-from-quantities. **M** |
| F11 **S2** | `/order-quote`: expand “Call this from your WMS / order system”; copy multiline curl. | One command including request body → API-key line has an inline `# optional…` and **no continuation**, so `--data-binary` starts another shell command. | `src/pages/OrderQuotePage.tsx`, `const curl`; reproduced as text in [quote-curl.txt](audit-evidence/quote-curl.txt). | Same file: move comment outside command and continue the header line, or omit optional header. **S** |
| F12 **S2** | `/fba`: default 10×8×3 in / 1.5 lb. | A versioned, applicable fee schedule or clearly illustrative arithmetic → **$4.81** “EST. FBA FEE,” fixed tier base prices, no applicable date/selling-price/category/surcharge model on the tool. | [fba screenshot](audit-evidence/fba-desktop.png); `Calculator.tsx` uses base + fractional `(billable-1)×perLbFee`. [Amazon pricing](https://sell.amazon.com/pricing) and [official 2026 fee update](https://sellercentral.amazon.com/seller-forums/discussions/t/f3fa3211-820b-4e2e-a023-158a9cf55f99?mons_sel_locale=en_US) establish that applicability matters. **No exact corrected tariff is asserted.** | `src/components/Calculator.tsx`, `src/context/AppContext.tsx`: one dated authoritative schedule, required applicability inputs and rounding; otherwise remove dollar fee output. **L** |
| F13 **S2** | `/packing` / `/embed`: default untouched “Estimated Cost.” | Rate assumptions and applicability visible next to quote → concrete air/sea per-unit dollar costs use hidden Settings defaults, without a source/date. | [packing screenshot](audit-evidence/packing-desktop.png), [text](audit-evidence/packing.txt): USD 5.53 air/unit and 0.64 sea/unit. | `src/components/Calculator.tsx`: show editable rate, currency, rate basis and “illustrative default, not a quote” before cost use. **S** |
| F14 **S2** | `/compare/cube-iq-alternative`, `/compare/cubemaster-alternative`, `/compare/easycargo-alternative`. | Traceable price claim with source/date/conditions → generic “third-party listings” and dollar figures without direct claim-level source links; generic September footer does not identify the source. | [Cube-IQ text](audit-evidence/compare-cube-iq-alternative.txt); `src/data/competitors.json` ($5,000/year; $49/month; $995–2,495; $2,400+). Vendor pages were sampled, not all claims revalidated. | `src/data/competitors.json`, `src/pages/ComparePage.tsx`: source URL + checked date per claim, distinguish minimum order from subscription price, remove unsupported figures. **M** |
| F15 **S2** | `/api/key` and `/api/lead`, JSON body **`null`**. | Structured 400 response → unhandled exception reading `email`, which becomes a server failure in deployment. | `aux key 0` / `aux lead 0` in [engine.json](audit-evidence/engine.json); isolated handlers, no real issuance/messages. | `functions/api/key.ts`, `functions/api/lead.ts`: validate non-null object before field access. **S** |
| F16 **S3** | `/order-quote` at 390px; `/api-docs`; `/planner` and `/warehouse`. | Form/result readable without document-wide pan → document widths **435, 1147, 804, 804 px**. Quote table cells are too narrow to read full entered values. | [pages.json](audit-evidence/pages.json), [quote mobile](audit-evidence/order-quote-mobile.png), corresponding `*-mobile.png`. | Page containers and table/code wrappers in these pages: constrain width, local scrolling or stacked row editor. **M** |
| F17 **S3** | `/order-quote` keyboard/screen-reader carton entry. | Every input announces SKU/field/unit → carton inputs have no associated accessible label; initial control inventory records blank labels across the table. | [order-quote-controls.json](audit-evidence/order-quote-controls.json); mobile screenshot. Older shared Calculator inputs have the same problem. | `OrderQuotePage.tsx`, `Calculator.tsx`: stable IDs/labels or row-specific aria-labels; preserve logical tab sequence. **M** |
| F18 **S3** | `/order-quote`: paste CSV with `maxStack` column = 0; or choose in-lb then paste ordinary unlabelled imperial rows. | Explain unsupported columns and import units at the action → numeric `maxStack` silently disappears; 16 becomes **6.3 in** because importer is always cm/kg. **The placeholder does say cm/kg**, so the latter is a confusing contract, not an undisclosed arithmetic error. | [quote-import-stack.json](audit-evidence/quote-import-stack.json), [imperial screenshot](audit-evidence/quote-imperial-paste.png). | `src/lib/importCartons.ts`, `OrderQuotePage.tsx`: support numeric top load or warn on dropped columns; explicit import-unit control. **M** |
| F19 **S3** | `/receiver-profiles`: Amazon FBA template; Chinese new-tool results. | Useful next action and localized explanations → Amazon template has no rule values, raw field-code list and English DNS failure note; Chinese pages retain English rule text/check assumptions. | [receiver page](audit-evidence/receiver-profiles.txt), [Chinese receiver](audit-evidence/zh-receiver-profiles.txt), [Chinese consolidation](audit-evidence/zh-consolidation.txt). Missing values are honestly disclosed, **not a fabricated pass**. | `receiverProfiles.json`, `receiverProfiles.ts`, affected pages: customer-facing unavailable-source message, guided manual setup, translated explanation strings. **M** |
| F22 **S3** | `/planner`: new session, click CSV. | Export prerequisite visible before creating a plan → email capture/product-update gate appears only at download. No download was triggered without entering email. | [screenshot](audit-evidence/planner-export-gate.png), [text](audit-evidence/planner-export-gate.txt). | `src/pages/PlannerPage.tsx`, export gate component: disclose email requirement before use; separate marketing opt-in from delivery. **S** |
| F20 **S4** | `/api-pricing` intro and “What counts as a call?” | Nine calculation endpoints listed consistently → intro says **four**, FAQ names only the original four, while rate cards list nine. | [api-pricing.txt](audit-evidence/api-pricing.txt). | `src/pages/ApiPricingPage.tsx`: derive enumeration from shared tier/endpoint metadata. **S** |

## Per-page scorecard

Scores are auditor judgments: 1 unreliable/unusable, 2 material defects, 3 useful with limitations, 4 good sampled behavior, 5 strong verified behavior. `—` means that dimension is not an offered capability (not a pass). **Scores do not imply every state was tested.** “Value” asks whether this beats a spreadsheet/free LLM for the specified task.

| Page | Calc | Physical | Viz | Honesty | UX | Value | Coverage and highest-value next change |
|---|---:|---:|---:|---:|---:|---:|---|
| `/order-quote` incl. options | 2 | 4 | 4 | 3 | 2 | 4 | Three exact 1/12/13-carton fixtures; live/handler/export parity; permitted 13→12 option; fix frozen quote/export contract. |
| `/case-designer` | 4 | 3 | 2 | 4 | 3 | 4 | 1/6/12-unit independent case math, CSV/request, candidate SVGs, stale-error and overhang probes; show real deck and strength limits. |
| `/consolidation` | 4 | 3 | 4 | 4 | 3 | 4 | 1/12/0 first-PO quantities + engine 1/3/20-PO fixtures; JSON parity and 22-mesh scene; streamline CSV-first three-PO workflow. |
| `/box-catalog` | 4 | 3 | 4 | 4 | 3 | 4 | 1/2/60-unit UI history, fit/unfit, both CSVs, request/API; model outer billing dims separately from usable inner dims. |
| `/receiver-profiles` | 4 | 3 | — | 4 | 2 | 3 | Three 64.99/65/65.01cm boundary profiles, JSON import/export, save; provide an actionable buyer-approved template workflow. |
| `/build-sheet` | 4 | 4 | 4 | 4 | 3 | 4 | 1/12/13-carton quote handoff, SVG steps 0/1/all; three measured-actuals flows; portable measured-result export would improve repeat use. |
| `/api-pricing` | — | — | — | 3 | 3 | 4 | Rate-card/source review, desktop/mobile; real issuance not performed; align documentation and add a local-ready first-call path. |
| `/api-docs` | — | — | — | 4 | 2 | 4 | API contracts, live docs and snippets reviewed; make code sections usable at 390px. |
| `/cubing-software` | — | — | — | 4 | 4 | 3 | English/Chinese page and claims sampled; demonstrate one measurable order result early. |
| `/planner` | 3 | 3 | 4 | 3 | 2 | 4 | Three 1/6/12-cube UI counts and 10/60/120kg totals; live API fixtures and 188-mesh default scene; fix mobile and export build order. |
| `/pallet-calculator` | 4 | 3 | 4 | 4 | 3 | 3 | Three metric/imperial/exact-fit block fixtures plus bad inputs; make cargo-height vs loaded-height distinction unavoidable. |
| `/ti-hi-calculator` | 4 | 3 | 4 | 4 | 3 | 3 | Same three independent block cases; top/layer drawings sampled; clear base-height treatment. |
| `/pallets-per-container` | 4 | 3 | 3 | 4 | 4 | 3 | Heights 150/100/230cm; weights 500/1000/500kg; all three presets and diagram source; export chosen actual floor pattern. |
| `/freight-class-calculator` | 4 | — | — | 4 | 3 | 3 | Densities 9.375, 8, 50 pcf; boundary classes and sums; primary NMFTA scale cross-check; retain commodity qualification warning. |
| `/cbm-calculator` | 4 | 2 | — | 2 | 4 | 3 | Metric, imperial, 1m³ exact case; door counterexample; replace categorical fit language. |
| `/dimensional-weight-calculator` | 4 | — | — | 3 | 4 | 3 | Express/US/IATA examples; raw divisor math agrees; offer explicit rounding/service rules. |
| `/warehouse-space-calculator` | 4 | 3 | — | 4 | 4 | 3 | 500/1/20 positions, 4/1/2 levels; planning-area arithmetic; connect forecast to a validated aisle layout. |
| `/forklift-aisle-width-calculator` | 4 | 3 | — | 4 | 4 | 3 | Three truck/load/clearance arithmetic cases; presets are not equipment certification; add customer data-plate fields. |
| `/pallet-storage-cost-calculator` | 2 | — | — | 3 | 3 | 3 | Three rates/period cases and invalid inputs; fix zero-value bookmarks first. |
| `/packing` | 4 | 2 | 3 | 2 | 3 | 3 | Independent cube fixtures (1,000/1/0 fit), gross and volume; huge carton weight has no strength model; expose quote rates. |
| `/container` | 1 | 1 | 3 | 2 | 3 | 2 | Default 255 count/24.48m³ agrees geometrically; heavy/door counterexamples fail; use constrained shared engine. |
| `/fba` | 2 | — | 3 | 2 | 3 | 2 | Three dimensional/billable-weight cases; fee applicability not validated; replace unsourced tariff model. |
| `/warehouse` | 3 | 3 | 3 | 3 | 2 | 4 | Three palette-quantity edits/auto-arranges expose a 39/2, 39/7, 39/13 placed counter; path coverage incomplete; distinguish palette from placed inventory. |
| `/pallet-height-calculator` | 4 | 4 | 4 | 4 | 4 | 4 | Three 1/6/12-carton UI cases match independent expected count and SVG IDs; initial mixed order and estimator tests also checked. |
| `/pallet-builder` | — | 3 | — | 3 | 3 | 3 | Landing page links to `/planner?demo=pallet`; “counts always agree” needs evidence across both solvers; put the builder directly on the page. |
| `/reality-checks` | — | — | — | 4 | 4 | 3 | Explanation page, initial render and shared check source; pair claims with a runnable failure example. |
| `/plans` | — | — | — | 3 | 3 | 3 | Signed-out state only; authenticated persistence/approval flows not exercised. |
| `/embed` | 4 | 2 | 3 | 2 | 3 | 3 | Same independent 1,000/1/0 packing fixtures; same rate/strength limitations as `/packing`. |
| `/` | — | 3 | 3 | 3 | 4 | 3 | Initial demo and desktop/mobile render; simplify route to persona-specific useful result. |
| `/compare/easycargo-alternative` | — | — | — | 2 | 4 | 3 | Desktop/mobile + Chinese; source price claim precisely. |
| `/compare/cargo-planner-alternative` | — | — | — | 3 | 4 | 3 | Desktop/mobile and source text; date/link feature comparison. |
| `/compare/cube-iq-alternative` | — | — | — | 2 | 4 | 3 | Unsupported third-party price attribution; remove or link the exact source. |
| `/compare/goodloading-alternative` | — | — | — | 3 | 4 | 3 | Desktop/mobile, source text; distinguish free/paid constraints explicitly. |
| `/compare/3dbinpacking-alternative` | — | — | — | 3 | 4 | 3 | Desktop/mobile; official pricing page sampled; publish request-level comparison. |
| `/compare/cargowiz-alternative` | — | — | — | 3 | 4 | 3 | Desktop/mobile, source text; dated claim-level links. |
| `/compare/cubemaster-alternative` | — | — | — | 2 | 4 | 3 | Numerical licensing claims need source links and applicability. |
| `/compare/searates-load-calculator-alternative` | — | — | — | 3 | 4 | 3 | Desktop/mobile, source text; date sources and compare one concrete workflow. |
| `/compare/tops-pro-alternative` | — | — | — | 3 | 4 | 3 | Desktop/mobile, source text; date/link constraints and applicability. |
| `/compare/stackbuilder-alternative` | — | — | — | 3 | 4 | 3 | Desktop/mobile, source text; substantiate blanket “charges for” comparison wording. |
| `/compare/packapp-alternative` | — | — | — | 3 | 4 | 3 | Desktop/mobile, source text; dated feature evidence. |

## Endpoint-by-endpoint coverage

UI/viz/keyboard dimensions do not apply to a JSON handler. Honesty here means explicit units, limits, status and error contracts. Auxiliary endpoints do not calculate physical plans; three synthetic payloads exercise their contract instead of inventing numeric tests.

| Endpoint | Verified | Findings / remaining limit |
|---|---|---|
| `/api/pack` | Three live valid counts; in-process geometry, count conservation, malformed JSON/object, OPTIONS/CORS. | F05; no stream-size/type hardening certification. |
| `/api/pallet-estimate` | Three live fixtures (12, 1, 20 SKUs), placed+remaining, bounds, support; existing regression suite. | Legacy cm/kg-only contract is explicit; generic heuristic need not reach optimum. |
| `/api/order-plan` | Three live request-wrapper fixtures; live/local output equality; malformed objects and preflight. | Pallet count optimality is not proved by parity. |
| `/api/order-quote` | Three live grid/single/20-SKU cases; independent gross, height and conservation; mixed heavy/light + imperial parity locally. | F01 belongs to UI, not the handler; measured actuals/local display tested separately. |
| `/api/order-options` | Three live bounded searches; baseline and response equality; existing 200 seeded alternative checks; UI permitted 13→12 option. | Search completeness/optimality not asserted. |
| `/api/case-design` | Three live counts 1/6/12; independent product arrangement/outer dims/board mass/TI×HI; UI CSV and SVG evidence. | F08/F09 are view/state issues; no board-strength certification. |
| `/api/consolidate` | Three live 1/3/20-PO cases; conservation and supplied FCL/LCL cost arithmetic; UI JSON parity. | Loading sequence defect in shared exporter F06; LCL remains volume/cost only. |
| `/api/box-catalog` | Three live 1/6/60-unit cases; independent DIM=200kg for 100³cm box, weighted totals, costs; UI fit/unfit and exports. | Inner/outer dimensions, cushioning, tare and carrier rounding excluded and disclosed. |
| `/api/receiver-check` | Three live fixtures + three custom exact height boundaries locally; manual remains not_evaluated. | F10 partial-status precedence. |
| `/api/key` | Live GET only; `null`, `{}`, synthetic valid email in isolated KV; existing key/tier tests. | F15. Real issuance, paid provisioning and actual production throttling not exercised. |
| `/api/lead` | `null`, `{}`, valid synthetic email in isolated KV. | F15. No lead sent. POST-only GET fallback is an HTTP ergonomics concern, not proof POST is broken. |
| `/api/share` | Invalid/null/empty and valid synthetic shape in isolated KV; live no-ID 400. | Full saved-plan retrieval/render/approval lifecycle not audited here. |
| `/api/hit` | Three isolated payloads; origin validation/read of handler; no real tracking writes. | Production analytics ingestion/dedup/accounting not verified. |
| `/api/stats` | Three unauthorized isolated GETs, live 403 without authorization. | Authorized aggregation not independently verified; no production secret accessed. |

## What was verified correct

1. **Quote arithmetic, parity and conservation.** For 40×40×50 cm cartons at 10 kg on a 120×80 deck, 100cm cargo envelope, 25kg tare and 1kg wrap, quantities 1/12/13 require 1/1/2 pallets. Gross totals are **36/146/182kg**; 2cm allowance gives outer heights 67/117/117cm. UI and full JSON agree with the real handler; carrier CSV has the correct pallet-row count. Exact exported artifacts are `quote-{1,12,13}-*.json` and `.csv`.
2. **Mixed heavy/light physical fixture.** Six 20kg lower cartons with maxStack 5kg support six 5kg upper cartons with maxStack 0. All 12 placed, 176kg gross, 117cm outer height, cargo CoG **35cm above deck**, complete at the exact supplied limits. Equivalent inches/pounds preserve hash and pallet results. See [more-physical.json](audit-evidence/more-physical.json).
3. **Pallet build-sheet visualization.** 1/12/13-carton handoff yields the same number of step rows and unique SVG carton IDs; steps 0, 1 and all render exactly those counts. Pallet `buildSteps` is bottom-first. This is distinct from the defective container CSV/PDF ordering.
4. **Receiver boundary and actuals.** Predicted 65cm/35kg passes height 65 and 65.01, fails 64.99; gross 35 passes exactly. Manual label check remains `not_evaluated`. Imported/exported profile JSON agrees, local save works, measured 66cm/36kg produces +1cm/+1kg variance. [profiles.json](audit-evidence/profiles.json).
5. **Case geometry.** With 10cm cubic product, zero board/headspace, arrangements for 1/6/12 units obey `a×b×c=n` and outer sides `10a,10b,10c`. Estimated board mass agrees with disclosed 0.6kg/m² surface-area rule. Generated pallet count equals TI×HI; candidate SVG cargo counts match their plan. This confirms geometry, not corrugated strength.
6. **Consolidation.** UI examples conserve 11 and 22 eligible cartons; zero quantity produces a validation state. Independent handler fixtures conserve cargo across FCL/remainder and compute supplied `containers×1000 + max(remainderCBM,1)×100` when remainder exists. UI downloaded plan equals API output.
7. **Actual WebGL rendering.** Instrumented the renderer's draw scene, not React's planned count. Default consolidation's **22** cargo meshes match JSON geometry, centre-to-min-corner transforms and colours; green door plane is at +X (589/2). Default box-choice scene contains **2** cargo meshes; planner default **188** meshes inventoried. Only consolidation received full position/colour comparison; the latter two counts are not full scene certification. See `*-meshes.json` and [visuals-verified.json](audit-evidence/visuals-verified.json).
8. **Box estimates.** 1/2/60-unit UI histories preserve actual weight; fit and unfit are distinguished. Independent API fixtures verify actual weight, DIM weight, count-weighted totals, void-fill cost and box cost. UI catalog/per-order CSVs and request JSON are captured. Unfit orders explicitly remain estimated charges and are excluded from comparable savings.
9. **Legacy arithmetic.** CBM examples: 60×40×50cm×100 = 12m³; 24×16×20in×1 = 0.12585265152m³; 100³cm×1 = 1m³. EUR 40×30×30cm gives TI 8, HI 5, 40 cartons. Exact GMA 16×20×12in gives TI 6, HI 4, 24. Exact 120×80×165cm EUR case gives 1×1. DIM division, three truck aisle sums and three warehouse footprint/aisle/support-factor calculations agree with their stated arithmetic assumptions.
10. **Freight density boundaries.** 48×40×48in/500lb gives 9.375pcf/class 100; 1ft³/8lb is class 100; 1ft³/50lb is class 50. The boundary scale was checked against the [NMFTA primary FAQ](https://help.nmfta.org/hc/en-us/articles/38932132157979-NMFC-Changes-FAQ-Can-you-share-with-us-the-density-and-class-breaks-for-the-new-13-sub-structure). Commodity-specific caveat is visible.
11. **Honest unknown checks.** New tool outputs distinguish warn/fail/not_evaluated; missing costs, manual rules, axle loads, VGM and zone checks are not rendered as computed passes in sampled results. Receiver template absence is clearly disclosed. Case search is labelled bounded/heuristic, consolidation explicitly distinguishes FCL placement from LCL screening, box catalog lists missing carrier rounding/tare/outer-wall allowance.
12. **Initial route stability.** All 40 inventoried initial routes rendered without captured `pageerror`; this does not include resource failure certification. New case/consolidation/box/profile/build-sheet initial pages stay within 390px. Several older/shared pages and API docs overflow as F16 records.

## Persona walkthroughs and value

Timing is a qualitative assessment of the tested path, not a timed human usability study. Script page-render durations in `pages.json` include screenshots and keyboard checks and **must not be represented as time-to-first-useful-number**.

| Persona / primary task | Under a minute? What happened | Biggest return/payment improvement |
|---|---|---|
| VN export sales coordinator: quote LTL handling units | Yes for the supplied example and a small pasted order; result/CSV is useful. Many envelope/receiver fields require knowledge. Mobile SKU editor and stale exports threaten real use. | Make the quoted snapshot immutable and let customer-approved receiver profiles prefill clear units. |
| US DTC ops engineer: integrate API | A first anonymous synthetic call succeeds; live/local parity is strong. Copying the order page's curl fails; local preview verify cannot reach a real API; “four endpoints” text is stale. | One tested copy-paste request, documented limits/statuses and a measured-result integration example. |
| Forwarder: consolidate 3 POs | Multi-PO structure and container alternatives are useful; default UI begins with two POs and blank rates. Three-PO engine fixture succeeds. Cost needs supplied rates; output must not be treated as a booking. | CSV-first three-PO intake with ready-window, supplier grouping and explicit all-in cost inputs. |
| 3PL ops lead: choose a box | Default optimize/choose result is fast and fit/unfit clear. Candidate box JSON is a significant data-entry barrier. Internal dimensions used for billing can understate actual charges. | Spreadsheet catalog import with separate inner/outer dimensions and measured carrier billing replay. |
| Packaging coordinator: size a case | One click gives ranked options; bounded search and board assumptions visible before action. Overhang rendering and stale candidates undermine review. | Accurate physical deck visualization plus material/strength constraints and realistic case blank cost. |

Badge states in sampled new-tool outputs use text as well as colour, and `not_evaluated` has a distinct neutral treatment. No measured all-badge WCAG contrast certification was completed. Initial keyboard order was recorded; row-by-row focus tests and full keyboard-only persona tasks remain incomplete. Chinese copy is readable Traditional Chinese/Cantonese overall, but terminology varies (卡板/棧板; 外箱設計/裝箱設計), English assumptions remain, and the broken links are functional failures.

## Reusable checks and remaining coverage

The audit recorded **22 findings: 6 S1, 10 S2, 5 S3 and 1 S4**.

The new files are intentionally **not added to `npm test`**. Run from repository root; browser scripts use the already-running preview and never create a server. Known regression checks exit nonzero until the product defects are corrected.

```sh
node tests/audit-engine.mjs
node tests/audit-artifacts.mjs # after collecting browser artifacts
node tests/audit-more-physical.mjs
node tests/audit-pages.mjs
node tests/audit-calculators.mjs
node tests/audit-workflows.mjs
node tests/audit-profiles.mjs
node tests/audit-regressions.mjs
node tests/audit-legacy.mjs
node tests/audit-visuals.mjs
node tests/audit-locales.mjs
node tests/audit-interactive.mjs
node tests/audit-warehouse.mjs
node tests/audit-http.mjs
# Optional: 27 real calculation-only POSTs using synthetic fixtures:
node tests/audit-live-calculations.mjs
```

`AUDIT_FILTER` on workflows/calculators narrows reruns. API/regression tests retain exact input in evidence. Screenshots/text/JSON/CSV are under [audit-evidence/](audit-evidence/). `test-suite.log` and `typecheck.log` retain baseline validation output. Early locator/instrumentation failures were harness problems, not product findings; use [the evidence index](audit-evidence/INDEX.md) rather than interpreting every diagnostic image as a defect.

The original specification asks for more than this execution fully demonstrates. Outstanding items are explicit:

- Planner and pallet-height now have three small independent UI count fixtures ([interactive-final.json](audit-evidence/interactive-final.json)). Three warehouse quantity edits were exercised, but auto-arrange preserves the existing floor rather than rebuilding the palette: this exposes the F21 counter mismatch, not three independently validated complete warehouse layouts. Informational pages do not have calculation inputs; they received page/claim review instead.
- Not every candidate/animation frame, every view angle, every preset, every diagram coordinate/colour, or every manual drag/rotation was exhaustively verified. Pallet SVG counts/step samples and the consolidation WebGL scene received targeted checks; general screenshots are not proof of fidelity.
- CSV **cell-by-cell** parity passed for all captured quote, case and box catalog/per-order files (three fixtures each), including quoted strings and both reported unit columns: [artifacts-verified.json](audit-evidence/artifacts-verified.json). Consolidation packing CSV, planner gated exports and every locale/export variant still need equivalent coverage.
- Full invalid-input grids (empty/negative/text/10,000) across every new-tool control, 20-SKU UI import, all fractional quantities, and exact endpoint byte/rate-limit boundaries were not independently repeated. Existing tests cover several boundaries; independent probes found failures outside them.
- No signed-in `/plans`, real `/review/:id`, paid plan, real issued API key, production share round trip, authorized stats aggregation or persistent analytics accounting test was done. Auxiliary endpoints were tested with fake storage only. No secrets were read.
- No freight booking, warehouse build, material strength test, real labour timing, carrier invoice replay or buyer acceptance study was performed. These are needed to substantiate a paid operational accuracy claim.
- No comprehensive current vendor/tariff survey or complete English/Chinese sentence-by-sentence translation review. Official Amazon/NMFTA and two competitor pricing pages were sampled; numeric claims without traceable applicability are reported as unverified, not assigned invented replacement prices.

The report is complete as an audit artifact with the findings and limitations above; **the full specification's exhaustive coverage is not claimed complete**.
