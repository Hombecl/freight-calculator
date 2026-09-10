/**
 * POST /api/key — self-serve API key issuance.
 *
 * Why: the first real inbound API request (a warehouse-automation engineer,
 * 2026-09-09) asked "what might be needed to try this out?" — and the honest
 * answer was "nothing, but you'll share a rate-limit bucket with your whole
 * office". A key moves the bucket to the caller and raises the ceiling 5x.
 * It is also the lead-capture point for the paid tiers (see /api-pricing).
 *
 * Body: { email, company?, useCase? }  → { key, tier, limits, docs }
 * The key is shown ONCE; we store only its record, no email is sent (no mail
 * infrastructure yet — the page tells the user to save it).
 *
 * Abuse control: 5 keys per IP per day. Keys live in the same LEADS KV as
 * `apikey|<key>`; a lead row is written too so the existing lead tooling
 * (wrangler kv key list) sees API signups next to export/waitlist leads.
 */

import { API_KEY_PREFIX, ENDPOINT_BASE_LIMITS, planFor } from '../../src/lib/apiTiers';
import { apiKeyKvKey, rateLimit, tooManyRequests, type ApiKeyRecord, type RateLimitEnv } from './_rateLimit';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOCS = 'https://www.dimpack3d.com/api-pricing';

export const limitsForTier = (tier: ApiKeyRecord['tier']) => {
  const m = planFor(tier).multiplier;
  return Object.fromEntries(
    Object.entries(ENDPOINT_BASE_LIMITS).map(([ep, b]) => [ep, { perMin: b.perMin * m, perDay: b.perDay * m }]),
  );
};

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers: CORS });

export const onRequestGet: PagesFunction = async () =>
  json({
    endpoint: 'POST /api/key',
    request: { email: 'you@company.com', company: 'Acme Logistics', useCase: 'pallet height at order time' },
    response: { key: 'dp_live_<32 hex>', tier: 'free', limits: limitsForTier('free') },
    usage: 'Send the key as X-API-Key: <key> (or Authorization: Bearer <key>) on /api/pack, /api/pallet-estimate, /api/order-plan.',
    docs: DOCS,
  });

export const onRequestPost: PagesFunction<RateLimitEnv> = async (ctx) => {
  const rl = await rateLimit(ctx.env, ctx.request, [{ name: 'key', limit: 5, windowSec: 86_400 }]);
  if (!rl.ok) return tooManyRequests(rl, CORS, DOCS);

  let data: Record<string, unknown>;
  try {
    data = await ctx.request.json();
  } catch {
    return json({ error: 'body must be JSON' }, 400);
  }
  const email = String(data.email ?? '').trim().slice(0, 200);
  if (!EMAIL_RE.test(email)) return json({ error: 'valid email required' }, 400);
  const company = String(data.company ?? '').trim().slice(0, 120);
  const useCase = String(data.useCase ?? '').trim().slice(0, 300);
  if (!ctx.env?.LEADS) return json({ error: 'key storage not configured' }, 503);

  const key = API_KEY_PREFIX + hex(crypto.getRandomValues(new Uint8Array(16)));
  const now = new Date().toISOString();
  const record: ApiKeyRecord = { email, tier: 'free', company, useCase, createdAt: now };
  const country = (ctx.request as { cf?: { country?: string } }).cf?.country ?? '';

  await Promise.all([
    ctx.env.LEADS.put(apiKeyKvKey(key), JSON.stringify(record)),
    // same shape as /api/lead so `wrangler kv key list` shows API signups inline
    ctx.env.LEADS.put(
      `${now}_${key.slice(-8)}`,
      JSON.stringify({ email, source: 'api-key', proWaitlist: false, company, useCase, country, at: now }),
    ),
  ]);

  return json({ key, tier: 'free', limits: limitsForTier('free'), header: 'X-API-Key', docs: DOCS });
};
