/**
 * POST /api/lead — store an email lead in KV.
 * Called by the export gate and the warehouse waitlist (see entitlement.ts).
 * Read back with the private manual scripts/export-leads.mjs command.
 * See docs/EXPORT-MEASUREMENT.md. This function stores leads; it does not send email.
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

  if (!data || typeof data !== 'object' || Array.isArray(data))
    return Response.json({ error: 'body must be a JSON object' }, { status: 400 });

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
