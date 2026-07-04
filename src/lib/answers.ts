/**
 * answers.ts — data + math for the programmatic long-tail answer pages
 * (/answers/*). One JSON source (src/data/answers.json) drives the pages,
 * the prerender route list, and the sitemap.
 *
 * Counting method: single-SKU orientation grid — try all 6 axis-aligned
 * orientations, take the best floor(L/l)·floor(W/w)·floor(H/h). This is the
 * standard industry estimate for identical cartons; pages say so explicitly
 * and point to the 3D planner for mixed loads.
 */

import data from '../data/answers.json';

export interface AnswerContainer {
  key: string;
  slug: string;
  labelEn: string;
  labelZh: string;
  l: number;
  w: number;
  h: number;
  maxWeight: number;
}

export interface CartonSize { l: number; w: number; h: number }

export const CONTAINERS: AnswerContainer[] = data.containers;
export const CARTONS: CartonSize[] = data.cartons;

export const cartonSlug = (c: CartonSize) => `${c.l}x${c.w}x${c.h}`;

/** slug for a container hub page, e.g. "cartons-in-20ft-container" */
export const containerPageSlug = (ct: AnswerContainer) => `cartons-in-${ct.slug}`;

/** slug for a combo page, e.g. "how-many-60x40x40-cartons-fit-in-a-20ft-container" */
export const comboPageSlug = (c: CartonSize, ct: AnswerContainer) =>
  `how-many-${cartonSlug(c)}-cartons-fit-in-a-${ct.slug}`;

export interface FitResult {
  count: number;
  orientation: CartonSize; // carton dims in the placed orientation
  perRow: { x: number; y: number; z: number };
  utilization: number; // %
}

/** Best axis-aligned grid fit of identical cartons in a container. */
export function gridFit(c: CartonSize, ct: { l: number; w: number; h: number }): FitResult {
  const dims: [number, number, number][] = [
    [c.l, c.w, c.h], [c.l, c.h, c.w],
    [c.w, c.l, c.h], [c.w, c.h, c.l],
    [c.h, c.l, c.w], [c.h, c.w, c.l],
  ];
  let best: FitResult = { count: 0, orientation: c, perRow: { x: 0, y: 0, z: 0 }, utilization: 0 };
  for (const [l, w, h] of dims) {
    const nx = Math.floor(ct.l / l);
    const nz = Math.floor(ct.w / w);
    const ny = Math.floor(ct.h / h);
    const count = nx * nz * ny;
    if (count > best.count) {
      best = {
        count,
        orientation: { l, w, h },
        perRow: { x: nx, y: ny, z: nz },
        utilization: (count * c.l * c.w * c.h) / (ct.l * ct.w * ct.h) * 100,
      };
    }
  }
  return best;
}

export interface AnswerRoute {
  path: string; // router path, e.g. /answers/how-many-...
  kind: 'hub' | 'container' | 'combo';
  container?: AnswerContainer;
  carton?: CartonSize;
}

/** Every answers route (used by App routing, prerender, and the sitemap). */
export function allAnswerRoutes(): AnswerRoute[] {
  const routes: AnswerRoute[] = [{ path: '/answers', kind: 'hub' }];
  for (const ct of CONTAINERS) {
    routes.push({ path: `/answers/${containerPageSlug(ct)}`, kind: 'container', container: ct });
    for (const c of CARTONS) {
      routes.push({ path: `/answers/${comboPageSlug(c, ct)}`, kind: 'combo', container: ct, carton: c });
    }
  }
  return routes;
}

/** Resolve an /answers/:slug to its meaning (or null). */
export function resolveSlug(slug: string): AnswerRoute | null {
  for (const ct of CONTAINERS) {
    if (slug === containerPageSlug(ct)) return { path: `/answers/${slug}`, kind: 'container', container: ct };
    for (const c of CARTONS) {
      if (slug === comboPageSlug(c, ct)) return { path: `/answers/${slug}`, kind: 'combo', container: ct, carton: c };
    }
  }
  return null;
}
