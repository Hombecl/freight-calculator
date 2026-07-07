import { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { track } from '../lib/track';

/**
 * /warehouse-space-calculator — lead-gen tool aimed squarely at warehouse
 * people ("how much space do I need for N pallets?" is a high-volume query).
 * Pure planning math, every assumption shown on-page, inputs reflected in
 * the URL so the result is bookmarkable/shareable. Funnels to /warehouse.
 */

const AISLE_SYSTEMS = [
  { key: 'cb', label: 'Counterbalance · 3.7 m aisles', aisle: 3.7 },
  { key: 'reach', label: 'Reach truck · 2.9 m aisles', aisle: 2.9 },
  { key: 'vna', label: 'VNA turret · 1.8 m aisles', aisle: 1.8 },
] as const;

const STORAGE_TYPES = [
  { key: 'selective', label: 'Selective racking', desc: 'every pallet accessible' },
  { key: 'floor2', label: 'Floor stack ×2', desc: 'block storage, 2 high' },
  { key: 'floor1', label: 'Floor storage ×1', desc: 'no stacking' },
] as const;

export default function WarehouseSpaceCalcPage() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);
  const [params, setParams] = useSearchParams();

  const [pallets, setPallets] = useState(() => Math.max(1, Number(params.get('p')) || 500));
  const [storage, setStorage] = useState<string>(() => params.get('s') ?? 'selective');
  const [aisleKey, setAisleKey] = useState<string>(() => params.get('a') ?? 'reach');
  const [levels, setLevels] = useState(() => Math.min(8, Math.max(1, Number(params.get('l')) || 4)));

  // bookmarkable: inputs live in the URL
  useEffect(() => {
    setParams({ p: String(pallets), s: storage, a: aisleKey, l: String(levels) }, { replace: true });
  }, [pallets, storage, aisleKey, levels, setParams]);
  useEffect(() => { track('tool_wh_space'); }, []);

  const r = useMemo(() => {
    const aisle = AISLE_SYSTEMS.find((a) => a.key === aisleKey)?.aisle ?? 2.9;
    // EUR/GMA planning footprint incl. rack structure ≈ 1.2 × 1.1 m per position
    const posFoot = 1.2 * 1.1;
    const lvls = storage === 'selective' ? levels : storage === 'floor2' ? 2 : 1;
    const positionsPerFootprint = lvls;
    const footprints = Math.ceil(pallets / positionsPerFootprint);
    // double-deep row pair shares one aisle: aisle share per footprint =
    // aisle area spread over the two rack rows it serves
    const aisleShare = (aisle * 1.2) / 2; // m² per footprint (1.2 m row pitch)
    const storageArea = footprints * (posFoot + aisleShare);
    // receiving/shipping/staging/charging/offices — industry planning rule of thumb
    const supportFactor = 0.35;
    const total = storageArea / (1 - supportFactor);
    return {
      storageArea, total,
      totalSqft: total * 10.7639,
      perPallet: total / pallets,
      footprints, lvls,
    };
  }, [pallets, storage, aisleKey, levels]);

  const inputCls = 'w-full text-sm px-2 py-1.5 rounded border border-slate-200';

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Helmet>
        <title>{T('Warehouse Space Calculator — pallets to m²/sq ft, free | DimPack3D', '倉庫面積計算器 — 卡板數換算 m²/呎 | DimPack3D')}</title>
        <meta name="description" content={T(
          'How much warehouse space do you need? Convert pallet count to floor area (m² and sq ft) by storage type (selective rack, floor stack), rack levels and forklift aisle system — with every assumption shown. Free, no signup.',
          '要幾大個倉?按儲存方式(貨架/地面疊放)、貨架層數同鏟車通道系統,將卡板數換算做面積(m² 同平方呎),所有假設逐項列明。免費、唔使註冊。')} />
      </Helmet>

      <h1 className="text-3xl font-black text-slate-900 mb-2">{T('Warehouse Space Calculator', '倉庫面積計算器')}</h1>
      <p className="text-slate-600 mb-8 max-w-2xl">
        {T('Pallet count → floor area, using the same aisle and rack math as our floor planner. Your inputs stay in the URL — bookmark the result.',
           '卡板數 → 樓面面積,用嘅係同我哋 floor planner 一樣嘅通道/貨架數學。輸入會保存喺網址 — 收藏低隨時攞返。')}
      </p>

      <div className="grid md:grid-cols-[320px_1fr] gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{T('Pallets to store', '要儲存嘅卡板數')}</label>
            <input type="number" min={1} value={pallets} onChange={(e) => setPallets(Math.max(1, Number(e.target.value) || 1))} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{T('Storage type', '儲存方式')}</label>
            <select value={storage} onChange={(e) => setStorage(e.target.value)} className={inputCls}>
              {STORAGE_TYPES.map((s) => <option key={s.key} value={s.key}>{s.label} — {s.desc}</option>)}
            </select>
          </div>
          {storage === 'selective' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{T('Rack levels (incl. floor)', '貨架層數(連地面)')}</label>
              <input type="number" min={1} max={8} value={levels} onChange={(e) => setLevels(Math.min(8, Math.max(1, Number(e.target.value) || 1)))} className={inputCls} />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{T('Forklift aisle system', '鏟車通道系統')}</label>
            <select value={aisleKey} onChange={(e) => setAisleKey(e.target.value)} className={inputCls}>
              {AISLE_SYSTEMS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <div className="rounded-2xl border border-slate-200 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">{T('Estimated total footprint', '估算總面積')}</p>
            <p className="text-4xl font-black text-slate-900">
              {Math.round(r.total).toLocaleString()} m²
              <span className="text-lg font-bold text-slate-400 ml-3">≈ {Math.round(r.totalSqft).toLocaleString()} sq ft</span>
            </p>
            <div className="mt-4 space-y-1.5 text-sm text-slate-600">
              <div className="flex justify-between"><span>{T('Storage + aisles', '儲存 + 通道')}</span><span className="font-semibold">{Math.round(r.storageArea).toLocaleString()} m²</span></div>
              <div className="flex justify-between"><span>{T('Receiving / staging / support (35%)', '收貨/暫存/配套(35%)')}</span><span className="font-semibold">{Math.round(r.total - r.storageArea).toLocaleString()} m²</span></div>
              <div className="flex justify-between"><span>{T('Per pallet stored', '平均每卡板')}</span><span className="font-semibold">{r.perPallet.toFixed(2)} m²</span></div>
              <div className="flex justify-between"><span>{T('Ground footprints × levels', '地面腳印 × 層數')}</span><span className="font-semibold">{r.footprints.toLocaleString()} × {r.lvls}</span></div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-blue-50 border border-blue-100 p-5">
            <p className="text-sm text-slate-700 font-semibold mb-1.5">
              {T('Numbers are the start. The layout is where it goes wrong.', '條數只係開始,佈局先係出事位。')}
            </p>
            <p className="text-sm text-slate-600 mb-3">
              {T('Draw this warehouse in 3D — the planner checks forklift reachability, 90° turn clearance, slab loading and zone rules while you drag.',
                 '將個倉畫出嚟 — planner 會實時檢查鏟車可達性、90° 轉彎淨空、地台承重同分區規則。')}
            </p>
            <Link to="/warehouse" onClick={() => track('tool_wh_space_cta')} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors">
              {T('Open the floor planner', '開 floor planner')} <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-4 text-xs text-slate-400 leading-relaxed">
            <b>{T('Assumptions (shown, not hidden):', '假設(明碼實價):')}</b>{' '}
            {T('1.2×1.1 m planning footprint per pallet position incl. rack structure; row pairs share an aisle at 1.2 m pitch; 35% of the building for receiving, shipping, staging, charging and offices (industry planning rule of thumb). Verify rack and truck specs against your equipment data plates.',
               '每個卡板位連貨架結構按 1.2×1.1 米規劃腳印;兩排共用一條通道(1.2 米行距);全棟 35% 留俾收貨、出貨、暫存、充電同辦公(行業規劃慣例)。貨架同鏟車規格請以設備銘牌為準。')}
          </div>
        </div>
      </div>
    </div>
  );
}
