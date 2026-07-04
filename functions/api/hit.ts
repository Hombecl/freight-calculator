/**
 * POST /api/hit — first-party, cookie-less event collector.
 * Body: { e: eventName, p?: path, r?: referrer, m?: meta }
 * Each event is one KV record with a 90-day TTL; aggregate via /api/stats.
 */

interface Env {
  LEADS: KVNamespace;
}

const EVENT_RE = /^[a-z0-9_-]{1,40}$/;

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let data: Record<string, unknown>;
  try {
    data = await ctx.request.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }

  const e = String(data.e ?? '');
  if (!EVENT_RE.test(e)) return new Response('bad event', { status: 400 });

  const key = `ev_${new Date().toISOString()}_${crypto.randomUUID().slice(0, 8)}`;
  await ctx.env.LEADS.put(
    key,
    JSON.stringify({
      e,
      p: String(data.p ?? '').slice(0, 120),
      r: String(data.r ?? '').slice(0, 160),
      m: String(data.m ?? '').slice(0, 80),
      c: (ctx.request as { cf?: { country?: string } }).cf?.country ?? '',
    }),
    { expirationTtl: 60 * 60 * 24 * 90 },
  );

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
