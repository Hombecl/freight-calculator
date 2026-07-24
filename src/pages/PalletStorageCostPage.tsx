import { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { track } from '../lib/track';

/**
 * /pallet-storage-cost-calculator — the "cost" search cluster the data
 * surfaced (pallet storage cost calculator pos ~76, fulfillment/3PL cost) that
 * had no tool. The math is deterministic (pallets × rate × months + handling);
 * the RATES are user inputs with typical ranges shown as guidance, never
 * fabricated prices — same honesty as the other estimators. Currency follows
 * the app's currency setting. Cross-links to the pallet + warehouse tools so
 * users can compare 3PL storage vs. running their own space.
 */

const TARE = 0;

export default function PalletStorageCostPage() {
  const { lang, units } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);
  const cur = (units?.currency as string) || 'USD';
  const [params, setParams] = useSearchParams();

  const [pallets, setPallets] = useState(() => Math.max(1, Number(params.get('p')) || 50));
  const [rate, setRate] = useState(() => Math.max(0, Number(params.get('r')) || 20));
  const [handling, setHandling] = useState(() => Math.max(0, Number(params.get('hd')) || 6));
  const [months, setMonths] = useState(() => Math.max(1, Number(params.get('m')) || 3));

  useEffect(() => {
    setParams({ p: String(pallets), r: String(rate), hd: String(handling), m: String(months) }, { replace: true });
  }, [pallets, rate, handling, months, setParams]);
  useEffect(() => { track('tool_pallet_storage_cost'); }, []);

  const r = useMemo(() => {
    const monthly = pallets * rate;
    const handlingTotal = pallets * handling; // one receive + one dispatch per pallet, over the batch
    const storageForPeriod = monthly * months;
    const totalForPeriod = storageForPeriod + handlingTotal + TARE;
    const annualStorage = monthly * 12;
    const perPalletPeriod = totalForPeriod / pallets;
    return { monthly, handlingTotal, storageForPeriod, totalForPeriod, annualStorage, perPalletPeriod };
  }, [pallets, rate, handling, months]);

  const money = (n: number) => `${Math.round(n).toLocaleString()} ${cur}`;
  const inputCls = 'w-full text-sm px-2 py-1.5 rounded border border-slate-200';

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Helmet>
        <title>{T('Pallet Storage Cost Calculator — 3PL / warehouse storage per pallet, free | DimPack3D', '卡板倉存費用計算器 — 3PL / 倉庫每板每月費用 | DimPack3D')}</title>
        <meta name="description" content={T(
          'Free pallet storage cost calculator. Estimate monthly, annual and total 3PL or warehouse storage cost from pallet count, rate per pallet per month and handling in/out fees — with typical rate ranges shown. Compare paying for storage vs. running your own space. No signup.',
          '免費卡板倉存費用計算器。按卡板數、每板每月費率同出入庫處理費,估算 3PL 或倉庫嘅每月、每年同總倉存成本,附常見費率範圍。仲可比較租倉 vs 自建倉。免費、唔使註冊。')} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How do you calculate pallet storage cost?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Monthly pallet storage cost = number of pallets × storage rate per pallet per month. Add handling (receiving + dispatch) fees per pallet, and multiply the monthly storage by the number of months for the total. Example: 50 pallets at 20 per pallet/month = 1,000/month; over 3 months plus 6/pallet handling = 3,300 total. Rates vary widely by region, ambient vs cold storage, volume and contract.',
                },
              },
              {
                '@type': 'Question',
                name: 'How much does it cost to store a pallet per month?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Ambient (dry) third-party warehouse storage commonly runs roughly 15–35 per pallet per month in USD-equivalent terms, plus handling fees of a few dollars per pallet in and out. Cold or frozen storage is significantly higher, and long-term or high-volume contracts are lower. Always confirm the current rate card with your 3PL — this calculator lets you enter your own rate.',
                },
              },
              {
                '@type': 'Question',
                name: 'Is 3PL storage or your own warehouse cheaper?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Third-party (3PL) storage is usually cheaper at low or seasonal pallet counts because you pay only for what you use and avoid lease, racking, labour and equipment overhead. Running your own space tends to win at high, steady volumes where the per-pallet cost of a fixed building falls below the 3PL rate. Estimate your own-space footprint with the warehouse space calculator and compare.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is included in pallet storage fees?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Storage fees typically cover the rack or floor space per pallet per month. Handling (receiving inbound and picking/dispatching outbound) is usually billed separately per pallet or per unit. Extras can include pallet wrapping, relabelling, long-term storage surcharges, and minimum monthly commitments. Read the rate card carefully — handling and accessorials often exceed the headline storage rate.',
                },
              },
            ],
          })}
        </script>
      </Helmet>

      <h1 className="text-3xl font-black text-slate-900 mb-2">{T('Pallet Storage Cost Calculator', '卡板倉存費用計算器')}</h1>
      <p className="text-slate-600 mb-8 max-w-2xl">
        {T('Estimate what 3PL or warehouse storage will cost — per month, per year and over your storage period — from pallet count, rate and handling fees. Enter your own rate; typical ranges are shown as a sanity check. Inputs stay in the URL — bookmark the quote.',
           '按卡板數、費率同處理費,估算 3PL 或倉庫倉存成本 — 每月、每年同成個倉存期。輸入你自己嘅費率,旁邊有常見範圍做參考。輸入保存喺網址 — 收藏低個報價。')}
      </p>

      <div className="grid md:grid-cols-[320px_1fr] gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{T('Number of pallets', '卡板數量')}</label>
            <input type="number" min={1} value={pallets} onChange={(e) => setPallets(Math.max(1, Number(e.target.value) || 1))} className={inputCls} />
            <p className="text-[11px] text-slate-400 mt-1">
              {T('Not sure how many pallets? ', '唔知幾多板?')}
              <Link to="/pallet-calculator" className="text-blue-600 hover:underline">{T('Work it out →', '去計 →')}</Link>
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{T('Storage rate', '倉存費率')} ({cur}/{T('pallet/month', '每板每月')})</label>
            <input type="number" min={0} step="0.5" value={rate} onChange={(e) => setRate(Math.max(0, Number(e.target.value) || 0))} className={inputCls} />
            <p className="text-[11px] text-slate-400 mt-1">{T('Typical ambient 3PL ≈ 15–35; cold storage much higher.', '常見常溫 3PL ≈ 15–35;冷凍高好多。')}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{T('Handling in + out', '出入庫處理費')} ({cur}/{T('pallet', '每板')})</label>
            <input type="number" min={0} step="0.5" value={handling} onChange={(e) => setHandling(Math.max(0, Number(e.target.value) || 0))} className={inputCls} />
            <p className="text-[11px] text-slate-400 mt-1">{T('Receiving + dispatch, once per pallet. Set 0 to ignore.', '收貨 + 出貨,每板一次。填 0 即忽略。')}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{T('Storage period (months)', '倉存期(月)')}</label>
            <input type="number" min={1} value={months} onChange={(e) => setMonths(Math.max(1, Number(e.target.value) || 1))} className={inputCls} />
          </div>
        </div>

        <div>
          <div className="rounded-2xl border border-slate-200 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">{T('Total for', '總費用 —')} {months} {T('month(s)', '個月')}</p>
            <p className="text-4xl font-black text-slate-900">{money(r.totalForPeriod)}</p>
            <div className="mt-4 space-y-1.5 text-sm text-slate-600">
              <div className="flex justify-between"><span>{T('Monthly storage', '每月倉存')}</span><span className="font-semibold">{money(r.monthly)}</span></div>
              <div className="flex justify-between"><span>{T('Storage', '倉存')} × {months}</span><span className="font-semibold">{money(r.storageForPeriod)}</span></div>
              {handling > 0 && <div className="flex justify-between"><span>{T('Handling (in + out)', '處理費(出入)')}</span><span className="font-semibold">{money(r.handlingTotal)}</span></div>}
              <div className="flex justify-between"><span>{T('Annualised storage', '年化倉存')}</span><span className="font-semibold">{money(r.annualStorage)}</span></div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5"><span className="font-semibold text-slate-700">{T('Per pallet, this period', '每板(本期)')}</span><span className="font-bold text-slate-900">{money(r.perPalletPeriod)}</span></div>
            </div>
            <div className="mt-4 rounded-lg bg-slate-900 text-white p-4 font-mono text-xs">
              <p className="text-slate-400 mb-1">// {T('cost model', '費用模型')}</p>
              <p>monthly = {pallets} × {rate} = <span className="text-green-400">{money(r.monthly)}</span></p>
              <p>total = monthly × {months}{handling > 0 ? ` + ${pallets}×${handling}` : ''} = <span className="text-green-400">{money(r.totalForPeriod)}</span></p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-blue-50 border border-blue-100 p-5">
            <p className="text-sm text-slate-700 font-semibold mb-1.5">
              {T('Paying per pallet, or should you run your own space?', '係逐板俾錢,定係自己開倉抵啲?')}
            </p>
            <p className="text-sm text-slate-600 mb-3">
              {T('At steady, high pallet counts a fixed building can beat the per-pallet rate. Size the floor area you would need and compare it against this quote.',
                 '如果長期高卡板數,自建固定倉可能平過逐板租。計下你自己要幾大面積,再同呢個報價比較。')}
            </p>
            <Link to="/warehouse-space-calculator" onClick={() => track('tool_pallet_storage_cost_cta', 'warehouse')} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors">
              {T('Size your own warehouse space', '計你自己嘅倉庫面積')} <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-4 text-xs text-slate-400 leading-relaxed">
            <b>{T('Note:', '注意:')}</b>{' '}
            {T('This is a planning estimate, not a quote. Storage and handling rates vary widely by region, ambient vs cold storage, pallet size, volume and contract terms, and rate cards often add minimums, long-term surcharges and accessorials. The figures here use the rate you enter — always confirm the current rate card with your 3PL or warehouse.',
               '呢個係規劃估算,唔係報價。倉存同處理費率因地區、常溫/冷凍、卡板尺寸、貨量同合約差異好大,費率表通常仲有最低消費、長期附加費同雜項。呢度用你輸入嘅費率 — 實際請向你嘅 3PL 或倉庫確認最新費率表。')}
          </div>
        </div>
      </div>

      {/* How-to (editorial) — matches "how to calculate pallet storage cost" intent */}
      <section className="mt-16 max-w-3xl">
        <h2 className="text-2xl font-black text-slate-900 mb-4">
          {T('How to calculate pallet storage cost', '卡板倉存費用點樣計')}
        </h2>
        <p className="text-slate-600 mb-6">
          {T('Pallet storage is priced per pallet, per month — but the headline rate is only part of the bill. Handling and accessorials often add as much again. Work it out in three steps.',
             '卡板倉存按「每板每月」計 — 但表面費率只係一部分,處理費同雜項往往加多成倍。三步計清楚。')}
        </p>

        <ol className="space-y-4 mb-8">
          {[
            [T('1. Monthly storage = pallets × rate', '1. 每月倉存 = 卡板數 × 費率'),
             T('The core line. 50 pallets at 20 per pallet/month = 1,000 per month. Rates depend on ambient vs cold, region, and how much space you commit to.',
               '核心一條數。50 板 × 每板每月 20 = 每月 1,000。費率睇常溫/冷凍、地區同你承諾嘅空間。')],
            [T('2. Add handling in and out', '2. 加出入庫處理費'),
             T('Receiving and dispatching are usually billed per pallet, separate from storage. A few units per pallet each way adds up fast on high turnover.',
               '收貨同出貨通常按板另計,同倉存分開。每板出入各幾蚊,周轉快就好快累積。')],
            [T('3. Multiply by months, then compare', '3. 乘月數,再比較'),
             T('Total = monthly storage × months + handling. Then compare against running your own space: at steady high volume, a fixed building can cost less per pallet.',
               '總數 = 每月倉存 × 月數 + 處理費。再同自建倉比較:長期高量時,固定倉每板成本可能更低。')],
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
          <Link to="/warehouse-space-calculator" className="text-blue-600 hover:underline">{T('Warehouse space calculator', '倉庫面積計算器')}</Link>
          {' · '}
          <Link to="/cbm-calculator" className="text-blue-600 hover:underline">{T('CBM calculator', 'CBM 計算器')}</Link>
          {' · '}
          <Link to="/dimensional-weight-calculator" className="text-blue-600 hover:underline">{T('Dimensional weight calculator', '體積重量計算器')}</Link>
        </div>
      </section>
    </div>
  );
}
