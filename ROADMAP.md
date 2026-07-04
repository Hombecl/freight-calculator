# DimPack3D — Product & Commercialisation Roadmap

_Last updated: 2026-07-04_

## 0. What we have today

- **Live product** (currently offline — Vercel deploy returns HTTP 402, account-level block; code + domain intact).
  - GitHub: `Hombecl/freight-calculator` · Local: `~/freight-calculator` · Domain: `dimpack3d.com` (GoDaddy → Vercel).
- **Three calculators** (single monolith `Calculator.tsx`, 4460 lines): product→carton packing, container loading, Amazon FBA size/fee.
- **9 SEO guide articles.**
- **3D** = read-only render (raw three.js r128 from CDN) — you can rotate the whole scene but not edit it.
- **No monetisation** wired: no accounts, no payments, no ads, no analytics.

## 1. The new capability (built 2026-07-04)

`src/components/InteractiveLoadPlanner.tsx` + `src/pages/PlannerPage.tsx` → route `/planner`.

- Auto-arrange mixed cartons into a container (greedy first-fit seed), then **edit by hand**:
  drag on the floor, snap to grid, 3D collision so boxes never overlap, clamp to container bounds,
  rotate 90°, drop-to-floor stacking, live utilisation recompute.
- Raw three.js (no react-three-fiber, no React bump) → zero risk to the existing monolith.
- Pure geometry helpers (`overlaps3D`, `utilizationOf`, `snap`, `clamp`) are separated from three.js
  so they can be unit-tested and reused by a future real bin-packer.

### Why NOT bolt this onto the existing single-SKU Packing tool
The single-product carton grid is already mathematically optimal — letting a user drag identical
unit boxes only lets them make it *worse*. Interactive editing earns its keep **only for MIXED loads**
(different carton sizes + real-world constraints), i.e. the Container / Planner context. That is where
it now lives. Verdict: **useful for mixed container/pallet loading, skip for single-SKU packing.**

## 2. Who has the pain (audiences, ranked by willingness to pay)

| Segment | Core pain | Monetisation |
|---|---|---|
| Freight forwarders / 3PLs / sourcing agents | Need a **shareable, editable** load plan to send clients | **Paid SaaS** ($9–29/mo) — this is EasyCargo / Cargo-Planner's paying base |
| Amazon / e-com sellers importing from China | FBA fee + carton fit + container fill in one flow | Freemium (save/PDF export) + affiliate (freight, prep centres) |
| Small importers / wholesalers | Occasional CBM / container sanity check | Ads + freight-forwarder lead-gen |
| Warehouse / ops (only if we add floor slotting) | Where do pallets sit on the floor | Separate module, optional |

**The wedge that hits everyone:** _"Auto-optimise → edit by hand → share / export a professional
load plan + packing list."_ No free tool does the edit+share step; paid tools charge $29–200/mo for it.

## 3. Technical-depth ladder (each rung deepens the moat)

- **L0 (have)** free calculators + read-only 3D
- **L1 (built)** interactive editable 3D load plan
- **L2** real mixed-carton bin-packing (beat greedy first-fit) + weight & stacking limits
- **L3** constraints engine: fragile-on-top, max-stack-weight, keep-SKU-together, load/drop order
- **L4** shareable link + PDF / packing-list / CSV export ← _the monetisable artifact_
- **L5** accounts, saved projects, teams ← SaaS
- **L6** API / embeddable widget ← licence the engine (the "sell the tech" exit)

## 4. Phased plan

**Phase 0 — Relaunch + instrument (must do first, 1–2 days)**
- Get back online (fix Vercel 402 **or** move to Cloudflare Pages — `_redirects` SPA fallback already added).
- Add analytics (Plausible / GA4) and a light email capture ("save your plan").
  _Without traffic data you can neither optimise nor sell the site._

**Phase 1 — Ship the wedge (1–2 weeks)**
- Polish `/planner`; add L4 export (PDF + packing list). Gate export behind email (or a cheap paid tier).
- Link every calculator's result → "Open in 3D Planner".

**Phase 2 — Deepen (2–4 weeks)**
- L2 bin-packer + L3 constraints. This is what makes forwarders switch from $29/mo incumbents.

**Phase 3 — Monetise / scale / exit** (choose from data):
- **SaaS**: accounts + Stripe, $9–29/mo (recurring income).
- **Traffic asset → sale**: grow SEO + trailing ad/affiliate revenue, sell on Flippa / Acquire.com (~30–40× monthly profit).
- **Licence the engine**: L6 API/widget sold to a freight SaaS (sell the tech, don't run the business).

## 5. Competitive positioning

- **Do not** try to out-SEO commodity CBM/FBA calculators (Freightos, Helium10, Jungle Scout, Omnicalculator) — their domain authority is too high; use those pages only as top-of-funnel.
- **Do** own the underserved intersection: _"China-import Amazon seller who must optimise cartons + container AND the forwarder who plans the load."_ No incumbent combines FBA fee logic + carton packing + editable/shareable 3D container loading. That integrated, editable, shareable workflow is the differentiator.
