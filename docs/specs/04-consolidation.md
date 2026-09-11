# 04 — Multi-PO container consolidation: /consolidation + /api/consolidate

## Outcome sold
A forwarder or importer with several POs from different factories (same
origin region, one destination) decides: which POs go together, in which
container mix (20GP / 40GP / 40HQ), and whether any remainder should go
LCL — with the feasible 3D load for every container and cost per unit
when the user supplies their quotes. Buyer: export operations manager at
a forwarder / import manager at a brand. Dollar event: an extra container
or an LCL surcharge discovered after booking.

## Library `src/lib/consolidation.ts` (pure)
```ts
export interface ConsolidationRequest {
  units?: 'cm-kg' | 'in-lb';
  pos: Array<{
    poId: string; supplier?: string; readyDate?: string;   // ISO date
    priority?: number;                                     // 1 = must ship this window
    items: Array<{ sku?: string; label?: string; l: number; w: number; h: number; qty: number; weight: number;
                   keepUpright?: boolean; maxStack?: number; fragile?: boolean }>;
  }>;
  window?: { from?: string; to?: string };                 // only POs with readyDate inside are eligible
  containers: Array<{ preset: '20gp'|'40gp'|'40hq'; maxCount?: number; ratePerContainer?: number }>;
  lcl?: { ratePerCbm?: number; minCbm?: number };          // optional LCL fallback economics
  rules?: { keepPoTogether?: boolean; maxSuppliersPerContainer?: number; unloadOrderByPo?: boolean };
  searchBudget?: number;                                   // container packing runs, default 40, max 120
}
export async function consolidate(input: unknown): Promise<ConsolidationResult>
```
Algorithm (bounded, deterministic — this is a heuristic, say so):
1. Filter eligible POs by window; cargo total CBM + weight.
2. Candidate container mixes: enumerate combinations of the allowed
   presets whose total volume ≥ cargo volume / 0.85 and ≤ cargo volume /
   0.55, capped by `maxCount`, at most 12 mixes, cheapest (by rate, else
   fewest containers) first.
3. For each mix: assign POs to containers greedily by priority then
   readyDate then volume (first-fit-decreasing), respecting
   `keepPoTogether` (a PO's items go to one container when possible) and
   `maxSuppliersPerContainer`; pack each container with
   `packWithConstraints` (group = poId; unloadOrder from PO order when
   `unloadOrderByPo`). Items that do not fit roll to the next container in
   the mix; leftovers after the mix → `remainder`.
4. Score: all cargo placed → total cost (containers + LCL for remainder if
   `lcl` given) asc, else fewest containers, then highest avg utilisation.
   Return top 3 plans.
Response:
```ts
{ engineVersion, inputHash, eligible: { poIds, skipped: [{poId, reason}] },
  cargo: { cartons, cbm, weight:{kg,lb} },
  plans: Array<{ id, containers: Array<{ preset, index, pos: string[], cartons, volumeUtilPct, weight, boxes, zones, checks: Check[] /* from containerChecks with preset door/tare */ }>,
                 remainder: { cartons, cbm, byPo }, lcl?: { cbm, cost },
                 cost?: { containers, lcl, total, perUnit, currency } | null,
                 checks: Check[] /* ALL_CARGO_PLACED, PO_TOGETHER (warn when split), WINDOW_RESPECTED, RATES_PROVIDED */,
                 candidateHash }>,
  outcome: 'found' | 'none_fit_budget', searched: {mixes, packs, budget}, semantics, notes }
```

## Endpoint `functions/api/consolidate.ts` — 5/min, 50/day anon; 64 KB body; ≤ 30 POs, ≤ 60 item types, ≤ 3,000 cartons total.

## Page `/consolidation` (+zh) `src/pages/ConsolidationPage.tsx`
- PO table (add PO → supplier, ready date, priority, paste/upload carton
  rows via `importCartons`), window picker, container presets with
  optional rates + max count, LCL rate, rules toggles, units.
- "Plan consolidation" → up to 3 plan cards: containers (preset, POs
  inside, cartons, util %, weight, check badges), remainder + LCL, cost
  per unit when rates given. Click a container → `InteractiveLoadPlanner`
  read-only 3D of that container (boxes coloured by PO, legend) —
  `data-testid="container-placed-count"` must equal `cartons`.
- Downloads: plan JSON, per-container CSV packing lists (existing
  `exportPlan.ts` CSV format if reusable), API request JSON, curl.
- Notes box: heuristic, not a booking; rates are yours; origin/destination
  charges and cut-offs not modelled unless entered.
- Track: `tool_consolidation`, `consolidation_run` (outcome).

## Tests `tests/consolidation.mjs`
Conservation (placed + remainder == requested for every plan), window
filter with skipped reasons, keepPoTogether respected when feasible and
warned when not, cost ranking picks 1×40HQ over 2×20GP when cheaper and
feasible, remainder → LCL cost math, no-overlap and in-bounds for every
container, determinism, limits/validation, endpoint codes. e2e: page with
two example POs plans ≥1 container, opening the 3D shows placed count
equal to the card.
