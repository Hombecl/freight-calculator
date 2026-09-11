import { checkReceiver, loadProfiles, UnknownProfileError } from '../../src/lib/receiverProfiles';
/** Versioned customer profile screening over the shared quote engine. */
import { QUOTE_EXAMPLE, QUOTE_LIMITS } from '../../src/lib/orderQuote';
import { PalletInputError } from '../../src/lib/palletEstimate';
import { rateLimitKeyed, tooManyRequests, type RateLimitEnv } from './_rateLimit';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
};
const DOCS = 'https://www.dimpack3d.com/api-docs#receiver-check';
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers: CORS });

export const onRequestGet: PagesFunction = async () =>
  json({
    endpoint: 'POST /api/receiver-check',
    purpose: 'Screen an order against a versioned receiver profile; templates require buyer confirmation.',
    request: { ...QUOTE_EXAMPLE, profileId: "ltl-standard-us" },
    profiles: loadProfiles().map(({id,name,source,verifiedAt,limits}) => ({id,name,source,verifiedAt,limits})),
    limits: { ...QUOTE_LIMITS, note: `${QUOTE_LIMITS.types} carton types, ${QUOTE_LIMITS.cartons} cartons, ${QUOTE_LIMITS.pallets} pallets, ${QUOTE_LIMITS.bodyBytes} B body per order.` },
    response: 'profile{id,name,version,template,source,verifiedAt,approvedBy?,approvedAt?,unverified?}, profileChecks[]{code,status,observed?,limit?,assumption}, tier, warning?; status complete|partial|needs_review, reviewReasons[], summary{palletCount,totalGrossWeight,maxOuterHeight,…}, pallets[]{outerDims,grossWeight,checks[]{code,status,observed,limit,assumption},variance?}, inputHash, engineVersion, meter{unit:"order",id}',
    semantics: 'partial = not every carton placed within maxPallets — never quote it as a whole shipment. partial takes precedence even when receiver rules fail; profileChecks and reviewReasons retain those failures. needs_review = all cartons placed, but a supplied limit failed. Checks are screening against numbers you supplied, not certification.',
    auth: 'Optional X-API-Key (https://www.dimpack3d.com/api-pricing). Anonymous: 10/min, 100/day per IP.',
    interactive: 'https://www.dimpack3d.com/receiver-profiles',
    docs: DOCS,
  });

export const onRequestPost: PagesFunction<RateLimitEnv> = async (ctx) => {
  const limit = await rateLimitKeyed(ctx.env, ctx.request, [
    { name: 'receiver-check', limit: 10, windowSec: 60 },
    { name: 'receiver-check', limit: 100, windowSec: 86_400 },
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
    const result = await checkReceiver(body);
    return json({ ...result, tier: limit.tier, ...(limit.invalidKey ? { warning: 'API key not recognised; anonymous limits applied' } : {}) });
  } catch (error) {
    if (error instanceof UnknownProfileError) return json({ error: error.message, field: 'profileId' }, 404);
    if (error instanceof SyntaxError) return json({ error: 'Body must be valid JSON' }, 400);
    if (error instanceof PalletInputError) return json({ error: error.message, field: error.field, docs: DOCS }, 400);
    return json({ error: 'Quote failed. Please retry with a smaller order.' }, 500);
  }
};
