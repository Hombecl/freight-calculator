import { Link } from 'react-router-dom';
import { IS_ZH } from '../lib/locale';

// Keep the release date fixed. Publish quantified claims only with a reproducible benchmark.
export default function ProductUpdate({ planner = false }: { planner?: boolean }) {
  const T = (en: string, zh: string) => IS_ZH ? zh : en;
  return (
    <aside aria-label={T('Product updates', '產品更新')} className="rounded-xl border border-blue-200 bg-blue-50 p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-blue-800">
        <span>{T('CALCULATION UPDATE', '裝載計算更新')}</span>
        <time dateTime="2026-10-22">{T('22 Oct 2026', '2026 年 10 月 22 日')}</time>
      </div>
      <h2 className="mt-2 text-lg font-bold text-slate-900">{T('Fit more cartons. Keep planning while we calculate.', '裝得更多，計算期間亦可繼續操作。')}</h2>
      <p className="mt-2 text-sm text-slate-700">
        {T('In 91 single-SKU benchmark cases, our updated calculation packed 10.3% more cartons on average than the previous version. Results vary with your cargo and constraints.',
          '在 91 組單一箱款測試中，新版計算的平均可裝箱數較上一版增加 10.3%。實際結果視乎貨物及裝載限制。')}
      </p>
      <details className="mt-3 text-sm text-slate-700">
        <summary className="cursor-pointer font-semibold text-blue-800 underline decoration-blue-300 underline-offset-4">{T('What changed & how we measured it', '更新內容與測試方法')}</summary>
        <div className="mt-3 space-y-2 leading-relaxed">
          <p>{T('83 cases fitted more cartons; 8 were unchanged; none fitted fewer. The 10.3% figure is the average percentage increase in carton count per case, using the same container, carton quantities and allowed orientations in both versions. These are synthetic single-SKU tests, not customer shipments or a mixed-cargo benchmark.',
            '83 組可裝更多紙箱，8 組不變，沒有減少。10.3% 是每組可裝箱數增幅的平均值；兩個版本使用相同貨櫃、紙箱數量及允許方向。這是模擬單一箱款測試，並非客戶貨單或混裝測試。')}</p>
          <p>{T('Example: 60 × 40 × 35 cm cartons in a 40HQ container (1203 × 235 × 269 cm) increased from 820 to 878 cartons: 58 more (+7.1%). Improved plans also pass separate geometry, support and constraint checks.',
            '例子：60 × 40 × 35 cm 紙箱放入 40HQ 貨櫃（1203 × 235 × 269 cm），由 820 箱增至 878 箱，多 58 箱（+7.1%）。改善後的方案亦須通過獨立的幾何、支撐及限制檢查。')}</p>
          <p>{T('Calculations now run in the background, so the page stays responsive. You can cancel and retry; exports wait for the current calculation to finish so you do not download an outdated plan.',
            '計算現在於背景執行，頁面仍可操作，亦可取消及重試。匯出會等待當前計算完成，避免下載過時方案。')}</p>
          <p><a className="text-blue-800 underline underline-offset-4" href="https://brimload.com/t1/benchmark/dimpack3d_head_to_head_20261016.csv">{T('Public benchmark input data (CSV)', '公開測試輸入資料（CSV）')}</a></p>
        </div>
      </details>
      {!planner && <Link to="/planner" className="mt-3 inline-block text-sm font-bold text-blue-800 underline underline-offset-4">{T('Try the updated planner →', '試用更新後的裝櫃工具 →')}</Link>}
    </aside>
  );
}
