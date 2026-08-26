/**
 * POST /api/hit — first-party, cookie-less event collector.
 * Body: { e: eventName, p?: path, r?: referrer, m?: meta }
 * Each event is one KV record with a 90-day TTL; aggregate via /api/stats.
 *
 * Key format (v2): everything /api/stats needs is encoded in the KEY so
 * aggregation works from list() alone — per-key get() at scale blew past
 * the Workers KV per-invocation op budget and 524'd the stats endpoint.
 *   ev2|<YYYY-MM-DD>|<e>|<enc p>|<enc r>|<enc m>|<country>|<time+rand>
 * Fields are encodeURIComponent'd (| encodes to %7C, so it is a safe
 * delimiter) and length-capped to stay under the 512-byte key limit.
 *
 * ⛔ Rate limited per IP. This endpoint is unauthenticated and WRITES a KV
 * record on every call with a 90-day TTL, so unbounded traffic does not just
 * burn invocations — it bloats the namespace and consumes write quota for three
 * months per entry. That is a larger exposure than /api/pack, which is
 * read-mostly compute.
 *
 * Limits are deliberately generous: a genuinely active session fires a pageview
 * per route change plus tool/CTA events, so a real user can legitimately send
 * dozens of hits in a few minutes. Losing analytics from a shared NAT/CGNAT
 * egress is the accepted trade — dropped hits are far cheaper than unbounded
 * writes, and track() is fire-and-forget so a 429 is silently ignored client
 * side (see src/lib/track.ts — sendBeacon, no retry).
 */

import { rateLimit, type RateLimitEnv } from './_rateLimit';

const RATE_RULES = [
  { name: 'hit', limit: 120, windowSec: 60 },       // burst: 120/min
  { name: 'hit', limit: 3000, windowSec: 86_400 },  // sustained: 3,000/day
];

interface Env extends RateLimitEnv {
  LEADS: KVNamespace;
}

const EVENT_RE = /^[a-z0-9_-]{1,40}$/;

const enc = (s: unknown, max: number) => {
  let e = encodeURIComponent(String(s ?? '').slice(0, max));
  if (e.length > max + 60) e = e.slice(0, max + 60).replace(/%[0-9A-Fa-f]?$/, ''); // never cut mid-escape
  return e;
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  // Check BEFORE parsing/writing. Analytics is fire-and-forget, so the response
  // body does not matter — but the KV write it prevents is the whole point.
  const rl = await rateLimit(ctx.env, ctx.request, RATE_RULES);
  if (!rl.ok) {
    return new Response(JSON.stringify({ ok: false, error: 'rate limited' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfter ?? 60) },
    });
  }

  let data: Record<string, unknown>;
  try {
    data = await ctx.request.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }

  const e = String(data.e ?? '');
  if (!EVENT_RE.test(e)) return new Response('bad event', { status: 400 });

  const now = new Date().toISOString();
  const country = (ctx.request as { cf?: { country?: string } }).cf?.country ?? '';
  const key = [
    'ev2',
    now.slice(0, 10),
    e,
    enc(data.p, 100),
    enc(data.r, 60),
    enc(data.m, 40),
    country,
    now.slice(11, 23) + crypto.randomUUID().slice(0, 6),
  ].join('|');

  await ctx.env.LEADS.put(key, '1', { expirationTtl: 60 * 60 * 24 * 90 });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
