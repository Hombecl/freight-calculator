import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GROUPS, CARTONS, gridFit, vesselPageSlug, comboPageSlug, cartonSlug } from '../lib/answers';

/** /answers — hub linking every programmatic answer page (containers, pallets, trucks). */
export default function AnswersHub() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);

  const GROUP_TITLES: Record<string, string> = {
    container: T('Shipping containers', '海運貨櫃'),
    pallet: T('Pallets', '卡板'),
    truck: T('Trucks & trailers', '貨車與掛車'),
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Helmet>
        <title>{T('Loading Answers — cartons per container, pallet & truck | DimPack3D', '裝載快速答案 — 貨櫃/卡板/貨車裝幾多箱 | DimPack3D')}</title>
        <meta name="description" content={T(
          'Exact answers: how many cartons fit in a 20ft/40ft container, on a EUR or GMA pallet, or in a 53ft trailer — with layouts and utilization.',
          '精確答案:20/40 呎貨櫃、歐標/美式卡板、53 呎掛車各裝到幾多箱 — 連排列同利用率。',
        )} />
      </Helmet>

      <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
        {T('Loading — quick answers', '裝載快速答案')}
      </h1>
      <p className="text-slate-600 mb-10">
        {T('Computed with the same engine as the 3D planner. Click any question for the full breakdown.', '同 3D 規劃器同一引擎計算。撳任何問題睇完整拆解。')}
      </p>

      {GROUPS.map((g) => (
        <div key={g.kind} className="mb-12">
          <h2 className="text-lg font-black text-slate-400 uppercase tracking-wider mb-5">{GROUP_TITLES[g.kind]}</h2>
          {g.vessels.map((v) => (
            <div key={v.key} className="mb-8">
              <h3 className="font-bold text-slate-900 mb-3">
                <Link to={`/answers/${vesselPageSlug(v)}`} className="hover:text-blue-700">
                  {T(
                    `How many cartons fit ${v.kind === 'pallet' ? 'on' : 'in'} a ${v.labelEn}?`,
                    `一個${v.labelZh}${v.kind === 'pallet' ? '疊到' : '裝到'}幾多個紙箱?`,
                  )} →
                </Link>
              </h3>
              <ul className="grid sm:grid-cols-3 gap-2">
                {CARTONS.map((c) => {
                  const f = gridFit(c, v);
                  return (
                    <li key={cartonSlug(c)}>
                      <Link
                        to={`/answers/${comboPageSlug(c, v)}`}
                        className="group flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-blue-300 transition-colors"
                      >
                        <span className="text-slate-700">{c.l}×{c.w}×{c.h}</span>
                        <span className="flex items-center gap-1.5 font-bold text-slate-900">
                          {f.count.toLocaleString()} <ArrowRight size={13} className="text-slate-300 group-hover:text-blue-500" />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
