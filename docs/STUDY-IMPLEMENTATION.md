# Competitor study implementation — 17 October 2026

This release turns the study into a first usable workflow. It does not establish customer retention, willingness to pay, or parity with every competitor feature.

| Study item | Implemented | Remaining validation / depth |
| --- | --- | --- |
| B0 trustworthy imports | cm/mm/m/in and kg/g/lb normalization; explicit cell/header conflicts; worksheet and column selection; editable/excluded rows; remembered mapping; missing weight distinguished from zero. Quote and catalog reject missing weights; planner blocks weight exports until corrected. | Mapping review UI is on the container planner; other tools use the shared normalizer with their existing import forms. |
| B1 repeat workflow | Saved local order revisions; explicit next-order reuse clears actuals; planner loose cartons → pallet quote → built pallets in consolidation; immutable cross-device share snapshots, 1/7/30-day expiry and creator revocation. | Existing authenticated cloud plans remain available. A unified cloud project workspace and cross-device editing of actuals are not included. Local saved orders require this browser; sharing is view-by-link. |
| B2 explain trade-offs | Shows failed numerical limits and deltas, explains cargo/base/packaging; apply receiver height cap while preserving order quantities. Existing alternative solver keeps quantity changes opt-in and costs caller-supplied. | Validate suggested builds with warehouse teams; geometric screens do not certify receiver acceptance. |
| B3 crew handoff | JSON moved to advanced section; mobile-first SVG steps, print/text fallback, revision label; photos/actuals remain local and are stripped from share payloads; playback pauses offscreen or on hidden tabs. | Operator usability sessions and further layer-focused views; no collaborative photo storage. |
| B4 productive reuse | `workflow_output` marks sample vs own-order, first/next job vs revision, output kind and return bucket; repeat same output deduplicated locally. `workflow_transfer`, import stages and share revocation events. Existing export delivery instrumentation retained. | Observe live 7/30-day cohorts. Browser storage is a device proxy, not a person/team identity. Clearing storage or moving devices breaks continuity. Download/print intent does not prove shipment completion. |
| B5 catalog UX | Editable box tables with optional JSON, unknown freight rate left blank, current-vs-candidate comparison, stale results cleared after input edits. | Reusable cloud SKU/catalog library and automatic historical-order ingestion remain later work. |
| B6 commercial learning | Optional on-site pilot enquiry with fixed workflow and paid/free interest categories; confirmed server ACK before conversion; no automatic mailing-list opt-in, payment or subscription. | Five completed real jobs across three teams, second-job use, interviews and actual paid-pilot agreement require customers after launch. |
| B7 evidence-led acquisition | Updated competitor prices/sources from the 17 October primary-source study; removed unverified Cube-IQ/CubeMaster prices and SeaRates quotas; task-based links on comparison pages. | Measure qualified output and return use by landing page; no ranking or superiority claim is inferred. |

## Analytics interpretation

`workflow_output` metadata is a fixed-category string:
- `sample;carrier_csv`, `sample;build_sheet`, or `sample;actuals`.
- `own;<kind>;<first_job|next_job|revision|same_version>;<same_day|1_6d|7_29d|30d_plus>`.
- `unknown_storage;<kind>` if local deduplication storage is unavailable.

Raw order IDs, revision hashes, carton labels, measurements and photos are never sent by these events. Local history retains up to 200 entries within 90 days. Existing tracking excludes localhost, previews and webdriver; QA is not customer evidence. GA4 attribution can connect these categorical events with acquisition; first-party aggregate counts alone do not identify unique people.

## Sharing

New links use 128-bit random IDs. A separate hashed management token controls deletion; it is never returned by public GET. Legacy ten-character links remain readable. New GET responses are no-store; Cloudflare KV propagation can delay revocation across regions. Previously downloaded copies remain available to their recipients. Actual measurements, photos, crew notes and manual checklist responses are not included in build-sheet snapshots.

## Validation

Unit/regression tests cover imperial conversion, explicit conflicts, missing vs zero weight, excluded rows, repeat-output dedup, share privacy and unauthorized/authorized revocation. Existing full engine tests retain quantity conservation and placement checks. Chrome QA covers import acceptance, the 182.5/182 cm receiver-height example preserving 40 cartons, crew handoff, local actuals, and a 390 px mobile viewport. CI runs the repository's end-to-end suite before merge.

## Follow-up: workflow depth (17 October)

- B0: the reviewed worksheet/column/unit importer is now available in pallet quoting and SKU catalog entry, with domain limits and missing weights rejected before application. Quote imports preserve normalization precision. Existing quick-paste forms remain available.
- B1/B3: creators can opt into a separate crew submission link. Numeric cm/kg actuals and pallet count are submitted against the immutable revision; photos, initials and checklist responses remain local. The creator retrieves reports using the existing management capability and explicitly loads and saves a report. Reports do not overwrite the original plan. Return-to-quote carries the reviewed version and actuals. This is a cross-device feedback loop, **not** a unified team/cloud project workspace or shared SKU database.
- Crew links have separate write capabilities in the URL fragment; public view links expose neither reports nor capability secrets. Report IDs support retries; mismatching revisions, unknown pallets and invalid measurements are rejected. Reports expire with the share, and revocation blocks access. KV propagation can delay visibility/revocation; the report-count limit is a best-effort guard, not a transactional quota.
- B3: optional layer stepping groups cartons by their starting height and shows SKU quantities for the current layer. Reduced-motion preferences disable automatic playback while preserving manual steps, SVG and print. Other animations remain available.
- B5: box-catalog-v3 separates inner packing dimensions from optional outer billing dimensions, adds empty-box weight, and supports user-supplied dimension and weight rounding increments in billing units. Missing measurements are flagged. Single-order choice uses supplied total cost, falling back to billable weight when rates are absent. Carrier surcharges, labour and cushioning remain outside this estimate.
- B4: planner and catalog outputs can now be classified as sample or own job, with an explicit next-job control and local revision deduplication. Partial plans do not count as complete workflow outputs. Existing export events remain unchanged. These are device/job proxies, not unique people or mature retention rates.

Validation: workflow-depth tests cover physical billing and rounding, imperial equivalence, cost-based selection, private revision-bound reports, retries and revocation. Existing box-selection regression now asserts cost choice when a rate is supplied and weight choice when it is missing. Browser QA checks shared import precision and per-layer steps. A matched competitor solver benchmark and real operator/customer validation remain pending; this release makes no superiority or revenue claim.
