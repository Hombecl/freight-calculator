export const OUTCOMES = ['usable', 'edit', 'explore'] as const;
export const PURPOSES = ['unknown', 'load', 'pallet', 'quote', 'crew', 'other'] as const;
export const BLOCKERS = ['layout', 'fields', 'math', 'placement', 'download', 'other'] as const;
export function feedbackMeta(tool: string, format: string, outcome: string, purpose: string, blocker: string) {
  if (!['planner', 'warehouse'].includes(tool) || !['pdf', 'csv'].includes(format)
    || !(OUTCOMES as readonly string[]).includes(outcome) || !(PURPOSES as readonly string[]).includes(purpose)
    || (outcome === 'edit' && !(BLOCKERS as readonly string[]).includes(blocker))) return null;
  // Fixed categories only; stays within the first-party collector's 40-character limit.
  return [tool === 'planner' ? 'p' : 'w', format, outcome, purpose, outcome === 'edit' ? blocker : 'none'].join(':');
}
