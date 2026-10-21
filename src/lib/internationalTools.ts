import { perLayer } from './pallets';

export const MARKET_LANGS = ['es', 'pt', 'de', 'fr', 'zh-hans'] as const;
export const ALL_MARKET_LANGS = ['en', 'zh', ...MARKET_LANGS] as const;
export type MarketLanguage = typeof ALL_MARKET_LANGS[number];
export type MarketTool = 'shipping-tools' | 'cbm-calculator' | 'pallet-calculator';
export const MARKET_NAMES: Record<MarketLanguage, string> = { en: 'English', zh: '繁體中文', es: 'Español', pt: 'Português', de: 'Deutsch', fr: 'Français', 'zh-hans': '简体中文' };
export const marketHref = (lang: MarketLanguage, tool: MarketTool) => `${lang === 'en' ? '' : '/' + lang}/${tool}`;
export const marketTag = (lang: MarketLanguage) => lang === 'zh' ? 'zh-Hant' : lang === 'zh-hans' ? 'zh-Hans' : lang;
export interface MarketInput { l: number; w: number; h: number; qty: number; weight: number; pl: number; pw: number; loadHeight: number; payload: number }
export const MARKET_EXAMPLE: MarketInput = { l: 40, w: 30, h: 30, qty: 100, weight: 10, pl: 120, pw: 80, loadHeight: 150, payload: 1000 };
/** Uniform upright cartons; same two-orientation layer calculation as the main pallet tool. */
export function marketResult(i: MarketInput, tool: MarketTool) {
  const dims = [i.l, i.w, i.h];
  if (tool === 'pallet-calculator') dims.push(i.pl, i.pw, i.loadHeight, i.payload);
  if (dims.some(n => !Number.isFinite(n) || n <= 0 || n > 10000) || !Number.isSafeInteger(i.qty) || i.qty < 1 || i.qty > 1e7 || !Number.isFinite(i.weight) || i.weight <= 0 || i.weight > 1e6) return null;
  const volume = i.l * i.w * i.h * i.qty / 1e6;
  const mass = i.weight * i.qty;
  if (tool !== 'pallet-calculator') return { volume, mass, layer: 0, layers: 0, capacity: 0, pallets: 0, weightLimited: false };
  const layer = perLayer(i.l, i.w, i.pl, i.pw);
  const heightLayers = Math.floor(i.loadHeight / i.h + 1e-6);
  const geometric = layer * heightLayers;
  const byWeight = Math.floor(i.payload / i.weight + 1e-6);
  const capacity = Math.min(geometric, byWeight);
  return { volume, mass, layer, layers: layer ? Math.ceil(capacity / layer) : 0, capacity, pallets: capacity ? Math.ceil(i.qty / capacity) : 0, weightLimited: byWeight < geometric };
}

/** Decimal comma accepted without interpreting ambiguous thousands separators. */
export function marketNumber(value: string) {
  const clean = value.trim();
  return /^\d+(?:[.,]\d+)?$/.test(clean) ? Number(clean.replace(',', '.')) : NaN;
}
export function marketCsv(rows: Array<[string, string | number]>) {
  return '\uFEFF' + rows.map(row => row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')).join('\r\n');
}
