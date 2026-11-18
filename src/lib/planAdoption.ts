export const ADOPTION_KEY = 'dp_plan_adoption_v1';
const DAY = 86400000;
export type AdoptionReminder = { job: string; created: number; next: number; frequency: string };
export const FREQUENCIES = ['weekly', 'monthly', 'occasional'] as const;
export const ADOPTION_RESULTS = ['matched', 'adjusted', 'unused', 'not_yet'] as const;
export const ADOPTION_REASONS = ['placement', 'constraints', 'report', 'controls', 'changed_order', 'other'] as const;
export function validReminder(value: unknown, now = Date.now()): AdoptionReminder | null {
 const r = value as AdoptionReminder | null;
 return r && typeof r.job === 'string' && r.job.length <= 200 && Number.isFinite(r.created) && Number.isFinite(r.next) && r.created <= now && now-r.created <= 90*DAY && (FREQUENCIES as readonly string[]).includes(r.frequency) ? r : null;
}
export function reminderDue(r: AdoptionReminder, now = Date.now()) { return now >= r.next && now-r.created >= 2*DAY; }
export function deferReminder(r: AdoptionReminder, now = Date.now()) { return {...r, next: now+7*DAY}; }
export function adoptionMeta(result: string, reason: string, frequency: string) {
 if (!(ADOPTION_RESULTS as readonly string[]).includes(result) || !(FREQUENCIES as readonly string[]).includes(frequency)) return null;
 if (['adjusted','unused'].includes(result) && !(ADOPTION_REASONS as readonly string[]).includes(reason)) return null;
 return `p:${result}:${['adjusted','unused'].includes(result)?reason:'none'}:${frequency}`;
}
