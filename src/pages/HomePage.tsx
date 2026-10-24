import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight, Check, Package, Container, Cuboid, Move3d,
  Warehouse, Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import heroSummary from '../data/hero-summary.json';
import VisibleVideo from '../components/VisibleVideo';
import ProductUpdate from '../components/ProductUpdate';
import { useVisibleMotion } from '../components/useVisibleMotion';
const HeroInteractive = lazy(() => import('../components/HeroInteractive'));
const HeroMotionPreview = lazy(() => import('../components/HeroMotionPreview'));
type HeroMode = keyof typeof heroSummary;
import { track } from '../lib/track';

/** Focused entry: mixed-load planning first, supporting tools in a compact directory. */

export default function HomePage() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);
  const location = useLocation();

  // scroll to an in-page section when arriving via a #hash link (e.g. the
  // header "Calculators" nav from another page) — the app has no global hash router
  useEffect(() => {
    if (!location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) { if (el instanceof HTMLDetailsElement) el.open = true; el.scrollIntoView({ behavior: 'smooth' }); }
  }, [location.hash]);

  const [heroMode, setHeroMode] = useState<HeroMode>('container');
  const [interactive, setInteractive] = useState(false);
  const [animatePreview, setAnimatePreview] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const { ref: heroRef, visible: heroVisible, allowed: motionAllowed } = useVisibleMotion<HTMLDivElement>();
  const demo = heroSummary[heroMode];

  useEffect(() => {
    if (interactive || animatePreview || !heroVisible || !motionAllowed) return;
    let timer: ReturnType<typeof setTimeout>;
    let idle: number | undefined;
    let cancelled = false;
    const activate = () => { if (!cancelled) setAnimatePreview(true); };
    const schedule = () => {
      timer = setTimeout(() => {
        if ('requestIdleCallback' in window) idle = window.requestIdleCallback(activate, { timeout: 2000 });
        else activate();
      }, 1500);
    };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (idle !== undefined) window.cancelIdleCallback(idle);
      window.removeEventListener('load', schedule);
    };
  }, [interactive, animatePreview, heroVisible, motionAllowed]);

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
    { q: T('Where does my data go?', '數據去咗邊?'), a: T('The planner and calculators compute on your device; shipment data stays in your browser unless you create a share link or save a plan. The optional REST API processes requests on our edge servers and does not store them.', '規劃器同計算器喺你部機計,數據留喺瀏覽器,除非你建立分享連結或儲存方案。可選嘅 REST API 喺我哋 edge 伺服器處理請求,唔會儲存。') },
    { q: T('Mixed carton sizes? Weight limits?', '混合尺寸?重量限制?'), a: T('Yes. Mixed sizes, payload limits, per-carton stacking limits, fragile cartons and unload order are all supported.', '支援。混合尺寸、載重、逐箱堆疊上限、易碎、落貨順序全部有。') },
    { q: T('Can I compare different loading layouts?', '可以比較不同裝載擺法嗎？'), a: T('Yes. Compare up to three distinct checked arrangements for the same cargo and rules when alternatives are available. Select one to update the 3D view and exports. Review unplaced cartons as well as utilization; the calculation does not guarantee an optimum or certify transport safety.', '可以。同一貨單及限制下，如有有效替代方案，可比較最多三種不同擺法。選擇後同步更新 3D 與匯出內容。請同時核對未裝箱數及利用率；計算不保證最佳解，亦非運輸安全認證。') },
  ];

  return (
    <div className="-mt-14 md:-mt-16 bg-white">
      <Helmet>
        <title>{T("DimPack3D — Free 3D Container Load Planner & Bin Packing Calculator", "DimPack3D — 免費 3D 貨櫃裝載規劃器同裝箱計算機")}</title>
        <meta name="description" content={T(
          "Plan container loads in interactive 3D — auto-optimize with real bin-packing, drag cartons by hand, respect weight & stacking limits, then export a PDF load plan and packing list. Import a packing list, compare container options, and hand off a reviewed plan.",
          "喺互動 3D 入面規劃貨櫃裝載 — 用真實裝箱演算法自動優化,可以手動拖箱,兼顧重量同堆疊上限,再匯出 PDF 裝載計劃同裝箱單。由貨單匯入、比較櫃型到交付核對後的方案。")} />
        <script type="application/ld+json">{JSON.stringify({"@context":"https://schema.org","@type":"FAQPage",mainEntity:faqs.map(f=>({"@type":"Question",name:f.q,acceptedAnswer:{"@type":"Answer",text:f.a}}))})}</script>
      </Helmet>

      {/* ============ HERO ============ */}
      <section className="relative bg-slate-950 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
        <div className="relative max-w-6xl mx-auto px-4 pt-28 md:pt-28 pb-9 md:pb-12">
          <div className="grid lg:grid-cols-[4fr_6fr] gap-6 lg:gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-3 py-1 mb-6">
                <Check size={13} />
                {T('Free · in your browser', '免費 · 瀏覽器即用')}
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-[1.08] mb-5">
                {T('Plan a mixed load in 3D. Choose the layout that works.', '3D 規劃混裝貨，揀適合你嘅裝載方案。')}
              </h1>
              <p className="text-base md:text-lg text-slate-300 leading-relaxed mb-5">
                {T(
                  'Import your carton list, compare loading layouts and check what stays unplaced. Adjust in 3D, then export the plan for review.',
                  '匯入紙箱貨單，比較不同擺法，睇清楚有幾多貨未裝入。喺 3D 微調，再匯出方案交畀團隊核對。',
                )}
              </p>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch gap-3">
                <Link
                  onClick={() => track('home_entry', `hero:${heroMode}`)}
                  to={heroMode === 'pallet' ? '/pallet-calculator' : heroMode === 'container' ? '/planner' : '/packing'}
                  className="group inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white px-3 sm:px-7 py-3 rounded-xl font-bold text-sm sm:text-lg transition-all shadow-lg shadow-blue-500/25"
                >
                  {heroMode === 'pallet'
                    ? T('Calculate cartons per pallet — free', '免費計每板箱數')
                    : heroMode === 'container' ? T('Plan the load — free', '免費規劃裝載') : T('Pack a carton — free', '免費計一個紙箱')}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/planner?import=1" onClick={()=>track('home_entry','import')} className="inline-flex items-center px-4 py-3 rounded-xl border border-slate-600 text-sm font-semibold text-white hover:bg-slate-800">{T('Import Excel / CSV','匯入 Excel／CSV')}</Link>
              </div>
              <p className="mt-3 text-xs text-slate-400">{T('Free planning · no account needed · email required for PDF / CSV export','免費規劃 · 毋須帳戶 · PDF／CSV 匯出需填電郵')}</p>
              <div className="hidden sm:flex flex-wrap gap-2 mt-5">
                <span className="text-xs font-mono bg-slate-800/80 border border-slate-700 text-emerald-300 rounded-full px-3 py-1">
                  {demo.volumeUtil.toFixed(1)}% {T('utilization', '利用率')}
                </span>
                <span className="text-xs font-mono bg-slate-800/80 border border-slate-700 text-slate-300 rounded-full px-3 py-1">
                  {demo.placedCount} {heroMode === 'carton' ? T('units', '件') : T('cartons', '箱')}
                </span>
                {heroMode === 'container' && (
                  <span className="text-xs font-mono bg-slate-800/80 border border-slate-700 text-slate-300 rounded-full px-3 py-1">
                    {(demo.totalWeight / 1000).toFixed(1)}t / 28.2t
                  </span>
                )}
                {heroMode === 'pallet' && (
                  <span className="text-xs font-mono bg-slate-800/80 border border-slate-700 text-slate-300 rounded-full px-3 py-1">
                    {Math.round(demo.totalWeight)} kg / 1,134 kg
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-3">
                {T('Example cargo shown below. Explore or replace it with your own list.', '下方為示範貨物，可探索擺法或換成自己的貨單。')}
              </p>
            </div>

            {/* Preview first, then one visible animated scene; mode tabs stay interactive. */}
            <div>
              <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 [&>button]:shrink-0">
                <button
                  onClick={() => switchHero('container')}
                  aria-pressed={heroMode === 'container'}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    heroMode === 'container' ? 'bg-blue-500 text-white' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700'
                  }`}
                >
                  <Container size={15} /> {T('Cartons → container', '紙箱 → 貨櫃')}
                </button>
                <button
                  onClick={() => switchHero('pallet')}
                  aria-pressed={heroMode === 'pallet'}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    heroMode === 'pallet' ? 'bg-blue-500 text-white' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700'
                  }`}
                >
                  <Layers size={15} /> {T('Cartons → pallet', '紙箱 → 卡板')}
                </button>
                <button
                  onClick={() => switchHero('carton')}
                  aria-pressed={heroMode === 'carton'}
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
                <div ref={heroRef} className={`p-3 ${interactive ? "h-[640px] sm:h-[580px]" : "h-[460px]"} [&_p]:text-slate-500 [&_.bg-slate-100]:bg-slate-800 [&_.bg-slate-100]:text-slate-300 [&_.text-slate-700]:text-slate-300 [&_.bg-slate-200]:bg-slate-700 [&_.bg-slate-200]:text-slate-200`}>
                  {interactive ? (
                    <Suspense fallback={<img src={`/hero/${heroMode}.svg`} width={720} height={440}
                      className="w-full h-[360px] object-contain bg-slate-900" alt={T('Loading interactive 3D…', '載入互動 3D…')} />}>
                      <HeroInteractive mode={heroMode} autoSpin={motionAllowed && !motionPaused} />
                    </Suspense>
                  ) : animatePreview ? (
                    <Suspense fallback={<img src={`/hero/${heroMode}.svg`} width={720} height={440}
                      className="w-full h-[360px] object-contain bg-slate-900" alt={T('Loading animated 3D…', '載入 3D 動畫…')} />}>
                      <HeroMotionPreview key={heroMode} mode={heroMode} running={heroVisible && motionAllowed && !motionPaused}
                        onActivate={() => { setInteractive(true); track('hero_3d_open', heroMode); }} />
                    </Suspense>
                  ) : (
                    <button type="button" className="relative block w-full h-full rounded-xl overflow-hidden group focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
                      onClick={() => { setInteractive(true); track('hero_3d_open', heroMode); }}>
                      <img src={`/hero/${heroMode}.svg`} width={720} height={440} fetchPriority="high"
                        className="w-full h-full object-contain bg-slate-900"
                        alt={T('Example mixed load generated by the packing engine', '裝箱引擎產生嘅混裝示範')} />
                      <span className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap inline-flex items-center gap-2 rounded-full bg-blue-500 group-hover:bg-blue-400 px-5 py-2.5 text-sm font-bold text-white shadow-lg">
                        <Move3d size={18} /> {T('Explore in 3D', '開啟互動 3D')}
                      </span>
                    </button>
                  )}
                  {(interactive || animatePreview) && motionAllowed && <button type="button" aria-pressed={motionPaused}
                    className="mt-2 text-xs text-slate-300 underline underline-offset-4"
                    onClick={() => setMotionPaused(paused => !paused)}>
                    {motionPaused ? T('Resume rotation', '繼續旋轉') : T('Pause rotation', '暫停旋轉')}
                  </button>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label={T('Choose your task','選擇工作')} className="max-w-6xl mx-auto px-4 py-8 md:py-10">
        <div className="grid md:grid-cols-[1.4fr_1fr_1fr] gap-3">
          {tasks.slice(0,3).map((t,i)=><Link key={t.to} to={t.to} onClick={()=>track('home_entry',`task:${t.to}`)} className={`rounded-2xl border p-5 ${i===0?'bg-blue-50 border-blue-200':'border-slate-200 bg-white'} hover:border-blue-500`}>
            <t.icon size={22} className="text-blue-600 mb-3"/><h2 className="font-bold text-slate-900">{i===0?T('Plan mixed cargo','規劃混合貨物'):t.title}</h2>
            <p className="text-sm text-slate-600 mt-2">{i===0?T('Compare layouts, review remaining cartons and export your selected plan.','比較擺法、核對未裝箱數，再匯出你選擇嘅方案。'):t.body}</p>
            <span className="inline-flex items-center gap-2 mt-3 text-sm font-semibold text-blue-700">{T('Open tool','開啟工具')}<ArrowRight size={15}/></span>
          </Link>)}
        </div>
      </section>
      <section id="how" className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{T('One shipment. Compare, adjust, hand off.','同一批貨：比較、微調、交付。')}</h2>
          <div className="grid md:grid-cols-3 gap-6 mt-7">
            {[
              [T('1. Bring your cargo list','1. 匯入貨單'),T('Import Excel / CSV or enter carton sizes, weights and quantities. Review the accepted rows before calculating.','匯入 Excel／CSV，或輸入箱尺寸、重量及數量。計算前先核對接受嘅資料。'),'/planner?import=1',T('Import my list','匯入我的貨單')],
              [T('2. Choose a loading layout','2. 選擇裝載擺法'),T('Compare up to three distinct checked options when available. Inspect loaded and remaining cartons, utilization and weight together.','如有有效替代方案，可比較最多三種擺法。同時睇已裝／未裝箱數、利用率同重量。'),'/planner',T('Compare in 3D','用 3D 比較')],
              [T('3. Share a clear result','3. 交付清晰結果'),T('Export the selected layout as a PDF report or CSV positions. Save named plans and reusable templates with an account.','將選中方案匯出 PDF 報告或 CSV 位置表。有帳戶可保存工作及重用範本。'),'/plans',T('My plans & templates','我的方案與範本')],
            ].map(([title,body,to,label])=><div key={to}><h3 className="font-bold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p><Link to={to} onClick={()=>track('home_entry',`workflow:${to}`)} className="inline-block mt-3 py-2 font-semibold text-sm text-blue-700 underline underline-offset-4">{label} →</Link></div>)}
          </div>
          <div className="mt-8 grid lg:grid-cols-[1.5fr_1fr] gap-6 items-center">
            <VisibleVideo poster="/media/planner-drag-poster.jpg" width={1280} height={720} className="rounded-2xl border border-slate-200 w-full h-auto" aria-label={T('Adjust cartons in the 3D planner','喺 3D 規劃器微調紙箱')}><source src="/media/planner-drag.webm" type="video/webm"/><source src="/media/planner-drag.mp4" type="video/mp4"/></VisibleVideo>
            <div><h3 className="text-xl font-bold text-slate-900">{T('Keep control of the final arrangement','最後擺法，由你決定')}</h3><p className="mt-3 text-slate-600 text-sm leading-relaxed">{T('Rotate the view, select a carton and fine-tune its position. Review changes before exporting; a higher fill rate is only one part of the decision.','旋轉視圖、選取紙箱及微調位置。匯出前核對改動；利用率高低只係其中一個考慮。')}</p><Link to="/guides/excel-container-load-plan" className="inline-block mt-4 text-blue-700 font-semibold text-sm underline">{T('Follow the Excel worked example →','跟住 Excel 實例試一次 →')}</Link></div>
          </div>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-4 py-10 md:py-14">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{T('See what the calculation checks','睇清楚計算檢查啲乜')}</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {[
            [T('Fits & counts','尺寸與數量'),T('Checks placed positions, overlaps and requested versus loaded quantities. Remaining cargo stays visible.','核對擺位、重疊及要求／已裝數量，清楚列出未裝貨物。')],
            [T('Entered loading rules','你設定嘅裝載規則'),T('Considers payload, upright and fragile settings, stacking limits and unload order. Results depend on accurate inputs.','考慮載重、直立及易碎設定、堆疊限制同卸貨順序。結果取決於輸入資料。')],
            [T('A result you can review','可核對嘅結果'),T('3D layouts and carton-level reports help your team inspect the plan. Geometric screening is not transport or securing certification.','3D 擺位同逐箱報告方便團隊核對；幾何篩查並非運輸或綁紮安全認證。')],
          ].map(([title,body])=><div key={title} className="rounded-xl bg-blue-50/60 border border-blue-100 p-5"><h3 className="font-bold text-slate-900">{title}</h3><p className="mt-2 text-sm text-slate-600 leading-relaxed">{body}</p></div>)}
        </div>
        <div className="mt-6"><ProductUpdate /></div>
        <Link to="/reality-checks" className="mt-4 inline-block text-sm font-semibold text-blue-700 underline">{T('Read the checks and assumptions →','查看檢查及假設 →')}</Link>
      </section>
      <section id="calculators" className="bg-slate-50 border-y border-slate-100 scroll-mt-24">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
          <h2 className="text-xl font-bold text-slate-900">{T('Need a quick calculation?','只需要快速計算？')}</h2>
          <p className="text-sm text-slate-600 mt-2">{T('Start with the question you have. Open the full planner when you need a mixed-cargo arrangement.','由你手上嘅問題開始；需要混合貨物擺位時，再進入完整規劃器。')}</p>
          <div className="grid sm:grid-cols-3 gap-3 mt-5">{calculators.filter(c=>['/cbm-calculator','/pallet-calculator','/dimensional-weight-calculator'].includes(c.to)).map(c=><Link key={c.to} to={c.to} onClick={()=>track('home_entry',`calculator:${c.to}`)} className="border rounded-xl bg-white p-4 hover:border-blue-400"><h3 className="font-semibold text-slate-900">{c.title}</h3><p className="text-xs text-slate-600 mt-2">{c.body}</p></Link>)}</div>
          <details id="more-tools" className="mt-5 rounded-xl border border-slate-200 bg-white p-4 scroll-mt-24">
            <summary className="cursor-pointer py-1 font-semibold text-slate-800">{T('Browse all supporting tools','查看全部輔助工具')}</summary>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {[...tasks.slice(3),...calculators.filter(c=>!['/cbm-calculator','/pallet-calculator','/dimensional-weight-calculator'].includes(c.to)),
                {to:'/pallets-per-container',title:T('Pallets per container','每櫃卡板數'),body:T('Compare floor patterns for loaded pallets.','比較整板貨物嘅櫃內地面擺法。')},
                {to:'/ti-hi-calculator',title:T('TI / HI calculator','TI／HI 計算器'),body:T('Cases per layer and layers per pallet.','每層箱數及每板層數。')},
                {to:'/pallet-height-calculator',title:T('Pallet height calculator','卡板高度計算器'),body:T('Review mixed-order height and pallet estimates.','核對混合訂單高度及卡板估算。')},
              ].map(c=><Link key={c.to} to={c.to} onClick={()=>track('secondary_tool_open',c.to)} className="rounded-lg border p-4 hover:border-blue-400"><h3 className="font-semibold text-sm">{c.title}</h3><p className="mt-1 text-xs text-slate-600">{c.body}</p></Link>)}
            </div>
          </details>
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
