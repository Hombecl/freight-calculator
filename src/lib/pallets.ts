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

/**
 * The winning block arrangement behind perLayer(): how many cartons along the
 * pallet length and width, and whether the carton is turned 90°.
 *
 * ⛔ Exists because the 3D Extreme-Point packer and this block math DISAGREE.
 * For a 40×30×30 carton on a EUR pallet the block math gives 40 (8 per layer ×
 * 5 layers) while packWithConstraints places 30 — the EP packer is general
 * purpose and does not exploit a uniform block. Anything that renders or SAVES
 * a pallet must lay boxes out from THIS function, or the artifact will contradict
 * the number on the page (the same rule LayerDiagram was written to enforce).
 */
export function layerArrangement(cl: number, cw: number, pl: number, pw: number) {
  const aX = Math.floor(pl / cl + EPS), aY = Math.floor(pw / cw + EPS);
  const bX = Math.floor(pl / cw + EPS), bY = Math.floor(pw / cl + EPS);
  return aX * aY >= bX * bY
    ? { nx: aX, ny: aY, rotated: false, cellL: cl, cellW: cw }
    : { nx: bX, ny: bY, rotated: true, cellL: cw, cellW: cl };
}

/** Lay `count` cartons out in that block arrangement, layer by layer. */
export function palletBoxes(
  count: number,
  carton: { l: number; w: number; h: number; weight: number },
  pallet: { l: number; w: number },
  color = 0xfbbf24,
) {
  const a = layerArrangement(carton.l, carton.w, pallet.l, pallet.w);
  const perLayerCount = a.nx * a.ny;
  const boxes: Array<{
    id: string; label: string; l: number; w: number; h: number;
    px: number; py: number; pz: number; color: number; weight: number;
  }> = [];
  for (let i = 0; i < count && perLayerCount > 0; i++) {
    const layer = Math.floor(i / perLayerCount);
    const within = i % perLayerCount;
    const gx = within % a.nx;
    const gy = Math.floor(within / a.nx);
    boxes.push({
      id: `p${i}`,
      label: 'Carton',
      l: a.cellL, w: a.cellW, h: carton.h,
      px: gx * a.cellL,
      py: layer * carton.h,
      pz: gy * a.cellW,
      color,
      weight: carton.weight,
    });
  }
  return boxes;
}
