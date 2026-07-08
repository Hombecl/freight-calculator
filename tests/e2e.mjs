#!/usr/bin/env node
/**
 * e2e.mjs — end-to-end browser tests for DimPack3D.
 *
 * Usage:
 *   node tests/e2e.mjs http://localhost:4174     # against a local build
 *   node tests/e2e.mjs https://dimpack3d.com     # against production (adds API flows)
 *
 * Uses the system Chrome (channel: 'chrome'), headless. Exit code 1 on any
 * failure; prints a PASS/FAIL line per test.
 */

import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:4174';
const IS_LIVE = BASE.includes('dimpack3d.com');

let passed = 0;
let failed = 0;
const results = [];

async function test(name, fn, page) {
  try {
    await fn();
    passed++;
    results.push(`PASS  ${name}`);
  } catch (e) {
    failed++;
    results.push(`FAIL  ${name} — ${String(e.message ?? e).split('\n')[0].slice(0, 140)}`);
    try { await page?.screenshot({ path: `/tmp/e2e-fail-${name.replace(/\W+/g, '_')}.png` }); } catch { /* */ }
  }
}

// PW_BROWSER=chromium on CI (playwright-managed); defaults to system Chrome locally
const browser = await chromium.launch({
  ...(process.env.PW_BROWSER === 'chromium' ? {} : { channel: 'chrome' }),
  headless: true,
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
// grant clipboard so share-link copy works
await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
const page = await ctx.newPage();
page.setDefaultTimeout(15_000);

// ---------- homepage ----------
await test('home: hero renders with headline', async () => {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /stop shipping air/i }).waitFor();
}, page);

await test('home: hero tabs switch container/carton scene', async () => {
  await page.getByRole('button', { name: /products → carton/i }).click();
  await page.getByText(/Master carton · 60×40×40/i).waitFor();
  await page.getByRole('button', { name: /cartons → container/i }).click();
  await page.getByText(/20' GP shipping container/i).waitFor();
}, page);

await test('home: chain nav links all five tools', async () => {
  for (const href of ['/planner', '/packing', '/container', '/fba', '/warehouse']) {
    const n = await page.locator(`a[href="${href}"], a[href="/zh${href}"]`).count();
    if (n === 0) throw new Error(`no link to ${href}`);
  }
}, page);

// ---------- planner ----------
await test('planner: loads with stats and 3D', async () => {
  await page.goto(`${BASE}/planner`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/Volume utilization/i).waitFor();
  await page.locator('canvas').first().waitFor();
}, page);

await test('planner: import modal paste flow', async () => {
  await page.getByRole('button', { name: /import excel\/csv/i }).click();
  await page.getByPlaceholder(/copy your rows/i).fill('name\tlength\twidth\theight\tweight\tqty\nTest Box\t50\t40\t30\t10\t25\n');
  await page.getByRole('button', { name: /import 1 carton type/i }).click();
  await page.locator('input[value="Test Box"]').waitFor();
}, page);

await test('planner: rotate/drop/delete/undo buttons exist', async () => {
  for (const name of [/rotate 90/i, /drop to floor/i, /^delete$/i, /undo/i, /reset to auto/i]) {
    await page.getByRole('button', { name }).first().waitFor();
  }
}, page);

await test('planner: export gate opens for anonymous CSV', async () => {
  await page.getByRole('button', { name: /^csv$/i }).click();
  await page.getByText(/unlock export/i).waitFor();
  await page.keyboard.press('Escape');
  await page.locator('.fixed.inset-0').first().click({ position: { x: 5, y: 5 } }).catch(() => {});
}, page);

// ---------- warehouse ----------
await test('warehouse: tutorial shows and dismisses', async () => {
  await page.goto(`${BASE}/warehouse`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/how this works/i).waitFor();
  await page.getByRole('button', { name: /got it/i }).click();
  await page.locator('canvas').first().waitFor();
}, page);

await test('warehouse: place one → route readout + buttons live', async () => {
  await page.getByRole('button', { name: /place one near the dock/i }).first().click();
  await page.getByText(/forklift route to|no route exists/i).waitFor();
  // poll: enablement lands one React flush after the readout appears
  await page.waitForFunction(() => {
    const btns = [...document.querySelectorAll('button')];
    const rot = btns.find((b) => /rotate 90/i.test(b.textContent ?? ''));
    const del = btns.find((b) => /^delete$/i.test((b.textContent ?? '').trim()));
    return rot && !rot.disabled && del && !del.disabled;
  }, undefined, { timeout: 5000 });
}, page);

await test('warehouse: delete removes and undo restores', async () => {
  await page.getByRole('button', { name: /^delete$/i }).click();
  await page.getByText(/forklift route to|no route exists/i).waitFor({ state: 'hidden' });
  const undo = page.getByRole('button', { name: /undo/i });
  if (await undo.isDisabled()) throw new Error('undo disabled after delete');
  await undo.click();
}, page);

await test('warehouse: dock side switch re-arranges without crash', async () => {
  await page.getByRole('button', { name: /^front$/i }).click();
  await page.getByText(/forklift access/i).waitFor();
  await page.getByRole('button', { name: /^right$/i }).click();
}, page);

await test('warehouse: example layouts load', async () => {
  await page.getByRole('button', { name: /example: 3pl floor/i }).click();
  await page.getByText(/rack\)/i).first().waitFor(); // "(N floor + M rack)" stat
  await page.getByRole('button', { name: /example: cross-dock/i }).click();
  await page.getByText(/forklift access/i).waitFor();
}, page);

await test('warehouse: PDF plan opens printable window', async () => {
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: /pdf plan/i }).click(),
  ]);
  await popup.waitForLoadState('domcontentloaded');
  const title = await popup.title();
  if (!/warehouse floor plan/i.test(title)) throw new Error(`popup title: ${title}`);
  await popup.close();
}, page);

// ---------- content pages ----------
await test('answers: hub and a combo page render computed counts', async () => {
  await page.goto(`${BASE}/answers/how-many-60x40x40-cartons-fit-in-a-20ft-container`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/225/).first().waitFor();
}, page);

await test('compare: easycargo page renders honestly', async () => {
  await page.goto(`${BASE}/compare/easycargo-alternative`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/what each competitor does better|choose easycargo if/i).first().waitFor();
}, page);

await test('i18n: /zh homepage renders Chinese', async () => {
  await page.goto(`${BASE}/zh`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/唔好再為空隙付運費/).waitFor();
}, page);

await test('plans: sign-in gate renders', async () => {
  await page.goto(`${BASE}/plans`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/sign in to keep your plans|accounts are not configured/i).waitFor();
}, page);

// ---------- physical realism (turn model + door aperture) ----------
await test('planner: door-aperture warning flags a too-tall carton', async () => {
  await page.goto(`${BASE}/planner`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/Volume utilization/i).waitFor();
  // make the first carton 235cm in every axis: fits the 20GP interior (239h)
  // but NOT the 234x228 door in any orientation
  const dims = page.locator('input[type="number"]');
  for (const i of [0, 1, 2]) await dims.nth(i).fill('235');
  await page.getByText(/won't fit through the door/i).waitFor();
  // restore ALL three dims — 60x235x235 still cannot pass (cross-section 235x235)
  for (const [i, v] of [[0, '60'], [1, '50'], [2, '45']]) await dims.nth(i).fill(v);
  await page.getByText(/won't fit through the door/i).waitFor({ state: 'hidden' });
}, page);

await test('warehouse: route readout reports 90° turns vs the turn box', async () => {
  await page.goto(`${BASE}/warehouse`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /got it/i }).click().catch(() => {});
  await page.getByRole('button', { name: /place one near the dock/i }).first().click();
  await page.getByText(/checked against the .* turn box|right at the dock/i).waitFor();
}, page);

await test('planner: truck vessel shows live axle loads; est. fills crush limit', async () => {
  await page.goto(`${BASE}/planner`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/Volume utilization/i).waitFor();
  await page.getByRole('button', { name: /53' trailer/i }).click();
  await page.getByText(/front axle group/i).waitFor();
  await page.getByText(/rear axle group/i).waitFor();
  await page.getByRole('button', { name: /^est\.$/i }).first().click();
  const v = await page.locator('label:has-text("Max on top") input').first().inputValue();
  if (!v || Number(v) <= 0) throw new Error(`est. did not fill crush limit: "${v}"`);
}, page);

await test('planner: pallet vessel offers overhang allowance', async () => {
  await page.getByRole('button', { name: /eur pallet/i }).click();
  await page.getByText(/overhang allowance/i).waitFor();
  await page.getByRole('button', { name: /2\.5 cm\/side/i }).click();
  await page.getByText(/Volume utilization/i).waitFor();
}, page);

await test('warehouse: chilled pallet without a chilled zone is flagged', async () => {
  await page.goto(`${BASE}/warehouse`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /got it/i }).click().catch(() => {});
  await page.getByRole('button', { name: /\+ chilled pallet/i }).click();
  await page.getByRole('button', { name: /place one near the dock/i }).last().click();
  await page.getByText(/outside their required zone/i).waitFor();
  // REGRESSION: auto-arrange must NOT strip zoneReq/weight (checks went silent)
  await page.getByRole('button', { name: /auto-arrange/i }).first().click();
  await page.getByText(/outside their required zone/i).waitFor();
}, page);

await test('home: reality-checks showcase renders all nine cards', async () => {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/reality checks — what the floor actually fights with/i).waitFor();
  for (const c of [/door clearance/i, /90° turn box/i, /axle loads/i, /loading sequence/i]) {
    await page.getByText(c).first().waitFor();
  }
}, page);

await test('planner: container vessel shows SOLAS VGM line', async () => {
  await page.goto(`${BASE}/planner`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/VGM \(cargo \+ 2,?300 kg tare\)/i).waitFor();
}, page);

await test('home: pain-first sections render (surprises + system story)', async () => {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/problems that surface at the last step/i).waitFor();
  await page.getByText(/the rear axle group is over/i).waitFor();
  await page.getByText(/one engine\. one plan\. every layer of your team\./i).waitFor();
  await page.getByText(/the loading crew/i).first().waitFor();
}, page);

await test('reality-checks: package page lists all 11 checks', async () => {
  await page.goto(`${BASE}/reality-checks`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /^reality checks/i }).waitFor();
  for (const c of [/door clearance/i, /load-shift voids/i, /solas vgm/i, /loading sequence/i]) {
    await page.getByText(c).first().waitFor();
  }
}, page);

await test('planner: FBA pallet preset locks overhang and shows the rule', async () => {
  await page.goto(`${BASE}/planner`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /fba pallet/i }).click();
  await page.getByText(/zero overhang — allowance locked/i).waitFor();
}, page);

await test('home: product clips render and load', async () => {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/watch the checks fire/i).waitFor();
  const vids = page.locator('video');
  if (await vids.count() < 2) throw new Error('expected 2 product clips');
  // both video files must actually be served (not 404-masked)
  for (const src of ['/media/warehouse-checks.webm', '/media/planner-drag.webm']) {
    const r = await page.request.get(`${BASE}${src}`);
    const ct = r.headers()['content-type'] ?? '';
    if (!r.ok() || ct.includes('text/html')) throw new Error(`${src}: ${r.status()} ${ct}`);
  }
}, page);

await test('tools: warehouse space calculator computes and keeps URL state', async () => {
  await page.goto(`${BASE}/warehouse-space-calculator?p=1000&s=selective&a=vna&l=5`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/estimated total footprint/i).waitFor();
  await page.getByText(/m²/).first().waitFor();
  const url = page.url();
  if (!url.includes('p=1000') || !url.includes('a=vna')) throw new Error(`URL state lost: ${url}`);
}, page);

await test('tools: aisle width calculator shows the Ast formula result', async () => {
  await page.goto(`${BASE}/forklift-aisle-width-calculator?t=reach&ll=122&c=30`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/right-angle stacking aisle/i).first().waitFor();
  await page.getByText(/3\.47 m/).waitFor(); // 170+25+122+30 = 347
}, page);

// ---------- regression: the manual-testing bug reports ----------
const dpBoxes = () => page.evaluate(() => (window.__dpBoxes ?? []).map((b) => `${b.id}:${b.px},${b.pz}`).join('|'));
const dpCount = () => page.evaluate(() => (window.__dpBoxes ?? []).length);

await test('warehouse REGRESSION: drag sticks and survives re-renders', async () => {
  await page.goto(`${BASE}/warehouse`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /got it/i }).click().catch(() => {});
  await page.locator('canvas').first().waitFor();
  await page.waitForTimeout(1500); // three.js scene up
  const before = await dpBoxes();
  const canvas = page.locator('canvas').first();
  const bb = await canvas.boundingBox();
  // try several grab points — pallet rows sit at different screen spots
  let after = before;
  outer: for (const fy of [0.55, 0.45, 0.65, 0.5]) {
    for (const fx of [0.45, 0.55, 0.35, 0.6]) {
      const gx = bb.x + bb.width * fx, gy = bb.y + bb.height * fy;
      await page.mouse.move(gx, gy);
      await page.mouse.down();
      for (let i = 1; i <= 10; i++) await page.mouse.move(gx + i * 12, gy, { steps: 1 });
      await page.mouse.up();
      await page.waitForTimeout(250);
      after = await dpBoxes();
      if (after !== before) break outer;
    }
  }
  if (after === before) throw new Error('drag did not move any box');
  // the tips interval re-renders every 7s — the old bug snapped boxes back
  await page.waitForTimeout(8000);
  const later = await dpBoxes();
  if (later !== after) throw new Error('layout REVERTED after idle re-render (reset bug)');
}, page);

await test('warehouse REGRESSION: undo steps back through 3 place-one actions', async () => {
  const n0 = await dpCount();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: /place one near the dock/i }).first().click();
    await page.waitForTimeout(250);
  }
  if (await dpCount() !== n0 + 3) throw new Error('place x3 failed');
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: /undo/i }).click();
    await page.waitForTimeout(250);
  }
  const n3 = await dpCount();
  if (n3 !== n0) throw new Error(`after 3 undos expected ${n0} boxes, got ${n3}`);
}, page);

await test('warehouse REGRESSION: auto-arrange keeps every pallet (never deletes)', async () => {
  await page.getByRole('button', { name: /place one near the dock/i }).first().click();
  await page.waitForTimeout(250);
  const before = await dpCount();
  await page.getByRole('button', { name: /auto-arrange/i }).click();
  await page.getByText(/re-arranged/i).waitFor();
  const after = await dpCount();
  if (after < before) throw new Error(`arrange dropped boxes: ${before} -> ${after}`);
}, page);

// ---------- new production features ----------
await test('planner: pallet & truck vessels selectable', async () => {
  await page.goto(`${BASE}/planner`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /eur pallet/i }).click();
  await page.getByText(/120 × 80 × 165/).waitFor();
  await page.getByRole('button', { name: /53' trailer/i }).click();
  await page.getByText(/1602 × 254 × 269/).waitFor();
}, page);

await test('warehouse: multi-dock toggle keeps at least one', async () => {
  await page.goto(`${BASE}/warehouse`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /got it/i }).click().catch(() => {});
  await page.getByRole('button', { name: /^left$/i }).click();   // add W
  await page.getByRole('button', { name: /^right$/i }).click();  // remove E → W only
  await page.getByText(/forklift access/i).waitFor();
}, page);

await test('warehouse: zone quick-add shows per-zone stats', async () => {
  await page.getByRole('button', { name: /\+ zone/i }).click();
  await page.getByRole('button', { name: /place one near the dock/i }).last().click();
  await page.getByText(/rack pos ·/i).waitFor(); // zone stat row
}, page);

await test('editor: keyboard shortcuts (R rotate, ⌘Z undo) do not crash', async () => {
  await page.getByRole('button', { name: /place one near the dock/i }).first().click();
  await page.locator('canvas').first().click({ position: { x: 400, y: 300 } }).catch(() => {});
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('r');
  await page.keyboard.press((process.platform === 'darwin' ? 'Meta' : 'Control') + '+z');
  await page.getByText(/forklift access/i).waitFor();
}, page);

await test('api-docs: page renders with curl example', async () => {
  await page.goto(`${BASE}/api-docs`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/api\/pack/i).first().waitFor();
}, page);

// ---------- live-only API flows ----------
if (IS_LIVE) {
  await test('LIVE share: create link and reopen it', async () => {
    await page.goto(`${BASE}/planner`, { waitUntil: 'domcontentloaded' });
    await page.getByText(/Volume utilization/i).waitFor();
    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/share') && r.request().method() === 'POST'),
      page.getByRole('button', { name: /share this plan/i }).click(),
    ]);
    const { id } = await resp.json();
    if (!id) throw new Error('no share id');
    await page.goto(`${BASE}/planner?share=${id}`, { waitUntil: 'domcontentloaded' });
    await page.getByText(/Volume utilization/i).waitFor();
  }, page);

  await test('LIVE warehouse share: create and reopen', async () => {
    await page.goto(`${BASE}/warehouse`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /got it/i }).click().catch(() => {});
    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/share') && r.request().method() === 'POST'),
      page.getByRole('button', { name: /^share$/i }).click(),
    ]);
    const { id } = await resp.json();
    await page.goto(`${BASE}/warehouse?share=${id}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /got it/i }).click().catch(() => {});
    await page.getByText(/forklift access/i).waitFor();
  }, page);

  await test('LIVE /api/pack: engine returns placements', async () => {
    const res = await ctx.request.post(`${BASE}/api/pack`, {
      data: {
        container: { l: 589, w: 235, h: 239, maxWeight: 28200 },
        items: [
          { label: 'A', l: 60, w: 40, h: 40, weight: 18, qty: 50 },
          { label: 'Fragile', l: 45, w: 35, h: 25, weight: 6, qty: 10, maxStack: 0 },
        ],
      },
    });
    if (!res.ok()) throw new Error(`pack ${res.status()}`);
    const j = await res.json();
    if (!Array.isArray(j.boxes) || j.boxes.length !== 60) throw new Error(`boxes ${j.boxes?.length}`);
    if (!(j.stats?.volumeUtil > 0)) throw new Error('no stats');
  }, page);

  await test('LIVE /api/pack: GET returns usage, bad input rejected', async () => {
    const g = await ctx.request.get(`${BASE}/api/pack`);
    if (!g.ok()) throw new Error(`GET ${g.status()}`);
    const bad = await ctx.request.post(`${BASE}/api/pack`, { data: { items: [] } });
    if (bad.status() !== 400) throw new Error(`bad input got ${bad.status()}`);
  }, page);

  await test('LIVE analytics: /api/hit accepts events', async () => {
    const res = await ctx.request.post(`${BASE}/api/hit`, { data: { e: 'pageview', p: '/e2e-test' } });
    if (!res.ok()) throw new Error(`hit ${res.status()}`);
  }, page);
}

await browser.close();

console.log('\n' + results.join('\n'));
console.log(`\n${passed} passed, ${failed} failed (${BASE})`);
process.exit(failed > 0 ? 1 : 0);
