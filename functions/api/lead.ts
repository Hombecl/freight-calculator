/**
 * POST /api/lead — store an email lead in KV.
 * Called by the export gate and the warehouse waitlist (see entitlement.ts).
 * Read back with the private manual scripts/export-leads.mjs command.
 * Optional notification goes only to the configured internal recipient.
 */

import { queueLeadNotification, type LeadNotificationEnv } from './_leadNotification';
import { rateLimit } from './_rateLimit';
import { validLeadPurpose } from '../../src/lib/leadPurpose';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const onRequestPost: PagesFunction<LeadNotificationEnv> = async (ctx) => {
  let data: Record<string, unknown>;
  try {
    data = await ctx.request.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }

  if (!data || typeof data !== 'object' || Array.isArray(data))
    return Response.json({ error: 'body must be a JSON object' }, { status: 400 });

  const email = String(data.email ?? '').trim().slice(0, 200);
  if (!EMAIL_RE.test(email)) return new Response('bad email', { status: 400 });
  const budget = await rateLimit(ctx.env, ctx.request, [{ name: 'lead-day', limit: 50, windowSec: 86400 }]);
  if (!budget.ok) return Response.json({ error: 'Too many submissions. Please try later.' }, {
    status: 429, headers: { 'Retry-After': String(budget.retryAfter ?? 60) },
  });

  const key = `${new Date().toISOString()}_${crypto.randomUUID().slice(0, 8)}`;
  const lead = {
      email,
      source: String(data.source ?? '').slice(0, 100),
      proWaitlist: data.proWaitlist === true,
      purpose: validLeadPurpose(data.purpose),
      country: (ctx.request as { cf?: { country?: string } }).cf?.country ?? '',
      at: new Date().toISOString(),
    };
  await ctx.env.LEADS.put(key, JSON.stringify(lead));
  queueLeadNotification(ctx, lead, key);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
