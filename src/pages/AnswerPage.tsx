import { useParams, Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Check, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  GROUPS, CARTONS, gridFit, resolveSlug,
  comboPageSlug, cartonSlug,
  type AnswerVessel, type CartonSize,
} from '../lib/answers';

/**
 * AnswerPage — programmatic long-tail answers under /answers/:slug for
 * containers, pallets and trucks. Two shapes: vessel hub ("how many cartons
 * fit in/on X?") and combo ("how many LxWxH cartons fit in/on X?"). Every
 * page computes its answer live (orientation-grid method, stated openly) and
 * displays the vessel's assumptions.
 */

const dimsTxt = (c: CartonSize) => `${c.l}×${c.w}×${c.h}`;
const groupOf = (v: AnswerVessel) => GROUPS.find((g) => g.kind === v.kind)!.vessels;

function usePrep(v: AnswerVessel) {
  const { lang } = useApp();
  return {
    en: v.kind === 'pallet' ? 'on' : 'in',
    zhVerb: v.kind === 'pallet' ? '疊到' : '裝到',
    label: lang === 'zh' ? v.labelZh : v.labelEn,
  };
}

function AssumptionNote({ v }: { v: AnswerVessel }) {
  const { lang } = useApp();
  const note = lang === 'zh' ? v.noteZh : v.noteEn;
  if (!note) return null;
  return (
    <p className="flex gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-3 mb-8">
      <Info size={14} className="shrink-0 mt-0.5 text-slate-400" /> {note}
    </p>
  );
}

function PlannerCta({ label }: { label: string }) {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);
  return (
    <div className="rounded-2xl bg-slate-950 text-white p-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="font-bold">{T('Mixed carton sizes? Weight limits? Fragile items?', '混裝尺寸?重量限制?易碎品?')}</p>
        <p className="text-sm text-slate-400">{T(`Plan a real ${label} load in interactive 3D and export a PDF plan — free.`, `用互動 3D 規劃真實${label}裝載,免費導出 PDF 方案。`)}</p>
      </div>
      <Link to="/planner" className="group inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white px-5 py-2.5 rounded-xl font-bold transition-all">
        {T('Open the 3D Load Planner', '打開 3D 裝載規劃器')}
        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  );
}

function ComboContent({ vessel, carton }: { vessel: AnswerVessel; carton: CartonSize }) {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);
  const { en: prep, zhVerb, label } = usePrep(vessel);
  const fit = gridFit(carton, vessel);
  const siblings = groupOf(vessel);

  const question = T(
    `How many ${dimsTxt(carton)} cm cartons fit ${prep} a ${vessel.labelEn}?`,
    `一個${vessel.labelZh}${zhVerb}幾多個 ${dimsTxt(carton)} cm 紙箱?`,
  );
  const answer = T(
    `${fit.count.toLocaleString()} cartons of ${dimsTxt(carton)} cm fit ${prep} a ${vessel.labelEn} (${vessel.l}×${vessel.w}×${vessel.h} cm usable), stacked ${fit.perRow.x} along the length × ${fit.perRow.z} across × ${fit.perRow.y} high in the best orientation (${dimsTxt(fit.orientation)} cm), using ${fit.utilization.toFixed(1)}% of the volume.`,
    `一個${vessel.labelZh}(可用空間 ${vessel.l}×${vessel.w}×${vessel.h} cm)可${zhVerb} ${fit.count.toLocaleString()} 個 ${dimsTxt(carton)} cm 紙箱 — 最佳擺向 ${dimsTxt(fit.orientation)} cm,長向 ${fit.perRow.x} 行 × 闊向 ${fit.perRow.z} 列 × 疊高 ${fit.perRow.y} 層,體積利用率 ${fit.utilization.toFixed(1)}%。`,
  );

  return (
    <>
      <Helmet>
        <title>{question} | DimPack3D</title>
        <meta name="description" content={answer.slice(0, 158)} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [{
            '@type': 'Question',
            name: `How many ${dimsTxt(carton)} cm cartons fit ${prep} a ${vessel.labelEn}?`,
            acceptedAnswer: { '@type': 'Answer', text: answer },
          }],
        })}</script>
      </Helmet>

      <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-4">{question}</h1>
      <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 mb-6">
        <p className="text-3xl font-black text-emerald-700 mb-2">
          {fit.count.toLocaleString()} {T('cartons', '個紙箱')}
        </p>
        <p className="text-slate-700 text-sm leading-relaxed">{answer}</p>
      </div>

      <AssumptionNote v={vessel} />

      <h2 className="font-bold text-slate-900 mb-2">{T('Method & caveats', '計算方法與注意')}</h2>
      <ul className="space-y-2 text-sm text-slate-600 mb-8">
        <li className="flex gap-2"><Check size={16} className="text-emerald-600 shrink-0 mt-0.5" />{T('Orientation-grid method: identical cartons, best of 6 orientations, no rotation mixing — the standard estimate for uniform cartons.', '方向網格法:相同紙箱、6 個擺向取最優、不混向 — 均一紙箱嘅標準估算。')}</li>
        <li className="flex gap-2"><Check size={16} className="text-emerald-600 shrink-0 mt-0.5" />{T(`Watch the weight: limited to ${vessel.maxWeight.toLocaleString()} kg — heavy cartons may hit the weight cap before the space runs out.`, `留意載重:上限 ${vessel.maxWeight.toLocaleString()} kg — 重貨可能未裝滿已到重量上限。`)}</li>
        <li className="flex gap-2"><Check size={16} className="text-emerald-600 shrink-0 mt-0.5" />{T('Mixed carton sizes pack differently — use the interactive 3D planner for real mixed loads.', '混裝唔同尺寸結果唔同 — 混裝請用互動 3D 規劃器。')}</li>
      </ul>

      <h2 className="font-bold text-slate-900 mb-3">{T('Same carton, other options', '同一紙箱,其他選擇')}</h2>
      <div className="overflow-x-auto rounded-xl border border-slate-200 mb-8">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-left text-slate-500"><th className="p-3">{T('Option', '選項')}</th><th className="p-3">{T('Cartons', '箱數')}</th><th className="p-3">{T('Utilization', '利用率')}</th><th className="p-3"></th></tr></thead>
          <tbody>
            {siblings.map((v) => {
              const f = gridFit(carton, v);
              return (
                <tr key={v.key} className="border-t border-slate-100">
                  <td className="p-3 font-semibold text-slate-700">{lang === 'zh' ? v.labelZh : v.labelEn}</td>
                  <td className="p-3 font-bold">{f.count.toLocaleString()}</td>
                  <td className="p-3">{f.utilization.toFixed(1)}%</td>
                  <td className="p-3">
                    {v.key !== vessel.key && (
                      <Link to={`/answers/${comboPageSlug(carton, v)}`} className="text-blue-700 font-medium">{T('Details', '詳情')} →</Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="font-bold text-slate-900 mb-3">{T(`Other carton sizes ${prep} a ${vessel.labelEn}`, `其他紙箱尺寸${zhVerb.slice(0, 1)}入${vessel.labelZh}`)}</h2>
      <div className="overflow-x-auto rounded-xl border border-slate-200 mb-8">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-left text-slate-500"><th className="p-3">{T('Carton (cm)', '紙箱 (cm)')}</th><th className="p-3">{T('Cartons', '箱數')}</th><th className="p-3">{T('Utilization', '利用率')}</th><th className="p-3"></th></tr></thead>
          <tbody>
            {CARTONS.map((c) => {
              const f = gridFit(c, vessel);
              const isThis = cartonSlug(c) === cartonSlug(carton);
              return (
                <tr key={cartonSlug(c)} className={`border-t border-slate-100 ${isThis ? 'bg-blue-50/50' : ''}`}>
                  <td className="p-3 font-semibold text-slate-700">{dimsTxt(c)}</td>
                  <td className="p-3 font-bold">{f.count.toLocaleString()}</td>
                  <td className="p-3">{f.utilization.toFixed(1)}%</td>
                  <td className="p-3">
                    {!isThis && <Link to={`/answers/${comboPageSlug(c, vessel)}`} className="text-blue-700 font-medium">{T('Details', '詳情')} →</Link>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <PlannerCta label={label} />
    </>
  );
}

function VesselContent({ vessel }: { vessel: AnswerVessel }) {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);
  const { en: prep, zhVerb, label } = usePrep(vessel);
  const title = T(
    `How many cartons fit ${prep} a ${vessel.labelEn}?`,
    `一個${vessel.labelZh}${zhVerb}幾多個紙箱?`,
  );
  const best = gridFit(CARTONS[0], vessel);
  const desc = T(
    `A ${vessel.labelEn} offers ${vessel.l}×${vessel.w}×${vessel.h} cm of usable space (${((vessel.l * vessel.w * vessel.h) / 1e6).toFixed(1)} m³) with a ${vessel.maxWeight.toLocaleString()} kg weight limit. For example, it takes ${best.count.toLocaleString()} standard ${dimsTxt(CARTONS[0])} cm cartons. Counts for common carton sizes below.`,
    `${vessel.labelZh}可用空間 ${vessel.l}×${vessel.w}×${vessel.h} cm(${((vessel.l * vessel.w * vessel.h) / 1e6).toFixed(1)} m³),載重上限 ${vessel.maxWeight.toLocaleString()} kg。例如可${zhVerb} ${best.count.toLocaleString()} 個標準 ${dimsTxt(CARTONS[0])} cm 紙箱。常見尺寸見下表。`,
  );

  return (
    <>
      <Helmet>
        <title>{title} | DimPack3D</title>
        <meta name="description" content={desc.slice(0, 158)} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [{
            '@type': 'Question',
            name: `How many cartons fit ${prep} a ${vessel.labelEn}?`,
            acceptedAnswer: { '@type': 'Answer', text: desc },
          }],
        })}</script>
      </Helmet>

      <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-4">{title}</h1>
      <p className="text-slate-600 mb-6">{desc}</p>

      <AssumptionNote v={vessel} />

      <div className="overflow-x-auto rounded-xl border border-slate-200 mb-8">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-left text-slate-500"><th className="p-3">{T('Carton (cm)', '紙箱 (cm)')}</th><th className="p-3">{T('Cartons that fit', '可裝箱數')}</th><th className="p-3">{T('Layout (L×W×H)', '排列 (長×闊×高)')}</th><th className="p-3">{T('Utilization', '利用率')}</th><th className="p-3"></th></tr></thead>
          <tbody>
            {CARTONS.map((c) => {
              const f = gridFit(c, vessel);
              return (
                <tr key={cartonSlug(c)} className="border-t border-slate-100">
                  <td className="p-3 font-semibold text-slate-700">{dimsTxt(c)}</td>
                  <td className="p-3 font-bold">{f.count.toLocaleString()}</td>
                  <td className="p-3 font-mono text-xs">{f.perRow.x}×{f.perRow.z}×{f.perRow.y}</td>
                  <td className="p-3">{f.utilization.toFixed(1)}%</td>
                  <td className="p-3"><Link to={`/answers/${comboPageSlug(c, vessel)}`} className="text-blue-700 font-medium">{T('Details', '詳情')} →</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <PlannerCta label={label} />
    </>
  );
}

export default function AnswerPage() {
  const { slug } = useParams<{ slug: string }>();
  const resolved = slug ? resolveSlug(slug) : null;
  if (!resolved || !resolved.vessel) return <Navigate to="/answers" replace />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {resolved.kind === 'combo'
        ? <ComboContent vessel={resolved.vessel} carton={resolved.carton!} />
        : <VesselContent vessel={resolved.vessel} />}
    </div>
  );
}
