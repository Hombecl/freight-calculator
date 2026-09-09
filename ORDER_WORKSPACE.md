# Mixed-order workspace

`/pallet-height-calculator` is the source-order workflow. `/zh`, `/de`, `/fr`, `/es`, and `/pt` versions of that route have complete interface translations and reciprocal language links. These are language pages, not duplicate country pages. The remaining site retains its existing English/Traditional Chinese routes.

## Data and calculations

- Canonical inputs remain cm/kg. Display units convert without modifying the source request. JSON/API requests always use cm/kg; placement CSV uses the selected display units.
- `planOrder` repeatedly packs the remainder into at most 20 pallets. Whole-order status and per-SKU counts are authoritative; each pallet also retains the solver's allocation-step statistics. SKU IDs and colours are stable across pallets.
- Limits: 20 carton types, 200 total cartons, 20 pallets. Results are geometric heuristic estimates, not proof of minimum height/fewest pallets or transport certification.
- Build steps are sorted bottom-up (`py`, `pz`, `px`); positions originate at the deck. Loaded height includes the base; cargo weight excludes pallet tare.
- Explicit device saves and company-rule profiles use versioned local storage, with 50 entries per collection. Orders can be downloaded/imported as versioned JSON. Device data is visible to people sharing the browser.
- Measured heights are observations attached to the current source order. Input changes clear them. They never train or alter the solver automatically.
- Signed-in saves reuse `dp_plans` and its owner-only RLS. The full order is `stats.orderFile`; `container_key=pallet-order` routes reopening to this workspace. Legacy review links are hidden for these orders because that viewer handles one load only. Account saves create copies; local saves update the selected device entry.

## API

`POST /api/order-plan` accepts `{request: {pallet, items}, maxPallets}`. It uses the same engine as the Web Worker. The existing `/api/pallet-estimate` remains compatible. Read `/api-docs#order-plan` for executable Node/Python examples, units, errors and interpretation. Cloudflare KV rate limiting is best-effort (10/minute, 100/day per IP when configured), not a billing meter or SLA.

## Validation and release

Run `npm run typecheck`, `npm test`, and `npm run build:spa`. Test the UI through the selected browser, including units, language retention, complete/partial orders, file/device round trips and server parity. Use a clean local origin with no saved orders or authenticated account when snapshotting.

`scripts/release-routes.mjs` is the shared route/sitemap/validation manifest. There are 208 snapshots and 206 indexable URLs; embeds are noindex. Snapshot from an immutable SPA copy, never from the directory being overwritten. `npm run validate:release` must pass before Cloudflare Pages deployment. It rejects missing routes, assets, canonical/description errors, missing order-language alternates and incomplete sitemaps. Do not accept a partial prerender run.

Deploy the verified `dist` to the existing Cloudflare Pages project `dimpack3d`, then verify apex, www and Pages deployment URLs plus both API endpoints. Retain the previous deployment ID for rollback. A page-load error boundary provides a visible recovery control for blocked or unavailable chunks.

## Growth measurement

Aggregate events include `order_calculated`, `order_compared`, `order_saved`, `order_reopened`, `order_export`, `order_import`, `order_api_check` and `order_print`. Event metadata contains action categories, never order names, carton contents or measured heights. The activation event excludes initial example calculation. Compare Search Console query/page/country results after indexing; language availability is not evidence of search volume or paid demand.
