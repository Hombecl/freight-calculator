import { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { track } from '../lib/track';
import { PALLETS, CM_PER_IN, perLayer } from '../lib/pallets';

/**
 * /ti-hi-calculator — TI × HI in industry language. The math is the pallet
 * calculator's perLayer/layers (shared via src/lib/pallets.ts) with the
 * retail-compliance framing: TI = cases per layer, HI = layers high.
 * "ti hi" + "ti hi calculator" ≈ 800/mo US with near-zero competition.
 */

export default function TiHiCalcPage() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);
  const [params, setParams] = useSearchParams();

  const [unit, setUnit] = useState<'cm' | 'in'>(() => (params.get('u') === 'in' ? 'in' : 'cm'));
  const [cl, setCl] = useState(() => Math.max(1, Number(params.get('l')) || (params.get('u') === 'in' ? 16 : 40)));
  const [cw, setCw] = useState(() => Math.max(1, Number(params.get('w')) || (params.get('u') === 'in' ? 12 : 30)));
  const [ch, setCh] = useState(() => Math.max(1, Number(params.get('h')) || (params.get('u') === 'in' ? 12 : 30)));
  const [palletKey, setPalletKey] = useState<string>(() => params.get('p') ?? 'gma');
  const [maxH, setMaxH] = useState(() => Math.max(0, Number(params.get('mh')) || 0)); // 0 = pallet default

  useEffect(() => {
    setParams({ u: unit, l: String(cl), w: String(cw), h: String(ch), p: palletKey, mh: String(maxH) }, { replace: true });
  }, [unit, cl, cw, ch, palletKey, maxH, setParams]);
  useEffect(() => { track('tool_tihi'); }, []);

  const toggleUnit = () => {
    if (unit === 'cm') {
      setUnit('in');
      setCl(+(cl / CM_PER_IN).toFixed(1)); setCw(+(cw / CM_PER_IN).toFixed(1)); setCh(+(ch / CM_PER_IN).toFixed(1));
    } else {
      setUnit('cm');
      setCl(+(cl * CM_PER_IN).toFixed(1)); setCw(+(cw * CM_PER_IN).toFixed(1)); setCh(+(ch * CM_PER_IN).toFixed(1));
    }
  };

  const pallet = PALLETS.find((p) => p.key === palletKey) ?? PALLETS[1];

  const r = useMemo(() => {
    const f = unit === 'in' ? CM_PER_IN : 1;
    const L = cl * f, W = cw * f, H = ch * f;
    const loadH = maxH > 0 ? maxH * f : pallet.maxH;
    const ti = perLayer(L, W, pallet.l, pallet.w);
    const hi = H > 0 ? Math.floor(loadH / H) : 0;
    return { ti, hi, total: ti * hi, loadHeight: hi * H, loadH, fits: ti > 0 };
  }, [cl, cw, ch, unit, pallet, maxH]);

  const inputCls = 'w-full text-sm px-2 py-1.5 rounded border border-slate-200';

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Helmet>
        <title>{T('TI HI Calculator — cases per layer (TI) × layers high (HI), free | DimPack3D', 'TI HI 計算機 — 每層箱數 (TI) × 層數 (HI) | DimPack3D')}</title>
        <meta name="description" content={T(
          'Free TI HI calculator. Enter case dimensions and pallet type to get TI (cases per layer), HI (layers high), cases per pallet and load height — EUR, US GMA 48×40 and industrial pallets, with a custom max-height option for retailer compliance. No signup.',
          '免費 TI HI 計算機。輸入箱尺寸同卡板類型,即得 TI(每層箱數)、HI(層數)、每板總箱數同堆疊高度 — 支援歐標、美式 GMA 48×40 同工業卡板,可自訂最大高度以符合零售商要求。免費、唔使註冊。')} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'What does TI HI mean?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'TI (tier) is how many cases sit on one layer of the pallet; HI (high) is how many layers are stacked. TI × HI = cases per pallet. Example: TI 8 × HI 5 = 40 cases. Retailers, 3PLs and WMS setups ask for TI-HI on item setup forms and ASNs because it defines the standard pallet build for slotting, receiving and putaway.',
                },
              },
              {
                '@type': 'Question',
                name: 'How do you calculate TI and HI?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'TI = how many case footprints fit on the pallet deck — try the case both ways round and keep the better block arrangement. HI = usable stack height ÷ case height, rounded down. A 16 × 12 in case on a 48 × 40 in GMA pallet gives TI 9 (3 × 3 block); at 12 in tall under a 60 in load height, HI 5 — so 45 cases per pallet.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is a typical TI HI for a 48x40 pallet?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'It depends entirely on case size: common grocery cases run TI 6–12 and HI 4–7 on a 48 × 40 in GMA pallet, keeping the finished pallet at or under about 60 inches including the pallet for rack and trailer compatibility. Retailer routing guides often cap loaded pallet height — check the guide before fixing TI-HI on an item setup.',
                },
              },
              {
                '@type': 'Question',
                name: 'Why do retailers and warehouses ask for TI HI?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'TI-HI standardises the pallet build: receiving can verify counts at a glance (TI × HI × full layers), the WMS can compute pallet quantities for slotting and replenishment, and transport can predict pallet height and weight. A wrong TI-HI on an item master causes miscounts, chargebacks and rejected ASNs.',
                },
              },
            ],
          })}
        </script>
      </Helmet>

      <h1 className="text-3xl font-black text-slate-900 mb-2">{T('TI HI Calculator', 'TI HI 計算機')}</h1>
      <p className="text-slate-600 mb-8 max-w-2xl">
        {T('TI (cases per layer) × HI (layers high) for your case size on standard pallets — the numbers item-setup forms and ASNs ask for. Inputs stay in the URL — bookmark your case.',
           '計出你嘅箱喺標準卡板上嘅 TI(每層箱數)× HI(層數)— 即係 item setup 表格同 ASN 要你填嗰兩個數。輸入保存喺網址 — 收藏低你嘅箱。')}
      </p>

      <div className="grid md:grid-cols-[320px_1fr] gap-8">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-500">{T('Case dimensions', '箱尺寸')} ({unit})</label>
              <button onClick={toggleUnit} className="text-[11px] font-bold text-blue-600 hover:text-blue-500">
                {unit === 'cm' ? T('switch to in', '轉 in') : T('switch to cm', '轉 cm')}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" min={1} value={cl} onChange={(e) => setCl(Math.max(1, Number(e.target.value) || 1))} className={inputCls} aria-label={`Length ${unit}`} />
              <input type="number" min={1} value={cw} onChange={(e) => setCw(Math.max(1, Number(e.target.value) || 1))} className={inputCls} aria-label={`Width ${unit}`} />
              <input type="number" min={1} value={ch} onChange={(e) => setCh(Math.max(1, Number(e.target.value) || 1))} className={inputCls} aria-label={`Height ${unit}`} />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{T('L × W × H, case kept upright.', 'L × W × H,箱直放。')}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{T('Pallet type', '卡板類型')}</label>
            <select value={palletKey} onChange={(e) => setPalletKey(e.target.value)} className={inputCls}>
              {PALLETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{T(`Max load height, ${unit} (blank = pallet default)`, `最大堆疊高度 ${unit}(留空 = 卡板預設)`)}</label>
            <input type="number" min={0} value={maxH || ''} placeholder={String(Math.round(pallet.maxH / (unit === 'in' ? CM_PER_IN : 1)))} onChange={(e) => setMaxH(Math.max(0, Number(e.target.value) || 0))} className={inputCls} />
            <p className="text-[11px] text-slate-400 mt-1">{T('Retail routing guides often cap loaded height — enter yours.', '零售商 routing guide 通常有高度上限 — 有就填。')}</p>
          </div>
        </div>

        <div>
          {!r.fits ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 flex items-start gap-3">
              <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-amber-800">
                {T('This case is larger than the pallet deck in both orientations — it would overhang. Reduce the case footprint or choose a larger pallet.',
                   '呢個箱兩個擺向都大過板面 — 會懸出。請縮細箱底面積或者揀大啲嘅卡板。')}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">TI × HI</p>
              <p className="text-4xl font-black text-slate-900">
                {r.ti} × {r.hi}
                <span className="text-lg font-bold text-slate-400 ml-3">= {r.total} {T('cases/pallet', '箱/板')}</span>
              </p>
              <div className="mt-4 space-y-1.5 text-sm text-slate-600">
                <div className="flex justify-between"><span>TI — {T('cases per layer', '每層箱數')}</span><span className="font-semibold">{r.ti}</span></div>
                <div className="flex justify-between"><span>HI — {T('layers high', '層數')}</span><span className="font-semibold">{r.hi}</span></div>
                <div className="flex justify-between"><span>{T('Load height used', '堆疊高度')}</span><span className="font-semibold">{Math.round(r.loadHeight)} / {Math.round(r.loadH)} cm</span></div>
                <div className="flex justify-between"><span>{T('Cases per pallet', '每板箱數')}</span><span className="font-semibold">{r.total}</span></div>
              </div>
              <div className="mt-4 rounded-lg bg-slate-900 text-white p-4 font-mono text-xs">
                <p className="text-slate-400 mb-1">// {pallet.label.split(' — ')[0]}</p>
                <p>TI = {T('best block fit on deck', '板面最佳整齊排列')} = <span className="text-green-400">{r.ti}</span></p>
                <p>HI = {Math.round(r.loadH)} ÷ {Math.round(ch * (unit === 'in' ? CM_PER_IN : 1))} = <span className="text-green-400">{r.hi}</span> → <span className="text-amber-400">{r.total} {T('cases', '箱')}</span></p>
              </div>
            </div>
          )}

          <div className="mt-4 rounded-2xl bg-blue-50 border border-blue-100 p-5">
            <p className="text-sm text-slate-700 font-semibold mb-1.5">
              {T('TI-HI is the spec. The build is where pallets fail.', 'TI-HI 係規格,砌板先係出事位。')}
            </p>
            <p className="text-sm text-slate-600 mb-3">
              {T('Build the pallet in 3D — see the layer pattern, catch overhang, and check weight against the pallet rating.',
                 '用 3D 砌出個卡板 — 睇每層擺法、捉懸出、對照卡板載重上限。')}
            </p>
            <Link to="/planner" onClick={() => track('tool_tihi_cta')} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors">
              {T('Build it in the load planner', '入裝載規劃器砌')} <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>

      <section className="mt-16 max-w-3xl">
        <h2 className="text-2xl font-black text-slate-900 mb-4">{T('What TI and HI mean', 'TI 同 HI 係咩')}</h2>
        <ol className="space-y-4 mb-8">
          {[
            [T('TI (tier) — cases per layer', 'TI(tier)— 每層箱數'),
             T('How many case footprints fit on the pallet deck in one layer. Found by trying the case both ways round and keeping the better block arrangement. Interlocking patterns can bind the load better but are set at build time, not on the item master.',
               '一層之內板面裝到幾多個箱底。兩個擺向都試,取較多嗰個整齊排列。交錯式擺法可以鎖實啲,但嗰個係砌板時決定,唔係 item master 嘅數。')],
            [T('HI (high) — layers on the pallet', 'HI(high)— 疊幾多層'),
             T('Usable load height ÷ case height, rounded down. The cap comes from your racking, trailer door or the retailer routing guide — whichever is lowest.',
               '可用堆疊高度 ÷ 箱高,向下取整。上限睇你嘅貨架、車門定零售商 routing guide — 邊個最矮跟邊個。')],
            [T('TI × HI = cases per pallet', 'TI × HI = 每板箱數'),
             T('The number the WMS uses for slotting and replenishment, receiving uses to count, and transport uses to predict height and weight. Get it wrong on the item setup and every downstream count is wrong.',
               'WMS 用嚟做 slotting 同補貨、收貨用嚟點數、運輸用嚟預估高度重量嘅數。Item setup 填錯,下游每個數都錯。')],
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
          <Link to="/pallet-calculator" className="text-blue-600 hover:underline">{T('Pallet calculator (adds weight caps & pallets needed)', '卡板計算器(連載重上限同所需板數)')}</Link>
          {' · '}
          <Link to="/freight-class-calculator" className="text-blue-600 hover:underline">{T('Freight class calculator', '運費等級計算機')}</Link>
          {' · '}
          <Link to="/planner" className="text-blue-600 hover:underline">{T('3D load planner', '3D 裝載規劃器')}</Link>
        </div>
      </section>
    </div>
  );
}
