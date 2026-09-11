import { parsePalletTable } from "../src/lib/palletImport.ts";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import {
  estimatePallet,
  PALLET_EXAMPLE,
  parsePalletRequest,
} from "../src/lib/palletEstimate.ts";
import {
  onRequestPost,
  onRequestGet,
  onRequestOptions,
} from "../functions/api/pallet-estimate.ts";
import { planOrder } from "../src/lib/orderPlanning.ts";
import { QUOTE_EXAMPLE } from "../src/lib/orderQuote.ts";
const layeredCase = () => ({ pallet: structuredClone(QUOTE_EXAMPLE.pallet), items: structuredClone(QUOTE_EXAMPLE.items.filter(it => it.sku !== 'TIN-GIFT-12')) });
const sample = () => structuredClone(PALLET_EXAMPLE);
let checks = 0;
function test(name, run) {
  run();
  checks++;
  console.log(`✓ ${name}`);
}
const simple = () => ({
  pallet: { l: 120, w: 80, baseHeight: 15, maxHeight: 160, maxWeight: 750 },
  items: [
    { label: "A", l: 60, w: 40, h: 30, qty: 12, weight: 8, keepUpright: true },
  ],
});
// Independent geometry and equal-share ancestor-load reconstruction.
function verifyPacking(q, r) {
  const eps = 1e-6, loads = new Map(r.boxes.map(b => [b.id, 0]));
  const sku = b => q.items[Number(b.id.match(/^sku(\d+)-/)[1])];
  const area = (a, b) => Math.max(0, Math.min(a.px+a.l,b.px+b.l)-Math.max(a.px,b.px)) * Math.max(0, Math.min(a.pz+a.w,b.pz+b.w)-Math.max(a.pz,b.pz));
  assert.equal(r.placedCount + r.unplacedCount, r.requestedCount);
  assert.equal(new Set(r.boxes.map(b => b.id)).size, r.placedCount);
  assert.ok(r.cargoWeight <= q.pallet.maxWeight + eps);
  for (const b of [...r.boxes].sort((a,b) => b.py-a.py)) {
    const spec = sku(b);
    assert.ok(b.px >= 0 && b.py >= 0 && b.pz >= 0);
    assert.ok(b.px+b.l <= q.pallet.l+eps && b.pz+b.w <= q.pallet.w+eps && b.py+b.h <= q.pallet.maxHeight-q.pallet.baseHeight+eps);
    if (spec.keepUpright) assert.equal(b.h, spec.h);
    assert.ok(loads.get(b.id) <= (spec.maxStack ?? Infinity)+eps, 'propagated maxStack');
    for (const other of r.boxes) if (other !== b) assert.ok(!(area(b,other)>eps && b.py < other.py+other.h-eps && other.py < b.py+b.h-eps), 'overlap');
    if (b.py > eps) {
      const supports = r.boxes.filter(o => Math.abs(o.py+o.h-b.py)<eps && area(b,o)>eps);
      assert.ok(supports.reduce((n,o) => n+area(b,o),0) >= b.l*b.w*0.6-eps);
      for (const o of supports) loads.set(o.id, loads.get(o.id)+(spec.weight+loads.get(b.id))/supports.length);
    }
  }
  for (const [i, it] of r.byItem.entries()) {
    assert.equal(it.placed, r.boxes.filter(b => b.id.startsWith(`sku${i}-`)).length);
    assert.equal(it.placed + it.remaining, q.items[i].qty);
  }
}
test("Late supporters redistribute all ancestor loads without exceeding maxStack", () => {
  const q = { pallet: { l: 60, w: 60, baseHeight: 10, maxHeight: 50, maxWeight: 150 }, items: [
    { sku: 'A', label: 'A', l: 10, w: 30, h: 50, weight: 14, qty: 1, keepUpright: false, maxStack: 0 },
    { sku: 'B', label: 'B', l: 50, w: 10, h: 50, weight: 8, qty: 1, keepUpright: false, maxStack: 0 },
    { sku: 'C', label: 'C', l: 30, w: 30, h: 20, weight: 4, qty: 3, keepUpright: false },
  ], maxPallets: 1 };
  for (const options of [{}, ...['default', 'height', 'footprint', 'layered'].map(strategy => ({ strategy }))]) {
    verifyPacking(q, estimatePallet(q, options));
  }
});
test("Legacy pallet requests reject any supplied units field", () => {
  for (const units of ['in-lb', 'cm-kg', undefined, null]) {
    assert.throws(() => parsePalletRequest({ ...simple(), units }),
      { field: 'units', message: 'units: this endpoint is cm/kg only; use /api/order-quote for units' });
    assert.throws(() => planOrder({ request: { ...simple(), units }, maxPallets: 1 }), { field: 'units' });
  }
});
test("Tea and teaware fit on one pallet", () => {
  const q = layeredCase();
  const r = planOrder({ ...q, maxPallets: 20 });
  assert.equal(r.palletCount, 1);
  assert.equal(r.placedCount, 30);
  assert.equal(estimatePallet(q).status, 'complete');
  for (const options of [{}, { strategy: 'layered' }]) {
    const estimate = estimatePallet(q, options);
    verifyPacking(q, estimate);
    assert.deepEqual(estimatePallet(structuredClone(q), options), estimate);
  }
});
test("Layered constraints and rollback conserve remainders", () => {
  for (const patch of [{}, { maxStack: 0 }, { maxStack: 8 }, { keepUpright: false }]) {
    for (const maxWeight of [20, 750]) {
      const q = simple(); q.pallet.maxWeight = maxWeight;
      Object.assign(q.items[0], patch); q.items[0].qty = 13;
      const r = estimatePallet(q, { strategy: 'layered' });
      verifyPacking(q, r);
      if (patch.maxStack === 8 && maxWeight === 750) assert.equal(r.placedCount, 8);
      if (maxWeight === 20) assert.equal(r.placedCount, 2);
    }
  }
});
test("Best-of preserves old winners at lower or equal height", () => {
  const tall = simple(); tall.items[0] = { ...tall.items[0], l: 20, w: 20, h: 100, qty: 1, keepUpright: false };
  for (const q of [sample(), simple(), tall, ...Array.from({ length: 18 }, (_, n) => {
    const r = sample(); r.items[0].qty = 4+n; r.items[1].h = 10+n; return r;
  })]) {
    const old = ['default','height','footprint'].map(strategy => estimatePallet(q, { strategy })).sort((a,b) => a.unplacedCount-b.unplacedCount || a.cargoHeight-b.cargoHeight)[0];
    const layered = estimatePallet(q, { strategy: 'layered' });
    const best = estimatePallet(q);
    verifyPacking(q, layered);
    if (old.unplacedCount <= layered.unplacedCount && (old.unplacedCount < layered.unplacedCount || old.cargoHeight <= layered.cargoHeight)) {
      assert.deepEqual(best.boxes, old.boxes);
      assert.equal(best.method.strategy, old.method.strategy);
    }
  }
});
test("Known three-layer pallet: 90 cm cargo + 15 cm base", () => {
  const r = estimatePallet(simple());
  assert.equal(r.status, "complete");
  assert.equal(r.loadedHeight, 105);
  assert.equal(r.cargoWeight, 96);
  assert.equal(r.unplacedCount, 0);
});
test("Complete order is never shortened by dropping cartons", () => {
  const q = simple();
  q.pallet.maxHeight = 70;
  const r = estimatePallet(q);
  assert.equal(r.status, "partial");
  assert.equal(r.placedCount, 4);
  assert.equal(r.unplacedCount, 8);
  assert.equal(r.loadedHeight, 45);
});
test("Payload cap and per-SKU remainder are explicit", () => {
  const q = simple();
  q.pallet.maxWeight = 20;
  const r = estimatePallet(q);
  assert.equal(r.placedCount, 2);
  assert.equal(r.cargoWeight, 16);
  assert.equal(r.byItem[0].remaining, 10);
  assert.ok(r.notes.includes("ORDER_EXCEEDS_PAYLOAD"));
});
test("Zero support load prevents stacking", () => {
  const q = simple();
  q.items[0].maxStack = 0;
  const r = estimatePallet(q);
  assert.equal(r.placedCount, 4);
  assert.ok(r.boxes.every((b) => b.py === 0));
});
test("An oversized upright carton is not silently rotated or counted", () => {
  const q = simple();
  q.items[0] = { ...q.items[0], l: 130, w: 90, h: 10, qty: 1 };
  const r = estimatePallet(q);
  assert.equal(r.placedCount, 0);
  assert.equal(r.loadedHeight, 15);
  assert.equal(r.status, "partial");
});
test("Rotation can reduce height when tipping is allowed", () => {
  const q = simple();
  q.items[0] = {
    ...q.items[0],
    l: 20,
    w: 20,
    h: 100,
    qty: 1,
    keepUpright: false,
  };
  assert.equal(estimatePallet(q).cargoHeight, 20);
  q.items[0].keepUpright = true;
  assert.equal(estimatePallet(q).cargoHeight, 100);
});
test("Results are deterministic and source data is unchanged", () => {
  const q = sample(),
    before = JSON.stringify(q);
  assert.deepEqual(estimatePallet(q), estimatePallet(q));
  assert.equal(JSON.stringify(q), before);
});
test("Mixed loads stay within bounds, supported, non-overlapping and fully accounted for", () => {
  for (let n = 0; n < 18; n++) {
    const q = sample();
    q.items[0].qty = 4 + n;
    q.items[1].h = 10 + n;
    q.items[1].qty = 3 + n;
    const r = estimatePallet(q);
    assert.equal(r.placedCount + r.unplacedCount, r.requestedCount);
    assert.equal(
      r.byItem.reduce((s, x) => s + x.remaining, 0),
      r.unplacedCount
    );
    for (const b of r.boxes) {
      assert.ok(b.px >= 0 && b.py >= 0 && b.pz >= 0);
      assert.ok(
        b.px + b.l <= q.pallet.l + 1e-6 &&
          b.pz + b.w <= q.pallet.w + 1e-6 &&
          b.py + b.h + q.pallet.baseHeight <= q.pallet.maxHeight + 1e-6
      );
      for (const other of r.boxes)
        if (b.id !== other.id)
          assert.ok(
            !(
              b.px < other.px + other.l - 1e-6 &&
              b.px + b.l > other.px + 1e-6 &&
              b.py < other.py + other.h - 1e-6 &&
              b.py + b.h > other.py + 1e-6 &&
              b.pz < other.pz + other.w - 1e-6 &&
              b.pz + b.w > other.pz + 1e-6
            )
          );
      if (b.py > 1e-6) {
        const area = r.boxes
          .filter((o) => Math.abs(o.py + o.h - b.py) < 1e-6)
          .reduce(
            (s, o) =>
              s +
              Math.max(
                0,
                Math.min(b.px + b.l, o.px + o.l) - Math.max(b.px, o.px)
              ) *
                Math.max(
                  0,
                  Math.min(b.pz + b.w, o.pz + o.w) - Math.max(b.pz, o.pz)
                ),
            0
          );
        assert.ok(area >= b.l * b.w * 0.6 - 1e-6);
      }
    }
  }
});
test("Strict validation rejects nonfinite, negative, fractional and excessive input", () => {
  for (const v of [NaN, Infinity, -1, 0, "12", null]) {
    const q = sample();
    q.items[0].l = v;
    assert.throws(() => parsePalletRequest(q));
  }
  for (const v of [0, -1, 1.5, 201]) {
    const q = sample();
    q.items[0].qty = v;
    assert.throws(() => parsePalletRequest(q));
  }
  const q = sample();
  q.pallet.maxHeight = q.pallet.baseHeight;
  assert.throws(() => parsePalletRequest(q));
  const t = sample();
  t.items[0].keepUpright = "false";
  assert.throws(() => parsePalletRequest(t));
  const w = sample();
  w.items[0].weight = 0;
  assert.throws(() => parsePalletRequest(w));
  assert.throws(() => parsePalletRequest({}));
});
test("Spreadsheet import preserves SKU-named cartons and validates every row", () => {
  const p = sample().pallet;
  assert.equal(parsePalletTable("SKU,60,40,30,8,12", p).items[0].label, "SKU");
  assert.equal(
    parsePalletTable("name,l,w,h,weight,qty\nSKU,60,40,30,8,12", p).items
      .length,
    1
  );
  assert.equal(
    parsePalletTable("名稱\t長\t寬\t高\t重量\t數量\nA\t60\t40\t30\t8\t12", p)
      .items[0].qty,
    12
  );
  assert.throws(() => parsePalletTable("A,60,40,30,8,12\nB,-1,20,20,4,1", p));
  assert.throws(() => parsePalletTable("A,60,40,30,8,1.5", p));
});
async function post(body, headers = {}) {
  return onRequestPost({
    request: new Request("https://example.test/api/pallet-estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    env: {},
  });
}
const ok = await post(sample());
assert.equal(ok.status, 200);
assert.deepEqual(
  await ok.json(),
  JSON.parse(JSON.stringify(estimatePallet(sample())))
);
console.log("✓ API and local engine return identical JSON");
checks++;
assert.equal((await post("{")).status, 400);
assert.equal((await post({})).status, 400);
assert.equal(
  (await post(sample(), { "Content-Type": "text/plain" })).status,
  415
);
assert.equal((await post(" ".repeat(32769))).status, 413);
const limited = await onRequestPost({
  request: new Request("https://example.test/api/pallet-estimate", {
    method: "POST",
    headers: { "CF-Connecting-IP": "192.0.2.1" },
    body: "{}",
  }),
  env: { LEADS: { get: async () => "200", put: async () => {} } },
});
assert.equal(limited.status, 429);
assert.ok(limited.headers.get("Retry-After"));
assert.equal((await onRequestGet({})).status, 200);
assert.equal((await onRequestOptions({})).status, 204);
checks++;
console.log("✓ HTTP validation, streaming body limit, CORS and rate limits");
const large = simple();
large.items[0] = { ...large.items[0], l: 10, w: 10, h: 10, qty: 200 };
const started = performance.now();
estimatePallet(large);
console.log(
  `200-carton estimate: ${(performance.now() - started).toFixed(1)} ms`
);
console.log(`${checks} pallet estimate checks passed`);
