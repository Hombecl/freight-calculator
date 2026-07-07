#!/usr/bin/env node
/**
 * unit.mjs — engine unit tests (pure TypeScript modules, no browser).
 * Run: npm test  (uses tsx to load the TS sources directly)
 */

import assert from 'node:assert/strict';

const { packContainer, packWithConstraints, computeStats } = await import('../src/lib/binPacking.ts');
const { parseText, rowsToSpecs } = await import('../src/lib/importCartons.ts');
const { axleLoads, mckeeSafeLoad, floorOverloads, palletOverhang, zoneViolations } = await import('../src/lib/realism.ts');
const {
  autoArrangeFloor, autoArrangeFloorD, checkReachability, checkReachabilityD,
  forkliftPath, forkliftPathD, placeNearDockD, positionCapacity, zoneStats, gridFitCheck,
  checkReachabilityTurn, forkliftPathTurn,
} = await import('../src/lib/warehouse.ts').then((m) => ({ ...m, gridFitCheck: null }));
const { gridFit } = await import('../src/lib/answers.ts');

let passed = 0;
const fails = [];
function test(name, fn) {
  try { fn(); passed++; console.log(`PASS  ${name}`); }
  catch (e) { fails.push(name); console.log(`FAIL  ${name} — ${String(e.message).split('\n')[0]}`); }
}

// ---------- bin packing ----------
test('packContainer: no overlaps, respects fragile + weight', () => {
  const c = { l: 240, w: 120, h: 120, maxWeight: 1000 };
  const r = packContainer(c, [
    { id: 'a', label: 'Heavy', l: 60, w: 40, h: 40, weight: 30, qty: 8, color: 1 },
    { id: 'b', label: 'Fragile', l: 60, w: 40, h: 40, weight: 5, qty: 8, color: 2, maxStack: 0 },
  ]);
  assert.equal(r.unplaced, 0);
  for (let i = 0; i < r.boxes.length; i++) for (let j = i + 1; j < r.boxes.length; j++) {
    const a = r.boxes[i], b = r.boxes[j];
    const overlap = a.px < b.px + b.l - 1e-6 && a.px + a.l > b.px + 1e-6 &&
      a.py < b.py + b.h - 1e-6 && a.py + a.h > b.py + 1e-6 &&
      a.pz < b.pz + b.w - 1e-6 && a.pz + a.w > b.pz + 1e-6;
    assert.ok(!overlap, `overlap ${a.id}/${b.id}`);
  }
  // nothing rests on a fragile box
  for (const f of r.boxes.filter((b) => b.label === 'Fragile')) {
    for (const o of r.boxes) {
      if (o.id === f.id || Math.abs(o.py - (f.py + f.h)) > 1e-6) continue;
      const ox = Math.min(f.px + f.l, o.px + o.l) - Math.max(f.px, o.px);
      const oz = Math.min(f.pz + f.w, o.pz + o.w) - Math.max(f.pz, o.pz);
      assert.ok(ox <= 0 || oz <= 0, 'stacked on fragile');
    }
  }
  assert.ok(r.stats.totalWeight <= 1000);
});

test('packWithConstraints: LIFO unload zones ordered toward the door', () => {
  const c = { l: 600, w: 235, h: 239 };
  const r = packWithConstraints(c, [
    { id: 'a', label: 'deep', l: 60, w: 40, h: 40, weight: 20, qty: 20, color: 1, unloadOrder: 3 },
    { id: 'b', label: 'mid', l: 60, w: 40, h: 40, weight: 15, qty: 20, color: 2, unloadOrder: 2 },
    { id: 'd', label: 'door', l: 60, w: 40, h: 40, weight: 10, qty: 20, color: 3, unloadOrder: 1 },
  ]);
  const avg = (lbl) => { const bs = r.boxes.filter((b) => b.label === lbl); return bs.reduce((s, b) => s + b.px, 0) / bs.length; };
  assert.ok(avg('deep') < avg('mid') && avg('mid') < avg('door'));
});

test('computeStats: CoG centered for symmetric load', () => {
  const boxes = [
    { id: '1', label: 'a', l: 100, w: 100, h: 100, px: 0, py: 0, pz: 0, color: 1, weight: 10 },
    { id: '2', label: 'a', l: 100, w: 100, h: 100, px: 100, py: 0, pz: 0, color: 1, weight: 10 },
  ];
  const s = computeStats(boxes, { l: 200, w: 100, h: 100 });
  assert.ok(Math.abs(s.cogOffsetPct.x) < 1e-9 && Math.abs(s.cogOffsetPct.z) < 1e-9);
});

// ---------- import parser ----------
test('import: EN headers with fragile', () => {
  const r = parseText('name,length,width,height,weight,qty,fragile\nA,60,40,40,18,120,\nB,45,35,25,6,30,yes\n');
  assert.equal(r.specs.length, 2);
  assert.equal(r.specs[1].maxStack, 0);
});
test('import: ZH TSV paste', () => {
  const r = parseText('品名\t長\t闊\t高\t重量\t數量\n主箱\t60\t50\t45\t18\t140\n');
  assert.equal(r.specs[0].l, 60);
  assert.equal(r.specs[0].label, '主箱');
});
test('import: positional fallback + units + group/unload', () => {
  const r1 = parseText('Box A,60,40,40,18,100\n');
  assert.equal(r1.specs.length, 1);
  const r2 = parseText('name;length;width;height;weight;qty\nE;60cm;40 cm;40;18kg;50\n');
  assert.equal(r2.specs[0].weight, 18);
  const r3 = parseText('name,l,w,h,kg,qty,group,unload\nA,60,40,40,18,50,PO-1,2\n');
  assert.equal(r3.specs[0].group, 'PO-1');
  assert.equal(r3.specs[0].unloadOrder, 2);
});
test('import: garbage rejected', () => {
  assert.equal(parseText('hello world\n').specs.length, 0);
});

// ---------- warehouse ----------
const FLOOR = { l: 2000, w: 1200 };
const PAL = { id: 'p', label: 'P', l: 120, w: 80, h: 150, qty: 30, color: 1 };

test('warehouse: auto layout fully reachable on all four dock edges', () => {
  for (const edge of ['E', 'W', 'N', 'S']) {
    const boxes = autoArrangeFloorD(FLOOR, [PAL], 300, edge);
    assert.ok(boxes.length > 0, `${edge}: nothing placed`);
    assert.ok(boxes.every((b) => b.px >= -0.01 && b.pz >= -0.01 && b.px + b.l <= FLOOR.l + 0.01 && b.pz + b.w <= FLOOR.w + 0.01), `${edge}: out of bounds`);
    const r = checkReachabilityD(FLOOR, boxes, 300, edge);
    assert.equal(r.unreachable.length, 0, `${edge}: unreachable`);
    assert.ok(forkliftPathD(FLOOR, boxes, 300, boxes[0].id, edge), `${edge}: no path`);
  }
});

test('warehouse: sealed aisle flags cargo, never obstacles', () => {
  const sealed = [
    { id: 'c', label: 'C', l: 100, w: 100, h: 150, px: 950, py: 0, pz: 500, color: 1, kind: 'cargo' },
    { id: 'w1', label: 'W', l: 20, w: 2000, h: 250, px: 700, py: 0, pz: 0, color: 3, kind: 'obstacle' },
    { id: 'w2', label: 'W', l: 20, w: 2000, h: 250, px: 1300, py: 0, pz: 0, color: 3, kind: 'obstacle' },
  ];
  const r = checkReachabilityD(FLOOR, sealed, 300, 'E');
  assert.deepEqual(r.unreachable, ['c']);
  assert.equal(forkliftPathD(FLOOR, sealed, 300, 'c', 'E'), null);
});

test('warehouse: multi-dock rescues a west-side pallet', () => {
  const boxes = [
    { id: 'wall', label: 'W', l: 20, w: 1200, h: 300, px: 1000, py: 0, pz: 0, color: 3, kind: 'obstacle' },
    { id: 'c', label: 'C', l: 120, w: 80, h: 150, px: 200, py: 0, pz: 500, color: 1, kind: 'cargo' },
  ];
  assert.ok(checkReachabilityD(FLOOR, boxes, 300, 'E').unreachable.includes('c'));
  assert.ok(!checkReachabilityD(FLOOR, boxes, 300, ['E', 'W']).unreachable.includes('c'));
  const p = forkliftPathD(FLOOR, boxes, 300, 'c', ['E', 'W']);
  assert.ok(p && p[0].x < 100, 'route should start at the west dock');
});

test('warehouse: zones are walkable, counted, never flagged', () => {
  const boxes = [
    { id: 'z', label: 'Zone A', l: 600, w: 400, h: 3, px: 0, py: 0, pz: 0, color: 1, kind: 'zone' },
    { id: 'c', label: 'P', l: 120, w: 80, h: 150, px: 100, py: 0, pz: 100, color: 2, kind: 'cargo' },
    { id: 'r', label: 'R', l: 270, w: 110, h: 300, px: 200, py: 0, pz: 250, color: 3, kind: 'rack', levels: 3 },
  ];
  const zs = zoneStats(boxes);
  assert.equal(zs[0].cargo, 1);
  assert.equal(zs[0].rackPositions, 6);
  assert.equal(checkReachabilityD(FLOOR, boxes, 300, 'E').unreachable.length, 0);
});

test('warehouse: double-stack doubles boxes with a top layer', () => {
  const st = autoArrangeFloor({ l: 1000, w: 500 }, [{ ...PAL, qty: 4, stack: 2 }], 300);
  assert.equal(st.length, 8);
  assert.equal(st.filter((b) => b.py > 0).length, 4);
});

test('warehouse: rack capacity math', () => {
  const cap = positionCapacity([
    { id: 'c', label: 'C', l: 120, w: 80, h: 150, px: 0, py: 0, pz: 0, color: 1, kind: 'cargo' },
    { id: 'r', label: 'R', l: 270, w: 110, h: 300, px: 400, py: 0, pz: 0, color: 2, kind: 'rack', levels: 4 },
  ]);
  assert.equal(cap.floorCargo, 1);
  assert.equal(cap.rackPositions, 8);
});

test('warehouse: placeNearDockD lands in bounds without collision', () => {
  const boxes = autoArrangeFloorD(FLOOR, [PAL], 300, 'E');
  const spot = placeNearDockD(FLOOR, boxes, { l: 120, w: 80 }, 'E');
  assert.ok(spot);
  assert.ok(spot.px >= 0 && spot.px + 120 <= FLOOR.l && spot.pz >= 0 && spot.pz + 80 <= FLOOR.w);
  for (const b of boxes) {
    const overlap = spot.px < b.px + b.l && spot.px + 120 > b.px && spot.pz < b.pz + b.w && spot.pz + 80 > b.pz;
    assert.ok(!overlap, 'collides');
  }
});

// ---------- physical realism ladder ----------
test('realism: axle lever rule — box over the rear axle loads the rear', () => {
  const cfg = { frontPos: 100, rearPos: 1100, frontLimit: 10000, rearLimit: 10000 };
  // CoG exactly at the rear support → 100% rear
  const r = axleLoads([{ id: 'a', label: '', l: 200, w: 100, h: 100, px: 1000, py: 0, pz: 0, color: 1, weight: 5000 }], cfg);
  assert.ok(Math.abs(r.rear - 5000) < 1 && Math.abs(r.front) < 1);
  // CoG at midspan → 50/50; 12t total overloads a 5t front limit
  const r2 = axleLoads([{ id: 'b', label: '', l: 200, w: 100, h: 100, px: 500, py: 0, pz: 0, color: 1, weight: 12000 }],
    { ...cfg, frontLimit: 5000 });
  assert.ok(Math.abs(r2.front - 6000) < 1 && r2.frontOver && !r2.rearOver);
});

test('realism: McKee crush estimate is in the sane range', () => {
  // 60x40 single-wall ECT32: McKee BCT ≈ 300 kg fresh → safe ≈ 75 kg at SF4
  const safe = mckeeSafeLoad(32, 60, 40, 4, 4);
  assert.ok(safe > 55 && safe < 100, `got ${safe}`);
  // double-wall is stronger
  assert.ok(mckeeSafeLoad(48, 60, 40, 7, 4) > safe);
});

test('realism: floor overload flags a heavy rack, not light cargo', () => {
  const boxes = [
    { id: 'rack', label: '', l: 270, w: 110, h: 300, px: 0, py: 0, pz: 0, color: 1, kind: 'rack', levels: 6 },
    { id: 'pal', label: '', l: 120, w: 80, h: 150, px: 500, py: 0, pz: 0, color: 1, kind: 'cargo', weight: 400 },
  ];
  // rack: 6x600=3600kg on 2.97m2 ≈ 1212 kg/m2; pallet: 400/0.96 ≈ 417 kg/m2
  const over = floorOverloads(boxes, 1000);
  assert.deepEqual(over.map((o) => o.id), ['rack']);
  assert.equal(floorOverloads(boxes, 2000).length, 0);
});

test('realism: pallet overhang measured from the deck edge', () => {
  const r = palletOverhang(
    [{ id: 'a', label: '', l: 60, w: 50, h: 40, px: 70, py: 0, pz: 0, color: 1 }],
    { l: 120, w: 80 });
  assert.deepEqual(r.ids, ['a']);
  assert.ok(Math.abs(r.maxCm - 10) < 0.1);
  assert.equal(palletOverhang([{ id: 'a', label: '', l: 60, w: 50, h: 40, px: 0, py: 0, pz: 0, color: 1 }], { l: 120, w: 80 }).ids.length, 0);
});

test('realism: chilled cargo outside its zone is a violation', () => {
  const zone = { id: 'z', label: 'Chilled', l: 400, w: 400, h: 20, px: 0, py: 0, pz: 0, color: 1, kind: 'zone', zoneType: 'chilled' };
  const inside = { id: 'in', label: '', l: 100, w: 100, h: 100, px: 50, py: 0, pz: 50, color: 1, kind: 'cargo', zoneReq: 'chilled' };
  const outside = { id: 'out', label: '', l: 100, w: 100, h: 100, px: 600, py: 0, pz: 0, color: 1, kind: 'cargo', zoneReq: 'chilled' };
  const v = zoneViolations([zone, inside, outside]);
  assert.deepEqual(v.map((x) => x.id), ['out']);
  assert.equal(v[0].need, 'chilled');
});

// ---------- turn-aware forklift model ----------
// L-corridor: 300cm legs, sharp elbow. A truck that FITS the corridor width
// can still be unable to TURN the corner — the check other tools don't have.
const ELBOW_FLOOR = { l: 2000, w: 1200 };
const ELBOW = [
  { id: 'wA', label: 'W', l: 1700, w: 450, h: 300, px: 300, py: 0, pz: 0, color: 3, kind: 'obstacle' },
  { id: 'wB', label: 'W', l: 1700, w: 450, h: 300, px: 300, py: 0, pz: 750, color: 3, kind: 'obstacle' },
  { id: 'c', label: 'C', l: 100, w: 100, h: 150, px: 100, py: 0, pz: 60, color: 1, kind: 'cargo' },
];

test('warehouse turn: straight-width model passes the elbow', () => {
  const r = checkReachability(ELBOW_FLOOR, ELBOW, 300, 10, ['E']);
  assert.ok(!r.unreachable.includes('c'));
});

test('warehouse turn: 3.5m turn box is blocked by a 3.0m corner', () => {
  const r = checkReachabilityTurn(ELBOW_FLOOR, ELBOW, { aisle: 300, turn: 350 }, 'E');
  assert.ok(r.unreachable.includes('c'), 'corner should be too tight');
});

test('warehouse turn: smaller truck turns the corner, route has a turn', () => {
  const r = checkReachabilityTurn(ELBOW_FLOOR, ELBOW, { aisle: 280, turn: 290 }, 'E');
  assert.ok(!r.unreachable.includes('c'));
  const p = forkliftPathTurn(ELBOW_FLOOR, ELBOW, { aisle: 280, turn: 290 }, 'c', 'E');
  assert.ok(p && p.turns >= 1, 'route should include at least one 90-degree turn');
});

// ---------- answers grid math ----------
test('answers: 20GP holds 225 x 60x40x40 (9x5x5)', () => {
  const f = gridFit({ l: 60, w: 40, h: 40 }, { l: 589, w: 235, h: 239 });
  assert.equal(f.count, 225);
});
test('answers: EUR pallet holds 16 x 60x40x40 (2x2x4)', () => {
  const f = gridFit({ l: 60, w: 40, h: 40 }, { l: 120, w: 80, h: 165 });
  assert.equal(f.count, 16);
});

console.log(`\n${passed} passed, ${fails.length} failed`);
if (fails.length) { console.log('FAILED:', fails.join(', ')); process.exit(1); }
