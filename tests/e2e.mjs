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
import { mkdir } from 'node:fs/promises';
import { fixAuditBTests } from './fix-audit-b-e2e.mjs';

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
// Observe actual GPU submissions in CI without adding diagnostic UI to the app.
if (!IS_LIVE) await ctx.addInitScript(() => {
  Object.defineProperty(window, 'THREE', { configurable: true, set(three) {
    const observedRenderer = Renderer => class extends Renderer {
      constructor(...args) {
        super(...args);
        const render = this.render.bind(this);
        this.render = (...renderArgs) => {
          render(...renderArgs);
          this.domElement.dataset.drawCalls = String(this.info.render.calls);
          this.domElement.dataset.renderCount = String(Number(this.domElement.dataset.renderCount ?? 0) + 1);
        };
      }
    };
    // The CDN UMD script assigns an empty exports object before filling it.
    if (three.WebGLRenderer) three.WebGLRenderer = observedRenderer(three.WebGLRenderer);
    else Object.defineProperty(three, 'WebGLRenderer', { configurable: true, set(Renderer) {
      Object.defineProperty(three, 'WebGLRenderer', { configurable: true, writable: true, value: observedRenderer(Renderer) });
    } });
    Object.defineProperty(window, 'THREE', { configurable: true, writable: true, value: three });
  } });
});
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

await test('home: visible 3D starts automatically and rotation can be paused', async () => {
  await page.locator('canvas').waitFor({ timeout: 30_000 });
  await page.getByText(/Boxes: 280/).waitFor();
  await page.getByRole('button', { name: 'Pause rotation', exact: true }).click();
  await page.getByRole('button', { name: 'Resume rotation', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Resume rotation', exact: true }).click();
  const videos = await page.locator('video').evaluateAll(videos => videos.map(v => ({
    paused: v.paused, preload: v.preload, controls: v.controls, time: v.currentTime,
  })));
  if (videos.some(v => !v.paused || v.time !== 0 || v.preload !== 'none' || !v.controls)) {
    throw new Error('offscreen homepage video started before it was visible');
  }
}, page);

await test('home: batched cartons stay editable and paused scenes stop redrawing', async () => {
  const canvas = page.locator('canvas').first();
  if (!IS_LIVE) {
    await page.waitForFunction(() => Number(document.querySelector('canvas')?.dataset.drawCalls) > 0);
    const calls = Number(await canvas.getAttribute('data-draw-calls'));
    if (!calls || calls > 20) throw new Error(`280-carton preview submitted ${calls} draw calls`);
  }
  await page.getByRole('button', { name: 'Pause rotation', exact: true }).click();
  await page.waitForTimeout(200);
  const before = await canvas.getAttribute('data-render-count');
  await page.waitForTimeout(350);
  if (!IS_LIVE && await canvas.getAttribute('data-render-count') !== before) throw new Error('paused unchanged scene keeps redrawing');
  const bounds = await canvas.boundingBox();
  const remove = page.getByRole('button', { name: 'Delete', exact: true });
  for (const [x, y] of [[0.5, 0.5], [0.45, 0.6], [0.6, 0.55], [0.4, 0.45]]) {
    await canvas.click({ position: { x: bounds.width * x, y: bounds.height * y } });
    if (await remove.isEnabled()) break;
  }
  if (!await remove.isEnabled()) throw new Error('batched cartons cannot be selected');
  await remove.click();
  await page.getByText(/Boxes: 279/).waitFor();
  await page.getByRole('button', { name: /Undo/ }).click();
  await page.getByText(/Boxes: 280/).waitFor();
  await page.getByRole('button', { name: 'Resume rotation', exact: true }).click();
}, page);

await test('home: reduced motion preserves the preview and manual 3D', async () => {
  const reduced = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const quietPage = await reduced.newPage();
  try {
    await quietPage.goto(`${BASE}/`);
    await quietPage.getByRole('button', { name: /explore in 3d/i }).waitFor();
    await quietPage.waitForTimeout(4000);
    if (await quietPage.locator('script[data-three-cdn], canvas').count()) {
      throw new Error('reduced-motion visitor received automatic WebGL');
    }
    await quietPage.getByRole('button', { name: /explore in 3d/i }).click();
    await quietPage.locator('canvas').waitFor({ timeout: 30_000 });
    const video = quietPage.locator('video').first();
    await video.scrollIntoViewIfNeeded();
    if (!(await video.evaluate(v => v.paused))) throw new Error('reduced-motion video autoplayed');
    await video.evaluate(v => v.play());
    await quietPage.waitForFunction(() => document.querySelector('video').currentTime > 0);
    await video.evaluate(v => v.pause());
    await quietPage.waitForTimeout(100);
    await video.evaluate(v => v.play());
    await quietPage.waitForTimeout(300);
    if (await video.evaluate(v => v.paused)) throw new Error('manual video resume was overridden');
  } finally { await reduced.close(); }
}, page);

await test('home: English and Chinese 3D fit a mobile viewport', async () => {
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileContext.newPage();
  try {
    for (const path of ['/', '/zh']) {
      await mobilePage.goto(`${BASE}${path}`);
      await mobilePage.locator('button:has(img[src="/hero/container.svg"])').click();
      await mobilePage.locator('canvas').waitFor({ timeout: 30_000 });
      const fits = await mobilePage.evaluate(() => {
        const canvas = document.querySelector('canvas');
        const card = canvas?.closest('.rounded-2xl');
        const pause = Array.from(document.querySelectorAll('button')).find(b => /Pause rotation|暫停旋轉/.test(b.textContent));
        return document.body.scrollWidth <= window.innerWidth && !!card && !!pause &&
          pause.getBoundingClientRect().bottom <= card.getBoundingClientRect().bottom;
      });
      if (!fits) throw new Error(`${path}: mobile controls overflow the 3D card`);
    }
  } finally { await mobileContext.close(); }
}, page);

await test('home: supporting tools remain discoverable through anchored directory', async () => {
  await page.goto(`${BASE}/#more-tools`);
  await page.locator('#more-tools[open]').waitFor();
  for(const href of ['/pallets-per-container','/warehouse-space-calculator','/pallet-storage-cost-calculator','/warehouse','/fba'])await page.locator(`#more-tools a[href="${href}"]`).waitFor();
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

await test('home: primary planning tools stay visible and secondary tools remain accessible', async () => {
  await page.goto(`${BASE}/`, {waitUntil:'domcontentloaded'});
  for (const href of ['/planner', '/packing', '/container']) await page.locator(`main a[href="${href}"]`).first().waitFor();
  await page.locator('#more-tools summary').click();
  for (const href of ['/fba', '/warehouse']) await page.locator(`#more-tools a[href="${href}"]`).first().waitFor();
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
  await page.getByLabel('Paste carton list', { exact: true }).waitFor();
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
  await page.getByTestId('planner-packed').waitFor();
  await page.locator('canvas').first().waitFor();
}, page);

await test('planner: unchanged calculations and current vessel cannot reset the editor',async()=>{
  const optimize=page.getByRole('button',{name:'Optimise pack',exact:true});
  if(!await optimize.isDisabled())throw Error('Unchanged deterministic calculation is enabled');
  const canvas=page.locator('canvas').first();
  await canvas.evaluate(node=>node.dataset.regressionMarker='retained');
  await page.getByRole('button',{name:"20' GP",exact:true}).click();
  if(await canvas.getAttribute('data-regression-marker')!=='retained')throw Error('Current vessel remounted editor and lost undo history');
},page);

await test('planner: import modal paste flow', async () => {
  await page.getByRole('button', { name: /import excel\/csv/i }).click();
  await page.getByLabel('Paste carton list', { exact: true }).fill('name\tlength\twidth\theight\tweight\tqty\nTest Box\t50\t40\t30\t10\t25\n');
  await page.getByRole('button', { name: 'Review pasted rows', exact: true }).click();
  await page.getByRole('checkbox', { name: 'I checked units, accepted quantities and excluded rows.', exact: true }).check();
  await page.getByRole('button', { name: 'Use this list and calculate', exact: true }).click();
  await page.locator('input[value="Test Box"]').waitFor();
  if (await page.getByTestId('planner-packed').textContent() !== '25 / 25') throw new Error('import did not calculate the imported specs');
}, page);

await test('planner: draft edits block stale exports and keep totals consistent', async () => {
  const qty = page.locator('input[type="number"]').nth(4);
  await qty.fill('3');
  await page.getByTestId('planner-pending-changes').waitFor();
  if (await page.getByTestId('planner-packed').textContent() !== '25 / 25') throw new Error('draft quantity leaked into calculated stats');
  await page.getByText('Share a snapshot / manage links', { exact: true }).click();
  for (const name of [/^csv$/i, /^pdf plan$/i, /create share link/i]) {
    if (!await page.getByRole('button', { name }).isDisabled()) throw new Error('stale action is enabled');
  }
  await qty.fill('25');
  await page.getByTestId('planner-pending-changes').waitFor({ state: 'hidden' });
  if (await page.getByRole('button', { name: /^csv$/i }).isDisabled()) throw new Error('reverting inputs should restore actions without repacking');
  await qty.fill('3');
  await page.getByRole('button', { name: /optimise pack/i }).click();
  await page.getByTestId('planner-pending-changes').waitFor({ state: 'hidden' });
  if (await page.getByTestId('planner-packed').textContent() !== '3 / 3') throw new Error('optimise did not apply latest quantity');
  if (await page.getByRole('button', { name: /^csv$/i }).isDisabled()) throw new Error('updated export still disabled');
}, page);

await test('planner: rotate/drop/delete/undo buttons exist', async () => {
  for (const name of [/rotate 90/i, /drop to floor/i, /^delete$/i, /undo/i, /reset to auto/i]) {
    await page.getByRole('button', { name }).first().waitFor();
  }
}, page);

await test('planner: export gate opens for anonymous CSV', async () => {
  await page.getByRole('button', { name: /^csv$/i }).click();
  await page.getByText(/unlock export/i).waitFor();
  const purpose = page.getByRole('combobox', { name: /what will you use this plan for/i });
  if (await purpose.inputValue() !== '') throw new Error('purpose must be optional and unselected');
  await purpose.selectOption('freight-quote');
  if (await purpose.inputValue() !== 'freight-quote') throw new Error('purpose selection not retained');
  await page.keyboard.press('Escape');
  await page.getByRole('dialog', { name: /unlock export/i }).waitFor({ state: 'hidden' });
}, page);

await test('planner: PDF snapshot retains the rendered 3D plan', async () => {
  let leadBody;
  await page.route('**/api/lead', async route => {
    leadBody = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await page.getByRole('button', { name: /^pdf plan$/i }).click();
  await page.getByPlaceholder('you@company.com', { exact: true }).fill('render-test@example.test');
  await page.getByRole('combobox', { name: /what will you use this plan for/i }).selectOption('pallet-planning');
  const opened = page.waitForEvent('popup');
  await page.getByRole('button', { name: /unlock & download/i }).click();
  const pdf = await opened;
  try {
    await pdf.locator('img[alt="3D load plan"]').waitFor();
    const colors = await pdf.locator('img[alt="3D load plan"]').evaluate(async img => {
      await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, 64, 64);
      const pixels = ctx.getImageData(0, 0, 64, 64).data;
      const unique = new Set();
      for (let i = 0; i < pixels.length; i += 4) unique.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]},${pixels[i+3]}`);
      return unique.size;
    });
    if (colors < 5) throw new Error('PDF snapshot is blank or a single background color');
    if (leadBody?.purpose !== 'pallet-planning' || leadBody?.source !== 'planner-export') throw new Error('export purpose/source not captured');
    if (leadBody?.proWaitlist !== false) throw new Error('export incorrectly opted into marketing');
  } finally { await pdf.close(); await page.unroute('**/api/lead'); }
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
  await page.getByRole('group', { name: 'Candidate boxes (cm-kg)', exact: true }).getByText('Advanced JSON', { exact: true }).click();
  await page.getByLabel('Candidate boxes JSON', { exact: true }).fill('[{"id":"tiny","l":1,"w":1,"h":1}]');
  await page.getByTestId('box-optimize').click();
  await page.getByTestId('box-unfit-share').waitFor();
  if (!await page.getByTestId('box-unfit-share').textContent().then(t => t.includes('100.0% of orders would need a box outside this catalog'))) throw new Error('Missing unfit share');
  if (!await page.getByText('Partial comparison', { exact: false }).count()) throw new Error('Missing partial savings basis');
  await page.getByRole('group', { name: 'Current boxes (cm-kg)', exact: true }).getByText('Advanced JSON', { exact: true }).click();
  await page.getByLabel('Current boxes JSON', { exact: true }).fill('');
  await toggle.check();
  await page.getByTestId('box-optimize').click();
  await page.getByTestId('box-unfit-share').waitFor();
  if (await page.getByText('Savings per 1,000 comparable orders', { exact: false }).count()) throw new Error('Savings shown without baseline');
}, page);

await test('receiver profiles: templates show source badges', async () => {
  await page.goto(`${BASE}/receiver-profiles`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('profile-source').first().waitFor();
  if (await page.getByTestId('profile-source').count() < 4) throw new Error('Missing templates');
  await page.getByText('Amazon FBA (US) pallet', {exact:true}).waitFor();
}, page);

await test('build sheet: stored quote steps and actuals round trip', async () => {
  const { execFileSync } = await import('node:child_process');
  const request = {orderId:'e2e-sheet',pallet:{l:120,w:80,baseHeight:14,maxHeight:180,maxWeight:900,tareWeight:20},items:[{sku:'A',l:40,w:30,h:20,qty:4,weight:5}]};
  const quote = JSON.parse(execFileSync(process.execPath, ['--import','tsx','--input-type=module','-e', `import {quoteOrder} from './src/lib/orderQuote.ts'; console.log(JSON.stringify(await quoteOrder(${JSON.stringify(request)})))`], {encoding:'utf8'}));
  await page.evaluate(q => sessionStorage.setItem('dp_build_sheet',JSON.stringify(q)), {...quote,request});
  await page.goto(`${BASE}/build-sheet`, { waitUntil: 'domcontentloaded' });
  const pallet = page.getByTestId('sheet-pallet').first();
  await pallet.waitFor();
  if (await pallet.getByTestId('sheet-build-step').count() !== quote.pallets[0].cartonCount) throw new Error('Wrong build step count');
  if (Number(await pallet.getByTestId('sheet-placed-count').textContent()) !== quote.pallets[0].cartonCount) throw new Error('Wrong rendered count');
  await pallet.getByRole('checkbox',{name:'Step by layer (same starting height)',exact:true}).check();
  await pallet.getByRole('button',{name:'Previous layer',exact:true}).click();
  if(Number(await pallet.getByTestId('sheet-placed-count').textContent()) >= quote.pallets[0].cartonCount) throw new Error('Layer did not step backwards');
  await pallet.getByRole('button',{name:'Show all',exact:true}).click();
  await page.getByTestId('actual-height-0').fill('100');
  await page.getByTestId('actual-grossWeight-0').fill('45');
  await page.getByTestId('actual-crewInitials-0').fill('AB');
  await page.getByTestId('actual-pallet-count').fill('1');
  await page.getByTestId('save-actuals').click();
  await page.getByText('Actuals saved locally',{exact:true}).waitFor();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dp_quote_e2e-sheet')));
  if (saved.actuals[0].height !== 100 || saved.actuals[0].crewInitials !== 'AB' || saved.actuals.summary.actualPalletCount !== 1 || !saved.actuals[0].timestamp) throw new Error('Actuals missing');
  if (saved.pallets[0].variance.height.measured !== 100) throw new Error('Variance missing');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByTestId('actual-height-0').waitFor();
  if(await page.getByTestId('actual-height-0').inputValue() !== '100') throw new Error('Saved actuals not restored');
  await page.getByRole('link',{name:'Return to quote and variance'}).click();
  await page.getByText(new RegExp(`H \\+${100-quote.pallets[0].outerDims.h.cm}`)).first().waitFor();
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

await test('audit A: container payload and door constraints also cap the 3D scenario', async () => {
  await page.goto(`${BASE}/container`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('container-count').waitFor();
  const inputs = page.locator('input[type="number"]');
  for (const [i, value] of ['60','40','40','1000'].entries()) await inputs.nth(i).fill(value);
  await page.waitForFunction(() => document.querySelector('[data-testid="container-count"]')?.textContent === '28');
  if (!(await page.getByTestId('container-constraint').textContent()).includes('Payload')) throw new Error('Payload warning missing');
  await page.getByRole('button', { name: /Open 3D Sim/ }).click();
  await page.waitForFunction(() => document.querySelector('[data-testid="loading-rendered-count"]')?.textContent === '28');
  await page.getByRole('button', { name:'Close', exact:true }).click();
  for (const i of [0,1,2]) await inputs.nth(i).fill('230');
  await page.waitForFunction(() => document.querySelector('[data-testid="container-count"]')?.textContent === '0');
  if (!(await page.getByTestId('container-constraint').textContent()).includes('Door')) throw new Error('Door warning missing');
  await page.getByRole('button', { name: /Open 3D Sim/ }).click();
  await page.waitForFunction(() => document.querySelector('[data-testid="loading-rendered-count"]')?.textContent === '0');
  await page.getByRole('button', { name:'Close', exact:true }).click();
}, page);

await test('audit A: warehouse rebuild respects quantities and removal confirmation', async () => {
  await page.goto(`${BASE}/warehouse`, { waitUntil: 'domcontentloaded' });
  const tutorial = page.getByRole('button', { name: /got it|start planning|let.s go/i });
  if (await tutorial.count()) await tutorial.first().click();
  const counter = page.getByTestId('warehouse-cargo-count');
  await counter.waitFor();
  const before = (await counter.textContent()).split('/')[0].trim();
  await page.getByTestId('warehouse-qty-eur').fill('1');
  await page.getByTestId('warehouse-qty-gma').fill('0');
  page.once('dialog', d => d.dismiss());
  await page.getByRole('button', { name: /Auto-arrange: rebuild/ }).click();
  if ((await counter.textContent()).split('/')[0].trim() !== before) throw new Error('Cancel changed placed cargo');
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: /Auto-arrange: rebuild/ }).click();
  await page.waitForFunction(() => document.querySelector('[data-testid="warehouse-cargo-count"]')?.textContent.trim() === '1 / 1');
  await page.getByTestId('warehouse-qty-eur').fill('6');
  await page.getByRole('button', { name: /Auto-arrange: rebuild/ }).click();
  await page.waitForFunction(() => document.querySelector('[data-testid="warehouse-cargo-count"]')?.textContent.trim() === '6 / 6');
  await page.getByTestId('warehouse-qty-eur').fill('0');
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: /Auto-arrange: rebuild/ }).click();
  await page.waitForFunction(() => document.querySelector('[data-testid="warehouse-cargo-count"]')?.textContent.trim() === '0 / 0');
}, page);

await test('audit A: zero storage bookmark, door fit, fee and rate disclosures', async () => {
  await page.goto(`${BASE}/pallet-storage-cost-calculator?p=20&r=0&hd=0&m=2`, { waitUntil: 'domcontentloaded' });
  const inputs = page.locator('input[type="number"]');
  if (await inputs.nth(1).inputValue() !== '0' || await inputs.nth(2).inputValue() !== '0') throw new Error('Zero rates replaced');
  await page.reload();
  if (await inputs.nth(1).inputValue() !== '0') throw new Error('Zero rate lost on reload');
  await page.goto(`${BASE}/cbm-calculator?l=230&w=230&h=230&q=1`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/40' HQ ·/).waitFor();
  await page.goto(`${BASE}/cbm-calculator?l=235&w=235&h=235&q=1`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/by volume only — does not pass the door/).waitFor();
  await page.goto(`${BASE}/fba`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('fba-fee-note').waitFor();
  if (!(await page.getByTestId('fba-fee-note').textContent()).includes('as of 2025')) throw new Error('Fee date missing');
  for (const route of ['/packing','/embed']) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Illustrative default, not a quote.', { exact: true }).waitFor();
    await page.getByTestId('air-rate').fill('0');
    await page.getByTestId('sea-rate').fill('0');
    if (await page.getByTestId('air-rate').inputValue() !== '0') throw new Error('Rate not editable');
    if (!(await page.getByTestId('air-unit-cost').textContent()).includes('0.00') || !(await page.getByTestId('sea-unit-cost').textContent()).includes('0.00')) throw new Error('Rate change did not update cost');
  }
  await page.goto(`${BASE}/compare/cube-iq-alternative`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name:'magiclogic.com', exact:true }).waitFor();
  await page.getByText(/No numeric price verified/).waitFor();
}, page);

await fixAuditBTests({test,page,BASE});

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
  await page.getByTestId('planner-packed').waitFor();
  // make the first carton 235cm in every axis: fits the 20GP interior (239h)
  // but NOT the 234x228 door in any orientation
  const dims = page.locator('input[type="number"]');
  for (const i of [0, 1, 2]) await dims.nth(i).fill('235');
  await page.getByRole('button', { name: /optimise pack/i }).click();
  await page.getByText(/won't fit through the door/i).waitFor();
  // restore ALL three dims — 60x235x235 still cannot pass (cross-section 235x235)
  for (const [i, v] of [[0, '60'], [1, '50'], [2, '45']]) await dims.nth(i).fill(v);
  await page.getByRole('button', { name: /optimise pack/i }).click();
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
  await page.getByTestId('planner-packed').waitFor();
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
  await page.getByTestId('planner-packed').waitFor();
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

await test('home: visible FAQ and structured data agree in both languages', async () => {
  for(const path of ['/','/zh']){
    await page.goto(`${BASE}${path}`);
    await page.getByRole('heading',{name:path==='/'?'Questions, answered':'常見問題',exact:true}).waitFor();
    const schemas=await page.locator('script[type="application/ld+json"]').evaluateAll(nodes=>nodes.map(n=>JSON.parse(n.textContent)).filter(s=>s['@type']==='FAQPage'));
    if(schemas.length!==1)throw Error(`Expected exactly one FAQ schema, got ${schemas.length}`);
    const schema=schemas[0];
    for(const q of schema.mainEntity){
      const summary=page.locator('summary').filter({hasText:q.name});await summary.click();
      await page.getByText(q.acceptedAnswer.text,{exact:true}).waitFor();
    }
  }
},page);

await test('planner: container vessel shows SOLAS VGM line', async () => {
  await page.goto(`${BASE}/planner`, { waitUntil: 'domcontentloaded' });
  await page.getByText('VGM estimate · cargo + tare',{exact:true}).waitFor();
  await page.getByText('Includes 2,300 kg container tare',{exact:true}).waitFor();
}, page);

await test('home: focused entry navigation fits phone, tablet and desktop', async () => {
 const p=await ctx.newPage();
 try{
  for(const width of [390,820,1440]){
   await p.setViewportSize({width,height:900}); await p.goto(`${BASE}/`);
   await p.getByRole('heading',{name:/plan a mixed load in 3D/i}).waitFor();
   if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(`Homepage overflow ${width}`);
   const nav=p.getByRole('navigation',{name:'Homepage navigation'});await nav.locator('summary').click();
   const dir=nav.getByRole('link',{name:'All tools',exact:true});await dir.click();
   await p.locator('#more-tools[open]').waitFor();
   if(await nav.locator('details').getAttribute('open')!==null)throw Error('Navigation did not close after selection');
   await p.getByRole('link',{name:'Import Excel / CSV',exact:true}).click();
   await p.getByRole('dialog').waitFor();
   if(!p.url().includes('/planner?import=1'))throw Error('Import CTA lost import intent');
  }
 }finally{await p.close();}
},page);

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
  await page.getByRole('heading',{name:'One shipment. Compare, adjust, hand off.',exact:true}).waitFor();
  const vids = page.locator('video');
  if (await vids.count() !== 1) throw new Error('Expected focused Planner clip');
  await vids.first().scrollIntoViewIfNeeded();
  await page.waitForFunction(() => Array.from(document.querySelectorAll('video')).some(v => !v.paused && v.currentTime > 0), undefined, { timeout: 15_000 });
  await page.getByRole('heading', { name: /plan a mixed load in 3D/i }).scrollIntoViewIfNeeded();
  await page.waitForFunction(() => Array.from(document.querySelectorAll('video')).every(v => v.paused));
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

await test('warehouse REGRESSION: cancelling rebuild preserves manually placed pallets', async () => {
  await page.getByRole('button', { name: /place one near the dock/i }).first().click();
  await page.waitForTimeout(250);
  const before = await dpCount();
  const dialog = page.waitForEvent('dialog');
  const click = page.getByRole('button', { name: /auto-arrange/i }).click();
  const confirmation = await dialog;
  if (!confirmation.message().includes('remove')) throw new Error('Removal not disclosed');
  await confirmation.dismiss();
  await click;
  const after = await dpCount();
  if (after !== before) throw new Error(`Cancelled arrange changed boxes: ${before} -> ${after}`);
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
    await page.getByTestId('planner-packed').waitFor();
    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/share') && r.request().method() === 'POST'),
      page.getByRole('button', { name: /share this plan/i }).click(),
    ]);
    const { id } = await resp.json();
    if (!id) throw new Error('no share id');
    await page.goto(`${BASE}/planner?share=${id}`, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('planner-packed').waitFor();
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

const searchPage = await ctx.newPage();
await test('search workflow: downloadable guide example opens the matching 20-carton plan', async () => {
  await searchPage.goto(`${BASE}/guides/excel-container-load-plan`);
  await searchPage.getByRole('heading', {name:'Excel Packing List to 3D Container Load Plan',exact:true}).waitFor();
  const sample=await ctx.request.get(`${BASE}/examples/container-packing-list.csv`);
  if(!sample.ok()||!(await sample.text()).includes('Master carton,60,40,40,18,10,yes'))throw Error('Missing downloadable example');
  await searchPage.getByRole('link',{name:'Open this example in 3D',exact:true}).click();
  await searchPage.getByText('20 / 20',{exact:true}).waitFor();
  if(await searchPage.getByLabel('This is my own job, not a sample').isChecked())throw Error('Example counted as own job');
}, searchPage);
await test('search workflow: Traditional Chinese planner links use exactly one locale prefix', async () => {
  await searchPage.goto(`${BASE}/zh/planner`);
  for (const [name,target] of [['用此散箱貨單計算卡板報價','/zh/order-quote'],['比較此貨單的櫃型','/zh/consolidation?from=planner']]) {
    if(await searchPage.getByRole('link',{name,exact:true}).getAttribute('href')!==target)throw Error('Broken planner handoff locale: '+name);
  }
  await searchPage.getByText('使用指南與常見問題',{exact:true}).click();
  const nav=searchPage.getByRole('navigation',{name:'相關裝載工具'});
  await nav.waitFor();
  const links=await nav.locator('a').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
  if(links.length!==4||links.some(h=>!h.startsWith('/zh/')||h.includes('/zh/zh/')))throw Error('Broken locale links');
  await nav.getByRole('link',{name:'Excel 匯入：完整實例 →',exact:true}).click();
  await searchPage.getByRole('heading',{name:'Excel 貨單轉 3D 裝櫃圖：完整實例',exact:true}).waitFor();
}, searchPage);
await test('search workflow: TI/HI carries dimensions and requests weight verification', async () => {
  await searchPage.goto(`${BASE}/ti-hi-calculator?u=cm&l=50&w=35&h=25&p=ind&mh=150`);
  await searchPage.getByRole('link',{name:'Check weight and pallets needed',exact:true}).click();
  await searchPage.getByLabel('Length cm',{exact:true}).waitFor();
  if(await searchPage.getByLabel('Length cm',{exact:true}).inputValue()!=='50')throw Error('Case length lost');
  if(await searchPage.getByLabel('Height cm',{exact:true}).inputValue()!=='25')throw Error('Case height lost');
  if(new URL(searchPage.url()).searchParams.get('wt')!=='0')throw Error('Invented weight');
}, searchPage);
await searchPage.close();

await test('workspace: bilingual sign-in and private noindex route', async () => {
  await page.setViewportSize({width:390,height:844});
  await page.goto(`${BASE}/zh/workspace`,{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'團隊工作區',exact:true}).waitFor();
  await page.getByRole('textbox',{name:'Email',exact:true}).waitFor();
  if(!await page.locator('meta[name="robots"]').evaluateAll(nodes=>nodes.some(n=>n.content.includes('noindex'))))throw Error('Private route must be noindex');
  if(await page.getByRole('button',{name:'建立工作區',exact:true}).count())throw Error('Guest sees team mutations');
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Workspace overflows mobile viewport');
  await page.setViewportSize({width:1440,height:900});
  await page.goto(`${BASE}/order-quote`,{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'Save to team workspace',exact:true}).waitFor();
  await page.getByRole('link',{name:'Open team workspace',exact:true}).waitFor();
},page);

await test('export feedback: one-click usefulness, optional details, suppresses repeat prompt', async () => {
  const feedbackPage=await ctx.newPage();
  try {
    await feedbackPage.goto(`${BASE}/zh/warehouse`,{waitUntil:'domcontentloaded'});
    await feedbackPage.getByRole('button',{name:'PDF plan',exact:true}).click();
    const panel=feedbackPage.getByRole('region',{name:'報告意見'});
    await panel.waitFor();
    await panel.getByRole('button',{name:'仲要修改',exact:true}).click();
    await panel.getByRole('status').waitFor();
    if(!await panel.getByRole('button',{name:'提交補充資料'}).isDisabled())throw Error('Missing blocker accepted');
    await panel.getByRole('combobox',{name:'最需要改善嘅地方'}).selectOption('fields');
    await panel.getByRole('button',{name:'提交補充資料'}).click();
    if(await panel.count())throw Error('Feedback stays open after submit');
    await feedbackPage.getByRole('button',{name:'PDF plan',exact:true}).click();
    if(await panel.count())throw Error('Repeated prompt in same tab');
  } finally { await feedbackPage.close(); }
},page);

await test('international tools: localized calculation, stale export guard and reciprocal languages', async () => {
  await page.goto(`${BASE}/es/pallet-calculator`);
  await page.getByRole('button',{name:'Calcular',exact:true}).click();
  const results=page.locator('dl');
  if(!(await results.first().innerText()).includes('40'))throw Error('Wrong pallet capacity');
  await page.getByTestId('intl-payload').fill('75');
  if(!await page.getByRole('button',{name:'Descargar CSV',exact:true}).isDisabled())throw Error('Stale export enabled');
  await page.getByRole('button',{name:'Calcular',exact:true}).click();
  if(!(await results.first().innerText()).includes('15'))throw Error('Weight limit not applied');
  if(await page.locator('link[rel="alternate"]').count()!==8)throw Error('Incomplete language alternatives');
  await page.goto(`${BASE}/de/cbm-calculator`);
  await page.getByTestId('intl-l').fill('40,5');
  await page.getByRole('button',{name:'Berechnen',exact:true}).click();
  if(!(await page.locator('dl').first().innerText()).includes('3,645'))throw Error('Decimal comma not accepted');
  await page.getByTestId('intl-l').fill('');
  await page.getByRole('button',{name:'Berechnen',exact:true}).click();
  await page.getByRole('alert').waitFor();
  if(!await page.getByRole('button',{name:'CSV herunterladen',exact:true}).isDisabled())throw Error('Invalid input exports');
  await page.goto(`${BASE}/zh-hans/shipping-tools`);
  await page.getByRole('heading',{name:'运输计算工具：体积、托盘与装柜规划',exact:true}).waitFor();
  await page.locator('html[lang="zh-Hans"]').waitFor();
  if(await page.locator('html').getAttribute('lang')!=='zh-Hans')throw Error('Wrong Simplified Chinese language');
}, page);

await test('planner review: shared draft flags missing support and reconciles same-name cargo in PDF', async()=>{
 const p=await ctx.newPage();
 await p.route('**/api/lead',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 const specs=[{id:'review-a',label:'Same label',l:60,w:40,h:40,weight:10,qty:2,color:123456,keepUpright:true},{id:'review-b',label:'Same label',l:60,w:40,h:40,weight:10,qty:1,color:123456}];
 await p.route('**/api/share?id=review-fixture',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({containerKey:'20gp',container:{l:589,w:235,h:239},specs,boxes:[{id:'review-a-1',specId:'review-a',label:'Same label',l:60,w:40,h:40,weight:10,px:0,py:40,pz:0,color:123456}],reportName:'Review fixture',jobId:'synthetic-job'})}));
 try{
  await p.goto(`${BASE}/planner?share=review-fixture`);
  const panel=p.getByRole('region',{name:'Plan review',exact:true});
  await panel.getByText('Less than 60% of this base is supported.',{exact:false}).waitFor();
  if(!(await p.getByTestId('planner-review-status').innerText()).startsWith('Draft'))throw Error('Invalid plan not marked draft');
  await panel.locator('summary').click();
  await panel.getByRole('row',{name:'Same label review-b Not placed in this layout. Compare equipment or review rules; this is not proof that it cannot fit. 1 0 1'}).waitFor();
  await p.getByRole('combobox',{name:'Report for',exact:true}).selectOption('summary');
  await p.getByRole('button',{name:'PDF plan',exact:true}).click();
  await p.getByPlaceholder('you@company.com',{exact:true}).fill('review-test@example.test');
  const opened=p.waitForEvent('popup');await p.getByRole('button',{name:/unlock & download/i}).click();const report=await opened;
  try{await report.getByText('DRAFT · remaining cargo or issues need review',{exact:true}).waitFor();await report.getByText('review-b',{exact:true}).waitFor();if(await report.locator('svg').count())throw Error('Summary includes crew steps');}finally{await report.close();}
 }finally{await p.close();}
},page);

await test('product packing: improved count, gross weight and 3D agree',async()=>{
 const isolated=await browser.newContext({viewport:{width:1440,height:900}});const p=await isolated.newPage();
 try{
  await p.goto(`${BASE}/packing`);
  await p.getByTestId('product-packing-count').waitFor();
  if(await p.getByTestId('product-packing-count').innerText()!=='35')throw Error('Expected 35 products');
  await p.getByTestId('product-packing-gain').waitFor();
  if(!(await p.locator('main').innerText()).includes('29.50'))throw Error('Packed gross weight not updated');
  await p.getByRole('button',{name:'Open 3D Sim',exact:true}).click();
  await p.locator('canvas').waitFor();
  if(await p.getByTestId('loading-scenario-count').first().innerText()!=='35')throw Error('3D differs from summary');
  await p.getByText('Optimized arrangement',{exact:true}).waitFor();
 }finally{await isolated.close();}
},page);

await test('planner review: comparison preserves a local revision and transfers cargo',async()=>{
 await page.goto(`${BASE}/planner?demo=excel`);
 await page.getByRole('textbox',{name:'Report reference (optional)',exact:true}).fill('Synthetic comparison');
 await page.getByTestId('planner-packed').waitFor();
 await page.getByRole('link',{name:'Compare containers for this cargo',exact:true}).click();
 await page.getByTestId('carried-cargo-ready').waitFor();
 if(!await page.getByTestId('carried-cargo-ready').innerText().then(t=>t.includes('20 cartons')))throw Error('Expected original 20 cartons without an extra import step');
 await page.getByTestId('consolidation-run').click();
 await page.getByTestId('container-decision-summary').first().waitFor();
 if(!await page.getByText('example-master',{exact:false}).count()) {
  const data=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('dp_cargo_transfer_v1')));
  if(data.specs.reduce((n,s)=>n+s.qty,0)!==20)throw Error('Transferred quantity differs');
 }
 await page.goto(`${BASE}/planner?demo=excel`);
 await page.getByText('Saved versions on this device',{exact:true}).click();
 await page.getByText(/Synthetic comparison/).first().waitFor();
 await page.getByTestId('planner-packed').waitFor();
 await page.getByRole('button',{name:'Reopen version',exact:true}).first().click();
 if(await page.getByRole('textbox',{name:'Report reference (optional)',exact:true}).inputValue()!=='Synthetic comparison')throw Error('Reference not restored');
 await page.getByTestId('planner-packed').waitFor();
 await page.getByRole('button',{name:'Start next job (keep inputs)',exact:true}).click();
 if(await page.getByRole('textbox',{name:'Report reference (optional)',exact:true}).inputValue()!=='')throw Error('Previous report reference carried to next job');
},page);

await test('container comparison: missing transfer never substitutes example cargo',async()=>{
 const isolated=await browser.newContext({viewport:{width:390,height:844}});const p=await isolated.newPage();
 try{
  await p.goto(`${BASE}/consolidation?from=planner`);
  await p.getByRole('alert').waitFor();
  if(!await p.getByTestId('consolidation-run').isDisabled())throw Error('Missing transfer enabled example calculation');
  if(await p.getByRole('textbox',{name:'PO 1',exact:true}).count())throw Error('Example cargo substituted');
  if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Comparison overflow');
 }finally{await isolated.close();}
},page);

await test('planner: improved single-SKU layout and cancellable background calculation',async()=>{
 const p=await ctx.newPage();
 try{
  await p.goto(`${BASE}/planner`);
  await p.getByTestId('planner-packed').waitFor();
  await p.getByRole('button',{name:"40' HQ",exact:true}).click();
  await p.getByTestId('planner-packed').waitFor();
  const load=async(csv)=>{
   await p.getByRole('button',{name:/Import Excel/}).click();
   await p.getByLabel('Paste carton list',{exact:true}).fill(csv);
   await p.getByRole('button',{name:'Review pasted rows',exact:true}).click();
   await p.getByRole('checkbox',{name:'I checked units, accepted quantities and excluded rows.',exact:true}).check();
   await p.getByRole('button',{name:'Use this list and calculate',exact:true}).click();
  };
  await load('name,length,width,height,weight,qty\nBenchmark,60,40,35,1,1000');
  await p.getByText('878 / 1000',{exact:true}).waitFor();
  await p.getByRole('button',{name:'More detail',exact:true}).click();
  await p.getByTestId('packing-improvement').getByText(/58 cartons/).waitFor();
  await p.getByText('What does this mean for my freight cost?',{exact:true}).click();
  await p.getByLabel('Freight quote for this container (optional)',{exact:true}).fill('8200');
  await p.getByText(/10.00 →/).waitFor();
  await p.getByText('9.34',{exact:true}).waitFor();
  await load('name,length,width,height,weight,qty\nSlow case,44,32.5,30,1,1782');
  await p.getByRole('button',{name:'Cancel calculation',exact:true}).waitFor();
  await p.getByLabel('Report reference (optional)',{exact:true}).fill('Still responsive');
  if(!await p.getByRole('button',{name:'CSV',exact:true}).isDisabled())throw Error('Export enabled while calculating');
  await p.getByRole('button',{name:'Cancel calculation',exact:true}).click();
  await p.getByText('Calculation cancelled. Select Optimise pack to try again.',{exact:true}).waitFor();
  await p.getByRole('button',{name:'Optimise pack',exact:true}).click();
  await p.getByRole('button',{name:'Cancel calculation',exact:true}).click();
  await p.locator('input[type="number"]').nth(4).fill('100');
  await p.getByRole('button',{name:'Optimise pack',exact:true}).click();
  await p.getByText('100 / 100',{exact:true}).waitFor();
  if(await p.getByRole('button',{name:'CSV',exact:true}).isDisabled())throw Error('Export did not recover after retry');
 }finally{await p.close();}
},page);

await test('planner: distinct options switch layout, preserve original and export selected positions',async()=>{
 const isolated=await browser.newContext({viewport:{width:1440,height:900}});
 const p=await isolated.newPage();
 try{
  await p.route('**/api/lead',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
  await p.goto(`${BASE}/planner`);
  await p.getByTestId('planner-packed').waitFor();
  await p.getByRole('button',{name:'Find alternative layouts',exact:true}).click();
  await p.getByTestId('planner-layout-2').waitFor();
  await p.getByText('215 / 240',{exact:true}).waitFor();
  if(await p.getByTestId('planner-layout-2').getAttribute('aria-pressed')!=='true')throw Error('Highest-volume candidate not selected');
  const history=await p.evaluate(()=>JSON.parse(localStorage.getItem('dp_planner_history_v1')??'[]'));
  if(!history.some(s=>s.boxes.length===188))throw Error('Original plan not preserved');
  await p.getByTestId('planner-layout-0').click();
  await p.getByText('188 / 240',{exact:true}).waitFor();
  await p.getByTestId('planner-layout-2').click();
  await p.getByText('215 / 240',{exact:true}).waitFor();
  const download=p.waitForEvent('download');
  await p.getByRole('button',{name:'CSV',exact:true}).click();
  await p.getByPlaceholder('you@company.com',{exact:true}).fill('options-test@example.test');
  await p.getByRole('button',{name:/unlock & download/i}).click();
  const file=await download, stream=await file.createReadStream(), chunks=[];
  for await(const chunk of stream)chunks.push(chunk);
  const csv=Buffer.concat(chunks).toString();
  if(csv.split('\n').filter(line=>line.startsWith('"placement",')).length!==215)throw Error('CSV does not match selected layout');
  await p.locator('input[type="number"]').nth(4).fill('141');
  if(!await p.getByTestId('planner-layout-0').isDisabled())throw Error('Option switch allowed with pending inputs');
  await p.getByRole('button',{name:'Optimise pack',exact:true}).click();
  await p.getByTestId('planner-packed').waitFor();
  if(await p.getByTestId('planner-layout-options').count())throw Error('Old alternatives survived new inputs');
 }finally{await isolated.close();}
},page);

await test('planner: workspace settings persist and responsive navigation preserves inputs', async () => {
  const p = await ctx.newPage();
  try {
    await p.goto(`${BASE}/planner`);
    await p.getByTestId('planner-packed').waitFor();
    const packed = await p.getByTestId('planner-packed').innerText();
    const resultsPanel=p.getByRole('region',{name:'Load results',exact:true});
    if(await resultsPanel.getByTestId('planner-packed').innerText()!==packed) throw Error('Loaded count is not beside the 3D results');
    await p.getByRole('button',{name:'More detail',exact:true}).click();
    await resultsPanel.getByText('Cartons remaining',{exact:true}).waitFor();
    await resultsPanel.getByText('Loaded cargo weight',{exact:true}).waitFor();
    await p.getByRole('button',{name:'Less detail',exact:true}).click();
    if(await p.getByTestId('planner-packed').innerText()!==packed) throw Error('Collapse changed cargo');
    const rotation=p.getByRole('button',{name:/^(Auto rotate|Pause rotation)$/});
    const before=await rotation.getAttribute('aria-pressed'); await rotation.click();
    if(await rotation.getAttribute('aria-pressed')===before) throw Error('Rotation toggle failed');
    await rotation.click();
    await p.getByRole('button',{name:'Reset view',exact:true}).click();
    if(await p.getByTestId('planner-packed').innerText()!==packed) throw Error('Reset view changed cargo');
    await p.getByRole('button',{name:'Expand menu',exact:true}).waitFor();
    await p.getByRole('navigation', {name:'Tool navigation',exact:true}).waitFor();
    await p.getByRole('button',{name:'Settings',exact:true}).click();
    const dialog = p.getByRole('dialog',{name:'Workspace settings'});
    await dialog.waitFor();
    await dialog.getByRole('checkbox',{name:'Compact desktop navigation (icons only)',exact:true}).check();
    await dialog.getByRole('checkbox',{name:'Show calculation updates in Planner',exact:true}).uncheck();
    await dialog.getByRole('button',{name:'Done',exact:true}).click();
    if(await p.getByRole('complementary',{name:'Product updates'}).count()) throw Error('Announcement preference ignored');
    if(await p.getByTestId('planner-packed').innerText() !== packed) throw Error('Display preference changed cargo');
    await p.reload();
    await p.getByRole('button',{name:'Settings',exact:true}).click();
    if(!await dialog.getByRole('checkbox',{name:'Compact desktop navigation (icons only)',exact:true}).isChecked()) throw Error('Preference not persisted');
    await p.keyboard.press('Escape');
    if(await dialog.isVisible()) throw Error('Escape did not close settings');
    if(!await p.getByRole('button',{name:'Settings',exact:true}).evaluate(el=>el===document.activeElement)) throw Error('Focus not restored');
    for(const width of [390,768,1024,1440,1920]) {
      await p.setViewportSize({width,height:900});
      if(await p.evaluate(()=>document.documentElement.scrollWidth > innerWidth)) throw Error(`Horizontal overflow at ${width}`);
      if(width>=1280 && !await p.getByRole('navigation',{name:'Tool navigation',exact:true}).isVisible()) throw Error('Desktop sidebar missing');
      const geometry=await p.evaluate(()=>{const g=document.querySelector('main .grid');const c=document.querySelector('canvas');return {columns:getComputedStyle(g).gridTemplateColumns,canvas:c?{w:c.clientWidth,h:c.clientHeight}:null};});
      if(width>=1024 && parseFloat(geometry.columns)<380) throw Error('Cargo column too narrow');
      if(geometry.canvas && (geometry.canvas.h>520 || geometry.canvas.h<180)) throw Error('3D height exceeds workspace bounds');
      await mkdir('test-artifacts',{recursive:true});
      await p.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));
      await p.screenshot({path:`test-artifacts/planner-${width}-top.png`});
      await p.getByRole('heading',{name:'Load results',exact:true}).scrollIntoViewIfNeeded();
      await p.screenshot({path:`test-artifacts/planner-${width}-results.png`});
      await p.getByTestId('planner-load-checks').scrollIntoViewIfNeeded();
      const zoneLabels=p.getByTestId('planner-zone-labels');
      await zoneLabels.getByText('Unload #1',{exact:true}).waitFor();
      await zoneLabels.getByText('5 cartons',{exact:true}).waitFor();
      if(await zoneLabels.evaluate(el=>el.scrollWidth>el.clientWidth))throw Error(`Load-zone labels overflow at ${width}`);
      await p.screenshot({path:`test-artifacts/planner-${width}-checks.png`});
      await p.getByRole('heading',{name:'Save & share this job',exact:true}).scrollIntoViewIfNeeded();
      await p.getByText('Share a snapshot / manage links',{exact:true}).click();
      if(await p.evaluate(()=>document.documentElement.scrollWidth > innerWidth)) throw Error(`Share panel overflow at ${width}`);
      await p.screenshot({path:`test-artifacts/planner-${width}-actions.png`});
      await p.getByText('Share a snapshot / manage links',{exact:true}).click();
    }
    await p.setViewportSize({width:1440,height:900});
    for(let i=0;i<4;i++) await p.getByRole('button',{name:'+ Add',exact:true}).click();
    await p.evaluate(()=>window.scrollTo({top:400,behavior:'instant'}));
    const sticky=await p.getByTestId('planner-sticky-view').evaluate(el=>({top:el.getBoundingClientRect().top,position:getComputedStyle(el).position}));
    if(sticky.position!=='sticky'||sticky.top<60||sticky.top>120)throw Error('3D workspace did not remain visible while editing long cargo lists');
    await p.getByRole('button',{name:'Settings',exact:true}).click();
    await dialog.getByRole('checkbox',{name:'Compact desktop navigation (icons only)',exact:true}).uncheck();
    await dialog.getByRole('checkbox',{name:'Show calculation updates in Planner',exact:true}).check();
    await dialog.getByRole('button',{name:'Done',exact:true}).click();
  } finally { await p.close(); }
},page);

await browser.close();

console.log('\n' + results.join('\n'));
console.log(`\n${passed} passed, ${failed} failed (${BASE})`);
process.exit(failed > 0 ? 1 : 0);
