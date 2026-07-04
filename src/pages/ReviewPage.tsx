import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CheckCircle2, XCircle, Clock, ShieldCheck } from 'lucide-react';
import InteractiveLoadPlanner from '../components/InteractiveLoadPlanner';
import { useAuth } from '../hooks/useAuth';
import { getPlanForReview, reviewAction, type SavedPlan, type PlanEvent } from '../lib/plans';
import { track } from '../lib/track';

/**
 * /review/:id?t=<token> — the approval surface (ENTERPRISE.md Tier 1).
 * Anyone with the link can VIEW the plan and its audit trail; acting
 * (approve / request changes) requires sign-in so the identity lands in the
 * trail. This is what turns a calculator into an org workflow.
 */

const STATUS_UI: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600', icon: Clock },
  pending_review: { label: 'Pending review', cls: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  changes_requested: { label: 'Changes requested', cls: 'bg-red-100 text-red-600', icon: XCircle },
};

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';
  const auth = useAuth();

  const [plan, setPlan] = useState<(SavedPlan & { events: PlanEvent[] }) | null | 'loading' | 'invalid'>('loading');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const load = async () => {
    if (!id || !token) { setPlan('invalid'); return; }
    const p = await getPlanForReview(id, token);
    setPlan(p ?? 'invalid');
    if (p) track('review_open');
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id, token]);

  const act = async (action: 'approved' | 'changes_requested') => {
    if (!id) return;
    setBusy(true);
    const err = await reviewAction(id, token, action, note);
    setBusy(false);
    if (!err) { setNote(''); track('review_action', action); await load(); }
  };

  const signIn = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    const { error } = await auth.signInWithEmail(email.trim());
    if (!error) setSent(true);
  };

  if (plan === 'loading') return <div className="max-w-4xl mx-auto px-4 py-16 text-slate-400">Loading…</div>;
  if (plan === 'invalid' || !plan) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-xl font-bold text-slate-800 mb-2">Invalid review link</h1>
        <p className="text-slate-500 text-sm">Ask the plan owner to send a fresh link.</p>
      </div>
    );
  }

  const st = STATUS_UI[plan.status] ?? STATUS_UI.draft;
  const StIcon = st.icon;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Helmet>
        <title>Review: {plan.name} | DimPack3D</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{plan.name}</h1>
          <p className="text-sm text-slate-500">
            {plan.container_key.toUpperCase()} · {Number(plan.stats?.volumeUtil ?? 0).toFixed(1)}% utilization · {plan.boxes.length} cartons
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${st.cls}`}>
          <StIcon size={15} /> {st.label}
        </span>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* read-only 3D view */}
        <div>
          <InteractiveLoadPlanner
            container={plan.container}
            boxes={plan.boxes}
            grid={1}
            unitLabel="cm"
            showDoor
            autoSpin
          />
          <p className="text-xs text-slate-400 mt-2">View only — edits here are not saved to the plan.</p>
        </div>

        {/* actions + audit trail */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 p-4">
            <h2 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-blue-600" /> Review decision
            </h2>
            {auth.userId ? (
              <>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note (recorded in the audit trail)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 mb-2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => act('approved')}
                    disabled={busy}
                    className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => act('changes_requested')}
                    disabled={busy}
                    className="flex-1 py-2 rounded-lg bg-white border border-red-300 text-red-600 text-sm font-bold hover:bg-red-50 disabled:opacity-50"
                  >
                    Request changes
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Acting as {auth.email} — recorded in the trail.</p>
              </>
            ) : sent ? (
              <p className="text-sm text-emerald-700">Check your email for the sign-in link, then return here.</p>
            ) : (
              <>
                <p className="text-xs text-slate-500 mb-2">Sign in so your decision is recorded under your name:</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && signIn()}
                    placeholder="you@company.com"
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
                  />
                  <button onClick={signIn} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold">Send link</button>
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <h2 className="font-bold text-slate-900 text-sm mb-3">Audit trail</h2>
            <ol className="space-y-2.5">
              {plan.events.map((e, i) => (
                <li key={i} className="text-xs">
                  <span className={`font-bold ${
                    e.action === 'approved' ? 'text-emerald-700' : e.action === 'changes_requested' ? 'text-red-600' : 'text-slate-700'
                  }`}>{e.action.replace('_', ' ')}</span>
                  <span className="text-slate-500"> — {e.actor_email ?? 'unknown'}</span>
                  <span className="text-slate-400"> · {new Date(e.at).toLocaleString()}</span>
                  {e.note && <p className="text-slate-600 mt-0.5 pl-2 border-l-2 border-slate-200">{e.note}</p>}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
