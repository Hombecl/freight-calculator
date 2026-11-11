/** Optional, bounded values shared by the signup UI and API. */
export const API_USE_CASES = [
  ['carton-packing', 'Product → carton packing', '產品裝箱'],
  ['container-loading', 'Container loading', '貨櫃裝載'],
  ['pallet-planning', 'Pallet planning', '卡板規劃'],
  ['quoting', 'Shipping quotes', '運輸報價'],
  ['other', 'Other / exploring', '其他／探索中'],
] as const;
export const API_VOLUMES = ['under-1000', '1000-10000', '10000-100000', 'over-100000', 'unsure'] as const;
export function apiDemand(data: Record<string, unknown>) {
  return {
    apiPurpose: API_USE_CASES.some(([v]) => v === data.apiPurpose) ? String(data.apiPurpose) : '',
    monthlyVolume: API_VOLUMES.some(v => v === data.monthlyVolume) ? String(data.monthlyVolume) : '',
  };
}
