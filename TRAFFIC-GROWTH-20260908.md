# Traffic growth release — 8 September 2026

Adds English and Traditional Chinese `/carton-space-calculator` routes via the existing locale system. It computes internal volume utilization, geometric empty volume and the best of six uniform-orientation grids. It does not confuse a volume ratio with physical fit or promise globally optimal mixed packing, safe stacking, cushioning removal or freight savings.

The route is linked in the shared footer and the prerender route list, which generates both sitemap language entries.

## Rendering safeguards

- Missing Chrome now fails the production build instead of succeeding with an SPA shell.
- Incomplete render runs fail before publishing a new sitemap.
- Indexable snapshots require their own single correct canonical and rendered heading; a homepage fallback fails validation.
- Removed build-date `lastmod` values. No page-modification date is better than claiming every page changed at each build.
- Removed the command that killed whatever process occupied the preview port. An occupied port must fail cleanly.

## Verification

- 6 new calculator/render-guard tests passed, now included in `npm test`.
- Existing engine tests: 45 passed; Pages Function tests passed.
- Both TypeScript projects passed typecheck; production SPA build passed.
- Built English tool rendered in connected Chrome: 18-unit grid, 66.67% utilization and 12 L unoccupied volume for the documented example.
- Full headless prerender was not executed in this session. It must run on the normal deploy machine, followed by checking all snapshot/canonical coverage. The old static sitemap is not the intended deployment artifact.
- Mobile and browser edge-case interaction checks remain incomplete after intermittent browser-tool timeouts.

## Before release

Run the full production rendering pipeline, inspect both language pages on mobile, and test blank values / quantity over capacity. Verify the deployed XML includes both new URLs, and GSC reads the larger generated sitemap. Measure impressions and tool-to-packing/planner visits for four weeks. This new topic is a hypothesis, not a search-volume or revenue forecast.
