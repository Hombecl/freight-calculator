import type { PackItemSpec } from '../src/lib/binPacking';

// Two hero scenes, one per level of the packing problem — the tabs above the
// demo make it obvious WHICH problem is being shown. Both must look FULL.
export const CONTAINER_SCENE = {
  container: { l: 589, w: 235, h: 239, maxWeight: 28200 }, // 20' GP
  specs: [
    { id: 'd1', label: 'Master carton', l: 58, w: 46, h: 47, weight: 18, qty: 160, color: 0xfbbf24 },
    { id: 'd2', label: 'Half carton', l: 48, w: 39, h: 39, weight: 12, qty: 90, color: 0x60a5fa },
    { id: 'd3', label: 'Fragile', l: 45, w: 38, h: 29, weight: 6, qty: 30, color: 0x34d399, maxStack: 0 },
  ] as PackItemSpec[],
};
export const CARTON_SCENE = {
  container: { l: 60, w: 40, h: 40 }, // a single master carton
  specs: [
    { id: 'u1', label: 'Product unit', l: 14, w: 9, h: 8, weight: 0.4, qty: 100, color: 0xfbbf24 },
    { id: 'u2', label: 'Accessory box', l: 12, w: 8, h: 6, weight: 0.2, qty: 40, color: 0x60a5fa },
  ] as PackItemSpec[],
};
// ⛔ 2026-08-26 (POSITIONING.md v2 §2): the hero defaults to the CONTAINER scene
// again, and it is the mixed-carton one on purpose. Pallet questions are 63% of
// search demand and remain the acquisition WEDGE — but the differentiated thing,
// the one nothing else free does, is mixed-load 3D planning with operator
// checks. v1 reasoned from demand share straight to company position in one
// step; the homepage should EARN visitors via pallet questions and then show
// them the planner, not declare itself a pallet calculator.
export const PALLET_SCENE = {
  container: { l: 122, w: 102, h: 152, maxWeight: 1134 },
  specs: [
    { id: 'p1', label: 'Case 40×30×25', l: 40, w: 30, h: 25, weight: 12, qty: 45, color: 0xfbbf24 },
    { id: 'p2', label: 'Case 30×25×20', l: 30, w: 25, h: 20, weight: 8, qty: 18, color: 0x60a5fa },
  ] as PackItemSpec[],
};

export const HERO_SCENES = { container: CONTAINER_SCENE, pallet: PALLET_SCENE, carton: CARTON_SCENE };
