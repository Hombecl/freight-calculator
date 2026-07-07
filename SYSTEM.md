# DimPack3D — Complete System Map

_The full production inventory: every module, every feature, its status._
_Legend: ✅ shipped · 🔨 building now · 🗺 roadmap (ordered) · Last updated 2026-07-07._

## 1. Core engines (pure TypeScript, testable, API-ready)

| Feature | Status | Where |
|---|---|---|
| 3D bin-packing (Extreme-Point, mixed cartons) | ✅ | `lib/binPacking.ts` |
| Weight & payload limits, per-carton max-stack w/ load propagation | ✅ | " |
| ≥60% base support, full AABB collision | ✅ | " |
| Fragile (no-stack), this-way-up, keep-together groups | ✅ | " |
| Multi-stop unload-order LIFO zones | ✅ | " |
| Centre-of-gravity + balance warning | ✅ | " |
| Single-SKU orientation-grid math (answers pages) | ✅ | `lib/answers.ts` |
| Warehouse auto-arrange (rows + aisles + dock strip) | ✅ | `lib/warehouse.ts` |
| Forklift reachability (erode + flood-fill from dock) | ✅ | " |
| Forklift shortest route + clearance band | ✅ | " |
| Obstacles (walls/columns/office) in reachability | ✅ | " |
| Dock edge selection (multi-dock, any of 4 edges) | ✅ | " |
| Rack levels → pallet-position capacity | ✅ | " |
| Pallet double-stacking on floor | ✅ | |
| **Turn-aware forklift model** (straight width vs 90° turn box, per-truck spec) | ✅ | `checkReachabilityTurn` / `forkliftPathTurn` |
| **Door aperture check** (ISO door < interior; flags cartons that can't enter) | ✅ | `PlannerPage fitsDoor` |
| Benchmark harness — Bischoff–Ratcliff instances (`scripts/benchmark.mjs`): **80% avg fill, 300 instances, full stability** | ✅ | run to reproduce |
| Pick-path optimization (order → route) | 🗺 4 | |
| Multi-container/truck fleet split optimization | 🗺 5 | |

### Physical-realism ladder (the moat: checks real operators feel instantly)
| Check | Status |
|---|---|
| Door aperture (container/trailer) | ✅ |
| Forklift 90° turn box (vs straight width) | ✅ |
| Truck axle weight distribution (lever rule from each carton's CoG; per-truck kingpin/tandem limits) | ✅ `lib/realism.ts axleLoads` |
| Carton crush strength (McKee formula from ECT → "Max on top kg" + est. button; engine already propagates load) | ✅ `mckeeSafeLoad` |
| Floor load limit kg/m² (slab rating select; stacks + rack bays vs rating) | ✅ `floorOverloads` |
| Pallet overhang (allowance 0/2.5/5 cm per side; packs it AND warns: −30% compression) | ✅ `palletOverhang` |
| Temperature/hazmat segregation zones (typed zones + cargo zone requirements) | ✅ `zoneViolations` |
| Heavy-over-light + top-heavy CoG-height warnings (loader's instinct, codified) | ✅ `heavyOverLight` / `cogHeight` |
| Loading sequence — PDF/CSV numbered in crew loading order (back-first, floor-first) | ✅ `loadingSequence` |
| SOLAS VGM line (cargo + container tare) on container plans | ✅ PlannerPage |
| Homepage "Reality checks" showcase — all 9 operator checks, bilingual | ✅ HomePage |
| Forklift swept-path arcs (true turning radius sweep) | 🗺 evaluate demand first — turn box covers most of the pain |
| Rack beam capacity per level | 🗺 needs pallet-in-rack assignment model |

## 2. Interactive 3D editor (`components/InteractiveLoadPlanner.tsx`)

| Feature | Status |
|---|---|
| Drag on floor w/ grid snap, collision-block, bounds clamp | ✅ |
| Rotate 90° / drop-to-floor / reset | ✅ |
| Delete selected + 40-step Undo | ✅ |
| Hover glow + grab cursor + drag floor-shadow | ✅ |
| Selection sync w/ page (`selectId`/`onSelect`) | ✅ |
| Animated route + forklift marker + clearance band (`path`/`pathWidth`) | ✅ |
| Red flagging of arbitrary boxes (`flagIds`) | ✅ |
| Auto-spin + resume-after-idle showcase | ✅ |
| First-interaction hint chip (custom text) | ✅ |
| WebGL-unavailable graceful fallback | ✅ |
| PNG snapshot for PDF export | ✅ |
| Multi-select / marquee drag | 🗺 2 |
| Keyboard nudge (arrows) + shortcuts (R, Del, ⌘Z) | ✅ |
| Touch pinch-zoom (mobile polish) | 🗺 2 |
| Measurement tool (click two points → distance) | 🗺 3 |

## 3. Tools (pages)

### /planner — container load planner (flagship)
✅ 3 container types w/ payloads · mixed carton inputs · fragile/upright/group/unload-order · live stats (util/weight/CoG) · zones strip · Excel/CSV/paste import (EN+ZH headers) · CSV packing list · PDF plan (3D snapshot + zones + table) · share links (exact layout, 1yr) · save to account · example presets (`?demo=`)
✅ truck & pallet vessels in the UI (7 vessel types) · 🗺: carton library per account (1) · multi-container auto-split (3)

### /warehouse — warehouse floor planner (beta → production)
✅ floor size · aisle presets (2.7/3.0/3.5m) · auto-arrange w/ aisles · live reachability (red) · forklift route + clearance sim · place-one · first-run tutorial · coach tips · examples (3PL, cross-dock) · beta waitlist
✅ obstacles (walls/columns/office) · multi-dock (4 edges) · rack levels/capacity · named zones w/ per-zone stats · cargo double-stack · save/share layouts · PDF floor plan + reachability report · place-one feedback
🗺: velocity/ABC slotting (1) · pick-path sim (2) · DXF floor-plan import (3) · multi-user live cursors (4)

### /packing · /container · /fba
✅ shipped (product→carton w/ freight cost; container quick-calc; FBA 2025 tiers+fees). 🗺: FBA fee auto-update pipeline (3) · dim-weight per-carrier presets (3)

### Lead-gen tools (warehouse audience; URL-state = bookmarkable)
| Tool | Status |
|---|---|
| /warehouse-space-calculator — pallets → m²/sq ft by storage/levels/aisle system | ✅ |
| /forklift-aisle-width-calculator — Ast = R + head + load + clearance, truck presets | ✅ |
| Product clips (Playwright-recorded, real engine) on homepage | ✅ `scripts/clips.mjs` |

## 4. Growth surface

| Feature | Status |
|---|---|
| 63 answers pages ×2 locales (containers/pallets/trucks) | ✅ |
| 3 honest compare pages | ✅ |
| 9 guides | ✅ |
| Prerender all routes (170) for no-JS/AI crawlers; 4-worker pool | ✅ |
| llms.txt + AI-crawler robots allowlist | ✅ |
| sitemap w/ hreflang (auto-generated) | ✅ |
| IndexNow push (`scripts/indexnow.mjs`) | ✅ |
| GSC verified + sitemap submitted; GA4 (lazy) + first-party events | ✅ |
| i18n path-based EN/繁中 | ✅ |
| Demo video + VideoObject schema | 🗺 1 (kit ready: VIDEO.md) |
| es/de locales | 🗺 2 |
| Embeddable widget (backlink engine) | 🗺 2 |
| Programmatic pages: CBM conversions, FBA limits | 🗺 3 (post-GSC data) |

## 5. Accounts / enterprise (ENTERPRISE.md is the strategy)

| Feature | Status |
|---|---|
| Magic-link auth (shared Supabase, dp_ isolation — DATA.md) | ✅ |
| Saved plans + ROI dashboard (/plans) | ✅ |
| Approval flow (review links) + audit trail | ✅ |
| Email lead capture + warehouse waitlist (KV) | ✅ |
| Secure Pro paywall scaffold (Lemon Squeezy, BILLING-SETUP.md) | ✅ code / 🗺 activate on demand signal |
| Workspaces/teams (multi-member) | 🗺 1 |
| Public API `/api/pack` + /api-docs (free beta; keys later) | ✅ |
| ERP/WMS connectors (per-client, paid) | 🗺 3 |
| SSO / audit-log export / SLA page | 🗺 4 (first enterprise deal) |

## 6. Quality / ops

| Item | Status |
|---|---|
| Engine unit tests — `npm test` (28 tests, tests/unit.mjs) | ✅ |
| Academic benchmark (`npx tsx scripts/benchmark.mjs`) — 80.2% avg on BR 300 instances | ✅ |
| Playwright E2E — `npm run e2e <url>` (22 local / 25 live) | ✅ |
| CI (GitHub Actions: unit + build + E2E on push) | ✅ |
| Uptime/status page | 🗺 2 |
| Error tracking (Sentry-class) | 🗺 2 |

_Promotion & funnel playbook: PROMOTION.md. Data locations: DATA.md. Enterprise value ladder: ENTERPRISE.md. Video kit: VIDEO.md._
