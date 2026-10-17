/**
 * entitlement.ts — free / pro gating for the planner.
 *
 * ⚠️ IMPORTANT: this is a CLIENT-SIDE gate (localStorage). It is a lead-capture
 * + UX layer, NOT a secure paywall — anyone can bypass it in devtools. Real
 * enforcement requires a backend that verifies a session/subscription
 * (Supabase Auth + Stripe/Paddle, or Cloudflare Workers). The provider shape
 * below is deliberately swappable so that backend can drop in later without
 * touching the UI: replace read/canExport with a server check.
 */

import { track } from './track';

export type Plan = 'free' | 'pro';

export interface Entitlement {
  plan: Plan;
  email?: string;
  capturedAt?: string;
  proWaitlist?: boolean;
}

const KEY = 'dimpack_entitlement';
// lead sink — defaults to the same-origin Pages Function (functions/api/lead.ts,
// stores to KV). Override with VITE_LEAD_ENDPOINT if needed. Fire-and-forget,
// so localhost dev (where /api/lead doesn't exist) fails silently.
const LEAD_ENDPOINT: string =
  ((import.meta as any).env?.VITE_LEAD_ENDPOINT as string | undefined) ?? '/api/lead';

export function readEntitlement(): Entitlement {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Entitlement;
  } catch { /* ignore */ }
  return { plan: 'free' };
}

function write(e: Entitlement) {
  try { localStorage.setItem(KEY, JSON.stringify(e)); } catch { /* ignore */ }
}

/** Free users unlock export by giving an email; pro is always allowed. */
export function canExport(e: Entitlement = readEntitlement()): boolean {
  return e.plan === 'pro' || !!e.email;
}

export function captureLead(
  email: string, opts: { proWaitlist?: boolean; source?: string } = {},
): Entitlement {
  const e: Entitlement = {
    ...readEntitlement(),
    email,
    capturedAt: new Date().toISOString(),
    proWaitlist: opts.proWaitlist ?? readEntitlement().proWaitlist,
  };
  write(e);
  if (LEAD_ENDPOINT) {
    const source = opts.source ?? 'planner-export';
    const trackedSource = ['planner-export', 'pro-waitlist', 'warehouse-beta'].includes(source) ? source : 'other';
    // fire-and-forget; never blocks the UI
    fetch(LEAD_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, proWaitlist: e.proWaitlist, source: opts.source ?? 'planner-export' }),
    }).then(async (response) => {
      // Unlocking a local export is not proof that we received a lead.
      if (!response.ok || (await response.json()).ok !== true) throw new Error('Lead not acknowledged');
      track('generate_lead', trackedSource);
    }).catch(() => { track('lead_submit_failed', trackedSource); });
  }
  return e;
}

/** Dev/back-office only until a real payment backend is wired. */
export function setPlan(plan: Plan): Entitlement {
  const e = { ...readEntitlement(), plan };
  write(e);
  return e;
}
