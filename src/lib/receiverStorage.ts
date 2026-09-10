import { loadProfiles, parseProfile } from './receiverProfiles';
import type { OrderQuote } from './orderQuote';
export const PROFILE_STORAGE = 'dp_receiver_profiles';
export const SHEET_STORAGE = 'dp_build_sheet';
export const quoteStorageKey = (id?: string | null) => `dp_quote_${id || 'draft'}`;
export function deviceProfiles(raw: string | null) {
  const shipped = loadProfiles();
  const custom = raw ? (JSON.parse(raw) as unknown[]).map(parseProfile) : [];
  if (custom.some(p=>shipped.some(s=>s.id===p.id)) || new Set(custom.map(p=>p.id)).size !== custom.length) throw new Error('Duplicate profile IDs');
  return [...shipped, ...custom];
}
export function parseSheetQuote(value: unknown): OrderQuote {
  const q = value as OrderQuote;
  if (!q || !Array.isArray(q.pallets) || !q.summary || !Array.isArray(q.checks) || typeof q.inputHash !== 'string' || !q.meter || !q.summary.footprint || !q.units || !Array.isArray(q.byItem)) throw new Error('Invalid order-quote result');
  if (q.pallets.some((p,i) => p.index !== i || !Array.isArray(p.boxes) || p.boxes.length !== p.cartonCount || !p.outerDims || !p.grossWeight || !p.loadedHeight || !Array.isArray(p.checks) || p.boxes.some(b => ['px','py','pz','l','w','h','color'].some(k => !Number.isFinite(b[k as keyof typeof b]))))) throw new Error('Invalid pallet placements');
  if (q.pallets.reduce((n,p) => n+p.cartonCount,0) !== q.summary.cartonsPlaced) throw new Error('Carton count mismatch');
  if ('profileSnapshot' in q && q.profileSnapshot !== undefined) parseProfile(q.profileSnapshot);
  return q;
}
