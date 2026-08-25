import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight, Check, Package, Container, Cuboid, Move3d,
  FileText, ShieldCheck, Warehouse, Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import InteractiveLoadPlanner from '../components/InteractiveLoadPlanner';
import { packWithConstraints, type PackItemSpec } from '../lib/binPacking';
import { track } from '../lib/track';

/**
 * Homepage v4 — less text, more product.
 *
 * IA: short hero (live 3D demo with motion affordance) → task-based navigation
 * to ALL tools ("What do you need to do?") → how-it-works told with real
 * product screenshots → the PDF deliverable → slim proof (comparison + engine
 * rules) → FAQ → CTA. Personas/feature-paragraph sections were cut: every
 * remaining block is either interactive, an image, or a table.
 */

// Two hero scenes, one per level of the packing problem — the tabs above the
// demo make it obvious WHICH problem is being shown. Both must look FULL.
const CONTAINER_SCENE = {
  container: { l: 589, w: 235, h: 239, maxWeight: 28200 }, // 20' GP
  specs: [
    { id: 'd1', label: 'Master carton', l: 58, w: 46, h: 47, weight: 18, qty: 160, color: 0xfbbf24 },
    { id: 'd2', label: 'Half carton', l: 48, w: 39, h: 39, weight: 12, qty: 90, color: 0x60a5fa },
    { id: 'd3', label: 'Fragile', l: 45, w: 38, h: 29, weight: 6, qty: 30, color: 0x34d399, maxStack: 0 },
  ] as PackItemSpec[],
};
const CARTON_SCENE = {
  container: { l: 60, w: 40, h: 40 }, // a single master carton
  specs: [
    { id: 'u1', label: 'Product unit', l: 14, w: 9, h: 8, weight: 0.4, qty: 100, color: 0xfbbf24 },
    { id: 'u2', label: 'Accessory box', l: 12, w: 8, h: 6, weight: 0.2, qty: 40, color: 0x60a5fa },
  ] as PackItemSpec[],
};
// Pallet is the DEFAULT hero scene (POSITIONING.md): pallet-shaped questions are
// 63% of search demand reaching this site, against 4.4% for container/3D. The
// demo has to show the thing the headline claims — cartons actually placed on a
// GMA deck, not a container. 122×102 GMA, 152 cm planning height, 1,134 kg.
const PALLET_SCENE = {
  container: { l: 122, w: 102, h: 152, maxWeight: 1134 },
  specs: [
    { id: 'p1', label: 'Case 40×30×25', l: 40, w: 30, h: 25, weight: 12, qty: 45, color: 0xfbbf24 },
    { id: 'p2', label: 'Case 30×25×20', l: 30, w: 25, h: 20, weight: 8, qty: 18, color: 0x60a5fa },
  ] as PackItemSpec[],
};

export default function HomePage() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);
  const location = useLocation();

  // scroll to an in-page section when arriving via a #hash link (e.g. the
  // header "Calculators" nav from another page) — the app has no global hash router
  useEffect(() => {
    if (!location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, [location.hash]);

  type HeroMode = 'pallet' | 'container' | 'carton';
  const [heroMode, setHeroMode] = useState<HeroMode>('pallet');
  const containerDemo = useMemo(() => packWithConstraints(CONTAINER_SCENE.container, CONTAINER_SCENE.specs), []);
  const cartonDemo = useMemo(() => packWithConstraints(CARTON_SCENE.container, CARTON_SCENE.specs), []);
  const palletDemo = useMemo(() => packWithConstraints(PALLET_SCENE.container, PALLET_SCENE.specs), []);
  // CARTON_SCENE has no maxWeight (a single carton has no payload rating), so
  // the record is typed on a widened scene shape rather than typeof CONTAINER_SCENE.
  type HeroScene = { container: { l: number; w: number; h: number; maxWeight?: number }; specs: PackItemSpec[] };
  const SCENES: Record<HeroMode, { scene: HeroScene; demo: typeof containerDemo }> = {
    pallet: { scene: PALLET_SCENE, demo: palletDemo },
    container: { scene: CONTAINER_SCENE, demo: containerDemo },
    carton: { scene: CARTON_SCENE, demo: cartonDemo },
  };
  const demo = SCENES[heroMode].demo;
  const scene = SCENES[heroMode].scene;

  const switchHero = (mode: HeroMode) => {
    setHeroMode(mode);
    track('hero_tab', mode);
  };

  const tasks = [
    {
      to: '/planner',
      icon: Move3d,
      accent: 'border-indigo-200 hover:border-indigo-400',
      iconCls: 'bg-indigo-600 text-white',
      title: T('Fill a container', '裝滿一個貨櫃'),
      body: T('Optimize mixed cartons in 3D, drag to adjust, export the plan.', '3D 優化混裝紙箱,拖動微調,導出方案。'),
      badge: T('Flagship', '主打'),
    },
    {
      to: '/packing',
      icon: Package,
      accent: 'border-slate-200 hover:border-blue-400',
      iconCls: 'bg-blue-100 text-blue-700',
      title: T('Size a carton', '計一個紙箱'),
      body: T('How many units fit per carton, and what each unit costs to ship.', '每箱裝幾多件,每件運費幾多。'),
    },
    {
      to: '/container',
      icon: Container,
      accent: 'border-slate-200 hover:border-teal-400',
      iconCls: 'bg-teal-100 text-teal-700',
      title: T('Pick a container size', '揀啱貨櫃尺寸'),
      body: T('Instant carton count & CBM for 20GP / 40GP / 40HQ.', '即時計 20GP/40GP/40HQ 裝箱數同 CBM。'),
    },
    {
      to: '/warehouse',
      icon: Warehouse,
      accent: 'border-slate-200 hover:border-purple-400',
      iconCls: 'bg-purple-100 text-purple-700',
      title: T('Arrange the warehouse floor', '規劃倉庫地面'),
      body: T('Pallet rows, forklift aisles, and live dock-reachability checks.', '卡板排位、叉車通道、實時碼頭可達性檢查。'),
      badge: T('Beta', 'Beta'),
    },
    {
      to: '/fba',
      icon: Cuboid,
      accent: 'border-slate-200 hover:border-amber-400',
      iconCls: 'bg-amber-100 text-amber-700',
      title: T('Check Amazon FBA fees', '查 Amazon FBA 費用'),
      body: T('2025 size tiers and fulfilment fee estimates for your product.', '2025 尺寸分級同配送費預估。'),
    },
  ];

  // standalone single-purpose calculators — surfaced here so the homepage
  // (the strongest page) links to each one directly
  const calculators = [
    { to: '/cbm-calculator', title: T('CBM Calculator', 'CBM 計算器'), body: T('Carton → total cubic meters, container fit & air chargeable weight.', '紙箱 → 總立方米、貨櫃裝載同空運計費重量。') },
    { to: '/dimensional-weight-calculator', title: T('Dimensional Weight Calculator', '體積重量計算器'), body: T('Billable / DIM weight for FBA, UPS, FedEx, DHL & air freight.', 'FBA、UPS、FedEx、DHL 同空運嘅計費/體積重量。') },
    { to: '/pallet-calculator', title: T('Pallet Calculator', '卡板計算器'), body: T('Cartons per pallet, layers, and pallets needed for an order.', '每板箱數、層數同訂單所需板數。') },
    { to: '/pallet-storage-cost-calculator', title: T('Pallet Storage Cost Calculator', '卡板倉存費用計算器'), body: T('Estimate 3PL / warehouse storage cost per pallet, per month.', '估算 3PL/倉庫每板每月倉存費用。') },
    { to: '/warehouse-space-calculator', title: T('Warehouse Space Calculator', '倉庫面積計算器'), body: T('Pallet count → floor area in square footage and m².', '卡板數 → 樓面面積(平方呎同 m²)。') },
    { to: '/forklift-aisle-width-calculator', title: T('Forklift Aisle Width Calculator', '鏟車通道闊度計算器'), body: T('The right-angle stacking aisle your forklift really needs.', '你架鏟車真正需要嘅直角入位通道闊度。') },
  ];

  const faqs = [
    { q: T('Is it really free?', '真係免費?'), a: T('Yes — planning and optimizing are free. Exporting PDF/CSV just asks for your email.', '係 — 規劃同優化免費,導出 PDF/CSV 只需留 email。') },
    { q: T('Do I need to install anything?', '要安裝嘢嗎?'), a: T('No. It runs in your browser, desktop or tablet.', '唔使,瀏覽器直接用。') },
    { q: T('Where does my data go?', '數據去咗邊?'), a: T('Nowhere — everything computes on your device. Shipment data never leaves your browser.', '邊度都冇去 — 全部喺你部機計,數據唔會離開瀏覽器。') },
    { q: T('Mixed carton sizes? Weight limits?', '混合尺寸?重量限制?'), a: T('Yes. Mixed sizes, payload limits, per-carton stacking limits, fragile cartons and unload order are all supported.', '支援。混合尺寸、載重、逐箱堆疊上限、易碎、落貨順序全部有。') },
    { q: T('What is the maximum pallet height for a container?', '貨櫃卡板最高可以砌幾高?'), a: T("Plan against the door, not the ceiling. A standard container's door header is ~2.28 m — about 10 cm below the 2.39 m interior — and the forklift needs room to lift and tilt, so loaded pallets are typically planned at 2.15–2.20 m (high-cube doors: ~2.58 m). The planner checks every carton against the door aperture automatically.", '要對住「門」規劃,唔係天花。標準櫃門楣約 2.28 米 — 比 2.39 米內籠低成 10cm — 鏟車仲要位抬高側入,所以卡板一般砌到 2.15–2.20 米(高櫃門約 2.58 米)。Planner 會自動逐箱對照門口檢查。') },
  ];

  return (
    <div className="-mt-14 md:-mt-16 bg-white">
      <Helmet>
        <title>{T("DimPack3D — Free 3D Container Load Planner & Bin Packing Calculator", "DimPack3D — 免費 3D 貨櫃裝載規劃器同裝箱計算機")}</title>
        <meta name="description" content={T(
          "Plan container loads in interactive 3D — auto-optimize with real bin-packing, drag cartons by hand, respect weight & stacking limits, then export a PDF load plan and packing list. Plus free CBM, carton packing and Amazon FBA calculators.",
          "喺互動 3D 入面規劃貨櫃裝載 — 用真實裝箱演算法自動優化,可以手動拖箱,兼顧重量同堆疊上限,再匯出 PDF 裝載計劃同裝箱單。另有免費 CBM、紙箱裝箱同 Amazon FBA 計算機。")} />
        <script type="application/ld+json">{`
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              { "@type": "Question", "name": "Is DimPack3D really free?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. The planner, optimizer and calculators are free. Exporting a PDF or CSV asks for your email." } },
              { "@type": "Question", "name": "Do I need to install anything?", "acceptedAnswer": { "@type": "Answer", "text": "No. Everything runs in the browser with no download or signup." } },
              { "@type": "Question", "name": "Where does my shipment data go?", "acceptedAnswer": { "@type": "Answer", "text": "Nowhere. All calculations run on your device; carton lists and load plans never leave your browser." } },
              { "@type": "Question", "name": "Can it handle mixed carton sizes and weight limits?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Mixed sizes, container payload limits, per-carton stacking limits, fragile cartons and unload order are supported." } },
              { "@type": "Question", "name": "What is the maximum pallet height for a container?", "acceptedAnswer": { "@type": "Answer", "text": "Plan against the door, not the ceiling. A standard container's door header is about 2.28 m, roughly 10 cm below the 2.39 m interior, and the forklift needs lift-and-tilt room, so loaded pallets are typically planned at 2.15 to 2.20 m. High-cube doors are about 2.58 m. DimPack3D checks every carton against the door aperture automatically." } }
            ]
          }
        `}</script>
      </Helmet>

      {/* ============ HERO ============ */}
      <section className="relative bg-slate-950 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
        <div className="relative max-w-6xl mx-auto px-4 pt-24 md:pt-32 pb-14 md:pb-20">
          <div className="grid lg:grid-cols-[4fr_6fr] gap-10 lg:gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-3 py-1 mb-6">
                <Check size={13} />
                {T('Free · in your browser', '免費 · 瀏覽器即用')}
              </div>
              {/* Pallet-first headline (POSITIONING.md §3). The old line, "Stop
                  shipping air", sold container void — 2.3% of demand.
                  ⛔ 2026-08-26: the first version of this claimed the pallet
                  answers came from "a real packing engine". They do NOT. The
                  pallet tools use perLayer() — best of two block orientations,
                  which IS deck area divided by carton area — and palletBoxes()
                  deliberately bypasses packWithConstraints because the general
                  engine places 30 where the block math places 40. The engine
                  powers /planner, /packing, /container and /api/pack (mixed
                  loads), not the pallet count. Claim only what the code does:
                  we DRAW the arrangement and cap it by the real weight rating. */}
              <h1 className="text-4xl md:text-5xl font-black leading-[1.08] mb-5">
                {T('Most pallet calculators give you a number. This one shows you the stack.', '大部分卡板計算機淨係俾個數字。呢個仲畫埋成疊點砌。')}
              </h1>
              <p className="text-lg text-slate-300 leading-relaxed mb-8">
                {T(
                  'Cartons per pallet, pallets per container, floor space and storage cost — with the actual layer pattern drawn, capped by the pallet\u2019s real weight rating, and every assumption written down.',
                  '每板箱數、每櫃板數、佔地面積同倉存成本 — 連實際逐層擺法畫埋出嚟,受卡板真實載重上限限制,所有假設都寫明。',
                )}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  to={heroMode === 'pallet' ? '/pallet-calculator' : heroMode === 'container' ? '/planner' : '/packing'}
                  className="group inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white px-7 py-3.5 rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-500/25"
                >
                  {heroMode === 'pallet'
                    ? T('Calculate cartons per pallet — free', '免費計每板箱數')
                    : heroMode === 'container' ? T('Plan a container — free', '免費規劃一個貨櫃') : T('Pack a carton — free', '免費計一個紙箱')}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              <div className="flex flex-wrap gap-2 mt-8">
                <span className="text-xs font-mono bg-slate-800/80 border border-slate-700 text-emerald-300 rounded-full px-3 py-1">
                  {demo.stats.volumeUtil.toFixed(1)}% {T('utilization', '利用率')}
                </span>
                <span className="text-xs font-mono bg-slate-800/80 border border-slate-700 text-slate-300 rounded-full px-3 py-1">
                  {demo.boxes.length} {heroMode === 'carton' ? T('units', '件') : T('cartons', '箱')}
                </span>
                {heroMode === 'container' && (
                  <span className="text-xs font-mono bg-slate-800/80 border border-slate-700 text-slate-300 rounded-full px-3 py-1">
                    {(demo.stats.totalWeight / 1000).toFixed(1)}t / 28.2t
                  </span>
                )}
                {heroMode === 'pallet' && (
                  <span className="text-xs font-mono bg-slate-800/80 border border-slate-700 text-slate-300 rounded-full px-3 py-1">
                    {Math.round(demo.stats.totalWeight)} kg / 1,134 kg
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {T('Live numbers — computed by the optimizer in your browser right now.', '實時數據 — 由優化引擎喺你瀏覽器即刻計出。')}
              </p>
            </div>

            {/* the actual product, live + motion affordance + explicit mode tabs */}
            <div>
              <div className="flex gap-1.5 mb-3">
                <button
                  onClick={() => switchHero('pallet')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    heroMode === 'pallet' ? 'bg-blue-500 text-white' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700'
                  }`}
                >
                  <Layers size={15} /> {T('Cartons → pallet', '紙箱 → 卡板')}
                </button>
                <button
                  onClick={() => switchHero('container')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    heroMode === 'container' ? 'bg-blue-500 text-white' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700'
                  }`}
                >
                  <Container size={15} /> {T('Cartons → container', '紙箱 → 貨櫃')}
                </button>
                <button
                  onClick={() => switchHero('carton')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    heroMode === 'carton' ? 'bg-blue-500 text-white' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700'
                  }`}
                >
                  <Package size={15} /> {T('Products → carton', '產品 → 紙箱')}
                </button>
              </div>
              <div className="rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/40 overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                  <span className="ml-3 text-xs text-slate-500 font-mono">
                    {heroMode === 'pallet'
                      ? T('GMA pallet 48×40" · 152 cm load height · 1,134 kg', 'GMA 卡板 48×40" · 152 cm 堆疊高度 · 1,134 kg')
                      : heroMode === 'container'
                        ? T("20' GP shipping container · 589×235×239 cm", "20' GP 貨櫃 · 589×235×239 cm")
                        : T('Master carton · 60×40×40 cm', '外箱 · 60×40×40 cm')}
                  </span>
                </div>
                <div className="p-3 [&_p]:text-slate-500 [&_.bg-slate-100]:bg-slate-800 [&_.bg-slate-100]:text-slate-300 [&_.text-slate-700]:text-slate-300 [&_.bg-slate-200]:bg-slate-700 [&_.bg-slate-200]:text-slate-200">
                  <InteractiveLoadPlanner
                    key={heroMode}
                    container={scene.container}
                    boxes={demo.boxes}
                    grid={1}
                    unitLabel="cm"
                    showDoor={heroMode === 'container'}
                    autoSpin
                    hintOverlay
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ THE FOUR PALLET QUESTIONS ============
          Sits directly under the hero because pallet-shaped queries are 63% of
          the search demand reaching this site (POSITIONING.md §1) and every tool
          for them already existed — scattered, and buried at positions 52-77.
          The order is the order the questions actually get asked in. */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
            {T('Work out your pallets', '搞掂你嘅卡板')}
          </h2>
          <p className="text-slate-500 mb-8 max-w-2xl">
            {T(
              'Four questions, in the order they come up. Every answer uses the same shared pallet maths — so the count on one page can never disagree with the next.',
              '四條問題,順住你實際會問嘅次序。每個答案都用同一套卡板計算 — 所以呢一頁嘅數,唔會同下一頁對唔上。',
            )}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { to: '/pallet-calculator', n: '1', q: T('How many cartons fit on a pallet?', '一板可以裝幾多箱?'),
                d: T('Cartons per layer, layers to max height, capped by the pallet weight rating.', '每層箱數、到最大高度嘅層數,再受卡板載重上限限制。') },
              { to: '/pallets-per-container', n: '2', q: T('How many pallets fit in a container?', '一個櫃裝到幾多板?'),
                d: T('20ft and 40ft floor patterns, double-stacking by loaded height, payload-capped.', '20 呎同 40 呎地面擺法、按裝載高度雙層堆疊,受載重限制。') },
              { to: '/warehouse-space-calculator', n: '3', q: T('How much floor space is that?', '咁要幾多面積?'),
                d: T('Pallet positions to square footage and m², including forklift aisles.', '卡板位換算成平方呎同平方米,連叉車通道計埋。') },
              { to: '/pallet-storage-cost-calculator', n: '4', q: T('What will storage cost?', '倉存要幾多錢?'),
                d: T('3PL or own-warehouse cost per pallet per month, at your rate.', '3PL 或者自家倉,每板每月成本,用你自己個價。') },
            ].map((c) => (
              <Link
                key={c.to}
                to={c.to}
                onClick={() => track('pallet_chain', c.to)}
                className="group block rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md bg-white p-5 transition-all"
              >
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-black mb-3">{c.n}</span>
                <div className="font-bold text-slate-900 mb-1.5 leading-snug group-hover:text-blue-700 transition-colors">{c.q}</div>
                <p className="text-sm text-slate-500 leading-relaxed">{c.d}</p>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-sm text-slate-500">
            {T('Also: ', '仲有:')}
            <Link to="/ti-hi-calculator" className="text-blue-600 hover:underline">{T('TI × HI', 'TI × HI')}</Link>
            {' · '}
            <Link to="/pallet-builder" className="text-blue-600 hover:underline">{T('see the stack in 3D', '3D 睇實際堆疊')}</Link>
            {' · '}
            <Link to="/cbm-calculator" className="text-blue-600 hover:underline">{T('CBM & chargeable weight', 'CBM 同計費重量')}</Link>
          </div>
        </div>
      </section>

      {/* ============ THE EXPENSIVE SURPRISES — pain first ============ */}
      <section className="bg-red-50/60 border-b border-red-100">
        <div className="max-w-6xl mx-auto px-4 py-14 md:py-20">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
            {T('The problems that surface at the last step', '去到最後一步先爆嘅問題')}
          </h2>
          <p className="text-slate-600 mb-8 max-w-3xl">
            {T('None of these are hypothetical. They happen to mature, experienced teams — at the dock, at the weighbridge, at delivery — exactly when fixing them costs the most. Every one is catchable at planning time.',
               '呢啲唔係憑空想像 — 成熟、有經驗嘅團隊一樣會中,而且爆嘅位置永遠喺碼頭、地磅、收貨嗰刻,即係最貴嘅時候。其實每一單,喺規劃嗰陣已經可以截住。')}
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                scene: T('"The pallets were planned against the container\'s internal height — they don\'t clear the door header."', '「啲卡板用內籠高度嚟砌 — 過唔到門楣。」'),
                cost: T('Restuffing at the port, per-diem charges, a missed vessel.', '碼頭重新入櫃、滯期費、趕唔切班船。'),
                fix: T('The door opening sits ~10 cm below the ceiling (2.28 m vs 2.39 m), and the forklift still needs room to lift and tilt. We check every carton against the DOOR while you plan.', '櫃門開口比天花低成 10cm(2.28 對 2.39 米),鏟車仲要位抬高側入。我哋規劃時逐箱對住「門」檢查,唔係天花。'),
                to: '/planner', label: T('Door clearance', '櫃門淨空'),
              },
              {
                scene: T('"The truck is legal on gross weight — and still gets cited. The rear axle group is over."', '「架車總重完全合法 — 照樣食牛肉乾:後軸組超咗。」'),
                cost: T('A weigh-station citation, then offloading at a transload yard to redistribute.', '地磅告票,仲要拉去轉運場卸貨重新分配。'),
                fix: T('Axle-group violations are among the most common weigh-station citations. Every carton\'s weight splits kingpin vs tandems by the lever rule, live, as you drag.', '軸組超載係地磅最常見告票之一。每箱重量按槓桿原理實時拆分牽引銷/後軸 — 你一路拖,佢一路計。'),
                to: '/planner', label: T('Axle loads', '車軸配重'),
              },
              {
                scene: T('"The consignee filed a damage claim — the bottom layer buckled somewhere at sea."', '「收貨人索償 — 最底嗰層喺海上唔知幾時已經冧咗。」'),
                cost: T('Industry analyses trace roughly two-thirds of intermodal cargo claims to poor packing — and Amazon rejects overhanging pallets outright.', '行業分析指出 intermodal 貨損索償約三分之二源於裝載不當 — Amazon 更加係見到卡板懸出就直接拒收。'),
                fix: T('Crush limits per carton from the board grade (McKee), heavy-over-light warnings, and pallet-overhang flags — all live while you plan.', '每箱按紙板等級(McKee)計抗壓上限、重壓輕警告、卡板懸出標記 — 規劃時全部實時檢查。'),
                to: '/planner', label: T('Crush & stacking', '抗壓與堆疊'),
              },
              {
                scene: T('"The aisle was measured for straight travel — the truck can\'t make the right-angle turn into the rack bay."', '「條通道係按直行量嘅 — 鏟車轉唔到直角彎入貨架。」'),
                cost: T('Re-slotting a live warehouse with full racks.', '貨架全滿嘅倉,要成個重新排過。'),
                fix: T('Right-angle stacking needs more room than straight travel — a classic layout mistake. We check the straight width AND the 90° turn box separately; tight corners flag red before you commit.', '直角入位所需空間大過直行 — 經典佈局失誤。我哋直行闊度同 90° 轉彎淨空分開檢查,未落實之前窄彎已經標紅。'),
                to: '/warehouse', label: T('Right-angle turns', '直角轉彎'),
              },
            ].map((c, i) => (
              <Link key={i} to={c.to} className="group rounded-2xl bg-white border border-slate-200 p-5 hover:border-red-300 hover:shadow-lg transition-all">
                <p className="font-bold text-slate-900 mb-2">{c.scene}</p>
                <p className="text-sm text-red-600 mb-2.5">💸 {c.cost}</p>
                <p className="text-sm text-slate-600 mb-3">{c.fix}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 group-hover:gap-2.5 transition-all">
                  {c.label} <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TASK NAV — the whole chain, every tool ============ */}
      <section className="max-w-6xl mx-auto px-4 py-14 md:py-20">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-3">
          {T('One tool for every level of the load', '一件工具,覆蓋成條裝載鏈')}
        </h2>
        {/* the chain: makes the levels + what exists at each one explicit */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-8 text-sm font-semibold">
          {[
            { label: T('Products', '產品'), to: '/packing' },
            { label: T('Cartons', '紙箱'), to: '/planner' },
            { label: T('Containers · pallets · trucks', '貨櫃 · 卡板 · 貨車'), to: '/answers' },
            { label: T('Warehouse floor', '倉庫地面'), to: '/warehouse', beta: true },
          ].map((step, i, arr) => (
            <span key={i} className="flex items-center gap-3">
              <Link to={step.to} className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                {step.label}
                {step.beta && <span className="ml-1.5 text-[9px] font-black uppercase bg-indigo-600 text-white px-1.5 py-0.5 rounded-full align-middle">Beta</span>}
              </Link>
              {i < arr.length - 1 && <ArrowRight size={15} className="text-slate-300" />}
            </span>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {tasks.map((t, i) => (
            <Link key={i} to={t.to} className={`group relative rounded-2xl border-2 ${t.accent} p-5 transition-all hover:shadow-lg`}>
              {t.badge && (
                <span className="absolute top-4 right-4 text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white px-2 py-0.5 rounded-full">{t.badge}</span>
              )}
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${t.iconCls}`}>
                <t.icon size={22} />
              </div>
              <h3 className="font-bold text-slate-900 mb-1.5">{t.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{t.body}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 group-hover:gap-2.5 transition-all">
                {T('Open', '打開')} <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>

      </section>

      {/* ============ FREE CALCULATORS SUITE — homepage links to every standalone tool ============ */}
      <section id="calculators" className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-14 md:py-20">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
            {T('Free shipping & warehouse calculators', '免費運輸同倉庫計算器')}
          </h2>
          <p className="text-slate-600 mb-8 max-w-2xl">
            {T('Quick single-purpose tools — no signup. Every one shows its formula and assumptions, and works in metric or imperial.',
               '快速單一用途工具,無需註冊。每個都列明公式同假設,支援公制同英制。')}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {calculators.map((c) => (
              <Link key={c.to} to={c.to} className="group rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition-all">
                <h3 className="font-bold text-slate-900 text-sm mb-1 flex items-center justify-between gap-2">
                  {c.title}
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">{c.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS — shown, not told ============ */}
      <section id="how" className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">
            {T('Cartons in, load plan out', '入箱單,出方案')}
          </h2>
          <p className="text-lg text-slate-600 mb-12">
            {T('If you can drag a box, you can plan a container.', '識拖一個箱,就識規劃一個櫃。')}
          </p>

          <div className="grid lg:grid-cols-2 gap-10 items-center mb-16">
            <div className="order-2 lg:order-1">
              <span className="inline-block text-xs font-black uppercase tracking-wider text-blue-700 bg-blue-100 rounded-full px-3 py-1 mb-4">{T('Step 1 + 2', '第 1 + 2 步')}</span>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                {T('Type your cartons, hit Optimise', '輸入紙箱,㩒一下優化')}
              </h3>
              <ul className="space-y-2.5 text-slate-600 text-sm">
                <li className="flex gap-2.5"><Check size={17} className="text-emerald-600 shrink-0 mt-0.5" />{T('Sizes, weights, quantities — mark fragile or this-way-up', '尺寸、重量、數量 — 可標易碎、不可倒置')}</li>
                <li className="flex gap-2.5"><Check size={17} className="text-emerald-600 shrink-0 mt-0.5" />{T('Real bin-packing fills the container, respecting weight & stacking limits', '真實裝箱算法填滿貨櫃,遵守重量與堆疊限制')}</li>
                <li className="flex gap-2.5"><Check size={17} className="text-emerald-600 shrink-0 mt-0.5" />{T('Then drag any carton in 3D — moves snap to grid and never overlap', '再喺 3D 拖任何一箱 — 自動貼格、永不重疊')}</li>
              </ul>
            </div>
            <div className="order-1 lg:order-2">
              <img
                src="/screenshots/planner-ui.png"
                alt={T('The DimPack3D planner: carton inputs on the left, packed 3D container on the right', 'DimPack3D 規劃器:左邊輸入紙箱,右邊 3D 裝櫃結果')}
                loading="lazy"
                className="rounded-2xl border border-slate-200 shadow-xl w-full"
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <img
                src="/screenshots/load-plan-pdf.png"
                alt={T('The exported PDF load plan: 3D snapshot, utilization stats and a carton-by-carton packing list', '導出嘅 PDF 裝載方案:3D 截圖、利用率統計、逐箱裝箱單')}
                loading="lazy"
                className="rounded-2xl border border-slate-200 shadow-xl w-full max-w-md mx-auto"
              />
            </div>
            <div>
              <span className="inline-block text-xs font-black uppercase tracking-wider text-blue-700 bg-blue-100 rounded-full px-3 py-1 mb-4">{T('Step 3', '第 3 步')}</span>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                {T('Export a plan your warehouse can follow', '導出倉庫照住做嘅方案')}
              </h3>
              <ul className="space-y-2.5 text-slate-600 text-sm mb-6">
                <li className="flex gap-2.5"><FileText size={17} className="text-blue-600 shrink-0 mt-0.5" />{T('PDF load plan — 3D snapshot, stats, load zones', 'PDF 裝載方案 — 3D 截圖、統計、裝載分區')}</li>
                <li className="flex gap-2.5"><FileText size={17} className="text-blue-600 shrink-0 mt-0.5" />{T('CSV packing list — every carton with its exact position', 'CSV 裝箱單 — 每箱連精確位置')}</li>
                <li className="flex gap-2.5"><Check size={17} className="text-emerald-600 shrink-0 mt-0.5" />{T('The deliverable commercial tools charge $350–$5,000/yr for', '商業軟件收 $350–$5,000/年先有嘅交付物')}</li>
              </ul>
              <Link to="/planner" className="group inline-flex items-center gap-2 text-blue-700 font-bold hover:gap-3 transition-all">
                {T('Try it now', '即刻試')} <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ EXAMPLE PLANS ============ */}
      {/* ============ SEE IT MOVE — real product clips, real engine ============ */}
      <section className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-14 md:py-20">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
            {T('Watch the checks fire', '睇住啲檢查即時發火')}
          </h2>
          <p className="text-slate-600 mb-8 max-w-3xl">
            {T('Real product, real engine — recorded straight from the browser, no staging. Every drag re-runs the physics.',
               '真產品、真引擎 — 直接由瀏覽器錄製,冇擺拍。每一下拖動都重新計一次物理。')}
          </p>
          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <video
                autoPlay muted loop playsInline
                poster="/media/warehouse-checks-poster.jpg"
                width={1280} height={720}
                className="rounded-2xl border border-slate-200 shadow-xl w-full h-auto"
                aria-label={T('Warehouse floor planner: forklift route simulation and live reachability flags', '倉庫規劃器:鏟車路線模擬與實時可達性標記')}
              >
                <source src="/media/warehouse-checks.webm" type="video/webm" />
                <source src="/media/warehouse-checks.mp4" type="video/mp4" />
              </video>
              <p className="text-sm text-slate-600 mt-3">
                <b>{T('Warehouse:', '倉庫:')}</b>{' '}
                {T('click a pallet — the forklift route and clearance band draw themselves; drag it across an aisle and cut-off stock flags red instantly.',
                   '點一下卡板 — 鏟車路線同淨空帶自動畫出;拖過通道,被截斷嘅貨即刻標紅。')}
              </p>
            </div>
            <div>
              <video
                autoPlay muted loop playsInline
                poster="/media/planner-drag-poster.jpg"
                width={1280} height={720}
                className="rounded-2xl border border-slate-200 shadow-xl w-full h-auto"
                aria-label={T('Container planner: dragging cartons with live re-checking', '貨櫃規劃器:拖動紙箱,實時重新檢查')}
              >
                <source src="/media/planner-drag.webm" type="video/webm" />
                <source src="/media/planner-drag.mp4" type="video/mp4" />
              </video>
              <p className="text-sm text-slate-600 mt-3">
                <b>{T('Container:', '貨櫃:')}</b>{' '}
                {T('a packed 20\' GP — drag any carton and collisions, stacking rules and stats re-check on every move.',
                   '裝滿嘅 20\' GP — 拖任何一箱,碰撞、堆疊規則同統計每一步重新檢查。')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-14 md:py-20">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
          {T('Or start from a real scenario', '或者由真實場景開始')}
        </h2>
        <p className="text-slate-600 mb-8">{T('One click loads the full example — cartons, constraints, everything.', '一鍵載入完整示範 — 箱單、約束、全套。')}</p>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { demo: 'retail', title: T('Mixed retail import', '混裝零售進口'), body: T("20'GP · 3 carton sizes · fragile on top", "20'GP · 3 種箱型 · 易碎放頂"), tag: T('Fragile', '易碎') },
            { demo: 'furniture', title: T('Flat-pack furniture', '平板傢俬'), body: T("40'HQ · sofas & flat-packs kept this-way-up", "40'HQ · 梳化同平板箱不可倒置"), tag: T('This-way-up', '不可倒置') },
            { demo: 'multistop', title: T('Multi-stop delivery', '多站卸貨'), body: T("20'GP · first stop loads nearest the door", "20'GP · 第一站自動排最近櫃門"), tag: T('Unload order', '落貨順序') },
          ].map((s, i) => (
            <Link key={i} to={`/planner?demo=${s.demo}`} className="group rounded-2xl border border-slate-200 p-5 hover:border-blue-400 hover:shadow-lg transition-all">
              <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 rounded-full px-2.5 py-1 mb-3">{s.tag}</span>
              <h3 className="font-bold text-slate-900 mb-1.5">{s.title}</h3>
              <p className="text-sm text-slate-600 mb-3">{s.body}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 group-hover:gap-2.5 transition-all">
                {T('Load example', '載入示範')} <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ THE SYSTEM: one engine, every layer of the team ============ */}
      <section className="max-w-6xl mx-auto px-4 py-14 md:py-20">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
          {T('One engine. One plan. Every layer of your team.', '一個引擎、一個方案,團隊每一層都用得着。')}
        </h2>
        <p className="text-slate-600 mb-8 max-w-3xl">
          {T('The bin-packing engine and its reality checks sit at the core. Around it, the same plan becomes what each person actually needs — nobody re-types anything.',
             '核心係裝箱引擎同成套現實檢查。同一個方案,自動變成每個崗位真正需要嘅嘢 — 冇人需要重新打過任何資料。')}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { who: T('The planner', '規劃員'), what: T('Imports the carton list from Excel, optimizes in 3D, drags to fine-tune — every move re-checked live.', '由 Excel 匯入箱單、3D 優化、拖放微調 — 每一步實時重新檢查。'), icon: <Move3d size={20} /> },
            { who: T('The manager', '主管'), what: T('Gets a review link — approve or request changes, with a full audit trail of who changed what.', '收到審批連結 — 批准或要求修改,邊個改過乜全程有紀錄。'), icon: <ShieldCheck size={20} /> },
            { who: T('The loading crew', '裝櫃工人'), what: T('Gets the numbered loading sheet — #1 first, back of the container, floor level. Taped at the door.', '攞住編號裝櫃表 — #1 先入、最入最底。貼喺閘口照住裝。'), icon: <Package size={20} /> },
            { who: T('The paperwork', '文件崗位'), what: T('VGM (cargo + tare), axle splits and weights come off the same plan — no side calculations.', 'VGM(貨重+櫃重)、軸重、總重全部由同一方案直接出 — 唔使另外計。'), icon: <FileText size={20} /> },
          ].map((c, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 p-5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3">{c.icon}</div>
              <h3 className="font-bold text-slate-900 mb-1.5">{c.who}</h3>
              <p className="text-sm text-slate-600">{c.what}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ PROOF: comparison + engine rules ============ */}
      <section className="bg-slate-950 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          {/* Was "Not a CBM toy — a load-planning engine". That line defined the
              product by what it refuses to be, and the thing it dismissed (CBM)
              is 13.7% of search demand while the position it defended is 2.1%.
              The engine is the PROOF the simple answer is right, not a rival to
              it — see POSITIONING.md §2. */}
          <h2 className="text-2xl md:text-3xl font-black mb-10">
            {T('Why the number is right', '點解個數係啱嘅')}
          </h2>
          <div className="grid lg:grid-cols-2 gap-10">
            {/* comparison */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-slate-400">
                    <th className="p-3.5"></th>
                    <th className="p-3.5 font-semibold">{T('Spreadsheet', 'Excel')}</th>
                    <th className="p-3.5 font-black text-blue-400">DimPack3D</th>
                    <th className="p-3.5 font-semibold">{T('Commercial', '商業軟件')}</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:p-3.5 [&_tr]:border-b [&_tr]:border-slate-800/60">
                  <tr><td className="text-slate-300">{T('3D bin-packing', '3D 裝箱')}</td><td className="text-slate-600">✗</td><td className="text-emerald-400 font-bold">✓</td><td className="text-emerald-500">✓</td></tr>
                  <tr><td className="text-slate-300">{T('Weight & stack limits', '重量堆疊限制')}</td><td className="text-slate-600">✗</td><td className="text-emerald-400 font-bold">✓</td><td className="text-emerald-500">✓</td></tr>
                  <tr><td className="text-slate-300">{T('Drag-edit in 3D', '3D 拖放編輯')}</td><td className="text-slate-600">✗</td><td className="text-emerald-400 font-bold">✓</td><td className="text-slate-500">{T('some', '部分')}</td></tr>
                  <tr><td className="text-slate-300">{T('PDF plan + packing list', 'PDF + 裝箱單')}</td><td className="text-slate-600">✗</td><td className="text-emerald-400 font-bold">✓</td><td className="text-emerald-500">✓</td></tr>
                  <tr><td className="text-slate-300">{T('Price / year', '每年價錢')}</td><td className="text-slate-500">$0</td><td className="text-emerald-400 font-black">$0</td><td className="text-slate-400">$350–5,000+</td></tr>
                </tbody>
              </table>
            </div>
            {/* engine rules */}
            <div>
              <h3 className="font-bold text-lg mb-4">{T('Every placement must pass:', '每個擺位必須通過:')}</h3>
              <ul className="space-y-3 text-sm text-slate-300">
                {[
                  T('Full 3D collision check — no overlaps, ever', '完整 3D 碰撞檢測 — 永不重疊'),
                  T('≥60% base support — nothing floats', '≥60% 底部支撐 — 冇箱浮空'),
                  T('Stack loads propagate down and respect per-carton limits', '堆疊重量向下傳遞,遵守逐箱上限'),
                  T('Container payload enforced (28.2t / 26.7t / 26.5t)', '貨櫃載重上限嚴格執行'),
                  T('Heavy cartons first — centre of gravity stays low, with live balance warning', '重箱優先、重心保持低 + 實時平衡警告'),
                ].map((rule, i) => (
                  <li key={i} className="flex gap-3"><Check size={17} className="text-emerald-400 shrink-0 mt-0.5" />{rule}</li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-emerald-300/90 border-t border-slate-800 pt-5">
                <span className="flex items-center gap-1.5"><ShieldCheck size={15} />{T('100% in-browser', '100% 瀏覽器運行')}</span>
                <span className="flex items-center gap-1.5"><Check size={15} />{T('Data never leaves your device', '數據永不離開你部機')}</span>
                <span className="flex items-center gap-1.5"><Check size={15} />{T('No license seats', '冇 license 座位')}</span>
              </div>
            </div>
          </div>

          {/* ============ REALITY CHECKS: the operator-grade moat ============ */}
          <div className="mt-14 border-t border-slate-800 pt-12">
            <h3 className="text-xl md:text-2xl font-black mb-1.5">
              {T('Reality checks — what the floor actually fights with', '現實檢查 — 現場真正搏鬥嘅嘢')}
            </h3>
            <p className="text-sm text-slate-400 mb-7 max-w-3xl">
              {T('A plan that ignores the door, the corner, the axle or the slab is a drawing, not a plan. These checks run live on every layout — most tools don\'t have them.',
                 '一個唔理櫃門、彎位、車軸同地台嘅方案只係圖畫,唔係方案。以下檢查喺每個佈局實時運行 — 大部分工具根本冇。')}
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              {[
                { icon: '🚪', title: T('Door clearance', '櫃門淨空'), body: T("The most common loading mistake: planning against the 239 cm interior when the door header is 228 cm. Cartons that can't pass the door are flagged while you plan.", '最常見裝櫃失誤:用 239cm 內籠規劃,但門楣只有 228cm。過唔到門嘅箱,規劃時已經標紅。'), where: '/planner' },
                { icon: '↩️', title: T('90° turn box', '90° 轉彎淨空'), body: T('Straight aisle width and the square a forklift needs to TURN are different numbers. Straight-line reachable but corner-blocked pallets turn red.', '直行闊度同轉彎所需嘅方形淨空係兩個數。直線去到但彎位太窄嘅卡板會標紅。'), where: '/warehouse' },
                { icon: '⚖️', title: T('Axle loads', '車軸配重'), body: T("Every carton's weight splits kingpin vs rear axles by the lever rule — live totals against legal limits, with fix direction.", '每箱重量按槓桿原理拆分牽引銷/後軸,實時對照法定上限,超載提示推前定推後。'), where: '/planner' },
                { icon: '🧱', title: T('Crush strength', '紙箱抗壓'), body: T('Max load on top per carton — estimable from ECT board grade (McKee formula), enforced down through the stack.', '每款箱「頂部最大承重」— 可由 ECT 紙板等級用 McKee 公式估算,並沿堆疊向下執行。'), where: '/planner' },
                { icon: '🏗️', title: T('Floor slab rating', '地台承重'), body: T('A 4-level rack bay is 2.4 t on 3 m². Pick your slab rating (mezzanine to heavy slab) — overloaded spots turn red.', '4 層貨架一格 = 2.4 噸壓 3 平米。揀好地台等級(閣樓至重型),超壓位置即時標紅。'), where: '/warehouse' },
                { icon: '📦', title: T('Pallet overhang', '卡板懸出'), body: T("Overhang costs ~30% compression strength, and Amazon rejects overhanging pallets outright. Allow 2.5 or 5 cm per side — we pack it AND warn you.", '懸出令抗壓強度跌約 30%,Amazon 見到直接拒收。容許每邊 2.5/5 cm — 幫你裝盡之餘同時警告。'), where: '/planner' },
                { icon: '🧊', title: T('Zone segregation', '溫控/危險品分區'), body: T('Chilled, frozen or hazmat cargo outside its matching zone turns red the moment you drop it.', '凍櫃/冷藏/危險品貨物一旦擺出對應分區,落地嗰刻即變紅。'), where: '/warehouse' },
                { icon: '⚠️', title: T('Top-heavy & heavy-on-light', '重心過高/重壓輕'), body: T('CoG height over 55% or a carton ≥25% heavier than the one beneath it — the loader\'s instinct, codified.', '重心高過 55%、或重箱壓住輕箱(≥25%)— 老師傅嘅本能,寫成規則。'), where: '/planner' },
                { icon: '📋', title: T('Loading sequence', '裝櫃順序表'), body: T('The PDF numbers every carton in loading order — #1 first, back of the container, floor level. Tape it at the door.', 'PDF 將每箱按裝櫃次序編號 — #1 先入、最入最底。打印貼喺閘口,工人照住裝。'), where: '/planner' },
              ].map((c, i) => (
                <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg leading-none">{c.icon}</span>
                    <span className="font-bold text-slate-100">{c.title}</span>
                    <span className="ml-auto text-[10px] font-semibold text-blue-400/80">{c.where}</span>
                  </div>
                  <p className="text-slate-400 text-[13px] leading-relaxed">{c.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link to="/reality-checks" className="inline-flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors">
                {T('See all 11 checks, with the industry facts behind them', '睇晒 11 項檢查同背後嘅行業事實')} <ArrowRight size={15} />
              </Link>
              <span className="text-xs text-slate-500">
                {T('Engine: 80% avg fill on the Bischoff–Ratcliff benchmark (300 instances), full stability constraints.',
                   '引擎:Bischoff–Ratcliff 基準(300 instances)平均 80% 裝載率,連全套穩定性約束。')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="max-w-3xl mx-auto px-4 py-14 md:py-20">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-8">{T('Questions, answered', '常見問題')}</h2>
        <div className="divide-y divide-slate-200">
          {faqs.map((f, i) => (
            <details key={i} className="group py-4">
              <summary className="flex items-center justify-between cursor-pointer list-none font-semibold text-slate-900">
                {f.q}
                <span className="text-slate-400 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <p className="mt-3 text-slate-600 text-sm leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="bg-slate-950 text-white">
        <div className="max-w-4xl mx-auto px-4 py-14 md:py-18 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            {T('Your next container, planned in minutes', '你嘅下一個貨櫃,幾分鐘規劃好')}
          </h2>
          <p className="text-slate-400 text-lg mb-8">
            {T('Free. In the browser. Nothing to install.', '免費。瀏覽器即用。乜都唔使裝。')}
          </p>
          <Link
            to="/planner"
            className="group inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-xl shadow-blue-500/20"
          >
            {T('Open the Load Planner', '打開裝載規劃器')}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
}
