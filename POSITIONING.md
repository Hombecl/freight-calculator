# Positioning — the pallet authority

**Status**: draft for review, 2026-08-23. Nothing in here is implemented yet.
**Evidence**: Search Console, 90 days to 2026-08-23, 473 queries / 1,822 impressions.
Reproduce with `scratchpad/dp-topics.mjs` (topic clustering) and `dp-intent.mjs`
(intent clustering). Site analytics: `/api/stats?k=…&days=28`.

---

## 1. The finding

Demand reaching this site, clustered by the job the searcher is doing:

| Topic | Impr | Share | Clicks | Avg pos |
|---|---|---|---|---|
| Pallet loading (cartons per pallet, ti-hi) | 782 | **42.9%** | 2 | 52.7 |
| Volume / CBM / chargeable weight | 249 | 13.7% | 0 | 52.6 |
| Pallet storage cost (3PL, per month) | 197 | **10.8%** | 0 | 59.4 |
| Warehouse space / capacity | 173 | **9.5%** | 0 | 77.3 |
| Carton / box packing | 141 | 7.7% | 4 | 34.7 |
| Brand | 63 | 3.5% | 20 | 6.5 |
| Container fitting | 42 | 2.3% | 0 | 50.8 |
| 3D tool / software | 39 | **2.1%** | **0** | 50.0 |
| Freight class / NMFC | 28 | 1.5% | 0 | 59.8 |
| FBA / Amazon | 20 | 1.1% | 0 | 40.4 |

**Pallet-centric demand is 63.2%** (42.9 + 10.8 + 9.5 — the cost and space
queries are literally "pallet storage cost per month", "pallet square footage",
"how much does it cost to store a pallet in a warehouse").

**The 3D planner the site is named after and led by is 2.1%, with zero clicks
in 90 days.** Container fitting adds 2.3%. Combined: 4.4%.

The site currently says, on the homepage, *"Not a CBM toy — a load-planning
engine."* CBM is 13.7% of demand. That line, and the positioning behind it,
rejects the audience that is actually arriving.

### The job, in the searcher's words

> "I have pallets. How many cartons fit on one? How many pallets do I need?
> How much floor space is that? What will storage cost me per month?"

Every tool for that job already exists — `/pallet-calculator`,
`/ti-hi-calculator`, `/pallet-builder`, `/pallets-per-container`,
`/pallet-storage-cost-calculator`, `/warehouse-space-calculator`. They are
scattered, framed as accessories to the planner, and buried at positions 52–77.
This is a positioning and internal-linking problem, not a missing-product problem.

---

## 2. The position

> **DimPack3D is where you work out your pallets** — what fits on one, how many
> you need, how much space they take, and what they cost to store.

### The wedge

Every other free pallet calculator does arithmetic: deck area ÷ carton
footprint. This one **places the boxes** — best-of-two block orientations,
layer diagrams, weight caps, overhang rules, door-aperture checks — and the
engine behind it scores **80.2% average fill with full stability on the
Bischoff–Ratcliff OR-Library** (`scripts/benchmark.mjs`, 300 instances).

> **Most pallet calculators guess. This one builds the pallet.**

This is the key move: the 3D engine stops being the headline product and
becomes **proof that the simple number is correct**. We keep the moat and stop
hiding it behind an audience that is not showing up. A person asking "how many
cartons fit on a pallet" wants a number they can trust and act on; nobody else
can show them the actual arrangement that produces it.

### What we are NOT saying

- Not "we're not a calculator" — we are, and that is the demand.
- Not "load-planning engine" as the lead. It is the proof, in the second breath.
- Never a fabricated price, rate or benchmark. Storage-cost guidance stays
  user-entered with typical-range context, per `PalletStorageCostPage`.

---

## 3. Homepage rewrite

Current H1: `Stop shipping air.` — a container-void line, aimed at the 2.3%.

**Proposed H1**

```
EN  Most pallet calculators guess. This one builds the pallet.
ZH  大部分卡板計算機靠估。呢個真係逐箱砌出嚟。
```

**Proposed sub-head**

```
EN  Cartons per pallet, pallets per container, floor space and storage cost —
    every number placed box by box by a real packing engine, not deck area
    divided by carton area.
ZH  每板箱數、每櫃板數、佔地面積同倉存成本 — 每個數字都係真實裝箱引擎逐箱擺出嚟,
    唔係用板面面積除以箱面面積果種。
```

**Section order change.** Today: hero → expensive surprises (dock pain) → task
nav → calculators suite → how it works → clips → system → proof → FAQ.

Proposed: hero → **the four pallet questions** (four cards linking straight to
`/pallet-calculator`, `/pallets-per-container`, `/warehouse-space-calculator`,
`/pallet-storage-cost-calculator`) → proof-of-correctness (layer diagram +
80.2% benchmark) → remaining calculators → dock pain / reality checks → planner
as the deep tool → FAQ.

The dock-pain band and reality-checks stay — they are genuinely good and serve
the buyer who converts on `/compare/*`. They move below the pallet answer
rather than ahead of it.

**Line to delete**: `Not a CBM toy — a load-planning engine`. It rejects 13.7%
of demand to defend a 2.1% position.

---

## 4. Hub change

`/planner` is today's implied hub. It should be `/pallet-calculator` — the
single biggest impression pool on the site (1,034 impressions/28d, pos 37.1).

Link structure to build (all internal, no new tools):

```
homepage ──► /pallet-calculator          (hub: cartons per pallet)
               ├─► /ti-hi-calculator     (TI × HI for the same carton)
               ├─► /pallet-builder       (see the actual stack in 3D)
               ├─► /pallets-per-container(now how many pallets ship)
               ├─► /warehouse-space-calculator (floor area for those pallets)
               └─► /pallet-storage-cost-calculator (what they cost per month)
```

Each step is the natural next question. Today none of these link to each other
in sequence; the user has to go back to the footer. This chain is also the
capture opportunity — by step 4 the visitor has told us carton size, pallet
count and storage duration.

---

## 5. Title changes

Only where the title fights the position. English shown; ZH mirrors already
exist after `ee2a978`.

| Page | Now | Proposed |
|---|---|---|
| `/pallet-calculator` | Pallet Calculator — cartons per pallet, layers & pallets needed, free | **Pallet Calculator — cartons per pallet, built box by box (not estimated)** |
| `/pallet-builder` | Pallet Builder — build pallets in 3D with layer patterns & weight checks | keep (already exact-match for "pallet builder", pos 25.4) |
| homepage | DimPack3D — Free 3D Container Load Planner & Bin Packing Calculator | **hold — see §7** |

---

## 6. Where the money is

Counting pallets is a commodity. The monetisable cluster is already in the
demand and sits adjacent:

- **Storage cost** — 197 impr: "pallet storage costs", "cost per pallet per
  month", "3pl pallet storage cost", "pallet storage rates"
- **Warehouse space** — 173 impr: sizing floor area for a pallet count
- **Comparison shoppers** — `/compare/*` converts at 12.7% CTR at pos 10.7;
  these are people replacing $350–$5,000/yr tools

Traffic position = pallet answers. Business position = **pallet economics**:
what your pallets cost in space and money, in a form you can hand to a boss or
a 3PL. That is a decision someone acts on; a carton count is not.

---

## 7. Sequencing and risk

⛔ **Do not change the homepage `<title>` in phase 1.** The homepage is the
site's best asset — 70 clicks, 14.1% CTR at pos 14.1 — and `137b419` already
demonstrated that an exact-match title change can split a query and cost every
click on it. Project convention (and `reference_dimpack3d_gsc_access`) is to
measure 3–4 weeks before further title moves.

**Phase 1 — low risk, reversible, no title changes**
1. Homepage hero copy + section reorder
2. The pallet chain (§4) internal links
3. `/pallet-calculator` title + proof-of-correctness block
4. Delete the "Not a CBM toy" line

**Phase 2 — after 3–4 weeks of GSC data**
5. Homepage title, only if phase 1 shows pallet queries improving
6. Capture step at the end of the pallet chain

**Measure with** `scratchpad/dp-baseline.mjs`, which captured the pre-change
state on 2026-08-23. Success = pallet-topic impressions rising and, critically,
**first clicks in the ANSWER bucket** (419 impressions, 0 clicks in 90 days).

---

## 8. Open questions

- **The name.** "3D" signals the 2.1% topic and fights a pallet position. Brand
  equity is only 63 impressions, so there is little to protect — but renaming is
  disruptive and should not be decided as a side effect of this document.
- **Market B (warehouse slotting).** `ROADMAP.md` allocates 70% of effort there.
  Warehouse space is 9.5% of demand and ranks worst on the site (pos 77.3), and
  the beta waitlist has ~0 conversions. There is demand for warehouse *sizing*;
  there is no inbound signal for warehouse *slotting*. Worth re-testing before
  more investment.
- **The 3D planner's future.** Proposed here as proof-of-correctness, not as the
  lead. If it is meant to be the product, this document is the wrong plan.
