import { packContainer, type PackingOptions, type PackItemSpec } from "./binPacking";
import { palletChecks, CHECK_SEMANTICS } from "./packChecks";

export const PALLET_LIMITS = {
  types: 20,
  cartons: 200,
  bodyBytes: 32768,
} as const;
export const PALLET_COLORS = [0x2563eb, 0x14b8a6, 0xf59e0b, 0x8b5cf6, 0xf43f5e];
export interface PalletRequest {
  pallet: {
    l: number;
    w: number;
    baseHeight: number;
    maxHeight: number;
    maxWeight: number;
  };
  items: {
    label: string;
    l: number;
    w: number;
    h: number;
    qty: number;
    weight: number;
    keepUpright: boolean;
    maxStack?: number;
  }[];
}
export const PALLET_EXAMPLE: PalletRequest = {
  pallet: { l: 120, w: 80, baseHeight: 15, maxHeight: 160, maxWeight: 750 },
  items: [
    {
      label: "Main cartons",
      l: 60,
      w: 40,
      h: 30,
      qty: 12,
      weight: 8,
      keepUpright: true,
    },
    {
      label: "Small cartons",
      l: 40,
      w: 30,
      h: 20,
      qty: 8,
      weight: 4,
      keepUpright: true,
    },
  ],
};
export class PalletInputError extends Error {
  constructor(public field: string, message: string) {
    super(`${field}: ${message}`);
  }
}
const obj = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
function number(
  v: unknown,
  field: string,
  min: number,
  max: number,
  integer = false
): number {
  if (
    typeof v !== "number" ||
    !Number.isFinite(v) ||
    v < min ||
    v > max ||
    (integer && !Number.isInteger(v))
  ) {
    throw new PalletInputError(
      field,
      `must be ${integer ? "a whole number" : "a number"} from ${min} to ${max}`
    );
  }
  return v;
}
/** One schema for browser worker and REST endpoint; no coercion of invalid inputs. */
export function parsePalletRequest(input: unknown): PalletRequest {
  const body = obj(input),
    p = obj(body.pallet);
  const pallet = {
    l: number(p.l, "pallet.l", 1, 300),
    w: number(p.w, "pallet.w", 1, 300),
    baseHeight: number(p.baseHeight, "pallet.baseHeight", 0, 50),
    maxHeight: number(p.maxHeight, "pallet.maxHeight", 1, 400),
    maxWeight: number(p.maxWeight, "pallet.maxWeight", 0.01, 10000),
  };
  if (pallet.maxHeight <= pallet.baseHeight)
    throw new PalletInputError(
      "pallet.maxHeight",
      "must exceed the pallet base height"
    );
  if (
    !Array.isArray(body.items) ||
    !body.items.length ||
    body.items.length > PALLET_LIMITS.types
  )
    throw new PalletInputError(
      "items",
      `provide 1–${PALLET_LIMITS.types} carton types`
    );
  let total = 0;
  const items = body.items.map((raw, i) => {
    const it = obj(raw),
      prefix = `items[${i}]`;
    if (typeof it.keepUpright !== "boolean")
      throw new PalletInputError(
        `${prefix}.keepUpright`,
        "must be true or false"
      );
    if (
      typeof it.label !== "string" ||
      !it.label.trim() ||
      it.label.length > 60
    )
      throw new PalletInputError(
        `${prefix}.label`,
        "provide a name of 1–60 characters"
      );
    const qty = number(it.qty, `${prefix}.qty`, 1, PALLET_LIMITS.cartons, true);
    total += qty;
    return {
      label: it.label.trim(),
      l: number(it.l, `${prefix}.l`, 0.1, 400),
      w: number(it.w, `${prefix}.w`, 0.1, 400),
      h: number(it.h, `${prefix}.h`, 0.1, 400),
      qty,
      weight: number(it.weight, `${prefix}.weight`, 0.01, 10000),
      keepUpright: it.keepUpright,
      ...(it.maxStack !== undefined
        ? { maxStack: number(it.maxStack, `${prefix}.maxStack`, 0, 10000) }
        : {}),
    };
  });
  if (total > PALLET_LIMITS.cartons)
    throw new PalletInputError(
      "items",
      `maximum ${PALLET_LIMITS.cartons} cartons per estimate`
    );
  return { pallet, items };
}
const round = (n: number) => Math.round(n * 1000) / 1000;
export function estimatePallet(input: unknown, options: PackingOptions = {}) {
  const request = parsePalletRequest(input),
    { pallet, items } = request;
  const specs: PackItemSpec[] = items.map((it, i) => ({
    ...it,
    id: `sku${i}`,
    color: PALLET_COLORS[i % PALLET_COLORS.length],
  }));
  const container = {
    l: pallet.l,
    w: pallet.w,
    h: pallet.maxHeight - pallet.baseHeight,
    maxWeight: pallet.maxWeight,
  };
  const trials = (options.strategy ? [options.strategy] : ["default", "height", "footprint", "layered"] as const).map(
    (strategy) => {
      const result = packContainer(container, specs, strategy, options.ordering);
      const cargoHeight = result.boxes.reduce(
        (h, b) => Math.max(h, b.py + b.h),
        0
      );
      return { strategy, ...result, cargoHeight };
    }
  );
  // Complete placement always beats a shorter partial shipment.
  trials.sort(
    (a, b) => a.unplaced - b.unplaced || a.cargoHeight - b.cargoHeight
  );
  const best = trials[0];
  const requestedCount = items.reduce((n, it) => n + it.qty, 0);
  const requestedWeight = items.reduce((n, it) => n + it.qty * it.weight, 0);
  const requestedVolume = items.reduce(
    (n, it) => n + it.qty * it.l * it.w * it.h,
    0
  );
  const byItem = specs.map((spec) => {
    const placed = best.boxes.filter((b) =>
      b.id.startsWith(`${spec.id}-`)
    ).length;
    return {
      id: spec.id,
      label: spec.label,
      requested: spec.qty,
      placed,
      remaining: spec.qty - placed,
    };
  });
  const notes = ["HEURISTIC_ESTIMATE", "SUPPORT_AREA_NOT_TRANSIT_STABILITY"];
  if (items.some((it) => it.maxStack === undefined))
    notes.push("STACK_LIMITS_NOT_PROVIDED");
  if (requestedWeight > pallet.maxWeight) notes.push("ORDER_EXCEEDS_PAYLOAD");
  if (requestedVolume > pallet.l * pallet.w * container.h)
    notes.push("ORDER_EXCEEDS_VOLUME");
  if (best.unplaced) notes.push("PARTIAL_LOAD");
  return {
    version: "1",
    units: { length: "cm", weight: "kg" },
    status: best.unplaced ? "partial" : "complete",
    requestedCount,
    placedCount: best.boxes.length,
    unplacedCount: best.unplaced,
    cargoHeight: round(best.cargoHeight),
    loadedHeight: round(pallet.baseHeight + best.cargoHeight),
    remainingHeight: round(container.h - best.cargoHeight),
    cargoWeight: round(best.stats.totalWeight),
    requestedWeight: round(requestedWeight),
    // This bound ignores voids and stacking constraints; it is not a feasible plan.
    volumeLowerBoundHeight: round(
      requestedVolume / (pallet.l * pallet.w) + pallet.baseHeight
    ),
    pallet,
    byItem,
    boxes: best.boxes,
    checks: palletChecks({ boxes: best.boxes, specs, unplaced: best.unplaced, cargoWeight: best.stats.totalWeight, maxWeight: pallet.maxWeight }),
    semantics: CHECK_SEMANTICS,
    notes,
    method: {
      name: options.strategy ? "selected-heuristic" : "best-of-four-heuristics",
      optimalityProven: false,
      strategy: best.strategy,
    },
  };
}
export type PalletEstimate = ReturnType<typeof estimatePallet>;
