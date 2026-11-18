/** Validate before lead capture; unknown weights must never become certified totals. */
export function plannerExportBlocker(pending:boolean,specs:readonly {weightKnown?:boolean}[],allowIncompleteDraft=false):'stale_plan'|'missing_weight'|null {
  if(pending)return 'stale_plan';
  return !allowIncompleteDraft&&specs.some(s=>s.weightKnown===false)?'missing_weight':null;
}
export function normalizedExportEmail(value:string):string|null {
  const email=value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:null;
}
