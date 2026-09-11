import { CONTAINER_PRESETS, fitsDoor } from './packChecks';

export function containerCountLimit(item: { l: number; w: number; h: number; weight: number }, preset: string) {
  const c = CONTAINER_PRESETS[preset];
  const doorFits = fitsDoor(item, c.door);
  return { doorFits, maxCount: doorFits ? (item.weight > 0 ? Math.floor(c.maxWeight / item.weight) : Infinity) : 0 };
}

/** Legacy scene coordinates use z for height. Keep lower boxes when capping. */
export function constrainContainerScenarios<T extends { count: number; utilization: number; items: { z: number; x: number; y: number }[] }>(
  scenarios: T[], item: { l: number; w: number; h: number; weight: number }, preset: string,
): T[] {
  const { maxCount } = containerCountLimit(item, preset);
  return scenarios.map(s => {
    const count = Math.min(s.count, maxCount);
    return { ...s, count, utilization: s.count ? s.utilization * count / s.count : 0,
      items: [...s.items].sort((a, b) => a.z - b.z || a.x - b.x || a.y - b.y).slice(0, count) };
  }).sort((a, b) => b.count - a.count);
}
