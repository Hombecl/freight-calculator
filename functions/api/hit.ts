/**
 * POST /api/hit — first-party, cookie-less event collector.
 * Body: { e, p?, r?, m? } or { events: [{ e, p?, r?, m? }] }.
 *
 * Usage telemetry belongs in Analytics Engine, not Workers KV. A batch costs
 * one Pages Function request and writes no KV records. LEADS remains reserved
 * for user-created leads and share links.
 */

interface Env {
  ANALYTICS: AnalyticsEngineDataset;
  HIT_RATE_LIMITER: RateLimit;
}

interface Hit {
  e: string;
  p: string;
  r: string;
  m: string;
}

const EVENT_RE = /^[a-z0-9_-]{1,40}$/;
const MAX_BATCH = 20;

const clean = (value: unknown, max: number) => String(value ?? '').slice(0, max);

function parseHit(value: unknown): Hit | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const e = clean(record.e, 40);
  if (!EVENT_RE.test(e)) return null;
  return {
    e,
    p: clean(record.p, 100),
    r: clean(record.r, 60),
    m: clean(record.m, 40),
  };
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const ip = ctx.request.headers.get('CF-Connecting-IP');
  if (ip) {
    const { success } = await ctx.env.HIT_RATE_LIMITER.limit({ key: ip });
    if (!success) {
      return new Response(JSON.stringify({ ok: false, error: 'rate limited' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }
  }

  let data: unknown;
  try {
    data = await ctx.request.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }

  const candidates = data && typeof data === 'object' && Array.isArray((data as { events?: unknown }).events)
    ? (data as { events: unknown[] }).events.slice(0, MAX_BATCH)
    : [data];
  const hits = candidates.map(parseHit).filter((hit): hit is Hit => hit !== null);
  if (hits.length === 0) return new Response('bad event', { status: 400 });

  const country = (ctx.request as { cf?: { country?: string } }).cf?.country ?? '';
  for (const hit of hits) {
    ctx.env.ANALYTICS.writeDataPoint({
      indexes: [hit.e],
      blobs: [hit.p, hit.r, hit.m, country],
      doubles: [1],
    });
  }

  return new Response(null, { status: 204 });
};
