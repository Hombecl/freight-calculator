import { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { track } from '../lib/track';
import { StickyResult, StickySpacer, CopyLink, PresetChips } from '../components/calc/CalcUx';

/**
 * /freight-class-calculator — NMFC freight class from shipment density.
 * "freight class calculator" is the highest-volume query in our niche
 * (~14,800/mo US) and "freight density calculator" (~1,600/mo) is the same
 * math. Density scale = the 13 sub-provision table in force since NMFC
 * Docket 2025-1 (2025-07-19), verified against NMFTA FAQ + two carrier
 * resources 2026-08-08. Estimate only — commodities with handling,
 * stowability or liability issues keep commodity-specific classes.
 */

// 2025 NMFC 13-sub density scale (lb/ft³ → class)
const DENSITY_CLASSES = [
  { min: 50, cls: '50', sub: 13 },
  { min: 35, cls: '55', sub: 12 },
  { min: 30, cls: '60', sub: 11 },
  { min: 22.5, cls: '65', sub: 10 },
  { min: 15, cls: '70', sub: 9 },
  { min: 12, cls: '85', sub: 8 },
  { min: 10, cls: '92.5', sub: 7 },
  { min: 8, cls: '100', sub: 6 },
  { min: 6, cls: '125', sub: 5 },
  { min: 4, cls: '175', sub: 4 },
  { min: 2, cls: '250', sub: 3 },
  { min: 1, cls: '300', sub: 2 },
  { min: 0, cls: '400', sub: 1 },
] as const;

const rangeLabel = (i: number) => {
  const row = DENSITY_CLASSES[i];
  const upper = i === 0 ? null : DENSITY_CLASSES[i - 1].min;
  return upper == null ? `≥ ${row.min}` : row.min === 0 ? `< ${upper}` : `${row.min} – < ${upper}`;
};

const CM_PER_IN = 2.54;
const KG_PER_LB = 0.453592;

export default function FreightClassCalcPage() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);
  const [params, setParams] = useSearchParams();

  const [unit, setUnit] = useState<'us' | 'metric'>(() => (params.get('u') === 'm' ? 'metric' : 'us'));
  const [l, setL] = useState(() => Math.max(1, Number(params.get('l')) || (params.get('u') === 'm' ? 120 : 48)));
  const [w, setW] = useState(() => Math.max(1, Number(params.get('w')) || (params.get('u') === 'm' ? 100 : 40)));
  const [h, setH] = useState(() => Math.max(1, Number(params.get('h')) || (params.get('u') === 'm' ? 120 : 48)));
  const [wt, setWt] = useState(() => Math.max(1, Number(params.get('wt')) || (params.get('u') === 'm' ? 230 : 500)));
  const [qty, setQty] = useState(() => Math.max(1, Number(params.get('q')) || 1));

  useEffect(() => {
    setParams({ u: unit === 'metric' ? 'm' : 'us', l: String(l), w: String(w), h: String(h), wt: String(wt), q: String(qty) }, { replace: true });
  }, [unit, l, w, h, wt, qty, setParams]);
  useEffect(() => { track('tool_freight_class'); }, []);

  const toggleUnit = () => {
    if (unit === 'us') {
      setUnit('metric');
      setL(+(l * CM_PER_IN).toFixed(1)); setW(+(w * CM_PER_IN).toFixed(1)); setH(+(h * CM_PER_IN).toFixed(1));
      setWt(+(wt * KG_PER_LB).toFixed(1));
    } else {
      setUnit('us');
      setL(+(l / CM_PER_IN).toFixed(1)); setW(+(w / CM_PER_IN).toFixed(1)); setH(+(h / CM_PER_IN).toFixed(1));
      setWt(+(wt / KG_PER_LB).toFixed(1));
    }
  };

  const r = useMemo(() => {
    const inL = unit === 'metric' ? l / CM_PER_IN : l;
    const inW = unit === 'metric' ? w / CM_PER_IN : w;
    const inH = unit === 'metric' ? h / CM_PER_IN : h;
    const lbs = (unit === 'metric' ? wt / KG_PER_LB : wt) * qty;
    const cuft = (inL * inW * inH * qty) / 1728;
    const density = cuft > 0 ? lbs / cuft : 0;
    const rawIdx = DENSITY_CLASSES.findIndex((d) => density >= d.min);
    const idx = rawIdx === -1 ? DENSITY_CLASSES.length - 1 : rawIdx;
    const row = DENSITY_CLASSES[idx];
    // "drop a class": distance to the next denser band — a cheaper rate.
    // Two honest ways there: add weight at the same size, or cut height at
    // the same weight (tighter packing = our whole thesis).
    let drop = null;
    if (idx > 0 && density > 0) {
      const nextMin = DENSITY_CLASSES[idx - 1].min;
      const nextCls = DENSITY_CLASSES[idx - 1].cls;
      const addLb = nextMin * cuft - lbs;
      const maxCuft = lbs / nextMin;
      const newHIn = (maxCuft * 1728) / (inL * inW * qty);
      const cutIn = inH - newHIn;
      drop = { nextCls, gap: nextMin - density, addLb, cutIn };
    }
    return { cuft, lbs, density, row, idx, drop };
  }, [l, w, h, wt, qty, unit]);

  const inputCls = 'w-full text-sm px-2 py-1.5 rounded border border-slate-200';
  const dimU = unit === 'us' ? 'in' : 'cm';
  const wtU = unit === 'us' ? 'lb' : 'kg';

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Helmet>
        <title>{T('Freight Class Calculator — NMFC density class chart (2025 rules), free | DimPack3D', '運費等級計算機 — NMFC 密度等級表(2025 規則)| DimPack3D')}</title>
        <meta name="description" content={T(
          'Free freight class calculator. Enter pallet or crate dimensions and weight to get shipment density (lb/ft³) and the estimated NMFC freight class under the 13-sub density scale in force since July 2025 — full class chart from 50 to 400 shown. A freight density calculator and class lookup in one. No signup.',
          '免費運費等級(freight class)計算機。輸入卡板或木箱尺寸同重量,計出貨件密度(lb/ft³)同 2025 年 7 月起生效嘅 NMFC 13 級密度等級 — 完整 50 至 400 等級表一目了然。密度計算同等級查表一次過。免費、唔使註冊。')} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How do you calculate freight class?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Freight class is set by density for most LTL commodities since the July 2025 NMFC changes. 1) Measure the shipment as it ships — pallet included: length × width × height. 2) Cubic feet = (L × W × H in inches) ÷ 1,728. 3) Density = total weight in lb ÷ cubic feet. 4) Read the class off the NMFC density scale: for example 8–10 lb/ft³ is class 100, 6–8 is class 125, 4–6 is class 175. Denser freight gets a lower class and a cheaper rate.',
                },
              },
              {
                '@type': 'Question',
                name: 'What changed in the 2025 NMFC freight class rules?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'NMFC Docket 2025-1 (effective July 19, 2025) moved most LTL commodities without special handling, stowability or liability concerns to a pure density-based classification, and expanded the density scale from 11 to 13 sub-provisions — adding classes 55 (35–50 lb/ft³) and 50 (50+ lb/ft³) for very dense freight. Commodities with special characteristics keep commodity-specific classes, so always verify against the NMFC (ClassIT) or your carrier.',
                },
              },
              {
                '@type': 'Question',
                name: 'What freight class is 8 lb per cubic foot?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'A density of 8 lb/ft³ falls in the 8–10 lb/ft³ band, which is freight class 100 (sub 6) on the NMFC density scale. Just below it, 6–8 lb/ft³ is class 125; just above, 10–12 lb/ft³ is class 92.5.',
                },
              },
              {
                '@type': 'Question',
                name: 'Does the pallet count in freight class density?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Yes. Density is calculated on the shipment as tendered — including the pallet, crate or packaging. Measure to the extreme dimensions (overhang counts, height includes the pallet) and weigh the whole handling unit. Because the pallet adds weight faster than volume, palletised freight is usually slightly denser than the bare cartons.',
                },
              },
              {
                '@type': 'Question',
                name: 'Why does a lower freight class cost less?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Class reflects how much trailer space a pound of your freight consumes plus how hard it is to handle. Dense freight (class 50–85) fills a trailer by weight before it runs out of space, so carriers charge less per hundredweight. Light, bulky freight (class 250–400) cubes out the trailer first and pays more. Improving density — tighter cartons, less air, stacking higher on the pallet — is often the cheapest way to cut LTL cost.',
                },
              },
            ],
          })}
        </script>
      </Helmet>

      <h1 className="text-3xl font-black text-slate-900 mb-2">{T('Freight Class Calculator', '運費等級計算機')}</h1>
      <p className="text-slate-600 mb-8 max-w-2xl">
        {T('Shipment density and estimated NMFC freight class under the 2025 density rules — the full 13-class chart with your band highlighted. Inputs stay in the URL — bookmark your shipment.',
           '計出貨件密度同 2025 密度規則下嘅 NMFC 運費等級估算 — 完整 13 級表,你嘅等級會高亮顯示。輸入保存喺網址 — 收藏低你嘅貨件。')}
      </p>

      <div className="grid md:grid-cols-[320px_1fr] gap-8">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-500">{T('Handling-unit dimensions', '搬運單位尺寸')} ({dimU})</label>
              <button onClick={toggleUnit} className="text-[11px] font-bold text-blue-600 hover:text-blue-500">
                {unit === 'us' ? T('switch to cm/kg', '轉 cm/kg') : T('switch to in/lb', '轉 in/lb')}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" min={1} value={l} onChange={(e) => setL(Math.max(1, Number(e.target.value) || 1))} className={inputCls} aria-label={`Length ${dimU}`} />
              <input type="number" min={1} value={w} onChange={(e) => setW(Math.max(1, Number(e.target.value) || 1))} className={inputCls} aria-label={`Width ${dimU}`} />
              <input type="number" min={1} value={h} onChange={(e) => setH(Math.max(1, Number(e.target.value) || 1))} className={inputCls} aria-label={`Height ${dimU}`} />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{T('L × W × H as it ships — pallet and overhang included.', 'L × W × H 以出貨狀態計 — 連卡板同懸出。')}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{T('Weight per unit', '每件重量')} ({wtU})</label>
            <input type="number" min={1} value={wt} onChange={(e) => setWt(Math.max(1, Number(e.target.value) || 1))} className={inputCls} />
            <p className="text-[11px] text-slate-400 mt-1">{T('Whole handling unit — freight + pallet/crate.', '成個搬運單位 — 貨 + 卡板/木箱。')}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{T('Number of units', '件數')}</label>
            <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className={inputCls} />
          </div>
          <PresetChips
            title={T('Try a typical shipment:', '試下常見貨件:')}
            chips={[
              { label: T('Std pallet 500 lb', '標準板 500 lb'), onClick: () => { setUnit('us'); setL(48); setW(40); setH(48); setWt(500); setQty(1); } },
              { label: T('Tall pallet 900 lb', '高板 900 lb'), onClick: () => { setUnit('us'); setL(48); setW(40); setH(70); setWt(900); setQty(1); } },
              { label: T('Crate 1,200 lb', '木箱 1,200 lb'), onClick: () => { setUnit('us'); setL(60); setW(48); setH(40); setWt(1200); setQty(1); } },
            ]}
          />
        </div>

        <div>
          <div className="rounded-2xl border border-slate-200 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">{T('Estimated freight class', '估算運費等級')}</p>
            <p className="text-4xl font-black text-slate-900">
              {T('Class', 'Class')} {r.row.cls}
              <span className="text-lg font-bold text-slate-400 ml-3">{r.density.toFixed(2)} lb/ft³</span>
            </p>
            <div className="mt-4 space-y-1.5 text-sm text-slate-600">
              <div className="flex justify-between"><span>{T('Total cubic feet', '總立方呎')}</span><span className="font-semibold">{r.cuft.toFixed(2)} ft³</span></div>
              <div className="flex justify-between"><span>{T('Total weight', '總重量')}</span><span className="font-semibold">{Math.round(r.lbs).toLocaleString()} lb</span></div>
              <div className="flex justify-between"><span>{T('Density band', '密度區間')}</span><span className="font-semibold">{rangeLabel(r.idx)} lb/ft³ ({T('sub', 'sub')} {r.row.sub})</span></div>
            </div>
            {/* density scale — where this shipment sits between the class breaks */}
            <div className="mt-4">
              <div className="flex h-3 rounded-full overflow-hidden">
                {DENSITY_CLASSES.slice().reverse().map((d, i) => (
                  <div key={d.cls} className={`flex-1 ${DENSITY_CLASSES.length - 1 - i === r.idx ? 'bg-blue-600' : i % 2 ? 'bg-slate-200' : 'bg-slate-300'}`} title={`Class ${d.cls}`} />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>{T('light & bulky · class 400 · expensive', '輕拋 · class 400 · 貴')}</span>
                <span>{T('dense · class 50 · cheap', '密實 · class 50 · 平')}</span>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-slate-900 text-white p-4 font-mono text-xs">
              <p className="text-slate-400 mb-1">// {T('density math', '密度計算')}</p>
              <p>ft³ = (L × W × H) ÷ 1728 × {qty} = <span className="text-green-400">{r.cuft.toFixed(2)}</span></p>
              <p>{T('density', '密度')} = {Math.round(r.lbs).toLocaleString()} lb ÷ {r.cuft.toFixed(2)} ft³ = <span className="text-green-400">{r.density.toFixed(2)} lb/ft³</span> → <span className="text-amber-400">class {r.row.cls}</span></p>
            </div>
            <div className="mt-3"><CopyLink toolId="freight_class" /></div>
          </div>

          {r.drop && r.drop.cutIn > 0.05 && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-bold text-emerald-800 mb-1">
                {T(`You're ${r.drop.gap.toFixed(2)} lb/ft³ from class ${r.drop.nextCls} — a cheaper rate.`,
                   `仲差 ${r.drop.gap.toFixed(2)} lb/ft³ 就跌落 class ${r.drop.nextCls} — 運費更平。`)}
              </p>
              <p className="text-xs text-emerald-700">
                {T(`Get there by cutting ${unit === 'us' ? r.drop.cutIn.toFixed(1) + ' in' : (r.drop.cutIn * CM_PER_IN).toFixed(1) + ' cm'} of height (pack tighter, less air) — or the same shipment would qualify if it weighed ${Math.ceil(r.drop.addLb).toLocaleString()} lb more.`,
                   `方法:堆疊高度減 ${unit === 'us' ? r.drop.cutIn.toFixed(1) + ' 吋' : (r.drop.cutIn * CM_PER_IN).toFixed(1) + ' cm'}(裝密啲、少啲空氣)— 或者同一票貨重多 ${Math.ceil(r.drop.addLb).toLocaleString()} 磅都得。`)}
              </p>
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={18} />
            <p className="text-xs text-amber-800">
              {T('Estimate for density-classified commodities. Freight with handling, stowability or liability provisions keeps its commodity-specific NMFC class — confirm the NMFC item with your carrier or NMFTA ClassIT before quoting.',
                 '此為密度分類商品嘅估算。有搬運、積載或責任條款嘅貨物沿用商品專屬 NMFC 等級 — 報價前請同承運商或 NMFTA ClassIT 核實 NMFC 項目。')}
            </p>
          </div>

          <div className="mt-4 rounded-2xl bg-blue-50 border border-blue-100 p-5">
            <p className="text-sm text-slate-700 font-semibold mb-1.5">
              {T('Density is a packing outcome. Pack tighter, drop a class.', '密度係裝載結果。裝密啲,等級即刻跌一級。')}
            </p>
            <p className="text-sm text-slate-600 mb-3">
              {T('Stack the pallet higher and squeeze the air out in 3D — the planner shows exactly how high and heavy each pallet can go.',
                 '用 3D 將卡板疊高啲、迫走啲空氣 — planner 話你知每板可以去到幾高幾重。')}
            </p>
            <Link to="/planner" onClick={() => track('tool_freight_class_cta')} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors">
              {T('Optimise the pallet in 3D', '入 3D 優化個卡板')} <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>

      {/* full chart — the thing "freight class chart" searchers want */}
      <section className="mt-16 max-w-3xl">
        <h2 className="text-2xl font-black text-slate-900 mb-4">
          {T('NMFC freight class chart (2025 density scale)', 'NMFC 運費等級表(2025 密度標準)')}
        </h2>
        <p className="text-slate-600 mb-4 text-sm">
          {T('The 13 sub-provision density scale in force since July 19, 2025 (NMFC Docket 2025-1). Your shipment’s band is highlighted.',
             '2025 年 7 月 19 日起生效嘅 13 級密度標準(NMFC Docket 2025-1)。你貨件所在區間已高亮。')}
        </p>
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left p-3 font-bold text-slate-900">{T('Density (lb/ft³)', '密度 (lb/ft³)')}</th>
                <th className="text-left p-3 font-bold text-slate-900">{T('Freight class', '運費等級')}</th>
                <th className="text-left p-3 font-bold text-slate-900">Sub</th>
              </tr>
            </thead>
            <tbody>
              {DENSITY_CLASSES.map((d, i) => (
                <tr key={d.cls} className={`border-t border-slate-100 ${i === r.idx ? 'bg-blue-50 font-semibold' : i % 2 ? 'bg-slate-50' : ''}`}>
                  <td className="p-3">{rangeLabel(i)}</td>
                  <td className="p-3">{T('Class', 'Class')} {d.cls}</td>
                  <td className="p-3 text-slate-500">{d.sub}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-black text-slate-900 mb-4">
          {T('How to calculate freight class', '運費等級點樣計')}
        </h2>
        <ol className="space-y-4 mb-8">
          {[
            [T('1. Measure as it ships', '1. 以出貨狀態量度'),
             T('Length × width × height of the whole handling unit — pallet included, to the extreme points. Overhang counts; so does the pallet under the freight.',
               '成個搬運單位嘅長 × 闊 × 高 — 連卡板,量到最凸出點。懸出計,貨底嘅卡板都計。')],
            [T('2. Cubic feet = L × W × H ÷ 1,728', '2. 立方呎 = L × W × H ÷ 1,728'),
             T('Dimensions in inches; 1,728 cubic inches per cubic foot. Multiply by the number of identical units.',
               '尺寸用吋;1,728 立方吋 = 1 立方呎。相同貨件再乘以件數。')],
            [T('3. Density = weight ÷ cubic feet', '3. 密度 = 重量 ÷ 立方呎'),
             T('Total weight in pounds over total cubic feet, in lb/ft³ (pcf). This single number sets the class for density-rated freight.',
               '總磅重除以總立方呎,得 lb/ft³(pcf)。密度分類貨物嘅等級就由呢個數決定。')],
            [T('4. Read the chart — lower class, cheaper rate', '4. 查表 — 等級愈低,運費愈平'),
             T('Find the density band above. Dense freight (class 50–85) rates cheaper per pound than light bulky freight (class 250–400), because it uses less trailer space per pound.',
               '喺上表搵返你嘅密度區間。密實貨(class 50–85)每磅運費平過輕拋貨(class 250–400),因為每磅佔車廂空間少。')],
          ].map(([title, body], i) => (
            <li key={i} className="rounded-xl border border-slate-200 p-5">
              <p className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                <CheckCircle size={16} className="text-blue-500 flex-shrink-0" /> {title}
              </p>
              <p className="text-sm text-slate-600 pl-6">{body}</p>
            </li>
          ))}
        </ol>

        <div className="text-sm text-slate-500">
          {T('Related:', '相關:')}{' '}
          <Link to="/pallet-calculator" className="text-blue-600 hover:underline">{T('Pallet calculator', '卡板計算器')}</Link>
          {' · '}
          <Link to="/dimensional-weight-calculator" className="text-blue-600 hover:underline">{T('Dimensional weight calculator', '體積重量計算器')}</Link>
          {' · '}
          <Link to="/cbm-calculator" className="text-blue-600 hover:underline">{T('CBM calculator', 'CBM 計算機')}</Link>
          {' · '}
          <Link to="/planner" className="text-blue-600 hover:underline">{T('3D load planner', '3D 裝載規劃器')}</Link>
        </div>
      </section>
      <StickySpacer />
      <StickyResult label={T('Est. freight class', '運費等級')} value={`Class ${r.row.cls} · ${r.density.toFixed(1)} pcf`} />
    </div>
  );
}
