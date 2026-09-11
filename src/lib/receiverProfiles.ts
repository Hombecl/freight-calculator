import data from '../data/receiverProfiles.json';
import { quoteOrder, type OrderQuote, type OrderQuoteRequest } from './orderQuote';
import { PalletInputError } from './palletEstimate';
import type { Check } from './packChecks';

export interface ReceiverProfile {
  id: string; name: string; template: boolean; source: string; verifiedAt: string;
  verificationNote?: string; unverified?: string[]; approvedBy?: string; approvedAt?: string;
  pallet: Partial<OrderQuoteRequest['pallet']>;
  limits: { maxLoadedHeight?: number; maxGrossWeight?: number; overhangCm?: number; clampable?: boolean };
  rules: { code: string; text: string; check: 'height' | 'gross' | 'footprint' | 'overhang' | 'stack' | 'upright' | 'manual' }[];
}
export function parseProfile(value: unknown): ReceiverProfile {
  const fail = (field: string): never => { throw new PalletInputError(`profile.${field}`, 'invalid profile field'); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('profile');
  const p = value as ReceiverProfile;
  for (const k of ['id','name','source','verifiedAt'] as const) if (typeof p[k] !== 'string' || !p[k].trim() || p[k].length > 500) fail(k);
  if (typeof p.template !== 'boolean') fail('template');
  for (const k of ['verifiedAt','approvedAt'] as const) if (p[k] !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(p[k]!) || (!Number.isFinite(Date.parse(p[k]!)) ? '' : new Date(p[k]!).toISOString().slice(0,10)) !== p[k])) fail(k);
  for (const k of ['approvedBy','verificationNote'] as const) if (p[k] !== undefined && (typeof p[k] !== 'string' || p[k]!.length > 1000)) fail(k);
  if (p.unverified !== undefined && (!Array.isArray(p.unverified) || p.unverified.some(v => typeof v !== 'string'))) fail('unverified');
  for (const key of ['pallet','limits'] as const) {
    if (!p[key] || typeof p[key] !== 'object' || Array.isArray(p[key])) fail(key);
    for (const [k,v] of Object.entries(p[key])) {
      const allowed = key === 'pallet' ? ['l','w','baseHeight','maxHeight','maxWeight','tareWeight'] : ['maxLoadedHeight','maxGrossWeight','overhangCm','clampable'];
      if (!allowed.includes(k)) fail(`${key}.${k}`);
      if (k === 'clampable') { if (typeof v !== 'boolean') fail(`${key}.${k}`); }
      else if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 100000 || (!['baseHeight','tareWeight','overhangCm'].includes(k) && v === 0)) fail(`${key}.${k}`);
    }
  }
  if (!Array.isArray(p.rules) || p.rules.length > 100) fail('rules');
  const codes = new Set<string>();
  p.rules.forEach((r,i) => {
    if (!r || typeof r.code !== 'string' || !r.code.trim() || codes.has(r.code) || typeof r.text !== 'string' || !r.text.trim() || !['height','gross','footprint','overhang','stack','upright','manual'].includes(r.check)) fail(`rules.${i}`);
    codes.add(r.code);
  });
  return structuredClone(p);
}
export const loadProfiles = (): ReceiverProfile[] => data.profiles.map(parseProfile);
export function profileToQuoteLimits(profile: ReceiverProfile) {
  const p = parseProfile(profile);
  return { pallet: { ...p.pallet }, limits: { name: p.name, maxLoadedHeight: p.limits.maxLoadedHeight, maxGrossWeight: p.limits.maxGrossWeight } };
}
/** Profile values are always cm/kg; preserve the independently chosen packing envelope. */
export function applyProfile(request: OrderQuoteRequest, profile: ReceiverProfile): OrderQuoteRequest {
  const mapped = profileToQuoteLimits(profile), imperial = request.units === 'in-lb';
  const pallet = Object.fromEntries(Object.entries(mapped.pallet).map(([k,v]) => [k, v! / (imperial ? ['maxWeight','tareWeight'].includes(k) ? 0.45359237 : 2.54 : 1)]));
  return { ...request, pallet: { ...request.pallet, ...pallet }, limits: { name: profile.name, maxLoadedHeight: mapped.limits.maxLoadedHeight === undefined ? undefined : mapped.limits.maxLoadedHeight / (imperial ? 2.54 : 1), maxGrossWeight: mapped.limits.maxGrossWeight === undefined ? undefined : mapped.limits.maxGrossWeight / (imperial ? 0.45359237 : 1) } };
}
export async function evaluateProfile(quote: OrderQuote, input: ReceiverProfile) {
  const p = parseProfile(input);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(p)));
  const checks: Check[] = p.rules.map(rule => {
    const base: Check = { code: rule.code, status: 'not_evaluated', assumption: 'Required profile value or source input is missing.' };
    if (rule.check === 'manual') return { ...base, assumption: 'crew confirms on the build sheet' };
    if (!quote.pallets.length) return { ...base, assumption: 'No placed pallets to evaluate.' };
    let observed: number | undefined, limit: number | undefined;
    if (rule.check === 'height') { observed = Math.max(...quote.pallets.map(v => quote.buildInput ? quote.buildInput.pallet.baseHeight + Math.max(0,...v.boxes.map(b=>b.py+b.h)) + quote.buildInput.packagingAllowance.height : v.outerDims.h.cm)); limit = p.limits.maxLoadedHeight; }
    if (rule.check === 'gross') {
      observed = Math.max(...quote.pallets.map(v => quote.buildInput ? v.boxes.reduce((n,b)=>n+(b.weight??0),0)+(quote.buildInput.pallet.tareWeight??0)+quote.buildInput.packagingAllowance.weight : v.grossWeight.kg)); limit = p.limits.maxGrossWeight;
      if (limit !== undefined && quote.checks.find(v => v.code === 'TARE_PROVIDED')?.status !== 'pass') return { ...base, status: 'warn', observed, limit, assumption: 'Tare missing; gross weight cannot be confirmed.' };
    }
    if (rule.check === 'footprint' && p.pallet.l !== undefined && p.pallet.w !== undefined) return { ...base, status: quote.pallets.every(v => Math.abs((quote.buildInput?.pallet.l??v.outerDims.l.cm)-p.pallet.l!) < 1e-6 && Math.abs((quote.buildInput?.pallet.w??v.outerDims.w.cm)-p.pallet.w!) < 1e-6) ? 'pass' : 'fail', observed: `${quote.summary.footprint.l.cm}×${quote.summary.footprint.w.cm}`, limit: `${p.pallet.l}×${p.pallet.w}`, assumption: 'Footprint dimensions only; pallet construction and four-way access require crew confirmation.' };
    if (rule.check === 'overhang') { observed = Math.max(0,...quote.pallets.flatMap(v => v.boxes.map(b => Math.max(-b.px,-b.pz,b.px+b.l-(quote.buildInput?.pallet.l??v.outerDims.l.cm),b.pz+b.w-(quote.buildInput?.pallet.w??v.outerDims.w.cm))))); limit = p.limits.overhangCm; }
    if (rule.check === 'stack') {
      const c = quote.checks.find(v => v.code === 'STACK_LIMITS_PROVIDED');
      return { ...base, status: c?.status === 'pass' ? 'pass' : 'not_evaluated', assumption: c?.status === 'pass' ? 'Per-carton maxStack enforced by the packing engine; not a board-strength certification.' : 'Supply maxStack for every carton to evaluate stacking.' };
    }
    if (rule.check === 'upright') {
      if (!quote.buildInput) return { ...base, assumption: 'Original carton dimensions missing; crew must confirm orientation.' };
      const bad = quote.pallets.flatMap(p => p.boxes).filter(b => { const i = Number(b.id.match(/^sku(\d+)/)?.[1]); const item = quote.buildInput.items[i]; return !item || Math.abs(b.h-item.h) > .00001; });
      return { ...base, status: bad.length ? 'fail' : 'pass', ids: bad.map(b=>b.id), assumption: 'Placed vertical dimension compared with original carton height; printed arrow direction requires crew confirmation.' };
    }
    return limit === undefined || observed === undefined ? base : { ...base, observed, limit, status: observed <= limit + 1e-6 ? 'pass' : 'fail', assumption: `Screening predicted ${rule.check} in cm/kg against the profile; includes packaging for height and gross.` };
  });
  return { checks, profileVersion: Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2,'0')).join(''), ...(p.approvedBy ? { approvedBy: p.approvedBy } : {}), ...(p.approvedAt ? { approvedAt: p.approvedAt } : {}) };
}
export async function attachProfile(quote: OrderQuote, p: ReceiverProfile) {
  const e = await evaluateProfile(quote,p);
  return { ...quote, profile: { id:p.id,name:p.name,version:e.profileVersion,template:p.template,source:p.source,verifiedAt:p.verifiedAt,approvedBy:e.approvedBy,approvedAt:e.approvedAt,unverified:p.unverified,verificationNote:p.verificationNote }, profileChecks:e.checks, status: e.checks.some(c => c.status === 'fail') ? 'needs_review' as const : quote.status, reviewReasons: [...quote.reviewReasons,...e.checks.filter(c => c.status === 'fail').map(c => c.code)] };
}
export class UnknownProfileError extends Error {}
export async function checkReceiver(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new PalletInputError('request','must be an object');
  const o = input as OrderQuoteRequest & {profile?: unknown;profileId?: string};
  if (o.profile !== undefined && o.profileId !== undefined) throw new PalletInputError('profile','send profile or profileId, not both');
  const p = o.profile !== undefined ? parseProfile(o.profile) : loadProfiles().find(p => p.id === o.profileId);
  if (!p) { if (typeof o.profileId !== 'string') throw new PalletInputError('profileId','required'); throw new UnknownProfileError('Unknown profileId'); }
  return attachProfile(await quoteOrder(applyProfile(o,p)),p);
}
