# Export workflow and measurement

Implementation: 2026-10-17, PR #10. Deploy the PR before expecting new events.

## Plan integrity

The planner keeps draft carton inputs separate from the last calculated plan.
Editing a draft leaves the view, weight, count and warnings on the last calculated
plan and displays an update notice. CSV, PDF, share and account save stay disabled
until **Optimise pack** is selected. Reverting the draft to the applied values
restores actions without losing hand placements. Import and vessel/overhang
changes calculate the latest inputs immediately. Shared/saved plans restore both
the applied inputs and actual boxes, including intentionally empty layouts.

The packed count now reflects manual deletions as well as automatic placements.
Export unlock stores the requested format, then uses the current plan at unlock;
it does not hold an old export callback.

## Events

| Event | Meaning |
|---|---|
| `planner_inputs_changed` | A calculated plan first becomes out of date |
| `planner_optimized` | An intentional calculation completed; meta is manual/import |
| `export_requested` | User selected CSV or PDF |
| `export_gate_viewed` | Email unlock dialog opened |
| `export_gate_dismissed` | Dialog closed via X, backdrop or Escape |
| `export_gate_unlocked` | Valid email submitted locally; not proof of server storage |
| `generate_lead` | Lead endpoint acknowledged storage |
| `lead_submit_failed` | Storage request failed; local export remains available |
| `export_artifact_opened` | Printable PDF page opened successfully |
| `export_download_triggered` | CSV download was triggered |
| `export_failed` | stale_plan, popup_blocked, render_error or download_error |

New export events and the existing `export_pdf` / `export_csv` key events carry
`export_tool` (planner/warehouse), `export_format` (pdf/csv), and failures carry
`export_reason`. Existing key events now fire only after opening/triggering the
artifact. Do not mark all intermediate funnel events as key events.

PDF opening cannot prove print-to-PDF was saved or used. Download triggering
cannot prove the file reached disk. Gate dismissal measures explicit closes;
closing a tab is reflected as a funnel drop-off without a dismissal event.
Warehouse PDF has no email gate. Pallet order exports retain their existing
`order_export` / `order_print` measurements.

Shipment labels, dimensions, email addresses and file contents are not included
in the new analytics parameters. Localhost/automated traffic remains excluded.

GA4 event-scoped custom dimensions: Export tool → `export_tool`, Export format →
`export_format`, Export failure reason → `export_reason`. These describe future
events; they do not reconstruct historical gate activity. Use a closed funnel
**export_requested → export_gate_viewed → export_gate_unlocked → export_csv/PDF**
for new gated users, and a separate request → artifact funnel for returning
unlocked users. Break down by tool/format, then compare acquisition and device.

First-party Analytics Engine: group `index1` and `blob3` to inspect outcomes.
Its counts are events, not unique users; GA4 provides user/session cohorts.

## Lead access and email delivery

Download/waitlist addresses are stored in Cloudflare KV `LEADS`, in timestamp
keys. API signups have separate companion lead rows with company/useCase.
The public `hello@dimpack3d.com` mailto link is independent of these records.
No outbound notification integration or recipient is configured by this change.

After deploying the header-auth change to `/api/stats`, manually export:

```sh
node scripts/export-leads.mjs --token-ref 'op://VAULT/ITEM/STATS_KEY_FIELD' --out /private/report-directory/dimpack-leads.csv --days 28
```

Use the exact 1Password service-account reference for the existing `STATS_KEY`;
this is not a Cloudflare API token. Do not read a cached local secret or paste a
secret into a command. The command reads 1Password once with a 25-second process
group timeout, never retries, sends the key in the Authorization header, refuses
redirects/truncated results, and writes an exclusively created mode-0600 CSV.
The parent output directory must already exist. Keep the CSV outside this repo.
This is a manual command, not an unattended/scheduled job.

CSV contains only timestamp, email, source, country, product-update opt-in,
company and use case. API keys and saved plans are excluded. Rows remain separate
to preserve repeat requests; the console shows aggregate unique-email counts.
An export email alone is not product-update consent; retain the opt-in field.

Before production deployment preserve the existing Supabase build configuration,
run release validation, and verify auth/save/share plus printable output on the
deployed URL. Local auth was not configured during development verification.
