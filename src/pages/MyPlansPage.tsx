import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Trash2, FolderOpen, LogOut, UserCheck, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../hooks/useAuth';
import { listPlans, deletePlan, submitForReview, type SavedPlan } from '../lib/plans';
import { track } from '../lib/track';

const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-500' },
  pending_review: { label: 'Pending review', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-700' },
  changes_requested: { label: 'Changes requested', cls: 'bg-red-100 text-red-600' },
};

/**
 * /plans — the workspace: saved plans + the ROI summary (ENTERPRISE.md §3).
 * The ROI numbers state their assumptions inline; honest math only.
 */

const BASELINE_UTIL = 70; // industry-typical unoptimized utilization, stated in the UI
const DEFAULT_CONTAINER_COST = 3000; // USD, stated in the UI

export default function MyPlansPage() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);
  const auth = useAuth();
  const [plans, setPlans] = useState<SavedPlan[] | null>(null);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (auth.userId) listPlans().then(setPlans);
  }, [auth.userId]);

  const roi = useMemo(() => {
    if (!plans || plans.length === 0) return null;
    const utils = plans.map((p) => Number(p.stats?.volumeUtil ?? 0)).filter((u) => u > 0);
    if (!utils.length) return null;
    const avg = utils.reduce((s, u) => s + u, 0) / utils.length;
    const upliftPct = Math.max(0, avg - BASELINE_UTIL);
    // space reclaimed vs baseline ≈ containers you didn't have to book
    const saved = plans.length * (upliftPct / 100) * DEFAULT_CONTAINER_COST;
    return { count: plans.length, avg, upliftPct, saved };
  }, [plans]);

  const remove = async (id: string) => {
    if (!window.confirm(T('Delete this plan?', '刪除呢個方案?'))) return;
    if (await deletePlan(id)) setPlans((p) => (p ? p.filter((x) => x.id !== id) : p));
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const requestReview = async (id: string) => {
    const { token, error } = await submitForReview(id);
    if (error || !token) return;
    const url = `${window.location.origin}/review/${id}?t=${token}`;
    await navigator.clipboard.writeText(url);
    track('review_submit');
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
    setPlans((p) => (p ? p.map((x) => (x.id === id ? { ...x, status: 'pending_review' } : x)) : p));
  };

  const signIn = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    const { error } = await auth.signInWithEmail(email.trim());
    if (!error) { setSent(true); track('signin_request'); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Helmet>
        <title>{T('My Plans', '我的方案')} | DimPack3D</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-slate-900">{T('My Plans', '我的方案')}</h1>
        {auth.userId && (
          <button onClick={auth.signOut} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
            <LogOut size={15} /> {auth.email}
          </button>
        )}
      </div>

      {!auth.enabled ? (
        <p className="text-slate-500">{T('Accounts are not configured on this deployment.', '呢個部署未配置帳戶功能。')}</p>
      ) : !auth.userId ? (
        <div className="rounded-2xl border border-slate-200 p-8 max-w-md">
          <h2 className="font-bold text-slate-900 mb-2">{T('Sign in to keep your plans', '登入以保存方案')}</h2>
          <p className="text-sm text-slate-500 mb-4">{T('Magic link — no password. Your saved plans and utilization history live here.', 'Magic link 登入,毋須密碼。你保存嘅方案同利用率記錄都喺呢度。')}</p>
          {sent ? (
            <p className="text-emerald-700 font-medium text-sm">{T('Check your email for the sign-in link.', '請查收 email 登入連結。')}</p>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && signIn()}
                placeholder="you@company.com"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
              />
              <button onClick={signIn} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold">
                {T('Send link', '發送連結')}
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ROI summary — the six-figure slide, with assumptions stated */}
          {roi && (
            <div className="rounded-2xl bg-slate-950 text-white p-6 mb-8">
              <div className="grid sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-3xl font-black">{roi.count}</p>
                  <p className="text-sm text-slate-400">{T('containers planned', '已規劃貨櫃')}</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-emerald-400">{roi.avg.toFixed(1)}%</p>
                  <p className="text-sm text-slate-400">{T(`avg utilization (baseline ${BASELINE_UTIL}%)`, `平均利用率(基線 ${BASELINE_UTIL}%)`)}</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-emerald-400">≈ ${roi.saved.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-sm text-slate-400">{T('est. freight saved', '估算節省運費')}</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-4">
                {T(
                  `Estimate: (avg utilization − ${BASELINE_UTIL}% baseline) × plans × $${DEFAULT_CONTAINER_COST.toLocaleString()}/container. Adjust for your real freight rates.`,
                  `估算方式:(平均利用率 − ${BASELINE_UTIL}% 基線)× 方案數 × 每櫃 $${DEFAULT_CONTAINER_COST.toLocaleString()}。請按實際運費調整。`,
                )}
              </p>
            </div>
          )}

          {plans === null ? (
            <p className="text-slate-400">{T('Loading…', '載入中…')}</p>
          ) : plans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
              <p className="text-slate-600 mb-4">{T('No saved plans yet.', '仲未有保存嘅方案。')}</p>
              <Link to="/planner" className="inline-flex items-center gap-2 text-blue-700 font-bold">
                {T('Plan your first container', '規劃你第一個貨櫃')} <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {plans.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-5 py-4 hover:border-blue-300 transition-colors">
                  <div>
                    <p className="font-bold text-slate-900 flex items-center gap-2">
                      {p.name}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(STATUS_CHIP[p.status] ?? STATUS_CHIP.draft).cls}`}>
                        {(STATUS_CHIP[p.status] ?? STATUS_CHIP.draft).label}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {p.container_key.toUpperCase()} · {Number(p.stats?.volumeUtil ?? 0).toFixed(1)}% · {p.boxes?.length ?? 0} {T('cartons', '箱')} · {new Date(p.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => requestReview(p.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-colors ${
                        copiedId === p.id ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                      title={T('Copy a review link for an approver', '複製批核連結')}
                    >
                      {copiedId === p.id ? (<><Check size={14} /> {T('Link copied', '已複製')}</>) : (<><UserCheck size={14} /> {T('Review', '批核')}</>)}
                    </button>
                    <Link
                      to={p.container_key === 'warehouse' ? `/warehouse?saved=${p.id}` : `/planner?saved=${p.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold"
                    >
                      <FolderOpen size={14} /> {T('Open', '打開')}
                    </Link>
                    <button onClick={() => remove(p.id)} className="p-2 text-slate-300 hover:text-red-500" title={T('Delete', '刪除')}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
