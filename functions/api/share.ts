/**
 * /api/share — save & load shared load plans.
 *   POST { plan } → { id }   (stores plan in KV under share_<id>, 1-year TTL)
 *   GET  ?id=xxxx → the stored plan JSON
 * Plans contain only what the user chose to share (container, cartons,
 * positions). Size-capped to keep the free KV tier healthy.
 */

interface Env {
  LEADS: KVNamespace;
}

const MAX_BYTES = 200_000;
const ID_RE = /^[a-z0-9]{10}$/;

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const raw = await ctx.request.text();
  if (raw.length > MAX_BYTES) return new Response('too large', { status: 413 });

  let plan: any;
  try { plan = JSON.parse(raw); } catch { return new Response('bad json', { status: 400 }); }
  // minimal shape check — container plan (container+specs) or warehouse
  // layout (type:'warehouse' + floor + items)
  const isContainerPlan = plan && typeof plan === 'object' && plan.container && Array.isArray(plan.specs);
  const isWarehousePlan = plan && typeof plan === 'object' && plan.type === 'warehouse' && plan.floor && Array.isArray(plan.items);
  if (!isContainerPlan && !isWarehousePlan) {
    return new Response('bad plan', { status: 400 });
  }

  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  await ctx.env.LEADS.put(
    `share_${id}`,
    JSON.stringify({ ...plan, sharedAt: new Date().toISOString() }),
    { expirationTtl: 60 * 60 * 24 * 365 },
  );

  return new Response(JSON.stringify({ id }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const id = new URL(ctx.request.url).searchParams.get('id') ?? '';
  if (!ID_RE.test(id)) return new Response('bad id', { status: 400 });
  const raw = await ctx.env.LEADS.get(`share_${id}`);
  if (!raw) return new Response('not found', { status: 404 });
  return new Response(raw, {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
  });
};
