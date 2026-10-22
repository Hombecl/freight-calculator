import type { PackContainer, PackItemSpec } from './binPacking';
import type { PlannerBox } from './plannerBox';
import { allowedOrientations, reviewPlanner } from './plannerReview';

const EPS = 1e-6;
type Layout = { count: number; l: number; w: number; h: number; nx: number; nz: number; ny: number; top?: Layout } |
  { count: number; axis: 'x' | 'z'; cut: number; first: Layout; second: Layout };
const floor = (n: number) => Math.floor(n + EPS);

/** A bounded, deterministic floor-partition search. Each leaf is a grid of
 * identical vertical columns: every upper carton has its entire base supported.
 * This is intentionally separate from the general mixed-cargo heuristic. */
export function singleSkuPacking(container: PackContainer, spec: PackItemSpec): PlannerBox[] {
  if (![container.l, container.w, container.h, spec.l, spec.w, spec.h].every(n => Number.isFinite(n) && n > 0) ||
      !Number.isSafeInteger(spec.qty) || spec.qty < 0 || spec.qty > 2000 || !Number.isFinite(spec.weight) || spec.weight < 0 ||
      (spec.maxStack != null && (Number.isNaN(spec.maxStack) || spec.maxStack < 0))) return [];
  const limit = Math.min(spec.qty, spec.weight > 0 ? floor((container.maxWeight ?? Infinity) / spec.weight) : spec.qty);
  if (limit <= 0) return [];
  const orientations = allowedOrientations(spec).map(([l, w, h]) => ({l, w, h}));
  const grids = new Map<string, Layout>(), cache = new Map<string, Layout>();
  const key = (l: number, w: number) => `${l.toFixed(6)}:${w.toFixed(6)}`;
  function grid(l: number, w: number, height = container.h, stackDepth = 1): Layout {
    const k = `${stackDepth}:${height.toFixed(6)}:${key(l, w)}`, cached = grids.get(k);
    if (cached) return cached;
    let best: Layout = {count: 0, l: spec.l, w: spec.w, h: spec.h, nx: 0, nz: 0, ny: 0};
    for (const o of orientations) {
      const nx = floor(l / o.l), nz = floor(w / o.w);
      const maxNy = Math.min(floor(height / o.h), spec.weight > 0 ? floor((spec.maxStack ?? Infinity) / spec.weight) + 1 : Infinity, limit);
      if (!nx || !nz || !maxNy) continue;
      const count = Math.min(limit, nx * nz * maxNy);
      if (count > best.count) best = {...o, nx, nz, ny: maxNy, count};
      // A new orientation can sit on the completely covered footprint of a
      // lower slab. Finite crush limits use columns only; no inferred load sharing.
      if (stackDepth && (spec.maxStack == null || spec.maxStack === Infinity)) {
        for (let ny = 1; ny <= maxNy; ny++) {
          const remaining = height - ny * o.h;
          if (remaining <= EPS) continue;
          const top = grid(nx * o.l, nz * o.w, remaining, stackDepth - 1);
          const layeredCount = Math.min(limit, nx * nz * ny + top.count);
          if (layeredCount > best.count) best = {...o, nx, nz, ny, top, count: layeredCount};
          if (best.count >= limit) break;
        }
      }
    }
    grids.set(k, best);
    return best;
  }
  function cuts(size: number, axis: 'l' | 'w') {
    const values = new Set<number>();
    for (const o of orientations) {
      const max = Math.min(floor(size / o[axis]), limit);
      // Bound very small-carton inputs without favouring a benchmark dimension.
      const step = Math.max(1, Math.ceil(max / 48));
      for (let i = 1; i <= max; i += step) {
        const cut = i * o[axis];
        if (cut > EPS && cut < size - EPS) {
          values.add(+cut.toFixed(6)); values.add(+(size - cut).toFixed(6));
        }
      }
    }
    return [...values].sort((a, b) => a - b);
  }
  let states = 0;
  function solve(l: number, w: number, depth: number): Layout {
    let best = grid(l, w);
    if (!depth || best.count >= limit) return best;
    const k = `${depth}:${key(l, w)}`, cached = cache.get(k);
    if (cached) return cached;
    if (++states > 12000) return best;
    for (const axis of ['x', 'z'] as const) {
      for (const cut of cuts(axis === 'x' ? l : w, axis === 'x' ? 'l' : 'w')) {
        const first = solve(axis === 'x' ? cut : l, axis === 'z' ? cut : w, depth - 1);
        const second = solve(axis === 'x' ? l - cut : l, axis === 'z' ? w - cut : w, depth - 1);
        const count = Math.min(limit, first.count + second.count);
        if (count > best.count) best = {count, axis, cut, first, second};
        if (best.count >= limit) break;
      }
      if (best.count >= limit) break;
    }
    cache.set(k, best);
    return best;
  }
  const simple = solve(container.l, container.w, 1);
  const deep = solve(container.l, container.w, 2);
  const boxes: PlannerBox[] = [];
  function place(layout: Layout, x: number, z: number, y = 0) {
    if ('axis' in layout) {
      place(layout.first, x, z, y);
      place(layout.second, x + (layout.axis === 'x' ? layout.cut : 0), z + (layout.axis === 'z' ? layout.cut : 0), y);
    } else {
      const {l, w, h, nx, nz, ny} = layout;
      for (let ix = 0; ix < nx && boxes.length < limit; ix++)
        for (let iz = 0; iz < nz && boxes.length < limit; iz++)
          for (let iy = 0; iy < ny && boxes.length < limit; iy++) boxes.push({
            id: `${spec.id}-${boxes.length}`, specId: spec.id, label: spec.label, color: spec.color,
            l, w, h, px: x + ix * l, pz: z + iz * w, py: y + iy * h,
            weight: spec.weight, group: spec.group, unloadOrder: spec.unloadOrder,
          });
      if (layout.top && boxes.length < limit) place(layout.top, x, z, y + ny * h);
    }
  }
  place(deep.count > simple.count ? deep : simple, 0, 0);
  return boxes;
}

/** Independent placement review, not the search's own count or construction
 * assertions. Unknown weight remains a report warning, never a certification. */
export function verifySingleSkuPacking(boxes: PlannerBox[], container: PackContainer, spec: PackItemSpec): boolean {
  return reviewPlanner(boxes, container, [{...spec, weightKnown: true}], undefined, 1).issues.length === 0;
}
