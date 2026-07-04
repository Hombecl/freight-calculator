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
import { mkdirSync, writeFileSync, existsSync, readFileSync, mkdtempSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const BASE_ROUTES = [
  '/',
  '/planner',
  '/packing',
  '/container',
  '/fba',
  '/answers',
  '/about',
  '/privacy',
  '/terms',
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

// programmatic answer pages — same single source as src/lib/answers.ts
const answersData = JSON.parse(readFileSync('src/data/answers.json', 'utf8'));
const ANSWER_ROUTES = [];
for (const ct of answersData.containers) {
  ANSWER_ROUTES.push(`/answers/cartons-in-${ct.slug}`);
  for (const c of answersData.cartons) {
    ANSWER_ROUTES.push(`/answers/how-many-${c.l}x${c.w}x${c.h}-cartons-fit-in-a-${ct.slug}`);
  }
}

// competitor comparison pages — single source src/data/competitors.json
const competitorsData = JSON.parse(readFileSync('src/data/competitors.json', 'utf8'));
const COMPARE_ROUTES = competitorsData.competitors.map((c) => `/compare/${c.slug}`);

const EN_ROUTES = [...BASE_ROUTES, ...ANSWER_ROUTES, ...COMPARE_ROUTES];
// every page exists in both locales; /zh/* serves Traditional Chinese
const ROUTES = [...EN_ROUTES, ...EN_ROUTES.map((r) => (r === '/' ? '/zh' : `/zh${r}`))];

// sitemap.xml with hreflang alternates — single source of truth is ROUTES
function writeSitemap() {
  const site = 'https://www.dimpack3d.com';
  const today = new Date().toISOString().slice(0, 10);
  const urls = EN_ROUTES.map((r) => {
    const clean = r === '/' ? '' : r;
    const en = `${site}${clean || '/'}`;
    const zh = `${site}/zh${clean}`;
    const alt = (u, l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${u}"/>`;
    const block = (loc) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
${alt(en, 'en')}
${alt(zh, 'zh-Hant')}
${alt(en, 'x-default')}
  </url>`;
    return block(en) + '\n' + block(zh);
  }).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
  writeFileSync(join('dist', 'sitemap.xml'), xml);
  console.log(`[prerender] sitemap.xml written (${EN_ROUTES.length * 2} URLs)`);
}

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

// a zombie preview from an earlier run would serve a STALE dist to our
// snapshots — clear the port before starting
try { execFileSync('bash', ['-c', `lsof -ti :${PORT} | xargs kill -9`], { stdio: 'ignore' }); } catch { /* none */ }

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
  detached: true, // own process group so we can kill vite itself, not just npx
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

  // hang-proof renderer: own profile dir (no lock contention with the user's
  // running Chrome), process-group SIGKILL on a hard 45s timer (execFileSync's
  // timeout can block forever on a pipe held open by an orphaned Chrome helper)
  const profile = mkdtempSync(join(tmpdir(), 'prerender-profile-'));
  const renderRoute = (url) => new Promise((resolve) => {
    const child = spawn(chrome, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--disable-extensions',
      `--user-data-dir=${profile}`,
      '--virtual-time-budget=15000',
      '--dump-dom',
      url,
    ], { detached: true, stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    const timer = setTimeout(() => {
      try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ }
    }, 45_000);
    child.stdout.on('data', (d) => { out += d; });
    child.on('close', () => { clearTimeout(timer); resolve(out); });
    child.on('error', () => { clearTimeout(timer); resolve(''); });
  });

  let ok = 0;
  for (const route of ROUTES) {
    const url = `http://localhost:${PORT}${route}`;
    const html = await renderRoute(url);
    if (!html) {
      console.warn(`[prerender] FAILED ${route}: no output (timeout or crash)`);
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
  writeSitemap();
  console.log(`[prerender] done: ${ok}/${ROUTES.length} routes snapshotted`);
  if (ok === 0) process.exit(1);
} finally {
  try { process.kill(-preview.pid, 'SIGTERM'); } catch { preview.kill('SIGTERM'); }
}
