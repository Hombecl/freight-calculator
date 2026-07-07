# DimPack3D — Self-QA Runbook

_QA is owned by the AI/maintainer, not the user. Three layers, run in this
order; a deploy is DONE only when all three are green. Last updated 2026-07-05._

## Layer 1 — Unit (engines) · `npm test` · ~5s
16 assertions over the pure engines: bin-packing invariants (no overlaps,
fragile, LIFO, CoG), import parser (EN/ZH headers, units, fallbacks),
warehouse (4 dock edges, sealed-aisle, multi-dock rescue, zones, double-stack,
capacity, placement), answers grid math. Run on every change to `src/lib/*`.

## Layer 2 — E2E behaviour · `node tests/e2e.mjs <url>` · ~2min
30 Playwright checks driving real Chrome: every page, every primary flow, and
**regression tests written from real bug reports** — drag persists across the
8s idle re-render (the prop-identity reset bug), 3-step undo, auto-arrange
never deletes. Live runs add share round-trips, `/api/pack` and analytics.
Run locally before every deploy (`http://localhost:4174` after `build:spa` +
`vite preview`), and against `https://dimpack3d.com` after every deploy.
CI (`.github/workflows/ci.yml`) runs unit + build + local E2E on each push.

## Layer 3 — Visual review · `node tests/visual.mjs <url> <outDir>` · ~3min + review
Captures ~23 screenshots of key STATES (desktop + mobile 390px): hero/tabs,
planner default/import/preview/imported/pallet-vessel/export-gate, warehouse
tutorial/default/route/3PL/arranged/PDF-popup, api-docs, answers, /zh, /plans.
**Then LOOK at every image** — this layer exists because layer 2 passed while
drags were visually snapping back. Check: does the 3D look right, are counts
plausible, do messages match reality, is anything clipped/overlapping (esp.
mobile), does the PDF render?

Findings log pattern (from the 2026-07-05 pass):
- 3PL example silently dropped all GMA pallets (rows ran out of floor) → data fixed
- auto-arrange could strand racks red with no warning → post-arrange reach check + message
- "0.0 m from the dock" cosmetic → "right at the dock"

## Deploy checklist
```
npm test                                   # unit green
npm run build:spa && (vite preview &) && node tests/e2e.mjs http://localhost:4174
npm run build && wrangler pages deploy     # full prerender build
sleep 45                                   # ⛔ edge propagation — testing at +6s once
                                           #    produced 16 phantom failures (mixed
                                           #    old/new assets); wait, then test
node tests/e2e.mjs https://dimpack3d.com   # live green (30/30)
node tests/visual.mjs && review the images # look at it
node scripts/indexnow.mjs                  # tell the AI engines
```
⛔ Never skip the LOCAL e2e step to save time — deploying untested code and
discovering it live is exactly the failure mode this runbook exists to prevent.

## Known-good baselines
- unit 27/27 · local E2E 33/33 · live E2E 38/38 · visual pass 2026-07-05
- engine benchmark: 80.2% avg fill on Bischoff–Ratcliff (300 instances) — `npx tsx scripts/benchmark.mjs`
- perf: hero pack 280 boxes ≈136ms · /api/pack 60 boxes ≈41ms · prerender 344 snapshots ≈5min
