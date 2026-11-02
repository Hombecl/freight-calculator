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
import { chromium } from 'playwright';

import { ROUTES, writeSitemap, fixMeta, validateSnapshot, validateRelease } from './release-routes.mjs';

const stripInjected = (html) => html.replace(/<script[^>]*data-three-cdn[^>]*>\s*<\/script>/g, '');

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
];
const chrome = CHROME_PATHS.find((p) => existsSync(p));
if (!chrome) {
  throw new Error('Chrome not found: refusing an incomplete SEO release.');
}

const PORT = 4173;

// a zombie preview from an earlier run would serve a STALE dist to our
// snapshots — clear the port before starting
// strictPort fails if occupied; never kill an unrelated process.

// --host 127.0.0.1: vite's default host "localhost" can bind IPv6-only (::1)
// on recent Node/macOS, while the readiness probe and Chrome use 127.0.0.1 —
// the preview then looks "not up" forever and the build times out (2026-09-10).
const preview = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
  detached: true, // own process group so we can kill vite itself, not just npx
});

let previewExited = null;
preview.on('exit', (code, signal) => { previewExited = signal || code; });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const previewIsReady = () => {
  try {
    execFileSync('curl', ['-fsS', '--max-time', '2', `http://127.0.0.1:${PORT}/`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

let snapshotBrowser;
try {
  // Wait for the preview server. The window used to be 15s (30 x 500ms), which
  // is fine on an idle machine but not on a loaded one: at load ~30 `npx vite
  // preview` can take longer than that just to spawn, and the whole 20-minute
  // prerender then died at second 15 (seen twice, 2026-08-23). 90s with an
  // early exit if the child dies — a slow start is not the same as a crash.
  const READY_TIMEOUT_MS = 90_000, POLL_MS = 500;
  let up = false;
  for (let i = 0; i < READY_TIMEOUT_MS / POLL_MS && !up; i++) {
    if (previewExited !== null) {
      throw new Error(`vite preview exited (${previewExited}) before serving — port ${PORT} taken, or the build output is unusable`);
    }
    await wait(POLL_MS);
    up = await previewIsReady();
    if (!up && i > 0 && i % 20 === 0) console.log(`[prerender] waiting for preview on :${PORT} (${(i * POLL_MS) / 1000}s)`);
  }
  if (!up) throw new Error(`vite preview did not start within ${READY_TIMEOUT_MS / 1000}s (machine load? check \`sysctl -n vm.loadavg\`)`);

  // Build-time browser rendering uses the same installed Chrome as before.
  // Virtual-time dump-dom could finish before React's lazy route and Helmet
  // resolved, producing wrong canonical/description tags. Wait for route-owned
  // metadata explicitly; release validation still rejects incomplete snapshots.
  const CONCURRENCY = Math.max(1, Number(process.env.PRERENDER_WORKERS) || 2);
  const profiles = Array.from({length: CONCURRENCY}, (_, index) => index);
  snapshotBrowser = await chromium.launch({executablePath: chrome, headless: true});
  const renderRoute = async (url) => {
    const context = await snapshotBrowser.newContext();
    const page = await context.newPage();
    try {
      await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 30000});
      await page.waitForFunction(expected => {
        const canonical = document.querySelector('link[rel="canonical"][data-rh="true"]');
        const description = document.querySelector('meta[name="description"][data-rh="true"]');
        if(expected.endsWith('/embed')) return description?.getAttribute('content') && document.body.innerText.length > 200;
        const normalize = value => value.replace(/\/$/, '') || '/';
        return canonical && description?.getAttribute('content') &&
          normalize(new URL(canonical.href).pathname) === normalize(expected) &&
          document.body.innerText.length > 200;
      }, new URL(url).pathname, {timeout: 20000});
      return await page.content();
    } catch (error) {
      console.warn(`[prerender] renderer ${new URL(url).pathname}: ${error.message.split('\n')[0]}`);
      return '';
    } finally { await context.close(); }
  };

  let ok = 0;
  const failed = [];
  const snapshotOne = async (route, profile) => {
    const html = await renderRoute(`http://127.0.0.1:${PORT}${route}`, profile);
    if (!html) {
      console.warn(`[prerender] FAILED ${route}: no output (timeout or crash)`);
      failed.push(route);
      return;
    }
    if (!html.includes('</body>') || html.length < 5_000) {
      console.warn(`[prerender] ${route} rendered too little — kept as SPA shell`);
      failed.push(route);
      return;
    }
    const outPath = route === '/'
      ? join('dist', 'index.html')
      : join('dist', `${route.replace(/^\//, '')}.html`);
    mkdirSync(dirname(outPath), { recursive: true });
    // ⛔ Runtime-injected <script> tags must never be baked into a snapshot.
    // three.js is appended to <head> by useThree() when a 3D component mounts;
    // a snapshot that contains it ships a 603 KB script to pages that never use
    // it. Stripping is safe because any page that needs three.js re-injects it
    // on mount.
    let cleaned;
    try {
      cleaned = stripInjected(fixMeta(html, route));
      validateSnapshot(cleaned, route);
    } catch (error) {
      console.warn(`[prerender] FAILED ${route}: ${error.message}`);
      failed.push(route);
      return;
    }
    writeFileSync(outPath, '<!DOCTYPE html>\n' + cleaned);
    ok++;
    console.log(`[prerender] ${route} → ${outPath} (${(html.length / 1024).toFixed(0)} KB)`);
  };

  // worker pool: CONCURRENCY Chrome instances, each with its own profile dir
  // '/' goes LAST: until its snapshot is written, dist/index.html is the clean
  // build template and therefore a clean SPA fallback. Rendering it first let
  // its runtime-injected tags leak into every subsequent route's snapshot.
  const requestedRoutes=process.env.PRERENDER_ROUTES?.split(',')??ROUTES;
  if(requestedRoutes.some(route=>!ROUTES.includes(route)))throw new Error('Unknown prerender route');
  const queue = [...requestedRoutes.filter((r) => r !== '/'), ...(requestedRoutes.includes('/') ? ['/'] : [])];
  await Promise.all(profiles.map(async (profile) => {
    while (queue.length) {
      const route = queue.shift();
      if (route) await snapshotOne(route, profile);
    }
  }));
  // one serial retry round — Chrome snapshot failures are transient flakes,
  // and a single lost route means an SPA shell for AI crawlers on that URL
  if (failed.length) {
    console.warn(`[prerender] retrying ${failed.length} failed route(s) serially...`);
    const second = [...failed];
    failed.length = 0;
    for (const route of second) await snapshotOne(route, profiles[0]);
    if (failed.length) console.error(`[prerender] STILL FAILED after retry: ${failed.join(', ')}`);
  }
  writeSitemap();
  console.log(`[prerender] done: ${ok}/${ROUTES.length} routes snapshotted`);
  if (failed.length) throw new Error(`Incomplete release: ${failed.join(', ')}`);
  validateRelease();
} finally {
  await snapshotBrowser?.close();
  try { process.kill(-preview.pid, 'SIGTERM'); } catch { preview.kill('SIGTERM'); }
}
