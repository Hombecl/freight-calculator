# Order → pallet quote pilot (30 orders / 30 days)

Fixed-fee pilot that turns "the engine looks right" into measured evidence
against a real shipper's orders and freight invoices. First candidate:
the warehouse-automation inbound of 2026-09-09 (US DTC retailer, own
warehouse, quotes LTL at order time).

## Offer

| Item | Value |
|---|---|
| Fee | US$300 one-time, invoiced at start. Month two on Starter ($49) only if the success criteria hold. |
| Duration | 30 calendar days from first quoted order |
| Scope | 30 representative orders (mix of sizes; at least 5 multi-pallet). `/api/order-quote` or `/order-quote` page, customer's choice. |
| We provide | API key at Starter limits, a `limits` profile encoded for their receiver/carrier, weekly variance report, fixes to the contract when they find gaps. |
| They provide | Carton master (L×W×H, weight, upright/max-stack if known), pallet spec incl. tare, packaging allowance, for every pilot order: measured loaded height, measured gross weight, actual pallet count, and the freight invoice line. |

## Success criteria (agree BEFORE the first order)

Measured on the 30 orders, using `actuals` → `variance`:

| Metric | Target | Why this number |
|---|---|---|
| Loaded-height error, median | ≤ 5 cm (2 in) | Typical LTL height bands are 4–6 in; half a band of slack. |
| Loaded-height error, 90th pct | ≤ 10 cm (4 in) | One band. Larger errors change the rate class. |
| Under-estimation rate (predicted < measured by > 5 cm) | ≤ 10% of pallets | Under-estimates are the ones that get rebilled. Over-estimates cost margin but not surprises. |
| Pallet-count error | 0 on ≥ 90% of orders | A missed pallet is a re-quote, not a tolerance issue. |
| Gross-weight error | ≤ 3% | Mostly bounded by tare + wrap assumptions; larger error means bad carton weights. |
| Orders needing manual intervention | ≤ 20% | `needs_review` / `partial` that a person had to resolve. Track the reason codes. |

Anything outside target is a finding, not a failure — the report says which
input was wrong (carton master, tare, allowance) or which engine behaviour
(orientation, stacking) caused it.

## Procedure

1. Kick-off (30 min): encode their pallet + receiver limits as a request
   template; run 3 historical orders together; agree the table above.
2. Per order: they POST (or paste) the order before quoting. They keep the
   `inputHash` on the order record.
3. After build: they enter `actuals` (height, gross, note) — page or API.
   Predicted vs measured is stored on their side (page = localStorage;
   API = their system). We ask for a weekly export of the 30 rows.
4. Weekly: 15-min call, variance table, decide any contract change
   (e.g. add a field) — shipped within the week.
5. Day 30: report against the table; go / no-go on Starter.

## What we do NOT claim

- Not a guarantee of receiver acceptance or carrier billing. Checks screen
  numbers they supplied; labels, appointments, packaging condition and
  receiving discretion are outside the model.
- No overhang model (cartons stay inside the footprint).
- Heuristic pallet count — not proven minimal.

## Data handling

Requests are processed on Cloudflare's edge and not stored. We log only
rate-limit counters per key. Pilot variance rows are shared by the customer
as CSV/JSON; we retain them for the report and delete on request.
