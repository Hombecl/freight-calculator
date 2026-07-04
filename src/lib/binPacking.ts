/**
 * binPacking.ts — mixed-carton 3D container loading (Extreme-Point heuristic)
 *
 * Pure, dependency-free. No three.js, no React — so it is unit-testable and can
 * later be exposed as an API / used server-side. Coordinates match PlannerBox:
 *   px along l (X), pz along w (Z), py along h (Y, up). Origin at container min
 *   corner; container spans [0,l] x [0,w] x [0,h].
 *
 * Algorithm: Extreme-Point best-fit (Crainic/Perboli/Tadei 2008 family).
 *   - items sorted heavy-first then volume-first (keeps CoG low + tight packs)
 *   - candidate positions = "extreme points" projected from placed boxes
 *   - each item tries every allowed rotation at every EP; the placement with the
 *     lowest (y, z, x) merit wins (fills bottom-back-left first = gravity-stable)
 *   - constraints enforced before a placement is accepted:
 *       fit inside container · no overlap · base support ratio · container max
 *       weight · per-box max-stack weight (load propagated down the support tree)
 */

import type { PlannerBox } from '../components/InteractiveLoadPlanner';

export interface PackItemSpec {
  id: string;
  label: string;
  l: number;
  w: number;
  h: number;
  weight: number; // per unit, same unit as container.maxWeight
  qty: number;
  color: number;
  allowRotate?: boolean; // default true
  keepUpright?: boolean; // default false — if true, h stays vertical (yaw only)
  maxStack?: number; // max total weight allowed resting on top (default Infinity)
}

export interface PackContainer {
  l: number;
  w: number;
  h: number;
  maxWeight?: number; // optional payload limit
}

export interface PackStats {
  placedCount: number;
  totalCount: number;
  volumeUtil: number; // %
  totalWeight: number;
  weightUtil: number | null; // % of maxWeight, or null if no limit
  cog: { x: number; y: number; z: number }; // centre of gravity, container-local
  cogOffsetPct: { x: number; z: number }; // horizontal CoG offset from centre, % of half-span
}

export interface PackResult {
  boxes: PlannerBox[]; // placed (PlannerBox.weight carries per-unit weight)
  unplaced: number;
  stats: PackStats;
}

const EPS = 1e-6;
const SUPPORT_RATIO = 0.6; // fraction of a box's base that must rest on something

interface Node {
  box: PlannerBox & { weight: number };
  supporters: Node[];
  loadAbove: number;
  maxStack: number;
}

interface Orient { l: number; w: number; h: number }

function orientations(s: PackItemSpec): Orient[] {
  const { l, w, h } = s;
  if (s.allowRotate === false) return [{ l, w, h }];
  const all: Orient[] = s.keepUpright
    ? [ { l, w, h }, { l: w, w: l, h } ] // yaw only
    : [
        { l, w, h }, { l: w, w: l, h },
        { l, w: h, h: w }, { l: h, w, h: l },
        { l: w, w: h, h: l }, { l: h, w: l, h: w },
      ];
  const seen = new Set<string>();
  return all.filter((o) => {
    const k = `${o.l}x${o.w}x${o.h}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const footOverlapArea = (
  ax: number, az: number, al: number, aw: number,
  bx: number, bz: number, bl: number, bw: number,
) => {
  const ox = Math.max(0, Math.min(ax + al, bx + bl) - Math.max(ax, bx));
  const oz = Math.max(0, Math.min(az + aw, bz + bw) - Math.max(az, bz));
  return ox * oz;
};

const overlaps3D = (
  x: number, y: number, z: number, l: number, hh: number, w: number, n: Node,
) => {
  const b = n.box;
  return (
    x < b.px + b.l - EPS && x + l > b.px + EPS &&
    y < b.py + b.h - EPS && y + hh > b.py + EPS &&
    z < b.pz + b.w - EPS && z + w > b.pz + EPS
  );
};

/**
 * Direct supporters of a footprint sitting at height y. Returns the nodes it
 * rests on and the covered base fraction. Floor contact (y≈0) counts as full.
 */
function findSupport(
  x: number, y: number, z: number, l: number, w: number, nodes: Node[],
) {
  if (y <= EPS) return { supporters: [] as Node[], ratio: 1 };
  let covered = 0;
  const supporters: Node[] = [];
  for (const n of nodes) {
    const top = n.box.py + n.box.h;
    if (Math.abs(top - y) > EPS) continue;
    const area = footOverlapArea(x, z, l, w, n.box.px, n.box.pz, n.box.l, n.box.w);
    if (area > EPS) { covered += area; supporters.push(n); }
  }
  return { supporters, ratio: covered / (l * w) };
}

/**
 * Try to add `load` onto a support tree, splitting equally between direct
 * supporters and recursing. Collects proposed increments; returns null if any
 * ancestor would exceed its maxStack, otherwise the increment map to apply.
 */
function tryPropagate(
  supporters: Node[], load: number, deltas: Map<Node, number>,
): boolean {
  if (supporters.length === 0) return true; // reached floor
  const share = load / supporters.length;
  for (const s of supporters) {
    const next = (deltas.get(s) ?? 0) + share;
    if (s.loadAbove + next > s.maxStack + EPS) return false;
    deltas.set(s, next);
    if (!tryPropagate(s.supporters, share, deltas)) return false;
  }
  return true;
}

export function packContainer(container: PackContainer, specs: PackItemSpec[]): PackResult {
  // expand + heavy-first, then volume-first
  const queue: { spec: PackItemSpec; unit: number }[] = [];
  specs.forEach((s) => { for (let i = 0; i < s.qty; i++) queue.push({ spec: s, unit: i }); });
  queue.sort((a, b) => {
    if (b.spec.weight !== a.spec.weight) return b.spec.weight - a.spec.weight;
    return (b.spec.l * b.spec.w * b.spec.h) - (a.spec.l * a.spec.w * a.spec.h);
  });

  const nodes: Node[] = [];
  const eps: { x: number; y: number; z: number }[] = [{ x: 0, y: 0, z: 0 }];
  const maxW = container.maxWeight ?? Infinity;
  let totalWeight = 0;
  let unplaced = 0;
  let counter = 0;

  const insideAnyBox = (p: { x: number; y: number; z: number }) =>
    nodes.some((n) => {
      const b = n.box;
      return p.x > b.px + EPS && p.x < b.px + b.l - EPS &&
             p.y > b.py + EPS && p.y < b.py + b.h - EPS &&
             p.z > b.pz + EPS && p.z < b.pz + b.w - EPS;
    });

  for (const { spec } of queue) {
    if (totalWeight + spec.weight > maxW + EPS) { unplaced++; continue; }

    let best: {
      x: number; y: number; z: number; o: Orient;
      supporters: Node[]; deltas: Map<Node, number>;
    } | null = null;

    for (const o of orientations(spec)) {
      for (const ep of eps) {
        const { x, y, z } = ep;
        if (x + o.l > container.l + EPS) continue;
        if (y + o.h > container.h + EPS) continue;
        if (z + o.w > container.w + EPS) continue;
        // overlap test
        if (nodes.some((n) => overlaps3D(x, y, z, o.l, o.h, o.w, n))) continue;
        // support test
        const sup = findSupport(x, y, z, o.l, o.w, nodes);
        if (sup.ratio < SUPPORT_RATIO - EPS) continue;
        // weight / max-stack test
        const deltas = new Map<Node, number>();
        if (!tryPropagate(sup.supporters, spec.weight, deltas)) continue;
        // merit: bottom, then back, then left
        if (
          !best ||
          y < best.y - EPS ||
          (Math.abs(y - best.y) <= EPS && z < best.z - EPS) ||
          (Math.abs(y - best.y) <= EPS && Math.abs(z - best.z) <= EPS && x < best.x - EPS)
        ) {
          best = { x, y, z, o, supporters: sup.supporters, deltas };
        }
      }
    }

    if (!best) { unplaced++; continue; }

    // commit
    const box: PlannerBox & { weight: number } = {
      id: `${spec.id}-${counter++}`,
      label: spec.label,
      l: best.o.l, w: best.o.w, h: best.o.h,
      px: best.x, py: best.y, pz: best.z,
      color: spec.color,
      weight: spec.weight,
    };
    const node: Node = {
      box, supporters: best.supporters, loadAbove: 0,
      maxStack: spec.maxStack ?? Infinity,
    };
    best.deltas.forEach((inc, n) => { n.loadAbove += inc; });
    nodes.push(node);
    totalWeight += spec.weight;

    // spawn new extreme points, drop the consumed one, prune covered/out-of-bounds
    const spawn = [
      { x: best.x + best.o.l, y: best.y, z: best.z },
      { x: best.x, y: best.y + best.o.h, z: best.z },
      { x: best.x, y: best.y, z: best.z + best.o.w },
    ];
    const merged = eps
      .filter((p) => !(Math.abs(p.x - best!.x) < EPS && Math.abs(p.y - best!.y) < EPS && Math.abs(p.z - best!.z) < EPS))
      .concat(spawn)
      .filter((p) => p.x < container.l - EPS && p.y < container.h - EPS && p.z < container.w - EPS)
      .filter((p) => !insideAnyBox(p));
    // dedupe
    const uniq = new Map<string, { x: number; y: number; z: number }>();
    merged.forEach((p) => uniq.set(`${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`, p));
    eps.length = 0;
    eps.push(...uniq.values());
  }

  const boxes = nodes.map((n) => n.box);
  return { boxes, unplaced, stats: computeStats(boxes, container) };
}

/** Volume utilisation, total weight, and centre of gravity for a set of boxes. */
export function computeStats(
  boxes: (PlannerBox & { weight?: number })[],
  container: PackContainer,
): PackStats {
  const totalVol = container.l * container.w * container.h;
  let usedVol = 0;
  let totalWeight = 0;
  let mx = 0, my = 0, mz = 0;
  for (const b of boxes) {
    const wgt = b.weight ?? 0;
    usedVol += b.l * b.w * b.h;
    totalWeight += wgt;
    mx += (b.px + b.l / 2) * wgt;
    my += (b.py + b.h / 2) * wgt;
    mz += (b.pz + b.w / 2) * wgt;
  }
  const cog = totalWeight > 0
    ? { x: mx / totalWeight, y: my / totalWeight, z: mz / totalWeight }
    : { x: container.l / 2, y: 0, z: container.w / 2 };
  const cogOffsetPct = {
    x: ((cog.x - container.l / 2) / (container.l / 2)) * 100,
    z: ((cog.z - container.w / 2) / (container.w / 2)) * 100,
  };
  return {
    placedCount: boxes.length,
    totalCount: boxes.length,
    volumeUtil: totalVol > 0 ? (usedVol / totalVol) * 100 : 0,
    totalWeight,
    weightUtil: container.maxWeight ? (totalWeight / container.maxWeight) * 100 : null,
    cog,
    cogOffsetPct,
  };
}
