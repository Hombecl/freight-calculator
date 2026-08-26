/**
 * _rateLimit.ts — per-IP rate limiting for the public API endpoints.
 *
 * Why: /api/pack is unauthenticated and does real work. It had per-request input
 * caps (MAX_QTY 2000, MAX_ITEMS 100) but no request-RATE limit — 12 rapid
 * requests all returned 200 — so a single client could burn the account's
 * Cloudflare Functions quota. This is cost control, independent of any
 * marketing plan to promote the API.
 *
 * ⛔ Honest about what this is NOT: KV reads are eventually consistent (stale up
 * to ~60s across colos), so a distributed microburst CAN exceed the limit before
 * the counter propagates. This bounds SUSTAINED abuse, which is the cost risk;
 * it is not a security control and should not be described as one.
 *
 * Design note: we only WRITE while under the limit. Once an IP is blocked the
 * path is read-only, so an attacker cannot push us past KV's ~1 write/sec
 * per-key ceiling — the write pressure self-limits exactly when it would
 * otherwise be worst.
 */

export interface RateLimitEnv {
  LEADS: KVNamespace;
}

export interface RateLimitRule {
  /** bucket name, e.g. 'pack' */
  name: string;
  /** max requests allowed inside the window */
  limit: number;
  /** window length in seconds */
  windowSec: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** which rule tripped, when ok === false */
  tripped?: RateLimitRule;
  /** seconds until the offending window rolls over */
  retryAfter?: number;
}

/** Fixed-window counter key: one per IP per rule per window. */
const keyFor = (rule: RateLimitRule, ip: string, nowSec: number) =>
  `rl|${rule.name}|${rule.windowSec}|${ip}|${Math.floor(nowSec / rule.windowSec)}`;

/**
 * Check (and consume) quota for `ip` against every rule. Returns ok:false on the
 * FIRST rule that is already at its limit, without consuming from the others.
 *
 * If the request has no CF-Connecting-IP (local dev, some test harnesses) we
 * allow it rather than blocking everything — failing open is correct here
 * because the purpose is cost control, not access control.
 */
export async function rateLimit(
  env: RateLimitEnv,
  request: Request,
  rules: RateLimitRule[],
  nowSec = Math.floor(Date.now() / 1000),
): Promise<RateLimitResult> {
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip || !env?.LEADS) return { ok: true };

  const counts = await Promise.all(
    rules.map(async (rule) => {
      const raw = await env.LEADS.get(keyFor(rule, ip, nowSec));
      return Number(raw ?? 0) || 0;
    }),
  );

  for (let i = 0; i < rules.length; i++) {
    if (counts[i] >= rules[i].limit) {
      const w = rules[i].windowSec;
      return {
        ok: false,
        tripped: rules[i],
        retryAfter: w - (nowSec % w),
      };
    }
  }

  // under every limit — consume one from each window. Best-effort: a failed
  // write must never turn a legitimate request into an error.
  await Promise.all(
    rules.map((rule, i) =>
      env.LEADS.put(keyFor(rule, ip, nowSec), String(counts[i] + 1), {
        // outlive the window so the counter cannot reset early
        expirationTtl: Math.max(60, rule.windowSec * 2),
      }).catch(() => { /* ignore */ }),
    ),
  );

  return { ok: true };
}

/** 429 response with the headers a well-behaved client expects. */
export function tooManyRequests(result: RateLimitResult, cors: Record<string, string>, docs: string) {
  const retry = result.retryAfter ?? 60;
  return new Response(
    JSON.stringify({
      error: 'rate limit exceeded',
      limit: result.tripped ? `${result.tripped.limit} requests per ${result.tripped.windowSec}s` : undefined,
      retryAfterSeconds: retry,
      note: 'Free while in beta. Need higher limits? hello@dimpack3d.com',
      docs,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retry),
        ...cors,
      },
    },
  );
}
