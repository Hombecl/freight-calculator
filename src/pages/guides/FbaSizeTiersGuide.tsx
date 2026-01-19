import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, Clock, Calendar, Calculator, CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function FbaSizeTiersGuide() {
  const { lang } = useApp();

  return (
    <article className="max-w-4xl mx-auto">
      <Helmet>
        <title>Amazon FBA Size Tiers 2025: Complete Guide to Reduce Fulfillment Fees | DimPack3D</title>
        <meta name="description" content="Complete 2025 guide to Amazon FBA size tiers. Learn dimensional weight calculations, size tier thresholds, and proven strategies to reduce FBA fulfillment fees by optimizing packaging." />
        <meta name="keywords" content="Amazon FBA size tiers 2025, FBA dimensional weight, FBA fulfillment fees, FBA size tier calculator, reduce FBA fees, Amazon seller guide, FBA packaging optimization" />
        <link rel="canonical" href="https://www.dimpack3d.com/guides/fba-size-tiers-2025" />
        <meta property="og:url" content="https://www.dimpack3d.com/guides/fba-size-tiers-2025" />
        <meta property="og:title" content="Amazon FBA Size Tiers 2025: Complete Guide to Reduce Fulfillment Fees" />
        <meta property="og:description" content="Learn how Amazon FBA size tiers work in 2025 and discover strategies to optimize packaging and reduce fulfillment fees." />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "Amazon FBA Size Tiers 2025: Complete Guide to Reduce Fulfillment Fees",
            "description": "Complete 2025 guide to Amazon FBA size tiers, dimensional weight calculations, and strategies to reduce fulfillment fees.",
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
                "name": "What are Amazon FBA size tiers?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Amazon FBA size tiers are a classification system that categorizes products based on their dimensions and weight to determine fulfillment fees. The main tiers are: Small Standard (up to 15\" x 12\" x 0.75\", 1 lb), Large Standard (up to 18\" x 14\" x 8\", 20 lb), Large Bulky (up to 59\" x 33\" x 33\", 50 lb), and Extra Large (exceeds Large Bulky limits)."
                }
              },
              {
                "@type": "Question",
                "name": "How is FBA dimensional weight calculated?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "For standard-size items, dimensional weight = (Length x Width x Height) ÷ 139. For oversized items, the divisor is 166. Amazon uses the greater of actual weight or dimensional weight to calculate fees."
                }
              },
              {
                "@type": "Question",
                "name": "What changed in Amazon FBA fees for 2025?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "In 2025, Amazon changed how they round dimensional weight calculations for oversized items. Previously they rounded down to the nearest ounce; now they round up, which can increase fees by $0.20-$0.50 per unit for borderline products."
                }
              },
              {
                "@type": "Question",
                "name": "How can I reduce my FBA fulfillment fees?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Key strategies include: 1) Redesign packaging to reduce dimensions by 1-2 inches to potentially reach a lower tier, 2) Use lightweight packaging materials, 3) Calculate borderline products to find optimal dimensions, 4) Consider product bundling to reduce per-item fees."
                }
              },
              {
                "@type": "Question",
                "name": "What are the FBA fee ranges for each size tier?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "2025 FBA fulfillment fees by tier: Small Standard $3.06-$3.68/unit, Large Standard $3.68-$7.25/unit, Large Bulky $9.73-$26.33/unit, Extra Large $26.33+/unit. Fees vary based on weight within each tier."
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
            {lang === 'zh' ? '8 分鐘閱讀' : '8 min read'}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight">
          {lang === 'zh'
            ? 'Amazon FBA 尺寸分級 2025：完整省費指南'
            : 'Amazon FBA Size Tiers 2025: Complete Guide to Reduce Fulfillment Fees'}
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed">
          {lang === 'zh'
            ? '了解 2025 年 Amazon FBA 尺寸分級最新變化，掌握體積重量計算方法，學習優化包裝策略，有效降低配送費用。'
            : 'Learn how Amazon FBA size tiers work in 2025, understand dimensional weight calculations, and discover proven strategies to optimize your packaging and reduce fulfillment fees.'}
        </p>
      </header>

      {/* Table of Contents */}
      <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-200">
        <h2 className="font-bold text-slate-900 mb-3">
          {lang === 'zh' ? '目錄' : 'Table of Contents'}
        </h2>
        <ul className="space-y-2 text-slate-600">
          <li><a href="#what-are-size-tiers" className="hover:text-blue-600">1. {lang === 'zh' ? '什麼是 FBA 尺寸分級？' : 'What Are FBA Size Tiers?'}</a></li>
          <li><a href="#2025-size-tiers" className="hover:text-blue-600">2. {lang === 'zh' ? '2025 年尺寸分級標準' : '2025 Size Tier Standards'}</a></li>
          <li><a href="#dimensional-weight" className="hover:text-blue-600">3. {lang === 'zh' ? '體積重量計算' : 'Dimensional Weight Calculation'}</a></li>
          <li><a href="#fee-structure" className="hover:text-blue-600">4. {lang === 'zh' ? '費用結構' : 'Fee Structure'}</a></li>
          <li><a href="#optimization-tips" className="hover:text-blue-600">5. {lang === 'zh' ? '優化策略' : 'Optimization Strategies'}</a></li>
          <li><a href="#calculator" className="hover:text-blue-600">6. {lang === 'zh' ? '使用計算器' : 'Use Our Calculator'}</a></li>
        </ul>
      </div>

      {/* Article Content */}
      <div className="prose prose-slate prose-lg max-w-none">

        {/* Section 1 */}
        <section id="what-are-size-tiers" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">1</span>
            {lang === 'zh' ? '什麼是 FBA 尺寸分級？' : 'What Are FBA Size Tiers?'}
          </h2>
          <p className="text-slate-600 mb-4">
            {lang === 'zh'
              ? 'Amazon FBA（Fulfillment by Amazon）尺寸分級是 Amazon 用來對產品進行分類的系統，根據產品的尺寸和重量來決定配送費用。了解這個系統對於控制你的 FBA 成本至關重要。'
              : 'Amazon FBA (Fulfillment by Amazon) size tiers are a classification system Amazon uses to categorize products based on their dimensions and weight to determine fulfillment fees. Understanding this system is crucial for controlling your FBA costs.'}
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 my-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="text-blue-600 flex-shrink-0 mt-1" size={20} />
              <div>
                <p className="font-bold text-blue-900 mb-1">
                  {lang === 'zh' ? '關鍵要點' : 'Key Insight'}
                </p>
                <p className="text-blue-800 text-sm">
                  {lang === 'zh'
                    ? '產品尺寸差異僅僅幾英寸就可能導致每件商品 $1-5 的費用差異。這意味著如果你每月銷售 1000 件商品，年度節省可達 $12,000-60,000。'
                    : 'A difference of just a few inches in product dimensions can result in $1-5 difference in fees per item. This means if you sell 1,000 units monthly, annual savings could reach $12,000-60,000.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section id="2025-size-tiers" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">2</span>
            {lang === 'zh' ? '2025 年尺寸分級標準' : '2025 Size Tier Standards'}
          </h2>
          <p className="text-slate-600 mb-6">
            {lang === 'zh'
              ? 'Amazon 在 2025 年對尺寸分級進行了重要更新。以下是最新的分級標準：'
              : 'Amazon made significant updates to size tiers in 2025. Here are the current tier standards:'}
          </p>

          {/* Size Tier Table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse bg-white rounded-xl overflow-hidden border border-slate-200">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-4 font-bold text-slate-900 border-b border-slate-200">
                    {lang === 'zh' ? '尺寸分級' : 'Size Tier'}
                  </th>
                  <th className="text-left p-4 font-bold text-slate-900 border-b border-slate-200">
                    {lang === 'zh' ? '最大尺寸' : 'Max Dimensions'}
                  </th>
                  <th className="text-left p-4 font-bold text-slate-900 border-b border-slate-200">
                    {lang === 'zh' ? '最大重量' : 'Max Weight'}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="p-4">
                    <span className="font-bold text-green-700">Small Standard</span>
                  </td>
                  <td className="p-4 text-slate-600">15" × 12" × 0.75"</td>
                  <td className="p-4 text-slate-600">16 oz (1 lb)</td>
                </tr>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <td className="p-4">
                    <span className="font-bold text-blue-700">Large Standard</span>
                  </td>
                  <td className="p-4 text-slate-600">18" × 14" × 8"</td>
                  <td className="p-4 text-slate-600">20 lb</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-4">
                    <span className="font-bold text-amber-700">Large Bulky</span>
                  </td>
                  <td className="p-4 text-slate-600">59" × 33" × 33" (or 130" girth)</td>
                  <td className="p-4 text-slate-600">50 lb</td>
                </tr>
                <tr>
                  <td className="p-4">
                    <span className="font-bold text-red-700">Extra Large</span>
                  </td>
                  <td className="p-4 text-slate-600">{lang === 'zh' ? '超過大型笨重' : 'Exceeds Large Bulky'}</td>
                  <td className="p-4 text-slate-600">150 lb+</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 my-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-600 flex-shrink-0 mt-1" size={20} />
              <div>
                <p className="font-bold text-amber-900 mb-1">
                  {lang === 'zh' ? '2025 年重要變化' : '2025 Important Changes'}
                </p>
                <p className="text-amber-800 text-sm">
                  {lang === 'zh'
                    ? 'Amazon 現在對超大物品的體積重量計算採用進位而非捨去。這可能導致邊界產品每件增加 $0.20-$0.50 的費用。'
                    : 'Amazon now rounds UP dimensional weight calculations for oversized items instead of rounding down. This can increase fees by $0.20-$0.50 per unit for borderline products.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section id="dimensional-weight" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">3</span>
            {lang === 'zh' ? '體積重量計算' : 'Dimensional Weight Calculation'}
          </h2>
          <p className="text-slate-600 mb-4">
            {lang === 'zh'
              ? 'Amazon 使用實際重量和體積重量中較大的一個來計算費用。體積重量的計算公式如下：'
              : 'Amazon uses the greater of actual weight or dimensional weight to calculate fees. The dimensional weight formula is:'}
          </p>

          <div className="bg-slate-900 text-white rounded-xl p-6 my-6 font-mono">
            <p className="text-slate-400 text-sm mb-2">// {lang === 'zh' ? '標準尺寸產品' : 'Standard Size Items'}</p>
            <p className="text-lg mb-4">
              <span className="text-green-400">Dimensional Weight</span> = (L × W × H) ÷ <span className="text-amber-400">139</span>
            </p>
            <p className="text-slate-400 text-sm mb-2">// {lang === 'zh' ? '超大尺寸產品' : 'Oversized Items'}</p>
            <p className="text-lg">
              <span className="text-green-400">Dimensional Weight</span> = (L × W × H) ÷ <span className="text-amber-400">166</span>
            </p>
          </div>

          <h3 className="text-xl font-bold text-slate-900 mb-3">
            {lang === 'zh' ? '計算範例' : 'Calculation Example'}
          </h3>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-slate-600 mb-3">
              {lang === 'zh'
                ? '假設你有一個產品，尺寸為 12" × 10" × 6"，實際重量為 1.5 磅：'
                : 'Suppose you have a product measuring 12" × 10" × 6" with an actual weight of 1.5 lb:'}
            </p>
            <ul className="space-y-2 text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <span>{lang === 'zh' ? '體積：12 × 10 × 6 = 720 立方英寸' : 'Volume: 12 × 10 × 6 = 720 cubic inches'}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <span>{lang === 'zh' ? '體積重量：720 ÷ 139 = 5.18 磅' : 'Dimensional Weight: 720 ÷ 139 = 5.18 lb'}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <span className="font-bold">{lang === 'zh' ? '計費重量：5.18 磅（取較大值）' : 'Billable Weight: 5.18 lb (greater value used)'}</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4 */}
        <section id="fee-structure" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">4</span>
            {lang === 'zh' ? '費用結構' : 'Fee Structure'}
          </h2>
          <p className="text-slate-600 mb-6">
            {lang === 'zh'
              ? '2025 年 FBA 配送費用根據尺寸分級和重量有所不同。以下是主要費用範圍：'
              : '2025 FBA fulfillment fees vary by size tier and weight. Here are the main fee ranges:'}
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <h4 className="font-bold text-green-800 mb-2">Small Standard</h4>
              <p className="text-3xl font-black text-green-700 mb-1">$3.06 - $3.68</p>
              <p className="text-sm text-green-600">{lang === 'zh' ? '每件' : 'per unit'}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <h4 className="font-bold text-blue-800 mb-2">Large Standard</h4>
              <p className="text-3xl font-black text-blue-700 mb-1">$3.68 - $7.25</p>
              <p className="text-sm text-blue-600">{lang === 'zh' ? '每件' : 'per unit'}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h4 className="font-bold text-amber-800 mb-2">Large Bulky</h4>
              <p className="text-3xl font-black text-amber-700 mb-1">$9.73 - $26.33</p>
              <p className="text-sm text-amber-600">{lang === 'zh' ? '每件' : 'per unit'}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <h4 className="font-bold text-red-800 mb-2">Extra Large</h4>
              <p className="text-3xl font-black text-red-700 mb-1">$26.33+</p>
              <p className="text-sm text-red-600">{lang === 'zh' ? '每件' : 'per unit'}</p>
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section id="optimization-tips" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">5</span>
            {lang === 'zh' ? '優化策略' : 'Optimization Strategies'}
          </h2>

          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="bg-green-100 text-green-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                {lang === 'zh' ? '重新設計包裝' : 'Redesign Packaging'}
              </h4>
              <p className="text-slate-600 text-sm">
                {lang === 'zh'
                  ? '檢查你的包裝是否有多餘空間。減少 1-2 英寸可能就能讓產品進入更低的尺寸分級。'
                  : 'Check if your packaging has excess space. Reducing 1-2 inches might push your product into a lower size tier.'}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="bg-green-100 text-green-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                {lang === 'zh' ? '使用輕量材料' : 'Use Lightweight Materials'}
              </h4>
              <p className="text-slate-600 text-sm">
                {lang === 'zh'
                  ? '如果你的產品是根據實際重量計費，考慮使用更輕的包裝材料。'
                  : 'If your product is billed by actual weight, consider using lighter packaging materials.'}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="bg-green-100 text-green-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                {lang === 'zh' ? '批量計算邊界產品' : 'Calculate Borderline Products'}
              </h4>
              <p className="text-slate-600 text-sm">
                {lang === 'zh'
                  ? '對於接近分級臨界點的產品，使用計算器模擬不同尺寸的費用差異。'
                  : 'For products near tier thresholds, use a calculator to simulate fee differences at different dimensions.'}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="bg-green-100 text-green-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
                {lang === 'zh' ? '考慮產品捆綁' : 'Consider Product Bundling'}
              </h4>
              <p className="text-slate-600 text-sm">
                {lang === 'zh'
                  ? '有時候將多個小產品捆綁成一個可以降低每件的平均配送費用。'
                  : 'Sometimes bundling multiple small products into one can reduce the average fulfillment fee per item.'}
              </p>
            </div>
          </div>
        </section>

        {/* Section 6 - Calculator CTA */}
        <section id="calculator" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">6</span>
            {lang === 'zh' ? '使用我們的 FBA 計算器' : 'Use Our FBA Calculator'}
          </h2>
          <p className="text-slate-600 mb-6">
            {lang === 'zh'
              ? '不想手動計算？使用我們的免費 FBA 尺寸分級計算器，即時查看你的產品屬於哪個分級，以及預估費用。'
              : "Don't want to calculate manually? Use our free FBA Size Tier Calculator to instantly see which tier your product falls into and estimate fees."}
          </p>

          <Link
            to="/fba"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl hover:scale-105"
          >
            <Calculator size={24} />
            {lang === 'zh' ? '立即使用 FBA 計算器' : 'Try FBA Calculator Now'}
            <ArrowRight size={20} />
          </Link>
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
