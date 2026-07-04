# DimPack3D — Accounts & Pro paywall setup (Supabase Auth + Lemon Squeezy)

The app works with **no backend** (free export gated by email lead-capture).
Follow this to switch on real accounts and a **secure**, tamper-proof Pro tier.

## Why this design is secure
Pro status lives in `public.subscriptions`, written **only** by the webhook
Edge Function (service role, bypasses RLS). Clients can *read* their own row but
never write it, so a user cannot forge Pro in devtools. `billing.ts` reads that
row; that read is the gate.

## 1. Supabase project (dedicated — do not reuse an internal DB)
1. Create a new project at supabase.com.
2. SQL editor → run `supabase/migrations/0001_billing.sql`.
3. Auth → Email: enable magic-link (OTP). Add your site URL to redirect allow-list.
4. Copy Project URL + anon key into `.env`:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## 2. Deploy the webhook
```
supabase link --project-ref <ref>
supabase functions deploy billing-webhook --no-verify-jwt
supabase secrets set LS_WEBHOOK_SECRET=<from step 3>
```
(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to functions automatically.)
The function URL is `https://<ref>.functions.supabase.co/billing-webhook`.

## 3. Lemon Squeezy
1. Create a store + a **subscription** product/variant (e.g. Pro $12/mo).
2. Copy the variant's **Buy button / checkout URL** → `.env` `VITE_LS_CHECKOUT_URL`.
3. Settings → Webhooks → add the Edge Function URL. Sign with a secret; put that
   secret in `LS_WEBHOOK_SECRET` (step 2). Subscribe to `subscription_created`,
   `subscription_updated`, `subscription_cancelled`, `subscription_expired`.
4. The checkout is opened with `checkout[custom][user_id]` (see `billing.ts`) so
   the webhook can map the purchase back to the signed-in account.

## 4. Verify
- Sign in (magic link) → Upgrade → complete a LS test purchase.
- Webhook fires → `subscriptions.status = active` for your user_id.
- Reload `/planner`: export no longer prompts; Pro shows "✓ Active".

## Switch to Paddle instead of Lemon Squeezy
Keep the table + read path. Change only: the checkout URL builder in
`billing.ts` and the signature verification in the webhook (Paddle sends a
`Paddle-Signature` header / public-key scheme). Everything else is identical.
