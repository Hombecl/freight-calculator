import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, Clock, Calendar, Container, CheckCircle, AlertTriangle, Lightbulb, Target } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function ContainerLoadingGuide() {
  const { lang } = useApp();

  return (
    <article className="max-w-4xl mx-auto">
      <Helmet>
        <title>Container Loading Optimization: Maximize Space Utilization | DimPack3D</title>
        <meta name="description" content="Expert guide to container loading optimization. Learn how to maximize space utilization in 20GP, 40GP, 40HQ containers. Includes loading patterns, weight distribution, and cost-saving strategies." />
        <meta name="keywords" content="container loading optimization, container space utilization, 20GP loading, 40GP loading, 40HQ loading, cargo loading plan, container stacking, shipping container optimization" />
        <link rel="canonical" href="https://www.dimpack3d.com/guides/container-loading-optimization" />
        <meta property="og:url" content="https://www.dimpack3d.com/guides/container-loading-optimization" />
        <meta property="og:title" content="Container Loading Optimization: Maximize Space Utilization" />
        <meta property="og:description" content="Expert strategies for optimizing container loading to achieve 90%+ space utilization." />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "Container Loading Optimization: Maximize Space Utilization",
            "description": "Expert guide to container loading optimization for 20GP, 40GP, 40HQ containers.",
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
                "name": "What is a good container utilization rate?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "A good container utilization rate is 80-90%. While 100% might seem ideal, leaving 10-15% space allows for easier loading/unloading and reduces cargo damage risk. Professional loaders typically target 85% as the sweet spot."
                }
              },
              {
                "@type": "Question",
                "name": "How do I calculate container loading efficiency?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Container loading efficiency = (Total cargo CBM ÷ Container capacity CBM) × 100%. For example, 25 CBM cargo in a 33 CBM 20GP container = 75.8% utilization. Consider both volume and weight limits."
                }
              },
              {
                "@type": "Question",
                "name": "What is the best stacking pattern for containers?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "The best stacking pattern depends on carton dimensions. Common patterns include: Block stacking (same-size cartons), Brick pattern (offset layers for stability), and Column stacking (heavy items on bottom). Always place heavier cartons at the bottom and near the container doors."
                }
              },
              {
                "@type": "Question",
                "name": "How do I prevent cargo damage during shipping?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Prevent cargo damage by: 1) Distributing weight evenly, 2) Using dunnage and void fillers, 3) Securing cargo with straps or nets, 4) Not exceeding stacking limits, 5) Leaving ventilation gaps if needed, 6) Using moisture absorbers for long voyages."
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
            {lang === 'zh' ? '7 分鐘閱讀' : '7 min read'}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight">
          {lang === 'zh'
            ? '貨櫃裝載優化：最大化空間利用率'
            : 'Container Loading Optimization: Maximize Space Utilization'}
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed">
          {lang === 'zh'
            ? '學習專業的貨櫃裝載技巧，了解 20GP、40GP、40HQ 的最佳裝載方案，達到 90% 以上的空間利用率。'
            : 'Learn professional container loading techniques for 20GP, 40GP, 40HQ containers and achieve 90%+ space utilization.'}
        </p>
      </header>

      {/* Table of Contents */}
      <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-200">
        <h2 className="font-bold text-slate-900 mb-3">{lang === 'zh' ? '目錄' : 'Table of Contents'}</h2>
        <ul className="space-y-2 text-slate-600">
          <li><a href="#container-specs" className="hover:text-blue-600">1. {lang === 'zh' ? '貨櫃規格對照' : 'Container Specifications'}</a></li>
          <li><a href="#loading-patterns" className="hover:text-blue-600">2. {lang === 'zh' ? '裝載模式' : 'Loading Patterns'}</a></li>
          <li><a href="#weight-distribution" className="hover:text-blue-600">3. {lang === 'zh' ? '重量分佈' : 'Weight Distribution'}</a></li>
          <li><a href="#optimization-strategies" className="hover:text-blue-600">4. {lang === 'zh' ? '優化策略' : 'Optimization Strategies'}</a></li>
          <li><a href="#common-mistakes" className="hover:text-blue-600">5. {lang === 'zh' ? '常見錯誤' : 'Common Mistakes'}</a></li>
          <li><a href="#calculator" className="hover:text-blue-600">6. {lang === 'zh' ? '使用計算器' : 'Use Our Calculator'}</a></li>
        </ul>
      </div>

      {/* Article Content */}
      <div className="prose prose-slate prose-lg max-w-none">

        {/* Section 1 */}
        <section id="container-specs" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-teal-100 text-teal-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">1</span>
            {lang === 'zh' ? '貨櫃規格對照' : 'Container Specifications'}
          </h2>

          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse bg-white rounded-xl overflow-hidden border border-slate-200">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-4 font-bold text-slate-900 border-b">{lang === 'zh' ? '類型' : 'Type'}</th>
                  <th className="text-left p-4 font-bold text-slate-900 border-b">{lang === 'zh' ? '內部尺寸' : 'Internal Dims'}</th>
                  <th className="text-left p-4 font-bold text-slate-900 border-b">{lang === 'zh' ? '容量' : 'Capacity'}</th>
                  <th className="text-left p-4 font-bold text-slate-900 border-b">{lang === 'zh' ? '載重' : 'Max Load'}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="p-4 font-bold text-blue-700">20GP</td>
                  <td className="p-4 text-slate-600">5.9m × 2.35m × 2.39m</td>
                  <td className="p-4 text-slate-600">33.2 CBM</td>
                  <td className="p-4 text-slate-600">28,000 kg</td>
                </tr>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <td className="p-4 font-bold text-teal-700">40GP</td>
                  <td className="p-4 text-slate-600">12.03m × 2.35m × 2.39m</td>
                  <td className="p-4 text-slate-600">67.7 CBM</td>
                  <td className="p-4 text-slate-600">26,000 kg</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-purple-700">40HQ</td>
                  <td className="p-4 text-slate-600">12.03m × 2.35m × 2.69m</td>
                  <td className="p-4 text-slate-600">76.3 CBM</td>
                  <td className="p-4 text-slate-600">26,000 kg</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-teal-50 border border-teal-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Lightbulb className="text-teal-600 flex-shrink-0 mt-1" size={20} />
              <div>
                <p className="font-bold text-teal-900 mb-1">{lang === 'zh' ? '選擇貨櫃的技巧' : 'Container Selection Tip'}</p>
                <p className="text-teal-800 text-sm">
                  {lang === 'zh'
                    ? '40HQ 比 40GP 高 30cm，額外增加約 9 CBM 空間。如果貨物高度超過 2.2m 或需要額外空間，40HQ 通常是更好的選擇。'
                    : '40HQ is 30cm taller than 40GP, providing ~9 CBM extra space. If cargo height exceeds 2.2m or you need extra room, 40HQ is usually the better choice.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section id="loading-patterns" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-teal-100 text-teal-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">2</span>
            {lang === 'zh' ? '裝載模式' : 'Loading Patterns'}
          </h2>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-2">{lang === 'zh' ? '塊狀堆疊' : 'Block Stacking'}</h4>
              <p className="text-slate-600 text-sm mb-3">
                {lang === 'zh'
                  ? '適用於統一尺寸的紙箱。直接一層層向上堆疊，最大化垂直空間利用。'
                  : 'Best for uniform carton sizes. Stack directly layer by layer to maximize vertical space.'}
              </p>
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle size={14} />
                {lang === 'zh' ? '利用率可達 85-90%' : '85-90% utilization possible'}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-2">{lang === 'zh' ? '磚塊模式' : 'Brick Pattern'}</h4>
              <p className="text-slate-600 text-sm mb-3">
                {lang === 'zh'
                  ? '每層交錯擺放，增加穩定性。適合長途運輸或海運。'
                  : 'Offset each layer for increased stability. Ideal for long-distance or sea shipping.'}
              </p>
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Target size={14} />
                {lang === 'zh' ? '穩定性最佳' : 'Best stability'}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-xl p-6 font-mono text-sm">
            <p className="text-slate-400 mb-2">// {lang === 'zh' ? '最佳裝載順序' : 'Optimal Loading Order'}</p>
            <p className="text-green-400">1. {lang === 'zh' ? '重物 → 底部，靠近門口' : 'Heavy items → Bottom, near doors'}</p>
            <p className="text-blue-400">2. {lang === 'zh' ? '中等重量 → 中間層' : 'Medium weight → Middle layers'}</p>
            <p className="text-amber-400">3. {lang === 'zh' ? '輕物 → 頂部，最後裝載' : 'Light items → Top, load last'}</p>
          </div>
        </section>

        {/* Section 3 */}
        <section id="weight-distribution" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-teal-100 text-teal-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">3</span>
            {lang === 'zh' ? '重量分佈' : 'Weight Distribution'}
          </h2>

          <p className="text-slate-600 mb-4">
            {lang === 'zh'
              ? '正確的重量分佈對於運輸安全至關重要。不平衡的載重可能導致貨櫃傾斜、貨物損壞，甚至運輸事故。'
              : 'Proper weight distribution is critical for safe transportation. Unbalanced loads can cause container tilting, cargo damage, or accidents.'}
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-600 flex-shrink-0 mt-1" size={20} />
              <div>
                <p className="font-bold text-amber-900 mb-1">{lang === 'zh' ? '重要規則' : 'Critical Rules'}</p>
                <ul className="text-amber-800 text-sm space-y-1">
                  <li>• {lang === 'zh' ? '重心應保持在貨櫃中心位置' : 'Center of gravity should be at container center'}</li>
                  <li>• {lang === 'zh' ? '前後重量差異不超過 60:40' : 'Front-to-back weight ratio should not exceed 60:40'}</li>
                  <li>• {lang === 'zh' ? '左右兩側重量應平衡' : 'Left and right sides should be balanced'}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section id="optimization-strategies" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-teal-100 text-teal-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">4</span>
            {lang === 'zh' ? '優化策略' : 'Optimization Strategies'}
          </h2>

          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="bg-teal-100 text-teal-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                {lang === 'zh' ? '統一紙箱尺寸' : 'Standardize Carton Sizes'}
              </h4>
              <p className="text-slate-600 text-sm">
                {lang === 'zh'
                  ? '使用 2-3 種標準紙箱尺寸，可以更容易規劃裝載方案，減少空隙。'
                  : 'Use 2-3 standard carton sizes for easier loading planning and reduced gaps.'}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="bg-teal-100 text-teal-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                {lang === 'zh' ? '先計算再裝載' : 'Calculate Before Loading'}
              </h4>
              <p className="text-slate-600 text-sm">
                {lang === 'zh'
                  ? '使用裝載計算器提前規劃方案，避免現場臨時調整浪費時間。'
                  : 'Use a loading calculator to plan ahead, avoiding time-wasting adjustments on-site.'}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="bg-teal-100 text-teal-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                {lang === 'zh' ? '善用空隙填充' : 'Use Void Fillers'}
              </h4>
              <p className="text-slate-600 text-sm">
                {lang === 'zh'
                  ? '使用氣墊袋、泡沫或紙板填充空隙，防止貨物在運輸中移動。'
                  : 'Use air bags, foam, or cardboard to fill gaps and prevent cargo movement during transit.'}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="bg-teal-100 text-teal-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
                {lang === 'zh' ? '目標 85% 利用率' : 'Target 85% Utilization'}
              </h4>
              <p className="text-slate-600 text-sm">
                {lang === 'zh'
                  ? '85% 是理想的平衡點，既最大化空間利用，又保留足夠的操作空間。'
                  : '85% is the ideal balance - maximizing space while leaving room for safe handling.'}
              </p>
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section id="common-mistakes" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-teal-100 text-teal-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">5</span>
            {lang === 'zh' ? '常見錯誤' : 'Common Mistakes'}
          </h2>

          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <ul className="space-y-3 text-red-800">
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">✗</span>
                <span>{lang === 'zh' ? '超過紙箱的堆疊限制' : 'Exceeding carton stacking limits'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">✗</span>
                <span>{lang === 'zh' ? '重物放在頂部' : 'Placing heavy items on top'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">✗</span>
                <span>{lang === 'zh' ? '忽略貨櫃載重限制' : 'Ignoring container weight limits'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">✗</span>
                <span>{lang === 'zh' ? '沒有固定貨物' : 'Not securing cargo properly'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">✗</span>
                <span>{lang === 'zh' ? '追求 100% 裝載率而犧牲安全' : 'Sacrificing safety for 100% utilization'}</span>
              </li>
            </ul>
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
              ? '使用我們的免費貨櫃裝載計算器，輸入紙箱尺寸即可自動計算最佳裝載方案和空間利用率。'
              : 'Use our free container loading calculator. Enter carton dimensions to automatically calculate optimal loading plans and space utilization.'}
          </p>

          <Link
            to="/container"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl hover:scale-105"
          >
            <Container size={24} />
            {lang === 'zh' ? '立即使用貨櫃計算器' : 'Try Container Calculator Now'}
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
