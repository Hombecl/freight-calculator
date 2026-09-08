/** Pure checks: no browser, server, network or filesystem side effects. */
export function snapshotProblem(html, route, indexable = true) {
  if (!html.includes('</body>') || html.length < 5000) return 'incomplete HTML';
  if (!indexable) return null;
  const canonicalTags = html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi) ?? [];
  const expected = `https://www.dimpack3d.com${route === '/' ? '/' : route}`;
  const href = canonicalTags[0]?.match(/\bhref=["']([^"']+)["']/i)?.[1];
  if (canonicalTags.length !== 1 || href?.replace(/\/$/, '') !== expected.replace(/\/$/, '')) return 'missing, duplicate or wrong route canonical';
  if (!/<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(html)) return 'missing rendered heading';
  return null;
}

export function assertCompleteSnapshots(expected, completed, failed) {
  if (failed.length || completed !== expected || expected < 1) {
    throw new Error(`Release blocked: ${completed}/${expected} snapshots; failed routes: ${failed.join(', ')}`);
  }
}
