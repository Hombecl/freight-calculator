import {computeStats, packWithConstraints, type ConstrainedResult, type PackContainer, type PackItemSpec} from './binPacking';
import {singleSkuPacking, verifySingleSkuPacking} from './singleSkuPacking';

export interface OptimizedResult extends ConstrainedResult {
  optimization: { baselineCount: number; addedCount: number; method: 'general' | 'single-sku'; };
}
export type PackingPhase = 'packing' | 'improving' | 'checking';
/** Always retain the original plan unless an independently checked candidate
 * places more cargo. Multi-SKU and unloading-zone behavior stay with the general solver. */
export function optimizePacking(container: PackContainer, specs: PackItemSpec[], progress?: (phase: PackingPhase) => void): OptimizedResult {
  progress?.('packing');
  const baseline = packWithConstraints(container, specs);
  const original: OptimizedResult = {...baseline, optimization: {baselineCount: baseline.boxes.length, addedCount: 0, method: 'general'}};
  const active = specs.filter(s => s.qty > 0);
  if (active.length !== 1 || baseline.unplaced === 0) return original;
  progress?.('improving');
  const candidate = singleSkuPacking(container, active[0]);
  if (candidate.length <= baseline.boxes.length) return original;
  progress?.('checking');
  if (!verifySingleSkuPacking(candidate, container, active[0])) return original;
  return {
    boxes: candidate, unplaced: baseline.boxes.length + baseline.unplaced - candidate.length,
    stats: {...computeStats(candidate, container), totalCount: candidate.length},
    zones: [{unloadOrder: active[0].unloadOrder ?? 1, xStart: 0, xEnd: container.l, count: candidate.length}],
    optimization: {baselineCount: baseline.boxes.length, addedCount: candidate.length - baseline.boxes.length, method: 'single-sku'},
  };
}
