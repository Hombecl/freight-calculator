import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { IS_ZH } from '../lib/locale';
import Calculator from '../components/Calculator';

export default function ContainerPage() {
  const T = (en: string, zh: string) => (IS_ZH ? zh : en);
  const faqs = [
    { q: T("Which container sizes can I compare?", "可以比較邊啲櫃型？"), a: T("Compare 20GP, 40GP and 40HQ using the dimensions and payload shown in the calculator. Actual container specifications can vary; check the equipment you will use.", "可按計算器顯示嘅尺寸及載重比較 20GP、40GP 及 40HQ。實際貨櫃規格可能不同，請核對你會使用嘅設備。") },
    { q: T("Why is carton capacity different from dividing container CBM by carton CBM?", "點解箱數唔等於貨櫃 CBM 除以紙箱 CBM？"), a: T("A volume ratio alone ignores carton dimensions, orientation, leftover gaps and weight. The calculator checks candidate 3D arrangements; review the layout and constraints rather than relying only on a CBM estimate.", "純體積比例冇考慮紙箱尺寸、方向、剩餘空隙及重量。計算器會比較 3D 擺法，請核對排位及限制，唔好只依賴 CBM 估算。") },
    { q: T("How do I plan mixed carton sizes or export a load plan?", "混合尺寸貨單或者匯出裝載計劃點做？"), a: T("Use the Load Planner to import Excel/CSV carton lists, compare distinct loading layouts and export the selected plan. Planning needs no account; PDF/CSV export asks for an email.", "用裝載規劃器匯入 Excel／CSV 紙箱貨單，比較不同擺法並匯出所選方案。規劃毋須帳戶；PDF／CSV 匯出需填電郵。") },
  ];
  return <>
    <Helmet>
      <title>{T("Container Loading Calculator: 20ft & 40ft Carton Capacity | DimPack3D", "貨櫃裝載計算器 — 20 呎及 40 呎紙箱容量 | DimPack3D")}</title>
      <meta name="description" content={T("Calculate how many same-size cartons fit in 20GP, 40GP and 40HQ containers. Compare carton counts and 3D layouts; use Load Planner for mixed cargo and PDF/CSV.", "計算同尺寸紙箱喺 20GP、40GP 及 40HQ 嘅可裝數量，比較箱數及 3D 擺法；混合貨物及 PDF／CSV 請用裝載規劃器。")} />
      <script type="application/ld+json">{JSON.stringify({"@context":"https://schema.org","@type":"FAQPage",mainEntity:faqs.map(f=>({"@type":"Question",name:f.q,acceptedAnswer:{"@type":"Answer",text:f.a}}))})}</script>
    </Helmet>
    <header className="max-w-7xl mx-auto px-4 pt-3 pb-2">
      <h1 className="text-xl md:text-2xl font-bold text-slate-900">{T("Container Capacity Calculator: 20ft & 40ft", "20 呎及 40 呎貨櫃容量計算器")}</h1>
      <p className="text-sm text-slate-600 mt-1">{T("Compare one carton size across 20GP, 40GP and 40HQ. For several carton sizes in one shipment, use the mixed-load planner.", "比較同一紙箱尺寸喺 20GP、40GP、40HQ 嘅裝載量。一次出貨有多種紙箱尺寸，請用混裝規劃器。")}</p>
    </header>
    <Calculator fixedMode="loading" hideHeader={true} />
    <section className="max-w-4xl mx-auto px-4 py-8" aria-label={T("Calculator help", "計算器說明")}>
      <h2 className="text-xl font-bold text-slate-900">{T("Questions about this calculator", "計算器常見問題")}</h2>
      <div className="divide-y mt-3">{faqs.map(f=><details key={f.q} className="py-3"><summary className="cursor-pointer font-medium text-slate-800">{f.q}</summary><p className="mt-2 text-sm leading-relaxed text-slate-600">{f.a}</p></details>)}</div>
      <nav aria-label={T("Next steps", "下一步")} className="flex flex-wrap gap-x-5 gap-y-3 mt-5 text-sm text-blue-700">
        <Link className="underline" to="/planner?import=1">{T("Import mixed cartons into Load Planner", "匯入混合紙箱貨單")}</Link>
        <Link className="underline" to="/packing">{T("Calculate products per carton", "計算每箱產品數")}</Link>
        <Link className="underline" to="/guides/excel-container-load-plan">{T("Follow an Excel loading example", "查看 Excel 裝櫃實例")}</Link>
      </nav>
    </section>
  </>;
}
