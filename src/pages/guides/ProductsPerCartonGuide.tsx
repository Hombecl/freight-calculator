import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, Clock, Calendar, Package, CheckCircle, Lightbulb, Calculator, Box } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function ProductsPerCartonGuide() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);

  return (
    <article className="max-w-4xl mx-auto">
      <Helmet>
        <title>{T("Products Per Carton Calculator: Optimize Box Packing | DimPack3D", "每箱產品數計算指南 — 裝箱優化 | DimPack3D")}</title>
        <meta name="description" content={T(
          "Learn how to calculate the optimal number of products per carton. Master packing algorithms, rotation strategies, and space optimization techniques to reduce shipping costs.",
          "學識點計每箱最佳產品數。掌握裝箱演算法、旋轉策略同空間優化技巧,慳返運費。")} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": T("Products Per Carton Calculator: Optimize Box Packing", "每箱產品數計算指南 — 裝箱優化"),
            "inLanguage": lang === 'zh' ? 'zh-Hant' : 'en',
            "description": "Guide to calculating optimal products per carton and maximizing packing efficiency.",
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
                "name": "How do I calculate products per carton?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Calculate products per carton by dividing carton dimensions by product dimensions for each axis (length, width, height), then multiply the results. Try all 6 product orientations (rotations) to find the maximum. For example: carton 60×40×40cm, product 10×10×20cm = 6×4×2 = 48 products."
                }
              },
              {
                "@type": "Question",
                "name": "Should I rotate products to fit more in a carton?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes! Rotating products can significantly increase the number that fit per carton. Our calculator tests all 6 possible orientations automatically to find the optimal arrangement. Always verify the product can be safely stored in different orientations."
                }
              },
              {
                "@type": "Question",
                "name": "What is packing efficiency?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Packing efficiency is the percentage of carton volume actually used by products: (Total product volume ÷ Carton volume) × 100%. A good packing efficiency is 65-85%. Below 60% suggests you should consider a different carton size."
                }
              },
              {
                "@type": "Question",
                "name": "How do I choose the right carton size?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Choose carton size based on: 1) Product dimensions - carton should be a multiple of product size, 2) Weight limits - don't exceed 23kg for manual handling, 3) Shipping requirements - consider container dimensions, 4) Protection needs - allow space for padding."
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
            {lang === 'zh' ? '5 分鐘閱讀' : '5 min read'}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight">
          {lang === 'zh'
            ? '每箱產品數量計算：優化裝箱方案'
            : 'Products Per Carton Calculator: Optimize Box Packing'}
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed">
          {lang === 'zh'
            ? '學習如何計算紙箱可容納的最佳產品數量，掌握旋轉策略和空間優化技巧，降低運輸成本。'
            : 'Learn how to calculate optimal products per carton using rotation strategies and space optimization to reduce shipping costs.'}
        </p>
      </header>

      {/* Table of Contents */}
      <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-200">
        <h2 className="font-bold text-slate-900 mb-3">{lang === 'zh' ? '目錄' : 'Table of Contents'}</h2>
        <ul className="space-y-2 text-slate-600">
          <li><a href="#basic-calculation" className="hover:text-blue-600">1. {lang === 'zh' ? '基本計算方法' : 'Basic Calculation Method'}</a></li>
          <li><a href="#rotation" className="hover:text-blue-600">2. {lang === 'zh' ? '產品旋轉策略' : 'Product Rotation Strategy'}</a></li>
          <li><a href="#efficiency" className="hover:text-blue-600">3. {lang === 'zh' ? '裝箱效率' : 'Packing Efficiency'}</a></li>
          <li><a href="#carton-selection" className="hover:text-blue-600">4. {lang === 'zh' ? '紙箱選擇' : 'Carton Selection'}</a></li>
          <li><a href="#3d-visualization" className="hover:text-blue-600">5. {lang === 'zh' ? '3D 視覺化' : '3D Visualization'}</a></li>
          <li><a href="#calculator" className="hover:text-blue-600">6. {lang === 'zh' ? '使用計算器' : 'Use Our Calculator'}</a></li>
        </ul>
      </div>

      {/* Article Content */}
      <div className="prose prose-slate prose-lg max-w-none">

        {/* Section 1 */}
        <section id="basic-calculation" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">1</span>
            {lang === 'zh' ? '基本計算方法' : 'Basic Calculation Method'}
          </h2>

          <p className="text-slate-600 mb-4">
            {lang === 'zh'
              ? '計算每箱產品數量的基本方法是將紙箱的三個維度分別除以產品的對應維度，然後相乘。'
              : 'The basic method is to divide each carton dimension by the corresponding product dimension, then multiply the results.'}
          </p>

          <div className="bg-slate-900 text-white rounded-xl p-6 my-6 font-mono">
            <p className="text-slate-400 text-sm mb-2">// {lang === 'zh' ? '基本公式' : 'Basic Formula'}</p>
            <p className="text-lg mb-4">
              <span className="text-green-400">Products</span> = floor(CL/PL) × floor(CW/PW) × floor(CH/PH)
            </p>
            <p className="text-slate-400 text-sm">
              {lang === 'zh' ? 'C = 紙箱尺寸, P = 產品尺寸, floor = 向下取整' : 'C = Carton dims, P = Product dims, floor = round down'}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h4 className="font-bold text-slate-900 mb-4">{lang === 'zh' ? '計算範例' : 'Example Calculation'}</h4>
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <p className="text-slate-600 mb-1">{lang === 'zh' ? '紙箱' : 'Carton'}: 60cm × 40cm × 40cm</p>
              <p className="text-slate-600">{lang === 'zh' ? '產品' : 'Product'}: 10cm × 10cm × 20cm</p>
            </div>
            <ul className="space-y-2 text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <span>{lang === 'zh' ? '長度方向' : 'Length'}: 60 ÷ 10 = 6 {lang === 'zh' ? '個' : 'units'}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <span>{lang === 'zh' ? '寬度方向' : 'Width'}: 40 ÷ 10 = 4 {lang === 'zh' ? '個' : 'units'}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-1 flex-shrink-0" />
                <span>{lang === 'zh' ? '高度方向' : 'Height'}: 40 ÷ 20 = 2 {lang === 'zh' ? '層' : 'layers'}</span>
              </li>
              <li className="flex items-start gap-2 font-bold text-blue-700">
                <Box size={16} className="text-blue-500 mt-1 flex-shrink-0" />
                <span>{lang === 'zh' ? '總計' : 'Total'}: 6 × 4 × 2 = <strong>48 {lang === 'zh' ? '個產品' : 'products'}</strong></span>
              </li>
            </ul>
          </div>
        </section>

        {/* Section 2 */}
        <section id="rotation" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">2</span>
            {lang === 'zh' ? '產品旋轉策略' : 'Product Rotation Strategy'}
          </h2>

          <p className="text-slate-600 mb-4">
            {lang === 'zh'
              ? '通過旋轉產品，可能會找到更優的擺放方式。一個長方體有 6 種可能的擺放方向。'
              : 'By rotating products, you may find better arrangements. A rectangular product has 6 possible orientations.'}
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="text-blue-600 flex-shrink-0 mt-1" size={20} />
              <div>
                <p className="font-bold text-blue-900 mb-1">{lang === 'zh' ? '6 種擺放方向' : '6 Orientations'}</p>
                <p className="text-blue-800 text-sm">
                  {lang === 'zh'
                    ? '對於尺寸為 L×W×H 的產品，可以嘗試：L×W×H, L×H×W, W×L×H, W×H×L, H×L×W, H×W×L'
                    : 'For product L×W×H, try: L×W×H, L×H×W, W×L×H, W×H×L, H×L×W, H×W×L'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h4 className="font-bold text-slate-900 mb-4">{lang === 'zh' ? '旋轉優化範例' : 'Rotation Optimization Example'}</h4>
            <p className="text-slate-600 mb-3">
              {lang === 'zh' ? '紙箱 60×40×40cm，產品 15×10×8cm：' : 'Carton 60×40×40cm, Product 15×10×8cm:'}
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="font-medium text-slate-700 mb-2">15×10×8</p>
                <p className="text-slate-600 text-sm">4×4×5 = <strong>80</strong></p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300">
                <p className="font-medium text-green-700 mb-2">10×15×8 ✓</p>
                <p className="text-green-600 text-sm">6×2×5 = <strong>60</strong></p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="font-medium text-slate-700 mb-2">10×8×15</p>
                <p className="text-slate-600 text-sm">6×5×2 = <strong>60</strong></p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="font-medium text-slate-700 mb-2">8×10×15</p>
                <p className="text-slate-600 text-sm">7×4×2 = <strong>56</strong></p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              {lang === 'zh'
                ? '結果：第一種擺放方式可容納 80 個產品，是最佳選擇。'
                : 'Result: First orientation fits 80 products - the optimal choice.'}
            </p>
          </div>
        </section>

        {/* Section 3 */}
        <section id="efficiency" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">3</span>
            {lang === 'zh' ? '裝箱效率' : 'Packing Efficiency'}
          </h2>

          <div className="bg-slate-900 text-white rounded-xl p-6 my-6 font-mono">
            <p className="text-slate-400 text-sm mb-2">// {lang === 'zh' ? '裝箱效率公式' : 'Packing Efficiency Formula'}</p>
            <p className="text-lg">
              <span className="text-green-400">Efficiency</span> = (Products × Product Volume) ÷ Carton Volume × 100%
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-3xl font-black text-red-600 mb-1">&lt;60%</p>
              <p className="text-sm text-red-700">{lang === 'zh' ? '需要優化' : 'Needs optimization'}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-3xl font-black text-amber-600 mb-1">60-75%</p>
              <p className="text-sm text-amber-700">{lang === 'zh' ? '可接受' : 'Acceptable'}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-3xl font-black text-green-600 mb-1">75-85%</p>
              <p className="text-sm text-green-700">{lang === 'zh' ? '優秀' : 'Excellent'}</p>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section id="carton-selection" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">4</span>
            {lang === 'zh' ? '紙箱選擇' : 'Carton Selection'}
          </h2>

          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-2">{lang === 'zh' ? '尺寸倍數原則' : 'Multiple Sizing Principle'}</h4>
              <p className="text-slate-600 text-sm">
                {lang === 'zh'
                  ? '選擇紙箱時，盡量讓紙箱尺寸是產品尺寸的整數倍，減少浪費空間。'
                  : 'Choose carton dimensions that are multiples of product dimensions to minimize wasted space.'}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-2">{lang === 'zh' ? '重量限制' : 'Weight Limits'}</h4>
              <p className="text-slate-600 text-sm">
                {lang === 'zh'
                  ? '人工搬運的紙箱建議不超過 23kg。重物應使用較小的紙箱，避免過重。'
                  : 'Cartons for manual handling should not exceed 23kg. Use smaller boxes for heavy items.'}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-2">{lang === 'zh' ? '標準化紙箱' : 'Standardize Cartons'}</h4>
              <p className="text-slate-600 text-sm">
                {lang === 'zh'
                  ? '使用 2-3 種標準紙箱尺寸可以簡化物流管理，便於貨櫃裝載計算。'
                  : 'Using 2-3 standard carton sizes simplifies logistics and container loading calculations.'}
              </p>
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section id="3d-visualization" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">5</span>
            {lang === 'zh' ? '3D 視覺化' : '3D Visualization'}
          </h2>

          <p className="text-slate-600 mb-4">
            {lang === 'zh'
              ? '使用 3D 視覺化工具可以清楚地看到產品在紙箱中的擺放方式，確保計算結果符合實際需求。'
              : '3D visualization tools let you see exactly how products are arranged in the carton, ensuring calculations match real-world requirements.'}
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Lightbulb className="text-blue-600 flex-shrink-0 mt-1" size={20} />
              <div>
                <p className="font-bold text-blue-900 mb-1">{lang === 'zh' ? '我們的 3D 模擬功能' : 'Our 3D Simulation Feature'}</p>
                <p className="text-blue-800 text-sm">
                  {lang === 'zh'
                    ? 'DimPack3D 的裝箱計算器包含互動式 3D 模擬，你可以旋轉、縮放查看產品在紙箱內的確切位置。'
                    : "DimPack3D's packing calculator includes interactive 3D simulation - rotate and zoom to see exact product placement."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6 - Calculator CTA */}
        <section id="calculator" className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">6</span>
            {lang === 'zh' ? '使用我們的計算器' : 'Use Our Calculator'}
          </h2>
          <p className="text-slate-600 mb-6">
            {lang === 'zh'
              ? '我們的計算器會自動測試所有旋轉方向，找出最佳擺放方案，並提供 3D 視覺化預覽。'
              : 'Our calculator automatically tests all rotations to find the optimal arrangement, with 3D visualization preview.'}
          </p>

          <Link
            to="/packing"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl hover:scale-105"
          >
            <Package size={24} />
            {lang === 'zh' ? '立即計算裝箱數量' : 'Calculate Products Per Carton'}
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
