import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight, Check, Package, Container, Cuboid, Move3d,
  FileText, ShieldCheck, Warehouse,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import InteractiveLoadPlanner from '../components/InteractiveLoadPlanner';
import { packWithConstraints, type PackItemSpec } from '../lib/binPacking';
import { captureLead } from '../lib/entitlement';
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

export default function HomePage() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);

  const [heroMode, setHeroMode] = useState<'container' | 'carton'>('container');
  const containerDemo = useMemo(() => packWithConstraints(CONTAINER_SCENE.container, CONTAINER_SCENE.specs), []);
  const cartonDemo = useMemo(() => packWithConstraints(CARTON_SCENE.container, CARTON_SCENE.specs), []);
  const demo = heroMode === 'container' ? containerDemo : cartonDemo;
  const scene = heroMode === 'container' ? CONTAINER_SCENE : CARTON_SCENE;

  // warehouse demand test
  const [whEmail, setWhEmail] = useState('');
  const [whState, setWhState] = useState<'idle' | 'open' | 'done'>('idle');
  const submitWaitlist = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(whEmail)) return;
    captureLead(whEmail.trim(), { proWaitlist: true, source: 'warehouse-waitlist' });
    track('waitlist_warehouse');
    setWhState('done');
  };
  const switchHero = (mode: 'container' | 'carton') => {
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
      to: '/fba',
      icon: Cuboid,
      accent: 'border-slate-200 hover:border-amber-400',
      iconCls: 'bg-amber-100 text-amber-700',
      title: T('Check Amazon FBA fees', '查 Amazon FBA 費用'),
      body: T('2025 size tiers and fulfilment fee estimates for your product.', '2025 尺寸分級同配送費預估。'),
    },
  ];

  const faqs = [
    { q: T('Is it really free?', '真係免費?'), a: T('Yes — planning and optimizing are free. Exporting PDF/CSV just asks for your email.', '係 — 規劃同優化免費,導出 PDF/CSV 只需留 email。') },
    { q: T('Do I need to install anything?', '要安裝嘢嗎?'), a: T('No. It runs in your browser, desktop or tablet.', '唔使,瀏覽器直接用。') },
    { q: T('Where does my data go?', '數據去咗邊?'), a: T('Nowhere — everything computes on your device. Shipment data never leaves your browser.', '邊度都冇去 — 全部喺你部機計,數據唔會離開瀏覽器。') },
    { q: T('Mixed carton sizes? Weight limits?', '混合尺寸?重量限制?'), a: T('Yes. Mixed sizes, payload limits, per-carton stacking limits, fragile cartons and unload order are all supported.', '支援。混合尺寸、載重、逐箱堆疊上限、易碎、落貨順序全部有。') },
  ];

  return (
    <div className="-mt-14 md:-mt-16 bg-white">
      <Helmet>
        <title>DimPack3D - Free 3D Container Load Planner | Pack, Edit & Export Load Plans</title>
        <meta name="description" content="Plan container loads in interactive 3D — auto-optimize with real bin-packing, drag cartons by hand, respect weight & stacking limits, then export a PDF load plan and packing list. Plus free CBM, carton packing and Amazon FBA calculators." />
        <meta name="keywords" content="container load planner, load planning software, 3D bin packing, container loading calculator, packing list PDF, CBM calculator, FBA calculator, freight forwarder tools" />
        <link rel="canonical" href="https://www.dimpack3d.com/" />
        <meta property="og:url" content="https://www.dimpack3d.com/" />
        <meta property="og:title" content="DimPack3D - Free 3D Container Load Planner" />
        <meta property="og:description" content="Auto-optimize container loads with real bin-packing, fine-tune in interactive 3D, export PDF load plans — free." />
        <script type="application/ld+json">{`
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              { "@type": "Question", "name": "Is DimPack3D really free?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. The planner, optimizer and calculators are free. Exporting a PDF or CSV asks for your email." } },
              { "@type": "Question", "name": "Do I need to install anything?", "acceptedAnswer": { "@type": "Answer", "text": "No. Everything runs in the browser with no download or signup." } },
              { "@type": "Question", "name": "Where does my shipment data go?", "acceptedAnswer": { "@type": "Answer", "text": "Nowhere. All calculations run on your device; carton lists and load plans never leave your browser." } },
              { "@type": "Question", "name": "Can it handle mixed carton sizes and weight limits?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Mixed sizes, container payload limits, per-carton stacking limits, fragile cartons and unload order are supported." } }
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
              <h1 className="text-4xl md:text-5xl font-black leading-[1.08] mb-5">
                {T('Stop shipping air.', '唔好再為空隙付運費。')}
              </h1>
              <p className="text-lg text-slate-300 leading-relaxed mb-8">
                {T(
                  'Products into cartons. Cartons into containers. Optimized in 3D, exported as a plan your warehouse can follow.',
                  '產品入箱、紙箱入櫃 — 3D 優化,導出倉庫照住做嘅方案。',
                )}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  to={heroMode === 'container' ? '/planner' : '/packing'}
                  className="group inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white px-7 py-3.5 rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-500/25"
                >
                  {heroMode === 'container' ? T('Plan a container — free', '免費規劃一個貨櫃') : T('Pack a carton — free', '免費計一個紙箱')}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              <div className="flex flex-wrap gap-2 mt-8">
                <span className="text-xs font-mono bg-slate-800/80 border border-slate-700 text-emerald-300 rounded-full px-3 py-1">
                  {demo.stats.volumeUtil.toFixed(1)}% {T('utilization', '利用率')}
                </span>
                <span className="text-xs font-mono bg-slate-800/80 border border-slate-700 text-slate-300 rounded-full px-3 py-1">
                  {demo.boxes.length} {heroMode === 'container' ? T('cartons', '箱') : T('units', '件')}
                </span>
                {heroMode === 'container' && (
                  <span className="text-xs font-mono bg-slate-800/80 border border-slate-700 text-slate-300 rounded-full px-3 py-1">
                    {(demo.stats.totalWeight / 1000).toFixed(1)}t / 28.2t
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
                    {heroMode === 'container'
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

      {/* ============ TASK NAV — every tool, verb-first ============ */}
      <section className="max-w-6xl mx-auto px-4 py-14 md:py-20">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-8">
          {T('What do you need to do?', '你想做咩?')}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
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

        {/* demand test: which market wants warehouse floor planning? */}
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-5">
          {whState === 'done' ? (
            <p className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
              <Check size={16} /> {T("Thanks — you're on the list. We'll email you when warehouse planning ships.", '多謝 — 已記低。倉庫規劃推出時會 email 通知你。')}
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center"><Warehouse size={20} /></span>
                <div>
                  <p className="font-bold text-slate-800 text-sm">
                    {T('Arrange a warehouse floor', '規劃倉庫地面擺位')}
                    <span className="ml-2 text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{T('Coming soon', '即將推出')}</span>
                  </p>
                  <p className="text-xs text-slate-500">{T('Racking, aisles, pallet positions — want it? Tell us where to reach you.', '貨架、通道、卡板位 — 想要?留低 email 話我哋知。')}</p>
                </div>
              </div>
              {whState === 'open' ? (
                <div className="flex gap-2">
                  <input
                    type="email"
                    autoFocus
                    value={whEmail}
                    onChange={(e) => setWhEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitWaitlist()}
                    placeholder="you@company.com"
                    className="px-3 py-2 rounded-lg border border-slate-300 text-sm w-56 outline-none focus:border-blue-500"
                  />
                  <button onClick={submitWaitlist} className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold">
                    {T('Notify me', '通知我')}
                  </button>
                </div>
              ) : (
                <button onClick={() => setWhState('open')} className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:border-slate-400">
                  {T('I need this →', '我需要呢個 →')}
                </button>
              )}
            </div>
          )}
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

      {/* ============ PROOF: comparison + engine rules ============ */}
      <section className="bg-slate-950 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <h2 className="text-2xl md:text-3xl font-black mb-10">
            {T('Not a CBM toy — a load-planning engine', '唔係 CBM 玩具 — 係裝載規劃引擎')}
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
