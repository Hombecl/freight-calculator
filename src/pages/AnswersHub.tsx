import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CONTAINERS, CARTONS, gridFit, containerPageSlug, comboPageSlug, cartonSlug } from '../lib/answers';

/** /answers — hub linking every programmatic answer page. */
export default function AnswersHub() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Helmet>
        <title>{T('Container Loading Answers — cartons per container | DimPack3D', '貨櫃裝載快速答案 — 每櫃裝幾多箱 | DimPack3D')}</title>
        <meta name="description" content={T(
          'Exact answers: how many cartons fit in a 20ft, 40ft or 40ft high-cube container, for common carton sizes — with layouts and utilization.',
          '精確答案:20 呎、40 呎、40 呎高櫃各裝到幾多個常見尺寸紙箱 — 連排列同利用率。',
        )} />
      </Helmet>

      <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
        {T('Container loading — quick answers', '貨櫃裝載快速答案')}
      </h1>
      <p className="text-slate-600 mb-10">
        {T('Computed with the same engine as the 3D planner. Click any question for the full breakdown.', '同 3D 規劃器同一引擎計算。撳任何問題睇完整拆解。')}
      </p>

      {CONTAINERS.map((ct) => (
        <div key={ct.key} className="mb-10">
          <h2 className="font-bold text-lg text-slate-900 mb-3">
            <Link to={`/answers/${containerPageSlug(ct)}`} className="hover:text-blue-700">
              {T(`How many cartons fit in a ${ct.labelEn}?`, `一個${ct.labelZh}裝到幾多個紙箱?`)} →
            </Link>
          </h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {CARTONS.map((c) => {
              const f = gridFit(c, ct);
              return (
                <li key={cartonSlug(c)}>
                  <Link
                    to={`/answers/${comboPageSlug(c, ct)}`}
                    className="group flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-sm hover:border-blue-300 transition-colors"
                  >
                    <span className="text-slate-700">{c.l}×{c.w}×{c.h} cm</span>
                    <span className="flex items-center gap-2 font-bold text-slate-900">
                      {f.count.toLocaleString()} <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-500" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
