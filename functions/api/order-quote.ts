/**
 * POST /api/order-quote — pallet count + loaded dimensions before freight quoting.
 *
 * Wraps /api/order-plan for the quoting workflow: explicit units, stable ids,
 * gross weight incl. tare and packaging allowance, receiver/carrier limit
 * checks with stated assumptions, needs_review semantics, inputHash +
 * engineVersion for reproducibility, and a meter id (one distinct order).
 * See src/lib/orderQuote.ts for the contract; the page /order-quote runs the
 * identical library in the browser.
 */
import { quoteOrder, QUOTE_EXAMPLE, QUOTE_LIMITS } from '../../src/lib/orderQuote';
import { PalletInputError } from '../../src/lib/palletEstimate';
import { rateLimitKeyed, tooManyRequests, type RateLimitEnv } from './_rateLimit';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
};
const DOCS = 'https://www.dimpack3d.com/api-docs#order-quote';
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers: CORS });

export const onRequestGet: PagesFunction = async () =>
  json({
    endpoint: 'POST /api/order-quote',
    purpose: 'Pallet count, loaded/outer dimensions and gross weight for an order BEFORE freight quoting, with receiver/carrier limit checks.',
    request: QUOTE_EXAMPLE,
    limits: { ...QUOTE_LIMITS, note: `${QUOTE_LIMITS.types} carton types, ${QUOTE_LIMITS.cartons} cartons, ${QUOTE_LIMITS.pallets} pallets, ${QUOTE_LIMITS.bodyBytes} B body per order.` },
    response: 'status complete|partial|needs_review, reviewReasons[], summary{palletCount,totalGrossWeight,maxOuterHeight,…}, pallets[]{outerDims,grossWeight,checks[]{code,status,observed,limit,assumption},variance?}, inputHash, engineVersion, meter{unit:"order",id}',
    semantics: 'partial = not every carton placed within maxPallets — never quote it as a whole shipment. needs_review = placed, but a supplied limit failed. Checks are screening against numbers you supplied, not certification.',
    auth: 'Optional X-API-Key (https://www.dimpack3d.com/api-pricing). Anonymous: 10/min, 100/day per IP.',
    interactive: 'https://www.dimpack3d.com/order-quote',
    docs: DOCS,
  });

export const onRequestPost: PagesFunction<RateLimitEnv> = async (ctx) => {
  const limit = await rateLimitKeyed(ctx.env, ctx.request, [
    { name: 'order-quote', limit: 10, windowSec: 60 },
    { name: 'order-quote', limit: 100, windowSec: 86_400 },
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
      if (size > QUOTE_LIMITS.bodyBytes) {
        await reader.cancel();
        return json({ error: `Request exceeds ${QUOTE_LIMITS.bodyBytes} bytes` }, 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let off = 0;
    for (const c of chunks) { bytes.set(c, off); off += c.length; }
    const body = JSON.parse(new TextDecoder().decode(bytes));
    const result = await quoteOrder(body);
    return json({ ...result, tier: limit.tier, ...(limit.invalidKey ? { warning: 'API key not recognised; anonymous limits applied' } : {}) });
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: 'Body must be valid JSON' }, 400);
    if (error instanceof PalletInputError) return json({ error: error.message, field: error.field, docs: DOCS }, 400);
    return json({ error: 'Quote failed. Please retry with a smaller order.' }, 500);
  }
};
