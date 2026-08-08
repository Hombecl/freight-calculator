import { useState, type ReactNode } from 'react';
import { Link2, Check, ChevronDown, Printer } from 'lucide-react';
import { track } from '../../lib/track';

/**
 * Shared calculator UX bits (2026-08-09 UX round):
 * - StickyResult: mobile-only bottom bar so the headline number is visible
 *   while typing (on phones the result card sits below the fold).
 * - CopyLink: results already live in the URL — expose that as one tap.
 * - PresetChips: one-tap example inputs; typing three dimensions on a phone
 *   keyboard is the biggest entry hurdle.
 */

export function StickyResult({ label, value }: { label: string; value: string }) {
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur text-white px-4 py-2.5 flex items-baseline justify-between gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.15)]" style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 truncate">{label}</span>
      <span className="text-lg font-black whitespace-nowrap">{value}</span>
    </div>
  );
}

/** Reserve space at the page bottom so the sticky bar never covers content. */
export function StickySpacer() {
  return <div className="h-12 md:hidden" aria-hidden="true" />;
}

export function CopyLink({ toolId }: { toolId: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
      track('copy_link', toolId);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard unavailable — ignore */ }
  };
  return (
    <button onClick={copy} className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-500 transition-colors">
      {copied ? <Check size={13} /> : <Link2 size={13} />}
      {copied ? 'Copied ✓' : 'Copy link to this result'}
    </button>
  );
}

/** Collapsible editorial section — the SEO text stays in the DOM (and in the
 *  prerender snapshot) but stops dominating the screen. Rendered open on
 *  desktop print? No — closed by default everywhere; searchers who want the
 *  how-to click once. */
export function Accordion({ title, children, defaultOpen = false }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group rounded-xl border border-slate-200 mb-3" open={defaultOpen}>
      <summary className="flex items-center justify-between cursor-pointer select-none px-5 py-3.5 font-bold text-slate-900 list-none [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown size={16} className="text-slate-400 transition-transform group-open:rotate-180 flex-shrink-0 ml-3" />
      </summary>
      <div className="px-5 pb-5">{children}</div>
    </details>
  );
}

/** Print the page — pair with `print:hidden` on everything except a
 *  `hidden print:block` spec sheet so the printout is a clean 1-page spec. */
export function PrintSpecButton({ toolId, label }: { toolId: string; label: string }) {
  return (
    <button
      onClick={() => { track('print_spec', toolId); window.print(); }}
      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
    >
      <Printer size={13} /> {label}
    </button>
  );
}

export function PresetChips({ title, chips }: { title: string; chips: Array<{ label: string; onClick: () => void }> }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-400 mb-1.5">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <button
            key={c.label}
            onClick={c.onClick}
            className="text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
