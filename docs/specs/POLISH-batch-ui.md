# POLISH — bring the batch pages up to the site's visual standard

Pages `/consolidation`, `/box-catalog`, `/receiver-profiles`, `/build-sheet`
work but look unstyled next to `/order-quote` and `/case-designer`. Do NOT
change any library, contract, test id, or behaviour. Only markup/classes,
copy placement and default example values as listed.

Reference for the look: `src/pages/OrderQuotePage.tsx` (two-column input
cards `rounded-2xl border border-slate-200 p-5`, section headings
`font-black text-slate-900`, result banner with status pill, tables with
`text-sm border-collapse`, `thead` `text-left text-slate-500 border-b`,
check badges as coloured pills with the assumption in `title`, download
buttons `btnCls`, primary `primaryCls`, notes box `rounded-xl border-amber-200 bg-amber-50`).

Apply to each page:
1. `/consolidation`: PO editor as cards (one per PO) with a compact carton
   rows table (same style as /order-quote's carton table) instead of stacked
   inputs; containers/LCL/rules in a right-hand card; result plans as cards
   with the container list as a table (preset, POs, cartons, util %, weight,
   checks pills) and remainder as a red-outlined line. Default example must
   complete: set the example to 2 POs of 12 + 10 cartons at 60×40×40 cm,
   12 kg, upright, and allow 20GP×1, 40GP×1, 40HQ×1 so plan 1 is
   `ALL_CARGO_PLACED: pass` (verify by running the library in a test).
2. `/box-catalog`: three numbered input cards (SKUs / history / boxes &
   billing), billing fields in a 2-col grid, results as: catalog table
   card, totals-vs-baseline table card (baseline column only when
   present), savings line as a green banner when present, per-order table
   in a scrollable card, checks pills, downloads row, then the single-order
   picker card with the 3D preview beside the form. Keep every
   `data-testid`.
3. `/receiver-profiles`: template cards in a grid (name, source badge
   with domain + verifiedAt, `template` ribbon, limits summary, "Duplicate
   as my profile" button); edit form in a card with rules as a table.
4. `/build-sheet`: input card (paste/upload/profile) then per-pallet cards:
   left = build steps table (#, sku, x/y/z, layer), right = 3D view with
   play controls; checklist below; actuals form in a bordered card; print
   button top-right. Keep print CSS.
5. All four: Helmet title/description unchanged; page intro paragraph +
   limits line like /order-quote; footer CTA row linking related tools.
Run `npm run typecheck && npm test` (must stay green — no test changes
except if a selector you did not add breaks, then fix the markup, not the
test). Then run `node tests/e2e.mjs http://127.0.0.1:4175` against
`npx vite build` + `npx vite preview --host 127.0.0.1 --port 4175` if your
sandbox allows; if not, say so. Write `docs/specs/POLISH-REPORT.md`. Do not commit.
