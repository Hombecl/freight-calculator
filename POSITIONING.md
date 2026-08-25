# Positioning — pallet as the wedge, planner/API as the position

**Status**: v2, 2026-08-26. Revised after an independent GPT-5.6 (Sol) review of
v1 with repo access. v1's core recommendation was wrong in a specific way and is
corrected in §2; v1 also shipped a factually false homepage claim, recorded in §9
so it is not repeated.
**Evidence**: Search Console, 90 days to 2026-08-23, 473 queries / 1,822
impressions. Reproduce with `scratchpad/dp-topics.mjs` and `dp-intent.mjs`.
Pre-change baseline for measuring the 08-23 deploys: `scratchpad/dp-baseline.mjs`.

---

## 1. The measured demand

| Topic (the job being done) | Impr | Share | Clicks | Avg pos |
|---|---|---|---|---|
| Pallet loading (cartons per pallet, ti-hi) | 782 | 42.9% | 2 | 52.7 |
| Volume / CBM / chargeable weight | 249 | 13.7% | 0 | 52.6 |
| Pallet storage cost (3PL, per month) | 197 | 10.8% | 0 | 59.4 |
| Warehouse space / capacity | 173 | 9.5% | 0 | 77.3 |
| Carton / box packing | 141 | 7.7% | 4 | 34.7 |
| Brand | 63 | 3.5% | 20 | 6.5 |
| Container fitting | 42 | 2.3% | 0 | 50.8 |
| 3D tool / software | 39 | 2.1% | 0 | 50.0 |

### Three caveats v1 did not state

1. **63% is not one audience.** It sums three topics whose searchers are
   different people doing different jobs: someone arranging cartons on a deck,
   someone shopping 3PL rates, someone sizing a building. There is no evidence
   they form a single journey. The storage-rate searcher is arguably *worst*
   served — our cost tool asks them to supply the rate they came looking for.
2. **Impressions are endogenous.** We built many pallet pages, so Google tests
   us on pallet queries. Impression share partly measures what we published, not
   what the market wants.
3. **Search share ≠ business value.** Pallet-count questions are a commodity
   answered free by many sites, with near-zero willingness to pay. Share of
   impressions is a poor proxy for revenue when the buyers who would pay are not
   searching for a calculator at all.

---

## 2. The position (CORRECTED)

v1 said: reposition the company around pallets, because pallets are 63% of
demand and the 3D planner is 2.1%.

**That was wrong.** It reasoned from demand share straight to company position in
one step. The correct split:

> **Pallet is the acquisition wedge. The mixed-load planner and the API are the
> position.**

- **Wedge** — pallet landing pages earn traffic on real, high-volume questions.
  Keep them, keep improving them, keep them honest.
- **Position** — the differentiated asset is mixed-load 3D planning with
  operator-grade checks (door aperture, axle loads, crush limits, overhang, load
  voids) and a public API. Nothing else free does that. That is what a company
  is built on; "cartons per pallet" is not.

The homepage should not tell a visitor this is fundamentally a pallet
calculator. It should earn them via pallet questions and show them the planner.

### What we may honestly claim about the pallet tools

⛔ **Not** "runs the packing engine". `perLayer()` in `src/lib/pallets.ts` is
best-of-two-orientation block arithmetic — literally deck area divided by carton
area — and `palletBoxes()` deliberately bypasses `packWithConstraints` because
the general engine places 30 cartons where the block math places 40.

What is true and still differentiating:
- we **draw the actual layer pattern** (`LayerDiagram`, `SideDiagram`), so the
  picture cannot disagree with the count
- we **cap by the pallet's real weight rating**, which many free tools ignore
- we **state our assumptions** (interlocking/pinwheel not assumed; planning
  figures, not gospel)

---

## 3. The benchmark — what it does and does not prove

`scripts/benchmark.mjs` reports **80.2% average fill over 300 Bischoff–Ratcliff
OR-Library instances**, with ≥60% base support and full collision enforced.

⛔ The same file's own header states published heuristics on these instances
average **83–95%**, under varying and often weaker stability rules. So:

- It is an honest engineering number, defensible because our constraints are
  stricter.
- It is **not** a competitive win and must never be presented as one.
- "Full stability" means the `SUPPORT_RATIO = 0.6` constant, not proof against
  tipping.
- Leading a Show HN with it invites exactly the scrutiny that finds the 83–95%
  line. Do not.

---

## 4. Authority is a hypothesis, not a diagnosis

v1 asserted that domain authority is the binding constraint. It is *a*
hypothesis; it was never isolated. Counter-evidence already present: Hong Kong
ranks at pos 9.7 while the USA sits at 37.8 — one global authority ceiling does
not explain that. "~200 routes" is weak evidence of coverage, since many are
templated answer pages rather than differentiated expertise.

**Falsify it before spending on it:**
- compare against sites outranking us with equal or fewer referring domains
- matched test: earn 3–5 editorial links to one page group, leave a comparable
  group untouched, measure non-brand position over 6–8 weeks
- material ranking movement from the 08-23 on-page changes *without* new links
  would weaken the authority story
- inspect the SERP: do incumbents win on links, or on better tools and intent
  satisfaction?

---

## 5. Metrics discipline (v1 got these wrong)

| Claim in v1 | Reality |
|---|---|
| "19 people pasted their carton data" | `track.ts` records anonymous **events**. That is an event count. Repeats and per-user progression are unknowable. |
| "/compare converts at 12.7%" | That is **SERP click-through**, not product or revenue conversion. |
| "1,498 pageviews → 1 sign-in" | Ratio is real (0.067%) but sign-in was barely surfaced, so the denominator proves little. |
| "18 leads" | True, and they have **no operational follow-up channel** — there is no outbound email. More anonymous traffic into that system has near-zero business value. |

Session-level instrumentation (source → import → export/share → return) is
required before any funnel claim is trustworthy.

---

## 6. Sequencing

⛔ v1 declared on-page work "done" on deployment day while simultaneously
instructing a 3–4 week wait. Both cannot be true. The 08-23 changes are an
unmeasured experiment until roughly mid-September.

**Now**: nothing that depends on knowing whether the repositioning worked.
**Mid-September**: re-run `dp-baseline.mjs`, diff against the captured baseline.
The signal that matters is **first clicks in the ANSWER bucket** — 419
impressions, 0 clicks over 90 days.
**Before promoting `/api/pack` anywhere**: it has per-request input caps
(`MAX_QTY` 2000, `MAX_ITEMS` 100) but **no per-IP rate limit** — 12 rapid
requests all returned 200. Rate-limit for cost control regardless of marketing.

---

## 7. Highest-EV action (independent recommendation)

Not more traffic. A **design-partner validation sprint**: contact the 18
existing leads plus a hand-picked list of forwarders/3PL operators, and offer to
optimise one real shipment personally. Targets: ~8 conversations, 5 real carton
files, 3 second-uses within 14 days, 2 explicit small commitments or 1 paid
pilot. Build only what blocks those users.

⚠️ This is outbound work — owner time, not a build task — and it contradicts the
"no distribution or outreach for now" note from 2026-08-08. It needs an explicit
decision before anyone starts.

---

## 8. What we were fooling ourselves about

Treating impressions as market demand, CTR as conversion, events as people,
route count as authority, adjacent keywords as one customer journey, and a
reproducible benchmark as a competitive benchmark.

---

## 9. Incident: a false claim shipped 2026-08-23, fixed 2026-08-26

The v1 homepage read *"every number placed box by box by a real packing engine,
not deck area divided by carton area."* The pallet calculator does neither — it
runs `perLayer()`, which **is** deck area divided by carton area, and the save
path was written the same day to explicitly bypass the engine.

This is the same class of defect as the fabricated `aggregateRating` (4.8 from
150 nonexistent reviews) removed from `index.html` on the same day: a marketing
claim the code contradicts.

Corrected everywhere it appeared — homepage H1 and sub-head, the four-questions
blurb, the `/pallet-calculator` title, the `/compare/*` benchmark card, and
`public/llms.txt`. Each site carries a `⛔` comment explaining why, so the engine
language is not reintroduced by someone reading this document without reading
`pallets.ts`.

**Rule going forward**: a claim about how a number is produced must be checked
against the function that produces it, in the same change.
