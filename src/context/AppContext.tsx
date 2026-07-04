import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import {
  Language, LengthUnit, WeightUnit, Currency, Units, Rates, CustomCarton,
  DimensionsWithWeight, ContainerKey, FBASizeTierInfo, TranslationDictionary
} from '../lib/types';

// ===== Constants =====
const STORAGE_KEY = 'dimpack3d-settings';
const STORAGE_VERSION = 1;

// FBA Dimensional Weight Divisor (cubic inches)
export const FBA_DIM_DIVISOR = 139;

// FBA Size Tiers Data
export const FBA_SIZE_TIERS: Record<string, FBASizeTierInfo> = {
  small_standard: {
    tier: 'small_standard',
    name: 'Small Standard',
    nameZh: '小型標準',
    color: '#22c55e',
    maxDims: { longest: 15, median: 12, shortest: 0.75 },
    maxWeight: 1,
    baseFee: 3.22,
  },
  large_standard: {
    tier: 'large_standard',
    name: 'Large Standard',
    nameZh: '大型標準',
    color: '#3b82f6',
    maxDims: { longest: 18, median: 14, shortest: 8 },
    maxWeight: 20,
    baseFee: 4.75,
    perLbFee: 0.08,
  },
  large_bulky: {
    tier: 'large_bulky',
    name: 'Large Bulky',
    nameZh: '大型笨重',
    color: '#f59e0b',
    maxDims: { longest: 59, median: 33, shortest: 33 },
    maxWeight: 50,
    baseFee: 9.73,
    perLbFee: 0.42,
  },
  extra_large_0_50: {
    tier: 'extra_large_0_50',
    name: 'Extra Large (0-50 lb)',
    nameZh: '超大型 (0-50磅)',
    color: '#ef4444',
    maxDims: { longest: 999, median: 999, shortest: 999 },
    maxWeight: 50,
    baseFee: 26.33,
    perLbFee: 0.38,
  },
  extra_large_50_70: {
    tier: 'extra_large_50_70',
    name: 'Extra Large (50-70 lb)',
    nameZh: '超大型 (50-70磅)',
    color: '#dc2626',
    maxDims: { longest: 999, median: 999, shortest: 999 },
    maxWeight: 70,
    baseFee: 40.12,
    perLbFee: 0.75,
  },
  extra_large_70_150: {
    tier: 'extra_large_70_150',
    name: 'Extra Large (70-150 lb)',
    nameZh: '超大型 (70-150磅)',
    color: '#991b1b',
    maxDims: { longest: 999, median: 999, shortest: 999 },
    maxWeight: 150,
    baseFee: 54.81,
    perLbFee: 0.79,
  },
  extra_large_150_plus: {
    tier: 'extra_large_150_plus',
    name: 'Extra Large (150+ lb)',
    nameZh: '超大型 (150+磅)',
    color: '#7f1d1d',
    maxDims: { longest: 999, median: 999, shortest: 999 },
    maxWeight: 999,
    baseFee: 89.98,
    perLbFee: 0.79,
  },
};

// Container Specs
export const CONTAINER_SPECS: Record<ContainerKey, { l: number; w: number; h: number; cbm: number }> = {
  '20gp': { l: 589, w: 235, h: 239, cbm: 33.1 },
  '40gp': { l: 1203, w: 235, h: 239, cbm: 67.5 },
  '40hq': { l: 1203, w: 235, h: 269, cbm: 76.1 }
};

// Translations
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
  fbaProduct: DimensionsWithWeight;
}

// Storage helpers
const loadFromStorage = (): Partial<StoredData> | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const data = JSON.parse(stored) as StoredData;
    if (data.version !== STORAGE_VERSION) {
      console.log('Storage version mismatch, using defaults');
      return null;
    }
    return data;
  } catch {
    console.error('Failed to load from localStorage');
    return null;
  }
};

const saveToStorage = (data: StoredData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    console.error('Failed to save to localStorage');
  }
};

// Default values
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
const defaultFbaProduct: DimensionsWithWeight = { l: 10, w: 8, h: 3, weight: 1.5 };

// Context Type
interface AppContextType {
  // Language
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;

  // Units
  units: Units;
  toggleLengthUnit: () => void;
  toggleWeightUnit: () => void;
  toggleCurrency: () => void;

  // Rates & Settings
  rates: Rates;
  setRates: React.Dispatch<React.SetStateAction<Rates>>;
  dimFactor: number;
  setDimFactor: React.Dispatch<React.SetStateAction<number>>;
  exchangeRate: number;
  setExchangeRate: React.Dispatch<React.SetStateAction<number>>;
  cartonThickness: number;
  setCartonThickness: React.Dispatch<React.SetStateAction<number>>;

  // Custom Cartons
  customCartons: CustomCarton[];
  setCustomCartons: React.Dispatch<React.SetStateAction<CustomCarton[]>>;

  // Packing Mode Data
  product: DimensionsWithWeight;
  setProduct: React.Dispatch<React.SetStateAction<DimensionsWithWeight>>;
  carton: DimensionsWithWeight;
  setCarton: React.Dispatch<React.SetStateAction<DimensionsWithWeight>>;

  // Container Mode Data
  shipmentCarton: DimensionsWithWeight;
  setShipmentCarton: React.Dispatch<React.SetStateAction<DimensionsWithWeight>>;
  selectedContainerKey: ContainerKey;
  setSelectedContainerKey: React.Dispatch<React.SetStateAction<ContainerKey>>;

  // FBA Mode Data
  fbaProduct: DimensionsWithWeight;
  setFbaProduct: React.Dispatch<React.SetStateAction<DimensionsWithWeight>>;

  // UI State
  isSettingsOpen: boolean;
  setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Helpers
  toMetricL: (val: number) => number;
  toMetricW: (val: number) => number;
  fromMetricL: (val: number) => number;
  fromMetricW: (val: number) => number;
  displayWeight: (val: number) => string;
  displayLength: (val: number) => string;
  displayMoney: (val: number, currency?: Currency) => string;
  convertCurrency: (amount: number, fromCurr: Currency, toCurr: Currency) => number;
  handleClearData: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // Load initial state
  const getInitialState = <T,>(key: keyof StoredData, defaultValue: T): T => {
    const stored = loadFromStorage();
    if (stored && stored[key] !== undefined) {
      return stored[key] as T;
    }
    return defaultValue;
  };

  // State
  const [lang, setLang] = useState<Language>(() => getInitialState('lang', 'en'));
  const [units, setUnits] = useState<Units>(() => getInitialState('units', defaultUnits));
  const [rates, setRates] = useState<Rates>(() => getInitialState('rates', defaultRates));
  const [dimFactor, setDimFactor] = useState(() => getInitialState('dimFactor', 5000));
  const [exchangeRate, setExchangeRate] = useState(() => getInitialState('exchangeRate', 7.2));
  const [cartonThickness, setCartonThickness] = useState(() => getInitialState('cartonThickness', 0.5));
  const [customCartons, setCustomCartons] = useState<CustomCarton[]>(() => getInitialState('customCartons', defaultCustomCartons));
  const [product, setProduct] = useState<DimensionsWithWeight>(() => getInitialState('product', defaultProduct));
  const [carton, setCarton] = useState<DimensionsWithWeight>(() => getInitialState('carton', defaultCarton));
  const [shipmentCarton, setShipmentCarton] = useState<DimensionsWithWeight>(() => getInitialState('shipmentCarton', defaultShipmentCarton));
  const [selectedContainerKey, setSelectedContainerKey] = useState<ContainerKey>(() => getInitialState('selectedContainerKey', '20gp'));
  const [fbaProduct, setFbaProduct] = useState<DimensionsWithWeight>(() => getInitialState('fbaProduct', defaultFbaProduct));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Translation function
  const t = useCallback((key: string): string => TRANSLATIONS[lang][key] || key, [lang]);

  // Save to LocalStorage
  useEffect(() => {
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
      fbaProduct,
    };
    saveToStorage(dataToSave);
  }, [lang, units, rates, dimFactor, exchangeRate, cartonThickness, customCartons, product, carton, shipmentCarton, selectedContainerKey, fbaProduct, isDataLoaded]);

  // Unit conversions
  const toMetricL = useCallback((val: number): number => units.length === 'inch' ? val * 2.54 : val, [units.length]);
  const toMetricW = useCallback((val: number): number => units.weight === 'lb' ? val * 0.453592 : val, [units.weight]);
  const fromMetricL = useCallback((val: number): number => units.length === 'inch' ? val / 2.54 : val, [units.length]);
  const fromMetricW = useCallback((val: number): number => units.weight === 'lb' ? val / 0.453592 : val, [units.weight]);
  const displayWeight = useCallback((val: number): string => `${fromMetricW(val).toFixed(2)} ${units.weight}`, [fromMetricW, units.weight]);
  const displayLength = useCallback((val: number): string => `${fromMetricL(val).toFixed(2)} ${units.length}`, [fromMetricL, units.length]);
  const convertCurrency = useCallback((amount: number, fromCurr: Currency, toCurr: Currency): number => {
    if (fromCurr === toCurr) return amount;
    if (fromCurr === 'USD' && toCurr === 'RMB') return amount * exchangeRate;
    if (fromCurr === 'RMB' && toCurr === 'USD') return amount / exchangeRate;
    return amount;
  }, [exchangeRate]);
  const displayMoney = useCallback((val: number, currencyCode: Currency = units.currency): string => `${currencyCode} ${val.toFixed(2)}`, [units.currency]);

  // Toggle functions
  const toggleLengthUnit = useCallback(() => {
    const isCm = units.length === 'cm';
    const newUnit: LengthUnit = isCm ? 'inch' : 'cm';
    const factor = isCm ? 1 / 2.54 : 2.54;
    const convert = (v: number): number => parseFloat((v * factor).toFixed(2));

    setProduct(p => ({ ...p, l: convert(p.l), w: convert(p.w), h: convert(p.h) }));
    setCarton(c => ({ ...c, l: convert(c.l), w: convert(c.w), h: convert(c.h) }));
    setShipmentCarton(c => ({ ...c, l: convert(c.l), w: convert(c.w), h: convert(c.h) }));
    setCartonThickness(t => convert(t));
    setCustomCartons(prev => prev.map(c => ({ ...c, l: convert(c.l), w: convert(c.w), h: convert(c.h) })));
    setUnits(u => ({ ...u, length: newUnit }));
  }, [units.length]);

  const toggleWeightUnit = useCallback(() => {
    const isKg = units.weight === 'kg';
    const newUnit: WeightUnit = isKg ? 'lb' : 'kg';
    const factor = isKg ? 2.20462 : 1 / 2.20462;
    const convert = (v: number): number => parseFloat((v * factor).toFixed(3));

    setProduct(p => ({ ...p, weight: convert(p.weight) }));
    setCarton(c => ({ ...c, weight: convert(c.weight) }));
    setShipmentCarton(c => ({ ...c, weight: convert(c.weight) }));
    setCustomCartons(prev => prev.map(c => ({ ...c, weight: convert(c.weight) })));
    setUnits(u => ({ ...u, weight: newUnit }));
  }, [units.weight]);

  const toggleCurrency = useCallback(() => {
    setUnits(u => ({ ...u, currency: u.currency === 'USD' ? 'RMB' : 'USD' }));
  }, []);

  // Clear all data
  const handleClearData = useCallback(() => {
    if (!window.confirm(t('clearDataConfirm'))) return;
    localStorage.removeItem(STORAGE_KEY);
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
    setFbaProduct(defaultFbaProduct);
    setIsSettingsOpen(false);
  }, [t]);

  const value = useMemo(() => ({
    lang, setLang, t,
    units, toggleLengthUnit, toggleWeightUnit, toggleCurrency,
    rates, setRates,
    dimFactor, setDimFactor,
    exchangeRate, setExchangeRate,
    cartonThickness, setCartonThickness,
    customCartons, setCustomCartons,
    product, setProduct,
    carton, setCarton,
    shipmentCarton, setShipmentCarton,
    selectedContainerKey, setSelectedContainerKey,
    fbaProduct, setFbaProduct,
    isSettingsOpen, setIsSettingsOpen,
    toMetricL, toMetricW, fromMetricL, fromMetricW,
    displayWeight, displayLength, displayMoney, convertCurrency,
    handleClearData,
  }), [
    lang, t, units, toggleLengthUnit, toggleWeightUnit, toggleCurrency,
    rates, dimFactor, exchangeRate, cartonThickness, customCartons,
    product, carton, shipmentCarton, selectedContainerKey, fbaProduct,
    isSettingsOpen, toMetricL, toMetricW, fromMetricL, fromMetricW,
    displayWeight, displayLength, displayMoney, convertCurrency, handleClearData,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
