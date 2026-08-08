/**
 * GET /api/stats?k=<STATS_KEY>[&days=N] — aggregate the collected events + leads.
 * STATS_KEY is a Pages secret (wrangler pages secret put STATS_KEY).
 * Returns JSON: daily event counts, per-event totals, top paths/referrers/
 * countries/meta, and the lead list (emails are why this is key-protected).
 *
 * v2: aggregates ev2|… events from key NAMES only (see hit.ts) — list() reads
 * 1000 keys per KV op, so a 90-day window is a handful of ops. The old ev_
 * per-key-get design 524'd once events accumulated. Legacy ev_ keys (TTL'd,
 * gone by ~Nov 2026) are counted from their names into byDay + byEvent
 * "(legacy)" without any get().
 */

interface Env {
  LEADS: KVNamespace;
  STATS_KEY?: string;
}

const dec = (s: string) => {
  try { return decodeURIComponent(s); } catch { return s; }
};

async function listAll(kv: KVNamespace, prefix: string, maxPages = 100) {
  const names: string[] = [];
  let cursor: string | undefined;
  let pages = 0;
  do {
    const page = await kv.list({ prefix, cursor, limit: 1000 });
    for (const k of page.keys) names.push(k.name);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor && ++pages < maxPages);
  return { names, truncated: Boolean(cursor) };
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  if (!ctx.env.STATS_KEY || url.searchParams.get('k') !== ctx.env.STATS_KEY) {
    return new Response('forbidden', { status: 403 });
  }
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days')) || 90));
  const cutoff = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);

  const byDay: Record<string, number> = {};
  const byEvent: Record<string, number> = {};
  const byPath: Record<string, number> = {};
  const byRef: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  const byMeta: Record<string, number> = {};

  // v2 events — aggregate purely from key names, zero get()s
  const ev2 = await listAll(ctx.env.LEADS, 'ev2|');
  for (const name of ev2.names) {
    const [, day, e, p, r, m, c] = name.split('|');
    if (!day || day < cutoff) continue;
    byDay[day] = (byDay[day] ?? 0) + 1;
    byEvent[e] = (byEvent[e] ?? 0) + 1;
    if (e === 'pageview' && p) byPath[dec(p)] = (byPath[dec(p)] ?? 0) + 1;
    if (r) byRef[dec(r)] = (byRef[dec(r)] ?? 0) + 1;
    if (c) byCountry[c] = (byCountry[c] ?? 0) + 1;
    if (m) byMeta[`${e}:${dec(m)}`] = (byMeta[`${e}:${dec(m)}`] ?? 0) + 1;
  }

  // legacy ev_ keys — day is in the name; event detail would need a get(),
  // which is exactly what melted the old endpoint, so count them coarsely
  const legacy = await listAll(ctx.env.LEADS, 'ev_');
  for (const name of legacy.names) {
    const day = name.slice(3, 13);
    if (day < cutoff) continue;
    byDay[day] = (byDay[day] ?? 0) + 1;
    byEvent['(legacy)'] = (byEvent['(legacy)'] ?? 0) + 1;
  }

  // shares — count only, values never needed
  const shares = (await listAll(ctx.env.LEADS, 'share_')).names.length;

  // leads — keys are bare ISO timestamps (start with the year); few enough
  // to fetch values, in parallel batches
  const leadNames = (await listAll(ctx.env.LEADS, '20')).names;
  const leads: unknown[] = [];
  for (let i = 0; i < leadNames.length; i += 50) {
    const batch = leadNames.slice(i, i + 50);
    const values = await Promise.all(batch.map((n) => ctx.env.LEADS.get(n)));
    values.forEach((raw, j) => {
      if (!raw) return;
      try { leads.push({ key: batch[j], ...JSON.parse(raw) }); } catch { /* skip */ }
    });
  }

  const top = (o: Record<string, number>, n = 20) =>
    Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);

  return new Response(
    JSON.stringify({
      days,
      scanned: ev2.names.length + legacy.names.length,
      truncated: ev2.truncated || legacy.truncated,
      shares,
      byDay,
      byEvent: top(byEvent, 50),
      topPaths: top(byPath),
      topReferrers: top(byRef),
      byCountry: top(byCountry),
      byMeta: top(byMeta, 30),
      leads,
    }, null, 2),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
