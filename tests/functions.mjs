#!/usr/bin/env node
import assert from 'node:assert/strict';

const { onRequestPost } = await import('../functions/api/hit.ts');

function context(body, { allowed = true, ip = '203.0.113.8', country = 'HK' } = {}) {
  const points = [];
  const limiterKeys = [];
  const request = new Request('https://dimpack3d.com/api/hit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(ip ? { 'CF-Connecting-IP': ip } : {}),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  Object.defineProperty(request, 'cf', { value: { country } });
  return {
    ctx: {
      request,
      env: {
        ANALYTICS: { writeDataPoint: (point) => points.push(point) },
        HIT_RATE_LIMITER: {
          limit: async ({ key }) => {
            limiterKeys.push(key);
            return { success: allowed };
          },
        },
      },
    },
    points,
    limiterKeys,
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
  assert.deepEqual(run.limiterKeys, ['203.0.113.8']);
  assert.deepEqual(run.points, [
    { indexes: ['pageview'], blobs: ['/planner', 'example.com', '', 'HK'], doubles: [1] },
    { indexes: ['export_pdf'], blobs: ['/planner', '', 'a4', 'HK'], doubles: [1] },
  ]);
}

{
  const run = context({ e: 'pageview', p: '/zh/planner' }, { ip: '' });
  const response = await onRequestPost(run.ctx);
  assert.equal(response.status, 204);
  assert.equal(run.limiterKeys.length, 0);
  assert.equal(run.points.length, 1);
}

{
  const run = context({ events: Array.from({ length: 25 }, () => ({ e: 'pageview' })) });
  const response = await onRequestPost(run.ctx);
  assert.equal(response.status, 204);
  assert.equal(run.points.length, 20);
}

{
  const run = context({ e: 'pageview' }, { allowed: false });
  const response = await onRequestPost(run.ctx);
  assert.equal(response.status, 429);
  assert.equal(run.points.length, 0);
}

{
  const run = context({ e: 'Not Valid!' });
  const response = await onRequestPost(run.ctx);
  assert.equal(response.status, 400);
  assert.equal(run.points.length, 0);
}

console.log('PASS  analytics Pages Function migration');
