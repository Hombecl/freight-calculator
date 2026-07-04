import { supabase } from './supabaseClient';

/**
 * billing.ts — Lemon Squeezy (merchant-of-record) integration, client side.
 *
 * Flow:
 *   1. user signs in (Supabase Auth) → we have their user id + email
 *   2. "Upgrade" opens a Lemon Squeezy hosted checkout, passing the user id as
 *      custom data so the webhook can map the purchase back to the account
 *   3. Lemon Squeezy calls our Edge Function webhook (supabase/functions/
 *      billing-webhook) which verifies the signature and upserts the row in
 *      `subscriptions` (service role; RLS lets the user read only their own)
 *   4. isProActive() reads that row — this is the SECURE gate (a user cannot
 *      forge it because only the webhook can write it)
 *
 * To switch to Paddle: keep this file, change the checkout URL builder and the
 * webhook's signature check; the `subscriptions` table + read path are identical.
 */

const LS_CHECKOUT = (import.meta as any).env?.VITE_LS_CHECKOUT_URL as string | undefined;

export interface Subscription {
  status: string; // active | on_trial | past_due | cancelled | expired | ...
  plan: string | null;
  current_period_end: string | null;
}

const ACTIVE = new Set(['active', 'on_trial', 'past_due']);

/** Read the signed-in user's subscription. Null if not signed in / none. */
export async function fetchSubscription(): Promise<Subscription | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  // dp_ prefix: DimPack3D tables live in the shared commerce-ops SG project (DATA.md)
  const { data, error } = await supabase
    .from('dp_subscriptions')
    .select('status, plan, current_period_end')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data as Subscription;
}

export function isActive(sub: Subscription | null): boolean {
  return !!sub && ACTIVE.has(sub.status);
}

/** Build the Lemon Squeezy checkout URL with the account id attached. */
export function checkoutUrl(userId: string, email: string): string | null {
  if (!LS_CHECKOUT) return null;
  const u = new URL(LS_CHECKOUT);
  // Lemon Squeezy passes checkout[custom][*] through to the webhook
  u.searchParams.set('checkout[custom][user_id]', userId);
  u.searchParams.set('checkout[email]', email);
  return u.toString();
}
