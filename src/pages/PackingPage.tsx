import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { IS_ZH } from '../lib/locale';
import Calculator from '../components/Calculator';

export default function PackingPage() {
  const T = (en: string, zh: string) => (IS_ZH ? zh : en);
  const faqs = [
    { q: T("How many products fit in a carton?", "一個紙箱可以裝幾多件產品？"), a: T("Enter the product dimensions, carton dimensions and wall thickness. The calculator compares arrangements inside the usable box space. Review the displayed count and weight before using the result.", "輸入產品尺寸、紙箱尺寸及紙板厚度，計算器會比較可用箱內空間嘅擺法。使用結果前請核對件數及重量。") },
    { q: T("Can I compare different box packing arrangements?", "可以比較不同裝箱擺法嗎？"), a: T("Yes. Open the 3D simulation to compare available distinct arrangements and their product counts and utilization. The best result found is not a guarantee of the mathematical optimum.", "可以。開啟 3D 模擬，比較可用嘅不同擺法、件數及利用率。搜尋所得最好結果並不保證係數學上嘅最佳解。") },
    { q: T("Is this for products in a box or boxes in a container?", "呢度係產品放入紙箱，定紙箱放入貨櫃？"), a: T("This calculator packs products into a carton. Use the container calculator for one carton size across 20GP, 40GP and 40HQ containers, or the Load Planner for a mixed carton list and PDF/CSV load plans.", "呢度計產品放入紙箱。單一紙箱尺寸嘅 20GP／40GP／40HQ 比較可用貨櫃計算器；混合紙箱貨單及 PDF／CSV 裝載計劃請用裝載規劃器。") },
  ];
  return <>
    <Helmet>
      <title>{T("Free 3D Box Packing Calculator | Products per Carton | DimPack3D", "免費 3D 裝箱計算器 — 每箱產品數 | DimPack3D")}</title>
      <meta name="description" content={T("Calculate how many products fit in a box. Compare 3D carton packing layouts, review quantity and space utilization, and adjust product and carton dimensions.", "計算一個紙箱可以裝幾多件產品，比較 3D 擺法、每箱件數及空間利用率，再調整產品及紙箱尺寸。")} />
      <script type="application/ld+json">{JSON.stringify({"@context":"https://schema.org","@type":"FAQPage",mainEntity:faqs.map(f=>({"@type":"Question",name:f.q,acceptedAnswer:{"@type":"Answer",text:f.a}}))})}</script>
    </Helmet>
    <header className="max-w-7xl mx-auto px-4 pt-3 pb-2">
      <h1 className="text-xl md:text-2xl font-bold text-slate-900">{T("3D Box Packing Calculator", "3D 產品裝箱計算器")}</h1>
      <p className="text-sm text-slate-600 mt-1">{T("Find how many products fit in one carton. Change dimensions and compare the 3D arrangements below.", "計一個紙箱裝幾多件產品；修改尺寸，再比較下面嘅 3D 擺法。")}</p>
    </header>
    <Calculator fixedMode="packing" hideHeader={true} />
    <section className="max-w-4xl mx-auto px-4 py-8" aria-label={T("Calculator help", "計算器說明")}>
      <h2 className="text-xl font-bold text-slate-900">{T("Questions about this calculator", "計算器常見問題")}</h2>
      <div className="divide-y mt-3">{faqs.map(f=><details key={f.q} className="py-3"><summary className="cursor-pointer font-medium text-slate-800">{f.q}</summary><p className="mt-2 text-sm leading-relaxed text-slate-600">{f.a}</p></details>)}</div>
      <nav aria-label={T("Next steps", "下一步")} className="flex flex-wrap gap-x-5 gap-y-3 mt-5 text-sm text-blue-700">
        <Link className="underline" to="/guides/products-per-carton">{T("How to calculate products per carton", "每箱產品數計算指南")}</Link>
        <Link className="underline" to="/container">{T("Compare cartons per container", "比較每櫃紙箱數")}</Link>
        <Link className="underline" to="/planner">{T("Plan a mixed carton load", "規劃混合紙箱裝櫃")}</Link>
      </nav>
    </section>
  </>;
}
