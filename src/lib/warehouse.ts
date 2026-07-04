/**
 * warehouse.ts — Phase 0 warehouse floor planning engine (ENTERPRISE.md path B).
 *
 * Two jobs, both pure and testable:
 *  1. autoArrangeFloor — lay single pallet rows, each facing its own forklift
 *     aisle, with a cross-aisle strip kept clear at the dock (+X edge).
 *  2. checkReachability — the rule containers don't have: a warehouse cannot
 *     be packed solid. Every pallet must be reachable by a forklift of a given
 *     aisle width from the dock. Grid BFS: erode free space by the forklift
 *     radius (prefix sums, O(cells)), flood-fill from the dock edge, then flag
 *     any pallet whose surroundings never touch the reachable network.
 *
 * Units: cm, same as the rest of the engine. Floor plane is X (length,
 * dock at +X) by Z (width); PlannerBox reuses px/pz footprints with py=0.
 */

import type { PlannerBox } from '../components/InteractiveLoadPlanner';

export interface Floor {
  l: number; // along X — dock is the +X edge
  w: number; // along Z
}

export interface FloorItemSpec {
  id: string;
  label: string;
  l: number; // footprint along X
  w: number; // footprint along Z
  h: number; // visual height
  qty: number;
  color: number;
}

/**
 * Single-row layout: each pallet row faces its own aisle, and a cross-aisle
 * strip stays clear at the dock end so every aisle connects to the dock.
 */
export function autoArrangeFloor(
  floor: Floor,
  specs: FloorItemSpec[],
  aisle: number,
  dockStrip = aisle * 1.2,
): PlannerBox[] {
  const boxes: PlannerBox[] = [];
  const usableL = floor.l - dockStrip; // keep the dock end clear
  const queue: FloorItemSpec[] = [];
  specs.forEach((s) => { for (let i = 0; i < s.qty; i++) queue.push(s); });

  let z = 0;
  let n = 0;
  let qi = 0;
  while (qi < queue.length && z < floor.w) {
    // one band = a single pallet row + its aisle, so EVERY row faces an aisle
    const rowDepth = queue[qi].w;
    if (z + rowDepth > floor.w) break;
    let x = 0;
    while (qi < queue.length) {
      const s = queue[qi];
      if (s.w !== rowDepth) break; // keep bands uniform; next band handles other sizes
      if (x + s.l > usableL) break;
      boxes.push({
        id: `${s.id}-${n++}`, label: s.label,
        l: s.l, w: s.w, h: s.h,
        px: x, py: 0, pz: z,
        color: s.color,
      });
      x += s.l;
      qi++;
    }
    z += rowDepth + aisle;
  }
  return boxes;
}

export interface ReachResult {
  unreachable: string[]; // box ids a forklift cannot reach from the dock
  reachableCount: number;
  floorUtil: number; // % of floor area covered by footprints
}

export function checkReachability(
  floor: Floor,
  boxes: PlannerBox[],
  aisle: number, // forklift working width, cm
  cell = 10,
): ReachResult {
  const nx = Math.max(1, Math.ceil(floor.l / cell));
  const nz = Math.max(1, Math.ceil(floor.w / cell));
  const occ = new Uint8Array(nx * nz);

  for (const b of boxes) {
    const x0 = Math.max(0, Math.floor(b.px / cell));
    const x1 = Math.min(nx - 1, Math.ceil((b.px + b.l) / cell) - 1);
    const z0 = Math.max(0, Math.floor(b.pz / cell));
    const z1 = Math.min(nz - 1, Math.ceil((b.pz + b.w) / cell) - 1);
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) occ[z * nx + x] = 1;
  }

  // prefix sums of occupancy → O(1) "is this r×r window fully free?"
  const P = new Int32Array((nx + 1) * (nz + 1));
  for (let z = 0; z < nz; z++) {
    for (let x = 0; x < nx; x++) {
      P[(z + 1) * (nx + 1) + (x + 1)] =
        occ[z * nx + x] + P[z * (nx + 1) + (x + 1)] + P[(z + 1) * (nx + 1) + x] - P[z * (nx + 1) + x];
    }
  }
  // window must fit INSIDE an aisle of exactly `aisle` width (off-by-one kills
  // every aisle otherwise): window = 2r+1 cells must be <= aisle/cell
  const r = Math.max(1, Math.floor((aisle / cell - 1) / 2));
  const windowFree = (x: number, z: number) => {
    const x0 = Math.max(0, x - r), x1 = Math.min(nx - 1, x + r);
    const z0 = Math.max(0, z - r), z1 = Math.min(nz - 1, z + r);
    // a window clipped by the wall is fine — walls don't block forklifts the way cargo does
    const sum = P[(z1 + 1) * (nx + 1) + (x1 + 1)] - P[z0 * (nx + 1) + (x1 + 1)]
      - P[(z1 + 1) * (nx + 1) + x0] + P[z0 * (nx + 1) + x0];
    return sum === 0;
  };

  // flood fill from the dock edge (+X)
  const visited = new Uint8Array(nx * nz);
  const stack: number[] = [];
  const dockX = nx - 1;
  for (let z = 0; z < nz; z++) {
    if (windowFree(dockX, z)) { visited[z * nx + dockX] = 1; stack.push(z * nx + dockX); }
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % nx, z = (i / nx) | 0;
    const neigh = [i - 1, i + 1, i - nx, i + nx];
    const nxs = [x - 1, x + 1, x, x];
    const nzs = [z, z, z - 1, z + 1];
    for (let k = 0; k < 4; k++) {
      const xx = nxs[k], zz = nzs[k], j = neigh[k];
      if (xx < 0 || xx >= nx || zz < 0 || zz >= nz || visited[j]) continue;
      if (!windowFree(xx, zz)) continue;
      visited[j] = 1;
      stack.push(j);
    }
  }

  // a box is reachable if any visited (traversable-centre) cell lies within
  // one forklift radius + one cell of its footprint
  const unreachable: string[] = [];
  const margin = r + 1;
  for (const b of boxes) {
    const x0 = Math.max(0, Math.floor(b.px / cell) - margin);
    const x1 = Math.min(nx - 1, Math.ceil((b.px + b.l) / cell) - 1 + margin);
    const z0 = Math.max(0, Math.floor(b.pz / cell) - margin);
    const z1 = Math.min(nz - 1, Math.ceil((b.pz + b.w) / cell) - 1 + margin);
    let ok = false;
    for (let z = z0; z <= z1 && !ok; z++) {
      for (let x = x0; x <= x1 && !ok; x++) {
        if (visited[z * nx + x]) ok = true;
      }
    }
    if (!ok) unreachable.push(b.id);
  }

  const covered = boxes.reduce((s, b) => s + b.l * b.w, 0);
  return {
    unreachable,
    reachableCount: boxes.length - unreachable.length,
    floorUtil: (covered / (floor.l * floor.w)) * 100,
  };
}
