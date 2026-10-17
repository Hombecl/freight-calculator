import assert from 'node:assert/strict';
import { selectLeads, leadCSV, leadSummary, cloudflareLeads } from '../scripts/export-leads.mjs';
const now = Date.parse('2026-10-17T00:00:00Z');
const recent = { at: '2026-10-16T10:00:00Z', email: 'person@example.test', source: 'api-key', company: '=HYPERLINK("url")', useCase: 'pallet, height\nquote', proWaitlist: false, key: 'secret-key' };
const rows = selectLeads({ leads: [recent, { ...recent, email: 'PERSON@example.test', proWaitlist: true }, { ...recent, at: '2026-01-01' }, { ...recent, at: 'invalid' }, { ...recent, at: '2027-01-01' }] }, 28, now);
assert.equal(rows.length, 2);
assert.equal('key' in rows[0], false);
assert.deepEqual(leadSummary(rows), { records: 2, uniqueEmails: 1, productUpdateOptIns: 1, sources: { 'api-key': 2 } });
assert.ok(leadCSV(rows).includes("'=HYPERLINK"));
assert.ok(leadCSV(rows).includes('"pallet, height\nquote"'));
assert.ok(!leadCSV(rows).includes('secret-key'));
assert.throws(() => selectLeads({ leads: [], truncated: true }, 28, now), /Incomplete/);
assert.deepEqual(leadSummary([{ ...recent, source: '__proto__' }]).sources, { ['__proto__']: 1 });
let requests = [];
const cf = await cloudflareLeads('test-token', 'a'.repeat(32), 28, now, async (url, opts) => {
  requests.push(url);
  assert.equal(opts.redirect, 'error');
  assert.equal(opts.headers.Authorization, 'Bearer test-token');
  if (url.includes('/values/')) return Response.json(recent);
  const next = url.endsWith('cursor=next');
  return Response.json({ success: true, result: next ? [{ name: '2026-10-16T10:00:00Z_abc123' }] : [
    { name: 'apikey|secret' }, { name: '2026-01-01T00:00:00Z_abc123' }, { name: '2027-01-01T00:00:00Z_abc123' }
  ], result_info: { cursor: next ? '' : 'next' } });
});
assert.equal(cf.leads.length, 1);
assert.equal(requests.filter(url => url.includes('/values/')).length, 1);
assert.ok(requests.every(url => !url.includes('secret')));
await assert.rejects(() => cloudflareLeads('x', 'a'.repeat(32), 28, now, async () => Response.json({ success: true, result: [], result_info: { cursor: 'same' } })), /Repeated/);
console.log('PASS lead export: date bounds, dedup summary, consent flag, field allowlist, CSV escaping and truncation');
