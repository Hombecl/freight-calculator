/**
 * packChecks.ts — the reality-check library as an API-shaped `checks[]`.
 *
 * Why (2026-09-10 review): /api/pack returned placements + stats but NOT the
 * checks the planner shows, so an integrator could read "no warnings" as
 * "nothing wrong" when in fact nothing had been evaluated. Every check below
 * is returned on every call with an explicit status:
 *   pass | fail | warn | not_evaluated
 * and the assumption it rests on. `not_evaluated` is returned — never
 * omitted — when the input needed for that check was not supplied (door
 * aperture, axle geometry, tare, zones). An integrator who wants a check to
 * count must send the input; the response tells them which.
 *
 * These are SCREENS against numbers the caller supplied. They do not certify
 * transport stability, road legality, dangerous-goods compatibility or a
 * receiver's acceptance — that is stated in `semantics` on every response.
 */

import type { PlannerBox } from './plannerBox';
import type { PackItemSpec, PackContainer } from './binPacking';
import { axleLoads, cogHeight, heavyOverLight, loadVoids, type AxleConfig } from './realism';

export type CheckStatus = 'pass' | 'fail' | 'warn' | 'not_evaluated';
export interface Check {
  code: string;
  status: CheckStatus;
  observed?: number | string;
  limit?: number | string;
  /** affected item/box ids where relevant (capped) */
  ids?: string[];
  assumption: string;
}

export const CHECK_SEMANTICS =
  'Checks are screens against numbers you supplied. not_evaluated means the input for that check was not sent (see assumption) — it is never a pass. Passing checks do not certify transport stability, road legality, dangerous-goods compatibility or receiver acceptance.';

export interface Door { w: number; h: number }

/** ISO container presets an integrator can name instead of sending door/tare. */
export const CONTAINER_PRESETS: Record<string, { l: number; w: number; h: number; maxWeight: number; door: Door; tare: number }> = {
  '20gp': { l: 589, w: 235, h: 239, maxWeight: 28200, door: { w: 234, h: 228 }, tare: 2300 },
  '40gp': { l: 1203, w: 235, h: 239, maxWeight: 26700, door: { w: 234, h: 228 }, tare: 3750 },
  '40hq': { l: 1203, w: 235, h: 269, maxWeight: 26500, door: { w: 234, h: 258 }, tare: 3900 },
};

/**
 * Can this carton pass through the door in ANY allowed orientation? Moving
 * along the container axis its cross-section (two of its dims) must fit the
 * aperture. keepUpright pins h vertical. (Same rule the planner uses.)
 */
export function fitsDoor(s: Pick<PackItemSpec, 'l' | 'w' | 'h' | 'keepUpright'>, door: Door | null | undefined): boolean {
  if (!door) return true;
  const dims = [s.l, s.w, s.h];
  if (s.keepUpright) return Math.min(s.l, s.w) <= door.w && s.h <= door.h;
  for (let vert = 0; vert < 3; vert++)
    for (let across = 0; across < 3; across++)
      if (across !== vert && dims[across] <= door.w && dims[vert] <= door.h) return true;
  return false;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const cap = (ids: string[]) => ids.slice(0, 20);

export interface ContainerCheckInput {
  container: PackContainer & { door?: Door | null; axles?: AxleConfig | null; tare?: number | null };
  specs: PackItemSpec[];
  boxes: PlannerBox[];
  unplaced: number;
  totalWeight: number;
}

/** Container / truck checks — the API surface of the planner's reality checks. */
export function containerChecks(i: ContainerCheckInput): Check[] {
  const { container: c, specs, boxes, unplaced, totalWeight } = i;
  const out: Check[] = [];
  const weighted = specs.some((s) => s.weight > 0);
  const requested = specs.reduce((n, s) => n + s.qty, 0);

  out.push({
    code: 'PLACEMENT_COMPLETE',
    status: unplaced ? 'fail' : 'pass',
    observed: `${boxes.length}/${requested} placed`,
    assumption: 'Extreme-Point heuristic with ≥60% base support, collision-free; unplaced cartons did not fit under the constraints given. Not a proof of minimum space.',
  });

  // door aperture — needs door dims (or a preset)
  if (c.door) {
    const bad = specs.filter((s) => !fitsDoor(s, c.door)).map((s) => s.id);
    out.push({
      code: 'DOOR_APERTURE',
      status: bad.length ? 'fail' : 'pass',
      observed: bad.length ? `${bad.length} item type(s) cannot pass the door in any allowed orientation` : 'all item types pass',
      limit: `${c.door.w}×${c.door.h} cm`,
      ids: cap(bad),
      assumption: 'Carton cross-section vs door aperture only; forklift lift-and-tilt clearance for palletised cargo is not modelled.',
    });
  } else {
    out.push({ code: 'DOOR_APERTURE', status: 'not_evaluated', assumption: 'Send container.door {w,h} or container.preset ("20gp"|"40gp"|"40hq") to evaluate. Interior height is NOT the door height (ISO ≈ 228 cm vs 239 cm).' });
  }

  // payload
  if (c.maxWeight) {
    out.push({
      code: 'PAYLOAD',
      status: !weighted ? 'not_evaluated' : totalWeight <= c.maxWeight + 1e-6 ? 'pass' : 'fail',
      observed: r1(totalWeight), limit: c.maxWeight,
      assumption: weighted ? 'Sum of placed carton weights vs container.maxWeight; packing already refuses cartons over the limit.' : 'No item weights supplied, so payload cannot be evaluated.',
    });
  } else {
    out.push({ code: 'PAYLOAD', status: 'not_evaluated', observed: r1(totalWeight), assumption: 'Send container.maxWeight (kg) to evaluate.' });
  }

  // stacking inputs
  const noStack = specs.filter((s) => s.maxStack === undefined).map((s) => s.id);
  out.push({
    code: 'STACK_LIMITS_PROVIDED',
    status: noStack.length ? 'warn' : 'pass',
    observed: noStack.length ? `${noStack.length} item type(s) without maxStack` : 'all item types',
    ids: cap(noStack),
    assumption: noStack.length ? 'Items without maxStack were treated as unlimited crush strength. Send maxStack (kg on top) — estimate from ECT via the McKee formula if unknown.' : 'Per-item maxStack enforced with load propagation through the stack.',
  });

  // heavy over light + CoG height (need weights)
  if (weighted) {
    const hol = heavyOverLight(boxes as (PlannerBox & { weight?: number })[]);
    out.push({
      code: 'HEAVY_OVER_LIGHT',
      status: hol.length ? 'warn' : 'pass',
      observed: hol.length ? `${hol.length} carton(s) ≥25% heavier than the carton beneath` : 'none',
      ids: cap(hol),
      assumption: 'Compares each carton to the lightest carton directly supporting it; 0 kg is treated as unknown, not light.',
    });
    const cog = cogHeight(boxes as (PlannerBox & { weight?: number })[]);
    out.push({
      code: 'COG_HEIGHT',
      status: cog ? (cog.pct > 55 ? 'warn' : 'pass') : 'not_evaluated',
      observed: cog ? `${r1(cog.pct)}% of loaded height` : undefined,
      limit: '55%',
      assumption: 'Weighted centre of gravity height as % of loaded height; above ~55% is top-heavy under braking/cornering. Container/vehicle mass excluded.',
    });
  } else {
    out.push({ code: 'HEAVY_OVER_LIGHT', status: 'not_evaluated', assumption: 'Send items[].weight to evaluate.' });
    out.push({ code: 'COG_HEIGHT', status: 'not_evaluated', assumption: 'Send items[].weight to evaluate.' });
  }

  // load voids
  const voids = loadVoids(boxes, { l: c.l });
  const worst = Math.max(voids.doorSlack, voids.biggestGap);
  out.push({
    code: 'LOAD_VOIDS',
    status: boxes.length === 0 ? 'not_evaluated' : worst > 15 ? 'warn' : 'pass',
    observed: `door slack ${r1(voids.doorSlack)} cm, biggest gap ${r1(voids.biggestGap)} cm`,
    limit: '15 cm',
    assumption: 'Gaps measured along the container length axis only (footprints projected); lateral and vertical voids are not measured. Over 15 cm: block, brace or dunnage.',
  });

  // axles (trucks)
  if (c.axles) {
    if (!weighted) {
      out.push({ code: 'AXLE_LOADS', status: 'not_evaluated', assumption: 'Axle geometry supplied but no item weights.' });
    } else {
      const ax = axleLoads(boxes as (PlannerBox & { weight?: number })[], c.axles);
      out.push({
        code: 'AXLE_LOADS',
        status: ax.frontOver || ax.rearOver ? 'fail' : 'pass',
        observed: `front ${r1(ax.front)} kg, rear ${r1(ax.rear)} kg (cargo only)`,
        limit: `front ${c.axles.frontLimit} kg, rear ${c.axles.rearLimit} kg`,
        assumption: 'Two-support lever rule on CARGO only, vs the cargo share limits you supplied. Tractor, trailer and fuel mass are not included; this is not a legal axle-weight determination.',
      });
    }
  } else {
    out.push({ code: 'AXLE_LOADS', status: 'not_evaluated', assumption: 'Send container.axles {frontPos, rearPos, frontLimit, rearLimit} (cm / kg) to evaluate a trailer.' });
  }

  // VGM
  out.push({
    code: 'VGM',
    status: 'not_evaluated',
    observed: c.tare ? `cargo ${r1(totalWeight)} + tare ${c.tare} = ${r1(totalWeight + c.tare)} kg (cargo + container only)` : `cargo ${r1(totalWeight)} kg`,
    assumption: 'A SOLAS VGM must include pallets, dunnage, securing material and be produced by an approved method; this figure is an input to that process, not a declaration.',
  });

  // zones
  out.push({
    code: 'ZONE_SEGREGATION',
    status: 'not_evaluated',
    assumption: 'Temperature/hazmat zone checks require zone geometry and per-item zoneReq, available in the planner but not on this endpoint.',
  });

  return out;
}

export interface PalletCheckInput {
  boxes: PlannerBox[];
  specs: Pick<PackItemSpec, 'id' | 'qty' | 'weight' | 'maxStack'>[];
  unplaced: number;
  cargoWeight: number;
  maxWeight: number;
}

/** Pallet checks — shared by /api/pallet-estimate, /api/order-plan and /api/order-quote. */
export function palletChecks(i: PalletCheckInput): Check[] {
  const { boxes, specs, unplaced, cargoWeight, maxWeight } = i;
  const out: Check[] = [];
  const requested = specs.reduce((n, s) => n + s.qty, 0);
  out.push({
    code: 'PLACEMENT_COMPLETE',
    status: unplaced ? 'fail' : 'pass',
    observed: `${boxes.length}/${requested} placed`,
    assumption: 'Best of three heuristics; not a proven minimum height.',
  });
  out.push({
    code: 'PAYLOAD',
    status: cargoWeight <= maxWeight + 1e-6 ? 'pass' : 'fail',
    observed: r1(cargoWeight), limit: maxWeight,
    assumption: 'Placed cargo weight vs pallet.maxWeight (cargo only, tare excluded).',
  });
  const noStack = specs.filter((s) => s.maxStack === undefined).map((s) => s.id);
  out.push({
    code: 'STACK_LIMITS_PROVIDED',
    status: noStack.length ? 'warn' : 'pass',
    observed: noStack.length ? `${noStack.length} item type(s) without maxStack` : 'all item types',
    ids: cap(noStack),
    assumption: noStack.length ? 'Items without maxStack were treated as unlimited crush strength; heights may be optimistic for weak board.' : 'Per-item maxStack enforced with load propagation.',
  });
  const hol = heavyOverLight(boxes as (PlannerBox & { weight?: number })[]);
  out.push({
    code: 'HEAVY_OVER_LIGHT',
    status: hol.length ? 'warn' : 'pass',
    observed: hol.length ? `${hol.length} carton(s) ≥25% heavier than the carton beneath` : 'none',
    ids: cap(hol),
    assumption: 'Compares each carton to the lightest carton directly supporting it.',
  });
  const cog = cogHeight(boxes as (PlannerBox & { weight?: number })[]);
  out.push({
    code: 'COG_HEIGHT',
    status: cog ? (cog.pct > 55 ? 'warn' : 'pass') : 'not_evaluated',
    observed: cog ? `${r1(cog.pct)}% of cargo height` : undefined,
    limit: '55%',
    assumption: 'Weighted CoG height as % of cargo height (pallet base excluded); above ~55% is top-heavy for forklift travel and transit.',
  });
  out.push({
    code: 'SUPPORT_AREA',
    status: boxes.length ? 'pass' : 'not_evaluated',
    limit: '≥60% base support',
    assumption: 'Every placed carton rests on ≥60% of its base; this is geometric support, not transit stability or wrap/strap adequacy.',
  });
  return out;
}

export const summarize = (checks: Check[]) => ({
  evaluated: checks.filter((c) => c.status !== 'not_evaluated').length,
  notEvaluated: checks.filter((c) => c.status === 'not_evaluated').map((c) => c.code),
  failed: checks.filter((c) => c.status === 'fail').map((c) => c.code),
  warned: checks.filter((c) => c.status === 'warn').map((c) => c.code),
});
