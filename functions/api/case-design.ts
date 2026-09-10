import { designCases, CASE_EXAMPLE, CASE_LIMITS } from '../../src/lib/caseDesign';
import { CHECK_SEMANTICS } from '../../src/lib/packChecks';
import { PalletInputError } from '../../src/lib/palletEstimate';
import { rateLimitKeyed, tooManyRequests, extractApiKey, type RateLimitEnv } from './_rateLimit';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
};
const DOCS = 'https://www.dimpack3d.com/api-docs#case-design';
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers: CORS });

export const onRequestGet: PagesFunction = async () =>
  json({
    endpoint: 'POST /api/case-design',
    purpose: 'Best case designs found for product, pallet and container geometry and supplied costs.',
    request: CASE_EXAMPLE,
    limits: CASE_LIMITS,
    response: 'status found|none_within_search, candidates[]{arrangement,caseOuter,caseWeight,pallet,container,costPerUnit,checks,assumptions}, checks, engineVersion, inputHash, notes, searched',
    semantics: CHECK_SEMANTICS,
    auth: 'Optional X-API-Key (https://www.dimpack3d.com/api-pricing). Anonymous: 10/min, 100/day per IP.',
    interactive: 'https://www.dimpack3d.com/case-designer',
    docs: DOCS,
  });

export const onRequestPost: PagesFunction<RateLimitEnv> = async (ctx) => {
  const limit = await rateLimitKeyed(ctx.env, ctx.request, [
    { name: 'case-design', limit: 10, windowSec: 60 },
    { name: 'case-design', limit: 100, windowSec: 86_400 },
  ]);
  if (!limit.ok) return tooManyRequests(limit, CORS, DOCS);
  if (!ctx.request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase().match(/^application\/json$/))
    return json({ error: 'Content-Type must be application/json' }, 415);
  const reader = ctx.request.body?.getReader();
  if (!reader) return json({ error: 'JSON body required' }, 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > CASE_LIMITS.bodyBytes) {
        await reader.cancel();
        return json({ error: `Request exceeds ${CASE_LIMITS.bodyBytes} bytes` }, 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let off = 0;
    for (const c of chunks) { bytes.set(c, off); off += c.length; }
    const body = JSON.parse(new TextDecoder().decode(bytes));
    const result = await designCases(body);
    return json({ ...result, tier: limit.tier, ...((limit.invalidKey || (!extractApiKey(ctx.request) && (ctx.request.headers.has('X-API-Key') || ctx.request.headers.has('Authorization')))) ? { warning: 'API key not recognised; anonymous limits applied' } : {}) });
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: 'Body must be valid JSON' }, 400);
    if (error instanceof PalletInputError) return json({ error: error.message, field: error.field, docs: DOCS }, 400);
    return json({ error: 'Case design failed. Please retry with a smaller range.' }, 500);
  }
};
