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
import { containerChecks, summarize, CHECK_SEMANTICS, CONTAINER_PRESETS } from '../../src/lib/packChecks';
import type { AxleConfig } from '../../src/lib/realism';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
};

import { rateLimitKeyed, tooManyRequests, type RateLimitEnv } from './_rateLimit';

/**
 * Per-IP limits. Generous enough that a developer evaluating the API or a small
 * integration never notices; tight enough that one client cannot burn the
 * account's Functions quota. Both windows must pass.
 */
const RATE_RULES = [
  { name: 'pack', limit: 60, windowSec: 60 },      // burst: 60/min
  { name: 'pack', limit: 1000, windowSec: 86_400 }, // sustained: 1,000/day
];

const MAX_QTY = 2000;
const MAX_ITEMS = 100;

const USAGE = {
  name: 'DimPack3D bin-packing API',
  endpoint: 'POST https://www.dimpack3d.com/api/pack',
  units: 'cm and kg',
  request: {
    container: { preset: '20gp', l: 589, w: 235, h: 239, maxWeight: 28200, door: { w: 234, h: 228 }, tare: 2300, axles: null },
    items: [{ label: 'Carton A', l: 60, w: 40, h: 40, weight: 18, qty: 100, maxStack: 0, keepUpright: false, group: 'PO-1', unloadOrder: 1 }],
  },
  response: 'boxes (placed with px/py/pz min-corner positions), unplaced count, stats (volumeUtil, totalWeight, cog), zones (LIFO unload zones), checks[] {code, status pass|fail|warn|not_evaluated, observed, limit, ids, assumption} + checksSummary',
  checks: 'PLACEMENT_COMPLETE, DOOR_APERTURE (needs container.door or preset), PAYLOAD, STACK_LIMITS_PROVIDED, HEAVY_OVER_LIGHT, COG_HEIGHT, LOAD_VOIDS, AXLE_LOADS (needs container.axles), VGM (never evaluated here), ZONE_SEGREGATION (planner only). ' + CHECK_SEMANTICS,
  presets: Object.keys(CONTAINER_PRESETS),
  limits: `${MAX_ITEMS} item types, ${MAX_QTY} total units per request; ${RATE_RULES[0].limit} requests/min and ${RATE_RULES[1].limit}/day per IP. Free while in beta; a free API key raises limits 5x: https://www.dimpack3d.com/api-pricing`,
  auth: 'Optional. X-API-Key: dp_live_… (get one at https://www.dimpack3d.com/api-pricing)',
  interactive: 'https://www.dimpack3d.com/planner',
  docs: 'https://www.dimpack3d.com/api-docs',
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestGet: PagesFunction = async () =>
  new Response(JSON.stringify(USAGE, null, 2), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  });

export const onRequestPost: PagesFunction<RateLimitEnv> = async (ctx) => {
  const err = (msg: string, status = 400, field?: string) =>
    new Response(JSON.stringify({ error: msg, ...(field ? { field } : {}), docs: USAGE.docs }), {
      status, headers: { 'Content-Type': 'application/json', ...CORS },
    });

  // Cost control before any work is done. GET (docs) and OPTIONS stay unlimited
  // — they are cheap and blocking them would break CORS preflight.
  const rl = await rateLimitKeyed(ctx.env, ctx.request, RATE_RULES);
  if (!rl.ok) return tooManyRequests(rl, CORS, USAGE.docs);

  let body: any;
  try { body = await ctx.request.json(); } catch { return err('body must be JSON'); }

  let c = body?.container;
  // preset fills interior, payload, door and tare; explicit fields win
  if (c && typeof c.preset === 'string') {
    const pre = CONTAINER_PRESETS[c.preset.toLowerCase()];
    if (!pre) return err(`unknown container.preset (use ${Object.keys(CONTAINER_PRESETS).join('|')})`);
    c = { ...pre, ...Object.fromEntries(Object.entries(c).filter(([, v]) => v !== undefined && v !== null)) };
  }
  if (!c || !(c.l > 0) || !(c.w > 0) || !(c.h > 0)) return err('container needs positive l, w, h (cm)');
  const door = c.door && c.door.w > 0 && c.door.h > 0 ? { w: +c.door.w, h: +c.door.h } : null;
  const ax = c.axles;
  const axles: AxleConfig | null = ax && ax.frontPos >= 0 && ax.rearPos > ax.frontPos && ax.frontLimit > 0 && ax.rearLimit > 0
    ? { frontPos: +ax.frontPos, rearPos: +ax.rearPos, frontLimit: +ax.frontLimit, rearLimit: +ax.rearLimit } : null;
  if (ax && !axles) return err('container.axles needs frontPos ≥ 0, rearPos > frontPos, frontLimit > 0, rearLimit > 0');
  const tare = c.tare > 0 ? +c.tare : null;
  if (c.l * c.w * c.h > 500 * 1e6) return err('container too large');

  const items = body?.items;
  if (!Array.isArray(items) || items.length === 0) return err('items must be a non-empty array');
  if (items.length > MAX_ITEMS) return err(`too many item types (max ${MAX_ITEMS})`);

  const specs: PackItemSpec[] = [];
  let totalQty = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    for (const key of ['l', 'w', 'h', 'qty', 'weight'] as const) {
      const value = it?.[key];
      if (key === 'weight' && value === undefined) continue;
      if (typeof value !== 'number' || !Number.isFinite(value) ||
          (key === 'weight' ? value < 0 : value <= 0) ||
          (key === 'qty' && !Number.isInteger(value))) {
        return err(`items[${i}].${key} must be a finite ${key === 'qty' ? 'integer ≥ 1' : key === 'weight' ? 'number ≥ 0' : 'number > 0'}`, 400, `items[${i}].${key}`);
      }
    }
    const qty = it.qty;
    totalQty += qty;
    if (totalQty > MAX_QTY) return err(`total quantity exceeds ${MAX_QTY}`);
    specs.push({
      id: String(it.id ?? `i${i}`),
      label: String(it.label ?? `Item ${i + 1}`).slice(0, 60),
      l: it.l, w: it.w, h: it.h,
      weight: it.weight ?? 0,
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

  const checks = containerChecks({
    container: { l: +c.l, w: +c.w, h: +c.h, ...(c.maxWeight ? { maxWeight: +c.maxWeight } : {}), door, axles, tare },
    specs, boxes: result.boxes, unplaced: result.unplaced, totalWeight: result.stats.totalWeight,
  });

  return new Response(JSON.stringify({
    boxes: result.boxes.map(({ color, ...b }) => b),
    unplaced: result.unplaced,
    stats: result.stats,
    zones: result.zones,
    checks,
    checksSummary: summarize(checks),
    semantics: CHECK_SEMANTICS,
    computeMs: Date.now() - t0,
    engine: 'dimpack3d-extreme-point',
  }), { headers: { 'Content-Type': 'application/json', ...CORS } });
};
