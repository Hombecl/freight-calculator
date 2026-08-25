import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Save, Check, ArrowRight } from 'lucide-react';
import { IS_ZH } from '../lib/locale';
import { track } from '../lib/track';
import { savePlan } from '../lib/plans';
import { useAuth } from '../hooks/useAuth';
import { computeStats } from '../lib/binPacking';
import { PALLETS, palletBoxes } from '../lib/pallets';
import type { ChainCarry } from '../lib/palletChainState';

/**
 * SavePalletPlan — the capture step at the end of the pallet chain.
 *
 * ⛔ Design rule (POSITIONING.md §2): the ANSWER is never gated. Copy-link and
 * print stay free and instant. Signing in buys persistence and sharing, not the
 * number. A gate in front of the answer would suppress the very usage the
 * repositioning is trying to grow.
 *
 * ⛔ It saves a REAL plan, not a summary. savePlan() wants container + specs +
 * boxes + stats, and the chain now carries enough carton geometry to lay every
 * carton out — so a saved pallet reopens in the planner, shares, and goes
 * through the existing approval flow. A summary row would have been a dead end.
 * The layout comes from palletBoxes() (block math), NOT packWithConstraints —
 * see the comment in save() for why they disagree.
 *
 * ⛔ It never offers to EMAIL anything: this site has no outbound mail (only
 * Cloudflare inbound routing and a KV lead store), so promising a delivery it
 * cannot make would be collecting addresses under false pretences.
 */

const T = (en: string, zh: string) => (IS_ZH ? zh : en);

export default function SavePalletPlan({ carry, qty }: { carry: ChainCarry; qty?: number }) {
  const auth = useAuth();
  const [state, setState] = useState<'idle' | 'busy' | 'saved' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const pallet = PALLETS.find((p) => p.key === carry.pt) ?? PALLETS[0];
  const ready = Boolean(carry.cl && carry.cw && carry.ch);
  if (!ready) return null;

  const save = async () => {
    setState('busy');
    // ⛔ Lay the boxes out with the SAME block math the calculator and
    // LayerDiagram use — not packWithConstraints. The EP packer is general
    // purpose and places only 30 of a 40-carton EUR block, so saving through it
    // would store a plan that contradicts the number the user just read.
    const container = { l: pallet.l, w: pallet.w, h: pallet.maxH, maxWeight: pallet.maxWt };
    const count = Math.max(1, Math.round(carry.cpp ?? 1));
    const specs = [{
      id: 'c1',
      label: T('Carton', '紙箱'),
      l: carry.cl!, w: carry.cw!, h: carry.ch!,
      weight: carry.cwt ?? 0,
      qty: count,
      color: 0xfbbf24,
    }];
    const boxes = palletBoxes(
      count,
      { l: carry.cl!, w: carry.cw!, h: carry.ch!, weight: carry.cwt ?? 0 },
      { l: pallet.l, w: pallet.w },
    );
    const stats = computeStats(boxes, container);
    const name = `${pallet.label} · ${carry.cl}×${carry.cw}×${carry.ch} · ${count} ${T('cartons', '箱')}`;
    const { error } = await savePlan({
      name,
      container_key: pallet.key,
      container,
      specs,
      boxes,
      stats: { volumeUtil: stats.volumeUtil, totalWeight: stats.totalWeight, placedCount: stats.placedCount },
    });
    if (error) { setState('error'); setMsg(error); return; }
    track('pallet_plan_saved');
    setState('saved');
  };

  const signIn = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    const { error } = await auth.signInWithEmail(email.trim());
    if (!error) { setSent(true); track('signin_request', 'pallet-chain'); }
  };

  return (
    <section className="mt-10 rounded-xl border border-slate-200 bg-slate-50/70 p-5 print:hidden">
      <h2 className="font-black text-slate-900 mb-1">
        {T('Keep this pallet plan', '儲起呢個卡板方案')}
      </h2>
      <p className="text-sm text-slate-600 mb-4 leading-relaxed">
        {T(
          'Saving keeps the exact arrangement — every carton placed, not just the count — so you can reopen it in the 3D planner, send it for approval, or hand it to a 3PL later.',
          '儲存會保留實際擺法 — 每一箱嘅位置,唔淨係個數字 — 之後可以喺 3D 規劃器重開、送去審批,或者交俾 3PL。',
        )}
        {qty ? ` ${T(`For ${qty.toLocaleString()} units.`, `共 ${qty.toLocaleString()} 件。`)}` : ''}
      </p>

      {state === 'saved' ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
            <Check size={15} /> {T('Saved to your workspace', '已儲存到你嘅工作區')}
          </span>
          <Link to="/plans" className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline">
            {T('Open My Plans', '打開我的方案')} <ArrowRight size={14} />
          </Link>
        </div>
      ) : !auth.enabled ? (
        // Accounts not configured in this environment — say so plainly rather
        // than showing a button that cannot work.
        <p className="text-sm text-slate-500">
          {T('Saved plans are not available in this environment.', '呢個環境未開放儲存方案功能。')}
        </p>
      ) : auth.userId ? (
        <button
          onClick={save}
          disabled={state === 'busy'}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg font-bold text-sm transition-colors"
        >
          <Save size={15} />
          {state === 'busy' ? T('Saving…', '儲緊…') : T('Save this pallet plan', '儲起呢個方案')}
        </button>
      ) : sent ? (
        <p className="text-sm font-semibold text-emerald-700">
          {T('Check your email for the sign-in link, then press save.', '請查收登入連結電郵,然後再撳儲存。')}
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') signIn(); }}
            placeholder={T('you@company.com', 'you@company.com')}
            className="text-sm px-3 py-2 rounded-lg border border-slate-300 min-w-[220px]"
          />
          <button
            onClick={signIn}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-bold text-sm transition-colors"
          >
            <Save size={15} /> {T('Sign in to save', '登入即可儲存')}
          </button>
          <span className="text-xs text-slate-500 w-full">
            {T(
              'Magic link — no password. The plan above stays free either way.',
              '魔術連結登入 — 唔使密碼。上面個方案照樣免費。',
            )}
          </span>
        </div>
      )}

      {state === 'error' && (
        <p className="text-sm text-red-600 mt-2">{msg}</p>
      )}
    </section>
  );
}
