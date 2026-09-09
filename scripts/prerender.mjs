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

import { ROUTES, writeSitemap, fixMeta, validateSnapshot, validateRelease } from './release-routes.mjs';

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

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
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

  // hang-proof renderer: own profile dir (no lock contention with the user's
  // running Chrome), process-group SIGKILL on a hard 45s timer (execFileSync's
  // timeout can block forever on a pipe held open by an orphaned Chrome helper)
  // high machine load starves parallel Chromes into timeouts — tunable
  const CONCURRENCY = Math.max(1, Number(process.env.PRERENDER_WORKERS) || 4);
  const profiles = Array.from({ length: CONCURRENCY }, () => mkdtempSync(join(tmpdir(), 'prerender-profile-')));
  const renderRoute = (url, profile) => new Promise((resolve) => {
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
    const cleaned = fixMeta(html, route);
    validateSnapshot(cleaned, route);
    writeFileSync(outPath, '<!DOCTYPE html>\n' + cleaned);
    ok++;
    console.log(`[prerender] ${route} → ${outPath} (${(html.length / 1024).toFixed(0)} KB)`);
  };

  // worker pool: CONCURRENCY Chrome instances, each with its own profile dir
  const queue = [...ROUTES];
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
  try { process.kill(-preview.pid, 'SIGTERM'); } catch { preview.kill('SIGTERM'); }
}
