/**
 * GET /api/stats?k=<STATS_KEY> — aggregate the collected events + leads.
 * STATS_KEY is a Pages secret (wrangler pages secret put STATS_KEY).
 * Returns JSON: daily event counts, per-event totals, top paths/referrers/
 * countries, and the lead list (emails are why this is key-protected).
 */

interface Env {
  LEADS: KVNamespace;
  STATS_KEY?: string;
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  if (!ctx.env.STATS_KEY || url.searchParams.get('k') !== ctx.env.STATS_KEY) {
    return new Response('forbidden', { status: 403 });
  }

  const byDay: Record<string, number> = {};
  const byEvent: Record<string, number> = {};
  const byPath: Record<string, number> = {};
  const byRef: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  const leads: unknown[] = [];

  let cursor: string | undefined;
  let scanned = 0;
  do {
    const page = await ctx.env.LEADS.list({ cursor, limit: 1000 });
    for (const k of page.keys) {
      scanned++;
      const raw = await ctx.env.LEADS.get(k.name);
      if (!raw) continue;
      let v: any;
      try { v = JSON.parse(raw); } catch { continue; }
      if (k.name.startsWith('ev_')) {
        const day = k.name.slice(3, 13);
        byDay[day] = (byDay[day] ?? 0) + 1;
        byEvent[v.e] = (byEvent[v.e] ?? 0) + 1;
        if (v.e === 'pageview' && v.p) byPath[v.p] = (byPath[v.p] ?? 0) + 1;
        if (v.r) byRef[v.r] = (byRef[v.r] ?? 0) + 1;
        if (v.c) byCountry[v.c] = (byCountry[v.c] ?? 0) + 1;
      } else {
        leads.push({ key: k.name, ...v });
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor && scanned < 5000); // safety cap for the free tier

  const top = (o: Record<string, number>, n = 20) =>
    Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);

  return new Response(
    JSON.stringify({ scanned, byDay, byEvent: top(byEvent, 50), topPaths: top(byPath), topReferrers: top(byRef), byCountry: top(byCountry), leads }, null, 2),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
