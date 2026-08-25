import { Link } from 'react-router-dom';
import { IS_ZH } from '../lib/locale';
import { track } from '../lib/track';

/**
 * PalletChain — the four pallet questions, in the order they get asked.
 *
 * Pallet-shaped queries are ~63% of the search demand reaching this site
 * (POSITIONING.md §1), and every tool for them already existed — but they only
 * cross-linked ad-hoc: /pallet-calculator never pointed at step 2, and
 * /warehouse-space-calculator pointed at neither step 1 nor step 4, so a
 * visitor had to go back to the footer to continue. One shared strip means
 * adding a step links it everywhere at once.
 *
 * `current` is the route of the page rendering it; that step is shown as the
 * current position rather than as a link.
 */

const T = (en: string, zh: string) => (IS_ZH ? zh : en);

export const PALLET_STEPS = [
  { to: '/pallet-calculator', label: () => T('Cartons per pallet', '每板箱數') },
  { to: '/pallets-per-container', label: () => T('Pallets per container', '每櫃板數') },
  { to: '/warehouse-space-calculator', label: () => T('Floor space', '佔地面積') },
  { to: '/pallet-storage-cost-calculator', label: () => T('Storage cost', '倉存成本') },
];

const EXTRAS = [
  { to: '/ti-hi-calculator', label: () => T('TI × HI', 'TI × HI') },
  { to: '/pallet-builder', label: () => T('See the stack in 3D', '3D 睇實際堆疊') },
  { to: '/cbm-calculator', label: () => T('CBM & chargeable weight', 'CBM 同計費重量') },
];

export default function PalletChain({ current }: { current: string }) {
  return (
    <nav aria-label={T('Pallet planning steps', '卡板規劃步驟')} className="mt-12 print:hidden">
      <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-3">
        {T('Work out your pallets', '搞掂你嘅卡板')}
      </h2>
      <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {PALLET_STEPS.map((s, i) => {
          const isCurrent = s.to === current;
          const body = (
            <>
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-black shrink-0 ${
                  isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {i + 1}
              </span>
              <span className="leading-snug">{s.label()}</span>
            </>
          );
          return (
            <li key={s.to}>
              {isCurrent ? (
                <div
                  aria-current="page"
                  className="flex items-center gap-2.5 rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2.5 text-sm font-bold text-blue-900"
                >
                  {body}
                </div>
              ) : (
                <Link
                  to={s.to}
                  onClick={() => track('pallet_chain', s.to)}
                  className="flex items-center gap-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:text-blue-700 transition-colors"
                >
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-3 text-xs text-slate-500">
        {EXTRAS.filter((e) => e.to !== current).map((e, i, arr) => (
          <span key={e.to}>
            <Link
              to={e.to}
              onClick={() => track('pallet_chain', e.to)}
              className="text-blue-600 hover:underline"
            >
              {e.label()}
            </Link>
            {i < arr.length - 1 ? ' · ' : ''}
          </span>
        ))}
      </div>
    </nav>
  );
}
