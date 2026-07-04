// Lemon Squeezy billing webhook — Supabase Edge Function (Deno).
//
// Verifies the HMAC-SHA256 signature, then upserts the caller's subscription
// row using the SERVICE ROLE (bypasses RLS). This is the only writer of
// public.subscriptions, which is what makes the Pro gate tamper-proof.
//
// Deploy:  supabase functions deploy billing-webhook --no-verify-jwt
// Secrets: supabase secrets set LS_WEBHOOK_SECRET=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
// Then set this function's URL as the webhook target in Lemon Squeezy, and make
// sure the checkout passes checkout[custom][user_id].

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const enc = new TextEncoder();

async function verify(secret: string, body: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  // constant-time-ish compare
  if (hex.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

const ACTIVE = new Set(['active', 'on_trial', 'past_due', 'paused']);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const secret = Deno.env.get('LS_WEBHOOK_SECRET') ?? '';
  const signature = req.headers.get('X-Signature') ?? '';
  const raw = await req.text();

  if (!secret || !(await verify(secret, raw, signature))) {
    return new Response('invalid signature', { status: 401 });
  }

  let payload: any;
  try { payload = JSON.parse(raw); } catch { return new Response('bad json', { status: 400 }); }

  const eventName: string = payload?.meta?.event_name ?? '';
  const custom = payload?.meta?.custom_data ?? {};
  const attrs = payload?.data?.attributes ?? {};
  const userId: string | undefined = custom.user_id;
  if (!userId) return new Response('no user_id', { status: 202 }); // ack, nothing to map

  // derive status
  let status = attrs.status ?? 'none';
  if (eventName === 'subscription_expired' || eventName === 'subscription_cancelled') {
    // LS still reports status; keep as reported. cancelled stays active until period end.
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { error } = await supabase.from('dp_subscriptions').upsert({
    user_id: userId,
    email: attrs.user_email ?? null,
    status: ACTIVE.has(status) ? status : status,
    plan: attrs.product_name ?? attrs.variant_name ?? null,
    ls_subscription_id: String(payload?.data?.id ?? ''),
    ls_customer_id: String(attrs.customer_id ?? ''),
    current_period_end: attrs.renews_at ?? attrs.ends_at ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  if (error) return new Response(`db error: ${error.message}`, { status: 500 });
  return new Response('ok', { status: 200 });
});
