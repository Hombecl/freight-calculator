/**
 * plannerBox.ts — the placed-box data shape shared by the engine, the realism
 * checks, export, persistence and the 3D view.
 *
 * ⛔ This used to live inside components/InteractiveLoadPlanner.tsx, so every
 * pure lib file — binPacking, realism, warehouse, exportPlan, plans — imported a
 * type from a React component. That made the "pure, testable" engine depend on
 * the UI layer, and it broke the moment functions/ was typechecked for the first
 * time: /api/pack -> binPacking -> a .tsx file, which the Workers tsconfig
 * cannot compile (TS6142, --jsx not set).
 *
 * Data shapes belong in lib/. The component re-exports this name so existing
 * imports keep working.
 */
export interface PlannerBox {
  id: string;
  label: string;
  l: number; // size along X
  w: number; // size along Z
  h: number; // size along Y (up)
  px: number; // min-corner X in [0, L-l]
  py: number; // min-corner Y (layer base) in [0, H-h]
  pz: number; // min-corner Z in [0, W-w]
  color: number;
  weight?: number; // per-unit weight (optional; carried through for stats)
  group?: string; // keep-together group (carried through for export)
  unloadOrder?: number; // LIFO unload order (carried through for export)
}
