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

/**
 * The actual forklift route from the dock to a pallet, along the aisle
 * network — the visual proof that the reachability check is real physics,
 * not a heuristic. BFS with parent pointers over the same eroded free-space
 * grid; returns waypoints in cm (or null if the pallet is cut off).
 */
export function forkliftPath(
  floor: Floor,
  boxes: PlannerBox[],
  aisle: number,
  targetId: string,
  cell = 10,
): { x: number; z: number }[] | null {
  const target = boxes.find((b) => b.id === targetId);
  if (!target) return null;

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
  const P = new Int32Array((nx + 1) * (nz + 1));
  for (let z = 0; z < nz; z++) {
    for (let x = 0; x < nx; x++) {
      P[(z + 1) * (nx + 1) + (x + 1)] =
        occ[z * nx + x] + P[z * (nx + 1) + (x + 1)] + P[(z + 1) * (nx + 1) + x] - P[z * (nx + 1) + x];
    }
  }
  const r = Math.max(1, Math.floor((aisle / cell - 1) / 2));
  const windowFree = (x: number, z: number) => {
    const x0 = Math.max(0, x - r), x1 = Math.min(nx - 1, x + r);
    const z0 = Math.max(0, z - r), z1 = Math.min(nz - 1, z + r);
    const sum = P[(z1 + 1) * (nx + 1) + (x1 + 1)] - P[z0 * (nx + 1) + (x1 + 1)]
      - P[(z1 + 1) * (nx + 1) + x0] + P[z0 * (nx + 1) + x0];
    return sum === 0;
  };

  // goal zone: traversable cells within one forklift radius of the pallet
  const margin = r + 1;
  const gx0 = Math.max(0, Math.floor(target.px / cell) - margin);
  const gx1 = Math.min(nx - 1, Math.ceil((target.px + target.l) / cell) - 1 + margin);
  const gz0 = Math.max(0, Math.floor(target.pz / cell) - margin);
  const gz1 = Math.min(nz - 1, Math.ceil((target.pz + target.w) / cell) - 1 + margin);
  const isGoal = (x: number, z: number) => x >= gx0 && x <= gx1 && z >= gz0 && z <= gz1;

  // BFS (queue — we want the SHORTEST route) with parent pointers
  const parent = new Int32Array(nx * nz).fill(-2); // -2 unvisited, -1 root
  const queue: number[] = [];
  const dockX = nx - 1;
  for (let z = 0; z < nz; z++) {
    if (windowFree(dockX, z)) { parent[z * nx + dockX] = -1; queue.push(z * nx + dockX); }
  }
  let goal = -1;
  let head = 0;
  while (head < queue.length) {
    const i = queue[head++];
    const x = i % nx, z = (i / nx) | 0;
    if (isGoal(x, z)) { goal = i; break; }
    const steps: [number, number][] = [[x - 1, z], [x + 1, z], [x, z - 1], [x, z + 1]];
    for (const [xx, zz] of steps) {
      if (xx < 0 || xx >= nx || zz < 0 || zz >= nz) continue;
      const j = zz * nx + xx;
      if (parent[j] !== -2 || !windowFree(xx, zz)) continue;
      parent[j] = i;
      queue.push(j);
    }
  }
  if (goal < 0) return null;

  // reconstruct dock → pallet, convert to cm, drop collinear points
  const cells: { x: number; z: number }[] = [];
  for (let i = goal; i !== -1; i = parent[i]) {
    cells.push({ x: (i % nx) * cell + cell / 2, z: ((i / nx) | 0) * cell + cell / 2 });
  }
  cells.reverse();
  const pts: { x: number; z: number }[] = [];
  for (let i = 0; i < cells.length; i++) {
    if (i === 0 || i === cells.length - 1) { pts.push(cells[i]); continue; }
    const a = cells[i - 1], b = cells[i], c = cells[i + 1];
    const collinear = (b.x - a.x) * (c.z - b.z) === (b.z - a.z) * (c.x - b.x);
    if (!collinear) pts.push(b);
  }
  return pts;
}

/**
 * First free spot for a new item, searched from the dock (+X) backwards so a
 * freshly placed item appears right where the user is looking. Returns null
 * if nothing fits.
 */
export function placeNearDock(
  floor: Floor,
  boxes: PlannerBox[],
  item: { l: number; w: number },
  step = 10,
): { px: number; pz: number } | null {
  const collides = (px: number, pz: number) =>
    boxes.some((b) =>
      px < b.px + b.l && px + item.l > b.px &&
      pz < b.pz + b.w && pz + item.w > b.pz);
  for (let x = floor.l - item.l; x >= 0; x -= step) {
    for (let z = 0; z + item.w <= floor.w; z += step) {
      if (!collides(x, z)) return { px: x, pz: z };
    }
  }
  return null;
}
