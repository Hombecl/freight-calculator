# FIX — resolve VERIFY-REPORT findings (docs/specs/VERIFY-REPORT.md)

Make `npx tsx tests/verify-batch.mjs` green WITHOUT weakening any assertion,
except where this file explicitly changes the contract. Read the report
first; every item below references its section.

## F1 (§1) REAL packing bug — late supporter must update load propagation
In `src/lib/binPacking.ts`, when a box is committed underneath an already
placed box (its top touches the placed box's bottom and footprints
overlap), the placed box's supporter set must be rebuilt and its load
re-propagated (equal share across ALL current supporters, recursively).
If re-propagation would exceed any supporter's maxStack, the new box must
NOT be committed there (treat the position as infeasible and continue).
Add the report's 5-carton repro as a fixed regression in
`tests/pallet-estimate.mjs` asserting, from the returned placements and an
independent equal-share oracle, that no carton bears more than its
maxStack. Re-run `node scripts/benchmark.mjs` and report the average fill
before/after (must not drop more than 0.5 points; if it does, say so and
stop — do not trade correctness for fill, but flag it).

## F2 (§2, §3, §4) inputHash must be unit-invariant
Canonicalise every number in the hashed payload with
`Number(n.toFixed(6))` (cm/kg canonical values) in `orderQuote.ts`,
`orderOptions.ts`, `consolidation.ts`, `boxCatalog.ts`, `caseDesign.ts`
(one shared helper in `src/lib/hashing.ts`, e.g. `canonicalJson(obj)` that
walks objects/arrays, rounds numbers to 6 dp, sorts object keys). Box
catalog: the generated-candidate grid is ALWAYS 1 cm in canonical space
regardless of request units (document that imperial candidates are
generated on a 1 cm grid and returned in both units); remove `grid` from
the hashed payload. Update the verify tests only where they encoded the
old grid behaviour (none should need change).

## F3 (§6) common status field
Add top-level `status` to consolidation results: `'complete'` when every
eligible carton is placed in a container, `'partial'` otherwise; each plan
gets the same field. Box catalog: `status: 'complete'` when
`unfitOrders === 0`, `'partial'` otherwise. Keep existing `outcome` fields.

## F4 (§5) legacy pallet-estimate / order-plan contract
Do NOT add units/hash to `estimatePallet` (sync legacy API). Instead make
`parsePalletRequest` REJECT a top-level `units` field with
`PalletInputError('units', 'this endpoint is cm/kg only; use /api/order-quote for units')`
so imperial input is never silently misread. Update the verify test that
sends imperial to `estimatePallet` to expect that error; keep the
identity-field check as a documented legacy exception (assert `version`
exists, not `inputHash`). State this in /api-docs for both endpoints.

## F5 keep the §7 one-line GROSS_WEIGHT fix (already merged).

Finish: `npm run typecheck && npm test` (now includes verify-batch) green.
Report `docs/specs/FIX-REPORT.md` with benchmark before/after numbers.
Do not commit.
