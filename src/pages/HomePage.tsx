import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight, Check, Package, Container, Cuboid, BookOpen,
  MousePointer2, FileText, Scale, Layers, Boxes, ShieldCheck,
  DollarSign, Ship, Warehouse,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import InteractiveLoadPlanner from '../components/InteractiveLoadPlanner';
import { packWithConstraints, type PackItemSpec } from '../lib/binPacking';

/**
 * Homepage v3 — conversion-first.
 *
 * Principle: the product IS the pitch. The hero embeds the real interactive
 * 3D planner (draggable, live) instead of a decorative animation, and every
 * section answers one buyer question:
 *   hero        — what is this and why should I care (money)
 *   math strip  — how much is wasted space actually costing me
 *   how-it-works— what do I actually do (3 steps)
 *   features    — is it serious enough (vs paid tools)
 *   personas    — is it for someone like me
 *   trust       — what's the catch (none: free, in-browser, private)
 *   tools/FAQ   — secondary tools + objections + SEO
 */

// A realistically FULL 20'GP — the hero must demonstrate high utilization,
// so quantities are sized to fill ~80%+ of the container.
const DEMO_CONTAINER = { l: 589, w: 235, h: 239, maxWeight: 28200 }; // 20' GP
const DEMO_SPECS: PackItemSpec[] = [
  { id: 'd1', label: 'Master carton', l: 58, w: 46, h: 47, weight: 18, qty: 160, color: 0xfbbf24 },
  { id: 'd2', label: 'Half carton', l: 48, w: 39, h: 39, weight: 12, qty: 90, color: 0x60a5fa },
  { id: 'd3', label: 'Fragile', l: 45, w: 38, h: 29, weight: 6, qty: 30, color: 0x34d399, maxStack: 0 },
];

export default function HomePage() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);

  const demo = useMemo(() => packWithConstraints(DEMO_CONTAINER, DEMO_SPECS), []);

  const steps = [
    {
      icon: Boxes,
      title: T('Enter your cartons', '輸入紙箱資料'),
      body: T(
        'Sizes, weights, quantities. Mark anything fragile or this-way-up. Pick a 20GP, 40GP or 40HQ.',
        '尺寸、重量、數量。標記易碎或不可倒置，揀 20GP / 40GP / 40HQ 貨櫃。',
      ),
    },
    {
      icon: MousePointer2,
      title: T('Optimize, then drag', '自動優化，再手動微調'),
      body: T(
        'Real bin-packing fills the container respecting weight and stacking limits. Then grab any carton and move it — the plan stays collision-free.',
        '真實裝箱算法自動填滿貨櫃，遵守重量與堆疊限制。之後任意拖動紙箱微調，系統自動防止重疊。',
      ),
    },
    {
      icon: FileText,
      title: T('Export the plan', '導出裝載方案'),
      body: T(
        'One click: a PDF load plan with a 3D snapshot plus a carton-by-carton packing list (CSV) your warehouse can follow.',
        '一鍵導出：含 3D 截圖嘅 PDF 裝載方案 + 逐箱裝箱單 (CSV)，倉庫直接照住執行。',
      ),
    },
  ];

  const features = [
    { icon: Boxes, title: T('Real 3D bin-packing', '真實 3D 裝箱算法'), body: T('Extreme-point optimization, not a naive grid — mixed carton sizes welcome.', 'Extreme-point 優化算法,支援混合尺寸紙箱,唔係簡單網格。') },
    { icon: Scale, title: T('Weight & stacking limits', '重量與堆疊限制'), body: T('Container payload, per-carton max-stack, fragile-on-top — all enforced.', '貨櫃載重、逐箱堆疊上限、易碎唔可壓 — 全部嚴格執行。') },
    { icon: MousePointer2, title: T('Drag to fine-tune', '拖放微調'), body: T('Grab any carton in 3D. Snap-to-grid, collision-blocked, always valid.', '3D 入面直接拖任何紙箱。貼格對齊、自動避碰,方案永遠有效。') },
    { icon: Layers, title: T('Unload-order zones', '落貨順序分區'), body: T('Multi-stop load? First-out cartons load nearest the door, automatically.', '多站卸貨?最先落嘅貨自動排最近櫃門。') },
    { icon: Ship, title: T('Balance check', '重心平衡檢查'), body: T('Live centre-of-gravity readout warns you before the load leans.', '實時重心偏移提示,裝歪咗即刻知。') },
    { icon: FileText, title: T('PDF + CSV export', 'PDF + CSV 導出'), body: T('A shareable load plan and packing list — the deliverable forwarders charge for.', '可分享嘅裝載方案同裝箱單 — 貨代收費先做嘅嘢。') },
  ];

  const personas = [
    {
      icon: Package,
      who: T('Importers & e-commerce sellers', '進口商 & 跨境電商賣家'),
      pain: T(
        'Know exactly how many cartons fit before you book — stop guessing between a 20GP and a 40HQ, and stop paying for space you never used.',
        '訂櫃之前就知道裝到幾多箱 — 唔使再喺 20GP 定 40HQ 之間靠估,唔使再為冇用到嘅空間付錢。',
      ),
    },
    {
      icon: Ship,
      who: T('Freight forwarders & sourcing agents', '貨代 & 採購代理'),
      pain: T(
        'Turn a client\'s carton list into a professional, shareable 3D load plan in minutes — the kind of deliverable others charge for.',
        '幾分鐘將客戶嘅箱單變成專業、可分享嘅 3D 裝載方案 — 呢種交付物其他人係收費嘅。',
      ),
    },
    {
      icon: Warehouse,
      who: T('Warehouse & operations teams', '倉庫 & 營運團隊'),
      pain: T(
        'Hand loaders a step-by-step plan with positions, unload order and stacking rules — instead of a verbal "make it fit".',
        '畀裝櫃工人一份有位置、落貨順序、堆疊規則嘅逐步方案 — 而唔係一句「塞得入就得」。',
      ),
    },
  ];

  const faqs = [
    {
      q: T('Is it really free?', '真係免費?'),
      a: T(
        'Yes. The planner, the optimizer and the calculators are free to use. Exporting a PDF or CSV just asks for your email.',
        '係。規劃器、優化算法同全部計算器都免費使用。導出 PDF/CSV 只需要留低 email。',
      ),
    },
    {
      q: T('Do I need to install anything?', '需要安裝軟件嗎?'),
      a: T(
        'No. Everything runs in your browser — desktop or tablet. No download, no signup to start planning.',
        '唔需要。全部喺瀏覽器入面運行 — 電腦或平板都得。開始規劃唔使下載、唔使註冊。',
      ),
    },
    {
      q: T('Where does my shipment data go?', '我嘅貨運數據會去邊?'),
      a: T(
        'Nowhere. Calculations run entirely on your device. Your carton lists and load plans never leave your browser.',
        '邊度都唔去。所有計算完全喺你部機上進行,箱單同裝載方案永遠唔會離開你嘅瀏覽器。',
      ),
    },
    {
      q: T('Can it handle mixed carton sizes and weight limits?', '支援混合尺寸同重量限制?'),
      a: T(
        'Yes — that is the point. Mixed sizes, container payload limits, per-carton stacking limits, fragile cartons and unload order are all supported.',
        '支援 — 呢個正係核心。混合尺寸、貨櫃載重、逐箱堆疊上限、易碎箱同落貨順序全部支援。',
      ),
    },
    {
      q: T('How is this different from paid load-planning software?', '同付費裝櫃軟件有咩分別?'),
      a: T(
        'Commercial tools with these features typically cost $350 to $5,000+ per year. DimPack3D covers the core workflow — optimize, hand-edit, export — free, in the browser.',
        '有呢啲功能嘅商業軟件一般每年收 $350 至 $5,000+。DimPack3D 免費喺瀏覽器完成核心流程 — 優化、手動微調、導出。',
      ),
    },
  ];

  const tools = [
    { to: '/packing', icon: Package, color: 'blue', title: T('Carton Packing', '產品裝箱'), body: T('How many units fit per carton — with freight cost per unit.', '每箱裝到幾多件產品,連每件海空運成本。') },
    { to: '/container', icon: Container, color: 'teal', title: T('Container Quick-Calc', '貨櫃快速計算'), body: T('Instant carton-count and CBM for 20GP / 40GP / 40HQ.', '即時計算 20GP/40GP/40HQ 裝箱數同 CBM。') },
    { to: '/fba', icon: Cuboid, color: 'amber', title: T('Amazon FBA Size & Fees', 'FBA 尺寸與費用'), body: T('2025 size tiers and fulfilment fee estimates.', '2025 尺寸分級同配送費預估。') },
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
            "@type": "HowTo",
            "name": "How to plan a container load with DimPack3D",
            "description": "Auto-optimize cartons into a shipping container, fine-tune by hand in 3D, and export a PDF load plan.",
            "totalTime": "PT3M",
            "estimatedCost": { "@type": "MonetaryAmount", "currency": "USD", "value": "0" },
            "step": [
              { "@type": "HowToStep", "position": 1, "name": "Enter cartons", "text": "Enter carton sizes, weights and quantities; mark fragile or this-way-up items; choose a container.", "url": "https://www.dimpack3d.com/planner" },
              { "@type": "HowToStep", "position": 2, "name": "Optimize and adjust", "text": "Run the bin-packing optimizer, then drag cartons in 3D to fine-tune. Weight and stacking limits stay enforced.", "url": "https://www.dimpack3d.com/planner" },
              { "@type": "HowToStep", "position": 3, "name": "Export", "text": "Export a PDF load plan with 3D snapshot and a CSV packing list.", "url": "https://www.dimpack3d.com/planner" }
            ]
          }
        `}</script>
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
        <div className="relative max-w-6xl mx-auto px-4 pt-28 md:pt-36 pb-16 md:pb-24">
          <div className="grid lg:grid-cols-[5fr_6fr] gap-10 lg:gap-14 items-center">
            {/* pitch */}
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-3 py-1 mb-6">
                <Check size={13} />
                {T('Free · in your browser · no signup', '免費 · 瀏覽器即用 · 無需註冊')}
              </div>

              <h1 className="text-4xl md:text-5xl font-black leading-[1.08] mb-5">
                {T('Stop shipping air.', '唔好再為空隙付運費。')}
              </h1>

              <p className="text-lg text-slate-300 leading-relaxed mb-3">
                {T(
                  'Every container you book, you pay for 100% of the space — most loads use far less. DimPack3D packs your cartons with a real bin-packing algorithm, lets you drag boxes to fine-tune, and exports a load plan your warehouse can follow.',
                  '每次訂櫃你都係為 100% 空間付錢 — 但大多數裝載遠用唔盡。DimPack3D 用真實裝箱算法幫你排好每一箱,俾你親手拖動微調,再導出倉庫照住做嘅裝載方案。',
                )}
              </p>
              <p className="text-sm text-slate-400 mb-8">
                {T(
                  'Weight & stacking limits · fragile cartons · unload order · PDF + packing list export',
                  '重量與堆疊限制 · 易碎箱 · 落貨順序 · PDF + 裝箱單導出',
                )}
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  to="/planner"
                  className="group inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white px-7 py-3.5 rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-400/40"
                >
                  {T('Plan a container — free', '免費規劃一個貨櫃')}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <a href="#how" className="text-slate-300 hover:text-white font-semibold text-sm underline underline-offset-4 decoration-slate-600 hover:decoration-white transition-colors">
                  {T('See how it works', '睇下點運作')}
                </a>
              </div>

              <p className="mt-8 text-xs text-slate-500">
                {T(
                  'Commercial load planners charge $350–$5,000+/yr for this workflow.',
                  '同類商業裝櫃軟件每年收 $350–$5,000+。',
                )}
              </p>
            </div>

            {/* the actual product, live */}
            <div className="relative">
              <div className="rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/40 overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                  <span className="ml-3 text-xs text-slate-500 font-mono">dimpack3d.com/planner — 20&#39;GP · {demo.boxes.length} {T('cartons', '箱')}</span>
                </div>
                <div className="p-3 [&_p]:text-slate-500 [&_.bg-slate-100]:bg-slate-800 [&_.bg-slate-100]:text-slate-300 [&_.text-slate-700]:text-slate-300 [&_.bg-slate-200]:bg-slate-700 [&_.bg-slate-200]:text-slate-200">
                  <InteractiveLoadPlanner
                    container={DEMO_CONTAINER}
                    boxes={demo.boxes}
                    grid={1}
                    unitLabel="cm"
                    showDoor
                  />
                </div>
              </div>
              {/* live numbers straight from the optimizer — proof it works */}
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                <span className="text-xs font-mono bg-slate-800/80 border border-slate-700 text-emerald-300 rounded-full px-3 py-1">
                  {demo.stats.volumeUtil.toFixed(1)}% {T('utilization', '利用率')}
                </span>
                <span className="text-xs font-mono bg-slate-800/80 border border-slate-700 text-slate-300 rounded-full px-3 py-1">
                  {demo.boxes.length} {T('cartons placed', '箱已排位')}
                </span>
                <span className="text-xs font-mono bg-slate-800/80 border border-slate-700 text-slate-300 rounded-full px-3 py-1">
                  {demo.stats.totalWeight.toFixed(0)} kg / 28,200 kg
                </span>
              </div>
              <p className="text-center text-xs text-slate-500 mt-2">
                {T('↑ Live — computed by the actual optimizer in your browser. Drag a carton, orbit the camera.', '↑ 真實運算 — 由優化引擎喺你瀏覽器即時計出。試下拖動紙箱、旋轉鏡頭。')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ MONEY MATH ============ */}
      <section className="border-b border-slate-100 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex gap-4">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center"><DollarSign size={22} /></div>
              <div>
                <p className="font-bold text-slate-900">{T('A 40ft container costs $2,000–$5,000+', '一個 40 呎櫃運費 $2,000–$5,000+')}</p>
                <p className="text-sm text-slate-600 mt-1">{T('Every 10% of unused space is hundreds of dollars spent shipping nothing.', '每浪費 10% 空間,就係幾百美元攞去運空氣。')}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center"><Boxes size={22} /></div>
              <div>
                <p className="font-bold text-slate-900">{T('Spreadsheets can\'t see in 3D', 'Excel 睇唔到 3D')}</p>
                <p className="text-sm text-slate-600 mt-1">{T('CBM ÷ carton volume over-estimates what fits. Real packing has geometry, weight and stacking rules.', '淨計 CBM 會高估裝載量 — 真實裝櫃有幾何、重量、堆疊規則。')}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center"><FileText size={22} /></div>
              <div>
                <p className="font-bold text-slate-900">{T('A plan beats a guess', '有方案好過靠估')}</p>
                <p className="text-sm text-slate-600 mt-1">{T('Book the right container size, and hand your loaders a plan instead of a hope.', '訂啱櫃型,再畀裝櫃工人一份方案,而唔係一個願望。')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="max-w-2xl mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">
            {T('Cartons in, load plan out — 3 steps', '入箱單,出方案 — 三步搞掂')}
          </h2>
          <p className="text-lg text-slate-600">
            {T('No CAD training, no manuals. If you can drag a box, you can plan a container.', '唔使學 CAD、唔使睇手冊。識拖一個箱,就識規劃一個櫃。')}
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div key={i} className="relative rounded-2xl border border-slate-200 p-6 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-50 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center"><s.icon size={22} /></div>
                <span className="text-5xl font-black text-slate-100 absolute top-4 right-5 select-none">{i + 1}</span>
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <Link to="/planner" className="group inline-flex items-center gap-2 text-blue-700 font-bold hover:gap-3 transition-all">
            {T('Open the planner', '打開規劃器')} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="bg-slate-950 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl md:text-4xl font-black mb-3">
              {T('The features paid tools charge for', '付費軟件收錢嘅功能,呢度免費')}
            </h2>
            <p className="text-lg text-slate-400">
              {T('This is not a CBM toy. It is a working load-planning engine.', '呢個唔係 CBM 玩具,係一個真正嘅裝載規劃引擎。')}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={i} className="rounded-2xl bg-slate-900 border border-slate-800 p-5 hover:border-blue-500/50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center mb-3"><f.icon size={20} /></div>
                <h3 className="font-bold mb-1.5">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ EXAMPLE PLANS ============ */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-20">
        <div className="max-w-2xl mb-8">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
            {T('See it work on a real scenario', '用真實場景試佢一次')}
          </h2>
          <p className="text-slate-600">
            {T('One click loads a full example into the planner — cartons, constraints, everything.', '一鍵將完整示範載入規劃器 — 箱單、約束、全套。')}
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { demo: 'retail', title: T('Mixed retail import', '混裝零售進口'), body: T("20'GP · 3 carton sizes · fragile display units that nothing may stack on", "20'GP · 3 種箱型 · 易碎陳列品唔可以壓"), tag: T('Fragile handling', '易碎處理') },
            { demo: 'furniture', title: T('Flat-pack furniture', '平板傢俬'), body: T("40'HQ · heavy flat-packs kept this-way-up · chairs and hardware fill the gaps", "40'HQ · 重型平板箱不可倒置 · 椅同五金填空隙"), tag: T('This-way-up', '不可倒置') },
            { demo: 'multistop', title: T('Multi-stop delivery', '多站卸貨'), body: T("20'GP · three drop-offs · first stop's cartons load nearest the door automatically", "20'GP · 三個卸貨點 · 第一站嘅貨自動排最近櫃門"), tag: T('Unload order', '落貨順序') },
          ].map((s, i) => (
            <Link key={i} to={`/planner?demo=${s.demo}`} className="group rounded-2xl border border-slate-200 p-6 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-50 transition-all">
              <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 rounded-full px-2.5 py-1 mb-3">{s.tag}</span>
              <h3 className="font-bold text-slate-900 mb-2">{s.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">{s.body}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 group-hover:gap-2.5 transition-all">
                {T('Load this example', '載入呢個示範')} <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ COMPARISON ============ */}
      <section className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-20">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-8 max-w-2xl">
            {T('How it compares', '同其他做法點比')}
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="p-4 font-semibold text-slate-500"></th>
                  <th className="p-4 font-bold text-slate-700">{T('Spreadsheet / CBM math', 'Excel / 淨計 CBM')}</th>
                  <th className="p-4 font-black text-blue-700 bg-blue-50/60">DimPack3D</th>
                  <th className="p-4 font-bold text-slate-700">{T('Commercial software', '商業裝櫃軟件')}</th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-4 [&_tr]:border-b [&_tr]:border-slate-100">
                <tr>
                  <td className="font-semibold text-slate-600">{T('Real 3D bin-packing', '真實 3D 裝箱')}</td>
                  <td className="text-slate-400">✗ {T('volume math only', '只計體積')}</td>
                  <td className="bg-blue-50/40 font-semibold text-emerald-600">✓</td>
                  <td className="text-emerald-600">✓</td>
                </tr>
                <tr>
                  <td className="font-semibold text-slate-600">{T('Weight & stacking limits', '重量與堆疊限制')}</td>
                  <td className="text-slate-400">✗</td>
                  <td className="bg-blue-50/40 font-semibold text-emerald-600">✓</td>
                  <td className="text-emerald-600">✓</td>
                </tr>
                <tr>
                  <td className="font-semibold text-slate-600">{T('Drag-edit the plan in 3D', '3D 拖放編輯方案')}</td>
                  <td className="text-slate-400">✗</td>
                  <td className="bg-blue-50/40 font-semibold text-emerald-600">✓</td>
                  <td className="text-slate-500">{T('some tools', '部分工具')}</td>
                </tr>
                <tr>
                  <td className="font-semibold text-slate-600">{T('PDF load plan + packing list', 'PDF 方案 + 裝箱單')}</td>
                  <td className="text-slate-400">✗</td>
                  <td className="bg-blue-50/40 font-semibold text-emerald-600">✓</td>
                  <td className="text-emerald-600">✓</td>
                </tr>
                <tr>
                  <td className="font-semibold text-slate-600">{T('Install / training needed', '需要安裝 / 培訓')}</td>
                  <td className="text-slate-500">{T('none', '唔使')}</td>
                  <td className="bg-blue-50/40 font-semibold text-emerald-600">{T('none — browser', '唔使 — 瀏覽器')}</td>
                  <td className="text-slate-500">{T('often desktop + training', '多數要裝機 + 培訓')}</td>
                </tr>
                <tr>
                  <td className="font-semibold text-slate-600">{T('Price', '價錢')}</td>
                  <td className="text-slate-500">{T('free', '免費')}</td>
                  <td className="bg-blue-50/40 font-black text-emerald-600">{T('Free', '免費')}</td>
                  <td className="text-slate-500">$350–$5,000+/{T('yr', '年')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ============ ENGINE SPEC ============ */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-20">
        <div className="grid lg:grid-cols-2 gap-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-4">
              {T('What the engine actually enforces', '引擎實際執行嘅規則')}
            </h2>
            <p className="text-slate-600 mb-6">
              {T('Every placement is validated against physical rules before it is accepted — the same checks a load master would make.', '每一個擺位都要通過物理規則驗證先會被接受 — 同裝櫃師傅檢查嘅嘢一樣。')}
            </p>
            <ul className="space-y-3">
              {[
                T('No two cartons can overlap — full 3D collision detection', '任何兩箱不可重疊 — 完整 3D 碰撞檢測'),
                T('Every carton needs ≥60% of its base supported — nothing floats', '每箱底部須有 ≥60% 支撐 — 冇箱會浮空'),
                T('Stack loads propagate down the support chain and respect per-carton limits', '堆疊重量沿支撐鏈向下傳遞,遵守逐箱上限'),
                T('Container payload limits enforced (28.2t / 26.7t / 26.5t)', '貨櫃載重上限嚴格執行 (28.2t / 26.7t / 26.5t)'),
                T('Heavier cartons pack first, keeping the centre of gravity low', '重箱優先擺放,令重心保持低'),
                T('Live centre-of-gravity offset warning when the load leans', '重心偏移即時警告'),
              ].map((rule, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-700">
                  <Check size={17} className="text-emerald-600 shrink-0 mt-0.5" /> {rule}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 mb-4">{T('Supported containers', '支援貨櫃')}</h3>
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left text-slate-500">
                    <th className="p-3.5 font-semibold">{T('Type', '櫃型')}</th>
                    <th className="p-3.5 font-semibold">{T('Internal (L×W×H cm)', '內籠 (長×闊×高 cm)')}</th>
                    <th className="p-3.5 font-semibold">{T('Payload', '載重')}</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:p-3.5 [&_tr]:border-b [&_tr]:border-slate-100 text-slate-700">
                  <tr><td className="font-bold">20' GP</td><td className="font-mono text-xs">589 × 235 × 239</td><td>28,200 kg</td></tr>
                  <tr><td className="font-bold">40' GP</td><td className="font-mono text-xs">1,203 × 235 × 239</td><td>26,700 kg</td></tr>
                  <tr><td className="font-bold">40' HQ</td><td className="font-mono text-xs">1,203 × 235 × 269</td><td>26,500 kg</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              {T('Pallets, trucks and custom container sizes are on the roadmap.', '卡板、貨車同自訂櫃型喺 roadmap 上。')}
            </p>
          </div>
        </div>
      </section>

      {/* ============ PERSONAS ============ */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-12 max-w-2xl">
          {T('Built for the people who pay for containers', '為真金白銀訂櫃嘅人而設')}
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {personas.map((p, i) => (
            <div key={i} className="rounded-2xl bg-slate-50 border border-slate-100 p-6">
              <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-blue-700 flex items-center justify-center mb-4 shadow-sm"><p.icon size={22} /></div>
              <h3 className="font-bold text-slate-900 mb-2">{p.who}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{p.pain}</p>
            </div>
          ))}
        </div>

        {/* trust strip */}
        <div className="mt-12 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-5 flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm"><ShieldCheck size={18} />{T('Runs 100% in your browser', '100% 喺你瀏覽器運行')}</div>
          <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm"><Check size={18} />{T('Shipment data never leaves your device', '貨運數據永不離開你部機')}</div>
          <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm"><Check size={18} />{T('Free — no trial clock, no license seats', '免費 — 冇試用期限、冇 license 座位')}</div>
        </div>
      </section>

      {/* ============ SUPPORTING TOOLS ============ */}
      <section id="tools" className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
                {T('More free tools for the same workflow', '同一條工作流嘅更多免費工具')}
              </h2>
              <p className="text-slate-600">
                {T('From factory carton to Amazon shelf.', '由工廠紙箱到 Amazon 貨架。')}
              </p>
            </div>
            <Link to="/guides" className="inline-flex items-center gap-2 text-blue-700 font-semibold text-sm hover:gap-3 transition-all">
              <BookOpen size={16} /> {T('Read the guides', '閱讀指南')} <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {tools.map((t, i) => (
              <Link key={i} to={t.to} className="group rounded-2xl bg-white border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                  t.color === 'blue' ? 'bg-blue-100 text-blue-700' : t.color === 'teal' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'
                }`}><t.icon size={20} /></div>
                <h3 className="font-bold text-slate-900 mb-1">{t.title}</h3>
                <p className="text-sm text-slate-600">{t.body}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 group-hover:gap-2.5 transition-all">
                  {T('Open', '打開')} <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="max-w-3xl mx-auto px-4 py-16 md:py-24">
        <h2 className="text-3xl font-black text-slate-900 mb-10">{T('Questions, answered', '常見問題')}</h2>
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
        <div className="max-w-4xl mx-auto px-4 py-16 md:py-20 text-center">
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
