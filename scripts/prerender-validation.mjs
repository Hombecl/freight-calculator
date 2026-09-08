/** Pure checks: no browser, server, network or filesystem side effects. */
export function snapshotProblem(html, route, indexable = true) {
  if (!html.includes('</body>') || html.length < 5000) return 'incomplete HTML';
  const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2];
  const robots = (html.match(/<meta\b[^>]*>/gi) ?? [])
    .filter(tag => /^(robots|googlebot)$/i.test(attribute(tag, 'name') ?? ''))
    .flatMap(tag => (attribute(tag, 'content') ?? '').toLowerCase().split(/[\s,]+/));
  const noindex = robots.includes('noindex') || robots.includes('none');
  if (indexable && noindex) return 'indexable route has noindex';
  if (!indexable) return noindex ? null : 'private embed snapshot missing noindex';
  const canonicalTags = html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi) ?? [];
  const expected = `https://www.dimpack3d.com${route === '/' ? '/' : route}`;
  const href = canonicalTags[0]?.match(/\bhref=["']([^"']+)["']/i)?.[1];
  if (canonicalTags.length !== 1 || href?.replace(/\/$/, '') !== expected.replace(/\/$/, '')) return 'missing, duplicate or wrong route canonical';
  const headings = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) ?? [];
  if (!headings.some(heading => heading.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;|&#xA0;/gi, ' ').trim())) return 'missing rendered heading';
  return null;
}

export function assertCompleteSnapshots(expected, completed, failed) {
  if (failed.length || completed !== expected || expected < 1) {
    throw new Error(`Release blocked: ${completed}/${expected} snapshots; failed routes: ${failed.join(', ')}`);
  }
}
