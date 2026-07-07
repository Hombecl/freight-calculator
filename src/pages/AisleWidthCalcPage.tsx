import { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { track } from '../lib/track';

/**
 * /forklift-aisle-width-calculator — lead-gen tool for warehouse people.
 * Right-angle stacking aisle (Ast) = turning radius + head length + load
 * length + clearance — the standard method, with truck presets. Inputs live
 * in the URL (bookmarkable). Funnels to /warehouse where the same geometry
 * runs live on a drawn floor.
 */

const TRUCKS = [
  // typical figures; every card says "verify against the data plate"
  { key: 'cb4', label: 'Counterbalance 4-wheel (2–2.5 t)', r: 220, head: 45 },
  { key: 'cb3', label: 'Counterbalance 3-wheel (compact)', r: 185, head: 40 },
  { key: 'reach', label: 'Reach truck', r: 170, head: 25 },
] as const;

export default function AisleWidthCalcPage() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);
  const [params, setParams] = useSearchParams();

  const [truckKey, setTruckKey] = useState<string>(() => params.get('t') ?? 'cb4');
  const [loadLen, setLoadLen] = useState(() => Math.max(50, Number(params.get('ll')) || 120));
  const [clearance, setClearance] = useState(() => Math.max(10, Number(params.get('c')) || 30));

  useEffect(() => {
    setParams({ t: truckKey, ll: String(loadLen), c: String(clearance) }, { replace: true });
  }, [truckKey, loadLen, clearance, setParams]);
  useEffect(() => { track('tool_aisle_width'); }, []);

  const truck = TRUCKS.find((t) => t.key === truckKey) ?? TRUCKS[0];
  const r = useMemo(() => {
    // Ast (right-angle stacking aisle) = turning radius + head length
    // (axle → fork face) + load length + operating clearance
    const ast = truck.r + truck.head + loadLen + clearance;
    const straight = Math.max(truck.r * 0.85, 160) + 40; // truck width path + margin, coarse straight-travel figure
    return { ast, straight };
  }, [truck, loadLen, clearance]);

  const inputCls = 'w-full text-sm px-2 py-1.5 rounded border border-slate-200';

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Helmet>
        <title>{T('Forklift Aisle Width Calculator — right-angle stacking aisle (Ast), free | DimPack3D', '鏟車通道闊度計算器 — 直角入位通道 (Ast) | DimPack3D')}</title>
        <meta name="description" content={T(
          'Calculate the right-angle stacking aisle your forklift really needs: turning radius + head length + load length + clearance, with counterbalance and reach-truck presets. The classic mistake is measuring for straight travel only. Free, no signup.',
          '計算鏟車真正需要嘅直角入位通道闊度:轉彎半徑+車頭長+載貨長+安全間隙,內置前移式/平衡重式預設。經典失誤係只按直行量度。免費、唔使註冊。')} />
      </Helmet>

      <h1 className="text-3xl font-black text-slate-900 mb-2">{T('Forklift Aisle Width Calculator', '鏟車通道闊度計算器')}</h1>
      <p className="text-slate-600 mb-8 max-w-2xl">
        {T('The classic layout mistake: the aisle is measured for straight travel, then the truck can\'t make the right-angle turn into the rack bay. This computes the stacking aisle (Ast) the standard way. Inputs stay in the URL — bookmark your truck.',
           '經典佈局失誤:通道按直行量,結果鏟車轉唔到直角彎入貨架。呢度用標準方法計直角入位通道 (Ast)。輸入保存喺網址 — 收藏低你架車。')}
      </p>

      <div className="grid md:grid-cols-[320px_1fr] gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{T('Truck type', '車型')}</label>
            <select value={truckKey} onChange={(e) => setTruckKey(e.target.value)} className={inputCls}>
              {TRUCKS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              {T(`Preset: turning radius ${truck.r} cm · head length ${truck.head} cm — typical figures, verify against your truck's data plate.`,
                 `預設:轉彎半徑 ${truck.r} cm · 車頭長 ${truck.head} cm — 典型數值,請以你架車銘牌為準。`)}
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{T('Load length (fork direction), cm', '載貨長度(叉方向), cm')}</label>
            <input type="number" min={50} value={loadLen} onChange={(e) => setLoadLen(Math.max(50, Number(e.target.value) || 50))} className={inputCls} />
            <p className="text-[11px] text-slate-400 mt-1">{T('EUR pallet long side = 120; GMA 48" = 122. Overhang counts — measure the LOAD, not the pallet.', 'EUR 卡板長邊 = 120;GMA 48 吋 = 122。懸出都要計 — 量「載貨」,唔係量卡板。')}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{T('Operating clearance, cm', '操作間隙, cm')}</label>
            <input type="number" min={10} value={clearance} onChange={(e) => setClearance(Math.max(10, Number(e.target.value) || 10))} className={inputCls} />
            <p className="text-[11px] text-slate-400 mt-1">{T('30 cm (12") is the common planning figure; tighter needs skilled, slower operation.', '30cm(12 吋)係常用規劃值;再窄就要熟手 + 慢速操作。')}</p>
          </div>
        </div>

        <div>
          <div className="rounded-2xl border border-slate-200 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">{T('Right-angle stacking aisle (Ast)', '直角入位通道 (Ast)')}</p>
            <p className="text-4xl font-black text-slate-900">
              {(r.ast / 100).toFixed(2)} m
              <span className="text-lg font-bold text-slate-400 ml-3">= {truck.r} + {truck.head} + {loadLen} + {clearance} cm</span>
            </p>
            <p className="text-sm text-slate-600 mt-3">
              {T('Turning radius + head length + load length + clearance. This is the aisle the truck needs to turn 90° INTO a rack bay — meaningfully more than straight travel.',
                 '轉彎半徑 + 車頭長 + 載貨長 + 間隙。呢個先係鏟車 90° 轉入貨架格所需嘅通道 — 明顯大過直行需要。')}
            </p>
          </div>

          <div className="mt-4 rounded-2xl bg-blue-50 border border-blue-100 p-5">
            <p className="text-sm text-slate-700 font-semibold mb-1.5">
              {T('An aisle number is necessary — but corners are where layouts fail.', '一條通道數字係基本 — 但佈局死因通常喺彎位。')}
            </p>
            <p className="text-sm text-slate-600 mb-3">
              {T('Draw your floor in the planner: it checks straight width AND the 90° turn box at every junction, flags cut-off pallets red, and simulates the forklift route.',
                 '將個倉畫入 planner:每個路口分開檢查直行闊度同 90° 轉彎淨空,去唔到嘅卡板即標紅,仲會模擬鏟車路線。')}
            </p>
            <Link to="/warehouse" onClick={() => track('tool_aisle_cta')} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors">
              {T('Test it on a real layout', '擺上真實佈局試下')} <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-4 text-xs text-slate-400 leading-relaxed">
            <b>{T('Method:', '方法:')}</b>{' '}
            {T('Ast = outside turning radius + head length (front axle to fork face) + load length + operating clearance — the standard right-angle stacking formula used in warehouse planning. Reach-truck figures assume the load retracted within the wheelbase. Always confirm with the manufacturer\'s aisle diagram for your exact model and mast.',
               'Ast = 外轉彎半徑 + 車頭長(前軸至叉面)+ 載貨長 + 操作間隙 — 倉庫規劃標準嘅直角入位公式。前移式數值假設載貨已縮入輪距內。實際請以廠方通道圖(對應你嘅型號同門架)確認。')}
          </div>
        </div>
      </div>
    </div>
  );
}
