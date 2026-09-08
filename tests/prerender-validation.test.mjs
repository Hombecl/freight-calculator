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
test('indexable routes reject robots and Googlebot noindex directives', () => {
  for (const meta of [
    '<meta name="robots" content="noindex, follow">',
    "<meta content='NOINDEX' name='Googlebot'>",
    '<meta name="robots" content="none">',
  ]) {
    assert.equal(snapshotProblem(html('/').replace('</head>', `${meta}</head>`), '/'), 'indexable route has noindex');
  }
  assert.equal(snapshotProblem(html('/').replace('</head>', '<meta name="robots" content="index, follow"></head>'), '/'), null);
});
test('embed snapshots must retain their deliberate noindex directive', () => {
  assert.ok(snapshotProblem(html('/embed'), '/embed', false));
  assert.equal(snapshotProblem(html('/embed').replace('</head>', '<meta name="robots" content="noindex"></head>'), '/embed', false), null);
});
test('empty or markup-only headings do not count as rendered content', () => {
  for (const content of ['', '   ', '<span> &nbsp; </span>']) {
    assert.ok(snapshotProblem(html('/').replace('<h1>Tool</h1>', `<h1>${content}</h1>`), '/'));
  }
});
