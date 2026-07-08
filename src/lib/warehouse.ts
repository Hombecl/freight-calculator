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
  kind?: 'cargo' | 'rack' | 'obstacle' | 'zone'; // zones are walkable named areas
  levels?: number; // rack levels (capacity math)
  stack?: number; // cargo stacking (1 = single, 2 = double-stacked)
  weight?: number; // kg per unit — powers slab-pressure checks
  zoneReq?: 'chilled' | 'frozen' | 'hazmat'; // cargo must sit inside a matching zone
  zoneType?: 'chilled' | 'frozen' | 'hazmat'; // for kind='zone': what the zone provides
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
  fixed: PlannerBox[] = [], // pre-placed racks/obstacles the rows must avoid
): PlannerBox[] {
  const hitsFixed = (px: number, pz: number, l: number, w: number) =>
    fixed.some((f) =>
      px < f.px + f.l && px + l > f.px &&
      pz < f.pz + f.w && pz + w > f.pz);
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
      if (hitsFixed(x, z, s.l, s.w)) { x += 10; continue; } // slide past fixed structures
      boxes.push({
        id: `${s.id}-${n++}`, label: s.label,
        l: s.l, w: s.w, h: s.h,
        px: x, py: 0, pz: z,
        color: s.color,
        ...(s.kind ? { kind: s.kind } : {}),
        ...(s.weight ? { weight: s.weight } : {}),
        ...(s.zoneReq ? { zoneReq: s.zoneReq } : {}),
      } as PlannerBox);
      if ((s.stack ?? 1) >= 2) {
        boxes.push({
          id: `${s.id}-${n++}`, label: s.label,
          l: s.l, w: s.w, h: s.h,
          px: x, py: s.h, pz: z,
          color: s.color,
          ...(s.kind ? { kind: s.kind } : {}),
          ...(s.weight ? { weight: s.weight } : {}),
          ...(s.zoneReq ? { zoneReq: s.zoneReq } : {}),
        } as PlannerBox);
      }
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
  edges: ('E' | 'W' | 'N' | 'S')[] = ['E'], // dock edges the network is fed from
): ReachResult {
  const nx = Math.max(1, Math.ceil(floor.l / cell));
  const nz = Math.max(1, Math.ceil(floor.w / cell));
  const occ = new Uint8Array(nx * nz);

  for (const b of boxes) {
    if ((b as any).kind === 'zone') continue; // zones are walkable labels
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

  // flood fill from every selected dock edge
  const visited = new Uint8Array(nx * nz);
  const stack: number[] = [];
  const seed = (x: number, z: number) => {
    const i = z * nx + x;
    if (!visited[i] && windowFree(x, z)) { visited[i] = 1; stack.push(i); }
  };
  for (const e of edges) {
    if (e === 'E') for (let z = 0; z < nz; z++) seed(nx - 1, z);
    if (e === 'W') for (let z = 0; z < nz; z++) seed(0, z);
    if (e === 'S') for (let x = 0; x < nx; x++) seed(x, nz - 1);
    if (e === 'N') for (let x = 0; x < nx; x++) seed(x, 0);
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
    if ((b as any).kind === 'zone') continue;
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
  edges: ('E' | 'W' | 'N' | 'S')[] = ['E'],
): { x: number; z: number }[] | null {
  const target = boxes.find((b) => b.id === targetId);
  if (!target) return null;

  const nx = Math.max(1, Math.ceil(floor.l / cell));
  const nz = Math.max(1, Math.ceil(floor.w / cell));
  const occ = new Uint8Array(nx * nz);
  for (const b of boxes) {
    if ((b as any).kind === 'zone') continue; // zones are walkable labels
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
  const seedP = (x: number, z: number) => {
    const i = z * nx + x;
    if (parent[i] === -2 && windowFree(x, z)) { parent[i] = -1; queue.push(i); }
  };
  for (const e of edges) {
    if (e === 'E') for (let z = 0; z < nz; z++) seedP(nx - 1, z);
    if (e === 'W') for (let z = 0; z < nz; z++) seedP(0, z);
    if (e === 'S') for (let x = 0; x < nx; x++) seedP(x, nz - 1);
    if (e === 'N') for (let x = 0; x < nx; x++) seedP(x, 0);
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
      (b as any).kind !== 'zone' &&
      px < b.px + b.l && px + item.l > b.px &&
      pz < b.pz + b.w && pz + item.w > b.pz);
  for (let x = floor.l - item.l; x >= 0; x -= step) {
    for (let z = 0; z + item.w <= floor.w; z += step) {
      if (!collides(x, z)) return { px: x, pz: z };
    }
  }
  return null;
}

// ============================================================
// Production layer: dock-edge selection, item kinds, rack capacity
// ============================================================

export type DockEdge = 'E' | 'W' | 'N' | 'S'; // E = +X (default), W = -X, S = +Z, N = -Z

export type FloorKind = 'cargo' | 'rack' | 'obstacle';

// Everything runs in a canonical frame (dock = E). These transforms map
// floors/boxes/points between the user frame and the canonical frame so ONE
// engine serves all four dock edges.
const canonFloor = (edge: DockEdge, f: Floor): Floor =>
  edge === 'E' || edge === 'W' ? { l: f.l, w: f.w } : { l: f.w, w: f.l };

function canonBox<T extends PlannerBox>(edge: DockEdge, f: Floor, b: T): T {
  switch (edge) {
    case 'E': return { ...b };
    case 'W': return { ...b, px: f.l - (b.px + b.l) };
    case 'S': return { ...b, px: b.pz, pz: b.px, l: b.w, w: b.l };
    case 'N': return { ...b, px: f.w - (b.pz + b.w), pz: b.px, l: b.w, w: b.l };
  }
}

function uncanonBox<T extends PlannerBox>(edge: DockEdge, f: Floor, b: T): T {
  switch (edge) {
    case 'E': return { ...b };
    case 'W': return { ...b, px: f.l - (b.px + b.l) };
    case 'S': return { ...b, px: b.pz, pz: b.px, l: b.w, w: b.l };
    case 'N': return { ...b, px: b.pz, pz: f.w - (b.px + b.l), l: b.w, w: b.l };
  }
}


/** Reachability with dock-edge choice; obstacles are never flagged (they need no access). */
export function checkReachabilityD(
  floor: Floor, boxes: PlannerBox[], aisle: number, edge: DockEdge | DockEdge[] = 'E', cell = 10,
): ReachResult {
  const edges = Array.isArray(edge) ? edge : [edge];
  const res = checkReachability(floor, boxes, aisle, cell, edges);
  const obstacleIds = new Set(boxes.filter((b) => (b as any).kind === 'obstacle').map((b) => b.id));
  const unreachable = res.unreachable.filter((id) => !obstacleIds.has(id));
  return { ...res, unreachable, reachableCount: boxes.length - obstacleIds.size - unreachable.length };
}

/** Forklift route with dock-edge choice. */
export function forkliftPathD(
  floor: Floor, boxes: PlannerBox[], aisle: number, targetId: string, edge: DockEdge | DockEdge[] = 'E', cell = 10,
): { x: number; z: number }[] | null {
  const edges = Array.isArray(edge) ? edge : [edge];
  return forkliftPath(floor, boxes, aisle, targetId, cell, edges);
}

/** Auto-arrange CARGO ONLY (racks/obstacles are placed by hand), any dock edge. */
export function autoArrangeFloorD(
  floor: Floor, specs: FloorItemSpec[], aisle: number, edge: DockEdge = 'E',
  fixed: PlannerBox[] = [],
): PlannerBox[] {
  const cargo = specs.filter((s) => (s.kind ?? 'cargo') === 'cargo');
  const cf = canonFloor(edge, floor);
  const cSpecs = edge === 'E' || edge === 'W'
    ? cargo
    : cargo.map((s) => ({ ...s, l: s.w, w: s.l }));
  const cFixed = fixed.map((b) => canonBox(edge, floor, b));
  const cBoxes = autoArrangeFloor(cf, cSpecs, aisle, aisle * 1.2, cFixed);
  return cBoxes.map((b) => uncanonBox(edge, floor, b));
}

/** Free spot near the chosen dock edge. */
export function placeNearDockD(
  floor: Floor, boxes: PlannerBox[], item: { l: number; w: number; kind?: string }, edge: DockEdge = 'E', step = 10,
): { px: number; pz: number } | null {
  // zones are walkable overlays — they may land on top of anything
  if (item.kind === 'zone') {
    const px = Math.max(0, (edge === 'W' ? 0 : edge === 'E' ? floor.l - item.l : (floor.l - item.l) / 2));
    const pz = Math.max(0, (edge === 'N' ? 0 : edge === 'S' ? floor.w - item.w : (floor.w - item.w) / 2));
    return { px: Math.min(px, Math.max(0, floor.l - item.l)), pz: Math.min(pz, Math.max(0, floor.w - item.w)) };
  }
  const cf = canonFloor(edge, floor);
  const cb = boxes.map((b) => canonBox(edge, floor, b));
  const cItem = edge === 'E' || edge === 'W' ? item : { l: item.w, w: item.l };
  const spot = placeNearDock(cf, cb, cItem, step);
  if (!spot) return null;
  const back = uncanonBox(edge, floor, { px: spot.px, pz: spot.pz, l: cItem.l, w: cItem.w } as PlannerBox);
  return { px: back.px, pz: back.pz };
}

/** Pallet-position capacity: floor cargo + rack bays × levels (135cm per EUR position). */
export function positionCapacity(boxes: PlannerBox[]): { floorCargo: number; rackPositions: number } {
  let floorCargo = 0;
  let rackPositions = 0;
  for (const b of boxes) {
    const kind = (b as any).kind ?? 'cargo';
    if (kind === 'zone') continue;
    if (kind === 'cargo') floorCargo++;
    else if (kind === 'rack') {
      const levels = Math.max(1, Math.round((b as any).levels ?? 4));
      rackPositions += Math.max(1, Math.floor(Math.max(b.l, b.w) / 135)) * levels;
    }
  }
  return { floorCargo, rackPositions };
}


export interface ZoneStat {
  id: string;
  label: string;
  cargo: number;
  rackPositions: number;
  coverage: number; // % of the zone's area covered by cargo/rack footprints
}

/** Stats for each kind:'zone' box: what lives inside it (by centroid). */
export function zoneStats(boxes: PlannerBox[]): ZoneStat[] {
  const zones = boxes.filter((b) => (b as any).kind === 'zone');
  return zones.map((z) => {
    let cargo = 0;
    let rackPositions = 0;
    let covered = 0;
    for (const b of boxes) {
      const kind = (b as any).kind ?? 'cargo';
      if (kind === 'zone') continue;
      const cx = b.px + b.l / 2, cz = b.pz + b.w / 2;
      const inside = cx >= z.px && cx <= z.px + z.l && cz >= z.pz && cz <= z.pz + z.w;
      if (!inside) continue;
      if (kind === 'cargo') cargo++;
      if (kind === 'rack') {
        const levels = Math.max(1, Math.round((b as any).levels ?? 4));
        rackPositions += Math.max(1, Math.floor(Math.max(b.l, b.w) / 135)) * levels;
      }
      covered += b.l * b.w;
    }
    return {
      id: z.id, label: z.label, cargo, rackPositions,
      coverage: (covered / (z.l * z.w)) * 100,
    };
  });
}

/**
 * WHY is this item unreachable? Re-runs reachability at narrower clearances to
 * find the widest forklift that COULD get there. null = fully enclosed.
 * This turns a red box from "something's wrong" into an actionable message.
 */
export function explainUnreachable(
  floor: Floor,
  boxes: PlannerBox[],
  targetId: string,
  edges: DockEdge[] = ['E'],
  widths: number[] = [270, 220, 180, 140, 100, 60],
): { passableAt: number | null } {
  for (const w of widths) {
    const r = checkReachability(floor, boxes, w, 10, edges);
    if (!r.unreachable.includes(targetId)) return { passableAt: w };
  }
  return { passableAt: null };
}

// ============================================================
// Turn-aware forklift model: straight corridors need the truck's working
// width, but CORNERS need a bigger clear square (the right-angle turn box —
// turning radius + load length). Most tools ignore this; real forklifts
// don't. State-space BFS over (cell, travel-axis).
// ============================================================

export interface TruckSpec {
  aisle: number; // straight working width, cm
  turn: number;  // clear square needed to make a 90° turn, cm
}

function buildMasks(floor: Floor, boxes: PlannerBox[], truck: TruckSpec, cell: number, docks: DockEdge[] = []) {
  const nx = Math.max(1, Math.ceil(floor.l / cell));
  const nz = Math.max(1, Math.ceil(floor.w / cell));
  const occ = new Uint8Array(nx * nz);
  for (const b of boxes) {
    if ((b as any).kind === 'zone') continue;
    const x0 = Math.max(0, Math.floor(b.px / cell));
    const x1 = Math.min(nx - 1, Math.ceil((b.px + b.l) / cell) - 1);
    const z0 = Math.max(0, Math.floor(b.pz / cell));
    const z1 = Math.min(nz - 1, Math.ceil((b.pz + b.w) / cell) - 1);
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) occ[z * nx + x] = 1;
  }
  const P = new Int32Array((nx + 1) * (nz + 1));
  for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
    P[(z + 1) * (nx + 1) + (x + 1)] =
      occ[z * nx + x] + P[z * (nx + 1) + (x + 1)] + P[(z + 1) * (nx + 1) + x] - P[z * (nx + 1) + x];
  }
  const winFree = (x: number, z: number, r: number, clipAtWalls: boolean) => {
    if (!clipAtWalls) {
      // boundaries are walls — EXCEPT dock edges, which are openings a truck
      // may swing through while turning
      if (x - r < 0 && !docks.includes('W')) return false;
      if (x + r >= nx && !docks.includes('E')) return false;
      if (z - r < 0 && !docks.includes('N')) return false;
      if (z + r >= nz && !docks.includes('S')) return false;
    }
    const x0 = Math.max(0, x - r), x1 = Math.min(nx - 1, x + r);
    const z0 = Math.max(0, z - r), z1 = Math.min(nz - 1, z + r);
    return (P[(z1 + 1) * (nx + 1) + (x1 + 1)] - P[z0 * (nx + 1) + (x1 + 1)]
      - P[(z1 + 1) * (nx + 1) + x0] + P[z0 * (nx + 1) + x0]) === 0;
  };
  const rS = Math.max(1, Math.floor((truck.aisle / cell - 1) / 2));
  const rT = Math.max(rS, Math.floor((truck.turn / cell - 1) / 2));
  return {
    nx, nz,
    // straight windows clip at edges (the dock edge must be enterable);
    // TURN boxes must fit fully inside the floor — the boundary is a wall,
    // and a forklift cannot swing its load through a wall
    straight: (x: number, z: number) => winFree(x, z, rS, true),
    turnOk: (x: number, z: number) => winFree(x, z, rT, false),
    rS,
  };
}

/**
 * BFS over (cell, axis) — axis 0 = travelling along X, 1 = along Z.
 * Straight moves need the width window at the next cell; switching axis needs
 * the TURN window at the current cell. Returns visited states + parents.
 */
function turnBFS(
  floor: Floor, boxes: PlannerBox[], truck: TruckSpec, edges: DockEdge[], cell: number,
) {
  const { nx, nz, straight, turnOk } = buildMasks(floor, boxes, truck, cell, edges);
  const N = nx * nz;
  const visited = new Uint8Array(N * 2);
  const parent = new Int32Array(N * 2).fill(-2);
  const queue: number[] = [];
  const seed = (x: number, z: number, axis: number) => {
    const s = (z * nx + x) * 2 + axis;
    if (parent[s] === -2 && straight(x, z)) { parent[s] = -1; visited[s] = 1; queue.push(s); }
  };
  for (const e of edges) {
    if (e === 'E') for (let z = 0; z < nz; z++) seed(nx - 1, z, 0);
    if (e === 'W') for (let z = 0; z < nz; z++) seed(0, z, 0);
    if (e === 'S') for (let x = 0; x < nx; x++) seed(x, nz - 1, 1);
    if (e === 'N') for (let x = 0; x < nx; x++) seed(x, 0, 1);
  }
  let head = 0;
  while (head < queue.length) {
    const s = queue[head++];
    const axis = s & 1;
    const c = s >> 1;
    const x = c % nx, z = (c / nx) | 0;
    // straight steps along the current axis
    const steps = axis === 0 ? [[x - 1, z], [x + 1, z]] : [[x, z - 1], [x, z + 1]];
    for (const [xx, zz] of steps) {
      if (xx < 0 || xx >= nx || zz < 0 || zz >= nz) continue;
      const ns = (zz * nx + xx) * 2 + axis;
      if (parent[ns] !== -2 || !straight(xx, zz)) continue;
      parent[ns] = s; visited[ns] = 1; queue.push(ns);
    }
    // 90° turn in place (needs the bigger clear square here)
    const ts = c * 2 + (1 - axis);
    if (parent[ts] === -2 && turnOk(x, z)) { parent[ts] = s; visited[ts] = 1; queue.push(ts); }
  }
  return { nx, nz, visited, parent };
}

/** Turn-aware reachability. Obstacles exempt; zones ignored (walkable). */
export function checkReachabilityTurn(
  floor: Floor, boxes: PlannerBox[], truck: TruckSpec, edge: DockEdge | DockEdge[] = 'E', cell = 10,
): ReachResult {
  const edges = Array.isArray(edge) ? edge : [edge];
  const { nx, nz, visited } = turnBFS(floor, boxes, truck, edges, cell);
  const r = Math.max(1, Math.floor((truck.aisle / cell - 1) / 2));
  const margin = r + 1;
  const unreachable: string[] = [];
  for (const b of boxes) {
    const kind = (b as any).kind ?? 'cargo';
    if (kind === 'zone' || kind === 'obstacle') continue;
    const x0 = Math.max(0, Math.floor(b.px / cell) - margin);
    const x1 = Math.min(nx - 1, Math.ceil((b.px + b.l) / cell) - 1 + margin);
    const z0 = Math.max(0, Math.floor(b.pz / cell) - margin);
    const z1 = Math.min(nz - 1, Math.ceil((b.pz + b.w) / cell) - 1 + margin);
    let ok = false;
    for (let z = z0; z <= z1 && !ok; z++) for (let x = x0; x <= x1 && !ok; x++) {
      if (visited[(z * nx + x) * 2] || visited[(z * nx + x) * 2 + 1]) ok = true;
    }
    if (!ok) unreachable.push(b.id);
  }
  const covered = boxes.reduce((s, b) => ((b as any).kind === 'zone' ? s : s + b.l * b.w), 0);
  const obstacles = boxes.filter((b) => ['zone', 'obstacle'].includes((b as any).kind)).length;
  return {
    unreachable,
    reachableCount: boxes.length - obstacles - unreachable.length,
    floorUtil: (covered / (floor.l * floor.w)) * 100,
  };
}

/** Turn-aware route (dock → pallet); also returns the number of 90° turns. */
export function forkliftPathTurn(
  floor: Floor, boxes: PlannerBox[], truck: TruckSpec, targetId: string,
  edge: DockEdge | DockEdge[] = 'E', cell = 10,
): { points: { x: number; z: number }[]; turns: number } | null {
  const target = boxes.find((b) => b.id === targetId);
  if (!target) return null;
  const edges = Array.isArray(edge) ? edge : [edge];
  const { nx, nz, parent } = turnBFS(floor, boxes, truck, edges, cell);
  const r = Math.max(1, Math.floor((truck.aisle / cell - 1) / 2));
  const margin = r + 1;
  const gx0 = Math.max(0, Math.floor(target.px / cell) - margin);
  const gx1 = Math.min(nx - 1, Math.ceil((target.px + target.l) / cell) - 1 + margin);
  const gz0 = Math.max(0, Math.floor(target.pz / cell) - margin);
  const gz1 = Math.min(nz - 1, Math.ceil((target.pz + target.w) / cell) - 1 + margin);
  let goal = -1;
  outer: for (let z = gz0; z <= gz1; z++) for (let x = gx0; x <= gx1; x++) {
    for (const axis of [0, 1]) {
      const s = (z * nx + x) * 2 + axis;
      if (parent[s] !== -2) { goal = s; break outer; }
    }
  }
  if (goal < 0) return null;
  const cells: { x: number; z: number; axis: number }[] = [];
  for (let s = goal; s !== -1; s = parent[s]) {
    const c = s >> 1;
    cells.push({ x: (c % nx) * cell + cell / 2, z: ((c / nx) | 0) * cell + cell / 2, axis: s & 1 });
  }
  cells.reverse();
  let turns = 0;
  for (let i = 1; i < cells.length; i++) if (cells[i].axis !== cells[i - 1].axis) turns++;
  const pts: { x: number; z: number }[] = [];
  for (let i = 0; i < cells.length; i++) {
    if (i === 0 || i === cells.length - 1) { pts.push({ x: cells[i].x, z: cells[i].z }); continue; }
    const a = cells[i - 1], b = cells[i], c = cells[i + 1];
    const collinear = (b.x - a.x) * (c.z - b.z) === (b.z - a.z) * (c.x - b.x);
    if (!collinear) pts.push({ x: b.x, z: b.z });
  }
  return { points: pts, turns };
}
