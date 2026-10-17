import assert from 'node:assert/strict';
import { notifyLead } from '../functions/api/_leadNotification.ts';
import { onRequestPost as submitLead } from '../functions/api/lead.ts';
import { onRequestPost as issueKey } from '../functions/api/key.ts';

const lead = { email: 'Customer@example.test', source: 'api-key', company: 'Acme', useCase: 'Order-time pallet count', proWaitlist: false, country: 'HK', at: new Date().toISOString() };
const makeEnv = () => {
  const rows = new Map();
  return { LEADS: { rows, async get(k) { return rows.get(k) ?? null; }, async put(k, v) { rows.set(k, v); } },
    RESEND_API_KEY: 'provider-test-key', LEAD_NOTIFY_TO: 'owner@example.test', LEAD_NOTIFY_FROM: 'DimPack3D <notify@example.test>' };
};
const status = (env, key) => JSON.parse(env.LEADS.rows.get(`notify|${key}`));
const originalFetch = globalThis.fetch;
let calls = [];
try {
  globalThis.fetch = async (url, init) => { calls.push({ url, ...init }); return Response.json({ id: 'provider-id' }); };
  const disabled = makeEnv();
  delete disabled.RESEND_API_KEY;
  await notifyLead(disabled, lead, 'disabled');
  assert.equal(calls.length, 0);

  const env = makeEnv();
  await notifyLead(env, lead, 'first');
  assert.equal(status(env, 'first').status, 'accepted');
  assert.equal(status(env, 'first').providerId, 'provider-id');
  const message = JSON.parse(calls[0].body);
  assert.deepEqual(message.to, ['owner@example.test']);
  assert.match(message.text, /Product-update opt-in: No/);
  assert.match(message.text, /Order-time pallet count/);
  assert.equal(calls[0].headers['Idempotency-Key'], 'dimpack-lead/first');
  await notifyLead(env, { ...lead, email: 'customer@example.test' }, 'repeat');
  assert.equal(calls.length, 1);
  assert.equal(status(env, 'repeat').status, 'duplicate');

  for (const response of [new Response('error', { status: 500 }), Response.json({}), new Response('not-json')]) {
    const failed = makeEnv();
    globalThis.fetch = async () => response;
    await notifyLead(failed, lead, 'failed');
    assert.equal(status(failed, 'failed').status, 'failed');
  }
  const offline = makeEnv();
  globalThis.fetch = async () => { throw Error('offline'); };
  await notifyLead(offline, lead, 'offline');
  assert.equal(status(offline, 'offline').status, 'failed');

  const capped = makeEnv();
  let sent = 0;
  globalThis.fetch = async () => { sent++; return Response.json({ id: 'id' }); };
  for (let i = 0; i < 51; i++) await notifyLead(capped, { ...lead, email: `user${i}@example.test` }, `cap-${i}`);
  assert.equal(sent, 50);
  assert.equal(status(capped, 'cap-50').status, 'daily_limit');

  // The HTTP acknowledgement is independent of a stalled mail provider.
  const capture = makeEnv(), pending = [];
  let finishMail;
  const deferred = new Promise(resolve => { finishMail = resolve; });
  globalThis.fetch = () => deferred;
  const response = await submitLead({ env: capture, request: new Request('https://example.test/api/lead', {
    method: 'POST', body: JSON.stringify({ ...lead, proWaitlist: 'false', purpose: 'freight-quote' }) }), waitUntil(p) { pending.push(p); } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal([...capture.LEADS.rows.keys()].filter(k => /^\d{4}-/.test(k)).length, 1);
  assert.equal(JSON.parse([...capture.LEADS.rows.entries()].find(([k]) => /^\d{4}-/.test(k))[1]).proWaitlist, false);
  assert.equal(JSON.parse([...capture.LEADS.rows.entries()].find(([k]) => /^\d{4}-/.test(k))[1]).purpose, 'freight-quote');
  assert.equal(pending.length, 1);
  finishMail(new Response('offline', { status: 503 }));
  await Promise.all(pending);
  assert.equal([...capture.LEADS.rows.keys()].filter(k => /^\d{4}-/.test(k)).length, 1);

  const keyEnv = makeEnv(), queued = [];
  let keyMessage;
  globalThis.fetch = async (_, init) => { keyMessage = init.body; return Response.json({ id: 'key-mail' }); };
  const issued = await (await issueKey({ env: keyEnv, request: new Request('https://example.test/api/key', {
    method: 'POST', body: JSON.stringify(lead) }), waitUntil(p) { queued.push(p); } })).json();
  await Promise.all(queued);
  assert.ok(issued.key.startsWith('dp_live_'));
  assert.ok(!keyMessage.includes(issued.key));
  assert.ok(!keyMessage.includes('dp_live_'));

  const limited = makeEnv();
  delete limited.RESEND_API_KEY;
  for (let i = 0; i < 51; i++) {
    const result = await submitLead({ env: limited, request: new Request('https://example.test/api/lead', {
      method: 'POST', headers: { 'CF-Connecting-IP': '203.0.113.9' }, body: JSON.stringify(lead) }) });
    assert.equal(result.status, i < 50 ? 200 : 429);
    if (i === 50) assert.ok(result.headers.get('Retry-After'));
  }
} finally { globalThis.fetch = originalFetch; }
console.log('PASS lead notifications: fixed recipient, consent, deduplication, volume limit, provider failures, deferred delivery and API-key exclusion');
