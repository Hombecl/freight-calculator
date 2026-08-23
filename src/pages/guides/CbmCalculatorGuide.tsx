import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, Clock, Calendar, Calculator, CheckCircle, Lightbulb, Container } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function CbmCalculatorGuide() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);

  return (
    <article className="max-w-4xl mx-auto">
      <Helmet>
        <title>{T("CBM Calculator Guide: Master Shipping Volume Calculations | DimPack3D", "CBM 計算指南 — 材積、貨櫃容量同裝載優化 | DimPack3D")}</title>
        <meta name="description" content={T(
          "Complete guide to CBM (Cubic Meter) calculations for international shipping. Learn formulas, container capacities for 20GP, 40GP, 40HQ, and how to optimize cargo loading.",
          "國際運輸 CBM(立方米)計算完整指南。學識公式、20GP / 40GP / 40HQ 貨櫃容量,同點優化裝貨。")} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": T("CBM Calculator Guide: Master Shipping Volume Calculations", "CBM 計算指南 — 材積、貨櫃容量同裝載優化"),
            "inLanguage": lang === 'zh' ? 'zh-Hant' : 'en',
            "description": "Complete guide to CBM calculations for international shipping, including formulas, container capacities, and optimization strategies.",
            "author": {
              "@type": "Organization",
              "name": "DimPack3D"
            },
            "publisher": {
              "@type": "Organization",
              "name": "DimPack3D",
              "url": "https://www.dimpack3d.com"
            },
            "datePublished": "2025-01-15",
            "dateModified": "2025-01-15"
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What is CBM in shipping?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "CBM stands for Cubic Meter, the most commonly used volume measurement unit in international logistics. Shipping companies calculate freight based on cargo CBM or weight, whichever is greater. The formula is: Length (cm) × Width (cm) × Height (cm) ÷ 1,000,000 = CBM."
                }
              },
              {
                "@type": "Question",
                "name": "How do I calculate CBM for multiple cartons?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "To calculate total CBM for multiple cartons: First calculate single carton CBM = (L × W × H) ÷ 1,000,000 (using cm). Then multiply by the number of cartons: Total CBM = Single Carton CBM × Quantity."
                }
              },
              {
                "@type": "Question",
                "name": "What is the capacity of a 20GP container?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "A 20GP (20-foot General Purpose) container has a total capacity of approximately 33 CBM. Internal dimensions are 5.9m × 2.35m × 2.39m. Usable capacity is typically 26-28 CBM, and maximum load weight is 28,000 kg."
                }
              },
              {
                "@type": "Question",
                "name": "What is the capacity of a 40GP and 40HQ container?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "A 40GP container has approximately 67 CBM capacity (usable: 54-58 CBM), with internal dimensions of 12.03m × 2.35m × 2.39m. A 40HQ (High Cube) container has approximately 76 CBM capacity (usable: 62-68 CBM), with dimensions of 12.03m × 2.35m × 2.69m. Both have a max load of 26,000 kg."
                }
              },
              {
                "@type": "Question",
                "name": "What is the recommended container loading rate?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "The recommended loading rate is 80-85%. Avoid targeting 100% utilization as you need to leave space to prevent cargo damage and facilitate unloading. Using standardized carton sizes helps achieve more efficient stacking and higher loading rates."
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
            {lang === 'zh' ? '2025年1月15日' : 'January 15, 2025'}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} />
            {lang === 'zh' ? '6 分鐘閱讀' : '6 min read'}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight">
          {lang === 'zh'
            ? 'CBM 計算器指南：掌握運輸體積計算'
            : 'CBM Calculator Guide: Master Shipping Volume Calculations'}
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed">
          {lang === 'zh'
            ? '學習 CBM（立方米）計算公式，了解不同貨櫃的容量，掌握如何優化貨物裝載以降低運輸成本。'
            : 'Learn CBM (Cubic Meter) calculation formulas, understand different container capacities, and master cargo loading optimization to reduce shipping costs.'}
        </p>
      </header>

      {/* Table of Contents */}
      <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-200">
        <h2 className="font-bold text-slate-900 mb-3">
          {lang === 'zh' ? '目錄' : 'Table of Contents'}
        </h2>
        <ul className="space-y-2 text-slate-600">
          <li><a href="#what-is-cbm" className="hover:text-blue-600">1. {lang === 'zh' ? '什麼是 CBM？' : 'What is CBM?'}</a></li>
          <li><a href="#cbm-formula" className="hover:text-blue-600">2. {lang === 'zh' ? 'CBM 計算公式' : 'CBM Calculation Formula'}</a></li>
          <li><a href="#container-capacities" className="hover:text-blue-600">3. {lang === 'zh' ? '貨櫃容量對照' : 'Container Capacities'}</a></li>
          <li><a href="#practical-examples" className="hover:text-blue-600">4. {lang === 'zh' ? '實際計算範例' : 'Practical Examples'}</a></li>
          <li><a href="#optimization-tips" className="hover:text-blue-600">5. {lang === 'zh' ? '優化技巧' : 'Optimization Tips'}</a></li>
          <li><a href="#calculator" className="hover:text-blue-600">6. {lang === 'zh' ? '使用計算器' : 'Use Our Calculator'}</a></li>
        </ul>
      </div>

      {/* Article Content */}
      <div className="prose prose-slate prose-lg max-w-none">

        {/* Section 1 */}
        <section id="what-is-cbm" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-teal-100 text-teal-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">1</span>
            {lang === 'zh' ? '什麼是 CBM？' : 'What is CBM?'}
          </h2>
          <p className="text-slate-600 mb-4">
            {lang === 'zh'
              ? 'CBM 是 Cubic Meter（立方米）的縮寫，是國際物流中最常用的體積計量單位。物流公司通常根據貨物的 CBM 或重量（取較大值）來計算運費。'
              : 'CBM stands for Cubic Meter, the most commonly used volume measurement unit in international logistics. Shipping companies typically calculate freight based on cargo CBM or weight, whichever is greater.'}
          </p>
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-5 my-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="text-teal-600 flex-shrink-0 mt-1" size={20} />
              <div>
                <p className="font-bold text-teal-900 mb-1">
                  {lang === 'zh' ? '為什麼 CBM 很重要？' : 'Why is CBM Important?'}
                </p>
                <p className="text-teal-800 text-sm">
                  {lang === 'zh'
                    ? '準確計算 CBM 可以幫助你：1) 獲得準確的運費報價 2) 選擇合適的貨櫃類型 3) 優化裝箱方案以節省成本'
                    : 'Accurate CBM calculation helps you: 1) Get accurate freight quotes 2) Choose the right container type 3) Optimize packing to save costs'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section id="cbm-formula" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-teal-100 text-teal-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">2</span>
            {lang === 'zh' ? 'CBM 計算公式' : 'CBM Calculation Formula'}
          </h2>

          <div className="bg-slate-900 text-white rounded-xl p-6 my-6 font-mono">
            <p className="text-slate-400 text-sm mb-2">// {lang === 'zh' ? '基本公式（厘米）' : 'Basic Formula (cm)'}</p>
            <p className="text-lg mb-4">
              <span className="text-green-400">CBM</span> = Length(cm) × Width(cm) × Height(cm) ÷ <span className="text-amber-400">1,000,000</span>
            </p>
            <p className="text-slate-400 text-sm mb-2">// {lang === 'zh' ? '多件貨物' : 'Multiple Cartons'}</p>
            <p className="text-lg">
              <span className="text-green-400">Total CBM</span> = Single Carton CBM × <span className="text-amber-400">Quantity</span>
            </p>
          </div>

          <h3 className="text-xl font-bold text-slate-900 mb-3">
            {lang === 'zh' ? '單位換算表' : 'Unit Conversion Table'}
          </h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse bg-white rounded-xl overflow-hidden border border-slate-200">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-4 font-bold text-slate-900 border-b border-slate-200">
                    {lang === 'zh' ? '單位' : 'Unit'}
                  </th>
                  <th className="text-left p-4 font-bold text-slate-900 border-b border-slate-200">
                    {lang === 'zh' ? '公式' : 'Formula'}
                  </th>
                  <th className="text-left p-4 font-bold text-slate-900 border-b border-slate-200">
                    {lang === 'zh' ? '除數' : 'Divisor'}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="p-4 font-medium">cm</td>
                  <td className="p-4 text-slate-600">L × W × H</td>
                  <td className="p-4 text-slate-600">÷ 1,000,000</td>
                </tr>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <td className="p-4 font-medium">m</td>
                  <td className="p-4 text-slate-600">L × W × H</td>
                  <td className="p-4 text-slate-600">= CBM ({lang === 'zh' ? '無需換算' : 'no conversion'})</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-4 font-medium">inch</td>
                  <td className="p-4 text-slate-600">L × W × H</td>
                  <td className="p-4 text-slate-600">÷ 61,024</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">ft</td>
                  <td className="p-4 text-slate-600">L × W × H</td>
                  <td className="p-4 text-slate-600">× 0.0283</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3 */}
        <section id="container-capacities" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-teal-100 text-teal-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">3</span>
            {lang === 'zh' ? '貨櫃容量對照' : 'Container Capacities'}
          </h2>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Container className="text-blue-600" size={20} />
                <h4 className="font-bold text-blue-900">20GP</h4>
              </div>
              <p className="text-3xl font-black text-blue-700 mb-2">33 CBM</p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>{lang === 'zh' ? '內部尺寸' : 'Internal'}: 5.9m × 2.35m × 2.39m</li>
                <li>{lang === 'zh' ? '可用容量' : 'Usable'}: ~26-28 CBM</li>
                <li>{lang === 'zh' ? '最大載重' : 'Max Load'}: 28,000 kg</li>
              </ul>
            </div>
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Container className="text-teal-600" size={20} />
                <h4 className="font-bold text-teal-900">40GP</h4>
              </div>
              <p className="text-3xl font-black text-teal-700 mb-2">67 CBM</p>
              <ul className="text-sm text-teal-700 space-y-1">
                <li>{lang === 'zh' ? '內部尺寸' : 'Internal'}: 12.03m × 2.35m × 2.39m</li>
                <li>{lang === 'zh' ? '可用容量' : 'Usable'}: ~54-58 CBM</li>
                <li>{lang === 'zh' ? '最大載重' : 'Max Load'}: 26,000 kg</li>
              </ul>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Container className="text-purple-600" size={20} />
                <h4 className="font-bold text-purple-900">40HQ</h4>
              </div>
              <p className="text-3xl font-black text-purple-700 mb-2">76 CBM</p>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>{lang === 'zh' ? '內部尺寸' : 'Internal'}: 12.03m × 2.35m × 2.69m</li>
                <li>{lang === 'zh' ? '可用容量' : 'Usable'}: ~62-68 CBM</li>
                <li>{lang === 'zh' ? '最大載重' : 'Max Load'}: 26,000 kg</li>
              </ul>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Lightbulb className="text-amber-600 flex-shrink-0 mt-1" size={20} />
              <div>
                <p className="font-bold text-amber-900 mb-1">
                  {lang === 'zh' ? '裝載率建議' : 'Loading Rate Tip'}
                </p>
                <p className="text-amber-800 text-sm">
                  {lang === 'zh'
                    ? '建議裝載率為 80-85%。不要追求 100% 裝載，預留空間可避免貨物損壞和方便卸貨。'
                    : 'Recommended loading rate is 80-85%. Avoid targeting 100% utilization - leave space to prevent damage and facilitate unloading.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section id="practical-examples" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-teal-100 text-teal-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">4</span>
            {lang === 'zh' ? '實際計算範例' : 'Practical Examples'}
          </h2>

          <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
            <h4 className="font-bold text-slate-900 mb-4">
              {lang === 'zh' ? '範例：計算 100 箱貨物的 CBM' : 'Example: Calculate CBM for 100 Cartons'}
            </h4>
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <p className="text-slate-600 mb-2">
                {lang === 'zh' ? '每箱尺寸：60cm × 40cm × 50cm' : 'Carton dimensions: 60cm × 40cm × 50cm'}
              </p>
              <p className="text-slate-600">{lang === 'zh' ? '數量：100 箱' : 'Quantity: 100 cartons'}</p>
            </div>
            <ul className="space-y-3 text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <span className="font-medium">{lang === 'zh' ? '步驟 1' : 'Step 1'}:</span>
                  <span className="ml-2">{lang === 'zh' ? '單箱體積 = 60 × 40 × 50 = 120,000 cm³' : 'Single carton volume = 60 × 40 × 50 = 120,000 cm³'}</span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <span className="font-medium">{lang === 'zh' ? '步驟 2' : 'Step 2'}:</span>
                  <span className="ml-2">{lang === 'zh' ? '單箱 CBM = 120,000 ÷ 1,000,000 = 0.12 CBM' : 'Single carton CBM = 120,000 ÷ 1,000,000 = 0.12 CBM'}</span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <span className="font-medium">{lang === 'zh' ? '步驟 3' : 'Step 3'}:</span>
                  <span className="ml-2 font-bold text-teal-700">{lang === 'zh' ? '總 CBM = 0.12 × 100 = 12 CBM' : 'Total CBM = 0.12 × 100 = 12 CBM'}</span>
                </div>
              </li>
            </ul>
            <div className="mt-4 p-4 bg-teal-50 rounded-lg border border-teal-200">
              <p className="text-teal-800 font-medium">
                {lang === 'zh'
                  ? '結論：12 CBM 可以使用 20GP 貨櫃（容量 26-28 CBM），裝載率約 43-46%'
                  : 'Conclusion: 12 CBM fits in a 20GP container (capacity 26-28 CBM), ~43-46% utilization'}
              </p>
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section id="optimization-tips" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-teal-100 text-teal-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">5</span>
            {lang === 'zh' ? '優化技巧' : 'Optimization Tips'}
          </h2>

          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="bg-teal-100 text-teal-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                {lang === 'zh' ? '選擇合適的貨櫃' : 'Choose the Right Container'}
              </h4>
              <p className="text-slate-600 text-sm">
                {lang === 'zh'
                  ? '如果貨物超過 28 CBM 但不到 54 CBM，考慮分成兩個 20GP 還是使用一個 40GP 更划算。'
                  : "If cargo exceeds 28 CBM but is under 54 CBM, compare whether two 20GP containers or one 40GP is more cost-effective."}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="bg-teal-100 text-teal-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                {lang === 'zh' ? '統一紙箱尺寸' : 'Standardize Carton Sizes'}
              </h4>
              <p className="text-slate-600 text-sm">
                {lang === 'zh'
                  ? '使用統一尺寸的紙箱可以更有效地堆疊，提高裝載率。'
                  : 'Using standardized carton sizes allows for more efficient stacking and higher loading rates.'}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="bg-teal-100 text-teal-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                {lang === 'zh' ? '考慮體積重量' : 'Consider Volumetric Weight'}
              </h4>
              <p className="text-slate-600 text-sm">
                {lang === 'zh'
                  ? '空運費用通常以體積重量（CBM × 167 或 CBM × 200）和實際重量取較大值計算。'
                  : 'Air freight is typically calculated using the greater of volumetric weight (CBM × 167 or CBM × 200) and actual weight.'}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="bg-teal-100 text-teal-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
                {lang === 'zh' ? '使用 3D 模擬' : 'Use 3D Simulation'}
              </h4>
              <p className="text-slate-600 text-sm">
                {lang === 'zh'
                  ? '使用 3D 可視化工具模擬裝載方案，找出最佳擺放方式。'
                  : 'Use 3D visualization tools to simulate loading plans and find the optimal arrangement.'}
              </p>
            </div>
          </div>
        </section>

        {/* Section 6 - Calculator CTA */}
        <section id="calculator" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-teal-100 text-teal-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">6</span>
            {lang === 'zh' ? '使用我們的計算器' : 'Use Our Calculator'}
          </h2>
          <p className="text-slate-600 mb-6">
            {lang === 'zh'
              ? '使用我們的免費工具，輕鬆計算 CBM、優化裝箱方案、模擬貨櫃裝載。'
              : 'Use our free tools to easily calculate CBM, optimize packing, and simulate container loading.'}
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              to="/packing"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg"
            >
              <Calculator size={20} />
              {lang === 'zh' ? '裝箱計算器' : 'Packing Calculator'}
            </Link>
            <Link
              to="/container"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg"
            >
              <Container size={20} />
              {lang === 'zh' ? '貨櫃裝載計算器' : 'Container Loading Calculator'}
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </div>

      {/* Article Footer */}
      <footer className="mt-12 pt-8 border-t border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="text-sm text-slate-500">
              {lang === 'zh' ? '最後更新：2025年1月15日' : 'Last updated: January 15, 2025'}
            </p>
          </div>
          <Link
            to="/guides"
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
          >
            {lang === 'zh' ? '瀏覽更多指南' : 'Browse More Guides'}
            <ArrowRight size={16} />
          </Link>
        </div>
      </footer>
    </article>
  );
}
