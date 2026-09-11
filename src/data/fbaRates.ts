// Existing legacy table is labelled 2025; no exact effective day was recorded.
// Illustrative template, not a verified current fee schedule.
export const FBA_RATE_AS_OF = '2025';
export const FBA_RATE_METADATA = { source: 'https://sellercentral.amazon.com/help/hub/reference/GG5KW835AHDJCH8W', verifiedAt: null, template: true } as const;
// ===== Amazon FBA Size Tier Types (US Market) =====
export type FBASizeTier =
  | 'small_standard'
  | 'large_standard'
  | 'large_bulky'
  | 'extra_large_0_50'
  | 'extra_large_50_70'
  | 'extra_large_70_150'
  | 'extra_large_150_plus';

export interface FBASizeTierInfo {
  tier: FBASizeTier;
  name: string;
  nameZh: string;
  color: string;
  maxDims: { longest: number; median: number; shortest: number }; // in inches
  maxWeight: number; // in lbs
  baseFee: number; // USD - base fulfillment fee
  perLbFee?: number; // USD - additional per lb fee
}

// Amazon FBA Size Tier Specifications (US - 2025)
// Source: https://sellercentral.amazon.com/help/hub/reference/GG5KW835AHDJCH8W
export const FBA_SIZE_TIERS: Record<FBASizeTier, FBASizeTierInfo> = {
  small_standard: {
    tier: 'small_standard',
    name: 'Small Standard',
    nameZh: '小型標準',
    color: '#22c55e', // green
    maxDims: { longest: 15, median: 12, shortest: 0.75 },
    maxWeight: 1,
    baseFee: 3.22,
  },
  large_standard: {
    tier: 'large_standard',
    name: 'Large Standard',
    nameZh: '大型標準',
    color: '#3b82f6', // blue
    maxDims: { longest: 18, median: 14, shortest: 8 },
    maxWeight: 20,
    baseFee: 4.75,
    perLbFee: 0.08,
  },
  large_bulky: {
    tier: 'large_bulky',
    name: 'Large Bulky',
    nameZh: '大型笨重',
    color: '#f59e0b', // amber
    maxDims: { longest: 59, median: 33, shortest: 33 },
    maxWeight: 50,
    baseFee: 9.73,
    perLbFee: 0.42,
  },
  extra_large_0_50: {
    tier: 'extra_large_0_50',
    name: 'Extra Large (0-50 lb)',
    nameZh: '超大型 (0-50磅)',
    color: '#ef4444', // red
    maxDims: { longest: 999, median: 999, shortest: 999 }, // no practical limit
    maxWeight: 50,
    baseFee: 26.33,
    perLbFee: 0.38,
  },
  extra_large_50_70: {
    tier: 'extra_large_50_70',
    name: 'Extra Large (50-70 lb)',
    nameZh: '超大型 (50-70磅)',
    color: '#dc2626', // red-600
    maxDims: { longest: 999, median: 999, shortest: 999 },
    maxWeight: 70,
    baseFee: 40.12,
    perLbFee: 0.75,
  },
  extra_large_70_150: {
    tier: 'extra_large_70_150',
    name: 'Extra Large (70-150 lb)',
    nameZh: '超大型 (70-150磅)',
    color: '#b91c1c', // red-700
    maxDims: { longest: 999, median: 999, shortest: 999 },
    maxWeight: 150,
    baseFee: 54.81,
    perLbFee: 0.75,
  },
  extra_large_150_plus: {
    tier: 'extra_large_150_plus',
    name: 'Extra Large (150+ lb)',
    nameZh: '超大型 (150磅以上)',
    color: '#7f1d1d', // red-900
    maxDims: { longest: 999, median: 999, shortest: 999 },
    maxWeight: 9999,
    baseFee: 194.95,
    perLbFee: 0.19,
  },
};
