import { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { track } from '../lib/track';

/**
 * /pallet-calculator — "pallet loading" already ranks pos ~6 and "pallet
 * calculator / estimator" are buried with only a guide article. This is the
 * missing tool: cartons per layer, layers to max load height, cartons per
 * pallet (capped by weight), footprint utilisation, and pallets needed for a
 * quantity. Standard pallets + ratings reuse the answers.json figures. Best of
 * two block orientations (never over-counts); funnels to /planner.
 */

import { PALLETS, CM_PER_IN, PALLET_TARE_KG, perLayer } from '../lib/pallets';
import LayerDiagram from '../components/LayerDiagram';
import { StickyResult, StickySpacer, CopyLink, PresetChips } from '../components/calc/CalcUx';

// worked examples — common carton sizes, computed with the same perLayer math
// so the table can never disagree with the calculator. Each row deep-links the
// calculator with that carton preset.
const EXAMPLE_SIZES: Array<[number, number, number]> = [
  [60, 40, 40], [60, 40, 30], [50, 40, 30], [40, 30, 30], [40, 30, 20], [30, 20, 15],
];
const exampleFor = (l: number, w: number, h: number, p: (typeof PALLETS)[number]) => {
  const layer = perLayer(l, w, p.l, p.w);
  const layers = Math.floor(p.maxH / h);
  return { layer, layers, total: layer * layers };
};

export default function PalletCalcPage() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);
  const [params, setParams] = useSearchParams();

  const [unit, setUnit] = useState<'cm' | 'in'>(() => (params.get('u') === 'in' ? 'in' : 'cm'));
  const [cl, setCl] = useState(() => Math.max(1, Number(params.get('l')) || (params.get('u') === 'in' ? 16 : 40)));
  const [cw, setCw] = useState(() => Math.max(1, Number(params.get('w')) || (params.get('u') === 'in' ? 12 : 30)));
  const [ch, setCh] = useState(() => Math.max(1, Number(params.get('h')) || (params.get('u') === 'in' ? 12 : 30)));
  const [kgEach, setKgEach] = useState(() => Math.max(0, Number(params.get('wt')) || 10));
  const [palletKey, setPalletKey] = useState<string>(() => params.get('p') ?? 'eur');
  const [qty, setQty] = useState(() => Math.max(0, Number(params.get('q')) || 0));

  useEffect(() => {
    setParams({ u: unit, l: String(cl), w: String(cw), h: String(ch), wt: String(kgEach), p: palletKey, q: String(qty) }, { replace: true });
  }, [unit, cl, cw, ch, kgEach, palletKey, qty, setParams]);
  useEffect(() => { track('tool_pallet'); }, []);

  const toggleUnit = () => {
    if (unit === 'cm') {
      setUnit('in');
      setCl(+(cl / CM_PER_IN).toFixed(1)); setCw(+(cw / CM_PER_IN).toFixed(1)); setCh(+(ch / CM_PER_IN).toFixed(1));
    } else {
      setUnit('cm');
      setCl(+(cl * CM_PER_IN).toFixed(1)); setCw(+(cw * CM_PER_IN).toFixed(1)); setCh(+(ch * CM_PER_IN).toFixed(1));
    }
  };

  const pallet = PALLETS.find((p) => p.key === palletKey) ?? PALLETS[0];

  const r = useMemo(() => {
    const f = unit === 'in' ? CM_PER_IN : 1;
    const L = cl * f, W = cw * f, H = ch * f;
    const layerCount = perLayer(L, W, pallet.l, pallet.w);
    const fitsFootprint = layerCount > 0;
    const layers = Math.max(0, Math.floor(pallet.maxH / H));
    const byVolume = layerCount * layers;
    const byWeight = kgEach > 0 ? Math.floor(pallet.maxWt / kgEach) : Infinity;
    const perPallet = Math.max(0, Math.min(byVolume, byWeight));
    const weightLimited = kgEach > 0 && byWeight < byVolume;
    const usedLayers = layerCount > 0 ? Math.ceil(perPallet / layerCount) : 0;
    const loadHeight = usedLayers * H;
    const footprintUtil = fitsFootprint ? (layerCount * L * W) / (pallet.l * pallet.w) * 100 : 0;
    const palletWeight = perPallet * kgEach + PALLET_TARE_KG;
    const palletsNeeded = qty > 0 && perPallet > 0 ? Math.ceil(qty / perPallet) : null;
    return { layerCount, layers, perPallet, weightLimited, fitsFootprint, loadHeight, footprintUtil, palletWeight, palletsNeeded };
  }, [cl, cw, ch, kgEach, unit, pallet, qty]);

  const inputCls = 'w-full text-sm px-2 py-1.5 rounded border border-slate-200';

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Helmet>
        <title>{T('Pallet Calculator — cartons per pallet, layers & pallets needed, free | DimPack3D', '卡板計算器 — 每板箱數、層數同所需板數 | DimPack3D')}</title>
        <meta name="description" content={T(
          'Free pallet calculator. Enter carton size and weight to get cartons per layer, layers to max load height, cartons per pallet (capped by the pallet weight rating), footprint utilisation, and pallets needed for your order — EUR, US GMA and industrial pallets. No signup.',
          '免費卡板計算器。輸入紙箱尺寸同重量,即得每層箱數、到最大堆疊高度嘅層數、每板箱數(受卡板載重上限限制)、板面利用率同訂單所需板數 — 支援歐標、美式 GMA 同工業卡板。免費、唔使註冊。')} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many cartons fit on a pallet?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Cartons per pallet = cartons per layer × number of layers, capped by the pallet weight rating. Cartons per layer is how many carton footprints fit on the pallet deck (best of the two block orientations); layers = usable load height ÷ carton height. Example: a 40 × 30 cm carton on a 120 × 80 cm EUR pallet fits 8 per layer; at 30 cm tall under a 165 cm load height that is 5 layers = 40 cartons, if the total weight stays under 1,500 kg.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the maximum load height and weight of a pallet?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'A EUR/EPAL pallet is commonly planned to a 165 cm usable load height (180 cm overall) and a 1,500 kg dynamic rating. A US GMA 48×40 in pallet is often planned to ~152 cm and ~1,134 kg (2,500 lb). Industrial 120×100 cm pallets are similar to EUR. Always confirm against your racking height and the pallet spec.',
                },
              },
              {
                '@type': 'Question',
                name: 'How do you calculate the number of pallets needed?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Pallets needed = total cartons ÷ cartons per pallet, rounded up. First work out cartons per pallet (layer count × layers, capped by weight), then divide your order quantity by it. This calculator does both at once when you enter an order quantity.',
                },
              },
              {
                '@type': 'Question',
                name: 'How many 40×30×30 cm cartons fit on a EUR pallet?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'A 40 × 30 cm carton footprint fits 8 per layer on a 120 × 80 cm EUR pallet (4 × 2 with the 30 cm side along the 120 cm edge). At 30 cm tall under a 165 cm usable load height that is 5 layers — 40 cartons per pallet, provided the total weight stays under the 1,500 kg rating.',
                },
              },
              {
                '@type': 'Question',
                name: 'How many 60×40×40 cm cartons fit on a EUR pallet?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'A 60 × 40 cm footprint fits 4 per layer on a 120 × 80 cm EUR pallet (2 × 2 block). At 40 cm tall under a 165 cm load height that is 4 layers — 16 cartons per pallet, weight permitting.',
                },
              },
              {
                '@type': 'Question',
                name: 'Why does stacking pattern matter for pallet loading?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The stacking pattern sets both how many cartons fit per layer and how stable the stack is. A pure block stack is simple but weak at the corners; an interlocking or pinwheel pattern binds layers together and can sometimes fit more, at the cost of a more complex build. Overhang past the pallet edge is a top cause of transit damage and carrier rejection.',
                },
              },
            ],
          })}
        </script>
      </Helmet>

      <h1 className="text-3xl font-black text-slate-900 mb-2">{T('Pallet Calculator', '卡板計算器')}</h1>
      <p className="text-slate-600 mb-8 max-w-2xl">
        {T('How many cartons fit on a pallet — and how many pallets your order needs. Layer count, stack height and the weight rating are all applied. Inputs stay in the URL — bookmark your pallet.',
           '一板裝到幾多箱、你張單要幾多板。每層箱數、堆疊高度同載重上限一次過計埋。輸入保存喺網址 — 收藏低你嘅卡板。')}
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
              <input type="number" min={1} value={cl} onChange={(e) => setCl(Math.max(1, Number(e.target.value) || 1))} className={inputCls} aria-label={`Length ${unit}`} />
              <input type="number" min={1} value={cw} onChange={(e) => setCw(Math.max(1, Number(e.target.value) || 1))} className={inputCls} aria-label={`Width ${unit}`} />
              <input type="number" min={1} value={ch} onChange={(e) => setCh(Math.max(1, Number(e.target.value) || 1))} className={inputCls} aria-label={`Height ${unit}`} />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{T('L × W × H, kept upright on the pallet.', 'L × W × H,箱直放喺板上。')}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{T('Weight per carton, kg', '每箱重量, kg')}</label>
            <input type="number" min={0} value={kgEach} onChange={(e) => setKgEach(Math.max(0, Number(e.target.value) || 0))} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{T('Pallet type', '卡板類型')}</label>
            <select value={palletKey} onChange={(e) => setPalletKey(e.target.value)} className={inputCls}>
              {PALLETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">{T(`Load height ${pallet.maxH} cm · max ${pallet.maxWt} kg — verify your spec.`, `堆疊高度 ${pallet.maxH} cm · 上限 ${pallet.maxWt} kg — 以規格為準。`)}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{T('Order quantity (optional)', '訂單數量(選填)')}</label>
            <input type="number" min={0} value={qty} onChange={(e) => setQty(Math.max(0, Number(e.target.value) || 0))} className={inputCls} />
            <p className="text-[11px] text-slate-400 mt-1">{T('Total cartons to ship → pallets needed.', '要出嘅總箱數 → 所需板數。')}</p>
          </div>
          <PresetChips
            title={T('Try a common carton (cm):', '試下常見箱 (cm):')}
            chips={EXAMPLE_SIZES.slice(0, 4).map(([el, ew, eh]) => ({
              label: `${el}×${ew}×${eh}`,
              onClick: () => { setUnit('cm'); setCl(el); setCw(ew); setCh(eh); },
            }))}
          />
        </div>

        <div>
          {!r.fitsFootprint ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 flex items-start gap-3">
              <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-amber-800">
                {T('This carton is larger than the pallet deck in both orientations — it would overhang. Reduce the carton footprint or choose a larger pallet.',
                   '呢個箱兩個擺向都大過板面 — 會懸出。請縮細箱底面積或者揀大啲嘅卡板。')}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">{T('Cartons per pallet', '每板箱數')}</p>
              <p className="text-4xl font-black text-slate-900">
                {r.perPallet.toLocaleString()}
                <span className="text-lg font-bold text-slate-400 ml-3">{r.layerCount} × {Math.ceil(r.perPallet / Math.max(1, r.layerCount))} {T('layers', '層')}</span>
              </p>
              {r.weightLimited && (
                <p className="text-sm mt-2 font-semibold text-amber-600">
                  {T('→ Weight-limited: the stack hits the pallet rating before it runs out of height.', '→ 受重量限制:未疊到頂已到卡板載重上限。')}
                </p>
              )}
              <div className="mt-4 space-y-1.5 text-sm text-slate-600">
                <div className="flex justify-between"><span>{T('Cartons per layer', '每層箱數')}</span><span className="font-semibold">{r.layerCount}</span></div>
                <div className="flex justify-between"><span>{T('Layers used', '使用層數')}</span><span className="font-semibold">{Math.ceil(r.perPallet / Math.max(1, r.layerCount))} / {r.layers}</span></div>
                <div className="flex justify-between"><span>{T('Load height', '堆疊高度')}</span><span className="font-semibold">{Math.round(r.loadHeight)} cm</span></div>
                <div className="flex justify-between"><span>{T('Deck utilisation', '板面利用率')}</span><span className="font-semibold">{r.footprintUtil.toFixed(0)}%</span></div>
                <div className="flex justify-between"><span>{T('Gross pallet weight', '毛重(連板)')}</span><span className="font-semibold">{Math.round(r.palletWeight).toLocaleString()} kg</span></div>
                {r.palletsNeeded != null && (
                  <div className="flex justify-between border-t border-slate-100 pt-1.5">
                    <span className="font-semibold text-slate-700">{T('Pallets needed for', '所需板數 —')} {qty.toLocaleString()}</span>
                    <span className="font-bold text-slate-900">{r.palletsNeeded.toLocaleString()}</span>
                  </div>
                )}
                <div className="pt-2"><CopyLink toolId="pallet" /></div>
              </div>
              <div className="mt-4 grid sm:grid-cols-[1fr_auto] gap-4 items-start">
                <div className="rounded-lg bg-slate-900 text-white p-4 font-mono text-xs">
                  <p className="text-slate-400 mb-1">// {pallet.label.split(' — ')[0]}</p>
                  <p>{T('per layer', '每層')} = {r.layerCount} · {T('layers', '層')} = {pallet.maxH} ÷ {Math.round(ch * (unit === 'in' ? CM_PER_IN : 1))} = <span className="text-green-400">{r.layers}</span></p>
                  <p>{T('per pallet', '每板')} = min({T('vol', '容積')}, {T('weight', '重量')}) = <span className="text-green-400">{r.perPallet}</span></p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{T('Layer pattern (top view)', '每層擺法(俯視)')}</p>
                  <LayerDiagram cartonL={cl * (unit === 'in' ? CM_PER_IN : 1)} cartonW={cw * (unit === 'in' ? CM_PER_IN : 1)} palletL={pallet.l} palletW={pallet.w} />
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 rounded-2xl bg-blue-50 border border-blue-100 p-5">
            <p className="text-sm text-slate-700 font-semibold mb-1.5">
              {T('A count is not a stack. Pattern and overhang decide if it ships intact.', '一個數字唔等於一板貨。擺法同懸出先決定運到底爛唔爛。')}
            </p>
            <p className="text-sm text-slate-600 mb-3">
              {T('Build the pallet in 3D — the planner shows the layer pattern, flags overhang past the deck, and checks stack weight and height as you go.',
                 '將卡板用 3D 砌出嚟 — planner 會顯示每層擺法、標出超出板邊嘅懸出,仲會即時檢查堆疊重量同高度。')}
            </p>
            <Link to="/planner" onClick={() => track('tool_pallet_cta', 'planner')} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors">
              {T('Build it in the load planner', '入裝載規劃器砌')} <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-4 text-xs text-slate-400 leading-relaxed">
            <b>{T('Method:', '方法:')}</b>{' '}
            {T('Cartons per layer = best of the two block orientations (carton kept upright); layers = usable load height ÷ carton height; cartons per pallet = the lesser of the volume fit and the weight cap (rating ÷ carton weight). Interlocking or pinwheel patterns can fit a few more per layer but are not assumed here. Pallet load-height and weight ratings are common planning figures — verify against your pallet spec and racking limits.',
               '每層箱數 = 兩個擺向取較多者(箱直放);層數 = 可用堆疊高度 ÷ 箱高;每板箱數 = 容積裝載同重量上限(載重 ÷ 每箱重)取較細者。交錯或風車式擺法每層可能多裝幾箱,呢度唔假設。卡板堆疊高度同載重為常見規劃值 — 請以實際卡板規格同貨架限制為準。')}
          </div>
        </div>
      </div>

      {/* How-to (editorial) — matches "how many boxes fit on a pallet" intent */}
      <section className="mt-16 max-w-3xl">
        <h2 className="text-2xl font-black text-slate-900 mb-4">
          {T('How to calculate cartons per pallet', '每板箱數點樣計')}
        </h2>
        <p className="text-slate-600 mb-6">
          {T('Palletising is three limits stacked together — how many fit on the deck, how high you can go, and how much the pallet can carry. The real answer is whichever runs out first.',
             '疊卡板係三個限制疊埋一齊 — 板面裝到幾多、可以疊幾高、卡板頂到幾重。真正答案係邊個先爆頂。')}
        </p>

        <ol className="space-y-4 mb-8">
          {[
            [T('1. Cartons per layer (the deck)', '1. 每層箱數(板面)'),
             T('Fit the carton footprint onto the pallet deck. Try both orientations and keep the better count. A 40 × 30 cm carton on a 120 × 80 cm EUR pallet fits 8 per layer.',
               '將箱底面積放上板面。兩個擺向都試,取較多嗰個。40 × 30 cm 箱放 120 × 80 cm 歐標板,每層 8 箱。')],
            [T('2. Layers (the height)', '2. 層數(高度)'),
             T('Layers = usable load height ÷ carton height, rounded down. EUR pallets are commonly planned to 165 cm of load. A 30 cm carton → 5 layers.',
               '層數 = 可用堆疊高度 ÷ 箱高,向下取整。歐標板通常規劃到 165 cm。30 cm 箱 → 5 層。')],
            [T('3. Weight cap (the rating)', '3. 重量上限(載重)'),
             T('Cartons the pallet can carry = weight rating ÷ carton weight. A 1,500 kg EUR rating and 40 kg cartons caps you at 37 — even if height allowed more.',
               '卡板頂到嘅箱數 = 載重 ÷ 每箱重。歐標 1,500 kg、每箱 40 kg,上限 37 箱 — 就算高度仲夠都好。')],
            [T('4. Take the smaller, then divide the order', '4. 取較細,再除訂單'),
             T('Cartons per pallet = min(layer count × layers, weight cap). Pallets needed = order quantity ÷ cartons per pallet, rounded up.',
               '每板箱數 = min(每層 × 層數, 重量上限)。所需板數 = 訂單數量 ÷ 每板箱數,向上取整。')],
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
                <th className="text-left p-3 font-bold text-slate-900">{T('Pallet', '卡板')}</th>
                <th className="text-left p-3 font-bold text-slate-900">{T('Deck', '板面')}</th>
                <th className="text-left p-3 font-bold text-slate-900">{T('Load height', '堆疊高度')}</th>
                <th className="text-left p-3 font-bold text-slate-900">{T('Rating', '載重')}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100"><td className="p-3">EUR / EPAL</td><td className="p-3 text-slate-600">120 × 80 cm</td><td className="p-3 text-slate-600">165 cm</td><td className="p-3 text-slate-600">1,500 kg</td></tr>
              <tr className="border-t border-slate-100 bg-slate-50"><td className="p-3">US GMA</td><td className="p-3 text-slate-600">48 × 40 in</td><td className="p-3 text-slate-600">152 cm</td><td className="p-3 text-slate-600">1,134 kg</td></tr>
              <tr className="border-t border-slate-100"><td className="p-3">Industrial</td><td className="p-3 text-slate-600">120 × 100 cm</td><td className="p-3 text-slate-600">165 cm</td><td className="p-3 text-slate-600">1,500 kg</td></tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-black text-slate-900 mb-4">
          {T('Worked examples — common carton sizes', '常見箱尺寸範例')}
        </h2>
        <p className="text-slate-600 mb-4 text-sm">
          {T('Computed with the same math as the calculator above (block stack, carton upright, before any weight cap). Click a row to load it into the calculator.',
             '同上面計算器用同一套數學(整齊排列、箱直放、未計重量上限)。撳任何一行即載入計算器。')}
        </p>
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left p-3 font-bold text-slate-900">{T('Carton (cm)', '紙箱 (cm)')}</th>
                <th className="text-left p-3 font-bold text-slate-900">EUR 120×80</th>
                <th className="text-left p-3 font-bold text-slate-900">US GMA 48×40 in</th>
                <th className="text-left p-3 font-bold text-slate-900">{T('Industrial 120×100', '工業板 120×100')}</th>
              </tr>
            </thead>
            <tbody>
              {EXAMPLE_SIZES.map(([l, w, h], i) => (
                <tr key={i} className={`border-t border-slate-100 ${i % 2 ? 'bg-slate-50' : ''}`}>
                  <td className="p-3">
                    <Link
                      to={`/pallet-calculator?u=cm&l=${l}&w=${w}&h=${h}&wt=${kgEach}&p=${palletKey}&q=${qty}`}
                      onClick={() => { setUnit('cm'); setCl(l); setCw(w); setCh(h); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="text-blue-600 font-semibold hover:underline"
                    >
                      {l} × {w} × {h}
                    </Link>
                  </td>
                  {PALLETS.map((p) => {
                    const ex = exampleFor(l, w, h, p);
                    return (
                      <td key={p.key} className="p-3 text-slate-600">
                        <b className="text-slate-900">{ex.total}</b> {T('ctns', '箱')} <span className="text-slate-400">({ex.layer}/{T('layer', '層')} × {ex.layers})</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-sm text-slate-500">
          {T('Related:', '相關:')}{' '}
          <Link to="/planner" className="text-blue-600 hover:underline">{T('3D load planner', '3D 裝載規劃器')}</Link>
          {' · '}
          <Link to="/ti-hi-calculator" className="text-blue-600 hover:underline">{T('TI HI calculator', 'TI HI 計算機')}</Link>
          {' · '}
          <Link to="/freight-class-calculator" className="text-blue-600 hover:underline">{T('Freight class calculator', '運費等級計算機')}</Link>
          {' · '}
          <Link to="/pallet-storage-cost-calculator" className="text-blue-600 hover:underline">{T('Pallet storage cost calculator', '卡板倉存費用計算器')}</Link>
          {' · '}
          <Link to="/warehouse-space-calculator" className="text-blue-600 hover:underline">{T('Warehouse space calculator', '倉庫面積計算器')}</Link>
          {' · '}
          <Link to="/guides/pallet-calculator" className="text-blue-600 hover:underline">{T('Pallet calculator guide', '卡板計算指南')}</Link>
        </div>
      </section>
      <StickySpacer />
      <StickyResult label={T('Cartons per pallet', '每板箱數')} value={r.fitsFootprint ? `${r.perPallet.toLocaleString()}${r.palletsNeeded != null ? ` · ${r.palletsNeeded} ${T('plts', '板')}` : ''}` : T('overhangs', '會懸出')} />
    </div>
  );
}
