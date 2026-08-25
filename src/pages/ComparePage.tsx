import { useParams, Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Check, Minus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import competitorsData from '../data/competitors.json';
import { track } from '../lib/track';

/**
 * /compare/:slug — honest alternative pages ("EasyCargo alternative", ...).
 * Rules: every claim about a competitor must be verifiable from their public
 * pages or clearly attributed ("third-party listings report..."); we say
 * plainly what THEY do better. Honesty is what makes these pages rank AND
 * convert — and what keeps them safe.
 */

interface Competitor {
  slug: string;
  name: string;
  url: string;
  summaryEn: string; summaryZh: string;
  theyHaveEn: string[]; theyHaveZh: string[];
  pricingEn: string; pricingZh: string;
}

const COMPETITORS: Competitor[] = (competitorsData as { competitors: Competitor[] }).competitors;

const WE_HAVE_EN = [
  'Real 3D bin-packing with weight & stacking limits — free',
  'Drag-edit any carton in 3D (snap, collision-blocked)',
  'PDF load plan + CSV packing list export',
  'Excel/CSV/paste import of your carton list',
  'Share links, saved plans, approval flow with audit trail',
  'Runs in the browser — nothing to install, no seats to count',
  'Computation stays on your device (plans upload only when you share/save)',
];
const WE_HAVE_ZH = [
  '真實 3D 裝箱算法連重量與堆疊限制 — 免費',
  '3D 拖放編輯任何紙箱(貼格、防重疊)',
  'PDF 裝載方案 + CSV 裝箱單導出',
  'Excel/CSV/貼上 導入你嘅箱單',
  '分享連結、保存方案、批核流程連 audit trail',
  '瀏覽器即用 — 唔使安裝、唔使數席位',
  '計算留喺你部機(只有分享/保存先上傳)',
];

export default function ComparePage() {
  const { slug } = useParams<{ slug: string }>();
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);
  const c = COMPETITORS.find((x) => x.slug === slug);
  if (!c) return <Navigate to="/" replace />;

  const title = T(`Free ${c.name} alternative: DimPack3D`, `${c.name} 嘅免費替代:DimPack3D`);
  const summary = T(c.summaryEn, c.summaryZh);
  const theyHave = lang === 'zh' ? c.theyHaveZh : c.theyHaveEn;
  const weHave = lang === 'zh' ? WE_HAVE_ZH : WE_HAVE_EN;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Helmet>
        <title>{title} | DimPack3D</title>
        <meta name="description" content={T(
          `Looking for a ${c.name} alternative? DimPack3D covers the core load-planning workflow — 3D bin-packing, drag editing, PDF export — free in the browser. Honest comparison inside.`,
          `搵緊 ${c.name} 替代?DimPack3D 免費喺瀏覽器完成核心裝載規劃流程 — 3D 裝箱、拖放編輯、PDF 導出。內附誠實對比。`,
        )} />
      </Helmet>

      <h1 className="text-3xl font-black text-slate-900 mb-4">{title}</h1>
      <p className="text-slate-600 mb-2">{summary}</p>
      <p className="text-slate-600 mb-8">{T(
        `DimPack3D covers the core workflow ${c.name} charges for — automatic 3D bin-packing, hand fine-tuning, and professional load-plan export — free, in the browser. Below is an honest comparison, including what ${c.name} does better.`,
        `DimPack3D 免費喺瀏覽器提供 ${c.name} 收費嘅核心流程 — 自動 3D 裝箱、手動微調、專業裝載方案導出。下面係誠實對比,包括 ${c.name} 做得更好嘅地方。`,
      )}</p>

      <div className="grid md:grid-cols-2 gap-5 mb-8">
        <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/40 p-5">
          <h2 className="font-black text-slate-900 mb-3">DimPack3D <span className="text-emerald-600 text-sm font-bold">({T('free', '免費')})</span></h2>
          <ul className="space-y-2">
            {weHave.map((f, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700"><Check size={16} className="text-emerald-600 shrink-0 mt-0.5" />{f}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 p-5">
          <h2 className="font-black text-slate-900 mb-3">{c.name}</h2>
          <ul className="space-y-2">
            {theyHave.map((f, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700"><Minus size={16} className="text-slate-400 shrink-0 mt-0.5" />{f}</li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
            <b>{T('Pricing', '價錢')}:</b> {T(c.pricingEn, c.pricingZh)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 mb-8 text-sm text-slate-700 space-y-2">
        <p><b>{T(`Choose ${c.name} if`, `揀 ${c.name} 如果`)}:</b> {T(
          'you need the capabilities listed on their side above (they are real strengths), and the per-seat cost is justified by daily specialist use.',
          '你需要上面佢哋嗰欄列出嘅能力(嗰啲係真優勢),而且每日專業使用justify到席位成本。',
        )}</p>
        <p><b>{T('Choose DimPack3D if', '揀 DimPack3D 如果')}:</b> {T(
          'you want the core container workflow — optimize, fine-tune, export, share, approve — without licenses, installs or training. Import your existing Excel and see your load in 3D in under a minute.',
          '你想要核心貨櫃流程 — 優化、微調、導出、分享、批核 — 而唔使 license、安裝或培訓。掉個現有 Excel 入嚟,一分鐘內見到自己啲貨喺 3D 櫃入面。',
        )}</p>
      </div>

      {/* ============ CONVERSION PATH ============
          These pages have the site's best CTR (12.3-12.7% at pos ~10) and, until
          now, one generic /planner CTA and ZERO tracking — so there was no way to
          tell whether any of that traffic did anything. Someone here is actively
          evaluating a replacement for a $350-$5,000/yr tool: they already have a
          carton list in the other product, and they need to know this is not a
          toy before they switch. So: land them on the import step (matching the
          promise made above), and put the three switching questions in reach. */}
      <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/40 p-6 mb-6">
        <h2 className="font-black text-slate-900 mb-1.5">
          {T(`Try it with your own ${c.name} data`, `用你自己喺 ${c.name} 嘅資料試`)}
        </h2>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          {T(
            'Paste or upload the carton list you already have — Excel, CSV, or straight from the clipboard — and see the same shipment packed in 3D. Nothing to install, no signup, and the numbers are computed in your browser.',
            '將你已經有嘅箱單貼上或上載 — Excel、CSV,或者直接由剪貼簿 — 即刻見到同一批貨喺 3D 入面點裝。唔使安裝、唔使註冊,啲數字喺你部機直接計。',
          )}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/planner?import=1"
            onClick={() => track('compare_cta_import', c.slug)}
            className="group inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all"
          >
            {T('Bring your carton list — free', '掉個箱單入嚟 — 免費')}
            <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/planner"
            onClick={() => track('compare_cta_demo', c.slug)}
            className="inline-flex items-center gap-2 text-blue-700 font-semibold text-sm hover:underline"
          >
            {T('or open a worked example', '或者開個現成例子')}
          </Link>
        </div>
      </div>

      {/* The three questions someone replacing a paid tool actually asks. Each
          links to evidence that already exists rather than to a claim. */}
      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        <Link
          to="/api-docs"
          onClick={() => track('compare_proof', `${c.slug}:benchmark`)}
          className="rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 p-4 transition-colors"
        >
          <div className="font-bold text-slate-900 text-sm mb-1">{T('Is the packing any good?', '個裝箱演算法夠唔夠好?')}</div>
          <p className="text-xs text-slate-500 leading-relaxed">
            {T('80.2% average fill across 300 Bischoff–Ratcliff OR-Library instances, with ≥60% base support enforced on every box. Published heuristics report 83–95% under varying — often weaker — stability rules.', '喺 Bischoff–Ratcliff OR-Library 300 個標準測試上平均填充率 80.2%,而且每箱都強制 ≥60% 底部支撐。已發表嘅啟發式演算法報 83–95%,但穩定性規則各有不同,通常較寬鬆。')}
          </p>
        </Link>
        <Link
          to="/plans"
          onClick={() => track('compare_proof', `${c.slug}:team`)}
          className="rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 p-4 transition-colors"
        >
          <div className="font-bold text-slate-900 text-sm mb-1">{T('What about my team?', '團隊點用?')}</div>
          <p className="text-xs text-slate-500 leading-relaxed">
            {T('Saved plans, share links, and an approval flow with an audit trail — without counting seats.', '儲存方案、分享連結、連審批流程同紀錄 — 唔使計席位。')}
          </p>
        </Link>
        <Link
          to="/reality-checks"
          onClick={() => track('compare_proof', `${c.slug}:checks`)}
          className="rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 p-4 transition-colors"
        >
          <div className="font-bold text-slate-900 text-sm mb-1">{T('Will it catch real problems?', '真係捉到問題?')}</div>
          <p className="text-xs text-slate-500 leading-relaxed">
            {T('Door aperture, axle loads, crush limits, overhang and load voids — checked before the truck leaves.', '櫃門闊度、車軸重量、抗壓、懸出同空隙 — 車開出之前就檢查。')}
          </p>
        </Link>
      </div>
      <p className="text-[11px] text-slate-400 mt-6">
        {T(
          `${c.name} is a trademark of its owner; facts above are from public pages or attributed third-party listings as of July 2026. Corrections: hello@dimpack3d.com.`,
          `${c.name} 商標屬其擁有者;以上資料截至 2026 年 7 月來自公開頁面或已註明嘅第三方目錄。指正:hello@dimpack3d.com。`,
        )}
      </p>
    </div>
  );
}
