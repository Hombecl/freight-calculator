/**
 * answers.ts — data + math for the programmatic long-tail answer pages
 * (/answers/*). One JSON source (src/data/answers.json) drives the pages,
 * the prerender route list, and the sitemap.
 *
 * Vessels come in three kinds — shipping containers, pallets (cartons stack
 * ON them, open top) and trucks. Counting method: single-SKU orientation
 * grid — best of the 6 axis-aligned orientations. Pages state the method and
 * each vessel's assumptions (`note*`) openly.
 */

import data from '../data/answers.json';

export type VesselKind = 'container' | 'pallet' | 'truck';

export interface AnswerVessel {
  kind: VesselKind;
  key: string;
  slug: string;
  labelEn: string;
  labelZh: string;
  l: number;
  w: number;
  h: number;
  maxWeight: number;
  noteEn?: string;
  noteZh?: string;
}

export interface CartonSize { l: number; w: number; h: number }

const tag = (kind: VesselKind) => (v: Omit<AnswerVessel, 'kind'>): AnswerVessel => ({ ...v, kind });

export const CONTAINERS: AnswerVessel[] = (data.containers as Omit<AnswerVessel, 'kind'>[]).map(tag('container'));
export const PALLETS: AnswerVessel[] = (data.pallets as Omit<AnswerVessel, 'kind'>[]).map(tag('pallet'));
export const TRUCKS: AnswerVessel[] = (data.trucks as Omit<AnswerVessel, 'kind'>[]).map(tag('truck'));
export const ALL_VESSELS: AnswerVessel[] = [...CONTAINERS, ...PALLETS, ...TRUCKS];

export const GROUPS: { kind: VesselKind; vessels: AnswerVessel[] }[] = [
  { kind: 'container', vessels: CONTAINERS },
  { kind: 'pallet', vessels: PALLETS },
  { kind: 'truck', vessels: TRUCKS },
];

export const CARTONS: CartonSize[] = data.cartons;

export const cartonSlug = (c: CartonSize) => `${c.l}x${c.w}x${c.h}`;

/** pallets stack cartons ON them; everything else packs cartons IN them */
const prep = (v: AnswerVessel) => (v.kind === 'pallet' ? 'on' : 'in');

/** hub page slug, e.g. "cartons-in-20ft-container" / "cartons-on-eur-pallet" */
export const vesselPageSlug = (v: AnswerVessel) => `cartons-${prep(v)}-${v.slug}`;

/** combo slug, e.g. "how-many-60x40x40-cartons-fit-on-a-eur-pallet" */
export const comboPageSlug = (c: CartonSize, v: AnswerVessel) =>
  `how-many-${cartonSlug(c)}-cartons-fit-${prep(v)}-a-${v.slug}`;

export interface FitResult {
  count: number;
  orientation: CartonSize;
  perRow: { x: number; y: number; z: number };
  utilization: number; // %
}

/** Best axis-aligned grid fit of identical cartons in/on a vessel. */
export function gridFit(c: CartonSize, v: { l: number; w: number; h: number }): FitResult {
  const dims: [number, number, number][] = [
    [c.l, c.w, c.h], [c.l, c.h, c.w],
    [c.w, c.l, c.h], [c.w, c.h, c.l],
    [c.h, c.l, c.w], [c.h, c.w, c.l],
  ];
  let best: FitResult = { count: 0, orientation: c, perRow: { x: 0, y: 0, z: 0 }, utilization: 0 };
  for (const [l, w, h] of dims) {
    const nx = Math.floor(v.l / l);
    const nz = Math.floor(v.w / w);
    const ny = Math.floor(v.h / h);
    const count = nx * nz * ny;
    if (count > best.count) {
      best = {
        count,
        orientation: { l, w, h },
        perRow: { x: nx, y: ny, z: nz },
        utilization: (count * c.l * c.w * c.h) / (v.l * v.w * v.h) * 100,
      };
    }
  }
  return best;
}

export interface AnswerRoute {
  path: string;
  kind: 'hub' | 'vessel' | 'combo';
  vessel?: AnswerVessel;
  carton?: CartonSize;
}

/** Every answers route (used by App routing, prerender, and the sitemap). */
export function allAnswerRoutes(): AnswerRoute[] {
  const routes: AnswerRoute[] = [{ path: '/answers', kind: 'hub' }];
  for (const v of ALL_VESSELS) {
    routes.push({ path: `/answers/${vesselPageSlug(v)}`, kind: 'vessel', vessel: v });
    for (const c of CARTONS) {
      routes.push({ path: `/answers/${comboPageSlug(c, v)}`, kind: 'combo', vessel: v, carton: c });
    }
  }
  return routes;
}

/** Resolve an /answers/:slug to its meaning (or null). */
export function resolveSlug(slug: string): AnswerRoute | null {
  for (const v of ALL_VESSELS) {
    if (slug === vesselPageSlug(v)) return { path: `/answers/${slug}`, kind: 'vessel', vessel: v };
    for (const c of CARTONS) {
      if (slug === comboPageSlug(c, v)) return { path: `/answers/${slug}`, kind: 'combo', vessel: v, carton: c };
    }
  }
  return null;
}
