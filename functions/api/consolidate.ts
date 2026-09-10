import { CHECK_SEMANTICS } from '../../src/lib/packChecks';
import { consolidate, CONSOLIDATION_EXAMPLE, CONSOLIDATION_LIMITS } from '../../src/lib/consolidation';
import { PalletInputError } from '../../src/lib/palletEstimate';
import { rateLimitKeyed, tooManyRequests, type RateLimitEnv } from './_rateLimit';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
};
const DOCS = 'https://www.dimpack3d.com/api-docs#consolidate';
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers: CORS });

export const onRequestGet: PagesFunction = async () =>
  json({
    endpoint: 'POST /api/consolidate',
    purpose: 'Multi-PO container consolidation: best options found with FCL placements and LCL remainder economics.',
    request: CONSOLIDATION_EXAMPLE,
    limits: CONSOLIDATION_LIMITS,
    response: 'eligible, cargo, plans[]{containers[]{preset,pos,cartons,boxes,zones,checks},remainder,lcl,cost,checks,candidateHash}, outcome found|none_fit_budget, searched, inputHash, engineVersion, tier, warning?',
    semantics: CHECK_SEMANTICS,
    auth: 'Optional X-API-Key (https://www.dimpack3d.com/api-pricing). Anonymous: 5/min, 50/day per IP.',
    interactive: 'https://www.dimpack3d.com/consolidation',
    docs: DOCS,
  });

export const onRequestPost: PagesFunction<RateLimitEnv> = async (ctx) => {
  const limit = await rateLimitKeyed(ctx.env, ctx.request, [
    { name: 'consolidate', limit: 5, windowSec: 60 },
    { name: 'consolidate', limit: 50, windowSec: 86_400 },
  ]);
  if (!limit.ok) return tooManyRequests(limit, CORS, DOCS);
  if (!ctx.request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))
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
      if (size > CONSOLIDATION_LIMITS.bodyBytes) {
        await reader.cancel();
        return json({ error: `Request exceeds ${CONSOLIDATION_LIMITS.bodyBytes} bytes` }, 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let off = 0;
    for (const c of chunks) { bytes.set(c, off); off += c.length; }
    const body = JSON.parse(new TextDecoder().decode(bytes));
    const result = await consolidate(body);
    return json({ ...result, tier: limit.tier, ...(limit.invalidKey ? { warning: 'API key not recognised; anonymous limits applied' } : {}) });
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: 'Body must be valid JSON' }, 400);
    if (error instanceof PalletInputError) return json({ error: error.message, field: error.field, docs: DOCS }, 400);
    return json({ error: 'Consolidation failed. Please retry with fewer cartons.' }, 500);
  }
};
