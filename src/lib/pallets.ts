/**
 * pallets.ts — shared pallet specs + layer math for /pallet-calculator and
 * /ti-hi-calculator, so the two tools can never disagree.
 * Dims (cm), usable load height (cm), dynamic weight rating (kg); mirrors
 * src/data/answers.json so answer pages and the tools agree.
 */

export const PALLETS = [
  { key: 'eur', label: 'EUR / EPAL — 120 × 80 cm', l: 120, w: 80, maxH: 165, maxWt: 1500 },
  { key: 'gma', label: 'US GMA — 48 × 40 in (121.9 × 101.6 cm)', l: 121.9, w: 101.6, maxH: 152, maxWt: 1134 },
  { key: 'ind', label: 'Industrial — 120 × 100 cm', l: 120, w: 100, maxH: 165, maxWt: 1500 },
] as const;

export const CM_PER_IN = 2.54;
export const PALLET_TARE_KG = 25;

// cartons per layer: best of the two block orientations (carton kept
// "this way up"). Never over-counts; interlocking/pinwheel may fit a few more.
export function perLayer(cl: number, cw: number, pl: number, pw: number) {
  const a = Math.floor(pl / cl) * Math.floor(pw / cw);
  const b = Math.floor(pl / cw) * Math.floor(pw / cl);
  return Math.max(a, b);
}
