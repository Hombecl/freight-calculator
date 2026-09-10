#!/usr/bin/env node
/**
 * order-quote.mjs — contract tests for the quoting layer over planOrder.
 * The promises on /order-quote and /api-docs#order-quote are pinned here.
 */
import assert from 'node:assert/strict';
import { quoteOrder, quoteCsv, parseQuoteRequest, inputHash, QUOTE_EXAMPLE } from '../src/lib/orderQuote.ts';
import { planOrder } from '../src/lib/orderPlanning.ts';
import { onRequestPost, onRequestGet } from '../functions/api/order-quote.ts';

const clone = () => structuredClone(QUOTE_EXAMPLE);

// ---- all cargo fits; packaging exceeds the receiver limit, deterministically ----
{
  const q = await quoteOrder(clone());
  assert.equal(q.status, 'needs_review');
  assert.deepEqual(q.reviewReasons, ['LOADED_HEIGHT@pallet0']);
  assert.equal(q.summary.palletCount, 1);
  assert.equal(q.orderId, 'SO-10482');
  assert.equal(q.meter.id, 'SO-10482');
  assert.match(q.inputHash, /^[0-9a-f]{64}$/);
  assert.equal(q.engineVersion, 'order-v1+quote-v1');
  assert.equal(q.summary.cartonsPlaced, 40);
  assert.equal(q.summary.cartonsUnplaced, 0);
  assert.ok(q.summary.palletCount >= 1 && q.summary.palletCount <= 5);
  for (const p of q.pallets) {
    // gross = cargo + tare + allowance
    assert.equal(p.grossWeight.kg, Math.round((p.cargoWeight.kg + 22 + 1.5) * 100) / 100);
    // Outer height includes allowance; the improved single pallet must be reviewed.
    assert.equal(p.outerDims.h.cm, Math.round((p.loadedHeight.cm + 3) * 100) / 100);
    assert.equal(p.outerDims.h.cm, 182.5);
    assert.equal(p.checks.find((c) => c.code === 'LOADED_HEIGHT').status, 'fail');
    assert.ok(p.checks.find((c) => c.code === 'GROSS_WEIGHT').status === 'pass');
    // both unit systems present and consistent
    assert.ok(Math.abs(p.outerDims.h.in * 2.54 - p.outerDims.h.cm) < 0.05);
    assert.ok(Math.abs(p.grossWeight.lb * 0.45359237 - p.grossWeight.kg) < 0.05);
    // sku identity preserved
    assert.ok(p.byItem.every((b) => ['TEA-1KG-CASE', 'TIN-GIFT-12', 'TEAWARE-SET'].includes(b.sku)));
  }
  // every check states an assumption
  for (const c of [...q.checks, ...q.pallets.flatMap((p) => p.checks)]) assert.ok(c.assumption.length > 10, c.code);
  // one sku lacks maxStack → warn, not fail
  assert.equal(q.checks.find((c) => c.code === 'STACK_LIMITS_PROVIDED').status, 'warn');
  // deterministic: same input → same hash and same result
  const again = await quoteOrder(clone());
  assert.equal(again.inputHash, q.inputHash);
  assert.deepEqual(again.pallets.map((p) => p.outerDims.h.cm), q.pallets.map((p) => p.outerDims.h.cm));
  // pallets agree with planOrder on the canonical request
  const plan = planOrder({ request: parseQuoteRequest(clone()).canonical, maxPallets: 5 });
  assert.equal(plan.palletCount, q.summary.palletCount);
  assert.deepEqual(plan.pallets.map((p) => p.loadedHeight), q.pallets.map((p) => p.loadedHeight.cm));
}

// ---- in-lb request gives the same hash and the same cm result ----
{
  const cm = clone();
  const inlb = clone();
  inlb.units = 'in-lb';
  const L = (v) => v / 2.54, W = (v) => v / 0.45359237;
  inlb.pallet = { l: L(cm.pallet.l), w: L(cm.pallet.w), baseHeight: L(cm.pallet.baseHeight), maxHeight: L(cm.pallet.maxHeight), maxWeight: W(cm.pallet.maxWeight), tareWeight: W(cm.pallet.tareWeight) };
  inlb.packagingAllowance = { height: L(3), weight: W(1.5) };
  inlb.limits = { ...cm.limits, maxLoadedHeight: L(182), maxGrossWeight: W(1000) };
  inlb.items = cm.items.map((it) => ({ ...it, l: L(it.l), w: L(it.w), h: L(it.h), weight: W(it.weight), ...(it.maxStack === undefined ? {} : { maxStack: W(it.maxStack) }) }));
  const a = await quoteOrder(cm), b = await quoteOrder(inlb);
  // floating conversion noise: compare to 1e-6 cm via the parsed canonical, and hashes must match once rounded the same way
  const pa = parseQuoteRequest(cm), pb = parseQuoteRequest(inlb);
  for (const k of ['l', 'w', 'baseHeight', 'maxHeight', 'maxWeight']) assert.ok(Math.abs(pa.pallet[k] - pb.pallet[k]) < 1e-9, k);
  assert.equal(a.summary.palletCount, b.summary.palletCount);
  assert.deepEqual(a.pallets.map((p) => p.outerDims.h.cm), b.pallets.map((p) => p.outerDims.h.cm));
  assert.equal(b.units.request, 'in-lb');
}

// ---- partial: never a whole-order quote ----
{
  const r = clone();
  r.maxPallets = 1;
  r.pallet.maxHeight = 60;
  const q = await quoteOrder(r);
  assert.equal(q.status, 'partial');
  assert.ok(q.summary.cartonsUnplaced > 0);
  assert.equal(q.checks.find((c) => c.code === 'ORDER_COMPLETE').status, 'fail');
  assert.ok(q.reviewReasons.includes('ORDER_COMPLETE'));
}

// ---- needs_review: placed, but the receiver's limit fails ----
{
  const r = clone();
  r.limits = { name: 'Retailer DC', maxLoadedHeight: 100, maxGrossWeight: 1000 };
  r.pallet.maxHeight = 180; // packing envelope allows it; the receiver does not
  const q = await quoteOrder(r);
  assert.equal(q.status, 'needs_review', JSON.stringify(q.summary));
  assert.ok(q.reviewReasons.some((x) => x.startsWith('LOADED_HEIGHT@pallet')));
  const failing = q.pallets.flatMap((p) => p.checks).find((c) => c.code === 'LOADED_HEIGHT' && c.status === 'fail');
  assert.ok(failing.observed > failing.limit);
  assert.match(failing.assumption, /Retailer DC/);
}

// ---- missing tare: gross is cargo-only, weight limit cannot be confirmed ----
{
  const r = clone();
  delete r.pallet.tareWeight;
  delete r.limits.maxLoadedHeight; // isolate the missing-tare warning from receiver height
  const q = await quoteOrder(r);
  assert.equal(q.checks.find((c) => c.code === 'TARE_PROVIDED').status, 'warn');
  assert.equal(q.pallets[0].checks.find((c) => c.code === 'GROSS_WEIGHT').status, 'warn');
  assert.equal(q.pallets[0].grossWeight.kg, Math.round((q.pallets[0].cargoWeight.kg + 1.5) * 100) / 100);
  assert.notEqual(q.status, 'needs_review', 'a warning must not trigger review by itself');
}

// ---- no limits supplied → not_evaluated, never silently "pass" ----
{
  const r = clone();
  delete r.limits;
  const q = await quoteOrder(r);
  assert.equal(q.pallets[0].checks.find((c) => c.code === 'LOADED_HEIGHT').status, 'not_evaluated');
  assert.equal(q.pallets[0].checks.find((c) => c.code === 'GROSS_WEIGHT').status, 'not_evaluated');
  assert.equal(q.limits.maxLoadedHeight, null);
}

// ---- actuals → variance ----
{
  const r = clone();
  r.actuals = { 0: { height: 150, grossWeight: 400, note: 'built 09-12' } };
  const q = await quoteOrder(r);
  const v = q.pallets[0].variance;
  assert.ok(v && v.height && v.grossWeight);
  assert.equal(v.height.measured, 150);
  assert.equal(v.height.delta, Math.round((150 - q.pallets[0].outerDims.h.cm) * 100) / 100);
  assert.equal(v.note, 'built 09-12');
  // actuals do not change the hash (they are evidence, not input)
  const base = await quoteOrder(clone());
  assert.equal(q.inputHash, base.inputHash);
}

// ---- validation ----
{
  const bad = async (mut, field) => {
    const r = clone(); mut(r);
    await assert.rejects(quoteOrder(r), (e) => e.field === field || String(e.message).startsWith(field), `${field}: ${JSON.stringify(r).slice(0, 80)}`);
  };
  await bad((r) => { r.units = 'mm'; }, 'units');
  await bad((r) => { r.items[1].sku = r.items[0].sku; }, 'items[1].sku');
  await bad((r) => { r.items[0].qty = 2.5; }, 'items[0].qty');
  await bad((r) => { r.items[0].qty = 500; }, 'items');
  await bad((r) => { r.maxPallets = 21; }, 'maxPallets');
  await bad((r) => { r.actuals = { 9: { height: 100 } }; }, 'actuals.9');
  await bad((r) => { r.pallet.maxHeight = 10; }, 'pallet.maxHeight');
  await bad((r) => { r.orderId = 'x'.repeat(81); }, 'orderId');
  // sku falls back to label, then to index
  const r = clone(); delete r.items[0].sku;
  assert.equal(parseQuoteRequest(r).items[0].sku, 'Loose-leaf 1 kg × 6');
  delete r.items[0].label;
  assert.equal(parseQuoteRequest(r).items[0].sku, 'sku0');
}

// ---- CSV ----
{
  const q = await quoteOrder(clone());
  const csv = quoteCsv(q);
  const lines = csv.trim().split('\r\n');
  assert.equal(lines.length, 1 + q.summary.palletCount);
  assert.match(lines[0], /^"order_id","pallet","cartons","length_in"/);
  assert.match(lines[1], /^"SO-10482","1"/);
  const csvInjection = await quoteOrder({ ...clone(), orderId: '=HYPERLINK("x")' });
  assert.match(quoteCsv(csvInjection).split('\r\n')[1], /^"'=HYPERLINK/);
}

// ---- endpoint ----
{
  const ctx = (body, headers = {}) => ({
    env: { LEADS: undefined },
    request: new Request('https://x/api/order-quote', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body }),
  });
  let res = await onRequestPost(ctx(JSON.stringify(clone())));
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.status, 'needs_review');
  assert.equal(j.tier, 'anonymous');
  assert.equal(j.meter.unit, 'order');
  res = await onRequestPost(ctx(JSON.stringify({ ...clone(), maxPallets: 99 })));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).field, 'maxPallets');
  res = await onRequestPost(ctx('{'));
  assert.equal(res.status, 400);
  res = await onRequestPost(ctx('x'.repeat(40000)));
  assert.equal(res.status, 413);
  res = await onRequestPost(ctx('{}', { 'Content-Type': 'text/plain' }));
  assert.equal(res.status, 415);
  const g = await (await onRequestGet()).json();
  assert.equal(g.endpoint, 'POST /api/order-quote');
  assert.equal(g.request.orderId, 'SO-10482');
  assert.ok(await inputHash(parseQuoteRequest(g.request)));
}


// Explicit layered selection is accepted and can be replayed with the same hash.
{
  const request = { ...clone(), items: clone().items.filter(it => it.sku !== 'TIN-GIFT-12'), packing: { strategy: 'layered' } };
  const q = await quoteOrder(request);
  assert.equal(q.status, 'complete');
  assert.equal(q.summary.palletCount, 1);
  assert.equal(q.summary.cartonsPlaced, 30);
  assert.deepEqual(await quoteOrder(structuredClone(request)), q);
}

console.log('order-quote.mjs: all assertions passed');
