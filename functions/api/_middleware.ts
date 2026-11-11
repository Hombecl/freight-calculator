import { ENDPOINT_BASE_LIMITS } from '../../src/lib/apiTiers';
import { resolveSubject, type RateLimitEnv } from './_rateLimit';

interface Env extends RateLimitEnv { API_ANALYTICS?: AnalyticsEngineDataset }

/** Server-only dataset: never log credentials, IPs, email or request/response bodies. */
export const onRequest: PagesFunction<Env> = async ctx => {
  const endpoint = new URL(ctx.request.url).pathname.replace(/^\/api\//, '');
  if (ctx.request.method !== 'POST' || !Object.hasOwn(ENDPOINT_BASE_LIMITS, endpoint)) return ctx.next();
  const start = Date.now();
  let status = 500;
  try {
    const response = await ctx.next();
    status = response.status;
    return response;
  } finally {
    const duration = Date.now() - start;
    if (ctx.env.API_ANALYTICS) ctx.waitUntil((async () => {
      try {
        const who = await resolveSubject(ctx.env, ctx.request);
        let client = 'anonymous';
        if (!who.invalidKey && who.subject?.startsWith('key:')) {
          // High-entropy API keys are hashed with domain separation. This stable
          // pseudonym measures a key, NOT a person/company; legacy keys work too.
          const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`dimpack-api-usage-v1:${who.subject}`));
          client = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
        }
        ctx.env.API_ANALYTICS!.writeDataPoint({
          indexes: [client],
          blobs: [endpoint, String(status), who.tier, who.invalidKey ? 'invalid_key' : client === 'anonymous' ? 'anonymous' : 'keyed',
            duration < 100 ? 'lt100ms' : duration < 500 ? 'lt500ms' : duration < 2000 ? 'lt2s' : 'gte2s'],
          doubles: [1],
        });
      } catch { /* Telemetry must never change API responses or expose errors. */ }
    })());
  }
};
