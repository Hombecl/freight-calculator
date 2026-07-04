import { useState } from 'react';
import { X, Check, Lock } from 'lucide-react';

export interface PaywallAuth {
  enabled: boolean;
  isSignedIn: boolean;
  email: string | null;
  isPro: boolean;
  onSignIn: (email: string) => Promise<{ error: string | null }>;
  onUpgrade: () => void;
  onSignOut: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (email: string, proWaitlist: boolean) => void; // free lead-capture unlock
  auth?: PaywallAuth; // present only when a billing backend is configured
  proPrice?: string; // e.g. "$12/mo"
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Export gate + upgrade. Free tier: give an email to unlock CSV/PDF (client
 * lead capture). Pro tier: only rendered actionable when `auth.enabled` — signs
 * in via Supabase magic link, then opens the Lemon Squeezy checkout. Pro status
 * itself is verified server-side (see billing.ts / the webhook), not here.
 */
export default function PaywallModal({ open, onClose, onSubmit, auth, proPrice = '$12/mo' }: Props) {
  const [email, setEmail] = useState('');
  const [wantPro, setWantPro] = useState(false);
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);
  const [signInErr, setSignInErr] = useState<string | null>(null);
  if (!open) return null;

  const valid = EMAIL_RE.test(email);
  const unlockFree = () => { setTouched(true); if (valid) onSubmit(email.trim(), wantPro); };
  const signIn = async () => {
    setTouched(true);
    if (!valid || !auth) return;
    const { error } = await auth.onSignIn(email.trim());
    if (error) setSignInErr(error); else { setSent(true); setSignInErr(null); }
  };

  const backend = auth?.enabled;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Lock size={18} />
            </span>
            <div>
              <h2 className="font-bold text-slate-800">Unlock export</h2>
              <p className="text-xs text-slate-500">Download your packing list &amp; PDF plan — free.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="mt-4">
          <input
            type="email"
            value={email}
            autoFocus
            placeholder="you@company.com"
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && unlockFree()}
            className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${
              touched && !valid ? 'border-red-400' : 'border-slate-300 focus:border-indigo-500'
            }`}
          />
          {touched && !valid && <p className="text-xs text-red-500 mt-1">Enter a valid email.</p>}

          <label className="flex items-center gap-2 mt-3 text-xs text-slate-600">
            <input type="checkbox" checked={wantPro} onChange={(e) => setWantPro(e.target.checked)} />
            Notify me about <b>Pro</b> (unlimited saved plans, branding-free PDF, API)
          </label>

          <button
            onClick={unlockFree}
            className="w-full mt-4 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700"
          >
            Unlock &amp; download
          </button>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="font-semibold text-slate-700">Free</p>
            <ul className="mt-1 space-y-1 text-slate-500">
              <li className="flex gap-1"><Check size={13} className="text-green-500 mt-0.5" /> Optimise &amp; edit plans</li>
              <li className="flex gap-1"><Check size={13} className="text-green-500 mt-0.5" /> CSV + PDF export</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-indigo-700">Pro {backend ? <span className="text-slate-400 font-normal">{proPrice}</span> : <span className="text-slate-400 font-normal">(soon)</span>}</p>
            <ul className="mt-1 space-y-1 text-slate-500">
              <li className="flex gap-1"><Check size={13} className="text-indigo-500 mt-0.5" /> Saved projects &amp; teams</li>
              <li className="flex gap-1"><Check size={13} className="text-indigo-500 mt-0.5" /> Branding-free PDF + API</li>
            </ul>
            {backend && (
              <div className="mt-2">
                {auth!.isPro ? (
                  <span className="text-green-600 font-medium">✓ Active</span>
                ) : auth!.isSignedIn ? (
                  <button onClick={auth!.onUpgrade} className="w-full py-1.5 rounded bg-indigo-600 text-white font-medium">Upgrade</button>
                ) : sent ? (
                  <span className="text-green-600">Check your email for the sign-in link.</span>
                ) : (
                  <button onClick={signIn} className="w-full py-1.5 rounded border border-indigo-300 text-indigo-700 font-medium">Sign in to upgrade</button>
                )}
                {signInErr && <p className="text-red-500 mt-1">{signInErr}</p>}
              </div>
            )}
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-3">We email the plan link and occasional product updates. No spam.</p>
      </div>
    </div>
  );
}
