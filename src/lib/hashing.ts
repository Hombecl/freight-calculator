/** Canonical cm/kg hash payload: six decimal places, sorted keys, stable array order. */
export function canonicalJson(value: unknown): string {
  const canonical = (v: unknown): unknown => {
    if (typeof v === 'number') return Number(v.toFixed(6));
    if (Array.isArray(v)) return v.map(canonical);
    if (v && typeof v === 'object') return Object.fromEntries(
      Object.entries(v).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .map(([key, entry]) => [key, canonical(entry)]),
    );
    return v;
  };
  return JSON.stringify(canonical(value));
}
