# 02 — Case-to-pallet/container designer: /case-designer + /api/case-design

## Outcome sold
An exporter/manufacturer has a product (unit dims, weight, units per case
target or range) and a destination (pallet spec and/or container). Propose
case (shipcase) dimensions and pack arrangement that maximise **delivered
cost per sellable unit** — not fill alone — and show the resulting TI-HI,
pallet fill, container fill and units per container. This is the TOPS Pro /
Cape Pack core loop, simplified for exporters. Buyer: export manager /
packaging coordinator at a VN/IN/ID/TR factory. Dollar event: a container
that ships 8–15% fewer units than it could.

## Library `src/lib/caseDesign.ts` (pure)
```ts
export interface CaseDesignRequest {
  units?: 'cm-kg' | 'in-lb';
  product: { l: number; w: number; h: number; weight: number; keepUpright?: boolean; label?: string };
  unitsPerCase: { min: number; max: number } | number;   // range to explore, or fixed
  caseConstraints?: {
    maxWeight?: number;                // e.g. 20 kg manual-handling ceiling
    maxDim?: number;                   // longest side cap
    boardThickness?: number;           // cm added per side, default 0.4
    headspace?: number;                // cm added to height, default 0.5
    allowedOrientations?: 'any' | 'upright';   // product orientation inside the case
  };
  pallet?: { l: number; w: number; baseHeight: number; maxHeight: number; maxWeight: number; overhang?: number };
  container?: { preset?: '20gp'|'40gp'|'40hq'; l?: number; w?: number; h?: number; maxWeight?: number };
  costs?: {                            // all optional; when absent, rank by units per container then fill
    boardCostPerM2?: number;           // corrugated cost
    freightPerContainer?: number;
    freightPerPallet?: number;
    handlingPerCase?: number;
    currency?: string;
  };
  candidates?: number;                 // max designs to return, default 5, max 10
}
export async function designCases(input: unknown): Promise<CaseDesignResult>
```
Algorithm (deterministic, bounded):
1. For each `unitsPerCase` n in range (cap 24 values; if range wider, sample
   evenly incl. min/max), enumerate factorisations n = a×b×c (a,b,c ≥1)
   and for each, the 6 (or 2 when upright) product orientations →
   case inner dims = a·d1, b·d2, c·d3 + board + headspace. Dedupe by
   outer dims rounded to 0.1 cm. Cap enumeration at 400 cases total.
2. For each case: weight = n·w + board mass estimate (area × 0.6 kg/m²
   default, documented as an assumption). Reject if over `maxWeight` /
   `maxDim`.
3. Pallet layer fit via existing `src/lib/pallets.ts` (perLayer / floorFit
   as used by /pallet-calculator and /ti-hi-calculator) → TI, HI (capped by
   maxHeight and maxWeight), cases per pallet, pallet cube utilisation.
   If `pallet.overhang` given, allow it via the same rule the planner uses.
4. Container fit: if `pallet` given → pallets per container via the
   existing `pallets-per-container` logic (mixed-orientation floorFit,
   double-stack by loaded height + payload); units per container =
   pallets × cases/pallet × n. Else floor-load cases via
   `packContainer` with one spec (qty large, capped 2,000) and count.
5. Score: if costs given → delivered cost per unit = (board cost +
   handling + freight share) / units; else units per container desc, then
   pallet fill desc. Return top `candidates`.
Response per candidate:
```ts
{ id, unitsPerCase, arrangement: {a,b,c, orientation}, caseOuter: {l,w,h}{cm,in},
  caseWeight: {kg,lb}, pallet?: { ti, hi, casesPerPallet, unitsPerPallet, loadedHeight, cargoWeight, cubeUtilPct, layerDiagram: {rows, cols, orientation} },
  container?: { palletsPerContainer?, casesPerContainer, unitsPerContainer, volumeUtilPct },
  costPerUnit?: {value, currency, breakdown}, checks: Check[], assumptions: string[] }
```
Order-level `checks[]`: CASE_WEIGHT (vs maxWeight), CASE_DIM, PALLET_HEIGHT
(vs maxHeight), PALLET_PAYLOAD, BOARD_MASS_ASSUMED (warn: estimated),
COST_INPUTS_PROVIDED (not_evaluated when absent). Plus `engineVersion`,
`inputHash`, `semantics`, `notes: ['GEOMETRY_ONLY_NOT_STRUCTURAL_DESIGN', 'BEST_OPTIONS_FOUND_NOT_OPTIMUM']`.

## Endpoint `functions/api/case-design.ts` — 10/min, 100/day anon; 32 KB.

## Page `/case-designer` (+zh) `src/pages/CaseDesignerPage.tsx`
- Inputs in two columns: product + units/case range + case constraints;
  pallet preset chips (EUR/GMA/Industrial/custom) + container preset +
  optional costs. Units toggle.
- "Design cases" → table of candidates: units/case, arrangement (a×b×c),
  case outer L×W×H, case weight, TI×HI, cases/pallet, units/pallet,
  pallet fill %, pallets/container, **units/container** (bold), cost/unit
  when given. Row click → detail: `LayerDiagram` (existing component) for
  the pallet layer, and a 3D view: build a `PalletEstimate`-shaped result
  for the chosen case on the pallet (use `estimatePallet` with one item)
  and render `PalletEstimateView` (with step animation);
  `data-testid="design-placed-count"` must equal casesPerPallet.
- Compare band: baseline row = the user's current case (optional input
  "my current case L×W×H, units/case") so the page shows "+N units per
  container vs today".
- Downloads: candidates CSV, API request JSON; curl block; CTA to
  /order-quote and /ti-hi-calculator; note that structural (ECT/BCT) design
  is out of scope with a link to the McKee helper in the planner.
- Prominent limits + assumptions box (board mass, headspace, no
  interlocking patterns — column stack only).
- Track: `tool_case_design`, `case_design_run` (n candidates), `case_design_csv`.

## Tests `tests/case-design.mjs`
Enumeration covers all factorisations for n=12 (a×b×c count), dedupe,
weight/dim rejection, TI-HI equals /ti-hi-calculator's function for the
same case, units/container conservation (pallets × cases × n), cost
ranking flips a geometric winner when board cost dominates, determinism,
validation per field, endpoint codes. e2e: page renders, run with
defaults, ≥1 candidate row, open detail, `design-placed-count` equals the
row's cases/pallet.
