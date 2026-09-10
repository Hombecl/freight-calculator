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
  // Headline changed with the pallet repositioning (POSITIONING.md §3); it was
  // "Stop shipping air", which sold container void — 2.3% of search demand.
  // ⛔ 2026-08-26 (POSITIONING.md v2 §2): repositioned again — pallet is the
  // acquisition wedge, the mixed-load planner is the position. Assert on the
  // capability that is actually differentiated and actually implemented
  // (realism.ts + fitsDoor), not on pallet arithmetic.
  await page.getByRole('heading', { name: /plan a mixed load in 3D/i }).waitFor();
}, page);

await test('home: hero defaults to the mixed-load container scene', async () => {
  // The differentiated thing is mixed-load planning, so the demo must open on
  // the mixed-carton container — not the pallet, which is the wedge. Guards
  // against the default drifting back.
  await page.getByText(/20' GP shipping container/i).waitFor();
}, page);

await test('home: hero tabs switch pallet/container/carton scene', async () => {
  // Each switch remounts the three.js planner (key={heroMode}). Three switches
  // now instead of two, so against production the 15s default is too tight —
  // verified manually that all three transitions work, they are just slow over
  // the network with a cold cache. Per-wait budget, not a blanket timeout bump.
  const SWITCH = { timeout: 30_000 };
  await page.getByRole('button', { name: /cartons → pallet/i }).click();
  await page.getByText(/GMA pallet 48×40/i).waitFor(SWITCH);
  await page.getByRole('button', { name: /products → carton/i }).click();
  await page.getByText(/Master carton · 60×40×40/i).waitFor(SWITCH);
  await page.getByRole('button', { name: /cartons → container/i }).click();
  await page.getByText(/20' GP shipping container/i).waitFor(SWITCH);
}, page);

await test('home: the four pallet questions link the chain', async () => {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /work out your pallets/i }).waitFor();
  for (const href of ['/pallet-calculator', '/pallets-per-container',
                      '/warehouse-space-calculator', '/pallet-storage-cost-calculator']) {
    // prefix match so this keeps working if these cards ever carry ?c_* params
    await page.locator(`a[href^="${href}"]`).first().waitFor();
  }
}, page);

await test('pallet chain: carries the plan into the next step', async () => {
  // step 1 with a real order quantity -> pallets needed is computed
  await page.goto(`${BASE}/pallet-calculator?u=cm&l=40&w=30&h=30&wt=10&p=eur&q=500`, { waitUntil: 'domcontentloaded' });
  const chain = page.locator('nav').filter({ hasText: /work out your pallets/i }).first();
  await chain.waitFor();
  const href = await chain.locator('a[href*="/pallet-storage-cost-calculator"]').first().getAttribute('href');
  if (!href || !/c_plt=\d+/.test(href)) {
    throw new Error(`chain link did not carry a pallet count: ${href}`);
  }
  const carried = Number(href.match(/c_plt=(\d+)/)[1]);
  // follow it; step 4 must open seeded with that count, not its 50 default
  await page.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/storage cost/i).first().waitFor();
  const seeded = await page.locator('input[type="number"]').first().inputValue();
  if (Number(seeded) !== carried) {
    throw new Error(`step 4 not seeded from chain: carried ${carried}, field shows ${seeded}`);
  }
}, page);

await test('save step: offered, and the ANSWER is never gated', async () => {
  await page.goto(`${BASE}/pallet-calculator?u=cm&l=40&w=30&h=30&wt=10&p=eur&q=500`, { waitUntil: 'domcontentloaded' });
  // the result must be visible WITHOUT signing in — the capture step must never
  // become a toll booth in front of the number (POSITIONING.md §2).
  // ⛔ visible=true is required: the printable spec sheet renders the SAME
  // labels inside a `hidden print:block` div, and a bare .first() resolves to
  // that invisible copy and times out.
  await page.getByText(/cartons per pallet/i).locator('visible=true').first().waitFor();
  const save = page.locator('section').filter({ hasText: /keep this pallet plan/i }).first();
  await save.waitFor();
  // signed out: either a working sign-in affordance, or an honest "not
  // available here" — never a dead button that cannot do anything
  const signIn = await save.getByRole('button', { name: /sign in to save/i }).count();
  const unavailable = await save.getByText(/not available in this environment/i).count();
  if (signIn + unavailable === 0) {
    throw new Error('save step rendered without a sign-in path or an unavailable notice');
  }
  // and it must not promise to email anything — there is no outbound mail
  if (/we.{0,3}ll email|email you the|send you the plan/i.test(await save.innerText())) {
    throw new Error('save step promises an email the site cannot send');
  }
}, page);

await test('save step: hidden when there is no carton geometry to save', async () => {
  // step 4 reached cold (no chain handoff) has nothing real to save
  await page.goto(`${BASE}/pallet-storage-cost-calculator`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/storage cost/i).first().waitFor();
  const n = await page.locator('section').filter({ hasText: /keep this pallet plan/i }).count();
  if (n !== 0) throw new Error('save step rendered with no carton geometry');
}, page);

await test('save step: appears at the END of the chain once a plan is carried', async () => {
  await page.goto(`${BASE}/pallet-storage-cost-calculator?c_pt=eur&c_cpp=40&c_cl=40&c_cw=30&c_ch=30&c_cwt=10&c_plt=13`,
    { waitUntil: 'domcontentloaded' });
  await page.locator('section').filter({ hasText: /keep this pallet plan/i }).first().waitFor();
}, page);

await test('chain: handoff survives the page rewriting its own URL state', async () => {
  // Each page mirrors its inputs into the URL with setParams({...}), which
  // replaces the whole query string. That silently erased c_* on mount: seeding
  // still worked (useState runs first) so it LOOKED fine, but the chain died
  // after one hop and the save step vanished. Pin it.
  await page.goto(`${BASE}/pallet-storage-cost-calculator?c_pt=eur&c_cpp=40&c_cl=40&c_cw=30&c_ch=30&c_cwt=10&c_plt=13`,
    { waitUntil: 'domcontentloaded' });
  await page.locator('section').filter({ hasText: /keep this pallet plan/i }).first().waitFor();
  await page.waitForFunction(() => /c_cl=40/.test(window.location.search), undefined, { timeout: 5000 });
  const url = page.url();
  for (const k of ['c_pt=eur', 'c_cpp=40', 'c_cl=40', 'c_cw=30', 'c_ch=30']) {
    if (!url.includes(k)) throw new Error(`page stripped ${k} from the URL: ${url}`);
  }
  // and the forward chain link still carries it
  const chain = page.locator('nav').filter({ hasText: /work out your pallets/i }).first();
  const href = await chain.locator('a[href*="/pallet-calculator"]').first().getAttribute('href');
  if (!href || !href.includes('c_cl=40')) {
    throw new Error(`chain link lost the carry after URL rewrite: ${href}`);
  }
}, page);

await test('pallet chain: marks current step and does not self-link', async () => {
  await page.goto(`${BASE}/pallet-calculator`, { waitUntil: 'domcontentloaded' });
  const chain = page.locator('nav').filter({ hasText: /work out your pallets/i }).first();
  await chain.waitFor();
  // step 1 is the current page: rendered as text, never as a link back to itself
  await chain.locator('[aria-current="page"]').waitFor();
  // ⛔ prefix match, not exact: chain links now carry ?c_* handoff params, so an
  // exact `a[href="/pallet-calculator"]` selector would silently stop catching a
  // self-link (it would be /pallet-calculator?c_pt=…) and this guard would pass
  // while guarding nothing.
  if (await chain.locator('a[href^="/pallet-calculator"]').count() > 0) {
    throw new Error('pallet chain self-links on its own page');
  }
  // and it still offers the next steps
  await chain.locator('a[href^="/pallets-per-container"]').waitFor();
}, page);

await test('home: chain nav links all five tools', async () => {
  for (const href of ['/planner', '/packing', '/container', '/fba', '/warehouse']) {
    const n = await page.locator(`a[href="${href}"], a[href="/zh${href}"]`).count();
    if (n === 0) throw new Error(`no link to ${href}`);
  }
}, page);

// ---------- compare pages (highest-CTR surface) ----------
await test('compare: conversion path lands on the import step', async () => {
  await page.goto(`${BASE}/compare/easycargo-alternative`, { waitUntil: 'domcontentloaded' });
  const cta = page.locator('a[href="/planner?import=1"]').first();
  await cta.waitFor();
  // the page promises "import your existing Excel"; the CTA must honour it
  const label = (await cta.innerText()).toLowerCase();
  if (!/carton list|箱單/.test(label)) {
    throw new Error(`compare CTA no longer offers the import path: "${label}"`);
  }
}, page);

await test('compare: ?import=1 actually opens the import modal', async () => {
  await page.goto(`${BASE}/planner?import=1`, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder(/copy your rows/i).waitFor();
}, page);

await test('compare: the three switching questions link to real evidence', async () => {
  await page.goto(`${BASE}/compare/cargo-planner-alternative`, { waitUntil: 'domcontentloaded' });
  for (const href of ['/api-docs', '/plans', '/reality-checks']) {
    await page.locator(`a[href^="${href}"]`).first().waitFor();
  }
  // the benchmark claim must stay attached to its number
  await page.getByText(/80\.2%/).first().waitFor();
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

await test('compare: newly added competitor pages render from competitors.json', async () => {
  for (const slug of ['cubemaster-alternative', 'searates-load-calculator-alternative', 'tops-pro-alternative', 'stackbuilder-alternative', 'packapp-alternative']) {
    await page.goto(`${BASE}/compare/${slug}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { level: 1 }).filter({ hasText: /alternative/i }).waitFor();
    await page.getByText(/Pricing:/).first().waitFor();
  }
}, page);

await test('cubing-software: category page lists every competitor + FAQ schema', async () => {
  await page.goto(`${BASE}/cubing-software`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { level: 1 }).filter({ hasText: /cubing software/i }).waitFor();
  const rows = await page.locator('table tbody tr').count();
  if (rows < 12) throw new Error(`expected DimPack3D + 11 competitors, got ${rows} rows`);
  const lds = await page.locator('script[type="application/ld+json"]').allTextContents();
  if (!lds.some((t) => /FAQPage/.test(t))) throw new Error(`FAQPage schema missing (${lds.length} ld+json blocks)`);
  await page.getByText(/Cube a shipment now/i).waitFor();
}, page);

await test('api-pricing: plans read from apiTiers + key form present', async () => {
  await page.goto(`${BASE}/api-pricing`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { level: 1 }).filter({ hasText: /API pricing/i }).waitFor();
  // anonymous pack = 60/min; free key = 300/min (5x) — the page must show both
  await page.getByText(/60\/min/).first().waitFor();
  await page.getByText(/300\/min/).first().waitFor();
  await page.getByText(/\$49/).first().waitFor();
  await page.locator('input[type="email"]').waitFor();
  await page.getByRole('button', { name: /create my key/i }).waitFor();
}, page);

if (IS_LIVE) {
  await test('api-pricing (live): free key is issued and accepted by /api/pack', async () => {
    const r = await page.request.post(`${BASE}/api/key`, { data: { email: `e2e+${Date.now()}@dimpack3d.com`, company: 'e2e', useCase: 'e2e' } });
    if (r.status() !== 200) throw new Error(`/api/key ${r.status()}`);
    const { key } = await r.json();
    if (!/^dp_live_[0-9a-f]{32}$/.test(key)) throw new Error(`bad key ${key}`);
    const p = await page.request.post(`${BASE}/api/pack`, {
      headers: { 'X-API-Key': key },
      data: { container: { l: 589, w: 235, h: 239 }, items: [{ l: 60, w: 40, h: 40, qty: 3 }] },
    });
    if (p.status() !== 200) throw new Error(`/api/pack with key ${p.status()}`);
  }, page);
}

await test('order-quote: example quotes to pallet lines with receiver checks', async () => {
  await page.goto(`${BASE}/order-quote`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { level: 1 }).filter({ hasText: /pallet quote/i }).waitFor();
  await page.getByRole('button', { name: /quote this order/i }).click();
  const result = page.getByTestId('quote-result');
  await result.waitFor();
  await result.getByText(/Placed, but a limit failed/i).first().waitFor();
  const rows = await result.locator('table tbody tr').count();
  if (rows < 1) throw new Error('no pallet rows');
  await result.getByText(/LOADED_HEIGHT/).first().waitFor();
  await result.getByText(/inputHash/).first().waitFor();
  // paste import replaces the carton table
  await page.locator('textarea').fill('sku,l,w,h,weight,qty\nA,40,30,20,5,10\nB,50,40,30,8,4');
  await page.getByRole('button', { name: /use pasted rows/i }).click();
  await page.getByText(/2 types/).waitFor();
}, page);

if (IS_LIVE) {
  await test('order-quote (live): browser and /api/order-quote agree on inputHash', async () => {
    await page.goto(`${BASE}/order-quote`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /quote this order/i }).click();
    await page.getByTestId('quote-result').waitFor();
    await page.getByRole('button', { name: /verify against/i }).click();
    await page.getByText(/Server result matches/i).waitFor({ timeout: 20000 });
  }, page);
}

await test('order-options: example renders a result or no-option message and accurate build counts', async () => {
  await page.goto(`${BASE}/order-quote`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^example$/i }).click();
  await page.getByLabel(/max pallets/i).fill('20');
  await page.getByLabel(/packing height cap/i).fill('100');
  await page.getByRole('button', { name: /quote this order/i }).click();
  const panel = page.getByTestId('order-options');
  await panel.waitFor();
  await panel.getByRole('button', { name: /search options/i }).click();
  await panel.locator('[data-testid="option-card"], [data-testid="option-none"]').first().waitFor();
  const cards = panel.getByTestId('option-card');
  if (await cards.count()) {
    const card = cards.first();
    await card.getByRole('button', { name: /view build/i }).click();
    const pallets = card.getByTestId('option-pallet');
    let total = 0;
    for (let i = 0; i < await pallets.count(); i++) {
      const pallet = pallets.nth(i);
      const expected = Number(await pallet.getAttribute('data-carton-count'));
      const rendered = Number(await pallet.getByTestId('option-placed-count').textContent());
      if (rendered !== expected) throw new Error(`expected ${expected} cartons, rendered ${rendered}`);
      total += rendered;
    }
    if (total !== Number(await card.getByTestId('option-carton-count').textContent())) throw new Error('card carton count differs from build');
  } else await panel.getByTestId('option-none').waitFor();
}, page);

await test('order-options: repack build, animation, confirm apply and downloads reproduce selected option', async () => {
  await page.goto(`${BASE}/order-quote`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^example$/i }).click();
  await page.locator('textarea').fill('sku,length,width,height,weight,qty\nS0,70,40,50,2,6\nS1,70,60,20,7,5\nS2,70,40,30,3,5');
  await page.getByRole('button', { name: /use pasted rows/i }).click();
  for (const [label, value] of [[/pallet length/i, '100'], [/pallet width/i, '100'], [/base height/i, '10'], [/packing height cap/i, '100'], [/payload cap/i, '1000'], [/tare weight/i, '10'], [/wrap\/cap height/i, '0'], [/wrap\/cap weight/i, '0'], [/max pallets/i, '20']]) await page.getByLabel(label).fill(value);
  await page.getByRole('button', { name: /quote this order/i }).click();
  await page.getByTestId('order-options').getByRole('button', { name: /search options/i }).click();
  const card = page.getByTestId('option-card').first();
  await card.waitFor();
  await card.getByText(/4 pallet/).waitFor();
  await card.getByRole('button', { name: /view build/i }).click();
  const pallets = card.getByTestId('option-pallet');
  for (let i = 0; i < await pallets.count(); i++) {
    const p = pallets.nth(i), expected = Number(await p.getAttribute('data-carton-count'));
    if (Number(await p.getByTestId('option-placed-count').textContent()) !== expected) throw new Error('build count mismatch');
    const ids = await p.locator('svg [data-box-id]').evaluateAll(nodes => [...new Set(nodes.map(n => n.getAttribute('data-box-id')).filter(id => id !== 'base'))]);
    if (ids.length !== expected) throw new Error('SVG cargo count mismatch');
  }
  const first = pallets.first(), slider = first.locator('input[type="range"]');
  await slider.fill('1');
  if (Number(await first.getByTestId('option-placed-count').textContent()) !== 1) throw new Error('animation step count mismatch');
  await slider.fill(await slider.getAttribute('max'));
  page.once('dialog', dialog => dialog.dismiss());
  await card.getByRole('button', { name: /use this option/i }).click();
  await page.getByTestId('quote-result').getByText(/5 pallet\(s\)/).first().waitFor();
  page.once('dialog', dialog => dialog.accept());
  await card.getByRole('button', { name: /use this option/i }).click();
  await page.getByTestId('quote-result').getByText(/4 pallet\(s\)/).first().waitFor();
  const contents = async (button) => {
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: button }).click()]);
    const stream = await download.createReadStream(); const chunks = []; for await (const c of stream) chunks.push(c);
    return Buffer.concat(chunks).toString('utf8');
  };
  const request = JSON.parse(await contents(/API request JSON/i));
  const quote = JSON.parse(await contents(/Full result JSON/i));
  if (!request.packing || quote.summary.palletCount !== 4 || !quote.variance.summary.selectedOptionId) throw new Error('selection not preserved in downloads');
  const csv = await contents(/Carrier-input CSV/i);
  if (csv.trim().split('\r\n').length !== 5) throw new Error('CSV does not reflect four pallets');
}, page);

await test('order-options: applying a permitted reduction updates order quantities and result', async () => {
  await page.goto(`${BASE}/order-quote`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^example$/i }).click();
  await page.locator('textarea').fill('sku,length,width,height,weight,qty\nA,50,50,50,2,6\nLOCK,50,50,50,2,1');
  await page.getByRole('button', { name: /use pasted rows/i }).click();
  for (const [label, value] of [[/pallet length/i, '100'], [/pallet width/i, '100'], [/base height/i, '10'], [/packing height cap/i, '60'], [/payload cap/i, '1000'], [/tare weight/i, '10'], [/wrap\/cap height/i, '0'], [/wrap\/cap weight/i, '0'], [/max pallets/i, '20']]) await page.getByLabel(label).fill(value);
  await page.getByRole('button', { name: /quote this order/i }).click();
  const panel = page.getByTestId('order-options');
  await panel.getByLabel(/\bA — Adjustable/).check();
  await panel.getByLabel(/Min quantity/).fill('2');
  await panel.getByLabel(/Max quantity/).fill('8');
  await panel.getByLabel(/Quantity step/).fill('2');
  await panel.getByRole('button', { name: /search options/i }).click();
  const card = panel.getByTestId('option-card').first();
  await card.getByText(/1 pallet/).waitFor();
  page.once('dialog', dialog => dialog.accept());
  await card.getByRole('button', { name: /use this option/i }).click();
  await page.getByTestId('quote-result').getByText(/1 pallet\(s\)/).first().waitFor();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /API request JSON/i }).click()]);
  const stream = await download.createReadStream(), chunks = []; for await (const chunk of stream) chunks.push(chunk);
  const request = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (request.items.find(it => it.sku === 'A').qty !== 2 || request.items.find(it => it.sku === 'LOCK').qty !== 1) throw new Error('adjusted or locked quantity incorrect');
}, page);

await test('order-quote: layered tea and teaware fit one pallet', async () => {
  await page.goto(`${BASE}/order-quote`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^example$/i }).click();
  await page.getByRole('button', { name: 'remove', exact: true }).nth(1).click();
  await page.getByRole('button', { name: /quote this order/i }).click();
  await page.getByTestId('quote-result').getByText(/1 pallet\(s\)/).first().waitFor();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Full result JSON/i }).click()]);
  const stream = await download.createReadStream(), chunks = []; for await (const chunk of stream) chunks.push(chunk);
  const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (result.summary.cartonsPlaced !== 30 || result.summary.cartonsUnplaced !== 0) throw new Error('cargo conservation');
}, page);

await test('case designer: defaults, candidate detail and rendered count agree', async () => {
  await page.goto(`${BASE}/case-designer`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Case designer', exact: true }).waitFor();
  await page.getByTestId('design-run').click();
  const row = page.getByTestId('design-candidate-row').first();
  await row.waitFor();
  const count = Number(await row.getByTestId('design-cases-per-pallet').textContent());
  if (!(count > 0)) throw new Error('expected feasible cases/pallet');
  await row.click();
  await page.getByTestId('design-detail').waitFor();
  if (Number(await page.getByTestId('design-placed-count').textContent()) !== count) throw new Error('3D count differs from candidate');
}, page);

await test('consolidation: example POs plan containers and read-only 3D count matches', async () => {
  await page.goto(`${BASE}/consolidation`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('consolidation-run').click();
  const card = page.getByTestId('container-card').first();
  await card.waitFor();
  const expected = Number(await card.getByTestId('card-placed-count').textContent());
  if (!(expected > 0)) throw new Error('no cartons placed');
  await card.getByTestId('open-container').click();
  const count = page.getByTestId('container-placed-count');
  await count.waitFor();
  if (Number(await count.textContent()) !== expected) throw new Error('3D count differs from plan');
  if (await page.getByTestId('container-view').getByRole('button', { name: /delete|rotate 90/i }).count()) throw new Error('editable container view');
}, page);

await test('box-catalog: example catalog and single-order placed count', async () => {
  await page.goto(`${BASE}/box-catalog`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('box-optimize').click();
  await page.getByTestId('box-catalog-table').waitFor();
  if (await page.getByTestId('box-catalog-table').locator('tbody tr').count() !== 2) throw new Error('Expected two box sizes');
  await page.getByTestId('box-choose').click();
  await page.getByTestId('box-placed-count').waitFor();
  if ((await page.getByTestId('box-placed-count').innerText()).trim() !== '2') throw new Error('Expected exactly two packed units');
}, page);

await test('box-catalog: coverage warning and Advanced analysis toggle', async () => {
  await page.goto(`${BASE}/box-catalog`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Advanced', { exact: true }).click();
  const toggle = page.getByTestId('box-coverage-first');
  if (!await toggle.isChecked()) throw new Error('Coverage must default on');
  await toggle.uncheck();
  await page.getByLabel('Candidate boxes (JSON, optional)', { exact: true }).fill('[{"id":"tiny","l":1,"w":1,"h":1}]');
  await page.getByTestId('box-optimize').click();
  await page.getByTestId('box-unfit-share').waitFor();
  if (!await page.getByTestId('box-unfit-share').textContent().then(t => t.includes('100.0% of orders would need a box outside this catalog'))) throw new Error('Missing unfit share');
  if (!await page.getByText('Partial comparison', { exact: false }).count()) throw new Error('Missing partial savings basis');
  await page.getByLabel('Current boxes (JSON, optional)', { exact: true }).fill('');
  await toggle.check();
  await page.getByTestId('box-optimize').click();
  await page.getByTestId('box-unfit-share').waitFor();
  if (await page.getByText('Savings per 1,000 comparable orders', { exact: false }).count()) throw new Error('Savings shown without baseline');
}, page);

await test('verify-batch: box single-order DOM count matches Node library', async () => {
  const { register } = await import('tsx/esm/api');
  const unregister = register();
  try {
    const { chooseBox, BOX_EXAMPLE } = await import('../src/lib/boxCatalog.ts');
    const result = await chooseBox({ ...BOX_EXAMPLE, lines: [{ sku: 'A', qty: 2 }] }, BOX_EXAMPLE.candidateBoxes);
    await page.goto(`${BASE}/box-catalog`, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('box-optimize').click();
    await page.getByTestId('box-choose').click();
    await page.getByTestId('box-placed-count').waitFor();
    if (Number(await page.getByTestId('box-placed-count').textContent()) !== result.plan.boxes.length) throw new Error('Rendered count differs from Node plan');
  } finally { unregister(); }
}, page);

await test('i18n: /zh homepage renders Chinese', async () => {
  await page.goto(`${BASE}/zh`, { waitUntil: 'domcontentloaded' });
  // ZH side of the repositioned headline.
  await page.getByText(/3D 規劃混裝貨/).waitFor();
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

await test('tools: warehouse capacity mode computes pallet positions from area', async () => {
  // 1000 m², reach aisles, 4 levels: floor(650/3.06)=212 footprints × 4 = 848
  await page.goto(`${BASE}/warehouse-space-calculator?m=cap&ar=1000&au=m2&s=selective&a=reach&l=4`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/estimated pallet capacity/i).waitFor();
  await page.getByText(/848/).first().waitFor(); // headline + mobile sticky bar both show it
}, page);

await test('tools: pallet calculator worked-example table matches the engine', async () => {
  await page.goto(`${BASE}/pallet-calculator`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/worked examples/i).waitFor();
  // 60×40×40 on EUR: 4/layer × 4 layers = 16 (same figure as the unit test)
  await page.getByRole('link', { name: /60 × 40 × 40/ }).first().waitFor();
  await page.getByText(/\(4\/layer × 4\)/).first().waitFor();
}, page);

await test('tools: freight class calculator maps density to NMFC class', async () => {
  // 48×40×48 in, 500 lb: 53.33 ft³ → 9.37 lb/ft³ → class 100 (8–<10 band)
  await page.goto(`${BASE}/freight-class-calculator?u=us&l=48&w=40&h=48&wt=500&q=1`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/estimated freight class/i).waitFor();
  await page.getByText(/9\.3[78] lb\/ft³/).first().waitFor(); // 500/53.33 = 9.375, float-rounding either way
  await page.getByText(/Class 100/).first().waitFor();
}, page);

await test('tools: ti-hi calculator computes TI × HI', async () => {
  // 40×30×30 cm on EUR: TI 8, HI floor(165/30)=5 → 40
  await page.goto(`${BASE}/ti-hi-calculator?u=cm&l=40&w=30&h=30&p=eur`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/^TI × HI$/).waitFor();
  await page.getByText(/8 × 5/).first().waitFor();
}, page);

await test('tools: ti-hi exact imperial GMA case gives TI 9 (audit regression)', async () => {
  await page.goto(`${BASE}/ti-hi-calculator?u=in&l=16&w=12&h=12&p=gma&mh=60`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/9 × 5/).first().waitFor();
}, page);

await test('tools: pallets-per-container blocks pallets taller than the door', async () => {
  await page.goto(`${BASE}/pallets-per-container?p=eur&h=230&wt=500`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/won't pass the 228 cm door/).first().waitFor();
}, page);

await test('tools: pallets-per-container reproduces published EUR counts', async () => {
  // EUR mixed-lane: 20'GP = 11 floor, 40' = 25 floor (loadedH 150 → 1 tier)
  await page.goto(`${BASE}/pallets-per-container?p=eur&h=150&wt=500`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/container internal dimensions/i).waitFor();
  const row20 = page.locator('tr', { hasText: "20' GP" }).first();
  await row20.getByText('11', { exact: true }).first().waitFor();
}, page);

await test('tools: pallet builder landing links the planner pallet demo', async () => {
  await page.goto(`${BASE}/pallet-builder`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /open the 3d pallet builder/i }).waitFor();
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

// ---------- embed widget ----------
await test('embed: chrome-less calculator renders (no site nav) and posts height', async () => {
  const msgs = [];
  const embedPage = await ctx.newPage();
  await embedPage.exposeFunction('__dpMsg', (d) => msgs.push(d));
  await embedPage.addInitScript(() => {
    window.addEventListener('message', (e) => window.__dpMsg?.(e.data));
  });
  await embedPage.goto(`${BASE}/embed?wid=e2e`, { waitUntil: 'domcontentloaded' });
  await embedPage.getByText(/Powered by DimPack3D/i).waitFor();
  // site chrome must be absent
  if (await embedPage.locator('footer').count() > 0) throw new Error('site footer leaked into embed');
  // packing result renders (units-per-carton stat present)
  await embedPage.getByText(/utilization|使用率/i).first().waitFor();
  await embedPage.close();
}, page);

await test('embed: /zh/embed serves the Chinese UI', async () => {
  const embedPage = await ctx.newPage();
  await embedPage.goto(`${BASE}/zh/embed`, { waitUntil: 'domcontentloaded' });
  await embedPage.getByText('Powered by DimPack3D').waitFor();
  await embedPage.getByText(/裝箱/).first().waitFor();
  await embedPage.close();
}, page);

await test('embed: widget.js loader is served and builds an iframe', async () => {
  const res = await ctx.request.get(`${BASE}/widget.js`);
  if (!res.ok()) throw new Error(`widget.js ${res.status()}`);
  const body = await res.text();
  if (!body.includes('/embed?wid=')) throw new Error('loader missing embed URL');
  if (!body.includes('dp3d:height')) throw new Error('loader missing resize protocol');
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
