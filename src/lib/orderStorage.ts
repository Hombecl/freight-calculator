import { parseOrderFile, type OrderFile, parseOrder } from "./orderPlanning";
import type { PalletRequest } from "./palletEstimate";
export interface DeviceOrder {
  id: string;
  updated: string;
  file: OrderFile;
}
export interface RuleProfile {
  id: string;
  name: string;
  pallet: PalletRequest["pallet"];
  maxPallets: number;
}
const ORDER_KEY = "dp.orders.v1",
  RULE_KEY = "dp.order-rules.v1";
function read(key: string): unknown[] {
  const text = localStorage.getItem(key);
  if (!text) return [];
  if (text.length > 2_000_000) throw new Error("storage");
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed) || parsed.length > 50) throw new Error("storage");
  return parsed;
}
export function loadDeviceOrders(): DeviceOrder[] {
  return read(ORDER_KEY).map((raw) => {
    const row = raw as DeviceOrder;
    if (!row || typeof row.id !== "string" || typeof row.updated !== "string")
      throw new Error("storage");
    return { id: row.id, updated: row.updated, file: parseOrderFile(row.file) };
  });
}
export function writeDeviceOrders(orders: DeviceOrder[]) {
  if (orders.length > 50) throw new Error("storage");
  localStorage.setItem(ORDER_KEY, JSON.stringify(orders));
}
export function loadRules(): RuleProfile[] {
  return read(RULE_KEY).map((raw) => {
    const row = raw as RuleProfile;
    if (
      !row ||
      typeof row.id !== "string" ||
      typeof row.name !== "string" ||
      row.name.length > 80
    )
      throw new Error("storage");
    const { request, maxPallets } = parseOrder({
      maxPallets: row.maxPallets,
      request: {
        pallet: row.pallet,
        items: [
          {
            label: "validation",
            l: 1,
            w: 1,
            h: 1,
            qty: 1,
            weight: 1,
            keepUpright: true,
          },
        ],
      },
    });
    return { id: row.id, name: row.name, pallet: request.pallet, maxPallets };
  });
}
export function writeRules(rules: RuleProfile[]) {
  if (rules.length > 50) throw new Error("storage");
  localStorage.setItem(RULE_KEY, JSON.stringify(rules));
}
