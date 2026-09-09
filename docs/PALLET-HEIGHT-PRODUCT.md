# Order-to-pallet product direction — 2026-09-09

## Evidence and scope

An aggregate search-intent review highlighted layer-count calculators, mixed-carton packing, visual pallet building and API integration. Detailed first-party search metrics remain in the private research report.

An inbound prospect asked to use the API to estimate potential pallet height. This is one concrete integration lead, not proof of a large market or willingness to pay. Exact pallet-height keyword demand has not been established.

A live search for "pallet height calculator mixed cartons" on September 9 surfaced pallet configuration calculators, layer viewers, and Excel-related queries. SERP suggestions are qualitative intent clues, not measured search volumes. 3DBinPacking already returns stack_height and supports packing count/cost objectives: https://www.3dbinpacking.com/en/api-doc . Do not claim pallet-height estimation is unique.

## Customer jobs and priority

1. Quoting desk / developer: estimate loaded dimensions before packing. First release: full-order status, height including base, payload, API and a visible placement plan.
2. Warehouse operator: reproduce the plan. Current release exports placements and offers a height-reveal diagram. Next: usable layer instructions, operator review, actual built height. No transit-stability certification.
3. 3PL / distributor: process many recurring orders. Next, after repeat usage: multi-pallet splits, batch queue, reusable SKU/rule profiles, authenticated API metering and version guarantees.
4. Ops manager: compare estimated versus actual outcomes. Add with a real pilot: dimensional error, planning minutes, manual corrections, pallet count. Do not invent savings or claim statistical confidence from heuristic variation.

## Implemented release

- /pallet-height-calculator and /zh/pallet-height-calculator: immediate sample, editable constraints, mixed carton types, Excel/CSV paste, orientation/fragile controls, interactive isometric placement view, height reveal, per-type accounting, CSV and JSON exports.
- POST /api/pallet-estimate and browser worker share strict validation and estimation code. GET provides example/schema notes. Browser input edits stay local; an explicit server check sends input to the API.
- Best of three deterministic packing strategies. Selection first minimizes unplaced carton count, then resulting height. No claim of optimality or proof of infeasibility.
- No database, payment, email submission or new customer-account storage introduced.
- Existing single-size pallet calculator remains distinct: it uses different block arithmetic. No universal count-parity claim.

## Release limits and operational checks

20 types / 200 cartons / 32 KB request. cm/kg only; US pallet preset converts footprint to cm. Cargo weights required, payload excludes pallet tare. No maximum-top-load field in the simple UI beyond "nothing on top"; API supports maxStack. Unknown carton strength remains unchecked.

The existing KV limiter is best-effort/eventually consistent and can fail open without its binding. It is not tenant auth or hard billing enforcement. Confirm production CPU allowance and latency for representative 200-carton mixed loads before promising throughput or larger limits. Node timings and local Workers tests do not establish production latency/SLA.

Main's existing prerender runs outside CI and has weaker guards than open PR #1. This change adds both locales to that route list, but must be integrated with the prerender safeguards before public release. A SPA-only build is not proof of crawler-ready HTML. Verify generated sitemap and both route snapshots in deployment QA.

## B2B validation milestones

- Get 3–5 real order examples and the prospect's constraints/current process.
- Agree acceptance criteria with each prospect: complete accounting, acceptable height error against actual builds, runtime and usefulness of the output.
- Observe a second real use and ask for a paid, bounded integration pilot.
- Implement keys, metering and production support terms when a customer commits; no advertised SLA until measured.
- Pricing is an experiment: assess recurring order volume, time saved and avoided quote corrections before setting tiers.

Events added: pallet_height_import, pallet_height_example, pallet_height_export, pallet_height_api_check, pallet_height_contact. They carry action/status labels, never carton contents. These events do not measure unique users, repeat use, emails sent, leads or paid conversion. The mailto event is an outbound click only. Until a consented account/session funnel exists, validate repeat usage directly with pilot customers.

## Next build decisions

Prioritize multi-pallet splitting if prospects regularly exceed a single pallet. Prioritize operator-friendly layer sheets if workers cannot reproduce the coordinates. Prioritize quoting integrations if the API is repeatedly called by real order systems. Keep these distinct from traffic-driven additions; more indexed pages alone are not business validation.
