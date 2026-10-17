# Team workspace release — 18 October 2026

## Implemented scope

`/workspace` and `/zh/workspace` provide authenticated shared cargo lists, receiver profiles, and order inputs with immutable revisions. Owners create single-use, seven-day invitations for editors or viewers and revoke invitations/member access. A new job creates a new record; a revision keeps its record identity. PostgreSQL serializes revision writes and rejects stale version numbers. Existing personal plans remain private.

Order Quote saves directly to the team, including selected receiver profile and original units/packing limits. Cargo lists can be reused in a new order; receiver profiles can be opened in their editor. Opening a cloud order restores the selected version ahead of local same-name data. Cargo/actual measurements and photos are different data: this release uploads planning inputs only. Crew photos, notes and actual measurements stay local. This is not simultaneous collaborative editing or a shared photo archive.

Security validation: `tests/sql/workspace.sql` executes tenant isolation, owner/editor/viewer access, revocation, single-use invitation, immutable revision and stale-write assertions under authenticated roles. It rolls back every fixture. `dp_private` holds narrowly scoped authorization functions; public RPCs are invoker functions. Only `dp_*` app tables are changed in the shared commerce project.

## Measurement and proof

`scripts/workspace-metrics.sql` counts teams saving self-classified own jobs, distinct second jobs and eligible 7/30-day cohorts. Revisions are not counted as new jobs. These are planning events, not verified shipments, unique companies or payments. Browser analytics use fixed categories; no job names, member IDs or invitation tokens are sent.

Removed the assumed 70%/$3,000-per-container freight-savings claim from My Plans. No customer savings are invented from utilization alone.

Run `npx tsx scripts/benchmark-workflows.mjs <output-directory>` for six reproducible input/CSV cases, quantity conservation, placement bounds and overlap checks. The scorecard explicitly leaves competitor results unmeasured. Fair competitor runs must preserve equipment dimensions, base height, weight, rotation, stack and receiver constraints, then record completion time, errors and output usefulness. No competitive superiority is claimed until matched outputs exist.

## Billing readiness

Cancellation keeps access until the provider's `ends_at`. Signed webhook processing accepts subscription objects only, rejects test-mode/other-product events, and applies updates atomically in provider timestamp order. Duplicate/older notifications cannot overwrite newer state. Public clients cannot call the billing writer. Unit fixtures and rolled-back SQL verify these rules.

The payment webhook was absent from the live project's function list before this release. Activation requires `LS_WEBHOOK_SECRET`, `LS_STORE_ID`, `LS_VARIANT_ID`, and the actual checkout product. Frontend checkout remains disabled until both its URL and `VITE_BILLING_VERIFIED=true` are configured after provider sandbox purchase → entitlement → cancellation → expiry and refund reconciliation pass. Do not set the flag merely because unit tests pass. A refund is not the same object as a subscription; refund events are deliberately not treated as subscription updates. Refund policy and provider reconciliation still need a real merchant configuration.

Reference: https://docs.lemonsqueezy.com/api/subscriptions/the-subscription-object

## Commercial acceptance

The first milestone remains three paying teams with a second real job each. A trial, enquiry, export, active subscription row or saved job does not prove that milestone. Validate price with actual customers; do not advertise hypothetical $49/month as an approved price. Compare settled receipts minus refunds, payment fees, infrastructure and support cost. A complete ERP/WMS is not a prerequisite.

No customer outreach, automatic marketing enrolment, real charge or refund is performed by this release.
