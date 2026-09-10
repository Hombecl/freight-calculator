# 05b — Box catalog: coverage first, then billed weight

## Finding (verified 2026-09-11)
With 3 SKUs / 3 order shapes (counts 500/300/200), `currentBoxes` = one
45×35×30 box and `catalogSize: 2`, the optimizer returned a catalog that
leaves the 200-count order shape **unfit** (ALL_ORDERS_FIT: fail) while
claiming 84% billed-weight savings — because unfit orders are charged at
the largest candidate, which is still cheaper than the baseline box. A
shipper cannot ship 20% of orders in "no box"; the number is not a saving
they can realise. The generated pool did contain a box that fits that
shape.

## Task
1. Objective becomes lexicographic: (a) maximise the count-weighted share
   of orders that fit at least one catalog box; (b) then minimise billed
   weight / cost. Greedy selection and swaps must use this order. If the
   pool cannot cover every order within `catalogSize`, the result still
   reports the best coverage found and `ALL_ORDERS_FIT: fail` with the
   unfit share and a note `COVERAGE_LIMITED_BY_CATALOG_SIZE`.
2. Unfit orders are NOT included in `savings`; report savings only over
   orders that fit in both baseline and new catalog, and state
   `savings.basisOrders` (count) and `savings.excludedUnfit` (count).
   When `unfitOrders > 0`, `savings` carries `partial: true`.
3. When no `currentBoxes` are given, `baseline` is omitted and `savings`
   is omitted (do not compare against nothing).
4. Add a `coverageFirst: boolean` request field defaulting to `true`;
   `false` restores the pure billed-weight objective (documented as
   "for analysis only").
5. Tests: the finding above must now produce a catalog that fits all three
   shapes with `catalogSize: 2` (verify a 2-box cover exists in the pool:
   e.g. 20×15×10 for A-only and a box ≥ the o2/o3 bounding needs), and a
   case where no 2-box cover exists returns `partial: true` savings.
6. Page: show the unfit share prominently ("N% of orders would need a box
   outside this catalog") and the coverageFirst toggle under "Advanced".
7. `npm run typecheck && npm test` green; write `docs/specs/05b-REPORT.md`.
Do not commit.
