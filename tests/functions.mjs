#!/usr/bin/env node
import assert from 'node:assert/strict';

const { onRequestPost } = await import('../functions/api/hit.ts');

function context(body, { origin = '', country = 'HK' } = {}) {
  const points = [];
  const request = new Request('https://dimpack3d.com/api/hit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(origin ? { Origin: origin } : {}),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  Object.defineProperty(request, 'cf', { value: { country } });
  return {
    ctx: {
      request,
      env: {
        ANALYTICS: { writeDataPoint: (point) => points.push(point) },
      },
    },
    points,
  };
}

{
  const run = context({
    events: [
      { e: 'pageview', p: '/planner', r: 'example.com', m: '' },
      { e: 'export_pdf', p: '/planner', m: 'a4' },
    ],
  });
  const response = await onRequestPost(run.ctx);
  assert.equal(response.status, 204);
  assert.deepEqual(run.points, [
    { indexes: ['pageview'], blobs: ['/planner', 'example.com', '', 'HK'], doubles: [1] },
    { indexes: ['export_pdf'], blobs: ['/planner', '', 'a4', 'HK'], doubles: [1] },
  ]);
}

{
  const run = context({ e: 'pageview', p: '/zh/planner' });
  const response = await onRequestPost(run.ctx);
  assert.equal(response.status, 204);
  assert.equal(run.points.length, 1);
}

{
  const run = context({ events: Array.from({ length: 25 }, () => ({ e: 'pageview' })) });
  const response = await onRequestPost(run.ctx);
  assert.equal(response.status, 204);
  assert.equal(run.points.length, 20);
}

{
  const run = context({ e: 'pageview' }, { origin: 'https://attacker.test' });
  const response = await onRequestPost(run.ctx);
  assert.equal(response.status, 403);
  assert.equal(run.points.length, 0);
}

{
  const run = context({ e: 'Not Valid!' });
  const response = await onRequestPost(run.ctx);
  assert.equal(response.status, 400);
  assert.equal(run.points.length, 0);
}

console.log('PASS  analytics Pages Function migration');

const { onRequestGet: readStats } = await import('../functions/api/stats.ts');
const lead = { email: 'person@example.test', source: 'planner-export', at: new Date().toISOString() };
const kv = { list: async ({ prefix }) => ({ keys: prefix === '20' ? [{ name: lead.at + '_12345678' }] : [], list_complete: true }), get: async () => JSON.stringify(lead) };
for (const [headers, query, status] of [[{}, '', 403], [{ Authorization: 'Bearer wrong' }, '', 403], [{ Authorization: 'Bearer test-key' }, '', 200], [{}, '?k=test-key', 200]]) {
  const response = await readStats({ request: new Request('https://www.dimpack3d.com/api/stats' + query, { headers }), env: { LEADS: kv, STATS_KEY: 'test-key' } });
  assert.equal(response.status, status);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  if (status === 200) assert.equal((await response.json()).leads[0].email, lead.email);
}
const truncatedKV = { ...kv, list: async ({ prefix }) => ({ keys: [], list_complete: prefix !== '20', cursor: prefix === '20' ? 'more' : undefined }) };
const truncatedResponse = await readStats({ request: new Request('https://www.dimpack3d.com/api/stats', { headers: { Authorization: 'Bearer test-key' } }), env: { LEADS: truncatedKV, STATS_KEY: 'test-key' } });
assert.equal((await truncatedResponse.json()).truncated, true, 'lead pagination limit must not silently omit leads');
console.log('PASS stats: header authorization, legacy compatibility, no-store and lead truncation');
