#!/usr/bin/env node
/**
 * visual.mjs — visual QA harness. Walks the product through its key states
 * and captures screenshots for review (by Claude or a human). This exists
 * because DOM assertions passed while the 3D experience was broken — some
 * bugs are only visible by LOOKING.
 *
 * Usage: node tests/visual.mjs [baseUrl] [outDir]
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'https://dimpack3d.com';
const OUT = process.argv[3] ?? '/tmp/dp-visual';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  ...(process.env.PW_BROWSER === 'chromium' ? {} : { channel: 'chrome' }),
  headless: true,
});

const shots = [];
async function snap(page, name, opts = {}) {
  await page.waitForTimeout(opts.wait ?? 800);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: opts.full ?? false });
  shots.push(name);
  console.log(`SNAP ${name}`);
}

async function run(viewport, tag) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20_000);

  // --- home ---
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await snap(page, `${tag}-home-hero`, { wait: 2500 });
  if (tag === 'desktop') {
    await page.getByRole('button', { name: /products → carton/i }).click().catch(() => {});
    await snap(page, `${tag}-home-carton-tab`, { wait: 2000 });
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await snap(page, `${tag}-home-full`, { full: true, wait: 2500 });
  }

  // --- planner ---
  await page.goto(`${BASE}/planner`, { waitUntil: 'domcontentloaded' });
  await snap(page, `${tag}-planner-default`, { wait: 2500 });
  if (tag === 'desktop') {
    await page.getByRole('button', { name: /import excel\/csv/i }).click();
    await snap(page, `${tag}-planner-import-modal`);
    await page.getByPlaceholder(/copy your rows/i).fill('name\tl\tw\th\tkg\tqty\nQA Box\t55\t45\t35\t12\t80\n');
    await snap(page, `${tag}-planner-import-preview`);
    await page.getByRole('button', { name: /import 1 carton type/i }).click();
    await snap(page, `${tag}-planner-after-import`, { wait: 2000 });
    await page.getByRole('button', { name: /eur pallet/i }).click();
    await snap(page, `${tag}-planner-pallet-vessel`, { wait: 2000 });
    await page.getByRole('button', { name: /^csv$/i }).click();
    await snap(page, `${tag}-planner-export-gate`);
    await page.keyboard.press('Escape').catch(() => {});
    await page.mouse.click(10, 10);
  }

  // --- warehouse ---
  await page.goto(`${BASE}/warehouse`, { waitUntil: 'domcontentloaded' });
  await snap(page, `${tag}-warehouse-tutorial`);
  await page.getByRole('button', { name: /got it/i }).click().catch(() => {});
  await snap(page, `${tag}-warehouse-default`, { wait: 2500 });
  if (tag === 'desktop') {
    await page.getByRole('button', { name: /place one near the dock/i }).first().click();
    await snap(page, `${tag}-warehouse-route`, { wait: 1500 });
    await page.getByRole('button', { name: /example: 3pl floor/i }).click();
    await snap(page, `${tag}-warehouse-3pl`, { wait: 2500 });
    await page.getByRole('button', { name: /auto-arrange/i }).click();
    await snap(page, `${tag}-warehouse-arranged-msg`, { wait: 1200 });
    // PDF popup
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('button', { name: /pdf plan/i }).click(),
    ]);
    await popup.waitForLoadState('domcontentloaded');
    await popup.setViewportSize({ width: 900, height: 1200 });
    await popup.waitForTimeout(600);
    await popup.screenshot({ path: `${OUT}/${tag}-warehouse-pdf.png`, fullPage: true });
    shots.push(`${tag}-warehouse-pdf`);
    await popup.close();
  }

  // --- content ---
  if (tag === 'desktop') {
    await page.goto(`${BASE}/api-docs`, { waitUntil: 'domcontentloaded' });
    await snap(page, `${tag}-api-docs`, { full: true });
    await page.goto(`${BASE}/answers/how-many-60x40x40-cartons-fit-on-a-eur-pallet`, { waitUntil: 'domcontentloaded' });
    await snap(page, `${tag}-answers-pallet`);
    await page.goto(`${BASE}/zh/planner`, { waitUntil: 'domcontentloaded' });
    await snap(page, `${tag}-zh-planner`, { wait: 2000 });
    await page.goto(`${BASE}/plans`, { waitUntil: 'domcontentloaded' });
    await snap(page, `${tag}-plans-signin`);
  }

  await ctx.close();
}

await run({ width: 1440, height: 900 }, 'desktop');
await run({ width: 390, height: 844 }, 'mobile');

await browser.close();
console.log(`\n${shots.length} screenshots → ${OUT}`);
