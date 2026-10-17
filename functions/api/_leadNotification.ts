import { rateLimitSubject } from './_rateLimit';
import { LEAD_PURPOSES, type LeadPurpose } from '../../src/lib/leadPurpose';

export interface LeadRecord {
  email: string;
  source: string;
  proWaitlist: boolean;
  country: string;
  at: string;
  company?: string;
  useCase?: string;
  purpose?: LeadPurpose;
}

export interface LeadNotificationEnv {
  LEADS: KVNamespace;
  RESEND_API_KEY?: string;
  LEAD_NOTIFY_TO?: string;
  LEAD_NOTIFY_FROM?: string;
}

const TTL = 30 * 86400;
const sources: Record<string, string> = {
  'planner-export': 'Planner export', 'pro-waitlist': 'Product updates',
  'warehouse-beta': 'Warehouse beta', 'api-key': 'API signup',
};

/** Fixed internal recipient only. Giving an email never subscribes a customer to mail. */
export async function notifyLead(env: LeadNotificationEnv, lead: LeadRecord, leadKey: string): Promise<void> {
  if (!env.RESEND_API_KEY || !env.LEAD_NOTIFY_TO || !env.LEAD_NOTIFY_FROM) return;
  const statusKey = `notify|${leadKey}`;
  const status = async (state: string, detail: Record<string, string> = {}) => env.LEADS.put(statusKey,
    JSON.stringify({ status: state, at: new Date().toISOString(), ...detail }), { expirationTtl: TTL });
  try {
    const source = Object.hasOwn(sources, lead.source) ? lead.source : 'other';
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(lead.email.trim().toLowerCase()));
    const digest = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
    const dedupKey = `notify-sent|${lead.at.slice(0, 10)}|${source}|${digest}`;
    if (await env.LEADS.get(dedupKey)) { await status('duplicate'); return; }
    // Bound sustained notification volume. KV is eventually consistent, so this
    // is a cost cap, not an exact distributed lock. Every lead is still retained.
    const budget = await rateLimitSubject(env, 'lead-notify', [{ name: 'notify-day', limit: 50, windowSec: 86400 }]);
    if (!budget.ok) { await status('daily_limit'); return; }
    await status('pending');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json',
        'Idempotency-Key': `dimpack-lead/${leadKey}` },
      body: JSON.stringify({
        from: env.LEAD_NOTIFY_FROM, to: [env.LEAD_NOTIFY_TO],
        subject: `DimPack3D — ${sources[source] ?? 'New enquiry'}`,
        text: [
          'A new DimPack3D lead was saved.', `Time: ${lead.at}`, `Email: ${lead.email}`,
          `Source: ${lead.source}`, `Country: ${lead.country || 'Unknown'}`,
          `Product-update opt-in: ${lead.proWaitlist ? 'Yes' : 'No'}`,
          ...(lead.purpose ? [`Plan purpose: ${LEAD_PURPOSES.find(([key]) => key === lead.purpose)?.[1] ?? lead.purpose}`] : []),
          ...(lead.company ? [`Company: ${lead.company}`] : []),
          ...(lead.useCase ? [`Requested use: ${lead.useCase}`] : []),
          '', 'Internal notification only. A download is not a confirmed sale.',
          'Do not add this address to product-update mail unless the opt-in above is Yes.',
        ].join('\n'),
      }),
    });
    if (!response.ok) { await status('failed', { reason: `provider_http_${response.status}` }); return; }
    const sent = await response.json() as { id?: string };
    if (!sent.id) { await status('failed', { reason: 'provider_missing_id' }); return; }
    await env.LEADS.put(dedupKey, sent.id, { expirationTtl: 2 * 86400 });
    await status('accepted', { providerId: sent.id });
  } catch {
    // Export and lead capture must still work when the provider is unavailable.
    await status('failed', { reason: 'notification_error' }).catch(() => {
      console.warn('DimPack3D lead notification status could not be persisted');
    });
  }
}

export function queueLeadNotification(ctx: { env: LeadNotificationEnv; waitUntil: (promise: Promise<unknown>) => void }, lead: LeadRecord, key: string) {
  if (ctx.env.RESEND_API_KEY && ctx.env.LEAD_NOTIFY_TO && ctx.env.LEAD_NOTIFY_FROM)
    ctx.waitUntil(notifyLead(ctx.env, lead, key));
}
