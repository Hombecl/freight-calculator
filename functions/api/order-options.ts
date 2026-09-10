import { QUOTE_EXAMPLE } from '../../src/lib/orderQuote';
import { findOrderOptions, OPTIONS_LIMITS } from '../../src/lib/orderOptions';
import { CHECK_SEMANTICS } from '../../src/lib/packChecks';
import { PalletInputError } from '../../src/lib/palletEstimate';
import { rateLimitKeyed, tooManyRequests, extractApiKey, type RateLimitEnv } from './_rateLimit';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
};
const DOCS = 'https://www.dimpack3d.com/api-docs#order-options';
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers: CORS });

export const onRequestGet: PagesFunction = async () =>
  json({
    endpoint: 'POST /api/order-options',
    purpose: 'Find fewer-pallet repackings or permitted SKU quantity changes within a deterministic search budget.',
    request: QUOTE_EXAMPLE,
    limits: { ...OPTIONS_LIMITS, note: `${OPTIONS_LIMITS.types} carton types, ${OPTIONS_LIMITS.cartons} cartons, ${OPTIONS_LIMITS.pallets} pallets, ${OPTIONS_LIMITS.bodyBytes} B body per order.` },
    response: 'baseline{palletCount,quote}, target, searched{candidates,budget,phase1,phase2}, alternatives[]{id,palletCount,strategy,quantityChanges,quote,candidateHash,economics}, outcome found|none_within_search|already_at_target, checks[], inputHash, engineVersion',
    semantics: CHECK_SEMANTICS,
    auth: 'Optional X-API-Key (https://www.dimpack3d.com/api-pricing). Anonymous: 5/min, 50/day per IP.',
    interactive: 'https://www.dimpack3d.com/order-quote',
    docs: DOCS,
  });

export const onRequestPost: PagesFunction<RateLimitEnv> = async (ctx) => {
  const limit = await rateLimitKeyed(ctx.env, ctx.request, [
    { name: 'order-options', limit: 5, windowSec: 60 },
    { name: 'order-options', limit: 50, windowSec: 86_400 },
  ]);
  if (!limit.ok) return tooManyRequests(limit, CORS, DOCS);
  const malformedKey = Boolean(ctx.request.headers.get('X-API-Key') || ctx.request.headers.get('Authorization')) && !extractApiKey(ctx.request);
  if (ctx.request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json')
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
      if (size > OPTIONS_LIMITS.bodyBytes) {
        await reader.cancel();
        return json({ error: `Request exceeds ${OPTIONS_LIMITS.bodyBytes} bytes` }, 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let off = 0;
    for (const c of chunks) { bytes.set(c, off); off += c.length; }
    const body = JSON.parse(new TextDecoder().decode(bytes));
    const result = await findOrderOptions(body);
    return json({ ...result, tier: limit.tier, ...(limit.invalidKey || malformedKey ? { warning: 'API key not recognised; anonymous limits applied' } : {}) });
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: 'Body must be valid JSON' }, 400);
    if (error instanceof PalletInputError) return json({ error: error.message, field: error.field, docs: DOCS }, 400);
    return json({ error: 'Quote failed. Please retry with a smaller order.' }, 500);
  }
};
