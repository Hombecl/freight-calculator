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

import { API_KEY_RE, planFor, type ApiTier } from '../../src/lib/apiTiers';

export interface RateLimitEnv {
  LEADS: KVNamespace;
}

/** Stored under `apikey|<key>` in LEADS KV by /api/key. */
export interface ApiKeyRecord {
  email: string;
  tier: ApiTier;
  company?: string;
  useCase?: string;
  createdAt: string;
  /** set by hand to cut a key off without deleting its history */
  revokedAt?: string;
}

export const apiKeyKvKey = (key: string) => `apikey|${key}`;

/**
 * Read the API key from `X-API-Key` or `Authorization: Bearer dp_live_…`.
 * Returns null when absent or malformed — callers treat that as anonymous,
 * never as an error, so a typo degrades to per-IP limits instead of a 401.
 */
export function extractApiKey(request: Request): string | null {
  const direct = request.headers.get('X-API-Key')?.trim();
  if (direct && API_KEY_RE.test(direct)) return direct;
  const auth = request.headers.get('Authorization')?.trim();
  if (auth?.toLowerCase().startsWith('bearer ')) {
    const tok = auth.slice(7).trim();
    if (API_KEY_RE.test(tok)) return tok;
  }
  return null;
}

export interface ResolvedSubject {
  /** bucket id: `key:<key>` or `ip:<ip>` (or null when unknown → fail open) */
  subject: string | null;
  tier: ApiTier;
  /** true when a syntactically valid key was sent but is unknown or revoked */
  invalidKey: boolean;
}

/** Decide who is being rate-limited and at which tier. */
export async function resolveSubject(env: RateLimitEnv, request: Request): Promise<ResolvedSubject> {
  const ip = request.headers.get('CF-Connecting-IP');
  const anon: ResolvedSubject = { subject: ip ? `ip:${ip}` : null, tier: 'anonymous', invalidKey: false };
  const key = extractApiKey(request);
  if (!key || !env?.LEADS) return anon;
  const raw = await env.LEADS.get(apiKeyKvKey(key)).catch(() => null);
  if (!raw) return { ...anon, invalidKey: true };
  try {
    const rec = JSON.parse(raw) as ApiKeyRecord;
    if (rec.revokedAt) return { ...anon, invalidKey: true };
    return { subject: `key:${key}`, tier: rec.tier ?? 'free', invalidKey: false };
  } catch {
    return { ...anon, invalidKey: true };
  }
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
const keyFor = (rule: RateLimitRule, subject: string, nowSec: number) =>
  `rl|${rule.name}|${rule.windowSec}|${subject}|${Math.floor(nowSec / rule.windowSec)}`;

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
  return rateLimitSubject(env, `ip:${ip}`, rules, nowSec);
}

/**
 * Key-aware variant: resolves the caller (API key → its tier, else IP), scales
 * every rule by the tier multiplier, and buckets by key instead of IP. This is
 * what the public endpoints call. Anonymous behaviour is byte-for-byte the old
 * rateLimit() — same limits, same keys modulo the `ip:` prefix.
 */
export async function rateLimitKeyed(
  env: RateLimitEnv,
  request: Request,
  rules: RateLimitRule[],
  nowSec = Math.floor(Date.now() / 1000),
): Promise<RateLimitResult & { tier: ApiTier; invalidKey: boolean }> {
  const who = await resolveSubject(env, request);
  if (!who.subject || !env?.LEADS) return { ok: true, tier: who.tier, invalidKey: who.invalidKey };
  const mult = planFor(who.tier).multiplier;
  const scaled = rules.map((r) => ({ ...r, limit: r.limit * mult }));
  const res = await rateLimitSubject(env, who.subject, scaled, nowSec);
  return { ...res, tier: who.tier, invalidKey: who.invalidKey };
}

async function rateLimitSubject(
  env: RateLimitEnv,
  ip: string,
  rules: RateLimitRule[],
  nowSec: number,
): Promise<RateLimitResult> {

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
      note: 'Need higher limits? A free API key raises them 5x: https://www.dimpack3d.com/api-pricing',
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
