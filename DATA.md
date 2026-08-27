# DimPack3D — Data Location Map

_⛔ Read this before touching any backend data. Last updated 2026-08-28._

## Supabase — SHARED project (temporary arrangement)

DimPack3D deliberately does **not** have its own Supabase project yet (to avoid
another paid project). It shares the **commerce-ops SG** project:

- Project ref: `iaglkklgzykowzqgphym` (https://iaglkklgzykowzqgphym.supabase.co)
- That project's primary tenant is the commerce-ops app (ops.nuxec.com) —
  its tables (organizations, orders, ecomm_*, stock_*, …) are **NOT ours**.

**Rule: every DimPack3D table uses the `dp_` prefix. DimPack3D code may touch
`dp_*` tables ONLY.**

| Table | Purpose | Writes |
|---|---|---|
| `dp_plans` | Saved load plans (workspace/Tier 1) | Signed-in user (RLS: own rows only) |
| `dp_subscriptions` | Pro billing status | Billing webhook only (service role); users read own row |

Shared-project caveats:
- `auth.users` is shared with commerce-ops — DimPack3D magic-link users live in
  the same pool. Acceptable for now; migrate when DimPack3D gets its own project.
- Auth config is shared: we only APPEND to `uri_allow_list`
  (`https://dimpack3d.com/**`, `https://www.dimpack3d.com/**`). ⛔ Never change
  `site_url` — it belongs to commerce-ops.
- Migration applied 2026-07-04: `dimpack3d_dp_plans_and_billing` (also in
  `supabase/migrations/0001_billing.sql`, kept in sync).

When DimPack3D justifies its own project: create it, run the migrations, copy
`dp_*` rows, update `.env`, remove the allow-list entries — everything DimPack3D
is under the `dp_` prefix so the extraction is mechanical.

## Cloudflare KV — namespace `LEADS` (id `13e65133a1414b1ebe5d125d38d43eb8`)

Bound to the `dimpack3d` Pages project (wrangler.toml). Key patterns:

| Key pattern | Content |
|---|---|
| `<ISO-date>_<rand>` | Email leads (export gate, waitlists) |
| `ev_…` / `ev2|…` | Legacy analytics events (90-day TTL; no new writes after the Analytics Engine migration) |
| `share_<10-char-id>` | Shared load plans (1-year TTL) |

`GET /api/stats?k=<key>` continues to return leads, shares, and the legacy KV
event window. The key is at `~/.dimpack3d-stats-key` (local only), Pages secret
`STATS_KEY`.

## Cloudflare Analytics Engine — dataset `dimpack3d_events`

Current `/api/hit` usage events are stored as:

| Field | Content |
|---|---|
| `index1` | Event name |
| `blob1` | Page path |
| `blob2` | Referrer hostname |
| `blob3` | Event metadata |
| `blob4` | Coarse country code |
| `double1` | `1` (event count) |

Use the account's Analytics Engine SQL console with the queries in
`scripts/analytics.sql`. Event requests are batched in the browser and protected
by the native `HIT_RATE_LIMITER`; neither operation uses Workers KV.

## Local build secrets

`.env` (gitignored): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — baked into
the bundle at build time; anon key is public by design (RLS enforces access).
