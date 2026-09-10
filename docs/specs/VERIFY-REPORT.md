# VERIFY batch report — 2026-09-11

Verification is **not green**. The new tests expose real packing/unit defects and explicit differences from the requested response contract. One obvious, one-line gross-weight bug was fixed. Other failures remain executable assertions, not expected failures or skipped tests. No commit was made.

## Files changed

- `tests/verify-batch.mjs`: seeded adversarial tests, independent geometry/support/load and arithmetic oracles, reduced regression fixtures, and actual endpoint-handler tests.
- `package.json`: appended `tsx tests/verify-batch.mjs` to `npm test`.
- `tests/verify-ui.mjs`: standalone system-Chrome verification against port 4175, with public libraries executed in Node to produce the expected JSON/counts.
- `tests/e2e.mjs`: added a Node-library-to-DOM box-count regression before the `/zh` homepage test.
- `src/lib/orderQuote.ts`: the single production-line change described below.
- This report.

The pre-existing untracked `docs/specs/VERIFY-batch.md` and `node_modules` symlink were left in place. No dependencies, secrets, prerender script, deployment, or endpoint request/response shapes were changed.

## Executed checks

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed, both TypeScript projects |
| `npm test` | All 11 pre-existing test scripts passed; new adversarial script failed as intended on unresolved defects |
| Seeded library cases | 200 each for all six libraries: 1,200 total |
| Additional single-SKU TI×HI cases | 160 nonzero-capacity cases, all passed with explicit `strategy: 'layered'` |
| New property groups / regression checks | 5,954 executed; 5,147 passed, 807 failed |
| New endpoint checks | 24/24 passed: 200/400/413/415 for all six handlers |
| `npx vite build` | Passed after the production fix; SPA only, no prerender |
| `node tests/verify-ui.mjs` | 4/4 pages passed on the final fresh build; no console or page errors |
| `git diff --check`, JS syntax checks | Passed |

The 807 failures are repeated manifestations of the issues below, **not 807 distinct bugs**. Counts are property groups, each potentially containing many assertions. Existing reported suite counts include 45 unit tests, 15 pallet checks, 17 options checks, 13 case-design checks, 13 consolidation tests, and 14 catalog checks; other existing scripts report aggregate success without an assertion count.

Seed: `0x51a7b00c` / `1369944076`. The local LCG uses multiplier 1664525 and increment 1013904223 with unsigned 32-bit state. Reproduce and optionally capture every failing request:

```sh
VERIFY_RESULTS=/tmp/verify-batch-results.json npx tsx tests/verify-batch.mjs
npm run typecheck && npm test
npx vite build
npx vite preview --host 127.0.0.1 --port 4175
# In another terminal:
VERIFY_UI_RESULTS=/tmp/verify-ui-results.json node tests/verify-ui.mjs
```

The optional UI JSON includes the actual Node requests/results used as the expected plans. Tests do not obtain expected counts from UI summary text or `data-carton-count` attributes. Test logs and generated diagnostic JSON were kept under `/tmp`, not added as large repository artifacts.

## Failures and minimal repros

### 1. Real packing bug: adding a new supporter does not update an existing stack

**Left for author.** Reproduced through both `estimatePallet(request)` and `quoteOrder(request)`. Also encountered in a random quote and the corresponding order-options baseline.

```json
{
  "pallet": {"l":60,"w":60,"baseHeight":10,"maxHeight":50,"maxWeight":150},
  "items": [
    {"sku":"A","label":"A","l":10,"w":30,"h":50,"weight":14,"qty":1,"keepUpright":false,"maxStack":0},
    {"sku":"B","label":"B","l":50,"w":10,"h":50,"weight":8,"qty":1,"keepUpright":false,"maxStack":0},
    {"sku":"C","label":"C","l":30,"w":30,"h":20,"weight":4,"qty":3,"keepUpright":false}
  ],
  "maxPallets":1
}
```

This five-carton repro was reduced by removing optional receiver/packaging fields, trying removal of each item type, reducing quantities, and reducing maxPallets. Removing any item type or further reducing its quantity eliminates this particular result.

The returned quote is `complete`. In its final geometry:

| Cargo | Position x/y/z | Oriented L/W/H | Weight |
| --- | --- | --- | --- |
| C #1 | 0/0/0 | 30/20/30 | 4 |
| C #2 | 30/0/0 | 30/20/30 | 4 |
| C #3 | 0/0/20 | 30/20/30 | 4 |
| B | 0/30/0 | 50/50/10 | 8 |
| A | 0/0/40 | 50/10/30 | 14 |

B ultimately touches four supporters, including A. Recomputed equal-share load is **8 / 4 = 2 kg on A**, whose `maxStack` is zero. The seeded larger fixture instead yields 1.6 kg on a zero-limit carton.

`binPacking.ts` records supporters when committing a box. It can subsequently fill space underneath that box, but does not rebuild the already-placed box's supporter list and propagate its load through the new support graph. This requires a packing-policy or graph-update change, not a safe one-line correction. The isolated layered randomized cases passed; the reduced regression specifically exercises the default best-of strategy.

### 2. Real identity bug: quote and options hashes depend on floating-point unit round trips

**Left for author.** 200/200 seeded quote hashes and 200/200 options hashes differed. Numeric physical results matched within 1e-6 in those fixtures.

```json
{
  "pallet":{"l":60,"w":60,"baseHeight":10,"maxHeight":50,"maxWeight":150},
  "items":[{"sku":"A","l":10,"w":10,"h":10,"qty":1,"weight":1}],
  "maxPallets":1,
  "packagingAllowance":{"height":2}
}
```

Call `quoteOrder` on this metric input and its imperial equivalent: divide all supplied lengths by 2.54, all supplied weights by 0.45359237, and set `units: "in-lb"`. Keep quantities and monetary inputs unchanged. The 2 cm allowance round-trips to `1.9999999999999998`; the raw canonical JSON differs and so does SHA-256. For `findOrderOptions`, add `searchBudget: 1` to the same pair; its input identity inherits the quote hash difference.

Canonicalization and version/identity expectations need an author decision; no hashing code was changed.

### 3. Real identity bug: consolidation weight round trips change the hash

**Left for author.** 21/200 seeded cases failed hash equality; numeric results passed within tolerance.

```json
{
  "pos":[{"poId":"A","items":[{"sku":"A","l":100,"w":100,"h":100,"weight":15,"qty":1}]}],
  "containers":[{"preset":"20gp","maxCount":1}]
}
```

Convert the item dimensions/weight as above and call `consolidate` on both inputs. The weight converts back to `14.999999999999998`, producing a different hash. The parser and hashing path do not normalize this conversion noise.

### 4. Real unit-invariance bug: box-catalog grid changes identity and generated physical dimensions

**Left for author.** All 200 seeded explicit-candidate inputs failed hash equality. The additional generated-candidate fixture failed both hash equality and physical dimension equality.

Minimal explicit-candidate hash repro:

```json
{
  "skus":[{"sku":"A","l":10,"w":10,"h":10,"weight":1}],
  "orders":[{"lines":[{"sku":"A","qty":1}]}],
  "candidateBoxes":[{"id":"B","l":10,"w":10,"h":10}],
  "catalogSize":1,
  "billing":{"unit":"cm-kg","dimDivisor":5000}
}
```

Convert input SKU/box dimensions and weight, set top-level `units: "in-lb"`, and **leave billing unchanged**: billing has its own explicit unit system. `parseBoxCatalog` includes `grid: 1` for metric inputs and `grid: 1.27` for imperial inputs in the hashed payload, even when explicit candidate boxes make grid generation irrelevant.

Remove `candidateBoxes` from that input to reproduce the physical result difference: metric generation selects **10×10×10 cm**; the same imperial product generates **10.16×10.16×10.16 cm**. This also changes dimensional weight and void-fill metrics. Normalizing float noise alone cannot fix this grid-policy difference.

### 5. Legacy API gaps against the requested conventions: pallet identity and units

**Left for author; classified as contract gaps, not a newly introduced layered packing regression.** Two explicit regression checks fail.

```json
{
  "pallet":{"l":60,"w":60,"baseHeight":10,"maxHeight":50,"maxWeight":150},
  "items":[{"sku":"A","label":"A","l":10,"w":10,"h":10,"qty":1,"weight":1,"keepUpright":true}],
  "maxPallets":1
}
```

`estimatePallet` returns `version`, but no `engineVersion` or SHA-256 `inputHash`. Its public request type is cm/kg only. An otherwise identical request converted to imperial with top-level `units: "in-lb"` is accepted as an unknown extra field and interpreted as cm/kg: a 10 cm box is returned as **3.937007874 cm**.

The batch/conventions request unit equivalence and identity for all these libraries, but this legacy contract does not implement either. Extending it requires more than one line and potentially an async/API compatibility decision. The tests expose the mismatch rather than pretending that hashing or unit conversion was exercised successfully for this library.

### 6. Response-status gaps: failed checks lack `partial` / `needs_review`

**Left for author; classified as literal VERIFY status-contract mismatches.** These responses already disclose remainder/unfit information. This is not a finding of cargo silently disappearing.

Consolidation minimal repro:

```json
{
  "pos":[{"poId":"A","items":[{"sku":"A","l":100,"w":100,"h":230,"weight":1,"qty":1,"keepUpright":true}]}],
  "containers":[{"preset":"20gp","maxCount":1}]
}
```

The 230 cm upright carton cannot pass the 228 cm door. Its quantity is correctly retained in remainder and `ALL_CARGO_PLACED` is `fail`, but neither the result nor plan sets `status: "partial"` or `"needs_review"`. The result uses an `outcome` field instead. 60 seeded consolidation cases failed this requirement.

Box-catalog minimal repro:

```json
{
  "skus":[{"sku":"A","l":20,"w":20,"h":20,"weight":1}],
  "orders":[{"lines":[{"sku":"A","qty":1}]}],
  "candidateBoxes":[{"id":"B","l":10,"w":10,"h":10}],
  "catalogSize":1,
  "billing":{"unit":"cm-kg","dimDivisor":5000}
}
```

The response correctly reports an unfit order and `ALL_ORDERS_FIT: fail`, but has no overall `partial`/`needs_review` status. 118 seeded catalog cases failed this requirement. The author should reconcile the requested common status contract with these explicit existing result schemas.

### 7. Fixed real bug: known gross-weight excess was downgraded to a warning when tare was missing

Minimal repro:

```json
{
  "pallet":{"l":60,"w":60,"baseHeight":10,"maxHeight":50,"maxWeight":150},
  "items":[{"sku":"A","label":"A","l":10,"w":10,"h":10,"qty":1,"weight":1,"keepUpright":true}],
  "maxPallets":1,
  "limits":{"maxGrossWeight":1},
  "packagingAllowance":{"weight":2}
}
```

Before: known gross contribution is 3 kg against a 1 kg cap, but missing tare yielded `GROSS_WEIGHT: warn` and `status: complete`. Unknown nonnegative tare cannot make this load lighter.

After: `GROSS_WEIGHT: fail`, `status: needs_review`. The only production edit is `src/lib/orderQuote.ts`, changing the condition order on the check's `status` line:

```ts
status: grossWeight > limits.maxGrossWeight + 1e-6 ? 'fail' : tare === undefined ? 'warn' : 'pass',
```

Missing tare remains a warning when the known weight is below the ceiling. Both the existing missing-tare test and the new known-excess regression pass. No response fields or contracts were removed.

## Failure-count reconciliation

| Failing property group | Final failures |
| --- | ---: |
| Quote unit hash | 200 |
| Options unit hash | 200 |
| Quote seeded geometry/stack | 1 |
| Options seeded baseline stack | 1 |
| Consolidation failure status contract | 60 |
| Consolidation unit hash | 21 |
| Catalog failure status contract | 118 |
| Catalog unit hash, including generated fixture | 201 |
| Reduced quote late-support stack | 1 |
| Reduced pallet-estimate late-support stack | 1 |
| Pallet identity fields | 1 |
| Pallet imperial physical equivalence | 1 |
| Catalog generated cm results | 1 |
| **Total** | **807** |

## Browser / animation evidence

System Chrome was launched by Playwright with `channel: 'chrome'`, headless, against `http://127.0.0.1:4175` served by Vite preview. The build was regenerated after the one-line production fix. No live endpoints were called by the tests.

| Page / path | Node plan counts compared to DOM | Result |
| --- | --- | --- |
| `/order-quote`, options build | One alternative, four pallets: **6, 4, 4, 2** cartons | Passed |
| `/case-designer`, selected details | Five candidate pallet views: **6, 6, 4, 4, 4** cases | Passed |
| `/consolidation`, container 3D | One returned plan/container: **20** cartons; its remaining 2 cartons stay explicit in the Node result | Passed |
| `/box-catalog`, single-order 3D | **2** units | Passed |

For all nine PalletEstimateView instances, checked initial count, unique SVG cargo IDs, steps `{1, ceil(n/2), n}` (26 distinct checkpoints), and real playback from zero through the final step. The tests press **Play steps**, verify the reset to zero, wait for the real 900 ms step timer, then assert both the output count and actual SVG cargo count equal the Node plan. They do not use fake clocks or Show-all to complete playback.

Every page had zero `console.error` messages and zero uncaught page errors. The UI suite serializes Node plans into optional JSON evidence, allowing the tested inputs/results to be inspected independently of the DOM.

## Requirement coverage and boundaries

- Conservation is per SKU, including zero-quantity options, catalog all-or-nothing unfit results, consolidation remainder and explicitly skipped POs. Case-design product factorisations and tested case supply are checked separately from customer-order quantities.
- Geometry uses independent 3D AABB intersection and bounds checks, recomputed footprint support area, orientation/dimension checks, and recursive equal-share propagation along every final support path. Deliberately invalid geometry fixtures verify that the oracle rejects overlap, floating boxes, bounds, upright changes, and recursive overload.
- Pallet envelopes/payloads and receiver checks are audited from placement dimensions/weights, not rounded summaries. Consolidation uses preset payload/door geometry. Case pallet/container counts, weight caps and door checks are recomputed.
- Case-design does not return floor-container placements. Floor capacity is therefore reproduced through its public packing dependency and then independently checked for geometry/support/conservation; pallet geometry is checked via the public `casePalletView` helper. This is weaker than auditing placements returned by `designCases` itself, because those fields do not exist.
- Optional-input check presence/status is tested for receiver height/gross limits, case constraints/pallet/costs, catalog rates, shipment windows/rates, and absent axle/zone inputs. A missing approved VGM method is not treated as supplied merely because a container preset has tare. Empty-plan geometry/CoG checks have no observations to evaluate.
- Every library is called twice on each random input with deep result equality. Unit-pair numeric comparisons allow 1e-6 and exclude identity/request-unit/check prose fields; hashes are compared separately without tolerance. Pallet's unsupported unit/identity contract is an explicit failing regression, not silently skipped.
- Independent arithmetic covers options net savings, catalog actual/DIM/minimum billed weights and weighted order totals/costs, consolidation FCL/LCL/per-unit cost, and case board/handling/freight cost per unit.
- Monotonicity checks cover maxPallets, larger catalog boxes for a fitting order, and coverageFirst catalogSize. All passed in this seed. Search is heuristic; this is sampled evidence, not a universal proof.
- Options permissions are anchored at the **current quantity**, as the library explicitly declares, not at minQty. All alternatives are checked for permitted ranges/steps, locked SKUs, quantities, conservation, pallet counts and economics; `found` requires alternatives.
- All 160 nonzero TI×HI fixtures fit within the estimator's 200-carton public cap. Weight limits use whole TI layers, matching the declared TI×HI capacity, rather than assuming a partial extra layer.
- Existing validation suites supply the detailed every-field/status-branch coverage; all passed. The new runner adds seeded/adversarial tests and 24 endpoint status/field checks rather than duplicating those validation tables.
- The standalone UI suite was run; the entire unrelated `tests/e2e.mjs` suite was not run. The new e2e regression mirrors the independently executed single-order UI flow.
- No author fixes beyond the single obvious status-line change were attempted. Consequently the generic conventions request to finish with green tests could not be met while also obeying VERIFY's more specific instruction to preserve nontrivial defects for the author.

## Test mistakes corrected

- A syntax error in the initial test runner was fixed before its first completed run; it was not a product failure.
- The first completed run reported 17 options assertion failures, 16 caused solely by strict comparison of JavaScript `-0` and `0` after the remainder operator. Changed the step assertion to numerical `=== 0`, which correctly accepts both. The one remaining options failure is the independently reproduced baseline stack-load bug.
- Unit conversion deliberately keeps `billing.unit`, divisor/minimum/rate and economics unchanged. Changing those without physically equivalent billing conversion would test a different tariff, not equivalent input units.
- No unresolved real defect was converted into an expected failure, caught-and-ignored assertion, or skipped test.
