/**
 * POST /api/pack — the DimPack3D bin-packing engine as a public API.
 *
 * The same Extreme-Point packer that powers /planner, server-side. Free while
 * in beta (fair use); volume/commercial licensing: hello@dimpack3d.com.
 * CORS is open on purpose — browsers, scripts and AI agents may call it.
 *
 * Request:  { container: {l,w,h,maxWeight?}, items: [{l,w,h,qty,weight?,label?,
 *             allowRotate?,keepUpright?,maxStack?,group?,unloadOrder?}] }  (cm/kg)
 * Response: { boxes: [{label,l,w,h,px,py,pz,...}], unplaced, stats, zones }
 * GET returns this usage description as JSON.
 */

import { packWithConstraints, type PackItemSpec } from '../../src/lib/binPacking';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const MAX_QTY = 2000;
const MAX_ITEMS = 100;

const USAGE = {
  name: 'DimPack3D bin-packing API',
  endpoint: 'POST https://www.dimpack3d.com/api/pack',
  units: 'cm and kg',
  request: {
    container: { l: 589, w: 235, h: 239, maxWeight: 28200 },
    items: [{ label: 'Carton A', l: 60, w: 40, h: 40, weight: 18, qty: 100, maxStack: 0, keepUpright: false, group: 'PO-1', unloadOrder: 1 }],
  },
  response: 'boxes (placed with px/py/pz min-corner positions), unplaced count, stats (volumeUtil, totalWeight, cog), zones (LIFO unload zones)',
  limits: `${MAX_ITEMS} item types, ${MAX_QTY} total units per request. Free while in beta; volume licensing: hello@dimpack3d.com`,
  interactive: 'https://www.dimpack3d.com/planner',
  docs: 'https://www.dimpack3d.com/api-docs',
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestGet: PagesFunction = async () =>
  new Response(JSON.stringify(USAGE, null, 2), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  });

export const onRequestPost: PagesFunction = async (ctx) => {
  const err = (msg: string, status = 400) =>
    new Response(JSON.stringify({ error: msg, docs: USAGE.docs }), {
      status, headers: { 'Content-Type': 'application/json', ...CORS },
    });

  let body: any;
  try { body = await ctx.request.json(); } catch { return err('body must be JSON'); }

  const c = body?.container;
  if (!c || !(c.l > 0) || !(c.w > 0) || !(c.h > 0)) return err('container needs positive l, w, h (cm)');
  if (c.l * c.w * c.h > 500 * 1e6) return err('container too large');

  const items = body?.items;
  if (!Array.isArray(items) || items.length === 0) return err('items must be a non-empty array');
  if (items.length > MAX_ITEMS) return err(`too many item types (max ${MAX_ITEMS})`);

  const specs: PackItemSpec[] = [];
  let totalQty = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!(it.l > 0) || !(it.w > 0) || !(it.h > 0)) return err(`items[${i}] needs positive l, w, h`);
    const qty = Math.max(1, Math.round(it.qty ?? 1));
    totalQty += qty;
    if (totalQty > MAX_QTY) return err(`total quantity exceeds ${MAX_QTY}`);
    specs.push({
      id: String(it.id ?? `i${i}`),
      label: String(it.label ?? `Item ${i + 1}`).slice(0, 60),
      l: +it.l, w: +it.w, h: +it.h,
      weight: Math.max(0, +it.weight || 0),
      qty,
      color: 0xfbbf24,
      allowRotate: it.allowRotate !== false,
      keepUpright: !!it.keepUpright,
      ...(it.maxStack !== undefined ? { maxStack: Math.max(0, +it.maxStack) } : {}),
      ...(it.group ? { group: String(it.group).slice(0, 40) } : {}),
      ...(it.unloadOrder ? { unloadOrder: Math.max(1, Math.round(+it.unloadOrder)) } : {}),
    });
  }

  const t0 = Date.now();
  const result = packWithConstraints(
    { l: +c.l, w: +c.w, h: +c.h, ...(c.maxWeight ? { maxWeight: +c.maxWeight } : {}) },
    specs,
  );

  return new Response(JSON.stringify({
    boxes: result.boxes.map(({ color, ...b }) => b),
    unplaced: result.unplaced,
    stats: result.stats,
    zones: result.zones,
    computeMs: Date.now() - t0,
    engine: 'dimpack3d-extreme-point',
  }), { headers: { 'Content-Type': 'application/json', ...CORS } });
};
