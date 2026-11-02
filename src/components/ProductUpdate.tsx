import { Link } from 'react-router-dom';
import { IS_ZH } from '../lib/locale';

// Keep the release date fixed. Publish quantified claims only with a reproducible benchmark.
export default function ProductUpdate({ planner = false }: { planner?: boolean }) {
  const T = (en: string, zh: string) => IS_ZH ? zh : en;
  return (
    <aside aria-label={T('Product updates', '產品更新')} className="rounded-xl border border-blue-200 bg-blue-50 p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-blue-800">
        <span>{T('CALCULATION UPDATE', '裝載計算更新')}</span>
        <time dateTime="2026-11-03">{T('3 Nov 2026', '2026 年 11 月 3 日')}</time>
      </div>
      <h2 className="mt-2 text-lg font-bold text-slate-900">{T('Compare real layouts. Choose the plan that fits your work.', '比較真實擺法，選擇適合你工作嘅方案。')}</h2>
      <p className="mt-2 text-sm text-slate-700">
        {T('We now retain and compare distinct, checked layouts using the same cargo and rules. In 91 single-SKU benchmark cases, 26 packed more cartons than our previous release; none packed fewer.',
          '現在可保留及比較沿用相同貨單與限制、通過檢查嘅不同擺法。91 組單一箱款測試中，26 組比上一版裝得更多，沒有減少。')}
      </p>
      <details className="mt-3 text-sm text-slate-700">
        <summary className="cursor-pointer font-semibold text-blue-800 underline decoration-blue-300 underline-offset-4">{T('What changed & how we measured it', '更新內容與測試方法')}</summary>
        <div className="mt-3 space-y-2 leading-relaxed">
          <p>{T('26 cases improved and 65 were unchanged compared with our 24 October release, using the same container, carton quantities and allowed orientations. These are synthetic single-SKU tests, not customer shipments or a mixed-cargo benchmark. More search takes more time; the calculation remains cancellable.',
            '相比 10 月 24 日版本，26 組改善、65 組不變；兩個版本使用相同貨櫃、紙箱數量及允許方向。這是模擬單一箱款測試，並非客戶貨單或混裝測試。深入搜索需要更多時間，計算期間仍可取消。')}</p>
          <p>{T('Example: 60 × 40 × 35 cm cartons in a 40HQ container (1203 × 235 × 269 cm) increased from 878 to 886 cartons: 8 more. Improved plans also pass separate geometry, support and constraint checks.',
            '例子：60 × 40 × 35 cm 紙箱放入 40HQ 貨櫃（1203 × 235 × 269 cm），由 878 箱增至 886 箱，多 8 箱。改善後的方案亦須通過獨立的幾何、支撐及限制檢查。')}</p>
          <p>{T('Calculations now run in the background, so the page stays responsive. You can cancel and retry; exports wait for the current calculation to finish so you do not download an outdated plan.',
            '計算現在於背景執行，頁面仍可操作，亦可取消及重試。匯出會等待當前計算完成，避免下載過時方案。')}</p>
          <p><a className="text-blue-800 underline underline-offset-4" href="https://brimload.com/t1/benchmark/dimpack3d_head_to_head_20261016.csv">{T('Public benchmark input data (CSV)', '公開測試輸入資料（CSV）')}</a></p>
        </div>
      </details>
      {!planner && <Link to="/planner" className="mt-3 inline-block text-sm font-bold text-blue-800 underline underline-offset-4">{T('Try the updated planner →', '試用更新後的裝櫃工具 →')}</Link>}
    </aside>
  );
}
