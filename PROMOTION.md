# DimPack3D — Funnel, Segmentation & Promotion Playbook

_The complete map of how visitors arrive, split, convert, return and spread —
and every promotion channel with its concrete action. Companion to SYSTEM.md
(features) and ENTERPRISE.md (monetization ladder). Last updated 2026-07-05._

## 1. The funnel (every stage instrumented)

```
        ACQUIRE                    SEGMENT                 USE                    CONVERT                RETAIN / SPREAD
 ┌────────────────────┐   ┌─────────────────────┐  ┌────────────────┐   ┌──────────────────────┐   ┌─────────────────────┐
 │ SEO (170 pages ×2  │   │ Homepage hero tabs   │  │ /planner       │   │ export email gate     │   │ saved plans (/plans) │
 │  langs, hreflang)  │ → │ (carton|container)   │→ │ /warehouse     │ → │ warehouse waitlist    │ → │ approval flow        │
 │ AI engines (llms.  │   │ chain nav: Products→ │  │ /packing /fba  │   │ Pro waitlist          │   │ ROI dashboard        │
 │  txt, prerender,   │   │ Cartons→Containers→  │  │ answers/guides │   │ (billing ready:       │   │ share links = viral  │
 │  IndexNow→Bing→    │   │ Warehouse            │  │                │   │  BILLING-SETUP.md)    │   │ review links = viral │
 │  ChatGPT/Copilot)  │   │ task grid (5 tiles)  │  │                │   │                       │   │ PDF footer = brand   │
 │ GSC + GA4          │   └─────────────────────┘  └────────────────┘   └──────────────────────┘   └─────────────────────┘
 └────────────────────┘
```

**Events that measure each hop** (first-party `/api/hit`, mirrored to GA4):
`pageview` → `hero_tab` → tool pageviews → `import_open/import_cartons`, `warehouse_place_one/route/example/tutorial_done` → `export_csv/export_pdf`, `waitlist_warehouse`, `plan_saved` → `share_create/share_open`, `review_submit/review_open/review_action`.
Read: `curl "https://dimpack3d.com/api/stats?k=$(cat ~/.dimpack3d-stats-key)"`.

## 2. Segmentation — who lands and where we route them

| Segment | They search / ask | Entry surface | Route to | Convert on |
|---|---|---|---|---|
| Importer / e-com seller | "how many cartons fit in a 20ft container", CBM | /answers/*, guides | /planner | PDF export (email), saved plans |
| Amazon FBA seller | FBA size tiers, fees, dim weight | /fba, FBA guides | /fba → /packing | export, Pro later |
| Freight forwarder / agent | load plan software, EasyCargo alternative | /compare/*, /planner | /planner + share/approval | Team tier (ENTERPRISE.md) |
| Warehouse / ops manager | warehouse layout, pallet aisle width | /warehouse, pallet answers | /warehouse | warehouse waitlist → design partner |
| Chinese-speaking sellers | 貨櫃裝到幾多箱 etc. | /zh/* (all of the above) | same in 繁中 | same |
| AI engines (proxy buyers) | any of the above questions | llms.txt, prerendered answers, FAQ schema | cited answer → click through | — |

Routing rules already built: hero tabs pick the packing level; chain nav shows the whole ladder; answers/compare pages end in a planner CTA; every guide cross-links its tool.

## 3. Promotion channels — the complete list, each with its action

### Tier A — running now (compounding, zero marginal cost)
1. **Classic SEO** — 170 prerendered URLs, sitemap+hreflang, GSC submitted. _Action: weekly GSC review; add answer pages for any query with impressions but no dedicated page._
2. **AI-engine optimization (GEO)** — llms.txt, FAQ/HowTo schema, AI-crawler allowlist, IndexNow→Bing (feeds ChatGPT search & Copilot). _Action: resubmit IndexNow after every deploy (`node scripts/indexnow.mjs`); extend llms.txt when features ship._
3. **Product-led virality** — share links (plan opens = new user), review links (approver = new user), PDF footer branding. _Action: none; monitor `share_open` vs `share_create` ratio._

### Tier B — ready to fire (kit prepared, needs one human action each)
4. **Demo video** — VIDEO.md has full shot lists, scripts, YouTube metadata. _Action: record 60–90s hero video (QuickTime ⌘⇧5), upload; then I wire VideoObject schema + homepage embed + resubmit IndexNow._
5. **Bing Webmaster Tools** — imports GSC in two clicks; direct line into the index behind ChatGPT search. _Action: bing.com/webmasters → "Import from GSC" with the Google account._
6. **Warehouse demand test → design partners** — waitlist live (`warehouse-beta` source). _Action: when ≥10 signups or any inbound hello@ query, send the ENTERPRISE.md §6 pilot pitch._

### Tier C — next builds (highest first)
7. **Embeddable widget** — mini container-calc iframe with "Powered by DimPack3D" backlink; the classic calculator link-building engine. Freight blogs/forwarder sites embed → durable backlinks + referral traffic.
8. **es / de locales** — i18n infra done; translate string tables → 340+ URLs. Spanish (LatAm importers), German (EU e-com).
9. **Programmatic expansion by GSC data** — CBM conversion tables, FBA carton limits, per-country container variants — only where impressions prove demand.
10. **Comparison expansion** — Goodloading, SeaRates, CargoWiz alternatives (same honest template).

### Tier D — communities (when ready to engage personally; not launch-spam)
11. r/FulfillmentByAmazon, r/logistics, r/supplychain — answer real questions, link the specific answer page (not the homepage). One good answer > ten posts.
12. LinkedIn — the forklift-route clearance GIF is the scroll-stopper; post as "we built the rule containers don't have".
13. 跨境电商微信/FB groups — /zh pages are the asset; share the 貨櫃 answers pages.
14. Product Hunt / HackerNews Show HN — optional; do only after the video exists and analytics can absorb the spike.

## 4. Weekly operating rhythm (30 min)

1. `api/stats` + GSC: what moved? (`hero_tab` split answers the container-vs-carton-vs-warehouse demand question)
2. Any `waitlist_warehouse` or hello@ replies → same-day response (design-partner leads are the six-figure path)
3. One content addition where data shows demand (answer page / guide / compare)
4. Deploy anything pending → `node scripts/indexnow.mjs`

## 5. What we deliberately do NOT do

- No fake testimonials, logos, or usage numbers — trust artifacts only when real (ENTERPRISE.md §2)
- No paid ads until organic conversion is measured (burning money before the funnel is proven)
- No launch-posting before the video + first data — one strong launch beats three weak ones
