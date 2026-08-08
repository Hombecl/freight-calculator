/**
 * pallets.ts — shared pallet specs + layer math for /pallet-calculator and
 * /ti-hi-calculator, so the two tools can never disagree.
 * Dims (cm), usable load height (cm), dynamic weight rating (kg); mirrors
 * src/data/answers.json so answer pages and the tools agree.
 */

export const PALLETS = [
  { key: 'eur', label: 'EUR / EPAL — 120 × 80 cm', l: 120, w: 80, maxH: 165, maxWt: 1500 },
  // GMA is 48 × 40 in EXACTLY 121.92 × 101.6 cm — storing 121.9 made
  // floor(121.9 / 40.64) = 2 and dropped a whole case column for exact
  // imperial cartons (GPT-5.6 audit 2026-08-09)
  { key: 'gma', label: 'US GMA — 48 × 40 in (121.92 × 101.6 cm)', l: 121.92, w: 101.6, maxH: 152, maxWt: 1134 },
  { key: 'ind', label: 'Industrial — 120 × 100 cm', l: 120, w: 100, maxH: 165, maxWt: 1500 },
] as const;

export const CM_PER_IN = 2.54;
export const PALLET_TARE_KG = 25;

// tolerance so unit round-trips (in→cm→in) can't lose a column to float noise
const EPS = 1e-6;

// cartons per layer: best of the two block orientations (carton kept
// "this way up"). Never over-counts; interlocking/pinwheel may fit a few more.
export function perLayer(cl: number, cw: number, pl: number, pw: number) {
  const a = Math.floor(pl / cl + EPS) * Math.floor(pw / cw + EPS);
  const b = Math.floor(pl / cw + EPS) * Math.floor(pw / cl + EPS);
  return Math.max(a, b);
}
