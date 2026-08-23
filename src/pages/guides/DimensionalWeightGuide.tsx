import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, Clock, Calendar, Scale, CheckCircle, AlertTriangle, Lightbulb, Calculator } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function DimensionalWeightGuide() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);

  return (
    <article className="max-w-4xl mx-auto">
      <Helmet>
        <title>{T("Dimensional Weight Calculator Guide: DIM Weight Formula Explained | DimPack3D", "材積重量計算指南 — DIM 重量公式詳解 | DimPack3D")}</title>
        <meta name="description" content={T(
          "Complete guide to dimensional weight (DIM weight) calculations. Learn the formula, divisors for air and sea freight, and strategies to reduce shipping costs by optimizing packaging.",
          "材積重量(DIM weight)計算完整指南。學識公式、空運同海運除數,同點靠優化包裝慳運費。")} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": T("Dimensional Weight Calculator Guide: DIM Weight Formula Explained", "材積重量計算指南 — DIM 重量公式詳解"),
            "inLanguage": lang === 'zh' ? 'zh-Hant' : 'en',
            "description": "Complete guide to dimensional weight calculations for shipping optimization.",
            "author": { "@type": "Organization", "name": "DimPack3D" },
            "publisher": { "@type": "Organization", "name": "DimPack3D", "url": "https://www.dimpack3d.com" },
            "datePublished": "2025-01-19",
            "dateModified": "2025-01-19"
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What is dimensional weight?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Dimensional weight (DIM weight or volumetric weight) is a pricing technique that accounts for package volume in addition to actual weight. Carriers charge based on whichever is greater - actual weight or dimensional weight - to ensure fair pricing for lightweight but bulky packages."
                }
              },
              {
                "@type": "Question",
                "name": "How do I calculate dimensional weight?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Dimensional weight formula: (Length × Width × Height) ÷ DIM factor. For air freight, use DIM factor 6000 (cm) or 166 (inches). For sea freight, use 1000 (cm). Example: A 50×40×30cm package = 60,000 ÷ 6000 = 10 kg dimensional weight."
                }
              },
              {
                "@type": "Question",
                "name": "What DIM factor should I use?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "DIM factors vary by carrier and shipping method: Air freight typically uses 6000 (cm³/kg) or 166 (in³/lb), FedEx/UPS domestic use 139, sea freight uses 1000. Always confirm with your carrier as factors may vary."
                }
              },
              {
                "@type": "Question",
                "name": "How can I reduce dimensional weight charges?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Reduce dimensional weight by: 1) Using right-sized packaging without excess space, 2) Reducing packaging material thickness, 3) Using vacuum packaging for soft goods, 4) Considering product bundling, 5) Choosing appropriate shipping method based on density."
                }
              }
            ]
          })}
        </script>
      </Helmet>

      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link to="/guides" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
          <ArrowLeft size={16} />
          {lang === 'zh' ? '返回指南' : 'Back to Guides'}
        </Link>
      </nav>

      {/* Article Header */}
      <header className="mb-8">
        <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
          <span className="flex items-center gap-1.5">
            <Calendar size={14} />
            {lang === 'zh' ? '2025年1月19日' : 'January 19, 2025'}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} />
            {lang === 'zh' ? '6 分鐘閱讀' : '6 min read'}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight">
          {lang === 'zh'
            ? '體積重量計算指南：DIM 重量公式詳解'
            : 'Dimensional Weight Calculator Guide: DIM Weight Formula Explained'}
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed">
          {lang === 'zh'
            ? '了解體積重量如何影響運費，學習計算公式和不同運輸方式的 DIM 因子，掌握優化包裝以降低成本的策略。'
            : 'Understand how dimensional weight affects shipping costs. Learn the formula, DIM factors for different carriers, and strategies to optimize packaging.'}
        </p>
      </header>

      {/* Table of Contents */}
      <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-200">
        <h2 className="font-bold text-slate-900 mb-3">{lang === 'zh' ? '目錄' : 'Table of Contents'}</h2>
        <ul className="space-y-2 text-slate-600">
          <li><a href="#what-is-dim" className="hover:text-blue-600">1. {lang === 'zh' ? '什麼是體積重量？' : 'What is Dimensional Weight?'}</a></li>
          <li><a href="#formula" className="hover:text-blue-600">2. {lang === 'zh' ? '計算公式' : 'The Formula'}</a></li>
          <li><a href="#dim-factors" className="hover:text-blue-600">3. {lang === 'zh' ? 'DIM 因子對照表' : 'DIM Factor Reference'}</a></li>
          <li><a href="#examples" className="hover:text-blue-600">4. {lang === 'zh' ? '計算範例' : 'Calculation Examples'}</a></li>
          <li><a href="#optimization" className="hover:text-blue-600">5. {lang === 'zh' ? '優化策略' : 'Optimization Strategies'}</a></li>
          <li><a href="#calculator" className="hover:text-blue-600">6. {lang === 'zh' ? '使用計算器' : 'Use Our Calculator'}</a></li>
        </ul>
      </div>

      {/* Article Content */}
      <div className="prose prose-slate prose-lg max-w-none">

        {/* Section 1 */}
        <section id="what-is-dim" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">1</span>
            {lang === 'zh' ? '什麼是體積重量？' : 'What is Dimensional Weight?'}
          </h2>
          <p className="text-slate-600 mb-4">
            {lang === 'zh'
              ? '體積重量（又稱材積重量或 DIM 重量）是物流公司用來計算運費的一種方法。它考慮的不僅是實際重量，還包括包裹佔用的空間。'
              : 'Dimensional weight (also called DIM weight or volumetric weight) is a pricing method used by carriers that considers both actual weight and the space a package occupies.'}
          </p>

          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 my-6">
            <div className="flex items-start gap-3">
              <Scale className="text-indigo-600 flex-shrink-0 mt-1" size={20} />
              <div>
                <p className="font-bold text-indigo-900 mb-1">{lang === 'zh' ? '計費原則' : 'Billing Principle'}</p>
                <p className="text-indigo-800 text-sm">
                  {lang === 'zh'
                    ? '運費 = 實際重量 vs 體積重量，取較大值計費。這意味著輕但體積大的包裹可能比重但體積小的包裹運費更高。'
                    : 'Shipping cost = Actual weight vs Dimensional weight, whichever is greater. This means light but bulky packages may cost more than heavy but compact ones.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section id="formula" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">2</span>
            {lang === 'zh' ? '計算公式' : 'The Formula'}
          </h2>

          <div className="bg-slate-900 text-white rounded-xl p-6 my-6 font-mono">
            <p className="text-slate-400 text-sm mb-2">// {lang === 'zh' ? '體積重量公式' : 'Dimensional Weight Formula'}</p>
            <p className="text-lg mb-4">
              <span className="text-green-400">DIM Weight</span> = (L × W × H) ÷ <span className="text-amber-400">DIM Factor</span>
            </p>
            <p className="text-slate-400 text-sm mb-2">// {lang === 'zh' ? '計費重量' : 'Billable Weight'}</p>
            <p className="text-lg">
              <span className="text-green-400">Billable</span> = MAX(<span className="text-blue-400">Actual Weight</span>, <span className="text-amber-400">DIM Weight</span>)
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-600 flex-shrink-0 mt-1" size={20} />
              <div>
                <p className="font-bold text-amber-900 mb-1">{lang === 'zh' ? '單位注意' : 'Unit Notice'}</p>
                <p className="text-amber-800 text-sm">
                  {lang === 'zh'
                    ? '計算時請確保尺寸和 DIM 因子使用相同的單位系統。厘米配 6000，英寸配 166。'
                    : 'Ensure dimensions and DIM factor use the same unit system. Use 6000 for cm, 166 for inches.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section id="dim-factors" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">3</span>
            {lang === 'zh' ? 'DIM 因子對照表' : 'DIM Factor Reference'}
          </h2>

          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse bg-white rounded-xl overflow-hidden border border-slate-200">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-4 font-bold text-slate-900 border-b">{lang === 'zh' ? '運輸方式/承運商' : 'Shipping Method/Carrier'}</th>
                  <th className="text-left p-4 font-bold text-slate-900 border-b">{lang === 'zh' ? 'DIM 因子 (cm)' : 'DIM Factor (cm)'}</th>
                  <th className="text-left p-4 font-bold text-slate-900 border-b">{lang === 'zh' ? 'DIM 因子 (in)' : 'DIM Factor (in)'}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="p-4 font-medium">{lang === 'zh' ? '國際空運' : 'International Air'}</td>
                  <td className="p-4 text-slate-600">6000</td>
                  <td className="p-4 text-slate-600">366</td>
                </tr>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <td className="p-4 font-medium">FedEx / UPS / DHL</td>
                  <td className="p-4 text-slate-600">5000</td>
                  <td className="p-4 text-slate-600">139</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-4 font-medium">Amazon FBA ({lang === 'zh' ? '標準尺寸' : 'Standard'})</td>
                  <td className="p-4 text-slate-600">—</td>
                  <td className="p-4 text-slate-600">139</td>
                </tr>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <td className="p-4 font-medium">Amazon FBA ({lang === 'zh' ? '超大尺寸' : 'Oversize'})</td>
                  <td className="p-4 text-slate-600">—</td>
                  <td className="p-4 text-slate-600">166</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">{lang === 'zh' ? '海運' : 'Sea Freight'}</td>
                  <td className="p-4 text-slate-600">1000</td>
                  <td className="p-4 text-slate-600">—</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Lightbulb className="text-blue-600 flex-shrink-0 mt-1" size={20} />
              <div>
                <p className="font-bold text-blue-900 mb-1">{lang === 'zh' ? '小提示' : 'Pro Tip'}</p>
                <p className="text-blue-800 text-sm">
                  {lang === 'zh'
                    ? 'DIM 因子越大，體積重量越小。海運的 DIM 因子是空運的 6 倍，所以對於體積大但重量輕的貨物，海運通常更划算。'
                    : 'Higher DIM factor = lower dimensional weight. Sea freight DIM factor is 6x air freight, making it more economical for bulky, lightweight cargo.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section id="examples" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">4</span>
            {lang === 'zh' ? '計算範例' : 'Calculation Examples'}
          </h2>

          <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
            <h4 className="font-bold text-slate-900 mb-4">
              {lang === 'zh' ? '範例：一箱電子產品' : 'Example: Electronics Package'}
            </h4>
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <p className="text-slate-600 mb-1">{lang === 'zh' ? '紙箱尺寸' : 'Package size'}: 50cm × 40cm × 30cm</p>
              <p className="text-slate-600">{lang === 'zh' ? '實際重量' : 'Actual weight'}: 5 kg</p>
            </div>
            <ul className="space-y-3 text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <span>{lang === 'zh' ? '體積' : 'Volume'}: 50 × 40 × 30 = 60,000 cm³</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <span>{lang === 'zh' ? '空運體積重' : 'Air DIM weight'}: 60,000 ÷ 6000 = <strong className="text-indigo-700">10 kg</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <span>{lang === 'zh' ? '海運體積重' : 'Sea DIM weight'}: 60,000 ÷ 1000 = <strong className="text-indigo-700">60 kg</strong></span>
              </li>
            </ul>
            <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <p className="text-indigo-800 font-medium">
                {lang === 'zh'
                  ? '結論：空運計費重量為 10 kg（取較大的體積重），海運計費重量為 60 kg。如果實際重量超過體積重量，則以實際重量計費。'
                  : 'Result: Air freight billable weight is 10 kg (DIM weight > actual). Sea freight billable weight is 60 kg. If actual weight exceeds DIM weight, actual weight is used.'}
              </p>
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section id="optimization" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">5</span>
            {lang === 'zh' ? '優化策略' : 'Optimization Strategies'}
          </h2>

          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-2">{lang === 'zh' ? '使用合適尺寸的包裝' : 'Right-Size Your Packaging'}</h4>
              <p className="text-slate-600 text-sm">
                {lang === 'zh'
                  ? '避免使用過大的紙箱。包裝應該剛好容納產品和必要的保護材料，不要留有過多空隙。'
                  : 'Avoid oversized boxes. Packaging should just fit the product and necessary protection - no excess void space.'}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-2">{lang === 'zh' ? '減少包裝材料' : 'Reduce Packaging Materials'}</h4>
              <p className="text-slate-600 text-sm">
                {lang === 'zh'
                  ? '使用更薄但同樣保護性的包裝材料。氣泡紙比泡沫塊更節省空間。'
                  : 'Use thinner but equally protective materials. Bubble wrap saves more space than foam blocks.'}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-2">{lang === 'zh' ? '考慮真空包裝' : 'Consider Vacuum Packaging'}</h4>
              <p className="text-slate-600 text-sm">
                {lang === 'zh'
                  ? '對於衣物、紡織品等軟質商品，真空包裝可以大幅減少體積。'
                  : 'For soft goods like clothing and textiles, vacuum packaging dramatically reduces volume.'}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-2">{lang === 'zh' ? '選擇正確的運輸方式' : 'Choose the Right Shipping Method'}</h4>
              <p className="text-slate-600 text-sm">
                {lang === 'zh'
                  ? '體積大重量輕的貨物考慮海運；體積小重量重的貨物適合空運。'
                  : 'Bulky, lightweight cargo favors sea freight; compact, heavy cargo is better for air freight.'}
              </p>
            </div>
          </div>
        </section>

        {/* Section 6 - Calculator CTA */}
        <section id="calculator" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">6</span>
            {lang === 'zh' ? '使用我們的計算器' : 'Use Our Calculator'}
          </h2>
          <p className="text-slate-600 mb-6">
            {lang === 'zh'
              ? '我們的計算器會自動計算體積重量和實際重量，幫你確定計費重量和預估運費。'
              : 'Our calculator automatically computes both dimensional and actual weight to determine billable weight and estimate shipping costs.'}
          </p>

          <Link
            to="/packing"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl hover:scale-105"
          >
            <Calculator size={24} />
            {lang === 'zh' ? '立即計算體積重量' : 'Calculate DIM Weight Now'}
            <ArrowRight size={20} />
          </Link>
        </section>
      </div>

      {/* Article Footer */}
      <footer className="mt-12 pt-8 border-t border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <p className="text-sm text-slate-500">
            {lang === 'zh' ? '最後更新：2025年1月19日' : 'Last updated: January 19, 2025'}
          </p>
          <Link to="/guides" className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2">
            {lang === 'zh' ? '瀏覽更多指南' : 'Browse More Guides'} <ArrowRight size={16} />
          </Link>
        </div>
      </footer>
    </article>
  );
}
