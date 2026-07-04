# DimPack3D — Video Kit

_Why video: YouTube is the #2 search engine, Google AI Overviews and Gemini
ingest video content, and a demo video is the strongest "it really works" proof
for both AI engines and enterprise buyers. Record with QuickTime (⌘⇧5, record
selected window) or OBS. No narration required for v1 — captions carry it._

## Video 1 — Hero demo (60–90s, silent + captions, also embeddable on the homepage)

| # | Shot (screen) | On-screen caption |
|---|---|---|
| 1 | dimpack3d.com hero, demo auto-spinning | "Stop shipping air." |
| 2 | Click **Plan a container — free** → planner opens on the full 20'GP | "Real 3D bin-packing — free, in your browser" |
| 3 | Click **Import Excel/CSV** → paste 3 rows from Excel → preview → **Import & optimize** | "Paste your carton list straight from Excel" |
| 4 | Container fills; hover the stats (utilization / weight) | "Weight & stacking limits enforced" |
| 5 | Drag one carton to a new spot; try to overlap another (blocked) | "Drag to fine-tune — never overlaps" |
| 6 | Click **PDF plan** → the printable plan appears (3D snapshot + packing list) | "Export a plan your warehouse can follow" |
| 7 | Click **Share this plan** → "Link copied" | "Share it with one click" |
| 8 | End card: logo + dimpack3d.com | "Free · no signup · dimpack3d.com" |

**Recording tips**: 1440×900 browser window, hide bookmarks bar, 2× cursor via
System Settings → Accessibility if possible, pause 1s on each result.

## Video 2 — Full walkthrough (3–5 min, narrated if possible)

Script beats (one sentence each on camera/voice):
1. The problem: "Every container you book, you pay for all of it — most loads waste 15–30%."
2. Import: paste an Excel carton list (use the template in the repo: `name,length,width,height,weight,qty,fragile`).
3. Constraints: mark one carton fragile + one this-way-up; re-optimize; show fragile ends up on top.
4. Multi-stop: load the multistop example (`/planner?demo=multistop`); show door-side zone.
5. Hand edit: drag two cartons; show utilization updating live.
6. Export: PDF plan + CSV packing list.
7. Team flow: Save to my plans → Review link → approve on the review page → audit trail.
8. Close: free, browser-only, data stays on your device.

## YouTube metadata (copy-paste)

**Title (V1):** Free 3D Container Load Planner — Pack, Edit & Export Load Plans (DimPack3D)
**Title (V2):** How to Plan a Container Load in 3 Minutes — Free 3D Bin-Packing Tool

**Description:**
```
Plan container loads in interactive 3D — free, in your browser, no signup.
✓ Real bin-packing with weight & stacking limits
✓ Import your carton list from Excel/CSV
✓ Drag any carton to fine-tune (collision-blocked)
✓ Export a PDF load plan + CSV packing list
✓ Share links, saved plans, approval workflow

Try it: https://www.dimpack3d.com/planner
Examples: https://www.dimpack3d.com/planner?demo=retail
How many cartons fit in a 20ft container: https://www.dimpack3d.com/answers/cartons-in-20ft-container

00:00 The problem: shipping air
00:20 Import your Excel carton list
00:50 Optimize with weight & stacking limits
01:30 Drag to fine-tune in 3D
02:10 Export PDF load plan & packing list
02:40 Share & approval workflow
```

**Tags:** container loading calculator, load planning software, 3D bin packing, container load plan, CBM calculator, freight forwarder tools, Amazon FBA shipping, EasyCargo alternative, load optimization

## After upload — tell the AI engines (I do this part)

1. Give me the YouTube URL → I add `VideoObject` JSON-LD to the homepage +
   planner page (name, description, thumbnailUrl, uploadDate, embedUrl) so
   Google/AI engines associate the video with the tool.
2. Embed the hero video on the homepage (lazy iframe).
3. Add the URL to llms.txt and resubmit IndexNow.
