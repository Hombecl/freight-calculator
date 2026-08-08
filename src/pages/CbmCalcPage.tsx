import { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { track } from '../lib/track';

/**
 * /cbm-calculator — the remaining buried cluster: CBM / cubic-meter / "how to
 * calculate cbm" / cbm formula. /packing does 3D bin-packing and the CBM guide
 * is an article; neither is the plain "carton → total CBM" tool people search
 * for. Adds air-freight chargeable weight (1 CBM ≈ 167 kg) and which container
 * it fits, so it also catches the shipping-cost intent. Formula shown, inputs
 * in the URL (bookmarkable), funnels to /container and /dimensional-weight.
 */

// usable (not gross) CBM — the figure that actually matters when loading,
// consistent with /guides/cbm-calculator-shipping
const CONTAINERS = [
  { key: '20gp', label: "20' GP", usable: 28, dims: [589, 235, 239] },
  { key: '40gp', label: "40' GP", usable: 58, dims: [1203, 235, 239] },
  { key: '40hq', label: "40' HQ", usable: 68, dims: [1203, 235, 269] },
] as const;

// the carton itself must physically fit inside in some orientation —
// volume alone can recommend a container an oversized crate can't enter
// (GPT-5.6 audit 2026-08-09)
const cartonFitsDims = (cm: number[], dims: readonly number[]) => {
  const c = [...cm].sort((x, y) => x - y);
  const d = [...dims].sort((x, y) => x - y);
  return c[0] <= d[0] && c[1] <= d[1] && c[2] <= d[2];
};

const CM_PER_IN = 2.54;
const KG_PER_CBM_AIR = 167; // IATA air freight volumetric: 1 m³ ÷ 6000 cm³/kg
const LB_PER_KG = 2.2046226;

export default function CbmCalcPage() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);
  const [params, setParams] = useSearchParams();

  // finite upper bounds: absurd values (1e308) otherwise render "Infinity CBM"
  const clampDim = (v: number) => Math.min(100000, Math.max(1, v));
  const clampQty = (v: number) => Math.min(10000000, Math.max(1, v));
  const [unit, setUnit] = useState<'cm' | 'in'>(() => (params.get('u') === 'in' ? 'in' : 'cm'));
  const [l, setL] = useState(() => clampDim(Number(params.get('l')) || (params.get('u') === 'in' ? 24 : 60)));
  const [w, setW] = useState(() => clampDim(Number(params.get('w')) || (params.get('u') === 'in' ? 16 : 40)));
  const [h, setH] = useState(() => clampDim(Number(params.get('h')) || (params.get('u') === 'in' ? 20 : 50)));
  const [qty, setQty] = useState(() => clampQty(Number(params.get('q')) || 100));
  const [kgEach, setKgEach] = useState(() => Math.min(1000000, Math.max(0, Number(params.get('wt')) || 0)));

  useEffect(() => {
    setParams({ u: unit, l: String(l), w: String(w), h: String(h), q: String(qty), wt: String(kgEach) }, { replace: true });
  }, [unit, l, w, h, qty, kgEach, setParams]);
  useEffect(() => { track('tool_cbm'); }, []);

  const toggleUnit = () => {
    if (unit === 'cm') {
      setUnit('in');
      setL(+(l / CM_PER_IN).toFixed(1)); setW(+(w / CM_PER_IN).toFixed(1)); setH(+(h / CM_PER_IN).toFixed(1));
    } else {
      setUnit('cm');
      setL(+(l * CM_PER_IN).toFixed(1)); setW(+(w * CM_PER_IN).toFixed(1)); setH(+(h * CM_PER_IN).toFixed(1));
    }
  };

  const r = useMemo(() => {
    const f = unit === 'in' ? CM_PER_IN : 1;
    const cm3 = (l * f) * (w * f) * (h * f);
    const singleCbm = cm3 / 1_000_000;
    const totalCbm = singleCbm * qty;
    // air freight chargeable weight = greater of actual and volumetric (CBM × 167)
    const totalActualKg = kgEach * qty;
    const volKg = totalCbm * KG_PER_CBM_AIR;
    const chargeableKg = Math.max(totalActualKg, volKg);
    const cmDims = [l * f, w * f, h * f];
    const fits = CONTAINERS.find((c) => totalCbm <= c.usable && cartonFitsDims(cmDims, c.dims));
    const tooBig = !CONTAINERS.some((c) => cartonFitsDims(cmDims, c.dims));
    return {
      singleCbm, totalCbm,
      totalActualKg, volKg, chargeableKg,
      chargeableByVol: volKg >= totalActualKg,
      fits, tooBig,
      fillPct: fits ? (totalCbm / fits.usable) * 100 : null,
    };
  }, [l, w, h, qty, kgEach, unit]);

  const inputCls = 'w-full text-sm px-2 py-1.5 rounded border border-slate-200';

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Helmet>
        <title>{T('CBM Calculator (Cubic Meter Calculator) — container fit, CBM to kg & chargeable weight, free | DimPack3D', 'CBM 計算機(材積計算機)— 立方米、貨櫃裝載、空運計費重量 | DimPack3D')}</title>
        <meta name="description" content={T(
          'Free CBM calculator. Enter carton L×W×H and quantity to get single and total cubic meters, which container it fits (20GP/40GP/40HQ), and air-freight chargeable weight (1 CBM ≈ 167 kg) — with the CBM formula shown. No signup.',
          '免費 CBM 計算機(材積計算機)。輸入紙箱 L×W×H 同數量,即得單箱同總立方米、可裝入邊款貨櫃(20GP/40GP/40HQ)同空運計費重量(1 CBM ≈ 167 kg),CBM 公式一齊顯示。免費、唔使註冊。')} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How do you calculate CBM?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'CBM (cubic meters) = Length × Width × Height with all sides in meters. From centimeters, CBM = (L × W × H in cm) ÷ 1,000,000. From inches, divide by 61,024. For multiple cartons, multiply the single-carton CBM by the quantity. Example: a 60 × 40 × 50 cm carton = 120,000 ÷ 1,000,000 = 0.12 CBM; 100 of them = 12 CBM.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the CBM formula?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The CBM formula is length × width × height in meters. Common conversions: cm → divide the product by 1,000,000; inches → divide by 61,024; feet → multiply by 0.0283. Total CBM = single-carton CBM × number of cartons.',
                },
              },
              {
                '@type': 'Question',
                name: 'How much is 1 CBM?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: '1 CBM is one cubic meter — a 1 m × 1 m × 1 m box, or for example a 100 × 100 × 100 cm carton. For air freight, 1 CBM is charged as about 167 kg of volumetric weight (the IATA 1:6000 rule). A 20GP container holds roughly 28 usable CBM, a 40GP about 58, and a 40HQ about 68.',
                },
              },
              {
                '@type': 'Question',
                name: 'How is CBM used to calculate shipping cost?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Sea LCL freight is usually priced per CBM (or per 1,000 kg, whichever is greater). Air freight charges the greater of actual weight and volumetric weight, where volumetric weight ≈ CBM × 167 kg. So calculating CBM tells you both how much container space you use and, for air, whether you will be billed on volume or on actual weight.',
                },
              },
            ],
          })}
        </script>
      </Helmet>

      <h1 className="text-3xl font-black text-slate-900 mb-2">{T('CBM Calculator', 'CBM 計算器')}</h1>
      <p className="text-slate-600 mb-8 max-w-2xl">
        {T('Carton size × quantity → total cubic meters, the container it fits, and air-freight chargeable weight. The CBM formula is shown as you type. Inputs stay in the URL — bookmark your shipment.',
           '紙箱尺寸 × 數量 → 總立方米、可裝入邊款貨櫃,同空運計費重量。輸入時即顯示 CBM 公式。輸入保存喺網址 — 收藏低你單貨。')}
      </p>

      <div className="grid md:grid-cols-[320px_1fr] gap-8">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-500">{T('Carton dimensions', '紙箱尺寸')} ({unit})</label>
              <button onClick={toggleUnit} className="text-[11px] font-bold text-blue-600 hover:text-blue-500">
                {unit === 'cm' ? T('switch to in', '轉 in') : T('switch to cm', '轉 cm')}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" min={1} value={l} onChange={(e) => setL(clampDim(Number(e.target.value) || 1))} className={inputCls} aria-label={`Length ${unit}`} />
              <input type="number" min={1} value={w} onChange={(e) => setW(clampDim(Number(e.target.value) || 1))} className={inputCls} aria-label={`Width ${unit}`} />
              <input type="number" min={1} value={h} onChange={(e) => setH(clampDim(Number(e.target.value) || 1))} className={inputCls} aria-label={`Height ${unit}`} />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{T('L × W × H of one outer carton.', '一個外箱嘅 L × W × H。')}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{T('Number of cartons', '紙箱數量')}</label>
            <input type="number" min={1} value={qty} onChange={(e) => setQty(clampQty(Number(e.target.value) || 1))} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{T('Weight per carton, kg (optional)', '每箱重量, kg(選填)')}</label>
            <input type="number" min={0} value={kgEach} onChange={(e) => setKgEach(Math.min(1000000, Math.max(0, Number(e.target.value) || 0)))} className={inputCls} />
            <p className="text-[11px] text-slate-400 mt-1">{T('For air chargeable weight (actual vs volumetric).', '用嚟計空運計費重量(實重 vs 體積重量)。')}</p>
          </div>
        </div>

        <div>
          <div className="rounded-2xl border border-slate-200 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">{T('Total volume', '總體積')}</p>
            <p className="text-4xl font-black text-slate-900">
              {r.totalCbm.toFixed(3)} CBM
              <span className="text-lg font-bold text-slate-400 ml-3">{r.singleCbm.toFixed(4)} × {qty}</span>
            </p>
            <div className="mt-4 space-y-1.5 text-sm text-slate-600">
              <div className="flex justify-between"><span>{T('Single carton', '單箱')}</span><span className="font-semibold">{r.singleCbm.toFixed(4)} CBM</span></div>
              <div className="flex justify-between">
                <span>{T('Smallest container that fits', '最細可裝貨櫃')}</span>
                <span className="font-semibold">{r.fits ? `${r.fits.label} · ${r.fillPct!.toFixed(0)}%` : r.tooBig ? T('carton exceeds container dims', '單箱大過貨櫃內尺寸') : T('> 40HQ (multiple / FCL)', '> 40HQ(多櫃)')}</span>
              </div>
              {kgEach > 0 && (
                <>
                  <div className="flex justify-between"><span>{T('Actual weight', '實際重量')}</span><span className="font-semibold">{r.totalActualKg.toFixed(0)} kg</span></div>
                  <div className="flex justify-between"><span>{T('Air volumetric (CBM × 167)', '空運體積重(CBM × 167)')}</span><span className="font-semibold">{r.volKg.toFixed(0)} kg</span></div>
                  <div className="flex justify-between border-t border-slate-100 pt-1.5">
                    <span className="font-semibold text-slate-700">{T('Air chargeable weight', '空運計費重量')}</span>
                    <span className="font-bold text-slate-900">{r.chargeableKg.toFixed(0)} kg <span className="text-xs font-normal text-slate-400">≈ {(r.chargeableKg * LB_PER_KG).toFixed(0)} lb</span></span>
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 rounded-lg bg-slate-900 text-white p-4 font-mono text-xs">
              <p className="text-slate-400 mb-1">// {T('CBM formula', 'CBM 公式')}</p>
              <p>CBM = (L×W×H {unit}) ÷ <span className="text-amber-400">{unit === 'cm' ? '1,000,000' : '61,024'}</span> = <span className="text-green-400">{r.singleCbm.toFixed(4)}</span></p>
              <p>total = {r.singleCbm.toFixed(4)} × {qty} = <span className="text-green-400">{r.totalCbm.toFixed(3)} CBM</span></p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-blue-50 border border-blue-100 p-5">
            <p className="text-sm text-slate-700 font-semibold mb-1.5">
              {T('CBM tells you the volume. It does not tell you if the boxes actually fit.', 'CBM 話你知體積,但唔會話你知啲箱實際裝唔裝得落。')}
            </p>
            <p className="text-sm text-slate-600 mb-3">
              {T('Two shipments with the same CBM can load very differently — orientation, stacking and weight limits decide the real container fill. Load it in 3D to see the true utilization.',
                 '兩單一樣 CBM 嘅貨,實際裝法可以差好遠 — 擺向、堆疊同重量限制先決定真實裝載率。用 3D 裝出嚟睇真實利用率。')}
            </p>
            <Link to="/container" onClick={() => track('tool_cbm_cta', 'container')} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors">
              {T('Load it in the container calculator', '入貨櫃計算器裝下')} <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-4 text-xs text-slate-400 leading-relaxed">
            <b>{T('Method:', '方法:')}</b>{' '}
            {T('CBM = L×W×H in meters (cm ÷ 1,000,000, inches ÷ 61,024). Container usable volumes are planning figures — 20GP ~28, 40GP ~58, 40HQ ~68 CBM — real fill is lower once orientation and weight limits apply. Air chargeable weight uses the IATA 1 CBM ≈ 167 kg rule; some express carriers use 200 kg/CBM. Confirm rates with your forwarder.',
               'CBM = L×W×H(以米計;cm ÷ 1,000,000,inch ÷ 61,024)。貨櫃可用容積為規劃值 — 20GP ~28、40GP ~58、40HQ ~68 CBM — 實際裝載受擺向同重量限制會較低。空運計費重量用 IATA 1 CBM ≈ 167 kg;部分快遞用 200 kg/CBM。實際運價請向貨代確認。')}
          </div>
        </div>
      </div>

      {/* How-to (editorial) — matches "how to calculate cbm" intent */}
      <section className="mt-16 max-w-3xl">
        <h2 className="text-2xl font-black text-slate-900 mb-4">
          {T('How to calculate CBM', 'CBM 點樣計')}
        </h2>
        <p className="text-slate-600 mb-6">
          {T('CBM (cubic meters) is the volume of your cargo — the number sea and air freight are priced on. It is a one-line formula, with one thing people get wrong: the units.',
             'CBM(立方米)係貨物體積 — 海運同空運計價嘅基準。公式一行搞掂,但有一樣好多人計錯:單位。')}
        </p>

        <ol className="space-y-4 mb-8">
          {[
            [T('1. Multiply L × W × H of one carton', '1. 一個箱嘅 L × W × H 相乘'),
             T('Use the outer carton size, not the product. Keep all three in the same unit.',
               '用外箱尺寸,唔係產品尺寸。三邊要同一單位。')],
            [T('2. Convert to cubic meters', '2. 換算做立方米'),
             T('If you measured in cm, divide by 1,000,000. In inches, divide by 61,024. In meters already, you are done. A 60×40×50 cm carton = 120,000 ÷ 1,000,000 = 0.12 CBM.',
               '如果用 cm 量,除以 1,000,000;用 inch 就除 61,024;用米就直接得。60×40×50 cm = 120,000 ÷ 1,000,000 = 0.12 CBM。')],
            [T('3. Multiply by quantity for total CBM', '3. 乘數量得出總 CBM'),
             T('Total CBM = single-carton CBM × number of cartons. 0.12 × 100 = 12 CBM — which fits comfortably in a 20GP (≈28 usable CBM).',
               '總 CBM = 單箱 CBM × 箱數。0.12 × 100 = 12 CBM — 一個 20GP(≈28 可用 CBM)裝得好鬆動。')],
            [T('4. For air, compare with volumetric weight', '4. 空運要同體積重量比較'),
             T('Air freight bills the greater of actual weight and volumetric weight, where volumetric ≈ CBM × 167 kg. 12 CBM ≈ 2,000 kg volumetric — if the cargo weighs less than that, you pay on volume.',
               '空運按實重同體積重量取大者收費,體積重量 ≈ CBM × 167 kg。12 CBM ≈ 2,000 kg 體積重 — 如果實重低過呢個數,就按體積收費。')],
          ].map(([title, body], i) => (
            <li key={i} className="rounded-xl border border-slate-200 p-5">
              <p className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                <CheckCircle size={16} className="text-blue-500 flex-shrink-0" /> {title}
              </p>
              <p className="text-sm text-slate-600 pl-6">{body}</p>
            </li>
          ))}
        </ol>

        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left p-3 font-bold text-slate-900">{T('Measured in', '量度單位')}</th>
                <th className="text-left p-3 font-bold text-slate-900">{T('To get CBM', '換算 CBM')}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100"><td className="p-3">cm</td><td className="p-3 text-slate-600">L × W × H ÷ 1,000,000</td></tr>
              <tr className="border-t border-slate-100 bg-slate-50"><td className="p-3">m</td><td className="p-3 text-slate-600">L × W × H {T('(no conversion)', '(無需換算)')}</td></tr>
              <tr className="border-t border-slate-100"><td className="p-3">inch</td><td className="p-3 text-slate-600">L × W × H ÷ 61,024</td></tr>
              <tr className="border-t border-slate-100 bg-slate-50"><td className="p-3">ft</td><td className="p-3 text-slate-600">L × W × H × 0.0283</td></tr>
            </tbody>
          </table>
        </div>

        <div className="text-sm text-slate-500">
          {T('Related:', '相關:')}{' '}
          <Link to="/dimensional-weight-calculator" className="text-blue-600 hover:underline">{T('Dimensional weight calculator', '體積重量計算器')}</Link>
          {' · '}
          <Link to="/container" className="text-blue-600 hover:underline">{T('Container loading calculator', '貨櫃裝載計算器')}</Link>
          {' · '}
          <Link to="/guides/cbm-calculator-shipping" className="text-blue-600 hover:underline">{T('CBM & shipping cost guide', 'CBM 與運費指南')}</Link>
          {' · '}
          <Link to="/packing" className="text-blue-600 hover:underline">{T('Carton packing calculator', '產品裝箱計算器')}</Link>
        </div>
      </section>
    </div>
  );
}
