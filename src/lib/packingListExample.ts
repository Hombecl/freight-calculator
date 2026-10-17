import type { PackItemSpec } from './binPacking';

/** Matches public/examples/container-packing-list.csv; regression-tested together. */
export const PACKING_LIST_EXAMPLE: PackItemSpec[] = [
  { id: 'example-master', label: 'Master carton', l: 60, w: 40, h: 40, weight: 18, qty: 10, keepUpright: true, color: 0xfbbf24 },
  { id: 'example-small', label: 'Small carton', l: 40, w: 30, h: 30, weight: 10, qty: 10, keepUpright: true, color: 0x60a5fa },
];
