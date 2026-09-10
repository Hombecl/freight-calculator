/**
 * apiTiers.ts — the single source of truth for API plans.
 *
 * Shared by the Pages Functions (rate limiting) and the /api-pricing page
 * (what we promise), so the limits a developer reads are the limits the
 * server enforces. Multipliers scale each endpoint's anonymous per-IP rule.
 *
 * Anonymous (no key) keeps the current per-IP limits. A free self-serve key
 * moves the bucket from the IP to the key and raises the ceiling — that alone
 * fixes the two real developer complaints (shared office IPs, CI runners).
 * Paid tiers are issued by hand until checkout is wired (see BILLING-SETUP.md).
 */

export type ApiTier = 'anonymous' | 'free' | 'starter' | 'business';

export interface ApiPlan {
  tier: ApiTier;
  /** display name */
  name: string;
  /** USD per month; null = free, undefined = contact */
  priceUsd: number | null;
  /** multiplier applied to each endpoint's anonymous limits */
  multiplier: number;
  /** issued by the self-serve form (true) or by hand (false) */
  selfServe: boolean;
}

export const API_PLANS: ApiPlan[] = [
  { tier: 'anonymous', name: 'No key', priceUsd: null, multiplier: 1, selfServe: true },
  { tier: 'free', name: 'Free key', priceUsd: null, multiplier: 5, selfServe: true },
  { tier: 'starter', name: 'Starter', priceUsd: 49, multiplier: 20, selfServe: false },
  { tier: 'business', name: 'Business', priceUsd: 199, multiplier: 100, selfServe: false },
];

export const planFor = (tier: ApiTier): ApiPlan =>
  API_PLANS.find((p) => p.tier === tier) ?? API_PLANS[0];

/** Anonymous per-IP limits per endpoint — must match the RATE_RULES in each function. */
export const ENDPOINT_BASE_LIMITS: Record<string, { perMin: number; perDay: number }> = {
  consolidate: { perMin: 5, perDay: 50 },
  pack: { perMin: 60, perDay: 1000 },
  'pallet-estimate': { perMin: 20, perDay: 200 },
  'order-plan': { perMin: 10, perDay: 100 },
  'case-design': { perMin: 10, perDay: 100 },
  'order-options': { perMin: 5, perDay: 50 },
  'box-catalog': { perMin: 5, perDay: 50 },
  'order-quote': { perMin: 10, perDay: 100 },
};

export const API_KEY_PREFIX = 'dp_live_';
export const API_KEY_RE = /^dp_live_[0-9a-f]{32}$/;
