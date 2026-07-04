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

const browser = await chromium.launch({ channel: 'chrome', headless: true });
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
  const rotate = page.getByRole('button', { name: /rotate 90/i });
  if (await rotate.isDisabled()) throw new Error('rotate disabled after place-one (selection sync broken)');
  const del = page.getByRole('button', { name: /^delete$/i });
  if (await del.isDisabled()) throw new Error('delete disabled after place-one');
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

  await test('LIVE analytics: /api/hit accepts events', async () => {
    const res = await ctx.request.post(`${BASE}/api/hit`, { data: { e: 'pageview', p: '/e2e-test' } });
    if (!res.ok()) throw new Error(`hit ${res.status()}`);
  }, page);
}

await browser.close();

console.log('\n' + results.join('\n'));
console.log(`\n${passed} passed, ${failed} failed (${BASE})`);
process.exit(failed > 0 ? 1 : 0);
