import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PalletEstimateView from '../src/components/PalletEstimateView.tsx';
import { findOrderOptions, OPTIONS_LIMITS } from '../src/lib/orderOptions.ts';
import { quoteOrder, QUOTE_EXAMPLE, parseQuoteRequest } from '../src/lib/orderQuote.ts';
import { CHECK_SEMANTICS } from '../src/lib/packChecks.ts';
import { ENDPOINT_BASE_LIMITS } from '../src/lib/apiTiers.ts';
import { onRequestPost, onRequestGet, onRequestOptions } from '../functions/api/order-options.ts';

let count = 0;
async function test(name, fn) { await fn(); console.log(`PASS order-options: ${name}`); count++; }
const simple = () => ({ pallet: { l: 100, w: 100, baseHeight: 10, maxHeight: 60, maxWeight: 1000, tareWeight: 10 }, maxPallets: 20,
  items: [{ sku: 'A', l: 50, w: 50, h: 50, qty: 6, weight: 2 }, { sku: 'LOCK', l: 50, w: 50, h: 50, qty: 1, weight: 2 }] });
const permission = { sku: 'A', minQty: 2, maxQty: 8, qtyStep: 2 };
const fixture = () => ({ pallet: { l: 100, w: 100, baseHeight: 10, maxHeight: 100, maxWeight: 1000, tareWeight: 10 }, maxPallets: 20,
  items: [{ sku: 'S0', l: 70, w: 40, h: 50, qty: 6, weight: 2, keepUpright: true }, { sku: 'S1', l: 70, w: 60, h: 20, qty: 5, weight: 7, keepUpright: true }, { sku: 'S2', l: 70, w: 40, h: 30, qty: 5, weight: 3, keepUpright: true }] });
function verify(result, request) {
  assert.ok(result.alternatives.length <= 3);
  assert.equal(result.semantics, CHECK_SEMANTICS);
  assert.match(result.inputHash, /^[a-f0-9]{64}$/);
  assert.equal(result.searched.candidates, result.searched.phase1 + result.searched.phase2);
  assert.ok(result.searched.candidates <= result.searched.budget);
  assert.equal(result.checks.find(c => c.code === 'ORDER_OPTIONS_CONSERVATION').status, 'pass');
  assert.equal(result.checks.find(c => c.code === 'LIMITS_UNCHANGED').status, 'pass');
  const parsed = parseQuoteRequest(request);
  for (const a of result.alternatives) {
    assert.equal(a.quote.status, 'complete');
    assert.equal(a.quote.semantics, CHECK_SEMANTICS);
    assert.match(a.candidateHash, /^[a-f0-9]{64}$/);
    assert.equal(a.quote.summary.cartonsUnplaced, 0);
    assert.deepEqual(a.quote.limits, result.baseline.quote.limits);
    let expected = 0;
    for (const it of parsed.items) {
      const c = a.quantityChanges.find(c => c.sku === it.sku);
      const qty = c?.to ?? it.qty; expected += qty;
      if (c) {
        const p = request.adjustments.find(p => p.sku === c.sku);
        assert.ok(p); assert.equal(c.from, it.qty); assert.equal(c.delta, c.to - c.from);
        assert.ok(qty >= p.minQty && qty <= p.maxQty); assert.equal(Math.abs(c.delta % (p.qtyStep ?? 1)), 0);
      }
      assert.equal(a.quote.byItem.find(b => b.sku === it.sku)?.placed ?? 0, qty);
    }
    assert.equal(a.quote.summary.cartonsPlaced, expected);
    assert.equal(a.quote.pallets.reduce((n, p) => n + p.boxes.length, 0), expected);
    const ids = new Set();
    for (const p of a.quote.pallets) {
      assert.equal(p.boxes.length, p.cartonCount);
      assert.ok(p.cargoWeight.kg <= parsed.pallet.maxWeight + 1e-6);
      assert.ok(p.checks.every(c => c.status !== 'fail'));
      for (const [i, b] of p.boxes.entries()) {
        assert.ok(!ids.has(b.id)); ids.add(b.id);
        assert.ok(b.px >= 0 && b.py >= 0 && b.pz >= 0);
        assert.ok(b.px + b.l <= parsed.pallet.l + 1e-6 && b.pz + b.w <= parsed.pallet.w + 1e-6 && b.py + b.h <= parsed.pallet.maxHeight - parsed.pallet.baseHeight + 1e-6);
        for (const c of p.boxes.slice(i + 1)) assert.ok(!(b.px < c.px + c.l - 1e-6 && c.px < b.px + b.l - 1e-6 && b.py < c.py + c.h - 1e-6 && c.py < b.py + b.h - 1e-6 && b.pz < c.pz + c.w - 1e-6 && c.pz < b.pz + b.w - 1e-6), 'overlap');
      }
    }
  }
}
await test('repacking improves a five-pallet baseline without changes; phase 2 never runs', async () => {
  const r = { ...fixture(), adjustments: [{ sku: 'S0', minQty: 0, maxQty: 10 }] };
  const saved = structuredClone(r), q = await findOrderOptions(r);
  assert.deepEqual(q.baseline.quote, await quoteOrder(r)); assert.equal(q.baseline.palletCount, 5);
  assert.equal(q.outcome, 'found'); assert.equal(q.alternatives[0].palletCount, 4);
  assert.equal(q.searched.phase1, 15); assert.equal(q.searched.phase2, 0);
  assert.ok(q.alternatives.every(a => !a.quantityChanges.length)); assert.deepEqual(r, saved); verify(q, r);
});
await test('adjustments respect bounds, current-anchored step and locked SKUs', async () => {
  const r = { ...simple(), adjustments: [permission] }; const q = await findOrderOptions(r);
  assert.equal(q.outcome, 'found'); assert.deepEqual(q.alternatives[0].quantityChanges, [{ sku: 'A', from: 6, to: 2, delta: -4 }]);
  assert.equal(q.alternatives[0].palletCount, 1); assert.equal(q.searched.phase2, 3); verify(q, r);
});
await test('single changes precede pairs; paired reductions work', async () => {
  const r = simple(); r.items[0].qty = 3; r.items[1].qty = 3;
  r.adjustments = r.items.map(it => ({ sku: it.sku, minQty: 2, maxQty: 3 }));
  const singles = await findOrderOptions({ ...r, searchBudget: 17 }); assert.equal(singles.outcome, 'none_within_search');
  const q = await findOrderOptions({ ...r, searchBudget: 18 });
  assert.equal(q.alternatives[0].quantityChanges.length, 2); assert.equal(q.alternatives[0].palletCount, 1); verify(q, r);
});
await test('adding units consumes spare capacity without another pallet', async () => {
  const r = { ...simple(), adjustments: [{ sku: 'A', minQty: 6, maxQty: 8 }] };
  const q = await findOrderOptions(r); assert.equal(q.alternatives[0].palletCount, 2);
  assert.equal(q.alternatives[0].quantityChanges[0].to, 7); verify(q, r);
});
await test('zero quantity explicitly defers a SKU; empty shipments excluded', async () => {
  const r = simple(); r.items[0].qty = 4; r.adjustments = [{ sku: 'A', minQty: 0, maxQty: 4, qtyStep: 4 }];
  const q = await findOrderOptions(r); assert.equal(q.alternatives[0].quantityChanges[0].to, 0); verify(q, r);
  r.items.pop(); r.items[0].qty = 5; r.adjustments = [{ sku: 'A', minQty: 0, maxQty: 5, qtyStep: 5 }];
  assert.equal((await findOrderOptions(r)).alternatives.length, 0);
});
await test('receiver height and gross failures never qualify, including missing tare', async () => {
  for (const limits of [{ maxLoadedHeight: 59 }, { maxGrossWeight: 11 }]) {
    const r = { ...simple(), adjustments: [permission], limits }; const q = await findOrderOptions(r);
    assert.equal(q.baseline.quote.status, 'needs_review'); assert.equal(q.outcome, 'none_within_search'); verify(q, r);
  }
  const r = { ...simple(), adjustments: [permission], limits: { maxGrossWeight: 5 } }; delete r.pallet.tareWeight;
  assert.equal((await findOrderOptions(r)).alternatives.length, 0);
});
await test('envelope, payload, upright and crush limits remain enforced', async () => {
  const r = { ...fixture(), adjustments: [{ sku: 'S0', minQty: 1, maxQty: 6 }], packagingAllowance: { height: 2, weight: 3 }, limits: { maxLoadedHeight: 102, maxGrossWeight: 40 } };
  r.pallet.maxWeight = 25; r.items = r.items.map(it => ({ ...it, maxStack: 0 }));
  verify(await findOrderOptions(r), r);
});
await test('economics arithmetic, additions, explicit zeros and absent costs', async () => {
  const r = { ...simple(), adjustments: [permission], economics: { palletFreight: 100, handlingPerPallet: 10, contributionPerUnit: { A: 3 }, deferralCostPerUnit: { A: 2 }, currency: 'USD' } };
  const q = await findOrderOptions(r); assert.deepEqual(q.alternatives[0].economics, { freightSaved: 100, handlingSaved: 10, contributionDeferred: 12, deferralCost: 8, netSavings: 90 });
  r.adjustments = [{ sku: 'A', minQty: 6, maxQty: 8 }];
  assert.equal((await findOrderOptions(r)).alternatives[0].economics.netSavings, 3);
  delete r.economics.handlingPerPallet; assert.equal((await findOrderOptions(r)).alternatives[0].economics.netSavings, null);
  const repack = await findOrderOptions({ ...fixture(), economics: { palletFreight: 0, handlingPerPallet: 0 } });
  assert.equal(repack.alternatives[0].economics.netSavings, 0);
});
await test('ranking count, absolute units changed, then savings; at most three', async () => {
  const r = simple(); r.items[0].qty = 5; r.items[1].qty = 5;
  r.adjustments = r.items.map(it => ({ sku: it.sku, minQty: 0, maxQty: 7 }));
  r.economics = { palletFreight: 100, handlingPerPallet: 0, contributionPerUnit: { A: 4, LOCK: 1 }, deferralCostPerUnit: { A: 0, LOCK: 0 } };
  r.searchBudget = 200;
  const q = await findOrderOptions(r); assert.equal(q.alternatives.length, 3); verify(q, r);
  const rank = a => [a.palletCount, a.quantityChanges.reduce((n, c) => n + Math.abs(c.delta), 0), -a.economics.netSavings];
  for (let i = 1; i < q.alternatives.length; i++) { const a = rank(q.alternatives[i-1]), b = rank(q.alternatives[i]); assert.ok(a[0] < b[0] || (a[0] === b[0] && (a[1] < b[1] || (a[1] === b[1] && a[2] <= b[2])))); }
});
await test('none, already-at-target, partial baseline and exhausted budget statuses', async () => {
  const q = await findOrderOptions(simple()); assert.equal(q.outcome, 'none_within_search'); assert.equal(q.target, 1);
  const a = await findOrderOptions({ ...simple(), targetPalletCount: 2 }); assert.equal(a.outcome, 'already_at_target'); assert.equal(a.searched.candidates, 0);
  const b = await findOrderOptions({ ...fixture(), searchBudget: 1 }); assert.equal(b.searched.candidates, 1); assert.equal(b.checks[2].status, 'warn');
  assert.equal(q.checks[2].status, 'pass');
  const p = await findOrderOptions({ ...simple(), maxPallets: 1 }); assert.equal(p.baseline.quote.status, 'partial'); assert.equal(p.outcome, 'none_within_search');
  const one = simple(); one.items[0].qty = 1; const single = await findOrderOptions(one); assert.equal(single.target, 1); assert.equal(single.outcome, 'already_at_target');
});
await test('determinism, hash sensitivity, selection replay and actuals excluded from identity', async () => {
  const r = fixture(), q = await findOrderOptions(r); assert.deepEqual(await findOrderOptions(structuredClone(r)), q);
  assert.notEqual((await findOrderOptions({ ...r, searchBudget: 30 })).inputHash, q.inputHash);
  assert.notEqual((await findOrderOptions({ ...r, economics: { palletFreight: 1 } })).inputHash, q.inputHash);
  assert.notEqual((await findOrderOptions({ ...r, adjustments: [{ sku: 'S0', minQty: 1, maxQty: 6 }] })).inputHash, q.inputHash);
  const a = q.alternatives[0]; const replay = await quoteOrder({ ...r, packing: a.packing }); assert.deepEqual(replay, a.quote);
  assert.notEqual(replay.inputHash, q.baseline.quote.inputHash);
  assert.equal((await findOrderOptions({ ...r, actuals: { summary: { actualPalletCount: 7 } } })).inputHash, q.inputHash);
});
await test('imperial requests return both units and preserve receiver limits', async () => {
  const r = simple(); r.units = 'in-lb';
  for (const k of ['l', 'w', 'baseHeight', 'maxHeight']) r.pallet[k] /= 2.54;
  for (const k of ['maxWeight', 'tareWeight']) r.pallet[k] /= 0.45359237;
  r.items.forEach(it => { for (const k of ['l','w','h']) it[k] /= 2.54; it.weight /= 0.45359237; });
  r.adjustments = [permission]; const q = await findOrderOptions(r); assert.equal(q.alternatives[0].palletCount, 1); verify(q, r);
  assert.equal(q.alternatives[0].quote.units.request, 'in-lb'); assert.equal(q.alternatives[0].quote.pallets[0].outerDims.l.cm, 100);
});
await test('actuals summary is validated, echoed alongside per-pallet variance, and not unit-converted', async () => {
  const summary = { actualPalletCount: 3, selectedOptionId: 'option-123', measuredAt: '2026-09-11T08:00:00Z' };
  const r = { ...simple(), actuals: { summary, 0: { height: 60 } } }; const q = await quoteOrder(r);
  assert.deepEqual(q.variance.summary, summary); assert.equal(q.pallets[0].variance.height.measured, 60);
  assert.equal(q.inputHash, (await quoteOrder(simple())).inputHash);
  assert.deepEqual((await quoteOrder({ ...simple(), actuals: { summary: {} } })).variance.summary, {});
  for (const [key, value] of [['actualPalletCount', -1], ['actualPalletCount', 1.5], ['actualPalletCount', '2'], ['selectedOptionId', 2], ['selectedOptionId', 'x'.repeat(81)], ['measuredAt', 'not a date'], ['measuredAt', '2026-02-30T00:00:00Z'], ['measuredAt', '2026-09-11T00:00:00'], ['actualPalletCount', null], ['selectedOptionId', '']]) {
    await assert.rejects(quoteOrder({ ...simple(), actuals: { summary: { [key]: value } } }), e => e.field === `actuals.summary.${key}`);
  }
  await assert.rejects(quoteOrder({ ...simple(), actuals: { summary: [] } }), e => e.field === 'actuals.summary');
});
await test('every options field rejects malformed input with its field path', async () => {
  const cases = [
    [{ searchBudget: 0 }, 'searchBudget'], [{ searchBudget: 201 }, 'searchBudget'], [{ searchBudget: 1.5 }, 'searchBudget'],
    [{ targetPalletCount: 0 }, 'targetPalletCount'], [{ targetPalletCount: 21 }, 'targetPalletCount'], [{ targetPalletCount: '1' }, 'targetPalletCount'],
    [{ adjustments: {} }, 'adjustments'], [{ adjustments: [null] }, 'adjustments[0]'],
    [{ adjustments: [{ ...permission, sku: 'missing' }] }, 'adjustments[0].sku'], [{ adjustments: [permission, permission] }, 'adjustments[1].sku'],
    [{ adjustments: [{ ...permission, minQty: -1 }] }, 'adjustments[0].minQty'], [{ adjustments: [{ ...permission, minQty: 2.5 }] }, 'adjustments[0].minQty'],
    [{ adjustments: [{ ...permission, maxQty: 1 }] }, 'adjustments[0].maxQty'], [{ adjustments: [{ ...permission, maxQty: 201 }] }, 'adjustments[0].maxQty'],
    [{ adjustments: [{ ...permission, maxQty: 5 }] }, 'adjustments[0]'], [{ adjustments: [{ ...permission, qtyStep: 0 }] }, 'adjustments[0].qtyStep'], [{ adjustments: [{ ...permission, qtyStep: 1.5 }] }, 'adjustments[0].qtyStep'],
    [{ economics: [] }, 'economics'], [{ economics: { palletFreight: -1 } }, 'economics.palletFreight'], [{ economics: { handlingPerPallet: Infinity } }, 'economics.handlingPerPallet'],
    [{ economics: { contributionPerUnit: [] } }, 'economics.contributionPerUnit'], [{ economics: { contributionPerUnit: { A: '3' } } }, 'economics.contributionPerUnit.A'],
    [{ economics: { deferralCostPerUnit: { A: -1 } } }, 'economics.deferralCostPerUnit.A'], [{ economics: { deferralCostPerUnit: { missing: 1 } } }, 'economics.deferralCostPerUnit.missing'],
    [{ economics: { currency: 'usd' } }, 'economics.currency'], [{ economics: { currency: 1 } }, 'economics.currency'],
    [{ pallet: {} }, 'pallet.l'], [{ items: [] }, 'items'], [{ units: 'mm' }, 'units'], [{ maxPallets: 21 }, 'maxPallets'],
    [{ packing: { strategy: 'other' } }, 'packing.strategy'], [{ packing: { ordering: 'other' } }, 'packing.ordering'],
  ];
  for (const [patch, field] of cases) await assert.rejects(findOrderOptions({ ...simple(), ...patch }), e => e.field === field, field);
  await assert.rejects(findOrderOptions(null), e => e.field === 'request');
});
await test('rendered SVG contains exactly each alternative pallet carton count', async () => {
  const q = await findOrderOptions(fixture());
  for (const a of q.alternatives) for (const p of a.quote.pallets) {
    const html = renderToStaticMarkup(React.createElement(PalletEstimateView, { countTestId: 'option-placed-count', result: { boxes: p.boxes, pallet: fixture().pallet, loadedHeight: p.loadedHeight.cm } }));
    assert.match(html, new RegExp(`data-testid="option-placed-count"[^>]*>${p.cartonCount}</output>`));
    const ids = new Set([...html.matchAll(/data-box-id="([^"]+)"/g)].map(m => m[1]));
    ids.delete('base'); assert.equal(ids.size, p.cartonCount);
    assert.equal([...html.matchAll(/data-box-id="/g)].length, (p.cartonCount + 1) * 6);
  }
});
await test('receiver screening uses unrounded placements and economics maps require own SKU keys', async () => {
  const r = simple(); r.adjustments = [permission]; delete r.pallet.tareWeight;
  r.items.forEach(it => { it.weight = 2.001; }); r.limits = { maxGrossWeight: 6.001 };
  assert.equal((await findOrderOptions(r)).alternatives.length, 0);
  const x = simple(); x.items[0].sku = '__proto__'; x.adjustments = [{ ...permission, sku: '__proto__' }];
  x.economics = { palletFreight: 1, handlingPerPallet: 0, contributionPerUnit: {}, deferralCostPerUnit: {} };
  assert.equal((await findOrderOptions(x)).alternatives[0].economics.netSavings, null);
});
await test('endpoint 200/400/413/415, streaming limit, CORS, GET example and invalid key', async () => {
  const ctx = (body, headers = {}) => ({ env: {}, request: new Request('https://x/api/order-options', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body, ...(body instanceof ReadableStream ? { duplex: 'half' } : {}) }) });
  const r = { ...simple(), adjustments: [permission] };
  const response = await onRequestPost(ctx(JSON.stringify(r))); assert.equal(response.status, 200);
  const json = await response.json(); assert.equal(json.tier, 'anonymous'); verify(json, r);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
  let res = await onRequestPost(ctx(JSON.stringify({ ...r, searchBudget: 201 }))); assert.equal(res.status, 400); assert.equal((await res.json()).field, 'searchBudget');
  assert.equal((await onRequestPost(ctx('{'))).status, 400);
  assert.equal((await onRequestPost(ctx('{}', { 'Content-Type': 'text/plain' }))).status, 415);
  assert.equal((await onRequestPost(ctx('{}', { 'Content-Type': 'application/jsonp' }))).status, 415);
  assert.ok((await (await onRequestPost(ctx(JSON.stringify(r), { 'X-API-Key': 'malformed' }))).json()).warning);
  assert.equal((await onRequestPost(ctx('x'.repeat(OPTIONS_LIMITS.bodyBytes + 1)))).status, 413);
  const stream = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(30000)); c.enqueue(new Uint8Array(20000)); c.close(); } });
  assert.equal((await onRequestPost(ctx(stream))).status, 413);
  assert.equal((await onRequestPost(ctx(JSON.stringify(r).padEnd(OPTIONS_LIMITS.bodyBytes, ' ')))).status, 200);
  const invalidCtx = ctx(JSON.stringify(r), { 'X-API-Key': 'dp_live_' + 'a'.repeat(32) }); invalidCtx.env = { LEADS: { get: async () => null } };
  const invalid = await (await onRequestPost(invalidCtx)).json(); assert.equal(invalid.tier, 'anonymous'); assert.ok(invalid.warning);
  const get = await (await onRequestGet()).json(); assert.equal(get.endpoint, 'POST /api/order-options'); assert.deepEqual(get.request, QUOTE_EXAMPLE); assert.equal(get.limits.bodyBytes, 49152); assert.equal(get.semantics, CHECK_SEMANTICS);
  for (const key of ['purpose', 'request', 'limits', 'response', 'semantics', 'docs']) assert.ok(get[key]);
  const options = await onRequestOptions(); assert.equal(options.status, 204); assert.match(options.headers.get('Access-Control-Allow-Headers'), /X-API-Key, Authorization/);
  assert.deepEqual(ENDPOINT_BASE_LIMITS['order-options'], { perMin: 5, perDay: 50 });
  const counters = new Map(); const env = { LEADS: { get: async k => counters.get(k) ?? null, put: async (k, v) => { counters.set(k, v); } } };
  for (let i = 0; i < 5; i++) assert.equal((await onRequestPost({ ...ctx(JSON.stringify(r), { 'CF-Connecting-IP': '192.0.2.1' }), env })).status, 200);
  res = await onRequestPost({ ...ctx(JSON.stringify(r), { 'CF-Connecting-IP': '192.0.2.1' }), env });
  assert.equal(res.status, 429); assert.ok(res.headers.get('Retry-After'));
  const daily = { LEADS: { get: async k => k.includes('|86400|') ? '50' : '0', put: async () => {} } };
  assert.equal((await onRequestPost({ ...ctx(JSON.stringify(r), { 'CF-Connecting-IP': '192.0.2.2' }), env: daily })).status, 429);
});
console.log(`${count} order-options checks passed`);
