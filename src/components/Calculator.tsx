import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Package, Box, Anchor, Plane, ArrowRightLeft, Settings, Scale, Calculator, LayoutDashboard, X, DollarSign, Tag, Globe, RotateCcw, Eye, Cuboid, Layers, ZoomIn, ZoomOut, Maximize, CheckCircle, Ruler, Edit3, Save, ChevronDown, ChevronUp, Languages, Info, ScanLine, Minimize2, Container, ArrowRight, HardDrive, Lightbulb, ExternalLink, Lock, Unlock, Sliders } from 'lucide-react';

// ===== Type Definitions =====
type Language = 'zh' | 'en';
type LengthUnit = 'cm' | 'inch';
type WeightUnit = 'kg' | 'lb';
type Currency = 'USD' | 'RMB';
type Mode = 'packing' | 'loading' | 'fba';
type ContainerKey = '20gp' | '40gp' | '40hq';
type ScenarioType = 'standard' | 'mixed' | 'layered';

interface Dimensions {
  l: number;
  w: number;
  h: number;
}

interface DimensionsWithWeight extends Dimensions {
  weight: number;
}

interface Units {
  length: LengthUnit;
  weight: WeightUnit;
  currency: Currency;
}

interface Rates {
  air: number;
  airCurrency: Currency;
  sea: number;
  seaCurrency: Currency;
  seaUnit: 'cbm' | 'kg';
}

interface ContainerSpec extends Dimensions {
  cbm: number;
}

interface PackedItem {
  x: number;
  y: number;
  z: number;
  l: number;
  w: number;
  h: number;
  colorType: number;
}

interface Gaps {
  l: number;
  w: number;
  h: number;
  isMixed?: boolean;
}

interface PackingScenario {
  nameKey: string;
  descKey: string;
  dims: [number, number, number];
  type: ScenarioType;
  count: number;
  utilization: number;
  gaps: Gaps;
  items: PackedItem[];
}

interface CustomCarton extends DimensionsWithWeight {
  labelKey: string | null;
  name: string;
}

interface PackingCosts {
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

interface LoadingStats {
  count: number;
  totalCbm: number;
  utilization: number;
}

// Component Props Types
interface ThreeVisualizerProps {
  outer: Dimensions;
  inner: Dimensions;
  scenario: PackingScenario | null;
  units: Units;
  t: (key: string) => string;
  isContainerMode?: boolean;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rates: Rates;
  setRates: React.Dispatch<React.SetStateAction<Rates>>;
  dimFactor: number;
  setDimFactor: React.Dispatch<React.SetStateAction<number>>;
  exchangeRate: number;
  setExchangeRate: React.Dispatch<React.SetStateAction<number>>;
  units: Units;
  customCartons: CustomCarton[];
  setCustomCartons: React.Dispatch<React.SetStateAction<CustomCarton[]>>;
  t: (key: string) => string;
  onClearData?: () => void;
}

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DimensionsWithWeight;
  outer: DimensionsWithWeight;
  units: Units;
  onApply: (carton: DimensionsWithWeight) => void;
  customCartons: CustomCarton[];
  rates: Rates;
  dimFactor: number;
  exchangeRate: number;
  t: (key: string) => string;
  cartonThickness: number;
  isContainerMode?: boolean;
}

interface FbaSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: DimensionsWithWeight; // dimensions in inches, weight in lbs
  onProductChange: (product: DimensionsWithWeight) => void; // callback to update product dimensions
  currentTier: FBASizeTierInfo;
  allTiers: FBASizeTierInfo[];
  sortedDims: [number, number, number]; // [longest, median, shortest] in inches
  billableWeight: number;
  t: (key: string) => string;
  lang: Language;
}

interface CompactCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  highlight?: boolean;
  action?: React.ReactNode;
}

interface CompactInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  step?: string;
  className?: string;
}

interface StatRowProps {
  label: string;
  value: string;
  sub?: string;
  isAlert?: boolean;
  isSuccess?: boolean;
}

// Three.js global
declare global {
  interface Window {
    THREE: typeof import('three');
  }
}

// ===== Amazon FBA Size Tier Types (US Market) =====
type FBASizeTier =
  | 'small_standard'
  | 'large_standard'
  | 'large_bulky'
  | 'extra_large_0_50'
  | 'extra_large_50_70'
  | 'extra_large_70_150'
  | 'extra_large_150_plus';

interface FBASizeTierInfo {
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
const FBA_SIZE_TIERS: Record<FBASizeTier, FBASizeTierInfo> = {
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

// Amazon DIM weight divisor (US)
const FBA_DIM_DIVISOR = 139;

// Calculate which FBA size tier a product falls into
const calculateFBASizeTier = (
  lengthIn: number,
  widthIn: number,
  heightIn: number,
  weightLb: number
): { tier: FBASizeTierInfo; dimWeight: number; billableWeight: number; estimatedFee: number } => {
  // Sort dimensions: longest, median, shortest
  const dims = [lengthIn, widthIn, heightIn].sort((a, b) => b - a);
  const [longest, median, shortest] = dims;

  // Calculate dimensional weight
  const cubicInches = longest * median * shortest;
  const dimWeight = cubicInches / FBA_DIM_DIVISOR;

  // Billable weight is the greater of actual or dimensional weight
  const billableWeight = Math.max(weightLb, dimWeight);

  // Determine size tier based on dimensions and weight
  let tier: FBASizeTier;

  if (longest <= 15 && median <= 12 && shortest <= 0.75 && billableWeight <= 1) {
    tier = 'small_standard';
  } else if (longest <= 18 && median <= 14 && shortest <= 8 && billableWeight <= 20) {
    tier = 'large_standard';
  } else if (longest <= 59 && median <= 33 && shortest <= 33 && billableWeight <= 50) {
    tier = 'large_bulky';
  } else if (billableWeight <= 50) {
    tier = 'extra_large_0_50';
  } else if (billableWeight <= 70) {
    tier = 'extra_large_50_70';
  } else if (billableWeight <= 150) {
    tier = 'extra_large_70_150';
  } else {
    tier = 'extra_large_150_plus';
  }

  const tierInfo = FBA_SIZE_TIERS[tier];

  // Calculate estimated FBA fee
  let estimatedFee = tierInfo.baseFee;
  if (tierInfo.perLbFee && billableWeight > 1) {
    estimatedFee += (billableWeight - 1) * tierInfo.perLbFee;
  }

  return { tier: tierInfo, dimWeight, billableWeight, estimatedFee };
};

// Get the next tier boundary (for optimization suggestions)
const getNextTierBoundary = (currentTier: FBASizeTier): FBASizeTierInfo | null => {
  const tierOrder: FBASizeTier[] = [
    'small_standard',
    'large_standard',
    'large_bulky',
    'extra_large_0_50',
    'extra_large_50_70',
    'extra_large_70_150',
    'extra_large_150_plus'
  ];

  const currentIdx = tierOrder.indexOf(currentTier);
  if (currentIdx > 0) {
    return FBA_SIZE_TIERS[tierOrder[currentIdx - 1]];
  }
  return null;
};

// LocalStorage data structure
interface StoredData {
  version: number;
  lang: Language;
  units: Units;
  rates: Rates;
  dimFactor: number;
  exchangeRate: number;
  cartonThickness: number;
  customCartons: CustomCarton[];
  product: DimensionsWithWeight;
  carton: DimensionsWithWeight;
  shipmentCarton: DimensionsWithWeight;
  selectedContainerKey: ContainerKey;
  mode: Mode;
}

const STORAGE_KEY = 'dimpack3d-settings';
const STORAGE_VERSION = 1;

// --- LocalStorage Helper Functions ---
const loadFromStorage = (): Partial<StoredData> | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const data = JSON.parse(stored) as StoredData;
    // Version check for future migrations
    if (data.version !== STORAGE_VERSION) {
      console.log('Storage version mismatch, using defaults');
      return null;
    }
    return data;
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
    return null;
  }
};

const saveToStorage = (data: StoredData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
};

// Translation dictionary type
type TranslationKey = keyof typeof TRANSLATIONS.zh;
type TranslationDictionary = Record<Language, Record<string, string>>;

// --- Translation Dictionary ---
const TRANSLATIONS: TranslationDictionary = {
  zh: {
    title: "DimPack3D",
    subtitle: "3D 包裝計算器 | Packaging Calculator",
    modePacking: "產品裝箱 (Packing)",
    modeLoading: "貨櫃裝載 (Container)",
    modeFba: "FBA 尺寸",
    productSpecs: "產品規格 (Product)",
    cartonSpecs: "外箱規格 (Carton)",
    length: "長 L",
    width: "闊 W",
    height: "高 H",
    weight: "單件重量",
    emptyCartonWeight: "空箱重量",
    wallThickness: "紙箱厚度 (Wall)",
    innerDims: "內徑 (Inner)",
    shipmentCarton: "出貨紙箱 (Shipment Carton)",
    containerSelection: "貨櫃選擇 (Container)",
    container20gp: "20' 標準櫃 (20GP)",
    container40gp: "40' 標準櫃 (40GP)",
    container40hq: "40' 高櫃 (40HQ)",
    totalCartons: "總箱數",
    totalCbm: "總體積 (CBM)",
    containerUtil: "貨櫃利用率",
    syncFromPacking: "從裝箱計算同步尺寸",
    rateSettings: "運費參數設定",
    rates: "基礎費率 (Rates)",
    cartonLibrary: "常用紙箱庫 (Carton Library)",
    selectCarton: "選擇紙箱 (Change Carton)",
    currentCarton: "-- 當前紙箱 (Current) --",
    customCarton: "選擇",
    saveSettings: "儲存設定 (Save Settings)",
    airFreight: "空運 (Air)",
    seaFreight: "海運 (Sea)",
    costPerUnit: "每件運費 (Cost / Unit)",
    totalPerCarton: "每箱總運費",
    packingAnalysis: "裝箱與重量分析",
    grossWeight: "整箱實重 (Gross)",
    dimWeight: "材積重 (Dim Weight)",
    chargeable: "計費重 (Chargeable)",
    utilization: "空間利用率 (Utilization)",
    open3D: "開啟 3D 模擬 (3D Sim)",
    reset: "重置",
    settings: "設定",
    close: "關閉",
    applyCarton: "應用此紙箱",
    best: "BEST",
    scenarios: "選擇方案 (Select Scenario)",
    remainingGaps: "剩餘空隙 (Remaining Gaps)",
    dimFactor: "空運材積系數 (Dim Factor)",
    exchangeRate: "匯率",
    scenarioStandard: "標準堆疊 (Standard)",
    scenarioMixed: "縫隙填充 (Gap Filling)",
    scenarioLayered: "混合層疊 (Mixed Layers)",
    descStandard: "單一方向整齊排列",
    descMixed: "利用側邊縫隙改變方向",
    descLayered: "底層直放 + 頂層橫放",
    tuneProduct: "微調尺寸 (Tune Dims)",
    tuneDesc: "模擬調整尺寸，觀察對裝載率的影響。",
    unitPriceAir: "空運單價",
    unitPriceSea: "海運單價",
    grossWt: "總重 (Gross Wt)",
    dims: "尺寸 (Dims)",
    pcs: "PCS",
    scenariosFound: "已發現 {count} 種擺放方案",
    singleScenario: "單一方案",
    carton1: "工廠標準 A (小)",
    carton2: "工廠標準 B (中)",
    carton3: "工廠標準 C (大)",
    carton4: "出口專用紙箱 D",
    carton5: "特大號紙箱 E",
    specTitle: "規格確認 (Specs)",
    cartonLabel: "外箱/貨櫃",
    innerLabel: "內部空間",
    productLabel: "產品/紙箱",
    dimNote: "*顯示尺寸為擺放方向 (LxWxH)",
    zoomHint: "滾輪縮放 / 拖曳旋轉",
    resetView: "重置視角",
    orientationLabel: "方向圖例:",
    legendStandard: "標準",
    legendGap: "縫隙",
    legendLayered: "層疊",
    disclaimer: "*注意：實際運費可能因 Carrier 進位規則(如不足0.5kg當0.5kg計)而略有不同。",
    dataSaved: "數據已自動保存",
    clearData: "清除保存數據",
    clearDataConfirm: "確定清除所有保存的數據嗎？",
    dataCleared: "數據已清除",
    // FBA Size Tier
    fbaSizeTier: "Amazon FBA 尺寸等級",
    fbaSizeTierDesc: "基於 Amazon.com (美國) 2025 標準",
    fbaCurrentTier: "當前等級",
    fbaBillableWeight: "計費重量",
    fbaActualWeight: "實際重量",
    fbaDimWeight: "材積重量",
    fbaEstFee: "預估 FBA 費用",
    fbaOptimize: "優化建議",
    fbaOptimizeDesc: "如減少 {dim} {amount}，可降至",
    fbaTierBoundary: "等級邊界",
    fbaViewDocs: "查看 Amazon 官方文件",
    fbaSmallStandard: "小型標準",
    fbaLargeStandard: "大型標準",
    fbaLargeBulky: "大型笨重",
    fbaExtraLarge: "超大型",
    fbaDimDivisor: "材積除數",
    fbaMaxDims: "最大尺寸限制",
    fbaMaxWeight: "最大重量限制",
    fbaSavings: "可節省約",
    fbaPerUnit: "/ 件",
    fbaProductDims: "產品尺寸",
    fbaProductWeight: "產品重量",
    fbaOpen3D: "查看 3D 視覺化",
    fbaDistanceToNext: "距離下一級",
    fbaYourProduct: "你的產品",
    fbaTierComparison: "尺寸等級對照"
  },
  en: {
    title: "DimPack3D",
    subtitle: "3D Packaging Calculator",
    modePacking: "Product Packing",
    modeLoading: "Container Loading",
    modeFba: "FBA Size Tier",
    productSpecs: "Product Specs",
    cartonSpecs: "Carton Specs",
    length: "L",
    width: "W",
    height: "H",
    weight: "Unit Weight",
    emptyCartonWeight: "Empty Box Wt",
    wallThickness: "Wall Thickness",
    innerDims: "Inner Dims",
    shipmentCarton: "Shipment Carton",
    containerSelection: "Container Selection",
    container20gp: "20' Standard (20GP)",
    container40gp: "40' Standard (40GP)",
    container40hq: "40' High Cube (40HQ)",
    totalCartons: "Total Cartons",
    totalCbm: "Total CBM",
    containerUtil: "Container Util.",
    syncFromPacking: "Sync from Packing Tab",
    rateSettings: "Freight Settings",
    rates: "Base Rates",
    cartonLibrary: "Carton Library",
    selectCarton: "Select Carton",
    currentCarton: "-- Current Carton --",
    customCarton: "Option",
    saveSettings: "Save Settings",
    airFreight: "Air Freight",
    seaFreight: "Sea Freight",
    costPerUnit: "Cost Per Unit",
    totalPerCarton: "Total / Carton",
    packingAnalysis: "Packing & Weight Analysis",
    grossWeight: "Gross Weight",
    dimWeight: "Dim Weight",
    chargeable: "Chargeable Weight",
    utilization: "Utilization",
    open3D: "Open 3D Sim",
    reset: "Reset",
    settings: "Settings",
    close: "Close",
    applyCarton: "Apply",
    best: "BEST",
    scenarios: "Select Scenario",
    remainingGaps: "Remaining Gaps",
    dimFactor: "Dim Factor",
    exchangeRate: "Exchange Rate",
    scenarioStandard: "Standard Stack",
    scenarioMixed: "Gap Filling",
    scenarioLayered: "Mixed Layers",
    descStandard: "Single orientation alignment",
    descMixed: "Fill gaps with rotated items",
    descLayered: "Vertical bottom + Flat top",
    tuneProduct: "Tune Dimensions",
    tuneDesc: "Adjust size to see impact on loading.",
    unitPriceAir: "Air Rate",
    unitPriceSea: "Sea Rate",
    grossWt: "Gross Wt",
    dims: "Dims",
    pcs: "PCS",
    scenariosFound: "Found {count} packing scenarios",
    singleScenario: "Single scenario",
    carton1: "Factory Std A (Small)",
    carton2: "Factory Std B (Medium)",
    carton3: "Factory Std C (Large)",
    carton4: "Export Carton D",
    carton5: "Extra Large Carton E",
    specTitle: "Specs Check",
    cartonLabel: "Outer",
    innerLabel: "Inner",
    productLabel: "Item",
    dimNote: "*Dimensions shown as placed (LxWxH)",
    zoomHint: "Scroll to Zoom / Drag to Rotate",
    resetView: "Reset View",
    orientationLabel: "Orientation:",
    legendStandard: "Standard",
    legendGap: "Gap Fill",
    legendLayered: "Layered",
    disclaimer: "*Note: Actual freight may vary due to carrier rounding rules (e.g. round up to 0.5kg).",
    dataSaved: "Data auto-saved",
    clearData: "Clear saved data",
    clearDataConfirm: "Clear all saved data?",
    dataCleared: "Data cleared",
    // FBA Size Tier
    fbaSizeTier: "Amazon FBA Size Tier",
    fbaSizeTierDesc: "Based on Amazon.com (US) 2025 Standards",
    fbaCurrentTier: "Current Tier",
    fbaBillableWeight: "Billable Weight",
    fbaActualWeight: "Actual Weight",
    fbaDimWeight: "Dim Weight",
    fbaEstFee: "Est. FBA Fee",
    fbaOptimize: "Optimization Tip",
    fbaOptimizeDesc: "Reduce {dim} by {amount} to reach",
    fbaTierBoundary: "Tier Boundary",
    fbaViewDocs: "View Amazon Docs",
    fbaSmallStandard: "Small Standard",
    fbaLargeStandard: "Large Standard",
    fbaLargeBulky: "Large Bulky",
    fbaExtraLarge: "Extra Large",
    fbaDimDivisor: "Dim Divisor",
    fbaMaxDims: "Max Dimensions",
    fbaMaxWeight: "Max Weight",
    fbaSavings: "Save approx.",
    fbaPerUnit: "/ unit",
    fbaProductDims: "Product Dimensions",
    fbaProductWeight: "Product Weight",
    fbaOpen3D: "Open 3D View",
    fbaDistanceToNext: "Distance to Next Tier",
    fbaYourProduct: "Your Product",
    fbaTierComparison: "Size Tier Comparison"
  }
};

// --- Constants ---
const CONTAINER_SPECS: Record<ContainerKey, ContainerSpec> = {
  '20gp': { l: 589, w: 235, h: 239, cbm: 33.1 },
  '40gp': { l: 1203, w: 235, h: 239, cbm: 67.5 },
  '40hq': { l: 1203, w: 235, h: 269, cbm: 76.1 }
};

// --- Three.js Helper Hook ---
const useThree = (): boolean => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (window.THREE) {
      setLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.async = true;
    script.onload = () => setLoaded(true);
    document.body.appendChild(script);
    return () => {
      // Cleanup
    };
  }, []);

  return loaded;
};

// --- Algorithms (Advanced) ---

const calculatePackingScenarios = (item: Dimensions, space: Dimensions): PackingScenario[] => {
  // Use Inner Dimensions for the space available
  const { l: cL, w: cW, h: cH } = space;

  if (item.l <= 0 || item.w <= 0 || item.h <= 0 || cL <= 0 || cW <= 0 || cH <= 0) return [];

  const candidates: PackingScenario[] = [];
  const itemVol = item.l * item.w * item.h;
  const spaceVol = cL * cW * cH;

  // Helper: Create a box item definition
  const createItem = (x: number, y: number, z: number, dim: [number, number, number], colorType: number): PackedItem => ({ x, y, z, l: dim[0], w: dim[1], h: dim[2], colorType });

  const orientations: [number, number, number][] = [
    [item.l, item.w, item.h], [item.l, item.h, item.w],
    [item.w, item.l, item.h], [item.w, item.h, item.l],
    [item.h, item.l, item.w], [item.h, item.w, item.l]
  ];

  // 1. SCENARIO A: Standard Orientations
  orientations.forEach((dims) => {
    const cols = Math.floor(cL / dims[0]);
    const rows = Math.floor(cW / dims[1]);
    const layers = Math.floor(cH / dims[2]);
    const count = cols * rows * layers;

    if (count > 0) {
      const items: PackedItem[] = [];
      for (let z = 0; z < layers; z++) {
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            items.push(createItem(x * dims[0], y * dims[1], z * dims[2], dims, 0));
          }
        }
      }

      const usedL = cols * dims[0];
      const usedW = rows * dims[1];
      const usedH = layers * dims[2];

      candidates.push({
        nameKey: "scenarioStandard",
        descKey: "descStandard",
        dims: dims,
        type: 'standard',
        count,
        utilization: (count * itemVol / spaceVol) * 100,
        gaps: { l: cL - usedL, w: cW - usedW, h: cH - usedH },
        items
      });
    }
  });

  // 2. SCENARIO B: Mixed (Gap Filling)
  let bestMixed: Partial<PackingScenario> & { count: number } = { count: 0 };

  orientations.forEach((dims) => {
    const cols = Math.floor(cL / dims[0]);
    const rows = Math.floor(cW / dims[1]);
    const layers = Math.floor(cH / dims[2]);

    const currentItems: PackedItem[] = [];
    for (let z = 0; z < layers; z++) {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          currentItems.push(createItem(x * dims[0], y * dims[1], z * dims[2], dims, 0));
        }
      }
    }

    const usedL = cols * dims[0];
    const remainL = cL - usedL;
    let gapItemsL: PackedItem[] = [];

    if (remainL > 0) {
        const gapOrientations = orientations.filter(d => d[0] <= remainL);
        let bestGapCount = 0;

        gapOrientations.forEach(gDims => {
             const gCols = Math.floor(remainL / gDims[0]);
             const gRows = Math.floor(cW / gDims[1]);
             const gLayers = Math.floor(cH / gDims[2]);
             const gCount = gCols * gRows * gLayers;

             if (gCount > bestGapCount) {
                 bestGapCount = gCount;
                 gapItemsL = [];
                 for (let z = 0; z < gLayers; z++) {
                    for (let y = 0; y < gRows; y++) {
                        for (let x = 0; x < gCols; x++) {
                            gapItemsL.push(createItem(usedL + (x * gDims[0]), y * gDims[1], z * gDims[2], gDims, 1));
                        }
                    }
                 }
             }
        });
        if (gapItemsL.length === 0) gapItemsL = [];
    }

    const totalCount = (cols * rows * layers) + gapItemsL.length;
    if (totalCount > bestMixed.count && gapItemsL.length > 0) {
        bestMixed = {
            nameKey: "scenarioMixed",
            descKey: "descMixed",
            dims: dims,
            type: 'mixed',
            count: totalCount,
            utilization: (totalCount * itemVol / spaceVol) * 100,
            gaps: { l: 0, w: 0, h: 0, isMixed: true },
            items: [...currentItems, ...gapItemsL]
        };
    }
  });
  if (bestMixed.count > 0) candidates.push(bestMixed as PackingScenario);


  // 3. SCENARIO C: Mixed Layers
  let bestLayered: Partial<PackingScenario> & { count: number } = { count: 0 };
  const standingDims = orientations.reduce((prev, curr) => curr[2] > prev[2] ? curr : prev, [0,0,0] as [number, number, number]);
  const flatDims = orientations.reduce((prev, curr) => curr[2] < prev[2] ? curr : prev, [999,999,999] as [number, number, number]);

  if (standingDims[2] !== flatDims[2]) {
      const standingLayers = Math.floor(cH / standingDims[2]);
      for (let i = 1; i <= standingLayers; i++) {
          const hUsed = i * standingDims[2];
          const hRemain = cH - hUsed;

          const sCols = Math.floor(cL / standingDims[0]);
          const sRows = Math.floor(cW / standingDims[1]);
          const sCount = sCols * sRows * i;

          const fLayers = Math.floor(hRemain / flatDims[2]);
          const fCols = Math.floor(cL / flatDims[0]);
          const fRows = Math.floor(cW / flatDims[1]);
          const fCount = fCols * fRows * fLayers;

          const total = sCount + fCount;

          if (total > bestLayered.count) {
              const items: PackedItem[] = [];
              for (let z = 0; z < i; z++) {
                  for (let y = 0; y < sRows; y++) {
                      for (let x = 0; x < sCols; x++) {
                          items.push(createItem(x * standingDims[0], y * standingDims[1], z * standingDims[2], standingDims, 0));
                      }
                  }
              }
              for (let z = 0; z < fLayers; z++) {
                  for (let y = 0; y < fRows; y++) {
                      for (let x = 0; x < fCols; x++) {
                          items.push(createItem(x * flatDims[0], y * flatDims[1], hUsed + (z * flatDims[2]), flatDims, 2));
                      }
                  }
              }
              bestLayered = {
                  nameKey: "scenarioLayered",
                  descKey: "descLayered",
                  dims: standingDims,
                  type: 'layered',
                  count: total,
                  utilization: (total * itemVol / spaceVol) * 100,
                  gaps: { l: 0, w: 0, h: 0, isMixed: true },
                  items: items
              };
          }
      }
  }
  if (bestLayered.count > 0) candidates.push(bestLayered as PackingScenario);

  // Sort Logic: Count DESC, then Utilization DESC
  candidates.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.utilization - a.utilization;
  });

  // Filter Logic
  const finalScenarios: PackingScenario[] = [];
  const seenKeys = new Set<string>();

  const addIfUnique = (sc: PackingScenario) => {
      const key = `${sc.type}-${sc.count}-${sc.utilization.toFixed(2)}`;
      if (!seenKeys.has(key)) {
          finalScenarios.push(sc);
          seenKeys.add(key);
      }
  };

  // Keep Best of All + Best of Specific Types
  if(candidates.length > 0) addIfUnique(candidates[0]);

  const bestM = candidates.find(c => c.type === 'mixed');
  if (bestM) addIfUnique(bestM);

  const bestL = candidates.find(c => c.type === 'layered');
  if (bestL) addIfUnique(bestL);

  // Fill remaining slots
  candidates.filter(c => c.type === 'standard').forEach(c => {
      if(finalScenarios.length < 3) addIfUnique(c);
  });

  finalScenarios.sort((a, b) => b.count - a.count);

  return finalScenarios.slice(0, 3);
};


// --- 3D Visualizer Component ---
const ThreeVisualizer: React.FC<ThreeVisualizerProps> = ({ outer, inner, scenario, units, t, isContainerMode = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const threeLoaded = useThree();
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const initialCameraPosRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const requestRef = useRef<number | null>(null);
  const [isHudExpanded, setIsHudExpanded] = useState(true);

  // Helper to format Metric values to User Units
  const formatDim = (val: number): string => {
    if (units.length === 'inch') {
      return (val / 2.54).toFixed(2);
    }
    return val.toFixed(1);
  };

  // Reset view function
  const handleResetView = useCallback(() => {
    if (cameraRef.current && initialCameraPosRef.current && groupRef.current) {
      const { x, y, z } = initialCameraPosRef.current;
      cameraRef.current.position.set(x, y, z);
      cameraRef.current.lookAt(0, 0, 0);
      groupRef.current.rotation.set(0, 0, 0);
    }
  }, []);

  useEffect(() => {
    if (!threeLoaded || !containerRef.current) return;

    const THREE = window.THREE;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
    // Camera based on OUTER dimensions to fit everything
    const maxDim = Math.max(outer.l, outer.w, outer.h);
    const camX = maxDim * 1.5;
    const camY = maxDim * 1.2;
    const camZ = maxDim * 1.5;
    camera.position.set(camX, camY, camZ);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    initialCameraPosRef.current = { x: camX, y: camY, z: camZ };

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 200, 100);
    scene.add(dirLight);

    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    // 1. Draw Inner Boundary (Packing Space)
    const iGeometry = new THREE.BoxGeometry(inner.l, inner.h, inner.w);
    const iMaterial = new THREE.MeshBasicMaterial({ color: isContainerMode ? 0x93c5fd : 0xe2e8f0, transparent: true, opacity: 0.15, depthWrite: false });
    const iCube = new THREE.Mesh(iGeometry, iMaterial);
    const iEdges = new THREE.EdgesGeometry(iGeometry);
    const iLine = new THREE.LineSegments(iEdges, new THREE.LineBasicMaterial({ color: 0x94a3b8 }));
    group.add(iCube);
    group.add(iLine);

    // 2. Draw Outer Boundary (Physical) - Only if differs
    if (outer.l > inner.l && !isContainerMode) {
        const oGeometry = new THREE.BoxGeometry(outer.l, outer.h, outer.w);
        const oEdges = new THREE.EdgesGeometry(oGeometry);
        const oLine = new THREE.LineSegments(oEdges, new THREE.LineBasicMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.5 }));
        group.add(oLine);
    }

    if (scenario && scenario.items) {
      const colors = isContainerMode
        ? [0xd97706, 0x059669, 0x7c3aed]
        : [0x3b82f6, 0xf97316, 0xa855f7];

      scenario.items.forEach(item => {
        const iGeo = new THREE.BoxGeometry(item.l - 0.2, item.h - 0.2, item.w - 0.2);
        const iMat = new THREE.MeshLambertMaterial({ color: colors[item.colorType] || colors[0] });
        const mesh = new THREE.Mesh(iGeo, iMat);
        const x = item.x - (inner.l / 2) + (item.l / 2);
        const y = item.z - (inner.h / 2) + (item.h / 2);
        const z = item.y - (inner.w / 2) + (item.w / 2);
        mesh.position.set(x, y, z);
        const iEdges = new THREE.EdgesGeometry(iGeo);
        const iLine = new THREE.LineSegments(iEdges, new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.1 }));
        mesh.add(iLine);
        group.add(mesh);
      });
    }

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = () => { isDragging = true; };
    const onMouseUp = () => { isDragging = false; };
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaMove = { x: e.offsetX - previousMousePosition.x, y: e.offsetY - previousMousePosition.y };
        group.rotation.y += deltaMove.x * 0.01;
        group.rotation.x += deltaMove.y * 0.01;
      }
      previousMousePosition = { x: e.offsetX, y: e.offsetY };
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const scale = e.deltaY > 0 ? 1.1 : 0.9;
      const newPos = camera.position.clone().multiplyScalar(scale);
      if (newPos.length() > maxDim * 0.5 && newPos.length() < maxDim * 5) {
          camera.position.copy(newPos);
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('mousemove', onMouseMove);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('touchstart', () => { isDragging = true; }, {passive: true});
    dom.addEventListener('touchend', () => { isDragging = false; }, {passive: true});
    dom.addEventListener('touchmove', (e: TouchEvent) => {
        if(isDragging && e.touches[0]) {
             const touch = e.touches[0];
             const deltaMove = { x: touch.clientX - previousMousePosition.x, y: touch.clientY - previousMousePosition.y };
             group.rotation.y += deltaMove.x * 0.01;
             group.rotation.x += deltaMove.y * 0.01;
             previousMousePosition = { x: touch.clientX, y: touch.clientY };
        }
    }, {passive: true});

    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      if (!isDragging) {
         group.rotation.y += 0.001;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (containerRef.current && renderer.domElement) {
         containerRef.current.removeChild(renderer.domElement);
      }
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [threeLoaded, outer, inner, scenario, isContainerMode]);

  return (
    <div className="w-full h-full relative group cursor-move">
      {!threeLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-400 text-xs">
          Loading 3D Engine...
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />

      {/* HUD - Collapsible panel */}
      <div className={`absolute bottom-2 left-2 md:bottom-4 md:left-4 bg-white/95 backdrop-blur shadow-lg rounded-lg border border-gray-200 text-xs transition-all duration-300 overflow-hidden select-none ${isHudExpanded ? 'w-[160px] md:w-[180px]' : 'w-auto'}`}>
          <div
            className="flex items-center justify-between px-2 py-1.5 md:px-3 md:py-2 bg-gray-50/80 cursor-pointer hover:bg-gray-100 transition-colors active:bg-gray-200"
            onClick={() => setIsHudExpanded(!isHudExpanded)}
          >
             <h5 className="font-bold text-gray-800 flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs">
               <Maximize size={10} className="md:w-3 md:h-3" /> {isHudExpanded ? t('specTitle') : ''}
             </h5>
             {isHudExpanded ? <ChevronDown size={12} className="text-gray-500" /> : <ChevronUp size={12} className="text-gray-500" />}
          </div>

          {isHudExpanded && (
            <div className="p-2 md:p-3 space-y-1.5 md:space-y-2 border-t border-gray-100">
               <div className="space-y-0.5">
                 <div className="flex justify-between items-center text-gray-500 text-[9px] md:text-[10px] font-bold uppercase">
                   <span>{t('cartonLabel')} ({units.length})</span>
                 </div>
                 <div className="font-mono font-bold text-gray-700 text-[10px] md:text-xs">
                   {formatDim(outer.l)} x {formatDim(outer.w)} x {formatDim(outer.h)}
                 </div>
               </div>

               <div className="space-y-0.5">
                 <div className="flex justify-between items-center text-blue-500 text-[9px] md:text-[10px] font-bold uppercase">
                   <span>{t('innerLabel')} ({units.length})</span>
                 </div>
                 <div className="font-mono font-bold text-blue-600 text-[10px] md:text-xs">
                   {formatDim(inner.l)} x {formatDim(inner.w)} x {formatDim(inner.h)}
                 </div>
               </div>

               <div className="w-full h-px bg-gray-200 my-1"></div>

               <div className="space-y-0.5">
                 <div className="flex justify-between items-center text-gray-500 text-[9px] md:text-[10px] font-bold uppercase">
                   <span>{t('productLabel')} ({units.length})</span>
                 </div>
                 {scenario && scenario.dims ? (
                   <div className="font-mono font-bold text-gray-700 text-[10px] md:text-xs">
                     {formatDim(scenario.dims[0])} x {formatDim(scenario.dims[1])} x {formatDim(scenario.dims[2])}
                   </div>
                 ) : (
                    <div className="text-gray-400">-</div>
                 )}
               </div>
               <div className="text-[8px] md:text-[9px] text-gray-400 mt-1 italic hidden md:block">
                  {t('dimNote')}
               </div>
            </div>
          )}
      </div>

      <div className="absolute top-2 right-2 flex items-center gap-1.5 md:gap-2">
        <button
          onClick={handleResetView}
          className="bg-white/95 hover:bg-white active:bg-gray-100 text-gray-700 p-1.5 md:px-2 md:py-1.5 rounded shadow-sm border border-gray-200 text-[10px] font-bold flex items-center gap-1 transition-colors"
          title={t('resetView') || 'Reset View'}
        >
          <RotateCcw size={12} />
          <span className="hidden md:inline">{t('resetView')}</span>
        </button>
        <div className="text-[9px] md:text-[10px] bg-black/60 text-white px-1.5 py-1 md:px-2 rounded pointer-events-none flex items-center gap-1 hidden xs:flex">
          <ZoomIn size={10} /> <span className="hidden md:inline">{t('zoomHint')}</span><span className="md:hidden">{t('zoomHint').split('/')[0]}</span>
        </div>
      </div>
    </div>
  );
};


// --- UI Components ---
const CompactCard: React.FC<CompactCardProps> = ({ children, className = "", style, title, icon: Icon, highlight = false, action = null }) => (
  <div className={`bg-white rounded-lg shadow-sm border ${highlight ? 'border-blue-200 shadow-md' : 'border-gray-200'} flex flex-col h-full ${className}`} style={style}>
    {title && (
      <div className={`px-4 py-3 border-b flex items-center justify-between ${highlight ? 'bg-blue-50/50' : 'bg-gray-50/50'}`}>
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 ${highlight ? 'text-blue-600' : 'text-gray-500'}`} />}
          <h3 className={`font-bold text-sm ${highlight ? 'text-blue-800' : 'text-gray-700'}`}>{title}</h3>
        </div>
        {action}
      </div>
    )}
    <div className="p-4 flex-1 flex flex-col justify-center">
      {children}
    </div>
  </div>
);

const CompactInput: React.FC<CompactInputProps> = ({ label, value, onChange, unit, step = "0.1", className="" }) => (
  <div className={`flex flex-col w-full ${className}`}>
    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">{label}</label>
    <div className="relative flex items-center">
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full h-9 px-3 pr-8 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-800 font-bold transition-all"
      />
      {unit && <span className="absolute right-3 text-[10px] text-gray-400 font-medium pointer-events-none">{unit}</span>}
    </div>
  </div>
);

const StatRow: React.FC<StatRowProps> = ({ label, value, sub, isAlert = false, isSuccess = false }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
    <span className="text-xs text-gray-500 font-medium">{label}</span>
    <div className="text-right">
      <div className={`text-sm font-bold ${isAlert ? 'text-orange-600' : isSuccess ? 'text-green-600' : 'text-gray-800'}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-gray-400 leading-none mt-0.5">{sub}</div>}
    </div>
  </div>
);

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, rates, setRates, dimFactor, setDimFactor, exchangeRate, setExchangeRate, units, customCartons, setCustomCartons, t, onClearData }) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearData = () => {
    if (onClearData) {
      onClearData();
      setShowClearConfirm(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center flex-shrink-0">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Settings className="w-4 h-4" /> {t('settings')}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8">

          {/* Section 1: Rates */}
          <div className="space-y-4">
             <h4 className="text-xs font-bold text-gray-500 uppercase border-b border-gray-100 pb-1">{t('rates')}</h4>
             <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                <div className="flex items-end gap-3">
                    <CompactInput label={`${t('exchangeRate')} (1 USD to RMB)`} value={exchangeRate} onChange={setExchangeRate} />
                    <div className="pb-2 text-xs text-blue-400 font-medium whitespace-nowrap">1 USD = {exchangeRate} RMB</div>
                </div>
             </div>

             {/* Air Freight */}
             <div className="bg-sky-50/50 p-3 rounded-lg border border-sky-100">
                <div className="flex items-center gap-2 mb-2">
                   <Plane size={14} className="text-sky-600" />
                   <span className="text-xs font-bold text-sky-700">{t('airFreight')}</span>
                </div>
                <div className="flex items-end gap-2">
                   <div className="flex-1">
                      <CompactInput label={`${t('unitPriceAir')} /kg`} value={rates.air} onChange={v => setRates({...rates, air: v})} />
                   </div>
                   <div className="flex gap-1 pb-1">
                      <button
                        onClick={() => setRates({...rates, airCurrency: 'USD'})}
                        className={`px-2 py-1.5 text-xs font-bold rounded transition-colors ${rates.airCurrency === 'USD' ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >USD</button>
                      <button
                        onClick={() => setRates({...rates, airCurrency: 'RMB'})}
                        className={`px-2 py-1.5 text-xs font-bold rounded transition-colors ${rates.airCurrency === 'RMB' ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >RMB</button>
                   </div>
                </div>
             </div>

             {/* Sea Freight */}
             <div className="bg-teal-50/50 p-3 rounded-lg border border-teal-100">
                <div className="flex items-center gap-2 mb-2">
                   <Anchor size={14} className="text-teal-600" />
                   <span className="text-xs font-bold text-teal-700">{t('seaFreight')}</span>
                </div>
                <div className="flex items-end gap-2">
                   <div className="flex-1">
                      <CompactInput label={`${t('unitPriceSea')}`} value={rates.sea} onChange={v => setRates({...rates, sea: v})} />
                   </div>
                   <div className="flex flex-col gap-1 pb-1">
                      {/* Unit selection: CBM or KG */}
                      <div className="flex gap-1">
                         <button
                           onClick={() => setRates({...rates, seaUnit: 'cbm'})}
                           className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${rates.seaUnit === 'cbm' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                         >/CBM</button>
                         <button
                           onClick={() => setRates({...rates, seaUnit: 'kg'})}
                           className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${rates.seaUnit === 'kg' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                         >/KG</button>
                      </div>
                      {/* Currency selection */}
                      <div className="flex gap-1">
                         <button
                           onClick={() => setRates({...rates, seaCurrency: 'USD'})}
                           className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${rates.seaCurrency === 'USD' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                         >USD</button>
                         <button
                           onClick={() => setRates({...rates, seaCurrency: 'RMB'})}
                           className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${rates.seaCurrency === 'RMB' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                         >RMB</button>
                      </div>
                   </div>
                </div>
             </div>

             <CompactInput label={t('dimFactor')} value={dimFactor} onChange={setDimFactor} step="1" />
          </div>

          {/* Section 2: Custom Cartons */}
          <div className="space-y-4">
             <div className="flex justify-between items-end border-b border-gray-100 pb-1">
               <h4 className="text-xs font-bold text-gray-500 uppercase">{t('cartonLibrary')}</h4>
               <span className="text-[10px] text-gray-400">Max 5</span>
             </div>
             <div className="space-y-3">
               {customCartons.map((c, idx) => (
                 <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="bg-gray-200 text-gray-500 text-[10px] px-1.5 rounded font-bold">{idx + 1}</div>
                      <input
                        type="text"
                        value={c.labelKey ? t(c.labelKey) : c.name}
                        onChange={(e) => {
                          const newCartons = [...customCartons];
                          newCartons[idx].name = e.target.value;
                          newCartons[idx].labelKey = null;
                          setCustomCartons(newCartons);
                        }}
                        className="flex-1 bg-transparent border-b border-dashed border-gray-300 text-sm font-bold text-gray-700 focus:outline-none focus:border-blue-400"
                        placeholder="Name..."
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                       <CompactInput label={`${t('length')}`} value={c.l} onChange={(v) => {
                          const newCartons = [...customCartons];
                          newCartons[idx].l = v;
                          setCustomCartons(newCartons);
                       }} />
                       <CompactInput label={`${t('width')}`} value={c.w} onChange={(v) => {
                          const newCartons = [...customCartons];
                          newCartons[idx].w = v;
                          setCustomCartons(newCartons);
                       }} />
                       <CompactInput label={`${t('height')}`} value={c.h} onChange={(v) => {
                          const newCartons = [...customCartons];
                          newCartons[idx].h = v;
                          setCustomCartons(newCartons);
                       }} />
                       <CompactInput label={`Wt`} value={c.weight} onChange={(v) => {
                          const newCartons = [...customCartons];
                          newCartons[idx].weight = v;
                          setCustomCartons(newCartons);
                       }} />
                    </div>
                 </div>
               ))}
             </div>
          </div>

          {/* Section 3: Data Management */}
          {onClearData && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase border-b border-gray-100 pb-1 flex items-center gap-2">
                <HardDrive size={12} /> {t('dataSaved')}
              </h4>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-700 mb-3">{t('dataSaved')}</p>
                {!showClearConfirm ? (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="text-xs text-red-600 hover:text-red-700 font-medium underline"
                  >
                    {t('clearData')}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-600">{t('clearDataConfirm')}</span>
                    <button
                      onClick={handleClearData}
                      className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                    >
                      No
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
        <div className="bg-gray-50 px-4 py-3 border-t flex-shrink-0">
          <button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2">
            <Save size={16} />
            {t('saveSettings')}
          </button>
        </div>
      </div>
    </div>
  );
};

const SimulationModal: React.FC<SimulationModalProps> = ({ isOpen, onClose, item, outer, units, onApply, customCartons, rates, dimFactor, exchangeRate, t, cartonThickness, isContainerMode = false }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [simOuter, setSimOuter] = useState<DimensionsWithWeight>(outer);
  const [simItem, setSimItem] = useState<DimensionsWithWeight>(item);
  const [isTuningOpen, setIsTuningOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSimOuter(outer);
      setSimItem(item);
    }
  }, [outer, item, isOpen]);

  const packingSpace = useMemo((): Dimensions => {
      if (isContainerMode) return simOuter;

      let metricThickness = 0;
      if (cartonThickness) {
         metricThickness = units.length === 'inch' ? cartonThickness * 2.54 : cartonThickness;
      }

      return {
          l: Math.max(0, simOuter.l - (metricThickness * 2)),
          w: Math.max(0, simOuter.w - (metricThickness * 2)),
          h: Math.max(0, simOuter.h - (metricThickness * 2)),
      };
  }, [simOuter, cartonThickness, units, isContainerMode]);

  const scenarios = useMemo(() => {
    return calculatePackingScenarios(simItem, packingSpace);
  }, [simItem, packingSpace]);

  const current = scenarios[selectedIdx] || null;

  const fromMetricL = (val: number): number => units.length === 'inch' ? val / 2.54 : val;
  const fromMetricW = (val: number): number => units.weight === 'lb' ? val / 0.453592 : val;
  const displayLength = (val: number): string => `${fromMetricL(val).toFixed(2)} ${units.length}`;
  const displayWeight = (val: number): string => `${fromMetricW(val).toFixed(2)} ${units.weight}`;
  const convertRate = (amount: number, fromCurr: Currency): number => {
    if (fromCurr === units.currency) return amount;
    if (fromCurr === 'USD' && units.currency === 'RMB') return amount * exchangeRate;
    if (fromCurr === 'RMB' && units.currency === 'USD') return amount / exchangeRate;
    return amount;
  };
  const displayMoney = (val: number): string => `${units.currency} ${val.toFixed(2)}`;

  const getUnitCosts = (sc: PackingScenario): { air: number; sea: number } => {
      if (isContainerMode) return { air: 0, sea: 0 };

      const count = sc.count;
      if (!count) return { air: 0, sea: 0 };

      const scGross = (count * simItem.weight) + simOuter.weight;
      const vol = simOuter.l * simOuter.w * simOuter.h;
      const dimW = vol / dimFactor;
      const chgAir = Math.max(scGross, dimW);

      const airRateVal = convertRate(rates.air, rates.airCurrency);
      const totalAir = chgAir * airRateVal;

      const seaRateVal = convertRate(rates.sea, rates.seaCurrency);
      let totalSea = 0;
      if (rates.seaUnit === 'cbm') {
          const cbm = vol / 1000000;
          totalSea = Math.max(cbm, 0.001) * seaRateVal;
      } else {
          totalSea = scGross * seaRateVal;
      }
      return { air: totalAir / count, sea: totalSea / count };
  };

  const handleTune = (dim: 'l' | 'w' | 'h', delta: number) => {
    let deltaMetric = delta;
    if (units.length === 'inch') deltaMetric = delta * 2.54;
    setSimItem(prev => ({ ...prev, [dim]: Math.max(0.1, prev[dim] + deltaMetric) }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-full flex items-start md:items-center justify-center p-2 md:p-6">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl flex flex-col animate-in fade-in zoom-in duration-200 my-2 md:my-0 md:max-h-[90vh] md:overflow-hidden">

          <div className="bg-white px-4 md:px-5 py-3 md:py-4 border-b flex justify-between items-center shadow-sm z-10 sticky top-0 rounded-t-xl">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg md:text-xl">
                <Cuboid className="w-5 h-5 md:w-6 md:h-6 text-blue-600" /> 3D Simulation
              </h3>
              <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">{t('subtitle')}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5 md:w-6 md:h-6 text-gray-500" /></button>
          </div>

          <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden bg-slate-50">
            <div className="relative bg-gradient-to-br from-slate-200 to-slate-300 shadow-inner h-[250px] md:h-auto md:flex-1 md:min-h-[400px]">
             <ThreeVisualizer outer={simOuter} inner={packingSpace} scenario={current} units={units} t={t} isContainerMode={isContainerMode} />
             <div className="absolute top-4 left-4 bg-white/90 backdrop-blur p-2 rounded-lg shadow-sm border border-white/50 text-[10px] space-y-1">
                <div className="font-bold text-gray-600 mb-1">{t('orientationLabel')}</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div> {t('legendStandard')}</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500"></div> {t('legendGap')}</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-500"></div> {t('legendLayered')}</div>
             </div>
            </div>

          <div className="w-full md:w-96 bg-white border-t md:border-t-0 md:border-l border-gray-200 flex flex-col md:overflow-y-auto">
            <div className="p-3 md:p-4 border-b border-gray-100 bg-gray-50/50">
               <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                 {isContainerMode ? t('containerSelection') : t('selectCarton')}
               </h4>
               <select
                  className="w-full text-sm border-gray-300 rounded-md shadow-sm border p-2 mb-2 font-bold text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                  onChange={(e) => {
                     const val = e.target.value;
                     if (isContainerMode) {
                        const spec = CONTAINER_SPECS[val as ContainerKey];
                        if(spec) setSimOuter({...spec, weight: 0});
                     } else {
                        if (val === 'custom') { setSimOuter(outer); }
                        else {
                           const std = customCartons[parseInt(val)];
                           let m: DimensionsWithWeight = {l:std.l, w:std.w, h:std.h, weight:std.weight};
                           if(units.length==='inch') { m.l*=2.54; m.w*=2.54; m.h*=2.54; }
                           if(units.weight==='lb') { m.weight*=0.453592; }
                           setSimOuter(m);
                        }
                     }
                  }}
                  defaultValue={isContainerMode ? '20gp' : 'custom'}
               >
                 {isContainerMode ? (
                   <>
                     <option value="20gp">{t('container20gp')}</option>
                     <option value="40gp">{t('container40gp')}</option>
                     <option value="40hq">{t('container40hq')}</option>
                   </>
                 ) : (
                   <>
                     <option value="custom">{t('currentCarton')}</option>
                     {customCartons && customCartons.map((c, i) => (
                        <option key={i} value={i}>{t('customCarton')} {i+1}: {c.labelKey ? t(c.labelKey) : c.name}</option>
                     ))}
                   </>
                 )}
               </select>
               <div className="flex justify-between text-[10px] text-gray-500 bg-white p-2 rounded border border-gray-200">
                  <div>
                    <span className="block font-bold text-gray-400">{t('dims')}:</span>
                    {displayLength(simOuter.l)} x {displayLength(simOuter.w)} x {displayLength(simOuter.h)}
                  </div>
                  {!isContainerMode && (
                    <div className="text-right">
                      <span className="block font-bold text-gray-400">{t('grossWt')}:</span>
                      {displayWeight((current?.count || 0) * simItem.weight + simOuter.weight)}
                    </div>
                  )}
               </div>
            </div>

            <div className="border-b border-gray-100">
               <button onClick={() => setIsTuningOpen(!isTuningOpen)} className="w-full flex items-center justify-between p-3 bg-white hover:bg-gray-50 transition-colors">
                 <div className="flex items-center gap-2">
                    <div className="bg-purple-100 p-1 rounded text-purple-600"><Edit3 size={14} /></div>
                    <div className="text-left">
                       <div className="text-xs font-bold text-gray-700">{t('tuneProduct')}</div>
                       <div className="text-[9px] text-gray-400">{t('tuneDesc')}</div>
                    </div>
                 </div>
                 {isTuningOpen ? <ChevronUp size={14} className="text-gray-400"/> : <ChevronDown size={14} className="text-gray-400"/>}
               </button>
               {isTuningOpen && (
                 <div className="p-3 bg-purple-50/30 grid grid-cols-3 gap-2 animate-in slide-in-from-top-2 duration-200">
                    {(['l', 'w', 'h'] as const).map(dim => (
                      <div key={dim} className="bg-white border border-purple-100 rounded p-1.5 flex flex-col items-center">
                         <span className="text-[9px] font-bold text-purple-400 uppercase mb-1">{t(dim==='l'?'length':dim==='w'?'width':'height')}</span>
                         <div className="font-mono text-sm font-bold text-gray-800 mb-1">{displayLength(simItem[dim])}</div>
                         <div className="flex gap-1 w-full">
                            <button onClick={() => handleTune(dim, -0.1)} className="flex-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] h-5">-</button>
                            <button onClick={() => handleTune(dim, 0.1)} className="flex-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] h-5">+</button>
                         </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>

            <div className="p-3 md:p-4 border-b border-gray-100 md:flex-1 md:overflow-hidden flex flex-col">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 md:mb-3 flex-shrink-0">{t('scenarios')}</h4>
              <div className="space-y-2 md:overflow-y-auto md:flex-1 pr-1">
                {scenarios.map((sc, idx) => {
                  const costs = !isContainerMode ? getUnitCosts(sc) : null;
                  return (
                    <button key={idx} onClick={() => setSelectedIdx(idx)} className={`w-full text-left p-3 rounded-lg border transition-all flex justify-between items-start group relative ${selectedIdx === idx ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}>
                      {idx === 0 && <div className="absolute -top-2 -right-1 bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">{t('best')}</div>}
                      <div className="flex-1 min-w-0 pr-2">
                        <div className={`font-bold text-sm truncate ${selectedIdx === idx ? 'text-blue-800' : 'text-gray-700'}`}>{t(sc.nameKey)}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5 truncate">{t(sc.descKey)}</div>
                        {costs && (
                          <div className="flex flex-wrap gap-2 mt-2">
                             <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold"><Plane size={10} /> {displayMoney(costs.air)}</div>
                             <div className="flex items-center gap-1 bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded text-[10px] font-bold"><Anchor size={10} /> {displayMoney(costs.sea)}</div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-right pl-2 border-l border-gray-100 ml-1">
                          <div className="flex flex-col items-end">
                             <span className={`text-xl font-black ${sc.utilization > 85 ? 'text-green-600' : sc.utilization > 70 ? 'text-blue-600' : 'text-orange-500'}`}>{sc.utilization.toFixed(0)}%</span>
                             <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Util.</span>
                          </div>
                          <div className="flex flex-col items-end min-w-[30px]">
                             <span className={`text-lg font-bold ${selectedIdx === idx ? 'text-gray-800' : 'text-gray-500'}`}>{sc.count}</span>
                             <span className="text-[9px] text-gray-400 font-bold uppercase">{t('pcs')}</span>
                          </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 md:p-4 border-t border-gray-100 bg-gray-50 flex-shrink-0 space-y-2">
               {!isContainerMode && (
                 <button onClick={() => onApply(simOuter)} className="w-full py-2.5 bg-blue-600 border border-transparent text-white font-bold rounded-lg shadow-sm hover:bg-blue-700 transition-all text-sm flex items-center justify-center gap-2 active:scale-[0.98]">
                   <CheckCircle size={16} /> {t('applyCarton')}
                 </button>
               )}
               <button onClick={onClose} className="w-full py-2.5 md:py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg shadow-sm hover:bg-gray-50 text-sm active:scale-[0.98]">{t('close')}</button>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== FBA Size Tier 3D Visualization Modal =====
const FbaSimulationModal: React.FC<FbaSimulationModalProps> = ({
  isOpen,
  onClose,
  product,
  onProductChange,
  currentTier,
  allTiers,
  sortedDims,
  billableWeight,
  t,
  lang
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const threeLoaded = useThree();
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const initialCameraPosRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const requestRef = useRef<number | null>(null);
  const lockVerticalRef = useRef(false);

  const [selectedTierIdx, setSelectedTierIdx] = useState(0);
  const [isLegendExpanded, setIsLegendExpanded] = useState(false); // Default collapsed on mobile
  const [lockVertical, setLockVertical] = useState(false);
  const [isSlidersExpanded, setIsSlidersExpanded] = useState(true);

  // Local state for sliders (so they update immediately)
  const [localDims, setLocalDims] = useState({ l: product.l, w: product.w, h: product.h, weight: product.weight });

  // Sync localDims when product changes externally
  useEffect(() => {
    setLocalDims({ l: product.l, w: product.w, h: product.h, weight: product.weight });
  }, [product]);

  // Update lockVerticalRef when state changes
  useEffect(() => {
    lockVerticalRef.current = lockVertical;
  }, [lockVertical]);

  // Only show first 3 tiers (Small Standard, Large Standard, Large Bulky) - the ones with meaningful dimension limits
  const displayTiers = allTiers.slice(0, 3);

  // Zoom functions
  const handleZoomIn = useCallback(() => {
    if (cameraRef.current) {
      const newPos = cameraRef.current.position.clone().multiplyScalar(0.8);
      if (newPos.length() > 30) {
        cameraRef.current.position.copy(newPos);
      }
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (cameraRef.current) {
      const newPos = cameraRef.current.position.clone().multiplyScalar(1.25);
      if (newPos.length() < 300) {
        cameraRef.current.position.copy(newPos);
      }
    }
  }, []);

  // Reset view function
  const handleResetView = useCallback(() => {
    if (cameraRef.current && initialCameraPosRef.current && groupRef.current) {
      const { x, y, z } = initialCameraPosRef.current;
      cameraRef.current.position.set(x, y, z);
      cameraRef.current.lookAt(0, 0, 0);
      groupRef.current.rotation.set(0, 0, 0);
    }
  }, []);

  // Handle slider change with debounced update to parent
  const handleSliderChange = useCallback((dim: 'l' | 'w' | 'h' | 'weight', value: number) => {
    const newDims = { ...localDims, [dim]: value };
    setLocalDims(newDims);
    // Update parent immediately for real-time 3D update
    onProductChange({ l: newDims.l, w: newDims.w, h: newDims.h, weight: newDims.weight });
  }, [localDims, onProductChange]);

  // Quick set to tier boundary
  const handleSetToTier = useCallback((tierIdx: number) => {
    const tier = displayTiers[tierIdx];
    if (!tier) return;
    // Set dimensions to just fit within the tier
    const newDims = {
      l: Math.min(localDims.l, tier.maxDims.longest - 0.1),
      w: Math.min(localDims.w, tier.maxDims.median - 0.1),
      h: Math.min(localDims.h, tier.maxDims.shortest - 0.1),
      weight: Math.min(localDims.weight, tier.maxWeight - 0.1)
    };
    setLocalDims(newDims);
    onProductChange(newDims);
  }, [displayTiers, localDims, onProductChange]);

  useEffect(() => {
    if (!isOpen) return;
    // Find current tier index
    const idx = displayTiers.findIndex(t => t.tier === currentTier.tier);
    setSelectedTierIdx(idx >= 0 ? idx : 0);
  }, [isOpen, currentTier, displayTiers]);

  useEffect(() => {
    if (!threeLoaded || !containerRef.current || !isOpen) return;

    const THREE = window.THREE;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1e293b); // Dark slate background
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
    // Camera position based on largest tier boundary
    const maxDim = 60; // Large Bulky is ~59 inches
    const camX = maxDim * 1.8;
    const camY = maxDim * 1.2;
    const camZ = maxDim * 1.8;
    camera.position.set(camX, camY, camZ);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    initialCameraPosRef.current = { x: camX, y: camY, z: camZ };

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 200, 100);
    scene.add(dirLight);
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight2.position.set(-100, 100, -100);
    scene.add(dirLight2);

    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    // Draw tier boundary boxes (from largest to smallest for proper layering)
    const tiersToDraw = [...displayTiers].reverse();
    tiersToDraw.forEach((tier, idx) => {
      const reversedIdx = displayTiers.length - 1 - idx;
      const dims = tier.maxDims;
      // Use actual dimension limits (longest, median, shortest)
      const boxL = dims.longest;
      const boxW = dims.median;
      const boxH = dims.shortest;

      const geometry = new THREE.BoxGeometry(boxL, boxH, boxW);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(tier.color),
        transparent: true,
        opacity: selectedTierIdx === reversedIdx ? 0.25 : 0.08,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(0, boxH / 2, 0); // Sit on ground plane
      group.add(mesh);

      // Edge lines
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(tier.color),
        transparent: true,
        opacity: selectedTierIdx === reversedIdx ? 1 : 0.4,
        linewidth: 2,
      });
      const line = new THREE.LineSegments(edges, lineMaterial);
      line.position.copy(mesh.position);
      group.add(line);
    });

    // Draw user's product (solid colored box)
    const [pL, pM, pS] = sortedDims; // longest, median, shortest
    const productGeometry = new THREE.BoxGeometry(pL, pS, pM);
    const productMaterial = new THREE.MeshLambertMaterial({
      color: 0xfbbf24, // Amber color
      transparent: false,
    });
    const productMesh = new THREE.Mesh(productGeometry, productMaterial);
    productMesh.position.set(0, pS / 2, 0); // Sit on ground plane
    group.add(productMesh);

    // Product edges
    const productEdges = new THREE.EdgesGeometry(productGeometry);
    const productLine = new THREE.LineSegments(
      productEdges,
      new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.5, transparent: true })
    );
    productLine.position.copy(productMesh.position);
    group.add(productLine);

    // Ground plane (grid)
    const gridHelper = new THREE.GridHelper(80, 20, 0x475569, 0x334155);
    group.add(gridHelper);

    // Mouse/touch interaction
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = () => { isDragging = true; };
    const onMouseUp = () => { isDragging = false; };
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaMove = { x: e.offsetX - previousMousePosition.x, y: e.offsetY - previousMousePosition.y };
        group.rotation.y += deltaMove.x * 0.01;
        // Only apply vertical rotation if not locked
        if (!lockVerticalRef.current) {
          group.rotation.x += deltaMove.y * 0.005;
          group.rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, group.rotation.x));
        }
      }
      previousMousePosition = { x: e.offsetX, y: e.offsetY };
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const scale = e.deltaY > 0 ? 1.1 : 0.9;
      const newPos = camera.position.clone().multiplyScalar(scale);
      if (newPos.length() > maxDim * 0.5 && newPos.length() < maxDim * 4) {
        camera.position.copy(newPos);
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('mousemove', onMouseMove);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('touchstart', () => { isDragging = true; }, { passive: true });
    dom.addEventListener('touchend', () => { isDragging = false; }, { passive: true });
    dom.addEventListener('touchmove', (e: TouchEvent) => {
      if (isDragging && e.touches[0]) {
        const touch = e.touches[0];
        const deltaMove = { x: touch.clientX - previousMousePosition.x, y: touch.clientY - previousMousePosition.y };
        group.rotation.y += deltaMove.x * 0.01;
        // Only apply vertical rotation if not locked
        if (!lockVerticalRef.current) {
          group.rotation.x += deltaMove.y * 0.005;
          group.rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, group.rotation.x));
        }
        previousMousePosition = { x: touch.clientX, y: touch.clientY };
      }
    }, { passive: true });

    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      if (!isDragging) {
        group.rotation.y += 0.002;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (containerRef.current && renderer.domElement) {
        try {
          containerRef.current.removeChild(renderer.domElement);
        } catch (e) { /* ignore */ }
      }
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [threeLoaded, isOpen, sortedDims, displayTiers, currentTier, selectedTierIdx]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-full flex items-start md:items-center justify-center p-2 md:p-6">
        <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-5xl flex flex-col animate-in fade-in zoom-in duration-200 my-2 md:my-0 md:max-h-[90vh] md:overflow-hidden">

          {/* Header */}
          <div className="bg-slate-800 px-4 md:px-5 py-3 md:py-4 border-b border-slate-700 flex justify-between items-center shadow-sm z-10 sticky top-0 rounded-t-xl">
            <div>
              <h3 className="font-bold text-white flex items-center gap-2 text-lg md:text-xl">
                <Cuboid className="w-5 h-5 md:w-6 md:h-6 text-amber-400" />
                FBA Size Tier Visualization
              </h3>
              <p className="text-[10px] md:text-xs text-slate-400 mt-0.5 md:mt-1">
                {lang === 'zh' ? '視覺化你的產品與各 Tier 邊界的比較' : 'Visualize your product against tier boundaries'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
              <X className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
            </button>
          </div>

          <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden">
            {/* 3D View */}
            <div className="relative h-[300px] md:h-auto md:flex-1 md:min-h-[450px]">
              {!threeLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-slate-400 text-xs">
                  Loading 3D Engine...
                </div>
              )}
              <div ref={containerRef} className="w-full h-full cursor-move" />

              {/* Legend overlay - Collapsible */}
              <div className={`absolute top-2 left-2 md:top-4 md:left-4 bg-slate-800/95 backdrop-blur rounded-lg shadow-lg border border-slate-700 text-xs transition-all duration-300 overflow-hidden select-none ${isLegendExpanded ? 'w-auto' : 'w-auto'}`}>
                <div
                  className="flex items-center justify-between gap-2 px-2 py-1.5 md:px-3 md:py-2 cursor-pointer hover:bg-slate-700/50 transition-colors active:bg-slate-700"
                  onClick={() => setIsLegendExpanded(!isLegendExpanded)}
                >
                  <div className="font-bold text-slate-300 flex items-center gap-1.5 text-[10px] md:text-xs">
                    <Layers size={12} className="text-amber-400 md:w-3.5 md:h-3.5" />
                    {isLegendExpanded ? (lang === 'zh' ? '圖例' : 'Legend') : ''}
                  </div>
                  {isLegendExpanded ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
                </div>
                {isLegendExpanded && (
                  <div className="px-2 pb-2 md:px-3 md:pb-3 space-y-1.5 md:space-y-2 border-t border-slate-700/50">
                    <div className="flex items-center gap-2 mt-1.5 md:mt-2">
                      <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-amber-400"></div>
                      <span className="text-slate-300 text-[10px] md:text-xs">{lang === 'zh' ? '你的產品' : 'Your Product'}</span>
                    </div>
                    {displayTiers.map((tier) => (
                      <div key={tier.tier} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 md:w-4 md:h-4 rounded border-2"
                          style={{ borderColor: tier.color, backgroundColor: `${tier.color}33` }}
                        ></div>
                        <span className="text-slate-300 text-[10px] md:text-xs">{lang === 'zh' ? tier.nameZh : tier.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right side controls - Zoom + Lock */}
              <div className="absolute top-2 right-2 md:top-4 md:right-4 flex flex-col gap-1.5 md:gap-2">
                <button
                  onClick={handleZoomIn}
                  className="bg-slate-700/90 hover:bg-slate-600 active:bg-slate-500 text-white w-8 h-8 md:w-9 md:h-9 rounded flex items-center justify-center transition-colors shadow-lg"
                  title={lang === 'zh' ? '放大' : 'Zoom In'}
                >
                  <ZoomIn size={16} className="md:w-5 md:h-5" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="bg-slate-700/90 hover:bg-slate-600 active:bg-slate-500 text-white w-8 h-8 md:w-9 md:h-9 rounded flex items-center justify-center transition-colors shadow-lg"
                  title={lang === 'zh' ? '縮小' : 'Zoom Out'}
                >
                  <ZoomOut size={16} className="md:w-5 md:h-5" />
                </button>
                <button
                  onClick={() => setLockVertical(!lockVertical)}
                  className={`w-8 h-8 md:w-9 md:h-9 rounded flex items-center justify-center transition-colors shadow-lg ${
                    lockVertical
                      ? 'bg-amber-500 hover:bg-amber-400 text-white'
                      : 'bg-slate-700/90 hover:bg-slate-600 text-white'
                  }`}
                  title={lang === 'zh' ? (lockVertical ? '解鎖垂直旋轉' : '鎖定垂直旋轉') : (lockVertical ? 'Unlock Vertical' : 'Lock Vertical')}
                >
                  {lockVertical ? <Lock size={14} className="md:w-4 md:h-4" /> : <Unlock size={14} className="md:w-4 md:h-4" />}
                </button>
              </div>

              {/* Bottom controls */}
              <div className="absolute bottom-2 left-2 right-2 md:bottom-4 md:left-4 md:right-4 flex items-center justify-between gap-2">
                <div className="bg-slate-800/80 backdrop-blur px-2 py-1 md:px-3 md:py-1.5 rounded text-[9px] md:text-[10px] text-slate-400 hidden xs:block">
                  {lang === 'zh' ? '拖曳旋轉' : 'Drag to rotate'}{lockVertical && (lang === 'zh' ? ' (垂直已鎖定)' : ' (V-locked)')}
                </div>
                <button
                  onClick={handleResetView}
                  className="bg-slate-700/90 hover:bg-slate-600 active:bg-slate-500 text-white px-2 py-1 md:px-3 md:py-1.5 rounded text-[10px] md:text-[11px] font-bold flex items-center gap-1 md:gap-1.5 transition-colors shadow-lg ml-auto"
                  title={t('resetView')}
                >
                  <RotateCcw size={12} className="md:w-3.5 md:h-3.5" />
                  <span className="hidden xs:inline">{lang === 'zh' ? '重置視角' : 'Reset'}</span>
                </button>
              </div>
            </div>

            {/* Side Panel */}
            <div className="w-full md:w-80 bg-slate-800 border-t md:border-t-0 md:border-l border-slate-700 flex flex-col md:overflow-y-auto">

              {/* Your Product Info */}
              <div className="p-4 border-b border-slate-700">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Package size={14} />
                  {lang === 'zh' ? '你的產品' : 'Your Product'}
                </h4>
                <div className="bg-slate-900 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{lang === 'zh' ? '尺寸 (已排序)' : 'Dimensions (sorted)'}</span>
                    <span className="font-mono font-bold text-white">
                      {sortedDims[0].toFixed(1)}" × {sortedDims[1].toFixed(1)}" × {sortedDims[2].toFixed(1)}"
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{lang === 'zh' ? '計費重量' : 'Billable Weight'}</span>
                    <span className="font-mono font-bold text-white">{billableWeight.toFixed(2)} lb</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{lang === 'zh' ? '當前等級' : 'Current Tier'}</span>
                    <span className="font-bold" style={{ color: currentTier.color }}>
                      {lang === 'zh' ? currentTier.nameZh : currentTier.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dimension Sliders - Real-time adjustment */}
              <div className="border-b border-slate-700">
                <div
                  className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer hover:bg-slate-700/30 transition-colors active:bg-slate-700/50"
                  onClick={() => setIsSlidersExpanded(!isSlidersExpanded)}
                >
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wide flex items-center gap-2">
                    <Sliders size={14} />
                    {lang === 'zh' ? '即時調整尺寸' : 'Adjust Dimensions'}
                  </h4>
                  {isSlidersExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>
                {isSlidersExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {/* Length Slider */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">{lang === 'zh' ? '長度' : 'Length'}</span>
                        <span className="font-mono text-white">{localDims.l.toFixed(1)}"</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="60"
                        step="0.1"
                        value={localDims.l}
                        onChange={(e) => handleSliderChange('l', parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                    {/* Width Slider */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">{lang === 'zh' ? '闊度' : 'Width'}</span>
                        <span className="font-mono text-white">{localDims.w.toFixed(1)}"</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="30"
                        step="0.1"
                        value={localDims.w}
                        onChange={(e) => handleSliderChange('w', parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                    {/* Height Slider */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">{lang === 'zh' ? '高度' : 'Height'}</span>
                        <span className="font-mono text-white">{localDims.h.toFixed(1)}"</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="30"
                        step="0.1"
                        value={localDims.h}
                        onChange={(e) => handleSliderChange('h', parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                    {/* Weight Slider */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">{lang === 'zh' ? '重量' : 'Weight'}</span>
                        <span className="font-mono text-white">{localDims.weight.toFixed(2)} lb</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="50"
                        step="0.1"
                        value={localDims.weight}
                        onChange={(e) => handleSliderChange('weight', parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                      />
                    </div>
                    {/* Quick Set to Tier Buttons */}
                    <div className="pt-2 border-t border-slate-700/50">
                      <div className="text-[10px] text-slate-500 uppercase mb-2">{lang === 'zh' ? '快速設定至 Tier 邊界' : 'Quick Set to Tier'}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {displayTiers.map((tier, idx) => (
                          <button
                            key={tier.tier}
                            onClick={() => handleSetToTier(idx)}
                            className="text-[10px] px-2 py-1 rounded border transition-colors"
                            style={{
                              borderColor: tier.color,
                              color: tier.color,
                              backgroundColor: `${tier.color}15`
                            }}
                          >
                            {lang === 'zh' ? tier.nameZh : tier.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Distance to Lower Tier - Show optimization hints */}
              {(() => {
                // Find the tier just below current
                const currentIdx = displayTiers.findIndex(t => t.tier === currentTier.tier);
                if (currentIdx <= 0) return null; // Already at lowest tier or not found

                const lowerTier = displayTiers[currentIdx - 1];
                const [pL, pM, pS] = sortedDims;

                // Calculate how much needs to be reduced for each dimension
                const longestDiff = pL - lowerTier.maxDims.longest;
                const medianDiff = pM - lowerTier.maxDims.median;
                const shortestDiff = pS - lowerTier.maxDims.shortest;
                const weightDiff = billableWeight - lowerTier.maxWeight;

                // Find which dimensions are blocking
                const blockers = [];
                if (longestDiff > 0) blockers.push({ dim: 'Longest', diff: longestDiff, limit: lowerTier.maxDims.longest });
                if (medianDiff > 0) blockers.push({ dim: 'Median', diff: medianDiff, limit: lowerTier.maxDims.median });
                if (shortestDiff > 0) blockers.push({ dim: 'Shortest', diff: shortestDiff, limit: lowerTier.maxDims.shortest });
                if (weightDiff > 0) blockers.push({ dim: 'Weight', diff: weightDiff, limit: lowerTier.maxWeight, isWeight: true });

                if (blockers.length === 0) return null;

                const feeSaving = currentTier.baseFee - lowerTier.baseFee;

                return (
                  <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-green-900/20 to-slate-800">
                    <h4 className="text-xs font-bold text-green-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Lightbulb size={14} />
                      {lang === 'zh' ? '降級優化建議' : 'Tier Down Tips'}
                    </h4>
                    <div className="text-xs text-slate-300 mb-3">
                      {lang === 'zh'
                        ? `調整以下尺寸可降至 ${lowerTier.nameZh}，節省約 $${feeSaving.toFixed(2)}/件`
                        : `Adjust to reach ${lowerTier.name} and save ~$${feeSaving.toFixed(2)}/unit`
                      }
                    </div>
                    <div className="space-y-2">
                      {blockers.map((b, i) => (
                        <div key={i} className="bg-slate-900/80 rounded p-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ArrowRight size={12} className="text-green-400" />
                            <span className="text-slate-400 text-xs">{b.dim}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-red-400 font-mono text-xs">-{b.diff.toFixed(1)}{b.isWeight ? ' lb' : '"'}</span>
                            <span className="text-slate-500 text-[10px] ml-1">
                              → {b.limit}{b.isWeight ? ' lb' : '"'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Tier Selector */}
              <div className="p-4 border-b border-slate-700">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Ruler size={14} />
                  {lang === 'zh' ? '選擇查看等級' : 'Select Tier to View'}
                </h4>
                <div className="space-y-2">
                  {displayTiers.map((tier, idx) => {
                    const isCurrentTier = tier.tier === currentTier.tier;
                    const [pL, pM, pS] = sortedDims;
                    const fitsAll = pL <= tier.maxDims.longest &&
                                    pM <= tier.maxDims.median &&
                                    pS <= tier.maxDims.shortest &&
                                    billableWeight <= tier.maxWeight;

                    return (
                      <button
                        key={tier.tier}
                        onClick={() => setSelectedTierIdx(idx)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          selectedTierIdx === idx
                            ? 'border-amber-400 bg-slate-700'
                            : 'border-slate-600 bg-slate-900 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: tier.color }}
                            />
                            <span className="font-bold text-white text-sm">
                              {lang === 'zh' ? tier.nameZh : tier.name}
                            </span>
                          </div>
                          {fitsAll ? (
                            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-bold">
                              {lang === 'zh' ? '符合' : 'FITS'}
                            </span>
                          ) : (
                            <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-bold">
                              {lang === 'zh' ? '超出' : 'EXCEEDS'}
                            </span>
                          )}
                        </div>
                        {isCurrentTier && (
                          <div className="mt-1 text-[10px] text-amber-400">
                            ← {lang === 'zh' ? '你的產品在此等級' : 'Your product is here'}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Tier Details */}
              <div className="p-4 flex-1">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Info size={14} />
                  {lang === 'zh' ? '等級限制' : 'Tier Limits'}
                </h4>
                {displayTiers[selectedTierIdx] && (
                  <div className="bg-slate-900 rounded-lg p-3 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-800 rounded p-2">
                        <div className="text-[10px] text-slate-500 uppercase">Longest</div>
                        <div className="font-mono font-bold text-white">{displayTiers[selectedTierIdx].maxDims.longest}"</div>
                        <div className={`text-[10px] mt-1 ${sortedDims[0] <= displayTiers[selectedTierIdx].maxDims.longest ? 'text-green-400' : 'text-red-400'}`}>
                          ({sortedDims[0] <= displayTiers[selectedTierIdx].maxDims.longest ? '✓' : '✗'} {sortedDims[0].toFixed(1)}")
                        </div>
                      </div>
                      <div className="bg-slate-800 rounded p-2">
                        <div className="text-[10px] text-slate-500 uppercase">Median</div>
                        <div className="font-mono font-bold text-white">{displayTiers[selectedTierIdx].maxDims.median}"</div>
                        <div className={`text-[10px] mt-1 ${sortedDims[1] <= displayTiers[selectedTierIdx].maxDims.median ? 'text-green-400' : 'text-red-400'}`}>
                          ({sortedDims[1] <= displayTiers[selectedTierIdx].maxDims.median ? '✓' : '✗'} {sortedDims[1].toFixed(1)}")
                        </div>
                      </div>
                      <div className="bg-slate-800 rounded p-2">
                        <div className="text-[10px] text-slate-500 uppercase">Shortest</div>
                        <div className="font-mono font-bold text-white">{displayTiers[selectedTierIdx].maxDims.shortest}"</div>
                        <div className={`text-[10px] mt-1 ${sortedDims[2] <= displayTiers[selectedTierIdx].maxDims.shortest ? 'text-green-400' : 'text-red-400'}`}>
                          ({sortedDims[2] <= displayTiers[selectedTierIdx].maxDims.shortest ? '✓' : '✗'} {sortedDims[2].toFixed(1)}")
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-800 rounded p-2 text-center">
                      <div className="text-[10px] text-slate-500 uppercase">Max Weight</div>
                      <div className="font-mono font-bold text-white">{displayTiers[selectedTierIdx].maxWeight} lb</div>
                      <div className={`text-[10px] mt-1 ${billableWeight <= displayTiers[selectedTierIdx].maxWeight ? 'text-green-400' : 'text-red-400'}`}>
                        ({billableWeight <= displayTiers[selectedTierIdx].maxWeight ? '✓' : '✗'} {billableWeight.toFixed(2)} lb)
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-700 flex justify-between items-center">
                      <span className="text-slate-400 text-sm">{lang === 'zh' ? '基礎費用' : 'Base Fee'}</span>
                      <span className="font-bold text-lg" style={{ color: displayTiers[selectedTierIdx].color }}>
                        ${displayTiers[selectedTierIdx].baseFee.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="p-4 border-t border-slate-700">
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-slate-700 border border-slate-600 text-white font-bold rounded-lg hover:bg-slate-600 transition-colors"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CalculatorProps {
  fixedMode?: Mode;
  hideHeader?: boolean;
}

export default function LogisticsCalculator({ fixedMode, hideHeader = false }: CalculatorProps) {
  // --- Default Values ---
  const defaultUnits: Units = { length: 'cm', weight: 'kg', currency: 'USD' };
  const defaultRates: Rates = { air: 6.5, airCurrency: 'USD', sea: 200, seaCurrency: 'USD', seaUnit: 'cbm' };
  const defaultCustomCartons: CustomCarton[] = [
    { labelKey: 'carton1', name: '工廠標準 A (小)', l: 30, w: 20, h: 15, weight: 0.5 },
    { labelKey: 'carton2', name: '工廠標準 B (中)', l: 40, w: 30, h: 25, weight: 0.8 },
    { labelKey: 'carton3', name: '工廠標準 C (大)', l: 50, w: 40, h: 30, weight: 1.2 },
    { labelKey: 'carton4', name: '出口專用紙箱 D', l: 60, w: 40, h: 40, weight: 1.5 },
    { labelKey: 'carton5', name: '特大號紙箱 E', l: 60, w: 50, h: 50, weight: 1.8 },
  ];
  const defaultProduct: DimensionsWithWeight = { l: 20, w: 12, h: 8, weight: 0.8 };
  const defaultCarton: DimensionsWithWeight = { l: 60, w: 40, h: 40, weight: 1.5 };
  const defaultShipmentCarton: DimensionsWithWeight = { l: 60, w: 40, h: 40, weight: 12.5 };

  // --- Load from LocalStorage on initial render ---
  const getInitialState = <T,>(key: keyof StoredData, defaultValue: T): T => {
    const stored = loadFromStorage();
    if (stored && stored[key] !== undefined) {
      return stored[key] as T;
    }
    return defaultValue;
  };

  // --- Global Settings ---
  const [lang, setLang] = useState<Language>(() => getInitialState('lang', 'zh'));
  const [units, setUnits] = useState<Units>(() => getInitialState('units', defaultUnits));
  const [rates, setRates] = useState<Rates>(() => getInitialState('rates', defaultRates));
  const [dimFactor, setDimFactor] = useState(() => getInitialState('dimFactor', 5000));
  const [exchangeRate, setExchangeRate] = useState(() => getInitialState('exchangeRate', 7.2));
  const [cartonThickness, setCartonThickness] = useState(() => getInitialState('cartonThickness', 0.5));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSimOpen, setIsSimOpen] = useState(false);
  const [internalMode, setInternalMode] = useState<Mode>(() => getInitialState('mode', 'packing'));
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Use fixedMode if provided, otherwise use internal state
  const mode = fixedMode || internalMode;
  const setMode = fixedMode ? () => {} : setInternalMode;

  const t = (key: string): string => TRANSLATIONS[lang][key] || key;

  // --- States ---
  const [customCartons, setCustomCartons] = useState<CustomCarton[]>(() => getInitialState('customCartons', defaultCustomCartons));

  // Packing Mode Inputs
  const [product, setProduct] = useState<DimensionsWithWeight>(() => getInitialState('product', defaultProduct));
  const [carton, setCarton] = useState<DimensionsWithWeight>(() => getInitialState('carton', defaultCarton));

  // Loading Mode Inputs
  const [shipmentCarton, setShipmentCarton] = useState<DimensionsWithWeight>(() => getInitialState('shipmentCarton', defaultShipmentCarton));
  const [selectedContainerKey, setSelectedContainerKey] = useState<ContainerKey>(() => getInitialState('selectedContainerKey', '20gp'));

  // FBA Mode Inputs
  const defaultFbaProduct = { l: 10, w: 8, h: 3, weight: 1.5 }; // Default in inches/lbs
  const [fbaProduct, setFbaProduct] = useState<DimensionsWithWeight>(() => getInitialState('fbaProduct', defaultFbaProduct));
  const [isFbaSimOpen, setIsFbaSimOpen] = useState(false);

  // --- Save to LocalStorage whenever state changes ---
  useEffect(() => {
    // Skip initial render to avoid overwriting with defaults before loading
    if (!isDataLoaded) {
      setIsDataLoaded(true);
      return;
    }

    const dataToSave: StoredData = {
      version: STORAGE_VERSION,
      lang,
      units,
      rates,
      dimFactor,
      exchangeRate,
      cartonThickness,
      customCartons,
      product,
      carton,
      shipmentCarton,
      selectedContainerKey,
      mode,
    };
    saveToStorage(dataToSave);
  }, [lang, units, rates, dimFactor, exchangeRate, cartonThickness, customCartons, product, carton, shipmentCarton, selectedContainerKey, mode, isDataLoaded]);

  // --- Helper Functions ---
  const handleReset = () => {
    if(mode === 'packing') {
        setProduct({l:0,w:0,h:0,weight:0}); setCarton({l:0,w:0,h:0,weight:0});
    } else {
        setShipmentCarton({l:0,w:0,h:0,weight:0});
    }
  };

  const handleClearAllData = useCallback(() => {
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY);
    // Reset all states to defaults
    setLang('zh');
    setUnits(defaultUnits);
    setRates(defaultRates);
    setDimFactor(5000);
    setExchangeRate(7.2);
    setCartonThickness(0.5);
    setCustomCartons(defaultCustomCartons);
    setProduct(defaultProduct);
    setCarton(defaultCarton);
    setShipmentCarton(defaultShipmentCarton);
    setSelectedContainerKey('20gp');
    setMode('packing');
    setIsSettingsOpen(false);
  }, []);
  const toMetricL = (val: number): number => units.length === 'inch' ? val * 2.54 : val;
  const toMetricW = (val: number): number => units.weight === 'lb' ? val * 0.453592 : val;
  const fromMetricL = (val: number): number => units.length === 'inch' ? val / 2.54 : val;
  const fromMetricW = (val: number): number => units.weight === 'lb' ? val / 0.453592 : val;
  const displayWeight = (val: number): string => `${fromMetricW(val).toFixed(2)} ${units.weight}`;
  const displayLength = (val: number): string => `${fromMetricL(val).toFixed(2)} ${units.length}`;
  const convertCurrency = (amount: number, fromCurr: Currency, toCurr: Currency): number => {
    if (fromCurr === toCurr) return amount;
    if (fromCurr === 'USD' && toCurr === 'RMB') return amount * exchangeRate;
    if (fromCurr === 'RMB' && toCurr === 'USD') return amount / exchangeRate;
    return amount;
  };
  const displayMoney = (val: number, currencyCode: Currency = units.currency): string => `${currencyCode} ${val.toFixed(2)}`;

  // --- Toggle Functions (Restored) ---
  const toggleLengthUnit = () => {
    const isCm = units.length === 'cm';
    const newUnit: LengthUnit = isCm ? 'inch' : 'cm';
    const factor = isCm ? 1 / 2.54 : 2.54;

    const convert = (v: number): number => parseFloat((v * factor).toFixed(2));

    setProduct(p => ({ ...p, l: convert(p.l), w: convert(p.w), h: convert(p.h) }));
    setCarton(c => ({ ...c, l: convert(c.l), w: convert(c.w), h: convert(c.h) }));
    setShipmentCarton(c => ({ ...c, l: convert(c.l), w: convert(c.w), h: convert(c.h) }));
    setCartonThickness(t => convert(t));
    setCustomCartons(prev => prev.map(c => ({
      ...c,
      l: convert(c.l), w: convert(c.w), h: convert(c.h)
    })));
    setUnits(u => ({ ...u, length: newUnit }));
  };

  const toggleWeightUnit = () => {
    const isKg = units.weight === 'kg';
    const newUnit: WeightUnit = isKg ? 'lb' : 'kg';
    const factor = isKg ? 2.20462 : 1 / 2.20462;

    const convert = (v: number): number => parseFloat((v * factor).toFixed(3));

    setProduct(p => ({ ...p, weight: convert(p.weight) }));
    setCarton(c => ({ ...c, weight: convert(c.weight) }));
    setShipmentCarton(c => ({ ...c, weight: convert(c.weight) }));
    setCustomCartons(prev => prev.map(c => ({ ...c, weight: convert(c.weight) })));
    setUnits(u => ({ ...u, weight: newUnit }));
  };

  // --- Calculations: Packing Mode ---
  const innerCartonMetric = useMemo((): Dimensions => {
      const metricL = toMetricL(carton.l);
      const metricW = toMetricL(carton.w);
      const metricH = toMetricL(carton.h);
      const metricThickness = toMetricL(cartonThickness);
      return {
          l: Math.max(0, metricL - (metricThickness * 2)),
          w: Math.max(0, metricW - (metricThickness * 2)),
          h: Math.max(0, metricH - (metricThickness * 2)),
      };
  }, [carton, cartonThickness, units]);

  const packingScenarios = useMemo(() => calculatePackingScenarios(
      { l: toMetricL(product.l), w: toMetricL(product.w), h: toMetricL(product.h) },
      innerCartonMetric
  ), [product, innerCartonMetric, units]);

  const bestPacking = packingScenarios[0] || null;

  const packingCosts = useMemo((): PackingCosts | null => {
    if (!bestPacking) return null;
    const cVol = toMetricL(carton.l) * toMetricL(carton.w) * toMetricL(carton.h);
    const cbm = cVol / 1000000;
    const netWeight = bestPacking.count * toMetricW(product.weight);
    const grossWeight = netWeight + toMetricW(carton.weight);
    const dimWeightAir = cVol / dimFactor;
    const chargeableAir = Math.max(grossWeight, dimWeightAir);
    const airRate = convertCurrency(rates.air, rates.airCurrency, units.currency);
    const seaRate = convertCurrency(rates.sea, rates.seaCurrency, units.currency);
    const totalAir = chargeableAir * airRate;
    const totalSea = rates.seaUnit === 'cbm' ? Math.max(cbm, 0.001) * seaRate : grossWeight * seaRate;
    return {
      air: { total: totalAir, unit: totalAir / bestPacking.count },
      sea: { total: totalSea, unit: totalSea / bestPacking.count },
      stats: { cbm, grossWeight, dimWeightAir, chargeableAir, utilization: bestPacking.utilization, isDimWeight: dimWeightAir > grossWeight }
    };
  }, [bestPacking, product, carton, rates, dimFactor, units, exchangeRate]);

  // --- Calculations: FBA Size Tier (Amazon US) ---
  const fbaSizeTierCalc = useMemo(() => {
    // Convert carton dimensions to inches for FBA calculation
    const lengthIn = units.length === 'inch' ? carton.l : carton.l / 2.54;
    const widthIn = units.length === 'inch' ? carton.w : carton.w / 2.54;
    const heightIn = units.length === 'inch' ? carton.h : carton.h / 2.54;

    // Convert gross weight to lbs
    const grossWeightKg = packingCosts?.stats.grossWeight || 0;
    const grossWeightLb = grossWeightKg / 0.453592;

    if (lengthIn <= 0 || widthIn <= 0 || heightIn <= 0) return null;

    const result = calculateFBASizeTier(lengthIn, widthIn, heightIn, grossWeightLb);

    // Calculate potential savings if we can optimize to a lower tier
    const lowerTier = getNextTierBoundary(result.tier.tier);
    let optimization = null;

    if (lowerTier && lowerTier.tier !== result.tier.tier) {
      const dims = [lengthIn, widthIn, heightIn].sort((a, b) => b - a);
      const [longest, median, shortest] = dims;

      // Check which dimension(s) could be reduced to fit lower tier
      const suggestions: { dim: string; current: number; target: number; diff: number }[] = [];

      if (longest > lowerTier.maxDims.longest) {
        suggestions.push({ dim: 'longest', current: longest, target: lowerTier.maxDims.longest, diff: longest - lowerTier.maxDims.longest });
      }
      if (median > lowerTier.maxDims.median) {
        suggestions.push({ dim: 'median', current: median, target: lowerTier.maxDims.median, diff: median - lowerTier.maxDims.median });
      }
      if (shortest > lowerTier.maxDims.shortest) {
        suggestions.push({ dim: 'shortest', current: shortest, target: lowerTier.maxDims.shortest, diff: shortest - lowerTier.maxDims.shortest });
      }
      if (result.billableWeight > lowerTier.maxWeight) {
        suggestions.push({ dim: 'weight', current: result.billableWeight, target: lowerTier.maxWeight, diff: result.billableWeight - lowerTier.maxWeight });
      }

      // Calculate potential savings
      let lowerTierFee = lowerTier.baseFee;
      const assumedLowerWeight = Math.min(result.billableWeight, lowerTier.maxWeight);
      if (lowerTier.perLbFee && assumedLowerWeight > 1) {
        lowerTierFee += (assumedLowerWeight - 1) * lowerTier.perLbFee;
      }

      optimization = {
        targetTier: lowerTier,
        suggestions,
        potentialSavings: result.estimatedFee - lowerTierFee,
      };
    }

    return {
      ...result,
      dimsInches: { l: lengthIn, w: widthIn, h: heightIn },
      actualWeightLb: grossWeightLb,
      optimization,
    };
  }, [carton, packingCosts, units]);

  // --- Calculations: FBA Mode (independent) ---
  const fbaCalc = useMemo(() => {
    // FBA mode uses inches for dimensions and lbs for weight directly
    const lengthIn = fbaProduct.l;
    const widthIn = fbaProduct.w;
    const heightIn = fbaProduct.h;
    const weightLb = fbaProduct.weight;

    if (lengthIn <= 0 || widthIn <= 0 || heightIn <= 0) return null;

    const result = calculateFBASizeTier(lengthIn, widthIn, heightIn, weightLb);

    // Calculate distance to lower tier boundary
    const lowerTier = getNextTierBoundary(result.tier.tier);
    let distanceToLower = null;

    if (lowerTier) {
      const dims = [lengthIn, widthIn, heightIn].sort((a, b) => b - a);
      const [longest, median, shortest] = dims;

      distanceToLower = {
        tier: lowerTier,
        longest: longest - lowerTier.maxDims.longest,
        median: median - lowerTier.maxDims.median,
        shortest: shortest - lowerTier.maxDims.shortest,
        weight: result.billableWeight - lowerTier.maxWeight,
      };
    }

    // Get all tiers for comparison display
    const allTiers = Object.values(FBA_SIZE_TIERS).filter(t =>
      t.tier === 'small_standard' ||
      t.tier === 'large_standard' ||
      t.tier === 'large_bulky'
    );

    return {
      ...result,
      dimsInches: { l: lengthIn, w: widthIn, h: heightIn },
      sortedDims: [lengthIn, widthIn, heightIn].sort((a, b) => b - a) as [number, number, number],
      weightLb,
      distanceToLower,
      allTiers,
    };
  }, [fbaProduct]);

  // --- Calculations: Loading Mode ---
  const containerMetric = useMemo(() => CONTAINER_SPECS[selectedContainerKey], [selectedContainerKey]);
  const loadingScenarios = useMemo(() => calculatePackingScenarios(
      { l: toMetricL(shipmentCarton.l), w: toMetricL(shipmentCarton.w), h: toMetricL(shipmentCarton.h) },
      containerMetric
  ), [shipmentCarton, containerMetric, units]);

  const bestLoading = loadingScenarios[0] || null;
  const loadingStats = useMemo((): LoadingStats | null => {
      if(!bestLoading) return null;
      const count = bestLoading.count;
      const cartonVol = toMetricL(shipmentCarton.l) * toMetricL(shipmentCarton.w) * toMetricL(shipmentCarton.h);
      const totalCbm = (count * cartonVol) / 1000000;
      return {
          count,
          totalCbm,
          utilization: bestLoading.utilization
      };
  }, [bestLoading, shipmentCarton, units]);

  // --- Handlers ---
  const handleApplyCarton = (newCarton: DimensionsWithWeight) => {
    let appliedCarton = { ...newCarton };
    if (units.length === 'inch') {
       appliedCarton.l = newCarton.l / 2.54; appliedCarton.w = newCarton.w / 2.54; appliedCarton.h = newCarton.h / 2.54;
    }
    if (units.weight === 'lb') {
       appliedCarton.weight = newCarton.weight / 0.453592;
    }
    setCarton(appliedCarton);
    setIsSimOpen(false);
  };

  const handleSyncFromPacking = () => {
      if(packingCosts && bestPacking) {
          // Sync Packing Result as Shipment Carton Input (Using user unit state)
          // Gross Weight per carton from Packing Calc
          const gw = fromMetricW(packingCosts.stats.grossWeight);
          setShipmentCarton({
              l: carton.l, w: carton.w, h: carton.h, weight: gw
          });
      }
  };

  const simProduct: DimensionsWithWeight = { l: toMetricL(product.l), w: toMetricL(product.w), h: toMetricL(product.h), weight: toMetricW(product.weight) };
  const simCartonInit: DimensionsWithWeight = { l: toMetricL(carton.l), w: toMetricL(carton.w), h: toMetricL(carton.h), weight: toMetricW(carton.weight) };

  // Loading Sim Props
  const simShipmentCarton: DimensionsWithWeight = { l: toMetricL(shipmentCarton.l), w: toMetricL(shipmentCarton.w), h: toMetricL(shipmentCarton.h), weight: toMetricW(shipmentCarton.weight) };
  const simContainer: DimensionsWithWeight = { ...CONTAINER_SPECS[selectedContainerKey], weight: 0 }; // Already metric

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-800 flex flex-col">
      <SettingsModal
        isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}
        rates={rates} setRates={setRates} dimFactor={dimFactor} setDimFactor={setDimFactor}
        units={units} exchangeRate={exchangeRate} setExchangeRate={setExchangeRate}
        customCartons={customCartons} setCustomCartons={setCustomCartons} t={t}
        onClearData={handleClearAllData}
      />

      <SimulationModal
         isOpen={isSimOpen} onClose={() => setIsSimOpen(false)}
         item={mode === 'packing' ? simProduct : simShipmentCarton}
         outer={mode === 'packing' ? simCartonInit : simContainer}
         units={units} rates={rates} dimFactor={dimFactor} exchangeRate={exchangeRate} t={t}
         onApply={handleApplyCarton} customCartons={customCartons} cartonThickness={cartonThickness}
         isContainerMode={mode === 'loading'}
      />

      {fbaCalc && (
        <FbaSimulationModal
          isOpen={isFbaSimOpen}
          onClose={() => setIsFbaSimOpen(false)}
          product={fbaProduct}
          onProductChange={setFbaProduct}
          currentTier={fbaCalc.tier}
          allTiers={fbaCalc.allTiers}
          sortedDims={fbaCalc.sortedDims}
          billableWeight={fbaCalc.billableWeight}
          t={t}
          lang={lang}
        />
      )}

      <div className="max-w-5xl mx-auto w-full flex flex-col gap-4">

        {!hideHeader && (
          <>
            {/* Header with Logo */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <svg viewBox="0 0 60 60" className="w-10 h-10">
                <polygon points="30,5 55,17 30,29 5,17" fill="#60A5FA"/>
                <polygon points="5,17 30,29 30,55 5,43" fill="#2563EB"/>
                <polygon points="30,29 55,17 55,43 30,55" fill="#1D4ED8"/>
                <line x1="30" y1="5" x2="30" y2="0" stroke="#93C5FD" strokeWidth="1.5"/>
                <line x1="27" y1="0" x2="33" y2="0" stroke="#93C5FD" strokeWidth="1.5"/>
                <line x1="57" y1="30" x2="61" y2="28" stroke="#93C5FD" strokeWidth="1.5"/>
                <line x1="61" y1="25" x2="61" y2="31" stroke="#93C5FD" strokeWidth="1.5"/>
              </svg>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  <span className="text-blue-600">Dim</span>
                  <span className="text-slate-800">Pack</span>
                  <span className="text-blue-400">3D</span>
                </h1>
                <p className="text-xs text-slate-500">{t('subtitle')}</p>
              </div>
            </div>

            {/* Top Navigation */}
            <div className="flex flex-col gap-3 bg-white px-3 md:px-4 py-3 rounded-lg shadow-sm border border-gray-200">
                {/* Mode Toggle - Full width on mobile */}
                <div className="flex gap-2 w-full">
                   <button
                     onClick={() => setMode('packing')}
                     className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 md:py-2 rounded-lg font-bold text-sm transition-all active:scale-[0.98] ${mode === 'packing' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                   >
                     <Package size={16} /> <span className="hidden xs:inline">{t('modePacking')}</span><span className="xs:hidden">Packing</span>
                   </button>
                   <button
                     onClick={() => setMode('loading')}
                     className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 md:py-2 rounded-lg font-bold text-sm transition-all active:scale-[0.98] ${mode === 'loading' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                   >
                     <Container size={16} /> <span className="hidden xs:inline">{t('modeLoading')}</span><span className="xs:hidden">Container</span>
                   </button>
                   <button
                     onClick={() => setMode('fba')}
                     className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 md:py-2 rounded-lg font-bold text-sm transition-all active:scale-[0.98] ${mode === 'fba' ? 'bg-amber-500 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                   >
                     <Cuboid size={16} /> <span className="hidden xs:inline">{t('modeFba')}</span><span className="xs:hidden">FBA</span>
                   </button>
                </div>

                {/* Controls - Wrap on mobile */}
                <div className="flex flex-wrap items-center gap-2 md:gap-3 justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-xs font-bold shadow-sm active:scale-[0.98]">
                      <Languages size={14} /> <span>{lang === 'zh' ? '繁' : 'EN'}</span>
                    </button>
                    <div className="flex items-center bg-slate-100 p-0.5 md:p-1 rounded-lg border border-slate-200">
                      <button onClick={toggleLengthUnit} className="px-2 md:px-3 py-1.5 text-xs font-bold hover:bg-white rounded-md text-slate-600 w-12 md:w-16 active:scale-[0.98]">{units.length.toUpperCase()}</button>
                      <div className="w-px h-4 bg-slate-300 mx-0.5 md:mx-1"></div>
                      <button onClick={toggleWeightUnit} className="px-2 md:px-3 py-1.5 text-xs font-bold hover:bg-white rounded-md text-slate-600 w-12 md:w-16 active:scale-[0.98]">{units.weight.toUpperCase()}</button>
                      <div className="w-px h-4 bg-slate-300 mx-0.5 md:mx-1"></div>
                      <button onClick={() => setUnits(u => ({...u, currency: u.currency === 'USD' ? 'RMB' : 'USD'}))} className="px-2 md:px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-white rounded-md text-center w-12 md:w-16 active:scale-[0.98]">{units.currency}</button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={handleReset} className="p-2 bg-white border border-gray-200 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm active:scale-[0.98]" title={t('reset')}>
                      <RotateCcw size={16} />
                    </button>

                    <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors text-xs font-bold shadow-sm group active:scale-[0.98]">
                      <Settings size={16} className="group-hover:rotate-90 transition-transform duration-500" />
                      <span className="hidden md:inline">{t('settings')}</span>
                    </button>
                  </div>
                </div>
            </div>
          </>
        )}

        {/* Compact controls when header is hidden (for standalone pages) */}
        {hideHeader && (
          <div className="flex items-center justify-between bg-white px-3 md:px-4 py-2.5 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2">
              <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-xs font-bold shadow-sm active:scale-[0.98]">
                <Languages size={14} /> <span>{lang === 'zh' ? '繁' : 'EN'}</span>
              </button>
              <div className="flex items-center bg-slate-100 p-0.5 md:p-1 rounded-lg border border-slate-200">
                <button onClick={toggleLengthUnit} className="px-2 md:px-3 py-1.5 text-xs font-bold hover:bg-white rounded-md text-slate-600 w-12 md:w-14 active:scale-[0.98]">{units.length.toUpperCase()}</button>
                <div className="w-px h-4 bg-slate-300 mx-0.5"></div>
                <button onClick={toggleWeightUnit} className="px-2 md:px-3 py-1.5 text-xs font-bold hover:bg-white rounded-md text-slate-600 w-12 md:w-14 active:scale-[0.98]">{units.weight.toUpperCase()}</button>
                <div className="w-px h-4 bg-slate-300 mx-0.5"></div>
                <button onClick={() => setUnits(u => ({...u, currency: u.currency === 'USD' ? 'RMB' : 'USD'}))} className="px-2 md:px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-white rounded-md text-center w-12 md:w-14 active:scale-[0.98]">{units.currency}</button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleReset} className="p-2 bg-white border border-gray-200 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm active:scale-[0.98]" title={t('reset')}>
                <RotateCcw size={16} />
              </button>
              <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors text-xs font-bold shadow-sm group active:scale-[0.98]">
                <Settings size={16} className="group-hover:rotate-90 transition-transform duration-500" />
                <span className="hidden md:inline">{t('settings')}</span>
              </button>
            </div>
          </div>
        )}

        {mode === 'packing' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CompactCard title={t('productSpecs')} icon={Package} className="border-l-4 border-l-purple-500">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <CompactInput label={t('length')} value={product.l} onChange={v => setProduct({...product, l: v})} />
                  <CompactInput label={t('width')} value={product.w} onChange={v => setProduct({...product, w: v})} />
                  <CompactInput label={t('height')} value={product.h} onChange={v => setProduct({...product, h: v})} />
                </div>
                <CompactInput label={`${t('weight')} (${units.weight})`} value={product.weight} onChange={v => setProduct({...product, weight: v})} unit={units.weight} />
              </CompactCard>

              <CompactCard title={t('cartonSpecs')} icon={Box} className="border-l-4 border-l-orange-500">
                <div className="grid grid-cols-3 gap-3 mb-2">
                  <CompactInput label={t('length')} value={carton.l} onChange={v => setCarton({...carton, l: v})} />
                  <CompactInput label={t('width')} value={carton.w} onChange={v => setCarton({...carton, w: v})} />
                  <CompactInput label={t('height')} value={carton.h} onChange={v => setCarton({...carton, h: v})} />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1"><CompactInput label={`${t('emptyCartonWeight')} (${units.weight})`} value={carton.weight} onChange={v => setCarton({...carton, weight: v})} unit={units.weight} /></div>
                  <div className="flex-1"><CompactInput label={`${t('wallThickness')} (${units.length})`} value={cartonThickness} onChange={setCartonThickness} unit={units.length} /></div>
                </div>
                <div className="mt-3 bg-blue-50/50 rounded-md border border-blue-100 p-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-700 flex items-center gap-1"><ScanLine size={12}/> {t('innerDims')}</span>
                  <span className="font-mono font-bold text-gray-700">{displayLength(fromMetricL(innerCartonMetric.l))} x {displayLength(fromMetricL(innerCartonMetric.w))} x {displayLength(fromMetricL(innerCartonMetric.h))}</span>
                </div>
              </CompactCard>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-2"><div className="bg-green-600 p-1 rounded text-white"><DollarSign size={16}/></div><h3 className="font-bold text-slate-800">{t('title')} (Estimated Cost)</h3></div>
                <div className="text-[10px] text-gray-400 font-medium">Display Currency: {units.currency}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                <div className="p-5 flex flex-col items-center justify-center hover:bg-blue-50/30 transition-colors relative group">
                  <div className="flex items-center gap-2 mb-2 text-blue-600 z-10"><Plane size={20} /><span className="font-bold text-lg">{t('airFreight')}</span></div>
                  <div className="text-center z-10">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('costPerUnit')}</div>
                    <div className="text-4xl font-black text-slate-800 tracking-tight">{packingCosts ? displayMoney(packingCosts.air.unit) : '-'}</div>
                    <div className="text-xs text-gray-400 font-medium mt-1">{t('totalPerCarton')}: {packingCosts ? displayMoney(packingCosts.air.total) : '-'}</div>
                  </div>
                </div>
                <div className="p-5 flex flex-col items-center justify-center hover:bg-teal-50/30 transition-colors relative group">
                  <div className="flex items-center gap-2 mb-2 text-teal-600 z-10"><Anchor size={20} /><span className="font-bold text-lg">{t('seaFreight')}</span></div>
                  <div className="text-center z-10">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('costPerUnit')}</div>
                    <div className="text-4xl font-black text-slate-800 tracking-tight">{packingCosts ? displayMoney(packingCosts.sea.unit) : '-'}</div>
                    <div className="text-xs text-gray-400 font-medium mt-1">{t('totalPerCarton')}: {packingCosts ? displayMoney(packingCosts.sea.total) : '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            <CompactCard title={t('packingAnalysis')} icon={Scale} action={<button onClick={() => setIsSimOpen(true)} disabled={!packingCosts} className="flex items-center gap-2 text-[10px] bg-indigo-600 text-white px-3 py-1.5 rounded-full font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-indigo-200"><Cuboid size={14} /><span>{t('open3D')}</span></button>}>
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1 w-full md:w-auto flex items-center gap-4">
                  <div className="text-center bg-slate-100 p-3 rounded-xl min-w-[100px]">
                    <div className="text-3xl font-black text-slate-700 leading-none">{bestPacking ? bestPacking.count : 0}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">PCS / Box</div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-xs font-bold text-gray-600"><span>{t('utilization')}</span><span className={packingCosts?.stats.utilization && packingCosts.stats.utilization < 70 ? 'text-orange-500' : 'text-green-600'}>{packingCosts ? packingCosts.stats.utilization.toFixed(1) : 0}%</span></div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${packingCosts?.stats.utilization && packingCosts.stats.utilization > 80 ? 'bg-green-500' : 'bg-orange-400'}`} style={{ width: `${packingCosts ? packingCosts.stats.utilization : 0}%` }}></div></div>
                  </div>
                </div>
                <div className="hidden md:block w-px h-16 bg-gray-200"></div>
                <div className="flex-1 w-full md:w-auto grid grid-cols-2 gap-x-8 gap-y-1">
                  <StatRow label={t('grossWeight')} value={packingCosts ? displayWeight(fromMetricW(packingCosts.stats.grossWeight)) : '-'} />
                  <StatRow label={t('dimWeight')} value={packingCosts ? displayWeight(fromMetricW(packingCosts.stats.dimWeightAir)) : '-'} sub={`Divisor: ${dimFactor}`} />
                  <div className="col-span-2 mt-1 pt-2 border-t border-dashed border-gray-200 flex justify-between items-center"><span className="text-xs font-bold text-slate-700">{t('chargeable')}</span><div className="flex items-center gap-2"><span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${packingCosts?.stats.isDimWeight ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{packingCosts?.stats.isDimWeight ? 'DIM WEIGHT' : 'ACTUAL'}</span><span className="text-sm font-black text-slate-800">{packingCosts ? displayWeight(fromMetricW(packingCosts.stats.chargeableAir)) : '-'}</span></div></div>
                </div>
              </div>
              <div className="mt-3 text-[9px] text-gray-400 text-center italic border-t border-gray-100 pt-2">{t('disclaimer')}</div>
            </CompactCard>
          </>
        ) : mode === 'loading' ? (
          /* CONTAINER MODE */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CompactCard title={t('shipmentCarton')} icon={Box} className="border-l-4 border-l-blue-500">
                <button onClick={handleSyncFromPacking} className="mb-4 w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-1.5 rounded text-xs font-bold hover:bg-blue-100 transition-colors">
                   <ArrowRightLeft size={12} /> {t('syncFromPacking')}
                </button>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <CompactInput label={t('length')} value={shipmentCarton.l} onChange={v => setShipmentCarton({...shipmentCarton, l: v})} />
                  <CompactInput label={t('width')} value={shipmentCarton.w} onChange={v => setShipmentCarton({...shipmentCarton, w: v})} />
                  <CompactInput label={t('height')} value={shipmentCarton.h} onChange={v => setShipmentCarton({...shipmentCarton, h: v})} />
                </div>
                <CompactInput label={`${t('grossWeight')} (${units.weight})`} value={shipmentCarton.weight} onChange={v => setShipmentCarton({...shipmentCarton, weight: v})} unit={units.weight} />
              </CompactCard>

              <CompactCard title={t('containerSelection')} icon={Container} className="border-l-4 border-l-teal-500">
                 <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase">Type</label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded font-bold text-gray-700"
                      value={selectedContainerKey}
                      onChange={(e) => setSelectedContainerKey(e.target.value as ContainerKey)}
                    >
                       <option value="20gp">{t('container20gp')}</option>
                       <option value="40gp">{t('container40gp')}</option>
                       <option value="40hq">{t('container40hq')}</option>
                    </select>

                    <div className="p-3 bg-gray-50 rounded border border-gray-200">
                       <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Internal Dims (Approx)</div>
                       <div className="font-mono text-sm font-bold text-gray-700">
                          {displayLength(fromMetricL(CONTAINER_SPECS[selectedContainerKey].l))} x {displayLength(fromMetricL(CONTAINER_SPECS[selectedContainerKey].w))} x {displayLength(fromMetricL(CONTAINER_SPECS[selectedContainerKey].h))}
                       </div>
                       <div className="text-[10px] text-gray-400 mt-1">Vol: {CONTAINER_SPECS[selectedContainerKey].cbm} CBM</div>
                    </div>
                 </div>
              </CompactCard>
            </div>

            <CompactCard title={t('packingAnalysis')} icon={Scale} action={<button onClick={() => setIsSimOpen(true)} disabled={!loadingStats} className="flex items-center gap-2 text-[10px] bg-indigo-600 text-white px-3 py-1.5 rounded-full font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-indigo-200"><Cuboid size={14} /><span>{t('open3D')}</span></button>}>
               <div className="flex items-center justify-around py-4">
                  <div className="text-center">
                     <div className="text-xs text-gray-400 uppercase font-bold mb-1">{t('totalCartons')}</div>
                     <div className="text-4xl font-black text-slate-800">{loadingStats ? loadingStats.count : '-'}</div>
                  </div>
                  <div className="w-px h-12 bg-gray-200"></div>
                  <div className="text-center">
                     <div className="text-xs text-gray-400 uppercase font-bold mb-1">{t('totalCbm')}</div>
                     <div className="text-2xl font-bold text-blue-600">{loadingStats ? loadingStats.totalCbm.toFixed(2) : '-'}</div>
                  </div>
                  <div className="w-px h-12 bg-gray-200"></div>
                  <div className="text-center">
                     <div className="text-xs text-gray-400 uppercase font-bold mb-1">{t('containerUtil')}</div>
                     <div className={`text-2xl font-bold ${loadingStats?.utilization && loadingStats.utilization > 85 ? 'text-green-600' : 'text-orange-500'}`}>{loadingStats ? loadingStats.utilization.toFixed(1) + '%' : '-'}</div>
                  </div>
               </div>
            </CompactCard>
          </>
        ) : (
          /* FBA SIZE TIER MODE */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product Dimensions Input */}
              <CompactCard title={t('fbaProductDims')} icon={Ruler} className="border-l-4 border-l-amber-500">
                <div className="mb-3 p-2 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="text-[10px] text-amber-700 font-bold">📦 {lang === 'zh' ? '輸入最終發送給 Amazon 的產品尺寸（含包裝）' : 'Enter final product dimensions as shipped to Amazon (with packaging)'}</div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <CompactInput label={`${t('length')} (in)`} value={fbaProduct.l} onChange={v => setFbaProduct({...fbaProduct, l: v})} />
                  <CompactInput label={`${t('width')} (in)`} value={fbaProduct.w} onChange={v => setFbaProduct({...fbaProduct, w: v})} />
                  <CompactInput label={`${t('height')} (in)`} value={fbaProduct.h} onChange={v => setFbaProduct({...fbaProduct, h: v})} />
                </div>
                <CompactInput label={`${t('fbaProductWeight')} (lb)`} value={fbaProduct.weight} onChange={v => setFbaProduct({...fbaProduct, weight: v})} unit="lb" />
              </CompactCard>

              {/* Current Tier Display */}
              {fbaCalc && (
                <CompactCard
                  title={t('fbaCurrentTier')}
                  icon={Tag}
                  className="border-l-4"
                  style={{ borderLeftColor: fbaCalc.tier.color }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg"
                        style={{ backgroundColor: fbaCalc.tier.color }}
                      >
                        {fbaCalc.tier.name.split(' ').map(w => w[0]).join('')}
                      </div>
                      <div>
                        <div className="font-black text-slate-800 text-lg">
                          {lang === 'zh' ? fbaCalc.tier.nameZh : fbaCalc.tier.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Max: {fbaCalc.tier.maxDims.longest}" × {fbaCalc.tier.maxDims.median}" × {fbaCalc.tier.maxDims.shortest}"
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400 uppercase font-bold">{t('fbaEstFee')}</div>
                      <div className="text-3xl font-black text-slate-800">${fbaCalc.estimatedFee.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Weight Info */}
                  <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[9px] text-gray-400 uppercase font-bold">{t('fbaActualWeight')}</div>
                      <div className="font-bold text-slate-700 text-sm">{fbaCalc.weightLb.toFixed(2)} lb</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-gray-400 uppercase font-bold">{t('fbaDimWeight')}</div>
                      <div className="font-bold text-slate-700 text-sm">{fbaCalc.dimWeight.toFixed(2)} lb</div>
                    </div>
                    <div className="bg-blue-50 rounded px-2 py-1">
                      <div className="text-[9px] text-blue-600 uppercase font-bold">{t('fbaBillableWeight')}</div>
                      <div className="font-black text-blue-700">{fbaCalc.billableWeight.toFixed(2)} lb</div>
                    </div>
                  </div>
                </CompactCard>
              )}
            </div>

            {/* 3D Visualization Button & Tier Comparison */}
            {fbaCalc && (
              <>
                <CompactCard title={t('fbaTierComparison')} icon={Layers}>
                  <div className="mb-4">
                    <button
                      onClick={() => setIsFbaSimOpen(true)}
                      className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-3 rounded-lg font-bold hover:bg-amber-600 transition-colors shadow-md"
                    >
                      <Cuboid size={20} />
                      {t('fbaOpen3D')}
                    </button>
                  </div>

                  {/* Tier Comparison Table */}
                  <div className="space-y-2">
                    {fbaCalc.allTiers.map((tier) => {
                      const isCurrentTier = tier.tier === fbaCalc.tier.tier;
                      const [productL, productM, productS] = fbaCalc.sortedDims;
                      const fitsLength = productL <= tier.maxDims.longest;
                      const fitsMedian = productM <= tier.maxDims.median;
                      const fitsShortest = productS <= tier.maxDims.shortest;
                      const fitsWeight = fbaCalc.billableWeight <= tier.maxWeight;
                      const fitsAll = fitsLength && fitsMedian && fitsShortest && fitsWeight;

                      return (
                        <div
                          key={tier.tier}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            isCurrentTier
                              ? 'border-amber-400 bg-amber-50'
                              : fitsAll
                              ? 'border-green-200 bg-green-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: tier.color }}
                              />
                              <span className={`font-bold ${isCurrentTier ? 'text-amber-800' : 'text-gray-700'}`}>
                                {lang === 'zh' ? tier.nameZh : tier.name}
                              </span>
                              {isCurrentTier && (
                                <span className="text-[9px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                                  {t('fbaYourProduct')}
                                </span>
                              )}
                            </div>
                            <div className="font-bold text-gray-700">${tier.baseFee.toFixed(2)}+</div>
                          </div>

                          {/* Dimension comparison */}
                          <div className="grid grid-cols-4 gap-1 text-[10px]">
                            <div className={`text-center p-1 rounded ${fitsLength ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              <div className="font-bold">{tier.maxDims.longest}"</div>
                              <div className="text-[8px]">longest</div>
                            </div>
                            <div className={`text-center p-1 rounded ${fitsMedian ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              <div className="font-bold">{tier.maxDims.median}"</div>
                              <div className="text-[8px]">median</div>
                            </div>
                            <div className={`text-center p-1 rounded ${fitsShortest ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              <div className="font-bold">{tier.maxDims.shortest}"</div>
                              <div className="text-[8px]">shortest</div>
                            </div>
                            <div className={`text-center p-1 rounded ${fitsWeight ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              <div className="font-bold">{tier.maxWeight} lb</div>
                              <div className="text-[8px]">weight</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Your product dimensions */}
                  <div className="mt-4 p-3 bg-slate-100 rounded-lg">
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-2">{t('fbaYourProduct')} ({lang === 'zh' ? '已排序' : 'sorted'})</div>
                    <div className="grid grid-cols-4 gap-1 text-xs">
                      <div className="text-center p-2 bg-white rounded border">
                        <div className="font-black text-slate-800">{fbaCalc.sortedDims[0].toFixed(1)}"</div>
                        <div className="text-[8px] text-gray-400">longest</div>
                      </div>
                      <div className="text-center p-2 bg-white rounded border">
                        <div className="font-black text-slate-800">{fbaCalc.sortedDims[1].toFixed(1)}"</div>
                        <div className="text-[8px] text-gray-400">median</div>
                      </div>
                      <div className="text-center p-2 bg-white rounded border">
                        <div className="font-black text-slate-800">{fbaCalc.sortedDims[2].toFixed(1)}"</div>
                        <div className="text-[8px] text-gray-400">shortest</div>
                      </div>
                      <div className="text-center p-2 bg-white rounded border">
                        <div className="font-black text-slate-800">{fbaCalc.billableWeight.toFixed(1)} lb</div>
                        <div className="text-[8px] text-gray-400">billable</div>
                      </div>
                    </div>
                  </div>
                </CompactCard>

                {/* Amazon Docs Link */}
                <a
                  href="https://sellercentral.amazon.com/help/hub/reference/external/GABBX6GZPA8MSZGW"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline py-3 bg-blue-50 rounded-lg transition-colors border border-blue-100"
                >
                  <ExternalLink size={16} />
                  {t('fbaViewDocs')}
                </a>
              </>
            )}
          </>
        )}

      </div>
    </div>
  );
}
