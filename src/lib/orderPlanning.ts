import type { PackingOptions } from './binPacking';
import {
  estimatePallet,
  PALLET_COLORS,
  parsePalletRequest,
  PalletInputError,
  type PalletRequest,
  type PalletEstimate,
} from "./palletEstimate";

export const ORDER_ENGINE = "order-v1";
export const ORDER_LIMITS = { pallets: 20, fileBytes: 65536 } as const;
export function parseOrder(input: unknown): {
  request: PalletRequest;
  maxPallets: number;
} {
  if (!input || typeof input !== "object")
    throw new PalletInputError("order", "invalid order");
  const o = input as Record<string, unknown>;
  const maxPallets = o.maxPallets ?? 1;
  if (
    typeof maxPallets !== "number" ||
    !Number.isInteger(maxPallets) ||
    maxPallets < 1 ||
    maxPallets > ORDER_LIMITS.pallets
  )
    throw new PalletInputError(
      "maxPallets",
      "must be a whole number from 1 to 20"
    );
  return { request: parsePalletRequest(o.request ?? o), maxPallets };
}
/** Repeated bounded packing, retaining original SKU identity across every pallet. */
export function planOrder(input: unknown, options: PackingOptions = {}) {
  const { request, maxPallets } = parseOrder(input);
  const placed = request.items.map(() => 0);
  const pallets: PalletEstimate[] = [];
  for (let n = 0; n < maxPallets; n++) {
    const indexes = request.items.flatMap((it, i) =>
      placed[i] < it.qty ? [i] : []
    );
    if (!indexes.length) break;
    const estimate = estimatePallet({
      pallet: request.pallet,
      items: indexes.map((i) => ({
        ...request.items[i],
        qty: request.items[i].qty - placed[i],
      })),
    }, options);
    if (!estimate.placedCount) break;
    const serials = [...placed];
    estimate.boxes = estimate.boxes.map((box) => {
      const local = Number(box.id.match(/^sku(\d+)-/)?.[1]);
      const original = indexes[local];
      return { ...box, color: PALLET_COLORS[original % PALLET_COLORS.length], id: `sku${original}-${serials[original]++}` };
    });
    estimate.byItem = estimate.byItem.map((it, i) => ({
      ...it,
      id: `sku${indexes[i]}`,
    }));
    estimate.byItem.forEach((it, i) => {
      placed[indexes[i]] += it.placed;
    });
    pallets.push(estimate);
  }
  const byItem = request.items.map((it, i) => ({
    id: `sku${i}`,
    label: it.label,
    requested: it.qty,
    placed: placed[i],
    remaining: it.qty - placed[i],
  }));
  const unplacedCount = byItem.reduce((s, it) => s + it.remaining, 0);
  return {
    version: ORDER_ENGINE,
    request,
    maxPallets,
    pallets,
    byItem,
    status: unplacedCount ? "partial" : "complete",
    requestedCount: request.items.reduce((s, it) => s + it.qty, 0),
    placedCount: placed.reduce((a, b) => a + b, 0),
    unplacedCount,
    palletCount: pallets.length,
    optimalityProven: false as const,
  };
}
export type OrderPlan = ReturnType<typeof planOrder>;
export const FOOTPRINTS = [
  { id: "EUR", l: 120, w: 80 },
  { id: "GMA", l: 121.92, w: 101.6 },
  { id: "Industrial", l: 120, w: 100 },
];
export function compareOrders(input: unknown) {
  const { request, maxPallets } = parseOrder(input);
  return [
    { id: "current", l: request.pallet.l, w: request.pallet.w },
    ...FOOTPRINTS,
  ].map((p) => {
    const plan = planOrder({
      request: { ...request, pallet: { ...request.pallet, l: p.l, w: p.w } },
      maxPallets,
    });
    return {
      ...p,
      status: plan.status,
      palletCount: plan.palletCount,
      unplacedCount: plan.unplacedCount,
      maxLoadedHeight: Math.max(0, ...plan.pallets.map((p) => p.loadedHeight)),
      area: plan.palletCount * p.l * p.w,
    };
  });
}
/** Positive carton heights mean every supporting carton precedes its dependants. */
export function buildSteps(pallet: Pick<PalletEstimate, "boxes">) {
  return [...pallet.boxes].sort(
    (a, b) =>
      a.py - b.py || a.pz - b.pz || a.px - b.px || a.id.localeCompare(b.id)
  );
}
export type UnitSystem = "metric" | "imperial";
export const lengthFactor = (unit: UnitSystem) =>
  unit === "imperial" ? 2.54 : 1;
export const weightFactor = (unit: UnitSystem) =>
  unit === "imperial" ? 0.45359237 : 1;
export interface OrderFile {
  format: "dimpack3d-order";
  version: 1;
  name: string;
  units: UnitSystem;
  engine: string;
  request: PalletRequest;
  maxPallets: number;
  actuals: Record<string, { height: number; note: string }>;
}
export function orderFile(
  name: string,
  request: PalletRequest,
  maxPallets: number,
  units: UnitSystem,
  actuals: OrderFile["actuals"] = {}
): OrderFile {
  return parseOrderFile({
    format: "dimpack3d-order",
    version: 1,
    name,
    units,
    request,
    maxPallets,
    actuals,
    engine: ORDER_ENGINE,
  });
}
export function parseOrderFile(raw: unknown): OrderFile {
  if (!raw || typeof raw !== "object") throw new Error("file");
  const o = raw as Record<string, unknown>;
  if (
    o.format !== undefined &&
    (o.format !== "dimpack3d-order" || o.version !== 1)
  )
    throw new Error("version");
  const { request, maxPallets } = parseOrder(o);
  if (
    o.name !== undefined &&
    (typeof o.name !== "string" || o.name.length > 80)
  )
    throw new Error("name");
  if (o.units !== undefined && o.units !== "metric" && o.units !== "imperial")
    throw new Error("units");
  const actuals: OrderFile["actuals"] = {};
  if (o.actuals !== undefined) {
    if (!o.actuals || typeof o.actuals !== "object" || Array.isArray(o.actuals))
      throw new Error("actuals");
    const entries = Object.entries(o.actuals);
    if (entries.length > 20) throw new Error("actuals");
    for (const [key, value] of entries) {
      const a = value as { height?: unknown; note?: unknown };
      if (
        !/^\d+$/.test(key) ||
        +key >= maxPallets ||
        !a ||
        typeof a.height !== "number" ||
        !Number.isFinite(a.height) ||
        a.height <= 0 ||
        a.height > 500 ||
        typeof a.note !== "string" ||
        a.note.length > 500
      )
        throw new Error("actuals");
      actuals[key] = { height: a.height, note: a.note };
    }
  }
  return {
    format: "dimpack3d-order",
    version: 1,
    name: typeof o.name === "string" ? o.name : "",
    units: o.units === "imperial" ? "imperial" : "metric",
    engine: typeof o.engine === "string" ? o.engine.slice(0, 80) : ORDER_ENGINE,
    request,
    maxPallets,
    actuals,
  };
}
export function readOrderFile(text: string) {
  if (new TextEncoder().encode(text).byteLength > ORDER_LIMITS.fileBytes)
    throw new Error("size");
  return parseOrderFile(JSON.parse(text));
}
export function csvCell(value: string | number) {
  const text = String(value);
  return `"${
    (/^[=+\-@\t\r]/.test(text) ? "'" : "") + text.replace(/"/g, '""')
  }"`;
}
