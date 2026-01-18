import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Package, Box, Anchor, Plane, ArrowRightLeft, Settings, Scale, Calculator, LayoutDashboard, X, DollarSign, Tag, Globe, RotateCcw, Eye, Cuboid, Layers, ZoomIn, Maximize, CheckCircle, Ruler, Edit3, Save, ChevronDown, ChevronUp, Languages, Info, ScanLine, Minimize2, Container, ArrowRight } from 'lucide-react';

// --- Translation Dictionary ---
const TRANSLATIONS = {
  zh: {
    title: "物流成本計算器",
    subtitle: "Logistics Cost & Packing Estimator",
    modePacking: "產品裝箱 (Packing)",
    modeLoading: "貨櫃裝載 (Container)",
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
    orientationLabel: "方向圖例:",
    legendStandard: "標準",
    legendGap: "縫隙",
    legendLayered: "層疊",
    disclaimer: "*注意：實際運費可能因 Carrier 進位規則(如不足0.5kg當0.5kg計)而略有不同。"
  },
  en: {
    title: "Logistics Cost Calculator",
    subtitle: "Logistics Cost & Packing Estimator",
    modePacking: "Product Packing",
    modeLoading: "Container Loading",
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
    orientationLabel: "Orientation:",
    legendStandard: "Standard",
    legendGap: "Gap Fill",
    legendLayered: "Layered",
    disclaimer: "*Note: Actual freight may vary due to carrier rounding rules (e.g. round up to 0.5kg)."
  }
};

// --- Constants ---
const CONTAINER_SPECS = {
  '20gp': { l: 589, w: 235, h: 239, cbm: 33.1 },
  '40gp': { l: 1203, w: 235, h: 239, cbm: 67.5 },
  '40hq': { l: 1203, w: 235, h: 269, cbm: 76.1 }
};

// --- Three.js Helper Hook ---
const useThree = () => {
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

const calculatePackingScenarios = (item, space) => {
  // Use Inner Dimensions for the space available
  const { l: cL, w: cW, h: cH } = space;

  if (item.l <= 0 || item.w <= 0 || item.h <= 0 || cL <= 0 || cW <= 0 || cH <= 0) return [];

  const candidates = [];
  const itemVol = item.l * item.w * item.h;
  const spaceVol = cL * cW * cH;

  // Helper: Create a box item definition
  const createItem = (x, y, z, dim, colorType) => ({ x, y, z, l: dim[0], w: dim[1], h: dim[2], colorType });

  const orientations = [
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
      const items = [];
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
  let bestMixed = { count: 0 };

  orientations.forEach((dims) => {
    const cols = Math.floor(cL / dims[0]);
    const rows = Math.floor(cW / dims[1]);
    const layers = Math.floor(cH / dims[2]);

    let currentItems = [];
    for (let z = 0; z < layers; z++) {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          currentItems.push(createItem(x * dims[0], y * dims[1], z * dims[2], dims, 0));
        }
      }
    }

    const usedL = cols * dims[0];
    const remainL = cL - usedL;
    let gapItemsL = [];

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
  if (bestMixed.count > 0) candidates.push(bestMixed);


  // 3. SCENARIO C: Mixed Layers
  let bestLayered = { count: 0 };
  const standingDims = orientations.reduce((prev, curr) => curr[2] > prev[2] ? curr : prev, [0,0,0]);
  const flatDims = orientations.reduce((prev, curr) => curr[2] < prev[2] ? curr : prev, [999,999,999]);

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
              const items = [];
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
  if (bestLayered.count > 0) candidates.push(bestLayered);

  // Sort Logic: Count DESC, then Utilization DESC
  candidates.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.utilization - a.utilization;
  });

  // Filter Logic
  const finalScenarios = [];
  const seenKeys = new Set();

  const addIfUnique = (sc) => {
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
const ThreeVisualizer = ({ outer, inner, scenario, units, t, isContainerMode = false }) => {
  const containerRef = useRef(null);
  const threeLoaded = useThree();
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const requestRef = useRef(null);
  const [isHudExpanded, setIsHudExpanded] = useState(true);

  // Helper to format Metric values to User Units
  const formatDim = (val) => {
    if (units.length === 'inch') {
      return (val / 2.54).toFixed(2);
    }
    return val.toFixed(1);
  };

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
    camera.position.set(maxDim * 1.5, maxDim * 1.2, maxDim * 1.5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

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

    const onMouseDown = (e) => { isDragging = true; };
    const onMouseUp = (e) => { isDragging = false; };
    const onMouseMove = (e) => {
      if (isDragging) {
        const deltaMove = { x: e.offsetX - previousMousePosition.x, y: e.offsetY - previousMousePosition.y };
        group.rotation.y += deltaMove.x * 0.01;
        group.rotation.x += deltaMove.y * 0.01;
      }
      previousMousePosition = { x: e.offsetX, y: e.offsetY };
    };

    const onWheel = (e) => {
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
    dom.addEventListener('touchstart', () => isDragging = true, {passive: true});
    dom.addEventListener('touchend', () => isDragging = false, {passive: true});
    dom.addEventListener('touchmove', (e) => {
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
      cancelAnimationFrame(requestRef.current);
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

      {/* HUD */}
      <div className={`absolute bottom-4 left-4 bg-white/90 backdrop-blur shadow-lg rounded-lg border border-gray-200 text-xs transition-all duration-300 overflow-hidden select-none ${isHudExpanded ? 'w-[180px]' : 'w-auto'}`}>
          <div
            className="flex items-center justify-between px-3 py-2 bg-gray-50/80 cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => setIsHudExpanded(!isHudExpanded)}
          >
             <h5 className="font-bold text-gray-800 flex items-center gap-1.5">
               <Maximize size={12} /> {t('specTitle')}
             </h5>
             {isHudExpanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronUp size={14} className="text-gray-500" />}
          </div>

          {isHudExpanded && (
            <div className="p-3 space-y-2 border-t border-gray-100">
               <div className="space-y-0.5">
                 <div className="flex justify-between items-center text-gray-500 text-[10px] font-bold uppercase">
                   <span>{t('cartonLabel')} ({units.length})</span>
                 </div>
                 <div className="font-mono font-bold text-gray-700">
                   {formatDim(outer.l)} x {formatDim(outer.w)} x {formatDim(outer.h)}
                 </div>
               </div>

               <div className="space-y-0.5">
                 <div className="flex justify-between items-center text-blue-500 text-[10px] font-bold uppercase">
                   <span>{t('innerLabel')} ({units.length})</span>
                 </div>
                 <div className="font-mono font-bold text-blue-600">
                   {formatDim(inner.l)} x {formatDim(inner.w)} x {formatDim(inner.h)}
                 </div>
               </div>

               <div className="w-full h-px bg-gray-200 my-1"></div>

               <div className="space-y-0.5">
                 <div className="flex justify-between items-center text-gray-500 text-[10px] font-bold uppercase">
                   <span>{t('productLabel')} ({units.length})</span>
                 </div>
                 {scenario && scenario.dims ? (
                   <div className="font-mono font-bold text-gray-700">
                     {formatDim(scenario.dims[0])} x {formatDim(scenario.dims[1])} x {formatDim(scenario.dims[2])}
                   </div>
                 ) : (
                    <div className="text-gray-400">-</div>
                 )}
               </div>
               <div className="text-[9px] text-gray-400 mt-1 italic">
                  {t('dimNote')}
               </div>
            </div>
          )}
      </div>

      <div className="absolute top-2 right-2 text-[10px] bg-black/60 text-white px-2 py-1 rounded pointer-events-none flex items-center gap-1">
        <ZoomIn size={10} /> {t('zoomHint')}
      </div>
    </div>
  );
};


// --- UI Components ---
const CompactCard = ({ children, className = "", title, icon: Icon, highlight = false, action = null }) => (
  <div className={`bg-white rounded-lg shadow-sm border ${highlight ? 'border-blue-200 shadow-md' : 'border-gray-200'} flex flex-col h-full ${className}`}>
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

const CompactInput = ({ label, value, onChange, unit, step = "0.1", className="" }) => (
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

const StatRow = ({ label, value, sub, isAlert = false, isSuccess = false }) => (
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

const SettingsModal = ({ isOpen, onClose, rates, setRates, dimFactor, setDimFactor, exchangeRate, setExchangeRate, units, customCartons, setCustomCartons, t }) => {
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
             <div className="grid grid-cols-2 gap-4">
                <CompactInput label={`${t('unitPriceAir')} /kg`} value={rates.air} onChange={v => setRates({...rates, air: v})} unit={rates.airCurrency} />
                <CompactInput label={`${t('unitPriceSea')} /${rates.seaUnit}`} value={rates.sea} onChange={v => setRates({...rates, sea: v})} unit={rates.seaCurrency} />
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

const SimulationModal = ({ isOpen, onClose, item, outer, units, onApply, customCartons, rates, dimFactor, exchangeRate, t, cartonThickness, isContainerMode = false }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [simOuter, setSimOuter] = useState(outer);
  const [simItem, setSimItem] = useState(item);
  const [isTuningOpen, setIsTuningOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSimOuter(outer);
      setSimItem(item);
    }
  }, [outer, item, isOpen]);

  const packingSpace = useMemo(() => {
      if (isContainerMode) return simOuter;

      let metricThickness = 0;
      if (cartonThickness) {
         metricThickness = units.length === 'inch' ? cartonThickness * 2.54 : cartonThickness;
      }

      return {
          l: Math.max(0, simOuter.l - (metricThickness * 2)),
          w: Math.max(0, simOuter.w - (metricThickness * 2)),
          h: Math.max(0, simOuter.h - (metricThickness * 2)),
          weight: simOuter.weight
      };
  }, [simOuter, cartonThickness, units, isContainerMode]);

  const scenarios = useMemo(() => {
    return calculatePackingScenarios(simItem, packingSpace);
  }, [simItem, packingSpace]);

  const current = scenarios[selectedIdx] || {};

  const fromMetricL = (val) => units.length === 'inch' ? val / 2.54 : val;
  const fromMetricW = (val) => units.weight === 'lb' ? val / 0.453592 : val;
  const displayLength = (val) => `${fromMetricL(val).toFixed(2)} ${units.length}`;
  const displayWeight = (val) => `${fromMetricW(val).toFixed(2)} ${units.weight}`;
  const convertRate = (amount, fromCurr) => {
    if (fromCurr === units.currency) return amount;
    if (fromCurr === 'USD' && units.currency === 'RMB') return amount * exchangeRate;
    if (fromCurr === 'RMB' && units.currency === 'USD') return amount / exchangeRate;
    return amount;
  };
  const displayMoney = (val) => `${units.currency} ${val.toFixed(2)}`;

  const getUnitCosts = (sc) => {
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

  const handleTune = (dim, delta) => {
    let deltaMetric = delta;
    if (units.length === 'inch') deltaMetric = delta * 2.54;
    setSimItem(prev => ({ ...prev, [dim]: Math.max(0.1, prev[dim] + deltaMetric) }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 md:p-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

        <div className="bg-white px-5 py-4 border-b flex justify-between items-center shadow-sm z-10">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xl">
              <Cuboid className="w-6 h-6 text-blue-600" /> 3D Simulation
            </h3>
            <p className="text-xs text-slate-500 mt-1">{t('subtitle')}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-6 h-6 text-gray-500" /></button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50">
          <div className="flex-1 relative bg-gradient-to-br from-slate-200 to-slate-300 shadow-inner min-h-[300px]">
             <ThreeVisualizer outer={simOuter} inner={packingSpace} scenario={current} units={units} t={t} isContainerMode={isContainerMode} />
             <div className="absolute top-4 left-4 bg-white/90 backdrop-blur p-2 rounded-lg shadow-sm border border-white/50 text-[10px] space-y-1">
                <div className="font-bold text-gray-600 mb-1">{t('orientationLabel')}</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div> {t('legendStandard')}</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500"></div> {t('legendGap')}</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-500"></div> {t('legendLayered')}</div>
             </div>
          </div>

          <div className="w-full md:w-96 bg-white border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
               <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                 {isContainerMode ? t('containerSelection') : t('selectCarton')}
               </h4>
               <select
                  className="w-full text-sm border-gray-300 rounded-md shadow-sm border p-2 mb-2 font-bold text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                  onChange={(e) => {
                     const val = e.target.value;
                     if (isContainerMode) {
                        const spec = CONTAINER_SPECS[val];
                        if(spec) setSimOuter({...spec, weight: 0});
                     } else {
                        if (val === 'custom') { setSimOuter(outer); }
                        else {
                           const std = customCartons[parseInt(val)];
                           let m = {l:std.l, w:std.w, h:std.h, weight:std.weight};
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
                      {displayWeight((current.count || 0) * simItem.weight + simOuter.weight)}
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
                    {['l', 'w', 'h'].map(dim => (
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

            <div className="p-4 border-b border-gray-100 flex-1 overflow-hidden flex flex-col">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 flex-shrink-0">{t('scenarios')}</h4>
              <div className="space-y-2 overflow-y-auto flex-1 pr-1">
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

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex-shrink-0 space-y-2">
               {!isContainerMode && (
                 <button onClick={() => onApply(simOuter)} className="w-full py-2.5 bg-blue-600 border border-transparent text-white font-bold rounded-lg shadow-sm hover:bg-blue-700 transition-all text-sm flex items-center justify-center gap-2">
                   <CheckCircle size={16} /> {t('applyCarton')}
                 </button>
               )}
               <button onClick={onClose} className="w-full py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg shadow-sm hover:bg-gray-50 text-sm">{t('close')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function LogisticsCalculator() {
  // --- Global Settings ---
  const [lang, setLang] = useState('zh');
  const [units, setUnits] = useState({ length: 'cm', weight: 'kg', currency: 'USD' });
  const [rates, setRates] = useState({ air: 6.5, airCurrency: 'USD', sea: 200, seaCurrency: 'USD', seaUnit: 'cbm' });
  const [dimFactor, setDimFactor] = useState(5000);
  const [exchangeRate, setExchangeRate] = useState(7.2);
  const [cartonThickness, setCartonThickness] = useState(0.5);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSimOpen, setIsSimOpen] = useState(false);
  const [mode, setMode] = useState('packing'); // 'packing' | 'loading'

  const t = (key) => TRANSLATIONS[lang][key] || key;

  // --- States ---
  const [customCartons, setCustomCartons] = useState([
    { labelKey: 'carton1', name: '工廠標準 A (小)', l: 30, w: 20, h: 15, weight: 0.5 },
    { labelKey: 'carton2', name: '工廠標準 B (中)', l: 40, w: 30, h: 25, weight: 0.8 },
    { labelKey: 'carton3', name: '工廠標準 C (大)', l: 50, w: 40, h: 30, weight: 1.2 },
    { labelKey: 'carton4', name: '出口專用紙箱 D', l: 60, w: 40, h: 40, weight: 1.5 },
    { labelKey: 'carton5', name: '特大號紙箱 E', l: 60, w: 50, h: 50, weight: 1.8 },
  ]);

  // Packing Mode Inputs
  const [product, setProduct] = useState({ l: 20, w: 12, h: 8, weight: 0.8 });
  const [carton, setCarton] = useState({ l: 60, w: 40, h: 40, weight: 1.5 });

  // Loading Mode Inputs
  const [shipmentCarton, setShipmentCarton] = useState({ l: 60, w: 40, h: 40, weight: 12.5 }); // Default large carton
  const [selectedContainerKey, setSelectedContainerKey] = useState('20gp');

  // --- Helper Functions ---
  const handleReset = () => {
    if(mode === 'packing') {
        setProduct({l:0,w:0,h:0,weight:0}); setCarton({l:0,w:0,h:0,weight:0});
    } else {
        setShipmentCarton({l:0,w:0,h:0,weight:0});
    }
  };
  const toMetricL = (val) => units.length === 'inch' ? val * 2.54 : val;
  const toMetricW = (val) => units.weight === 'lb' ? val * 0.453592 : val;
  const fromMetricL = (val) => units.length === 'inch' ? val / 2.54 : val;
  const fromMetricW = (val) => units.weight === 'lb' ? val / 0.453592 : val;
  const displayWeight = (val) => `${fromMetricW(val).toFixed(2)} ${units.weight}`;
  const displayLength = (val) => `${fromMetricL(val).toFixed(2)} ${units.length}`;
  const convertCurrency = (amount, fromCurr, toCurr) => {
    if (fromCurr === toCurr) return amount;
    if (fromCurr === 'USD' && toCurr === 'RMB') return amount * exchangeRate;
    if (fromCurr === 'RMB' && toCurr === 'USD') return amount / exchangeRate;
    return amount;
  };
  const displayMoney = (val, currencyCode = units.currency) => `${currencyCode} ${val.toFixed(2)}`;

  // --- Toggle Functions (Restored) ---
  const toggleLengthUnit = () => {
    const isCm = units.length === 'cm';
    const newUnit = isCm ? 'inch' : 'cm';
    const factor = isCm ? 1 / 2.54 : 2.54;

    const convert = (v) => parseFloat((v * factor).toFixed(2));

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
    const newUnit = isKg ? 'lb' : 'kg';
    const factor = isKg ? 2.20462 : 1 / 2.20462;

    const convert = (v) => parseFloat((v * factor).toFixed(3));

    setProduct(p => ({ ...p, weight: convert(p.weight) }));
    setCarton(c => ({ ...c, weight: convert(c.weight) }));
    setShipmentCarton(c => ({ ...c, weight: convert(c.weight) }));
    setCustomCartons(prev => prev.map(c => ({ ...c, weight: convert(c.weight) })));
    setUnits(u => ({ ...u, weight: newUnit }));
  };

  // --- Calculations: Packing Mode ---
  const innerCartonMetric = useMemo(() => {
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

  const packingCosts = useMemo(() => {
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

  // --- Calculations: Loading Mode ---
  const containerMetric = useMemo(() => CONTAINER_SPECS[selectedContainerKey], [selectedContainerKey]);
  const loadingScenarios = useMemo(() => calculatePackingScenarios(
      { l: toMetricL(shipmentCarton.l), w: toMetricL(shipmentCarton.w), h: toMetricL(shipmentCarton.h) },
      containerMetric
  ), [shipmentCarton, containerMetric, units]);

  const bestLoading = loadingScenarios[0] || null;
  const loadingStats = useMemo(() => {
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
  const handleApplyCarton = (newCarton) => {
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

  const simProduct = { l: toMetricL(product.l), w: toMetricL(product.w), h: toMetricL(product.h), weight: toMetricW(product.weight) };
  const simCartonInit = { l: toMetricL(carton.l), w: toMetricL(carton.w), h: toMetricL(carton.h), weight: toMetricW(carton.weight) };

  // Loading Sim Props
  const simShipmentCarton = { l: toMetricL(shipmentCarton.l), w: toMetricL(shipmentCarton.w), h: toMetricL(shipmentCarton.h), weight: toMetricW(shipmentCarton.weight) };
  const simContainer = CONTAINER_SPECS[selectedContainerKey]; // Already metric

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-800 flex flex-col">
      <SettingsModal
        isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}
        rates={rates} setRates={setRates} dimFactor={dimFactor} setDimFactor={setDimFactor}
        units={units} exchangeRate={exchangeRate} setExchangeRate={setExchangeRate}
        customCartons={customCartons} setCustomCartons={setCustomCartons} t={t}
      />

      <SimulationModal
         isOpen={isSimOpen} onClose={() => setIsSimOpen(false)}
         item={mode === 'packing' ? simProduct : simShipmentCarton}
         outer={mode === 'packing' ? simCartonInit : simContainer}
         units={units} rates={rates} dimFactor={dimFactor} exchangeRate={exchangeRate} t={t}
         onApply={handleApplyCarton} customCartons={customCartons} cartonThickness={cartonThickness}
         isContainerMode={mode === 'loading'}
      />

      <div className="max-w-5xl mx-auto w-full flex flex-col gap-4">

        {/* Top Navigation */}
        <div className="flex flex-col md:flex-row gap-3 bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200 justify-between items-center">
            <div className="flex gap-2">
               <button
                 onClick={() => setMode('packing')}
                 className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${mode === 'packing' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
               >
                 <Package size={16} /> {t('modePacking')}
               </button>
               <button
                 onClick={() => setMode('loading')}
                 className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${mode === 'loading' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
               >
                 <Container size={16} /> {t('modeLoading')}
               </button>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-xs font-bold shadow-sm">
                <Languages size={14} /> <span>{lang === 'zh' ? '繁' : 'EN'}</span>
              </button>
              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button onClick={toggleLengthUnit} className="px-3 py-1.5 text-xs font-bold hover:bg-white rounded-md text-slate-600 w-16">{units.length.toUpperCase()}</button>
                <div className="w-px h-4 bg-slate-300 mx-1"></div>
                <button onClick={toggleWeightUnit} className="px-3 py-1.5 text-xs font-bold hover:bg-white rounded-md text-slate-600 w-16">{units.weight.toUpperCase()}</button>
                <div className="w-px h-4 bg-slate-300 mx-1"></div>
                <button onClick={() => setUnits(u => ({...u, currency: u.currency === 'USD' ? 'RMB' : 'USD'}))} className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-white rounded-md text-center w-16">{units.currency}</button>
              </div>

              <button onClick={handleReset} className="p-2 bg-white border border-gray-200 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm" title={t('reset')}>
                <RotateCcw size={16} />
              </button>

              <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors text-xs font-bold shadow-sm group">
                <Settings size={16} className="group-hover:rotate-90 transition-transform duration-500" />
                <span>{t('settings')}</span>
              </button>
            </div>
        </div>

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
                    <div className="flex justify-between text-xs font-bold text-gray-600"><span>{t('utilization')}</span><span className={packingCosts?.stats.utilization < 70 ? 'text-orange-500' : 'text-green-600'}>{packingCosts ? packingCosts.stats.utilization.toFixed(1) : 0}%</span></div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${packingCosts?.stats.utilization > 80 ? 'bg-green-500' : 'bg-orange-400'}`} style={{ width: `${packingCosts ? packingCosts.stats.utilization : 0}%` }}></div></div>
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
        ) : (
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
                      onChange={(e) => setSelectedContainerKey(e.target.value)}
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
                     <div className={`text-2xl font-bold ${loadingStats?.utilization > 85 ? 'text-green-600' : 'text-orange-500'}`}>{loadingStats ? loadingStats.utilization.toFixed(1) + '%' : '-'}</div>
                  </div>
               </div>
            </CompactCard>
          </>
        )}

      </div>
    </div>
  );
}
