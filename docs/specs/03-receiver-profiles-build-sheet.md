# 03 — Receiver check profiles + crew build sheet with measured actuals

## Outcome sold
A supplier shipping repeatedly to the same buyer (retailer DC, Amazon FBA,
3PL) keeps a **versioned, customer-approved check profile** and gets, for
every order: (a) the pallet plan screened against that profile, (b) a
crew-facing build sheet, (c) a place to record what was actually built —
so rework and rebills fall and there is evidence when they don't. Buyer:
retail compliance manager / shipping supervisor. Dollar event: a rebuilt
pallet + redelivery.

**Not** a rule directory, **not** acceptance or chargeback prediction.
Public routing guides are *starting templates* the customer must confirm.

## Data `src/data/receiverProfiles.json`
```json
{ "profiles": [ {
  "id": "amazon-fba-us", "name": "Amazon FBA (US) pallet", "template": true,
  "source": "https://sellercentral.amazon.com/help/hub/reference/external/G201750310", "verifiedAt": "2026-09-11",
  "pallet": { "l": 121.92, "w": 101.6, "baseHeight": 14.5 },
  "limits": { "maxLoadedHeight": 182.88, "maxGrossWeight": 680, "overhangCm": 0, "clampable": false },
  "rules": [ { "code": "NO_OVERHANG", "text": "Cartons must not overhang the pallet edge", "check": "overhang" },
             { "code": "GMA_PALLET", "text": "40×48 in 4-way GMA pallet", "check": "footprint" },
             { "code": "MAX_HEIGHT_72IN", "text": "72 in including pallet", "check": "height" },
             { "code": "MAX_WEIGHT_1500LB", "text": "1,500 lb including pallet", "check": "gross" },
             { "code": "LABELS_4_SIDES", "text": "Pallet label on all four sides", "check": "manual" } ]
} ] }
```
Ship exactly these templates, each with `source` + `verifiedAt` from the
public page you actually open (WebFetch/curl the URL; if a value cannot be
verified from the page, omit it and add `"unverified": ["field"]`):
`amazon-fba-us`, `ltl-standard-us` (generic 48×40, 72 in, no overhang —
mark `template: true`, source "common carrier practice, verify"),
`eur-retail-dc` (EUR 120×80, 180 cm, 1,000 kg gross — template), plus a
`custom` profile the user fills in. **Only fields with a `check` of
`height|gross|footprint|overhang|stack|upright` are evaluated; `manual`
rules render as a checklist the crew ticks.** Do not add Walmart/Target/
Costco numbers unless you fetched and cite the page.

## Library `src/lib/receiverProfiles.ts`
- `loadProfiles()`, `profileToQuoteLimits(profile)` → `limits` +
  `pallet` for `quoteOrder`; `evaluateProfile(quote: OrderQuote, profile)`
  → `checks[]` with one entry per rule (`check: 'manual'` → status
  `not_evaluated`, assumption "crew confirms on the build sheet"),
  `profileVersion` (hash of the profile JSON), `approvedBy?`, `approvedAt?`.
- Custom profiles persist in localStorage (`dp_receiver_profiles`), with
  an "approved by / date" field the user fills — the approval is the
  customer's, we only record it.

## Endpoint `functions/api/receiver-check.ts`
`POST { profileId | profile, ...OrderQuoteRequest }` → `quoteOrder` result +
`profile: {id, name, version, template, source, verifiedAt}` +
`profileChecks[]` + `status` (needs_review if any evaluated rule fails).
GET lists shipped templates (id, name, source, verifiedAt, limits).
10/min, 100/day anon.

## Pages
### `/receiver-profiles` (+zh) `src/pages/ReceiverProfilesPage.tsx`
List templates with source/date badge, "Duplicate as my profile" → edit
form (pallet, limits, rules incl. manual ones, approved by/date), save
locally, export/import JSON. Big note: templates must be confirmed with
the buyer; `template: true` shows a "verify with your buyer" ribbon.
### `/build-sheet` (+zh) `src/pages/BuildSheetPage.tsx`
Input: an order-quote result JSON (paste/upload, or carried via
`sessionStorage` from /order-quote "Open build sheet" button) + profile.
Renders, per pallet: step-by-step build list (`buildSteps`), the 3D
`PalletEstimateView` with animation, profile rule checklist (evaluated
rules pre-marked, manual rules as checkboxes), and a **measured actuals**
form: loaded height, gross weight, actual pallet count, photo (stored as
data URL in localStorage under the orderId — no upload), crew initials,
timestamp. "Save actuals" writes `actuals` back into the stored quote
(`dp_quote_<orderId>`) so /order-quote shows variance. Print stylesheet
(`print:` classes like other pages) → one page per pallet.
`data-testid="sheet-placed-count"` = cartons rendered.
### Wire `/order-quote`
Profile selector (templates + custom) that fills `pallet` + `limits` and
appends `profileChecks[]` to the result; "Open build sheet" button.

## Tests `tests/receiver-profiles.mjs`
Every shipped template has `source` + `verifiedAt` and parses; evaluated
rules map to the right check codes; manual rules → not_evaluated; a plan
over the FBA height → needs_review with the rule code; profileVersion
changes when any field changes; endpoint 200/400/404(unknown profileId)/413/415.
e2e: /receiver-profiles lists templates with a source badge; /build-sheet
loads a stored quote from sessionStorage, shows N build steps for pallet 1
equal to its carton count, saving actuals updates the stored quote.
