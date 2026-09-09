# Pallet height release validation

- Existing 45 engine/import/pallet-chain tests and analytics function tests pass.
- 11 new groups cover known height, partial loads, payload, no-stack, oversize, allowed rotations, determinism, geometry/support invariants on 18 mixed orders, strict numeric validation, API parity, HTTP/body/rate-limit behavior.
- Local Workers runtime (Wrangler 4.130.0) compiles all Pages Functions. POST /api/pallet-estimate returns HTTP 200, complete, 12 cartons, 105 cm for a known three-layer order.
- Typecheck covers browser and Pages Functions. Vite SPA build passes.
- Chrome: desktop rendering, sample (20 cartons, 125 cm), partial load at 70 cm cap (12 placed, 8 remaining), view turn, spreadsheet paste, API check matching the browser plan, fractional quantity error, and 390 px iframe layout checked. Browser viewport override did not change actual width, so the narrow check used an actual 390 px document in a temporary same-origin iframe.
- Full production prerender/deployment and physical warehouse validation are still required before a public release claim. This branch does not merge or deploy open PR #1.
- Local Wrangler flags an existing SPA redirect rule as an infinite loop; it ignores that rule. The affected route loads through local fallback, but production redirects/prerender need release verification.
