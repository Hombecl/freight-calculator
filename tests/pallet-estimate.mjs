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
