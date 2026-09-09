import assert from "node:assert/strict";
import {
  planOrder,
  compareOrders,
  orderFile,
  readOrderFile,
  parseOrderFile,
  buildSteps,
  lengthFactor,
  weightFactor,
  csvCell,
} from "../src/lib/orderPlanning.ts";
import { PALLET_EXAMPLE } from "../src/lib/palletEstimate.ts";
import { ORDER_COPY, ORDER_LANGUAGES } from "../src/lib/orderLocale.ts";
import { onRequestPost, onRequestGet } from "../functions/api/order-plan.ts";
const clone = () => structuredClone(PALLET_EXAMPLE);
const q = clone();
q.pallet.maxHeight = 70;
const split = planOrder({ request: q, maxPallets: 10 });
assert.equal(split.status, "complete");
assert.equal(split.placedCount, 20);
assert.ok(split.palletCount > 1);
const ids = split.pallets.flatMap((p) => p.boxes.map((b) => b.id));
assert.equal(new Set(ids).size, 20);
for (const [i, it] of q.items.entries())
  assert.equal(ids.filter((id) => id.startsWith(`sku${i}-`)).length, it.qty);
for (const p of split.pallets) {
  assert.ok(p.loadedHeight <= q.pallet.maxHeight);
  assert.ok(p.cargoWeight <= q.pallet.maxWeight);
  const steps = buildSteps(p);
  for (let i = 1; i < steps.length; i++)
    assert.ok(steps[i].py >= steps[i - 1].py);
  for (const a of p.boxes)
    for (const b of p.boxes)
      if (a.id !== b.id)
        assert.ok(
          !(
            a.px < b.px + b.l - 1e-6 &&
            a.px + a.l > b.px + 1e-6 &&
            a.py < b.py + b.h - 1e-6 &&
            a.py + a.h > b.py + 1e-6 &&
            a.pz < b.pz + b.w - 1e-6 &&
            a.pz + a.w > b.pz + 1e-6
          )
        );
}
const partial = planOrder({ request: q, maxPallets: 1 });
assert.equal(partial.status, "partial");
assert.equal(partial.placedCount + partial.unplacedCount, 20);
const impossible = clone();
impossible.items[0].l = 301;
impossible.items[0].w = 301;
impossible.items[1].l = 301;
impossible.items[1].w = 301;
const nofit = planOrder({ request: impossible, maxPallets: 20 });
assert.equal(nofit.palletCount, 0);
assert.equal(nofit.unplacedCount, 20);
const tricky = clone();
tricky.items[0].l = 301;
tricky.items[0].w = 301;
tricky.pallet.maxHeight = 45;
const mixed = planOrder({ request: tricky, maxPallets: 20 });
assert.equal(mixed.byItem[0].remaining, 12);
assert.equal(mixed.byItem[1].placed, 8);
assert.ok(
  mixed.pallets.flatMap((p) => p.boxes).every((b) => b.id.startsWith("sku1-"))
);
const noStack = clone();
noStack.items.forEach((it) => (it.maxStack = 0));
const ns = planOrder({ request: noStack, maxPallets: 20 });
assert.ok(ns.pallets.flatMap((p) => p.boxes).every((b) => b.py === 0));
const before = JSON.stringify(q);
assert.deepEqual(planOrder({ request: q, maxPallets: 10 }), split);
assert.equal(JSON.stringify(q), before);
const comparisons = compareOrders({ request: q, maxPallets: 1 });
assert.equal(comparisons.length, 4);
assert.equal(comparisons[0].unplacedCount, partial.unplacedCount);
assert.equal(JSON.stringify(q), before);
for (const maxPallets of [0, 21, 1.5, "2", NaN])
  assert.throws(() => planOrder({ request: q, maxPallets }));
const file = orderFile("Test", q, 10, "imperial", {
  0: { height: 67, note: "Operator adjustment" },
});
assert.deepEqual(readOrderFile(JSON.stringify(file)), file);
assert.deepEqual(readOrderFile(JSON.stringify(q)).request, q);
for (const patch of [
  { version: 99 },
  { units: "mm" },
  { actuals: { 0: { height: Infinity, note: "" } } },
  { actuals: { 20: { height: 10, note: "" } } },
  { name: "x".repeat(81) },
])
  assert.throws(() => parseOrderFile({ ...file, ...patch }));
assert.throws(() => readOrderFile(" ".repeat(65537)));
assert.throws(() => readOrderFile("{bad"));
assert.equal(48 * lengthFactor("imperial"), 121.92);
assert.ok(Math.abs(100 * weightFactor("imperial") - 45.359237) < 1e-8);
assert.ok(csvCell("=SUM(A1)").startsWith("\"'"));
assert.equal(csvCell('a"b'), '"a""b"');
for (const lang of ORDER_LANGUAGES) {
  assert.deepEqual(
    Object.keys(ORDER_COPY[lang]).sort(),
    Object.keys(ORDER_COPY.en).sort()
  );
  assert.ok(
    Object.values(ORDER_COPY[lang]).every(
      (v) => typeof v === "string" && v.length
    )
  );
}
const ctx = (body, headers = { "Content-Type": "application/json" }) => ({
  request: new Request("https://example.com/api/order-plan", {
    method: "POST",
    headers,
    body,
  }),
  env: {},
  waitUntil() {},
});
let response = await onRequestPost(
  ctx(JSON.stringify({ request: q, maxPallets: 10 }))
);
assert.equal(response.status, 200);
assert.deepEqual(await response.json(), JSON.parse(JSON.stringify(split)));
response = await onRequestPost(
  ctx(JSON.stringify({ request: q, maxPallets: 100 }))
);
assert.equal(response.status, 400);
response = await onRequestPost(ctx("x".repeat(32769)));
assert.equal(response.status, 413);
response = await onRequestPost(ctx("{}", { "Content-Type": "text/plain" }));
assert.equal(response.status, 415);
response = await onRequestGet();
assert.equal((await response.json()).endpoint, "POST /api/order-plan");
console.log(
  "PASS order planning: multi-pallet identity/accounting, no-fit, constraints, deterministic comparisons, build order, files, units, six locales and API validation"
);

// Device persistence uses the same validated, versioned source file as downloads.
const { loadDeviceOrders, writeDeviceOrders, loadRules, writeRules } = await import('../src/lib/orderStorage.ts');
const storage = new Map();
globalThis.localStorage = { getItem:k=>storage.get(k)??null, setItem:(k,v)=>storage.set(k,v) };
const saved = {id:'test',updated:'2026-09-09T00:00:00Z',file};
writeDeviceOrders([saved]); assert.deepEqual(loadDeviceOrders(),[saved]);
const rule = {id:'rule',name:'Receiving',pallet:q.pallet,maxPallets:3};
writeRules([rule]); assert.deepEqual(loadRules(),[rule]);
assert.throws(()=>writeDeviceOrders(Array(51).fill(saved)));
storage.set('dp.orders.v1','{broken'); assert.throws(()=>loadDeviceOrders());
const colors=planOrder({request:tricky,maxPallets:20}).pallets.flatMap(p=>p.boxes).map(b=>b.color);
assert.ok(colors.every(c=>c===0x14b8a6));
console.log('PASS saved-order/rule persistence, corruption handling and stable SKU colours');
