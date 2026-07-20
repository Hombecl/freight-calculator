import { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { track } from '../lib/track';

/**
 * /dimensional-weight-calculator — the biggest buried search cluster for the
 * site (dimensional/volumetric/billable weight, DIM weight, Amazon FBA
 * dimensional weight). /fba covers FBA size tiers; this is the cross-carrier
 * billable-weight tool: carriers charge the GREATER of actual and dimensional
 * weight, and each carrier uses a different divisor. Formula shown, inputs in
 * the URL (bookmarkable), funnels to /fba and /packing.
 */

// system: which unit the carrier's divisor is defined in.
//   metric   → dim kg  = (L×W×H cm) ÷ divisor
//   imperial → dim lb  = (L×W×H in) ÷ divisor
const CARRIERS = [
  { key: 'amazon', label: 'Amazon US FBA', system: 'imperial', divisor: 139, note: 'lb · ÷139 (in³/lb)' },
  { key: 'express', label: 'UPS / FedEx / DHL — international express', system: 'metric', divisor: 5000, note: 'kg · ÷5000 (cm³/kg)' },
  { key: 'courier-us', label: 'UPS / FedEx — US domestic', system: 'imperial', divisor: 139, note: 'lb · ÷139 (in³/lb)' },
  { key: 'air', label: 'Air freight (IATA volumetric)', system: 'metric', divisor: 6000, note: 'kg · ÷6000 (cm³/kg)' },
] as const;

const CM_PER_IN = 2.54;
const CM3_PER_IN3 = 16.387064;
const LB_PER_KG = 2.2046226;

export default function DimWeightCalcPage() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);
  const [params, setParams] = useSearchParams();

  const [unit, setUnit] = useState<'metric' | 'imperial'>(() => (params.get('u') === 'imperial' ? 'imperial' : 'metric'));
  const [l, setL] = useState(() => Math.max(1, Number(params.get('l')) || (params.get('u') === 'imperial' ? 24 : 60)));
  const [w, setW] = useState(() => Math.max(1, Number(params.get('w')) || (params.get('u') === 'imperial' ? 16 : 40)));
  const [h, setH] = useState(() => Math.max(1, Number(params.get('h')) || (params.get('u') === 'imperial' ? 20 : 50)));
  const [wt, setWt] = useState(() => Math.max(0, Number(params.get('wt')) || (params.get('u') === 'imperial' ? 18 : 8)));
  const [carrierKey, setCarrierKey] = useState<string>(() => params.get('c') ?? 'amazon');

  useEffect(() => {
    setParams({ u: unit, l: String(l), w: String(w), h: String(h), wt: String(wt), c: carrierKey }, { replace: true });
  }, [unit, l, w, h, wt, carrierKey, setParams]);
  useEffect(() => { track('tool_dim_weight'); }, []);

  // toggle unit AND convert current inputs, so the box the user described stays the same box
  const toggleUnit = () => {
    if (unit === 'metric') {
      setUnit('imperial');
      setL(+(l / CM_PER_IN).toFixed(1)); setW(+(w / CM_PER_IN).toFixed(1)); setH(+(h / CM_PER_IN).toFixed(1));
      setWt(+(wt * LB_PER_KG).toFixed(1));
    } else {
      setUnit('metric');
      setL(+(l * CM_PER_IN).toFixed(1)); setW(+(w * CM_PER_IN).toFixed(1)); setH(+(h * CM_PER_IN).toFixed(1));
      setWt(+(wt / LB_PER_KG).toFixed(1));
    }
  };

  const carrier = CARRIERS.find((c) => c.key === carrierKey) ?? CARRIERS[0];

  const r = useMemo(() => {
    const f = unit === 'imperial' ? CM_PER_IN : 1;
    const volCm3 = (l * f) * (w * f) * (h * f);
    const actualKg = unit === 'imperial' ? wt / LB_PER_KG : wt;

    let dim: number, actual: number, nUnit: string;
    if (carrier.system === 'metric') {
      dim = volCm3 / carrier.divisor;          // kg
      actual = actualKg;                        // kg
      nUnit = 'kg';
    } else {
      const volIn3 = volCm3 / CM3_PER_IN3;
      dim = volIn3 / carrier.divisor;           // lb
      actual = actualKg * LB_PER_KG;            // lb
      nUnit = 'lb';
    }
    const billable = Math.max(dim, actual);
    const governedByDim = dim >= actual;
    const altBillable = nUnit === 'kg' ? billable * LB_PER_KG : billable / LB_PER_KG;
    const altUnit = nUnit === 'kg' ? 'lb' : 'kg';
    return {
      dim, actual, billable, governedByDim, nUnit,
      altBillable, altUnit,
      cbm: volCm3 / 1_000_000,
    };
  }, [l, w, h, wt, unit, carrier]);

  const inputCls = 'w-full text-sm px-2 py-1.5 rounded border border-slate-200';
  const dimLabel = unit === 'imperial' ? 'in' : 'cm';
  const wtLabel = unit === 'imperial' ? 'lb' : 'kg';

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Helmet>
        <title>{T('Dimensional Weight Calculator — billable / DIM weight for FBA, UPS, FedEx, DHL & air freight | DimPack3D', '體積重量計算器 — FBA、UPS、FedEx、DHL、空運計費重量 | DimPack3D')}</title>
        <meta name="description" content={T(
          'Free dimensional (volumetric) weight calculator. Carriers charge the greater of actual and dimensional weight — this computes billable weight for Amazon FBA (÷139), UPS/FedEx/DHL express (÷5000), US domestic (÷139) and IATA air freight (÷6000), with the formula and CBM shown. No signup.',
          '免費體積(容積)重量計算器。快遞按實重同體積重量取大者收費 — 呢個計 Amazon FBA(÷139)、UPS/FedEx/DHL 快遞(÷5000)、美國本地(÷139)同 IATA 空運(÷6000)嘅計費重量,公式同 CBM 一齊顯示。免費、唔使註冊。')} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How do you calculate dimensional weight?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Dimensional (volumetric) weight = Length × Width × Height ÷ a carrier divisor. In metric, dim kg = (L×W×H in cm) ÷ 5000 for most international express, or ÷6000 for IATA air freight. In imperial, dim lb = (L×W×H in inches) ÷ 139 for Amazon FBA and US domestic UPS/FedEx. You are billed on the greater of dimensional weight and actual weight.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is billable (chargeable) weight?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Billable weight (also called chargeable weight) is the number the carrier actually charges: the greater of the shipment\'s actual weight and its dimensional weight. Light, bulky items are billed on dimensional weight; dense, heavy items are billed on actual weight.',
                },
              },
              {
                '@type': 'Question',
                name: 'What divisor does Amazon FBA use for dimensional weight?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Amazon US FBA uses 139 — dimensional weight in pounds = (length × width × height in inches) ÷ 139. For Large Standard and larger size tiers, the fulfillment fee is based on the greater of unit weight and dimensional weight. Reducing box dimensions can drop an item into a cheaper tier.',
                },
              },
              {
                '@type': 'Question',
                name: 'Why do UPS, FedEx, DHL and air freight give different weights for the same box?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Because each uses a different divisor. International express typically uses 5000 cm³/kg, IATA air freight uses 6000 cm³/kg, and US domestic couriers use 139 in³/lb. The same box therefore has a different dimensional weight — and a different bill — depending on the service.',
                },
              },
            ],
          })}
        </script>
      </Helmet>

      <h1 className="text-3xl font-black text-slate-900 mb-2">{T('Dimensional Weight Calculator', '體積重量計算器')}</h1>
      <p className="text-slate-600 mb-8 max-w-2xl">
        {T('Carriers charge the greater of actual weight and dimensional (volumetric) weight — and each carrier uses a different divisor. Pick the service, enter the box, and see the billable weight that decides your bill. Inputs stay in the URL — bookmark the box.',
           '快遞按實重同體積(容積)重量取大者收費 — 而且每間快遞用嘅除數唔同。揀服務、輸入箱尺寸,即睇決定運費嘅計費重量。輸入保存喺網址 — 收藏低你個箱。')}
      </p>

      <div className="grid md:grid-cols-[320px_1fr] gap-8">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-500">{T('Box dimensions', '箱尺寸')} ({dimLabel})</label>
              <button onClick={toggleUnit} className="text-[11px] font-bold text-blue-600 hover:text-blue-500">
                {unit === 'metric' ? T('switch to in/lb', '轉 in/lb') : T('switch to cm/kg', '轉 cm/kg')}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" min={1} value={l} onChange={(e) => setL(Math.max(1, Number(e.target.value) || 1))} className={inputCls} aria-label={`Length ${dimLabel}`} />
              <input type="number" min={1} value={w} onChange={(e) => setW(Math.max(1, Number(e.target.value) || 1))} className={inputCls} aria-label={`Width ${dimLabel}`} />
              <input type="number" min={1} value={h} onChange={(e) => setH(Math.max(1, Number(e.target.value) || 1))} className={inputCls} aria-label={`Height ${dimLabel}`} />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{T('L × W × H — the outer carton, not the product.', 'L × W × H — 外箱尺寸,唔係產品。')}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{T('Actual weight', '實際重量')} ({wtLabel})</label>
            <input type="number" min={0} value={wt} onChange={(e) => setWt(Math.max(0, Number(e.target.value) || 0))} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{T('Carrier / service', '快遞 / 服務')}</label>
            <select value={carrierKey} onChange={(e) => setCarrierKey(e.target.value)} className={inputCls}>
              {CARRIERS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">{T('Divisor:', '除數:')} {carrier.note}</p>
          </div>
        </div>

        <div>
          <div className="rounded-2xl border border-slate-200 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">{T('Billable weight', '計費重量')}</p>
            <p className="text-4xl font-black text-slate-900">
              {r.billable.toFixed(2)} {r.nUnit}
              <span className="text-lg font-bold text-slate-400 ml-3">≈ {r.altBillable.toFixed(2)} {r.altUnit}</span>
            </p>
            <p className={`text-sm mt-2 font-semibold ${r.governedByDim ? 'text-amber-600' : 'text-emerald-600'}`}>
              {r.governedByDim
                ? T('→ Billed on DIMENSIONAL weight (box is light for its size)', '→ 按體積重量收費(箱相對尺寸偏輕)')
                : T('→ Billed on ACTUAL weight (box is dense)', '→ 按實際重量收費(箱夠實)')}
            </p>
            <div className="mt-4 space-y-1.5 text-sm text-slate-600">
              <div className="flex justify-between"><span>{T('Dimensional weight', '體積重量')}</span><span className="font-semibold">{r.dim.toFixed(2)} {r.nUnit}</span></div>
              <div className="flex justify-between"><span>{T('Actual weight', '實際重量')}</span><span className="font-semibold">{r.actual.toFixed(2)} {r.nUnit}</span></div>
              <div className="flex justify-between"><span>{T('Volume', '體積')}</span><span className="font-semibold">{r.cbm.toFixed(4)} CBM</span></div>
            </div>
            <div className="mt-4 rounded-lg bg-slate-900 text-white p-4 font-mono text-xs">
              <p className="text-slate-400 mb-1">// {carrier.label}</p>
              <p>
                {carrier.system === 'metric'
                  ? <>dim = (L×W×H {dimLabel === 'in' ? 'cm' : 'cm'}) ÷ <span className="text-amber-400">{carrier.divisor}</span> = <span className="text-green-400">{r.dim.toFixed(2)} kg</span></>
                  : <>dim = (L×W×H in) ÷ <span className="text-amber-400">{carrier.divisor}</span> = <span className="text-green-400">{r.dim.toFixed(2)} lb</span></>}
              </p>
              <p>billable = max(dim, actual) = <span className="text-green-400">{r.billable.toFixed(2)} {r.nUnit}</span></p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-blue-50 border border-blue-100 p-5">
            <p className="text-sm text-slate-700 font-semibold mb-1.5">
              {T('Selling on Amazon? The size tier — not just the weight — sets your FBA fee.', '喺 Amazon 賣?決定 FBA 費用嘅係尺寸分級,唔淨係重量。')}
            </p>
            <p className="text-sm text-slate-600 mb-3">
              {T('The FBA calculator maps your box to the 2025 size tier and estimates the fulfillment fee — where shrinking a dimension can drop a whole tier.',
                 'FBA 計算器會將你個箱對應 2025 尺寸分級並估算費用 — 縮一個尺寸就可能跌一個級。')}
            </p>
            <Link to="/fba" onClick={() => track('tool_dim_weight_cta', 'fba')} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors">
              {T('Open the FBA size & fee calculator', '開 FBA 尺寸與費用計算器')} <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-4 text-xs text-slate-400 leading-relaxed">
            <b>{T('Method:', '方法:')}</b>{' '}
            {T('Dimensional weight = L×W×H ÷ carrier divisor; billable weight = max(dimensional, actual). Divisors: Amazon US FBA & US domestic couriers 139 (in³/lb), international express 5,000 (cm³/kg), IATA air freight 6,000 (cm³/kg). Carriers round up and set their own DIM rules — confirm the current divisor and rounding with your carrier before quoting.',
               '體積重量 = L×W×H ÷ 快遞除數;計費重量 = max(體積, 實重)。除數:Amazon 美國 FBA 同美國本地快遞 139(in³/lb),國際快遞 5,000(cm³/kg),IATA 空運 6,000(cm³/kg)。快遞會向上進位並各有 DIM 規則 — 報價前請向快遞確認最新除數同進位方式。')}
          </div>
        </div>
      </div>

      {/* How-to (editorial) — matches "how is dimensional weight calculated" intent */}
      <section className="mt-16 max-w-3xl">
        <h2 className="text-2xl font-black text-slate-900 mb-4">
          {T('How dimensional weight is calculated', '體積重量點樣計')}
        </h2>
        <p className="text-slate-600 mb-6">
          {T('Carriers do not want to fly air. A big, light box takes the space of a heavy one, so they bill the greater of two numbers — actual weight, and a weight worked out from volume. Here is the whole method.',
             '快遞唔想運「空氣」。一個又大又輕嘅箱佔嘅位同一個重箱一樣,所以佢哋按兩個數取大者收費 — 實重,同埋由體積換算出嚟嘅重量。以下係全套方法。')}
        </p>

        <ol className="space-y-4 mb-8">
          {[
            [T('1. Measure the outer carton', '1. 量外箱'),
             T('Length × width × height of the packed box, including any bulge. Round each up to the carrier\'s unit (most round to the next whole cm or inch).',
               '量包好嘅外箱長 × 闊 × 高,連凸出都要計。每邊按快遞單位向上取整(多數進到下一個整數 cm 或 in)。')],
            [T('2. Multiply, then divide by the carrier divisor', '2. 相乘,再除以快遞除數'),
             T('Volume ÷ divisor gives dimensional weight. The divisor encodes the carrier\'s assumed density: 5,000 cm³/kg for most express, 6,000 for IATA air, 139 in³/lb for Amazon FBA and US domestic.',
               '體積 ÷ 除數 = 體積重量。除數代表快遞假設嘅密度:多數快遞 5,000 cm³/kg、IATA 空運 6,000、Amazon FBA 同美國本地 139 in³/lb。')],
            [T('3. Compare with actual weight — bill the greater', '3. 同實重比較 — 取大者收費'),
             T('Billable weight = max(dimensional, actual). If dimensional wins, your box is "light for its size" and shrinking it saves money. If actual wins, you are paying for real mass.',
               '計費重量 = max(體積, 實重)。如果體積贏,即係個箱「相對尺寸偏輕」,縮細個箱就慳到錢。如果實重贏,即係真係夠重。')],
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
                <th className="text-left p-3 font-bold text-slate-900">{T('Service', '服務')}</th>
                <th className="text-left p-3 font-bold text-slate-900">{T('Divisor', '除數')}</th>
                <th className="text-left p-3 font-bold text-slate-900">{T('Formula', '公式')}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100"><td className="p-3">Amazon US FBA</td><td className="p-3">139</td><td className="p-3 text-slate-600">(L×W×H in) ÷ 139 = lb</td></tr>
              <tr className="border-t border-slate-100 bg-slate-50"><td className="p-3">UPS / FedEx US domestic</td><td className="p-3">139</td><td className="p-3 text-slate-600">(L×W×H in) ÷ 139 = lb</td></tr>
              <tr className="border-t border-slate-100"><td className="p-3">UPS / FedEx / DHL express</td><td className="p-3">5,000</td><td className="p-3 text-slate-600">(L×W×H cm) ÷ 5000 = kg</td></tr>
              <tr className="border-t border-slate-100 bg-slate-50"><td className="p-3">Air freight (IATA)</td><td className="p-3">6,000</td><td className="p-3 text-slate-600">(L×W×H cm) ÷ 6000 = kg</td></tr>
            </tbody>
          </table>
        </div>

        <div className="text-sm text-slate-500">
          {T('Related:', '相關:')}{' '}
          <Link to="/fba" className="text-blue-600 hover:underline">{T('Amazon FBA size & fee calculator', 'Amazon FBA 尺寸與費用計算器')}</Link>
          {' · '}
          <Link to="/guides/amazon-dimensional-weight" className="text-blue-600 hover:underline">{T('Amazon dimensional weight guide', 'Amazon 體積重量指南')}</Link>
          {' · '}
          <Link to="/cbm-calculator" className="text-blue-600 hover:underline">{T('CBM calculator', 'CBM 計算器')}</Link>
          {' · '}
          <Link to="/packing" className="text-blue-600 hover:underline">{T('Carton packing calculator', '產品裝箱計算器')}</Link>
        </div>
      </section>
    </div>
  );
}
