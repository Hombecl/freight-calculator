import type { PlannerBox } from './plannerBox';

// Rotation and manual placement can change IDs, so compare physical cargo.
const signature = (b: PlannerBox & { zoneReq?: string }) =>
  JSON.stringify([b.label, ...[b.l, b.w].sort((a, b) => a - b), b.h, b.weight ?? 0, b.zoneReq ?? '']);

/** How many existing pallets have no equivalent in the rebuilt inventory? */
export function removedPalletCount(current: PlannerBox[], rebuilt: PlannerBox[]): number {
  const available = new Map<string, number>();
  for (const b of rebuilt) available.set(signature(b), (available.get(signature(b)) ?? 0) + 1);
  let removed = 0;
  for (const b of current) {
    const key = signature(b), remaining = available.get(key) ?? 0;
    if (remaining) available.set(key, remaining - 1); else removed++;
  }
  return removed;
}
