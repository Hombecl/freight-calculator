import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useEffect } from 'react';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { track } from '../lib/track';

/**
 * /pallet-builder — landing for the "pallet builder" query (~1,300/mo US).
 * The interactive builder IS the 3D planner with a pallet vessel; this page
 * frames it in that audience's language and deep-links /planner?demo=pallet.
 * No duplicate tool — the calculators handle the numeric intents.
 */

export default function PalletBuilderPage() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);
  useEffect(() => { track('tool_pallet_builder'); }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Helmet>
        <title>{T('Pallet Builder — build pallets in 3D with layer patterns & weight checks, free | DimPack3D', '卡板砌板工具 — 3D 砌板、逐層擺法同重量檢查 | DimPack3D')}</title>
        <meta name="description" content={T(
          'Free 3D pallet builder. Stack your cases on a EUR, GMA 48×40 or Amazon FBA pallet, drag cartons layer by layer, and get overhang, load-height and weight-rating checks as you build — then export the build as a PDF with a packing list. No signup.',
          '免費 3D 卡板砌板工具。喺歐標、GMA 48×40 或 Amazon FBA 卡板上疊箱,逐層拖拉調整,實時檢查懸出、堆疊高度同載重上限 — 完成後匯出 PDF 連裝箱清單。免費、唔使註冊。')} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'What is a pallet builder?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'A pallet builder is a tool that works out how to stack cases onto a pallet — the layer pattern (how cases sit on the deck), how many layers high, and whether the finished pallet respects overhang, height and weight limits. A 3D builder shows the actual build so warehouse crews can replicate it, instead of just giving a count.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the difference between a pallet builder and a pallet calculator?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'A pallet calculator returns the numbers: cases per layer, layers, cases per pallet, pallets needed. A pallet builder produces the physical arrangement — the visual stacking plan you hand to the floor. Use the calculator to quote and the builder to load. On DimPack3D the two share the same math, so the counts always agree.',
                },
              },
              {
                '@type': 'Question',
                name: 'Why does pallet overhang matter?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Cartons that hang past the pallet edge lose up to a third of their compression strength, snag in transit, and get pallets rejected — Amazon FBA refuses overhanging pallets outright. A builder that flags overhang while you arrange the layer catches this before the wrap goes on.',
                },
              },
            ],
          })}
        </script>
      </Helmet>

      <h1 className="text-3xl font-black text-slate-900 mb-2">{T('Pallet Builder', '卡板砌板工具')}</h1>
      <p className="text-slate-600 mb-6 max-w-2xl">
        {T('Build the pallet, not just the number. Stack your cases on a EUR, GMA or FBA pallet in interactive 3D — drag cartons, see the layer pattern, and get overhang, height and weight checks as you go.',
           '唔止俾個數,而係砌出成板貨。喺互動 3D 入面將箱疊上歐標、GMA 或 FBA 卡板 — 拖拉紙箱、睇每層擺法,實時檢查懸出、高度同載重。')}
      </p>

      <Link to="/planner?demo=pallet" onClick={() => track('tool_pallet_builder_cta')} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors mb-10">
        {T('Open the 3D pallet builder', '開 3D 砌板工具')} <ArrowRight size={16} />
      </Link>

      <div className="grid sm:grid-cols-3 gap-4 mb-12">
        {[
          [T('Real pallet specs', '真實卡板規格'), T('EUR/EPAL 120×80, US GMA 48×40 and Amazon FBA (680 kg, zero overhang) built in — with load height and weight ratings applied.', '內置歐標 120×80、美式 GMA 48×40 同 Amazon FBA(680 kg、零懸出)— 堆疊高度同載重上限自動套用。')],
          [T('Checks fire while you build', '邊砌邊檢查'), T('Overhang past the deck, stack weight over the rating, crush on lower cartons, this-way-up flags — flagged live, not after the wrap.', '超出板面嘅懸出、超載重、壓壞底層、直放標示 — 即時標出,唔使等打完膜先知。')],
          [T('Export the build', '匯出砌板方案'), T('PDF with the 3D build + packing list, so the floor stacks it the way it was planned.', 'PDF 連 3D 圖同裝箱清單,倉面照住砌。')],
        ].map(([title, body], i) => (
          <div key={i} className="rounded-xl border border-slate-200 p-5">
            <p className="font-bold text-slate-900 mb-1 flex items-center gap-2">
              <CheckCircle size={16} className="text-blue-500 flex-shrink-0" /> {title}
            </p>
            <p className="text-sm text-slate-600">{body}</p>
          </div>
        ))}
      </div>

      <section className="max-w-3xl">
        <h2 className="text-2xl font-black text-slate-900 mb-3">{T('Builder or calculator?', '砌板定計數?')}</h2>
        <p className="text-slate-600 text-sm mb-4">
          {T('Quoting an order? The pallet calculator gives cases per pallet and pallets needed in seconds. Loading the freight? The builder shows the actual arrangement. Same math underneath — the counts always agree.',
             '報價用卡板計算器,幾秒得出每板箱數同所需板數;執貨就用砌板工具,睇實際擺法。底層同一套數學 — 兩邊數字永遠一致。')}
        </p>
        <div className="text-sm text-slate-500">
          <Link to="/pallet-calculator" className="text-blue-600 hover:underline">{T('Pallet calculator', '卡板計算器')}</Link>
          {' · '}
          <Link to="/ti-hi-calculator" className="text-blue-600 hover:underline">{T('TI HI calculator', 'TI HI 計算機')}</Link>
          {' · '}
          <Link to="/pallets-per-container" className="text-blue-600 hover:underline">{T('Pallets per container', '每櫃卡板數')}</Link>
          {' · '}
          <Link to="/freight-class-calculator" className="text-blue-600 hover:underline">{T('Freight class calculator', '運費等級計算機')}</Link>
        </div>
      </section>
    </div>
  );
}
