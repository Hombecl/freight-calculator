/**
 * POST /api/lead — store an email lead in KV.
 * Called by the export gate and the warehouse waitlist (see entitlement.ts).
 * Read back with:
 *   wrangler kv key list --namespace-id=13e65133a1414b1ebe5d125d38d43eb8 --remote
 *   wrangler kv key get <key> --namespace-id=... --remote
 */

interface Env {
  LEADS: KVNamespace;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let data: Record<string, unknown>;
  try {
    data = await ctx.request.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }

  const email = String(data.email ?? '').trim().slice(0, 200);
  if (!EMAIL_RE.test(email)) return new Response('bad email', { status: 400 });

  const key = `${new Date().toISOString()}_${crypto.randomUUID().slice(0, 8)}`;
  await ctx.env.LEADS.put(
    key,
    JSON.stringify({
      email,
      source: String(data.source ?? '').slice(0, 100),
      proWaitlist: Boolean(data.proWaitlist),
      country: (ctx.request as { cf?: { country?: string } }).cf?.country ?? '',
      at: new Date().toISOString(),
    }),
  );

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
