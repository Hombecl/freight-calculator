#!/usr/bin/env node
/**
 * prerender.mjs — post-build static HTML snapshots for every route.
 *
 * Why: the app is a client-rendered SPA, so crawlers that do not execute
 * JavaScript (GPTBot, ClaudeBot, PerplexityBot, most AI engines, many SEO
 * bots) see an empty <body>. This script serves the built app with `vite
 * preview`, renders each route in headless Chrome, and writes the resulting
 * DOM (content + react-helmet meta) to dist/<route>/index.html.
 *
 * Browsers still run React normally (createRoot replaces the snapshot), so
 * this changes nothing for real users — it only makes every page readable
 * without JavaScript.
 *
 * Usage: node scripts/prerender.mjs   (runs automatically via `npm run build`)
 */

import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROUTES = [
  '/',
  '/planner',
  '/packing',
  '/container',
  '/fba',
  '/guides',
  '/guides/fba-size-tiers-2025',
  '/guides/cbm-calculator-shipping',
  '/guides/container-loading-optimization',
  '/guides/dimensional-weight-calculator',
  '/guides/products-per-carton',
  '/guides/amazon-dimensional-weight',
  '/guides/fba-fee-calculator',
  '/guides/pallet-calculator',
];

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
];
const chrome = CHROME_PATHS.find((p) => existsSync(p));
if (!chrome) {
  console.warn('[prerender] Chrome not found — skipping prerender (SPA shell only).');
  process.exit(0);
}

const PORT = 4173;
const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
  detached: false,
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  // wait for the preview server
  let up = false;
  for (let i = 0; i < 30 && !up; i++) {
    await wait(500);
    try {
      const res = await fetch(`http://localhost:${PORT}/`);
      up = res.ok;
    } catch { /* not up yet */ }
  }
  if (!up) throw new Error('vite preview did not start');

  let ok = 0;
  for (const route of ROUTES) {
    const url = `http://localhost:${PORT}${route}`;
    let html = '';
    try {
      html = execFileSync(
        chrome,
        [
          '--headless=new',
          '--disable-gpu',
          '--hide-scrollbars',
          '--virtual-time-budget=15000',
          '--dump-dom',
          url,
        ],
        { maxBuffer: 32 * 1024 * 1024, timeout: 60_000 },
      ).toString();
    } catch (e) {
      console.warn(`[prerender] FAILED ${route}: ${e.message}`);
      continue;
    }
    // sanity: only keep snapshots that actually contain rendered content
    if (!html.includes('</body>') || html.length < 5_000) {
      console.warn(`[prerender] ${route} rendered too little — kept as SPA shell`);
      continue;
    }
    // "<route>.html" (not "<route>/index.html") so Cloudflare Pages serves
    // /planner directly from planner.html with no 308 trailing-slash redirect
    const outPath = route === '/'
      ? join('dist', 'index.html')
      : join('dist', `${route.replace(/^\//, '')}.html`);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, '<!DOCTYPE html>\n' + html);
    ok++;
    console.log(`[prerender] ${route} → ${outPath} (${(html.length / 1024).toFixed(0)} KB)`);
  }
  console.log(`[prerender] done: ${ok}/${ROUTES.length} routes snapshotted`);
  if (ok === 0) process.exit(1);
} finally {
  preview.kill('SIGTERM');
}
