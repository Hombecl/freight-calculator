import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useApp } from '../../context/AppContext';
import { track } from '../../lib/track';
import { PACKING_LIST_EXAMPLE } from '../../lib/packingListExample';

export default function ExcelLoadPlanGuide() {
  const {lang} = useApp();
  const T = (en:string,zh:string) => lang === 'zh' ? zh : en;
  const cartons = PACKING_LIST_EXAMPLE.reduce((n,s)=>n+s.qty,0);
  const weight = PACKING_LIST_EXAMPLE.reduce((n,s)=>n+s.qty*s.weight,0);
  const cbm = PACKING_LIST_EXAMPLE.reduce((n,s)=>n+s.qty*s.l*s.w*s.h/1e6,0);
  const title = T('Excel Packing List to 3D Container Load Plan', 'Excel 貨單轉 3D 裝櫃圖：完整實例');
  return <article className="max-w-4xl mx-auto px-4 py-8 text-slate-700">
    <Helmet><title>{title} | DimPack3D</title><meta name="description" content={T('Download a free CSV packing-list example for Excel. Review columns and units, reproduce a 20-carton load, then export PDF or CSV from the 3D planner.', '下載可用 Excel 開啟的免費 CSV 貨單範例，核對欄位與單位，重現 20 箱裝載，再由 3D 規劃器匯出 PDF 或 CSV。')}/></Helmet>
    <Link to="/guides" className="text-blue-700 underline">{T('All guides','全部指南')}</Link>
    <h1 className="mt-4 text-3xl font-bold text-slate-900">{title}</h1>
    <p className="mt-4">{T('A spreadsheet records what you need to ship. A load plan checks where each carton can go. Work through this small, reproducible example before importing your own shipment.', '試算表記錄要運送甚麼；裝櫃圖檢查每箱可以放在哪裏。先完成這個可重現的小例子，再匯入自己的貨單。')}</p>
    <div className="my-6 flex flex-wrap gap-3">
      <a href="/examples/container-packing-list.csv" download className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white" onClick={()=>track('packing_guide_action','download_example')}>{T('Download Excel-compatible CSV','下載 Excel 可用的 CSV')}</a>
      <Link to="/planner?demo=excel" className="rounded-lg border border-blue-300 px-4 py-3 font-semibold text-blue-700" onClick={()=>track('packing_guide_action','open_example')}>{T('Open this example in 3D','用 3D 開啟此範例')}</Link>
    </div>
    <p className="text-sm">{T('This file is an input template, not an Excel optimization macro. Planning needs no account. Free PDF and CSV exports from the planner ask for an email; product updates are optional.', '此檔案是輸入範本，並非 Excel 最佳化巨集。規劃毋須帳戶；規劃器免費 PDF／CSV 匯出需填電郵，產品消息可自行選擇。')}</p>
    <h2 className="mt-8 text-xl font-bold text-slate-900">{T('1. Check the packing list','1. 核對貨單')}</h2>
    <div className="my-4 overflow-x-auto"><table className="w-full text-sm border-collapse"><caption className="text-left mb-2">{T('Two carton types; dimensions in cm, weight per carton in kg.','兩種箱型；尺寸以 cm、每箱重量以 kg 表示。')}</caption><thead><tr>{['SKU',T('L × W × H (cm)','長 × 闊 × 高 (cm)'),T('kg each','每箱 kg'),T('Quantity','數量')].map(h=><th key={h} className="border p-3 text-left">{h}</th>)}</tr></thead><tbody>{PACKING_LIST_EXAMPLE.map(s=><tr key={s.id}><td className="border p-3">{s.label}</td><td className="border p-3">{s.l} × {s.w} × {s.h}</td><td className="border p-3">{s.weight}</td><td className="border p-3">{s.qty}</td></tr>)}</tbody></table></div>
    <p>{T(`Expected input totals: ${cartons} cartons, ${weight} kg cargo, ${cbm.toFixed(2)} m³. Cargo weight excludes container tare.`, `預期輸入合計：${cartons} 箱、貨重 ${weight} kg、${cbm.toFixed(2)} m³。貨重不包括貨櫃自重。`)}</p>
    <h2 className="mt-8 text-xl font-bold text-slate-900">{T('2. Import, map and review','2. 匯入、對應及核對')}</h2>
    <ol className="my-4 list-decimal pl-6 space-y-2">
      <li>{T('Open the planner, choose 20ft GP, then Import Excel/CSV. Upload the example, or paste cells copied from Excel. For a workbook, select the worksheet containing the cargo.', '開啟規劃器，選 20 呎 GP，再按 Import Excel/CSV。上載範例，或貼上由 Excel 複製的儲存格；活頁簿需選擇包含貨單的工作表。')}</li>
      <li>{T('Check name, length, width, height, weight each, quantity and upright column mappings. Header or cell units take priority over the fallback selectors.', '核對名稱、長、闊、高、每箱重量、數量及直立欄位。欄名或儲存格標示的單位優先於預設單位選項。')}</li>
      <li>{T('Expect two accepted types and 20 cartons. If your own file has a zero dimension, non-numeric quantity or missing weight, inspect the warnings and correct the source row. Do not silently discard cargo to obtain a successful plan.', '應顯示兩種接受箱型及 20 箱。若自己的檔案有零尺寸、非數字數量或缺少重量，請查看警告並修正原始行，勿為取得成功結果而忽略貨物。')}</li>
      <li>{T('Confirm the units, accepted quantities and any exclusions, then use the list and calculate. Keep example runs classified as samples.', '確認單位、接受數量及排除行，再使用貨單計算。範例操作應維持為示範資料。')}</li>
    </ol>
    <Link to="/planner?import=1" className="text-blue-700 font-semibold underline" onClick={()=>track('packing_guide_action','import_own_list')}>{T('Import my own list →','匯入我的貨單 →')}</Link>
    <h2 className="mt-8 text-xl font-bold text-slate-900">{T('3. Inspect the result before exporting','3. 匯出前檢查結果')}</h2>
    <p className="mt-3">{T('With the supplied 20ft GP preset and this example, the planner places all 20 cartons and reports 280 kg cargo. This deliberately small load is a way to check the workflow, not a demonstration of maximum container utilization. Rotate the live 3D example to inspect the arrangement.', '使用預設 20 呎 GP 及此範例，規劃器可裝入全部 20 箱，顯示貨重 280 kg。此小批貨用於核對流程，並非最大貨櫃利用率示範。可旋轉即時 3D 範例查看擺位。')}</p>
    <p className="mt-3">{T('PDF plan produces a printable visual handoff. CSV exports the placed-carton coordinates. Check the packed/requested count: a partial plan is not confirmation that the whole shipment fits. The heuristic is an estimate, not a proof of optimal packing or a certified securing plan.', 'PDF 裝載圖提供可列印的視覺交付文件；CSV 匯出已放置紙箱座標。請核對已裝／要求箱數，部分方案不代表全批貨裝得下。啟發式計算是估算，並非最佳裝箱證明或經認證的固定方案。')}</p>
    <h2 className="mt-8 text-xl font-bold text-slate-900">{T('Choose the next task','選擇下一項工作')}</h2>
    <nav className="mt-4 grid gap-3 sm:grid-cols-2">
      <Link className="rounded-xl border p-4 text-blue-700" to="/ti-hi-calculator?u=cm&l=40&w=30&h=30&p=eur&mh=150">{T('Same-size cases: calculate TI / HI and see each layer →','同尺寸紙箱：計算 TI／HI 並查看每層擺法 →')}</Link>
      <Link className="rounded-xl border p-4 text-blue-700" to="/pallet-height-calculator">{T('Mixed orders: compare pallet height and build instructions →','混合訂單：比較棧板高度及擺放指示 →')}</Link>
    </nav>
  </article>;
}
