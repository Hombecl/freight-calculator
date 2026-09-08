import { test } from 'node:test';
import assert from 'node:assert/strict';
import { snapshotProblem, assertCompleteSnapshots } from '../scripts/prerender-validation.mjs';
const html = route => `<html><head><link rel="canonical" href="https://www.dimpack3d.com${route}"></head><body><h1>Tool</h1><p>${'x'.repeat(5000)}</p></body></html>`;
test('route-specific canonical passes in both languages', () => {
  assert.equal(snapshotProblem(html('/carton-space-calculator'), '/carton-space-calculator'), null);
  assert.equal(snapshotProblem(html('/zh/carton-space-calculator'), '/zh/carton-space-calculator'), null);
});
test('homepage fallback, missing headings and incomplete output fail', () => {
  assert.ok(snapshotProblem(html('/'), '/carton-space-calculator'));
  assert.ok(snapshotProblem(html('/').replace('<h1>Tool</h1>', ''), '/'));
  assert.ok(snapshotProblem('<html></html>', '/'));
});
test('one failed route blocks sitemap publication', () => {
  assert.throws(() => assertCompleteSnapshots(200, 199, ['/missing']));
  assert.throws(() => assertCompleteSnapshots(200, 199, []));
  assert.doesNotThrow(() => assertCompleteSnapshots(200, 200, []));
});
