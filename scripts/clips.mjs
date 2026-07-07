#!/usr/bin/env node
/**
 * clips.mjs — record short product clips with Playwright (real UI, real
 * engine — no staged mockups). Output: public/media/*.webm, embedded on the
 * homepage as autoplay/muted/loop videos.
 *
 * Usage: node scripts/clips.mjs http://localhost:4174
 */

import { chromium } from 'playwright';
import { mkdirSync, copyFileSync, statSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:4174';
mkdirSync('public/media', { recursive: true });

const browser = await chromium.launch({
  ...(process.env.PW_BROWSER === 'chromium' ? {} : { channel: 'chrome' }),
  headless: true,
});

async function record(name, run) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: '/tmp/dp-clips', size: { width: 1280, height: 720 } },
  });
  const page = await ctx.newPage();
  try {
    await run(page);
  } finally {
    const video = page.video();
    await ctx.close(); // flushes the video file
    const path = await video.path();
    copyFileSync(path, `public/media/${name}.webm`);
    const kb = Math.round(statSync(`public/media/${name}.webm`).size / 1024);
    console.log(`[clips] ${name}.webm — ${kb} KB`);
  }
}

const drag = async (page, fx, fy, dx, dy, steps = 24) => {
  const bb = await page.locator('canvas').first().boundingBox();
  const gx = bb.x + bb.width * fx, gy = bb.y + bb.height * fy;
  await page.mouse.move(gx, gy);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(gx + (dx * i) / steps, gy + (dy * i) / steps, { steps: 1 });
    await page.waitForTimeout(28);
  }
  await page.mouse.up();
};

// ---- clip 1: warehouse — route sim, then drag a pallet until it flags red
await record('warehouse-checks', async (page) => {
  await page.goto(`${BASE}/warehouse`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /got it/i }).click().catch(() => {});
  await page.getByRole('button', { name: /example: 3pl floor/i }).click();
  await page.waitForTimeout(2200);
  // click a pallet → forklift route + clearance band animate
  const bb = await page.locator('canvas').first().boundingBox();
  await page.mouse.click(bb.x + bb.width * 0.42, bb.y + bb.height * 0.5);
  await page.waitForTimeout(3500);
  // drag it across the aisle — reachability flips, flags flash red
  await drag(page, 0.42, 0.5, 150, 60);
  await page.waitForTimeout(2800);
});

// ---- clip 2: planner — packed container, drag a carton, axle stats live
await record('planner-drag', async (page) => {
  await page.goto(`${BASE}/planner?demo=retail`, { waitUntil: 'domcontentloaded' });
  await page.locator('canvas').first().waitFor();
  await page.waitForTimeout(2500);
  await drag(page, 0.55, 0.42, -140, 40);
  await page.waitForTimeout(1200);
  await drag(page, 0.5, 0.5, 120, -30);
  await page.waitForTimeout(2200);
});

await browser.close();
console.log('[clips] done');
