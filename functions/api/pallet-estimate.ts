import {
  estimatePallet,
  PALLET_EXAMPLE,
  PALLET_LIMITS,
  PalletInputError,
} from "../../src/lib/palletEstimate";
import { rateLimitKeyed, tooManyRequests, type RateLimitEnv } from "./_rateLimit";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: CORS });
export const onRequestGet: PagesFunction = async () =>
  json({
    endpoint: "POST /api/pallet-estimate",
    request: PALLET_EXAMPLE,
    limits: PALLET_LIMITS,
    docs: "https://www.dimpack3d.com/api-docs#pallet-height",
    notes:
      "Height includes the pallet base. maxWeight is cargo payload, excluding pallet tare. A partial result does not fit the whole order. Best of three heuristics; minimum height is not proven. Free beta, 20 requests/minute and 200/day per IP when rate-limit storage is configured. A free API key (X-API-Key) raises limits 5x: https://www.dimpack3d.com/api-pricing",
  });
export const onRequestPost: PagesFunction<RateLimitEnv> = async (ctx) => {
  const limit = await rateLimitKeyed(ctx.env, ctx.request, [
    { name: "pallet-estimate", limit: 20, windowSec: 60 },
    { name: "pallet-estimate", limit: 200, windowSec: 86400 },
  ]);
  if (!limit.ok)
    return tooManyRequests(
      limit,
      CORS,
      "https://www.dimpack3d.com/api-docs#pallet-height"
    );
  if (
    !ctx.request.headers
      .get("Content-Type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    return json({ error: "Content-Type must be application/json" }, 415);
  const reader = ctx.request.body?.getReader();
  if (!reader) return json({ error: "JSON body required" }, 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > PALLET_LIMITS.bodyBytes) {
        await reader.cancel();
        return json({ error: "Request exceeds 32 KB" }, 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const body = JSON.parse(new TextDecoder().decode(bytes));
    return json(estimatePallet(body));
  } catch (error) {
    if (error instanceof SyntaxError)
      return json({ error: "Body must be valid JSON" }, 400);
    if (error instanceof PalletInputError)
      return json({ error: error.message, field: error.field }, 400);
    return json(
      { error: "Estimate failed. Please retry with a smaller order." },
      500
    );
  }
};
