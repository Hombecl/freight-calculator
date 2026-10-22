import { useEffect, useState } from 'react';
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

export default function MyPlansPage() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);
  const auth = useAuth();
  const [plans, setPlans] = useState<SavedPlan[] | null>(null);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [message,setMessage]=useState('');
  const [sending,setSending]=useState(false);

  useEffect(() => {
    if (auth.userId) listPlans().then(setPlans).catch(()=>setMessage(T('Could not load saved plans. Please reload to retry.','未能載入方案，請重新載入。')));
    else setPlans(null);
  }, [auth.userId]);

  const remove = async (id: string) => {
    if (!window.confirm(T('Delete this plan?', '刪除呢個方案?'))) return;
    try { if (await deletePlan(id)) setPlans((p) => (p ? p.filter((x) => x.id !== id) : p)); else setMessage(T('Delete failed. Please retry.','刪除失敗，請重試。')); } catch {setMessage(T('Connection interrupted. Please retry.','連線中斷，請重試。'));}
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const requestReview = async (id: string) => {
    try {
    const { token, error } = await submitForReview(id);
    if (error || !token) {setMessage(T('Could not create review link. Please retry.','未能建立批核連結，請重試。'));return;}
    const url = `${window.location.origin}/review/${id}?t=${token}`;
    await navigator.clipboard.writeText(url);
    track('review_submit');
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
    setPlans((p) => (p ? p.map((x) => (x.id === id ? { ...x, status: 'pending_review' } : x)) : p));
    } catch {setMessage(T('Could not copy review link. Check clipboard permission and retry.','未能複製批核連結，請檢查剪貼簿權限再試。'));}
  };

  const signIn = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if(sending)return; setSending(true); setMessage('');
    try { const { error } = await auth.signInWithEmail(email.trim());
    if (!error) { setSent(true); track('signin_request'); } else setMessage(T('Could not send sign-in link. Please try again shortly.','未能發送登入連結，請稍後再試。'));
    } catch { setMessage(T('Connection interrupted. Please try again.','連線中斷，請重試。')); } finally {setSending(false);}
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Helmet>
        <title>{T('My Plans', '我的方案')} | DimPack3D</title>
        <meta name="description" content={T('Your private saved packing plans and team workspace.','你嘅私人裝載方案及團隊工作區。')} />
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

      {message && <p role="alert" className="mb-4 text-amber-800">{message}</p>}
      {!auth.enabled ? (
        <p className="text-slate-500">{T('Accounts are not configured on this deployment.', '呢個部署未配置帳戶功能。')}</p>
      ) : !auth.userId ? (
        <div className="rounded-2xl border border-slate-200 p-8 max-w-md">
          <h2 className="font-bold text-slate-900 mb-2">{T('Create an account / sign in', '建立帳戶／登入')}</h2>
          <p className="text-sm text-slate-500 mb-4">{T('Email link — no password. New users get an account automatically. Keep named jobs and reusable cargo templates here.', '電郵連結登入，毋須密碼。新用戶會自動建立帳戶，可保存命名工作及常用貨單模板。')}</p>
          {sent ? (
            <p className="text-emerald-700 font-medium text-sm">{T('Check your email for the sign-in link.', '請查收 email 登入連結。')}</p>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                aria-label={T("Email address","電郵地址")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && signIn()}
                placeholder="you@company.com"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
              />
              <button disabled={sending} onClick={signIn} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold">
                {sending ? T('Sending…','發送中…') : T('Send link', '發送連結')}
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-blue-50 p-5 mb-6"><Link className="font-bold text-blue-700" to="/workspace">{T('Open team workspace', '開啟團隊工作區')}</Link><p>{T('Shared cargo, receiver requirements and versioned orders across devices.', '跨裝置共用貨品、收貨要求及有版本記錄嘅訂單。')}</p><p className="text-sm mt-2">{T(`${plans?.length ?? 0} saved plans. Planning records do not prove shipped loads or freight savings.`, `已存 ${plans?.length ?? 0} 個方案。規劃記錄並不代表已出貨或實際節省運費。`)}</p></div>
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
                <li key={p.id} className="flex flex-wrap gap-3 items-center justify-between rounded-xl border border-slate-200 px-5 py-4 hover:border-blue-300 transition-colors">
                  <div>
                    <p className="font-bold text-slate-900 flex items-center gap-2">
                      {p.name} {p.stats?.kind==='template' && <span className="text-xs text-blue-700">{T('Template','模板')}</span>}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(STATUS_CHIP[p.status] ?? STATUS_CHIP.draft).cls}`}>
                        {(STATUS_CHIP[p.status] ?? STATUS_CHIP.draft).label}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {p.container_key.toUpperCase()} · {p.container_key === 'pallet-order' ? `${p.stats.palletCount} pallets` : `${Number(p.stats?.volumeUtil ?? 0).toFixed(1)}%`} · {p.container_key === 'pallet-order' ? Number(p.stats.placedCount) : p.boxes?.length ?? 0} {T('cartons', '箱')} · {new Date(p.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {p.container_key !== 'pallet-order' && <button
                      onClick={() => requestReview(p.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-colors ${
                        copiedId === p.id ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                      title={T('Copy a review link for an approver', '複製批核連結')}
                    >
                      {copiedId === p.id ? (<><Check size={14} /> {T('Link copied', '已複製')}</>) : (<><UserCheck size={14} /> {T('Review', '批核')}</>)}
                    </button>}
                    {['20gp','40gp','40hq'].includes(p.container_key) || (p.container_key !== 'warehouse' && p.container_key !== 'pallet-order') ? <Link className="rounded border border-blue-200 px-3 py-1.5 text-sm text-blue-700" to={`/planner?saved=${p.id}&template=1`}>{T('Use as template','用作模板')}</Link> : null}
                    <Link
                      to={p.container_key === 'pallet-order' ? `/pallet-height-calculator?saved=${p.id}` : p.container_key === 'warehouse' ? `/warehouse?saved=${p.id}` : `/planner?saved=${p.id}`}
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
