#!/usr/bin/env node
/**
 * api-key.mjs — /api/key issuance + key-aware rate limiting.
 *
 * Exercises the Pages Functions directly with an in-memory KV so the contract
 * a developer reads on /api-pricing (free key = 5× limits, own bucket) is the
 * one the server enforces.
 */
import assert from 'node:assert/strict';

const keyMod = await import('../functions/api/key.ts');
const rl = await import('../functions/api/_rateLimit.ts');
const pack = await import('../functions/api/pack.ts');
const { API_KEY_RE, planFor } = await import('../src/lib/apiTiers.ts');

function memKV() {
  const store = new Map();
  return {
    store,
    async get(k) { return store.has(k) ? store.get(k) : null; },
    async put(k, v) { store.set(k, String(v)); },
  };
}

const req = (url, { body, headers = {}, ip = '203.0.113.7', method = 'POST' } = {}) => {
  const r = new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  Object.defineProperty(r, 'cf', { value: { country: 'US' } });
  return r;
};

// ---- issuance ----
{
  const LEADS = memKV();
  const res = await keyMod.onRequestPost({ env: { LEADS }, request: req('https://x/api/key', { body: { email: 'tom@example.com', company: 'Acme', useCase: 'pallet height' } }) });
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.match(j.key, API_KEY_RE, 'key format');
  assert.equal(j.tier, 'free');
  assert.equal(j.limits.pack.perMin, 60 * planFor('free').multiplier);
  assert.equal(j.limits['order-plan'].perDay, 100 * planFor('free').multiplier);
  // stored record + lead row
  const rec = JSON.parse(LEADS.store.get(`apikey|${j.key}`));
  assert.equal(rec.email, 'tom@example.com');
  assert.equal(rec.tier, 'free');
  const leadRows = [...LEADS.store.entries()].filter(([k]) => !k.startsWith('apikey|') && !k.startsWith('rl|'));
  assert.equal(leadRows.length, 1);
  assert.equal(JSON.parse(leadRows[0][1]).source, 'api-key');
}

// bad email → 400; bad json → 400
{
  const LEADS = memKV();
  assert.equal((await keyMod.onRequestPost({ env: { LEADS }, request: req('https://x/api/key', { body: { email: 'nope' } }) })).status, 400);
  const r = new Request('https://x/api/key', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.1.1.1' }, body: '{' });
  assert.equal((await keyMod.onRequestPost({ env: { LEADS }, request: r })).status, 400);
}

// 5 keys per IP per day, then 429
{
  const LEADS = memKV();
  for (let i = 0; i < 5; i++) {
    const r = await keyMod.onRequestPost({ env: { LEADS }, request: req('https://x/api/key', { body: { email: `u${i}@example.com` } }) });
    assert.equal(r.status, 200, `key ${i}`);
  }
  const blocked = await keyMod.onRequestPost({ env: { LEADS }, request: req('https://x/api/key', { body: { email: 'u9@example.com' } }) });
  assert.equal(blocked.status, 429);
  assert.ok(blocked.headers.get('Retry-After'));
}

// ---- header extraction ----
{
  const good = 'dp_live_' + 'a'.repeat(32);
  assert.equal(rl.extractApiKey(req('https://x', { headers: { 'X-API-Key': good } })), good);
  assert.equal(rl.extractApiKey(req('https://x', { headers: { Authorization: `Bearer ${good}` } })), good);
  assert.equal(rl.extractApiKey(req('https://x', { headers: { 'X-API-Key': 'dp_live_short' } })), null);
  assert.equal(rl.extractApiKey(req('https://x')), null);
}

// ---- keyed rate limiting: own bucket, 5× limits, unknown key degrades to anonymous ----
{
  const LEADS = memKV();
  const issued = await (await keyMod.onRequestPost({ env: { LEADS }, request: req('https://x/api/key', { body: { email: 'k@example.com' } }) })).json();
  const rules = [{ name: 't', limit: 2, windowSec: 60 }];
  const now = 1_700_000_000;

  // anonymous: 2 allowed, 3rd blocked
  for (let i = 0; i < 2; i++) assert.equal((await rl.rateLimitKeyed({ LEADS }, req('https://x'), rules, now)).ok, true);
  const anonBlocked = await rl.rateLimitKeyed({ LEADS }, req('https://x'), rules, now);
  assert.equal(anonBlocked.ok, false);
  assert.equal(anonBlocked.tier, 'anonymous');

  // same IP with a key: separate bucket, 2×5 = 10 allowed
  const h = { 'X-API-Key': issued.key };
  for (let i = 0; i < 10; i++) {
    const r = await rl.rateLimitKeyed({ LEADS }, req('https://x', { headers: h }), rules, now);
    assert.equal(r.ok, true, `keyed call ${i}`);
    assert.equal(r.tier, 'free');
  }
  const keyedBlocked = await rl.rateLimitKeyed({ LEADS }, req('https://x', { headers: h }), rules, now);
  assert.equal(keyedBlocked.ok, false);
  assert.equal(keyedBlocked.tripped.limit, 10);

  // unknown (well-formed) key → anonymous bucket, flagged
  const unknown = await rl.rateLimitKeyed({ LEADS }, req('https://x', { headers: { 'X-API-Key': 'dp_live_' + 'f'.repeat(32) } }), rules, now);
  assert.equal(unknown.ok, false, 'shares the already-exhausted anonymous IP bucket');
  assert.equal(unknown.invalidKey, true);

  // revoked key → anonymous
  const rec = JSON.parse(LEADS.store.get(`apikey|${issued.key}`));
  LEADS.store.set(`apikey|${issued.key}`, JSON.stringify({ ...rec, revokedAt: 'now' }));
  const revoked = await rl.rateLimitKeyed({ LEADS }, req('https://x', { headers: h }), rules, now);
  assert.equal(revoked.tier, 'anonymous');
  assert.equal(revoked.invalidKey, true);
}

// ---- /api/pack honours the key end to end ----
{
  const LEADS = memKV();
  const issued = await (await keyMod.onRequestPost({ env: { LEADS }, request: req('https://x/api/key', { body: { email: 'p@example.com' } }) })).json();
  const body = { container: { l: 589, w: 235, h: 239 }, items: [{ l: 60, w: 40, h: 40, qty: 5 }] };
  const ok = await pack.onRequestPost({ env: { LEADS }, request: req('https://x/api/pack', { body, headers: { 'X-API-Key': issued.key } }) });
  assert.equal(ok.status, 200);
  const j = await ok.json();
  assert.equal(j.boxes.length, 5);
  // the pack counter was written under the key bucket, not the IP bucket
  const buckets = [...LEADS.store.keys()].filter((k) => k.startsWith('rl|pack|'));
  assert.ok(buckets.length >= 1);
  assert.ok(buckets.every((k) => k.includes(`|key:${issued.key}|`)), buckets.join(','));
  // CORS preflight advertises the header
  const opt = await pack.onRequestOptions({});
  assert.match(opt.headers.get('Access-Control-Allow-Headers'), /X-API-Key/);
}

console.log('api-key.mjs: all assertions passed');
