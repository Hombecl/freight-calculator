#!/usr/bin/env node
/**
 * indexnow.mjs — push every URL in dist/sitemap.xml to IndexNow.
 * Bing's index powers ChatGPT search and Copilot, so this directly feeds AI
 * search engines. Run after each deploy: node scripts/indexnow.mjs
 * Key: repo public/<key>.txt (served at the site root, as the protocol requires)
 * and mirrored at ~/.dimpack3d-indexnow-key.
 */

import { readFileSync, readdirSync } from 'node:fs';

const HOST = 'www.dimpack3d.com';
const keyFile = readdirSync('public').find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) { console.error('no indexnow key file in public/'); process.exit(1); }
const key = keyFile.replace('.txt', '');

const sitemap = readFileSync('dist/sitemap.xml', 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!urls.length) { console.error('no URLs in dist/sitemap.xml — build first'); process.exit(1); }

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: HOST,
    key,
    keyLocation: `https://${HOST}/${keyFile}`,
    urlList: urls,
  }),
});
console.log(`IndexNow: submitted ${urls.length} URLs → HTTP ${res.status} ${res.statusText}`);
if (!res.ok) console.log(await res.text());
