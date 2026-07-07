/**
 * realism.ts — the physical-realism ladder (SYSTEM.md §1).
 *
 * Checks a real operator feels instantly and most planning tools skip:
 *  1. axleLoads        — front/rear axle split of trailer cargo (lever rule)
 *  2. mckeeSafeLoad    — carton crush strength from ECT (McKee formula)
 *  3. floorOverloads   — warehouse slab pressure vs rating (kg/m²)
 *  4. palletOverhang   — cartons past the pallet deck edge
 *  5. zoneViolations   — cargo that must sit inside a typed zone (chilled/…)
 *
 * All pure functions over PlannerBox — testable, API-ready.
 * Figures marked "typical" are industry norms; users must verify their spec.
 */

import type { PlannerBox } from '../components/InteractiveLoadPlanner';

// ---------------------------------------------------------------- 1. axles

export interface AxleConfig {
  frontPos: number;  // support position, cm from the FRONT of the cargo space
  rearPos: number;
  frontLimit: number; // max cargo share on this support, kg (typical legal)
  rearLimit: number;
}

export interface AxleResult {
  front: number; // kg of cargo carried by the front support
  rear: number;
  frontOver: boolean;
  rearOver: boolean;
}

/**
 * Two-support beam (kingpin + rear axle group): each box's weight splits by
 * the lever rule from its centre of gravity along the trailer. Cargo ahead of
 * the kingpin or behind the axles loads its near support beyond 100%.
 */
export function axleLoads(
  boxes: (PlannerBox & { weight?: number })[],
  cfg: AxleConfig,
): AxleResult {
  const span = cfg.rearPos - cfg.frontPos;
  let front = 0;
  let rear = 0;
  for (const b of boxes) {
    const w = b.weight ?? 0;
    if (!w) continue;
    const x = b.px + b.l / 2;
    const shareRear = (x - cfg.frontPos) / span; // NOT clamped: overhang leverage is real
    rear += w * shareRear;
    front += w * (1 - shareRear);
  }
  return {
    front, rear,
    frontOver: front > cfg.frontLimit,
    rearOver: rear > cfg.rearLimit,
  };
}

// ------------------------------------------------------- 2. crush strength

/**
 * McKee (simplified): BCT ≈ 5.87 · ECT · √(perimeter · board thickness),
 * in lb/in/inch units — the standard box-compression estimate. The SAFE
 * stacking load derates BCT for storage time, humidity and pallet pattern
 * (typical combined safety factor 4).
 *
 * @param ectLbIn   Edge Crush Test, lb/in (32 = common single-wall, 44/48 = double-wall)
 * @param l,w       carton footprint, cm
 * @param thicknessMm board caliper (single-wall ≈ 4 mm, double ≈ 7 mm)
 * @param safety    combined derating factor (default 4)
 * @returns safe load on top of ONE carton, kg
 */
export function mckeeSafeLoad(ectLbIn: number, l: number, w: number, thicknessMm = 4, safety = 4): number {
  const perimIn = (2 * (l + w)) / 2.54;
  const thickIn = thicknessMm / 25.4;
  const bctLb = 5.87 * ectLbIn * Math.sqrt(perimIn * thickIn);
  const bctKg = bctLb * 0.4536;
  return Math.max(0, bctKg / safety);
}

// ------------------------------------------------------- 3. floor loading

/**
 * Slab pressure per stack footprint: everything standing on one footprint
 * (double-stacked cargo, rack bays × levels) divided by its area. Rack bay
 * weight = levels × palletWeight. Returns ids over the rating.
 * Zones and unweighted items are skipped.
 */
export function floorOverloads(
  boxes: (PlannerBox & { weight?: number; kind?: string; levels?: number })[],
  ratingKgM2: number,
  rackPalletKg = 600,
): { id: string; kgM2: number }[] {
  if (!ratingKgM2) return [];
  // group stacked cargo by footprint (same px,pz → one column)
  const columns = new Map<string, { area: number; kg: number; ids: string[] }>();
  for (const b of boxes) {
    const kind = b.kind ?? 'cargo';
    if (kind === 'zone' || kind === 'obstacle') continue;
    const kg = kind === 'rack' ? (b.levels ?? 1) * rackPalletKg : (b.weight ?? 0);
    if (!kg) continue;
    const key = `${b.px},${b.pz}`;
    const col = columns.get(key) ?? { area: (b.l * b.w) / 10000, kg: 0, ids: [] };
    col.kg += kg;
    col.ids.push(b.id);
    columns.set(key, col);
  }
  const over: { id: string; kgM2: number }[] = [];
  for (const col of columns.values()) {
    const kgM2 = col.kg / col.area;
    if (kgM2 > ratingKgM2) for (const id of col.ids) over.push({ id, kgM2 });
  }
  return over;
}

// ------------------------------------------------------ 4. pallet overhang

/**
 * Cartons whose footprint extends past the pallet deck (l × w at origin).
 * Overhang is standard practice up to ~2.5 cm/side but cuts carton
 * compression strength ≈ 30% — flag it, don't forbid it.
 */
export function palletOverhang(
  boxes: PlannerBox[],
  deck: { l: number; w: number },
): { ids: string[]; maxCm: number } {
  const ids: string[] = [];
  let maxCm = 0;
  for (const b of boxes) {
    const over = Math.max(0, -b.px, -b.pz, b.px + b.l - deck.l, b.pz + b.w - deck.w);
    if (over > 0.01) { ids.push(b.id); maxCm = Math.max(maxCm, over); }
  }
  return { ids, maxCm };
}

// ------------------------------------------------- 5. zone segregation

export type ZoneType = 'chilled' | 'frozen' | 'hazmat';

/**
 * Cargo carrying `zoneReq` must sit fully inside a zone box (kind='zone')
 * whose `zoneType` matches. Returns the violating cargo ids.
 */
export function zoneViolations(
  boxes: (PlannerBox & { kind?: string; zoneReq?: ZoneType; zoneType?: ZoneType })[],
): { id: string; need: ZoneType }[] {
  const zones = boxes.filter((b) => b.kind === 'zone' && b.zoneType);
  const out: { id: string; need: ZoneType }[] = [];
  for (const b of boxes) {
    if ((b.kind ?? 'cargo') !== 'cargo' || !b.zoneReq) continue;
    const inside = zones.some((z) =>
      z.zoneType === b.zoneReq &&
      b.px >= z.px - 0.01 && b.px + b.l <= z.px + z.l + 0.01 &&
      b.pz >= z.pz - 0.01 && b.pz + b.w <= z.pz + z.w + 0.01);
    if (!inside) out.push({ id: b.id, need: b.zoneReq });
  }
  return out;
}
