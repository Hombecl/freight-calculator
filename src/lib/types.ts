// ===== Type Definitions =====
export type Language = 'zh' | 'en';
export type LengthUnit = 'cm' | 'inch';
export type WeightUnit = 'kg' | 'lb';
export type Currency = 'USD' | 'RMB';
export type Mode = 'packing' | 'loading' | 'fba';
export type ContainerKey = '20gp' | '40gp' | '40hq';
export type ScenarioType = 'standard' | 'mixed' | 'layered';

export interface Dimensions {
  l: number;
  w: number;
  h: number;
}

export interface DimensionsWithWeight extends Dimensions {
  weight: number;
}

export interface Units {
  length: LengthUnit;
  weight: WeightUnit;
  currency: Currency;
}

export interface Rates {
  air: number;
  airCurrency: Currency;
  sea: number;
  seaCurrency: Currency;
  seaUnit: 'cbm' | 'kg';
}

export interface ContainerSpec extends Dimensions {
  cbm: number;
}

export interface PackedItem {
  x: number;
  y: number;
  z: number;
  l: number;
  w: number;
  h: number;
  colorType: number;
}

export interface Gaps {
  l: number;
  w: number;
  h: number;
  isMixed?: boolean;
}

export interface PackingScenario {
  nameKey: string;
  descKey: string;
  dims: [number, number, number];
  type: ScenarioType;
  count: number;
  utilization: number;
  gaps: Gaps;
  items: PackedItem[];
}

export interface CustomCarton extends DimensionsWithWeight {
  labelKey: string | null;
  name: string;
}

export interface PackingCosts {
  air: { total: number; unit: number };
  sea: { total: number; unit: number };
  stats: {
    cbm: number;
    grossWeight: number;
    dimWeightAir: number;
    chargeableAir: number;
    utilization: number;
    isDimWeight: boolean;
  };
}

export interface LoadingStats {
  count: number;
  totalCbm: number;
  utilization: number;
}

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
  maxDims: { longest: number; median: number; shortest: number };
  maxWeight: number;
  baseFee: number;
  perLbFee?: number;
}

// Three.js global
declare global {
  interface Window {
    THREE: typeof import('three');
  }
}

// Translation dictionary type
export interface TranslationDictionary {
  zh: Record<string, string>;
  en: Record<string, string>;
}
