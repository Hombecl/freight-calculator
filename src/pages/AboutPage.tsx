import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function AboutPage() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Helmet>
        <title>{T('About DimPack3D', '關於 DimPack3D')} | DimPack3D</title>
        <meta name="description" content={T(
          'Why DimPack3D exists: professional-grade container load planning should not cost $350-$5,000 a year. Free, in the browser, private by design.',
          '點解有 DimPack3D:專業級貨櫃裝載規劃唔應該每年收 $350-$5,000。免費、瀏覽器即用、設計上保障私隱。',
        )} />
      </Helmet>

      <h1 className="text-3xl font-black text-slate-900 mb-6">{T('About DimPack3D', '關於 DimPack3D')}</h1>

      <div className="prose prose-slate text-slate-700 space-y-4 text-[15px] leading-relaxed">
        <p>{T(
          'DimPack3D started with a simple observation: importers and e-commerce sellers pay for 100% of every container they book, but most loads waste space — and the software that solves this costs US$350 to $5,000+ per year, needs installation, and often training too.',
          'DimPack3D 源於一個簡單觀察:進口商同電商賣家每次訂櫃都係為 100% 空間付錢,但大多數裝載都浪費空間 — 而解決呢個問題嘅軟件每年收 US$350 至 $5,000+,仲要安裝同培訓。',
        )}</p>
        <p>{T(
          'So we built the core workflow — real 3D bin-packing with weight and stacking limits, hand fine-tuning, and PDF/CSV load-plan export — free, running entirely in your browser. There is nothing to install and no account needed to plan.',
          '所以我哋將核心流程 — 真實 3D 裝箱算法(重量與堆疊限制)、手動微調、PDF/CSV 裝載方案導出 — 做到免費,完全喺瀏覽器運行。唔使安裝,規劃唔使開戶。',
        )}</p>
        <p>{T(
          'Privacy is a design decision, not a policy afterthought: all packing computation happens on your device. Your carton lists and load plans are never uploaded unless you explicitly create a share link.',
          '私隱係設計決定,唔係事後政策:所有裝箱計算都喺你部機進行。除非你主動建立分享連結,你嘅箱單同裝載方案永遠唔會上傳。',
        )}</p>
        <p>{T(
          'The toolset today: the Interactive 3D Load Planner, a carton packing calculator, container quick-calc, and an Amazon FBA size & fee checker — in English and Traditional Chinese. Warehouse floor planning is on the roadmap.',
          '目前工具包括:互動 3D 裝載規劃器、產品裝箱計算器、貨櫃快速計算、Amazon FBA 尺寸與費用查詢 — 提供英文同繁體中文。倉庫地面規劃喺 roadmap 上。',
        )}</p>
        <p>
          {T('Questions, partnerships, feedback: ', '查詢、合作、意見:')}
          <a href="mailto:hello@dimpack3d.com" className="text-blue-700 font-medium">hello@dimpack3d.com</a>
        </p>
        <p>
          <Link to="/planner" className="text-blue-700 font-bold">{T('Try the Load Planner →', '試下裝載規劃器 →')}</Link>
        </p>
      </div>
    </div>
  );
}
