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
 */

interface Env {
  LEADS: KVNamespace;
}

const EVENT_RE = /^[a-z0-9_-]{1,40}$/;

const enc = (s: unknown, max: number) => {
  let e = encodeURIComponent(String(s ?? '').slice(0, max));
  if (e.length > max + 60) e = e.slice(0, max + 60).replace(/%[0-9A-Fa-f]?$/, ''); // never cut mid-escape
  return e;
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
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
