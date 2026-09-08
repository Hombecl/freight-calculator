import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cartonSpace } from '../src/lib/cartonSpace';
test('worked example and completely filled carton', () => {
  const r = cartonSpace([40,30,30], [20,10,10], 12);
  assert.equal(r.best.count, 18); assert.equal(r.emptyLitres, 12);
  assert.ok(Math.abs(r.fillPct! - 66.6666666667) < 1e-6);
  assert.equal(cartonSpace([40,30,30], [20,10,10], 18).fillPct, 100);
});
test('rotation and volume alone do not guarantee fit', () => {
  assert.equal(cartonSpace([10,20,30], [30,10,20], 1).best.count, 1);
  assert.equal(cartonSpace([10,10,10], [20,1,1], 1).fits, false);
  assert.equal(cartonSpace([10,10,10], [6,6,6], 2).fillPct, null);
});
test('invalid dimensions and quantities are unknown, not zero-filled', () => {
  for (const x of [0, -1, NaN, Infinity]) assert.throws(() => cartonSpace([x,10,10], [1,1,1], 1));
  assert.throws(() => cartonSpace([10,10,10], [1,1,1], 1.5));
});
