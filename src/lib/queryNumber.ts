/** Preserve explicit zero; absent, blank and non-finite query values use the default. */
export function queryNumber(value: string | null, fallback: number): number {
  const parsed = value === null || value.trim() === '' ? NaN : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
