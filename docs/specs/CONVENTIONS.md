# Build conventions for the 2026-09 product batch

Read this before any spec in this folder. These are hard rules; a PR that
violates one is rejected.

## Repo shape you must follow
- Pure logic lives in `src/lib/<name>.ts` — no React, no DOM, runs in browser,
  Node and Cloudflare Workers. Endpoints in `functions/api/<name>.ts` and pages
  in `src/pages/<Name>Page.tsx` only call the library.
- Endpoints copy the pattern in `functions/api/order-quote.ts`: CORS incl.
  `X-API-Key, Authorization`; `rateLimitKeyed()` from `./_rateLimit`; 415 on
  wrong content-type; streamed body with 413 over the limit; 400 with `field`
  on `PalletInputError`; GET returns `{endpoint, purpose, request: <example>,
  limits, response, semantics, docs}`; response includes `tier` and, when a
  key was invalid, `warning`.
- Register each new endpoint's anonymous limits in
  `src/lib/apiTiers.ts` `ENDPOINT_BASE_LIMITS` and a label in
  `src/pages/ApiPricingPage.tsx` `ENDPOINT_LABEL`.
- Every response with a plan carries `checks[]` from `src/lib/packChecks.ts`
  semantics: `{code, status: pass|fail|warn|not_evaluated, observed?, limit?,
  ids?, assumption}`; `not_evaluated` is returned, never omitted; plus
  `semantics: CHECK_SEMANTICS`; plus `engineVersion` and `inputHash`
  (SHA-256 via `crypto.subtle`, see `src/lib/orderQuote.ts inputHash`).
- Never silently drop cargo, relax a limit, or present a heuristic result as
  a minimum/optimum. Wording: "best option found", "estimate", "screening".
- Pages: bilingual via `const { lang } = useApp(); const T = (en, zh) => …`
  (Traditional Chinese, Cantonese register like the rest of the site).
  `<Helmet>` title + meta description. Register in `src/App.tsx` (lazy
  import + `<Route>` inside `<Layout>`), `scripts/release-routes.mjs`
  `BASE_ROUTES`, `src/components/layout/Footer.tsx`, and add a section to
  `public/llms.txt`. Add a `/api-docs` section for each endpoint.
- Track events with `track('<snake_case>', meta?)` from `src/lib/track`.
- 3D: reuse `src/components/PalletEstimateView.tsx` (has step-by-step build
  animation via `buildSteps`) for pallets and `InteractiveLoadPlanner` for
  containers. Do not write a new renderer. Expose `data-testid` counts
  (e.g. `data-testid="placed-count"`) so tests can compare the rendered
  count to the plan.
- Units: cm/kg internally; accept `units: 'cm-kg' | 'in-lb'` like
  `orderQuote.ts` and return both (`{cm, in}` / `{kg, lb}`).
- Tests: `tests/<name>.mjs` (node:assert, tsx) added to `package.json`
  `scripts.test` with `&& tsx tests/<name>.mjs`. Must cover: happy path,
  every `status` branch, validation (each field), determinism (same input →
  same hash and result), conservation (every requested unit accounted for),
  geometry (no overlaps, inside bounds), and the endpoint (200/400/413/415).
  Add ≥1 e2e test in `tests/e2e.mjs` before the `i18n: /zh homepage` test,
  using `getByTestId` where possible.
- Copy discipline: pricing/rules from third parties must cite source + date
  in the data file (`source`, `verifiedAt`); anything not verified is
  labelled `template: true` and rendered with a "verify with your buyer"
  note. No fabricated tariffs, fees or fines.
- Do NOT: commit, push, deploy, edit `scripts/prerender.mjs`, touch
  `.env`/secrets, add dependencies, or change existing endpoint contracts
  (add fields only).
- Finish by running `npm run typecheck && npm test` and fixing until green.
  Then write `docs/specs/<nn>-REPORT.md`: what was built (files), how each
  requirement was met, test counts, known limits, and anything you skipped
  and why.
