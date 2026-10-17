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

import {subscriptionEvent} from '../_shared/billingEvent.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';

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

  const store=Deno.env.get('LS_STORE_ID'), variant=Deno.env.get('LS_VARIANT_ID');
  if(!store||!variant)return new Response('Billing product is not configured',{status:503});
  let row;
  try{row=subscriptionEvent(payload,store,variant);}catch{return new Response('Invalid subscription event',{status:400});}
  if(!row)return new Response('ignored',{status:202});

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { error } = await supabase.rpc('dp_apply_subscription_event', {event:row});

  if (error) return new Response('Subscription update failed', { status: 500 });
  return new Response('ok', { status: 200 });
});
