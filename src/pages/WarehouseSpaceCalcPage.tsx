import { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, CheckCircle } from 'lucide-react';
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
        <title>{T('Warehouse Space Calculator — square footage, m² & capacity calculation, free | DimPack3D', '倉庫面積計算器 — 平方呎、m² 同容量計算 | DimPack3D')}</title>
        <meta name="description" content={T(
          'How to calculate warehouse space and square footage: convert pallet count to floor area (square feet and m²) by storage type (selective rack, floor stack), rack levels and forklift aisle system — a warehouse space calculation and capacity estimate with the formula and every assumption shown. Free, no signup.',
          '點樣計倉庫面積同平方呎?按儲存方式(貨架/地面疊放)、貨架層數同鏟車通道系統,將卡板數換算做面積(平方呎同 m²)—倉庫面積同容量計算,公式同所有假設逐項列明。免費、唔使註冊。')} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How do you calculate how much warehouse space you need?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Work from pallets, not products. 1) Ground positions = pallets ÷ rack levels high. 2) Each position needs its own footprint plus a share of the aisle — plan ~1.2 × 1.1 m per pallet position including rack steel, and add half an aisle per rack row (a reach-truck aisle is ~2.9 m, counterbalance ~3.7 m, VNA ~1.8 m). 3) That gives storage + aisle area. 4) Add 30–40% of the building for receiving, shipping, staging, battery charging and offices. Total = storage area ÷ (1 − 0.35). Example: 500 pallets, 4 levels high, reach trucks ≈ 1,100 m² (~11,800 sq ft).',
                },
              },
              {
                '@type': 'Question',
                name: 'How much space does one pallet take in a warehouse?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'A single pallet position occupies about 1.2 × 1.1 m (1.32 m²) of floor including the rack frame, but the usable planning figure is higher once you add the aisle it shares. Racked 4 high with reach-truck aisles, one stored pallet works out to roughly 0.7–0.9 m² of total building area including support space. Floor-stacked (no racking) it is far more, because every pallet needs ground area.',
                },
              },
              {
                '@type': 'Question',
                name: 'Why is warehouse space more than pallets times pallet size?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Three things inflate it beyond raw pallet footprint: rack height (storing pallets vertically cuts ground positions), aisles (forklifts need 1.8–3.7 m between racks depending on truck type), and support space (receiving, shipping, staging, charging and offices are typically 30–40% of the building). A calculator that ignores aisles and support space undercounts by roughly half.',
                },
              },
              {
                '@type': 'Question',
                name: 'How do forklift aisles change the space you need?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Aisle width is set by the forklift, not the rack. Counterbalance trucks need ~3.7 m to turn 90° into a bay, reach trucks ~2.9 m, and VNA (very narrow aisle) turret trucks ~1.8 m — but VNA needs wire or rail guidance and taller mast investment. Narrower aisles store more pallets in the same building, so the aisle system is one of the biggest levers on total space.',
                },
              },
              {
                '@type': 'Question',
                name: 'How do you calculate warehouse square footage?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Warehouse square footage is the total floor area you need in square feet. Work it out in m² first (storage positions × footprint including aisles, then grossed up ~35% for receiving, shipping and support), then convert: 1 m² = 10.764 sq ft. For example, 500 pallets racked 4 high with reach trucks ≈ 590 m², which is about 6,350 sq ft. This calculator shows both m² and square feet, plus a capacity view of how many pallets a given area holds.',
                },
              },
            ],
          })}
        </script>
      </Helmet>

      <h1 className="text-3xl font-black text-slate-900 mb-2">{T('Warehouse Space Calculator', '倉庫面積計算器')}</h1>
      <p className="text-slate-600 mb-8 max-w-2xl">
        {T('A warehouse space calculation from pallet count to floor area — square footage and m², plus the storage capacity that area gives you — using the same aisle and rack math as our floor planner. Your inputs stay in the URL — bookmark the result.',
           '由卡板數計倉庫面積 — 平方呎同 m²,兼睇該面積嘅儲存容量 — 用嘅係同我哋 floor planner 一樣嘅通道/貨架數學。輸入會保存喺網址 — 收藏低隨時攞返。')}
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

      {/* How-to (editorial) — matches "how to calculate warehouse space" intent */}
      <section className="mt-16 max-w-3xl">
        <h2 className="text-2xl font-black text-slate-900 mb-4">
          {T('How to calculate warehouse space', '點樣計倉庫面積')}
        </h2>
        <p className="text-slate-600 mb-6">
          {T('The number people get wrong is not the pallet size — it is everything around the pallet. Work in four steps, and always start from pallets stored, not products.',
             '計錯嘅位好少係卡板尺寸,而係卡板周圍嗰啲。分四步計,而且永遠由「要儲幾多卡板」開始,唔係由產品數。')}
        </p>

        <ol className="space-y-4 mb-8">
          {[
            [T('1. Ground positions = pallets ÷ levels high', '1. 地面位 = 卡板數 ÷ 貨架層數'),
             T('Racking stores pallets vertically. 500 pallets 4 levels high = 125 ground positions. This is the single biggest lever — one extra rack level cuts your ground footprint by a quarter.',
               '貨架係向上疊。500 卡板 4 層高 = 125 個地面位。呢個係最大槓桿 — 多一層貨架,地面腳印即減四分一。')],
            [T('2. Footprint per position + a share of the aisle', '2. 每個位嘅腳印 + 分攤通道'),
             T('Plan ~1.2 × 1.1 m per pallet position including the rack steel. Then add half an aisle per rack row, because two rows share one aisle. Aisle width is set by the forklift: reach truck ~2.9 m, counterbalance ~3.7 m, VNA ~1.8 m.',
               '每個卡板位連貨架鋼架約 1.2 × 1.1 米。再每排加半條通道(兩排共用一條)。通道闊度由鏟車決定:前移式 ~2.9 米、平衡重式 ~3.7 米、VNA ~1.8 米。')],
            [T('3. Storage area = positions × (footprint + aisle share)', '3. 儲存面積 = 位數 × (腳印 + 通道分攤)'),
             T('This is the racked-and-aisled floor — the part that actually holds inventory.',
               '呢個係連通道嘅儲存樓面 — 真正裝貨嗰部分。')],
            [T('4. Add support space (÷ by 1 − 0.35)', '4. 加配套面積(÷ (1 − 0.35))'),
             T('Receiving, shipping, staging, battery charging and offices are typically 30–40% of the building. Divide storage area by 0.65 to gross up to the total. Skip this and you undercount by roughly a third.',
               '收貨、出貨、暫存、充電同辦公通常佔全棟 30–40%。儲存面積 ÷ 0.65 得出總面積。唔計呢層就會少計成三分一。')],
          ].map(([title, body], i) => (
            <li key={i} className="rounded-xl border border-slate-200 p-5">
              <p className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                <CheckCircle size={16} className="text-blue-500 flex-shrink-0" /> {title}
              </p>
              <p className="text-sm text-slate-600 pl-6">{body}</p>
            </li>
          ))}
        </ol>

        <div className="rounded-xl bg-slate-900 text-white p-6 mb-8 font-mono text-sm">
          <p className="text-slate-400 mb-2">// {T('Worked example — 500 pallets, 4 levels, reach trucks', '範例 — 500 卡板、4 層、前移式')}</p>
          <p className="mb-1">{T('Ground positions', '地面位')} = 500 ÷ 4 = <span className="text-green-400">125</span></p>
          <p className="mb-1">{T('Per position', '每位')} = (1.2 × 1.1) + (2.9 × 1.2 ÷ 2) = 1.32 + 1.74 = <span className="text-green-400">3.06 m²</span></p>
          <p className="mb-1">{T('Storage area', '儲存面積')} = 125 × 3.06 = <span className="text-green-400">383 m²</span></p>
          <p>{T('Total', '總面積')} = 383 ÷ 0.65 ≈ <span className="text-amber-400">590 m² (~6,350 sq ft)</span></p>
        </div>

        <p className="text-slate-600 text-sm mb-2">
          {T('The formula gives you a number. Whether that space actually works depends on the layout — can every forklift reach every pallet, turn into every bay, and does the slab carry the load?',
             '公式俾到你一個數。但嗰個面積用唔用得到,睇佈局 — 每架鏟車去唔去到每個卡板、轉唔轉到入每個格、地台頂唔頂得順?')}
        </p>
        <Link to="/warehouse" onClick={() => track('tool_wh_space_howto_cta')} className="inline-flex items-center gap-2 text-blue-600 font-bold text-sm hover:text-blue-500">
          {T('Draw it in the floor planner and check', '入 floor planner 畫出嚟驗證')} <ArrowRight size={15} />
        </Link>

        <div className="mt-6 text-sm text-slate-500">
          {T('Related:', '相關:')}{' '}
          <Link to="/forklift-aisle-width-calculator" className="text-blue-600 hover:underline">{T('Forklift aisle width calculator', '鏟車通道闊度計算器')}</Link>
          {' · '}
          <Link to="/dimensional-weight-calculator" className="text-blue-600 hover:underline">{T('Dimensional weight calculator', '體積重量計算器')}</Link>
        </div>
      </section>
    </div>
  );
}
