# 01b — Pallet packer: add a "layered" strategy so obvious one-pallet loads are found

## Finding (verified 2026-09-11)
`QUOTE_EXAMPLE` without the TIN-GIFT-12 line = 24 × (40×30×25, 7.2 kg, maxStack 60)
+ 6 × (50×40×35, 11 kg, maxStack 20) on a GMA 121.92×101.6 pallet, base 14.5,
maxHeight 180, maxWeight 900. This fits on ONE pallet by hand (e.g. 3 columns
of teaware 2-high = 0.6 m² × 70 cm; tea 5 per layer × 5 layers = 125 cm on the
remaining 0.64 m²; or teaware on top of tea since tea maxStack 60 ≥ 22), yet
`estimatePallet` / `planOrder` return 2 pallets (21 + 9 cartons, 102.5 cm +
42.5 cm) under all three strategies and all orderings. The order-options
search therefore cannot find a one-pallet alternative that a crew would build
without thinking. This is the exact promise of spec 01, so it must be fixed in
the engine, not papered over.

## Task
1. Reproduce with a test first (`tests/pallet-estimate.mjs` or a new
   `tests/pallet-layered.mjs`): assert the case above yields `palletCount === 1`
   after your change, with every existing geometry invariant (no overlaps,
   in-bounds, ≥60% support, maxStack respected with propagation, keepUpright).
2. Add a fourth trial `strategy: 'layered'` in `src/lib/palletEstimate.ts`
   (and expose it in `PackingOptions`): group units by SKU footprint, build
   complete layers per SKU (like the TI-HI logic in `src/lib/pallets.ts`),
   stack heaviest/strongest SKU layers first, respecting maxStack via the
   existing propagation, then place any remainder with the existing
   Extreme-Point packer in the leftover space. Deterministic. Keep
   best-of-N selection semantics (`fewest unplaced, then lowest height`).
3. Do NOT change default results for inputs where the old strategies already
   place everything at a lower or equal height — `best-of` must still pick
   them. Run `node scripts/benchmark.mjs` if it covers pallets; otherwise
   state that it is container-only.
4. `npm run typecheck && npm test` green; existing 12 pallet-estimate checks,
   order-planning and order-options suites must still pass (update the
   order-options contrived case if the improved packer changes its numbers,
   but keep the property being tested).
5. Report in `docs/specs/01b-REPORT.md`: before/after pallet counts and
   heights for the case above and for `PALLET_EXAMPLE`, and any input where
   'layered' lost to another strategy (to show best-of still works).
Do not commit.
