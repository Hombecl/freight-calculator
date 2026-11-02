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
function searchSingleSkuPacking(container: PackContainer, spec: PackItemSpec, layers = 1, depth = 2, stateLimit = 12000): PlannerBox[] {
  if (![container.l, container.w, container.h, spec.l, spec.w, spec.h].every(n => Number.isFinite(n) && n > 0) ||
      !Number.isSafeInteger(spec.qty) || spec.qty < 0 || spec.qty > 2000 || !Number.isFinite(spec.weight) || spec.weight < 0 ||
      (spec.maxStack != null && (Number.isNaN(spec.maxStack) || spec.maxStack < 0))) return [];
  const limit = Math.min(spec.qty, spec.weight > 0 ? floor((container.maxWeight ?? Infinity) / spec.weight) : spec.qty);
  if (limit <= 0) return [];
  const orientations = allowedOrientations(spec).map(([l, w, h]) => ({l, w, h}));
  const grids = new Map<string, Layout>(), cache = new Map<string, Layout>();
  const key = (l: number, w: number) => `${l.toFixed(6)}:${w.toFixed(6)}`;
  function grid(l: number, w: number, height = container.h, stackDepth = layers): Layout {
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
    if (++states > stateLimit) return best;
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
  const deep = solve(container.l, container.w, depth);
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

/** Retain the original search and try one additional supported layer. */
export function singleSkuPacking(container: PackContainer, spec: PackItemSpec): PlannerBox[] {
  const original = searchSingleSkuPacking(container, spec);
  const layered = searchSingleSkuPacking(container, spec, 2);
  return layered.length > original.length ? layered : original;
}

/** Worker-side refinement: bounded extra search; never discard a better incumbent.
 * This is not an optimality proof. Keep it out of synchronous input rendering. */
export function refineSingleSkuPacking(container: PackContainer, spec: PackItemSpec, incumbent: PlannerBox[]): PlannerBox[] {
  const upper = Math.min(spec.qty, Math.floor(container.l * container.w * container.h / (spec.l * spec.w * spec.h) + EPS));
  if (incumbent.length >= upper) return incumbent;
  const candidate = searchSingleSkuPacking(container, spec, 2, 3, 24000);
  let best = candidate.length > incumbent.length ? candidate : incumbent;
  // The construction axis is not necessarily physical gravity. Try the other
  // two axes only for freely rotatable, unlimited-stack cargo, then independently
  // validate in the ORIGINAL physical frame. A larger floating layout is rejected.
  if (spec.allowRotate === false || spec.keepUpright || (spec.maxStack != null && spec.maxStack !== Infinity)) return best;
  const dimensions = [container.l, container.w, container.h];
  for (const permutation of [[1, 2, 0], [0, 2, 1]]) {
    if (best.length >= upper) break;
    const raw = searchSingleSkuPacking({...container, l: dimensions[permutation[0]], w: dimensions[permutation[1]], h: dimensions[permutation[2]]}, spec, 2, 3, 24000);
    if (raw.length <= best.length) continue;
    const transformed = raw.map(box => {
      const sizes: number[] = [], positions: number[] = [];
      permutation.forEach((axis, index) => {
        sizes[axis] = [box.l, box.w, box.h][index];
        positions[axis] = [box.px, box.pz, box.py][index];
      });
      return {...box, l: sizes[0], w: sizes[1], h: sizes[2], px: positions[0], pz: positions[1], py: positions[2]};
    });
    if (verifySingleSkuPacking(transformed, container, spec)) {
      best = transformed;
      continue;
    }
    // Reverse the physical vertical order, then lower each carton onto the
    // highest overlapping base. This can repair a construction whose broad
    // supporting layers ended up above narrow ones. Settling alone is NOT proof
    // of support: keep only a fully reviewed result in the original frame.
    const settled: PlannerBox[] = [];
    const reversed = transformed.map(box => ({...box, py: container.h - box.py - box.h})).sort((a, b) => a.py - b.py);
    for (const box of reversed) {
      let y = 0;
      for (const below of settled) {
        if (below.px + below.l > box.px + EPS && box.px + box.l > below.px + EPS &&
            below.pz + below.w > box.pz + EPS && box.pz + box.w > below.pz + EPS) y = Math.max(y, below.py + below.h);
      }
      settled.push({...box, py: y});
    }
    if (verifySingleSkuPacking(settled, container, spec)) best = settled;
  }
  return best;
}

/** Independent placement review, not the search's own count or construction
 * assertions. Unknown weight remains a report warning, never a certification. */
export function verifySingleSkuPacking(boxes: PlannerBox[], container: PackContainer, spec: PackItemSpec): boolean {
  return reviewPlanner(boxes, container, [{...spec, weightKnown: true}], undefined, 1).issues.length === 0;
}
