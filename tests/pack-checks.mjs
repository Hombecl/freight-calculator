#!/usr/bin/env node
/**
 * pack-checks.mjs — every API response carries the check library with an
 * explicit status; not_evaluated is returned, never omitted.
 */
import assert from 'node:assert/strict';
import { containerChecks, palletChecks, fitsDoor, summarize, CONTAINER_PRESETS } from '../src/lib/packChecks.ts';
import { packWithConstraints } from '../src/lib/binPacking.ts';
import { estimatePallet, PALLET_EXAMPLE } from '../src/lib/palletEstimate.ts';
import { quoteOrder, QUOTE_EXAMPLE } from '../src/lib/orderQuote.ts';
import { onRequestPost } from '../functions/api/pack.ts';

const ALL_CONTAINER = ['PLACEMENT_COMPLETE', 'DOOR_APERTURE', 'PAYLOAD', 'STACK_LIMITS_PROVIDED', 'HEAVY_OVER_LIGHT', 'COG_HEIGHT', 'LOAD_VOIDS', 'AXLE_LOADS', 'VGM', 'ZONE_SEGREGATION'];
const spec = (o) => ({ id: o.id ?? 'a', label: o.id ?? 'a', l: 60, w: 40, h: 40, weight: 10, qty: 10, color: 0, ...o });

// ---- fitsDoor ----
{
  const door = { w: 234, h: 228 };
  assert.equal(fitsDoor({ l: 235, w: 235, h: 235 }, door), false);
  assert.equal(fitsDoor({ l: 60, w: 235, h: 235 }, door), false, 'cross-section 235x235 in every orientation');
  assert.equal(fitsDoor({ l: 300, w: 200, h: 200 }, door), true, 'long axis travels through');
  assert.equal(fitsDoor({ l: 200, w: 200, h: 235, keepUpright: true }, door), false, 'upright pins h > 228');
  assert.equal(fitsDoor({ l: 200, w: 200, h: 235 }, door), true, 'tipped it passes');
  assert.equal(fitsDoor({ l: 999, w: 999, h: 999 }, null), true, 'no door = open');
}

// ---- every code present, not_evaluated when inputs are missing ----
{
  const c = { l: 589, w: 235, h: 239 };
  const specs = [spec({ id: 'a', weight: 0 })];
  const r = packWithConstraints(c, specs);
  const checks = containerChecks({ container: c, specs, boxes: r.boxes, unplaced: r.unplaced, totalWeight: r.stats.totalWeight });
  assert.deepEqual(checks.map((x) => x.code), ALL_CONTAINER);
  const by = Object.fromEntries(checks.map((x) => [x.code, x]));
  for (const code of ['DOOR_APERTURE', 'PAYLOAD', 'HEAVY_OVER_LIGHT', 'COG_HEIGHT', 'AXLE_LOADS', 'VGM', 'ZONE_SEGREGATION']) assert.equal(by[code].status, 'not_evaluated', code);
  assert.equal(by.PLACEMENT_COMPLETE.status, 'pass');
  assert.equal(by.STACK_LIMITS_PROVIDED.status, 'warn');
  for (const x of checks) assert.ok(x.assumption.length > 15, x.code);
  const s = summarize(checks);
  assert.equal(s.notEvaluated.length, 7);
  assert.deepEqual(s.failed, []);
}

// ---- with full inputs: door fail, payload pass, axles evaluated ----
{
  const c = { ...CONTAINER_PRESETS['20gp'], axles: { frontPos: 50, rearPos: 500, frontLimit: 20000, rearLimit: 20000 } };
  const specs = [spec({ id: 'ok', maxStack: 100 }), spec({ id: 'tall', l: 60, w: 235, h: 235, qty: 1, maxStack: 100 })];
  const r = packWithConstraints(c, specs);
  const checks = containerChecks({ container: c, specs, boxes: r.boxes, unplaced: r.unplaced, totalWeight: r.stats.totalWeight });
  const by = Object.fromEntries(checks.map((x) => [x.code, x]));
  assert.equal(by.DOOR_APERTURE.status, 'fail');
  assert.deepEqual(by.DOOR_APERTURE.ids, ['tall']);
  assert.equal(by.PAYLOAD.status, 'pass');
  assert.equal(by.STACK_LIMITS_PROVIDED.status, 'pass');
  assert.equal(by.AXLE_LOADS.status, 'pass');
  assert.match(String(by.AXLE_LOADS.observed), /front .* rear/);
  assert.equal(by.VGM.status, 'not_evaluated', 'VGM is never claimed');
  assert.match(String(by.VGM.observed), /tare 2300/);
  assert.equal(summarize(checks).notEvaluated.length, 2); // VGM + ZONE only
}

// ---- heavy over light + load voids fire on a contrived layout ----
{
  const boxes = [
    { id: 'light', label: '', l: 50, w: 50, h: 50, px: 0, py: 0, pz: 0, color: 0, weight: 5 },
    { id: 'heavy', label: '', l: 50, w: 50, h: 50, px: 0, py: 50, pz: 0, color: 0, weight: 20 },
  ];
  const specs = [spec({ id: 'light', weight: 5, qty: 1, maxStack: 50 }), spec({ id: 'heavy', weight: 20, qty: 1, maxStack: 50 })];
  const checks = containerChecks({ container: { l: 589, w: 235, h: 239, maxWeight: 28200 }, specs, boxes, unplaced: 0, totalWeight: 25 });
  const by = Object.fromEntries(checks.map((x) => [x.code, x]));
  assert.equal(by.HEAVY_OVER_LIGHT.status, 'warn');
  assert.deepEqual(by.HEAVY_OVER_LIGHT.ids, ['heavy']);
  assert.equal(by.LOAD_VOIDS.status, 'warn');
  assert.match(String(by.LOAD_VOIDS.observed), /door slack 539/);
  assert.equal(by.COG_HEIGHT.status, 'warn', 'heavy on top → CoG above 55%');
}

// ---- pallet estimate carries checks; order-quote merges them per pallet ----
{
  const e = estimatePallet(PALLET_EXAMPLE);
  assert.ok(Array.isArray(e.checks) && e.checks.length >= 6);
  assert.ok(e.semantics.includes('not_evaluated'));
  const codes = e.checks.map((c) => c.code);
  for (const c of ['PLACEMENT_COMPLETE', 'PAYLOAD', 'STACK_LIMITS_PROVIDED', 'HEAVY_OVER_LIGHT', 'COG_HEIGHT', 'SUPPORT_AREA']) assert.ok(codes.includes(c), c);
  const q = await quoteOrder(structuredClone(QUOTE_EXAMPLE));
  const p0 = q.pallets[0].checks.map((c) => c.code);
  for (const c of ['LOADED_HEIGHT', 'GROSS_WEIGHT', 'FOOTPRINT', 'HEAVY_OVER_LIGHT', 'COG_HEIGHT', 'STACK_LIMITS_PROVIDED', 'SUPPORT_AREA']) assert.ok(p0.includes(c), c);
  assert.ok(!p0.includes('PLACEMENT_COMPLETE'), 'order-level, not per pallet');
  assert.ok(q.pallets[0].checks.every((c) => c.pallet === 0));
}

// ---- /api/pack: preset fills door + tare; checks + summary in the response ----
{
  const ctx = (body) => ({ env: {}, request: new Request('https://x/api/pack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  let res = await onRequestPost(ctx({ container: { preset: '40hq' }, items: [{ l: 60, w: 40, h: 40, qty: 5, weight: 10, maxStack: 50 }] }));
  assert.equal(res.status, 200);
  let j = await res.json();
  assert.equal(j.boxes.length, 5);
  const by = Object.fromEntries(j.checks.map((x) => [x.code, x]));
  assert.equal(by.DOOR_APERTURE.status, 'pass');
  assert.equal(by.DOOR_APERTURE.limit, '234×258 cm');
  assert.equal(by.PAYLOAD.limit, 26500);
  assert.match(String(by.VGM.observed), /tare 3900/);
  assert.ok(j.checksSummary.evaluated >= 6);
  assert.ok(j.semantics.includes('never a pass'));
  // explicit door overrides the preset; bad preset → 400; bad axles → 400
  res = await onRequestPost(ctx({ container: { preset: '20gp', door: { w: 10, h: 10 } }, items: [{ l: 60, w: 40, h: 40, qty: 1 }] }));
  j = await res.json();
  assert.equal(j.checks.find((x) => x.code === 'DOOR_APERTURE').status, 'fail');
  assert.equal((await onRequestPost(ctx({ container: { preset: '45hc' }, items: [{ l: 1, w: 1, h: 1 }] }))).status, 400);
  assert.equal((await onRequestPost(ctx({ container: { l: 100, w: 100, h: 100, axles: { frontPos: 50, rearPos: 10, frontLimit: 1, rearLimit: 1 } }, items: [{ l: 1, w: 1, h: 1 }] }))).status, 400);
  // no weights → weight-based checks not_evaluated, never pass
  res = await onRequestPost(ctx({ container: { l: 589, w: 235, h: 239, maxWeight: 28200 }, items: [{ l: 60, w: 40, h: 40, qty: 2 }] }));
  j = await res.json();
  assert.equal(j.checks.find((x) => x.code === 'PAYLOAD').status, 'not_evaluated');
  assert.equal(j.checks.find((x) => x.code === 'HEAVY_OVER_LIGHT').status, 'not_evaluated');
}

console.log('pack-checks.mjs: all assertions passed');
