import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Scale, Package, Truck, Calculator, AlertTriangle, CheckCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function AmazonDimensionalWeightGuide() {
  const { lang } = useApp();

  return (
    <article className="max-w-4xl mx-auto">
      <Helmet>
        <title>Amazon Dimensional Weight Calculator 2025: Complete FBA Guide | DimPack3D</title>
        <meta name="description" content="Master Amazon dimensional weight calculations for FBA. Learn how Amazon calculates DIM weight, understand the 139 cubic inch divisor, and optimize packaging to reduce fees." />
        <meta name="keywords" content="amazon dimensional weight, amazon dim weight calculator, FBA dimensional weight, amazon 139 divisor, amazon shipping weight, FBA weight calculation, amazon volumetric weight" />
        <meta property="og:url" content="https://www.dimpack3d.com/guides/amazon-dimensional-weight" />
        <meta property="og:title" content="Amazon Dimensional Weight Calculator 2025: Complete FBA Guide" />
        <meta property="og:description" content="Learn how Amazon calculates dimensional weight for FBA and optimize your packaging to reduce fulfillment fees." />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "Amazon Dimensional Weight Calculator 2025: Complete FBA Guide",
            "description": "Master Amazon dimensional weight calculations for FBA. Learn how Amazon calculates DIM weight and optimize packaging to reduce fees.",
            "author": {
              "@type": "Organization",
              "name": "DimPack3D"
            },
            "publisher": {
              "@type": "Organization",
              "name": "DimPack3D",
              "url": "https://www.dimpack3d.com"
            },
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
                "name": "What is Amazon's dimensional weight divisor?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Amazon uses a dimensional weight divisor of 139 cubic inches per pound for FBA. This means DIM weight (lb) = (Length × Width × Height in inches) ÷ 139. For metric, it's approximately 5000 cm³ per kg."
                }
              },
              {
                "@type": "Question",
                "name": "When does Amazon use dimensional weight vs actual weight?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Amazon compares dimensional weight and actual weight, then charges based on the greater of the two. This is called 'billable weight.' Lightweight but bulky items typically get charged by DIM weight, while dense heavy items get charged by actual weight."
                }
              },
              {
                "@type": "Question",
                "name": "How can I reduce Amazon FBA dimensional weight charges?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Reduce DIM weight charges by: 1) Using smaller packaging that fits your product snugly, 2) Removing excess void fill and air pockets, 3) Redesigning product packaging to be more compact, 4) Using poly bags instead of boxes for eligible items."
                }
              },
              {
                "@type": "Question",
                "name": "Does Amazon round up dimensional weight?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes, Amazon rounds dimensional weight up to the nearest pound (or 0.1 kg for metric). For example, a calculated DIM weight of 2.1 lb would be rounded up to 3 lb for billing purposes."
                }
              }
            ]
          })}
        </script>
      </Helmet>

      {/* Back Link */}
      <Link to="/guides" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
        <ArrowLeft size={18} />
        {lang === 'zh' ? '返回指南列表' : 'Back to Guides'}
      </Link>

      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
          <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium">Amazon FBA</span>
          <span>•</span>
          <span>10 min read</span>
          <span>•</span>
          <span>Updated Jan 2025</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
          {lang === 'zh'
            ? 'Amazon 體積重量計算器 2025：完整 FBA 指南'
            : 'Amazon Dimensional Weight Calculator 2025: Complete FBA Guide'}
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed">
          {lang === 'zh'
            ? '掌握 Amazon FBA 體積重量計算方法，了解 139 立方英寸除數的運作原理，優化包裝以降低配送費用。'
            : 'Master Amazon FBA dimensional weight calculations. Understand the 139 cubic inch divisor and optimize your packaging to significantly reduce fulfillment fees.'}
        </p>
      </header>

      {/* Key Takeaway Box */}
      <div className="bg-orange-50 border-l-4 border-orange-500 p-6 rounded-r-xl mb-10">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-orange-500 flex-shrink-0 mt-1" size={24} />
          <div>
            <h2 className="font-bold text-slate-900 mb-2">
              {lang === 'zh' ? '關鍵要點' : 'Key Takeaway'}
            </h2>
            <p className="text-slate-700">
              {lang === 'zh'
                ? 'Amazon 使用 139 立方英寸/磅 的除數計算體積重量。如果您的產品體積重量超過實際重量，您將按較高的體積重量付費。這可能讓運費增加 2-5 倍！'
                : 'Amazon uses a 139 cubic inches per pound divisor. If your product\'s dimensional weight exceeds actual weight, you pay for the higher DIM weight. This can increase shipping costs by 2-5x!'}
            </p>
          </div>
        </div>
      </div>

      {/* Table of Contents */}
      <nav className="bg-slate-50 rounded-xl p-6 mb-10">
        <h2 className="font-bold text-slate-900 mb-4">{lang === 'zh' ? '目錄' : 'Table of Contents'}</h2>
        <ol className="space-y-2 text-blue-600">
          <li><a href="#what-is" className="hover:underline">1. What is Amazon Dimensional Weight?</a></li>
          <li><a href="#formula" className="hover:underline">2. Amazon DIM Weight Formula & Divisor</a></li>
          <li><a href="#examples" className="hover:underline">3. Real-World Calculation Examples</a></li>
          <li><a href="#vs-carriers" className="hover:underline">4. Amazon vs Other Carriers</a></li>
          <li><a href="#optimization" className="hover:underline">5. Packaging Optimization Strategies</a></li>
          <li><a href="#calculator" className="hover:underline">6. Use Our Free Calculator</a></li>
        </ol>
      </nav>

      {/* Main Content */}
      <div className="prose prose-slate max-w-none">

        {/* Section 1 */}
        <section id="what-is" className="mb-12">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900 mb-4">
            <Scale className="text-orange-500" size={28} />
            What is Amazon Dimensional Weight?
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            <strong>Dimensional weight</strong> (also called DIM weight, volumetric weight, or cubed weight) is a pricing technique that carriers use to account for package size, not just actual weight. Amazon applies this to all FBA shipments.
          </p>
          <p className="text-slate-600 leading-relaxed mb-4">
            The concept is simple: a large, lightweight package takes up the same truck/plane space as a heavy, dense package. Carriers want to be compensated for the space your package occupies, not just its weight.
          </p>

          <div className="bg-blue-50 rounded-xl p-6 my-6">
            <h3 className="font-bold text-slate-900 mb-3">Why Amazon Uses Dimensional Weight</h3>
            <ul className="space-y-2 text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle className="text-green-500 flex-shrink-0 mt-1" size={18} />
                <span><strong>Fair pricing:</strong> Large items pay proportionally to space used</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="text-green-500 flex-shrink-0 mt-1" size={18} />
                <span><strong>Efficiency incentive:</strong> Encourages sellers to use compact packaging</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="text-green-500 flex-shrink-0 mt-1" size={18} />
                <span><strong>Capacity optimization:</strong> Maximizes warehouse and transport space</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Section 2 */}
        <section id="formula" className="mb-12">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900 mb-4">
            <Calculator className="text-orange-500" size={28} />
            Amazon DIM Weight Formula & Divisor
          </h2>

          <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl p-6 my-6">
            <h3 className="font-bold text-xl mb-4">Amazon Dimensional Weight Formula</h3>
            <div className="bg-white/20 rounded-lg p-4 font-mono text-lg text-center mb-4">
              DIM Weight (lb) = (L × W × H in inches) ÷ <strong>139</strong>
            </div>
            <p className="text-white/90 text-sm">
              Billable Weight = MAX(Actual Weight, DIM Weight)
            </p>
          </div>

          <h3 className="font-bold text-slate-900 mt-8 mb-4">Understanding the 139 Divisor</h3>
          <p className="text-slate-600 leading-relaxed mb-4">
            Amazon's divisor of <strong>139 cubic inches per pound</strong> is relatively aggressive compared to some carriers. Here's what it means:
          </p>

          <div className="overflow-x-auto my-6">
            <table className="w-full border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-200 px-4 py-3 text-left font-bold">Unit System</th>
                  <th className="border border-slate-200 px-4 py-3 text-left font-bold">Divisor</th>
                  <th className="border border-slate-200 px-4 py-3 text-left font-bold">Formula</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-200 px-4 py-3">Imperial (US)</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono font-bold text-orange-600">139</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono">(L × W × H inches) ÷ 139 = lb</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-4 py-3">Metric</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono font-bold text-orange-600">~5000</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono">(L × W × H cm) ÷ 5000 = kg</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 my-6">
            <h4 className="font-bold text-slate-900 mb-2">Important: Amazon Rounds UP</h4>
            <p className="text-slate-700">
              Amazon rounds dimensional weight <strong>up to the nearest pound</strong>. A calculated weight of 2.01 lb becomes 3 lb. This rounding can significantly impact your fees!
            </p>
          </div>
        </section>

        {/* Section 3 */}
        <section id="examples" className="mb-12">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900 mb-4">
            <Package className="text-orange-500" size={28} />
            Real-World Calculation Examples
          </h2>

          <div className="grid md:grid-cols-2 gap-6 my-6">
            {/* Example 1 */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h4 className="font-bold text-slate-900 mb-3">Example 1: Small Electronics</h4>
              <div className="space-y-2 text-sm text-slate-600 mb-4">
                <p><strong>Package:</strong> 10" × 8" × 4"</p>
                <p><strong>Actual Weight:</strong> 1.5 lb</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 font-mono text-sm">
                <p>DIM = (10 × 8 × 4) ÷ 139</p>
                <p>DIM = 320 ÷ 139 = <span className="text-orange-600 font-bold">2.3 lb → 3 lb</span></p>
              </div>
              <p className="mt-3 text-sm text-red-600 font-medium">
                Billable: 3 lb (2× actual weight!)
              </p>
            </div>

            {/* Example 2 */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h4 className="font-bold text-slate-900 mb-3">Example 2: Clothing Item</h4>
              <div className="space-y-2 text-sm text-slate-600 mb-4">
                <p><strong>Package:</strong> 14" × 10" × 3"</p>
                <p><strong>Actual Weight:</strong> 0.8 lb</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 font-mono text-sm">
                <p>DIM = (14 × 10 × 3) ÷ 139</p>
                <p>DIM = 420 ÷ 139 = <span className="text-orange-600 font-bold">3.02 lb → 4 lb</span></p>
              </div>
              <p className="mt-3 text-sm text-red-600 font-medium">
                Billable: 4 lb (5× actual weight!)
              </p>
            </div>

            {/* Example 3 */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h4 className="font-bold text-slate-900 mb-3">Example 3: Heavy Tool</h4>
              <div className="space-y-2 text-sm text-slate-600 mb-4">
                <p><strong>Package:</strong> 12" × 8" × 6"</p>
                <p><strong>Actual Weight:</strong> 8 lb</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 font-mono text-sm">
                <p>DIM = (12 × 8 × 6) ÷ 139</p>
                <p>DIM = 576 ÷ 139 = <span className="text-green-600 font-bold">4.14 lb → 5 lb</span></p>
              </div>
              <p className="mt-3 text-sm text-green-600 font-medium">
                Billable: 8 lb (actual weight wins)
              </p>
            </div>

            {/* Example 4 */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h4 className="font-bold text-slate-900 mb-3">Example 4: Large Light Item</h4>
              <div className="space-y-2 text-sm text-slate-600 mb-4">
                <p><strong>Package:</strong> 18" × 14" × 12"</p>
                <p><strong>Actual Weight:</strong> 3 lb</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 font-mono text-sm">
                <p>DIM = (18 × 14 × 12) ÷ 139</p>
                <p>DIM = 3024 ÷ 139 = <span className="text-orange-600 font-bold">21.76 lb → 22 lb</span></p>
              </div>
              <p className="mt-3 text-sm text-red-600 font-medium">
                Billable: 22 lb (7× actual weight!)
              </p>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section id="vs-carriers" className="mb-12">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900 mb-4">
            <Truck className="text-orange-500" size={28} />
            Amazon vs Other Carriers
          </h2>

          <p className="text-slate-600 leading-relaxed mb-6">
            Different carriers use different DIM divisors. Understanding these differences helps you plan your logistics strategy:
          </p>

          <div className="overflow-x-auto my-6">
            <table className="w-full border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-200 px-4 py-3 text-left font-bold">Carrier</th>
                  <th className="border border-slate-200 px-4 py-3 text-left font-bold">Divisor (in³/lb)</th>
                  <th className="border border-slate-200 px-4 py-3 text-left font-bold">Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-orange-50">
                  <td className="border border-slate-200 px-4 py-3 font-bold">Amazon FBA</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono font-bold text-orange-600">139</td>
                  <td className="border border-slate-200 px-4 py-3">Most aggressive for large items</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-4 py-3">UPS / FedEx</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono">139</td>
                  <td className="border border-slate-200 px-4 py-3">Standard for domestic US</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-4 py-3">USPS</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono">166</td>
                  <td className="border border-slate-200 px-4 py-3">More favorable for light items</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-4 py-3">DHL Express</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono">139</td>
                  <td className="border border-slate-200 px-4 py-3">International standard</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-4 py-3">Air Freight (General)</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono">166-194</td>
                  <td className="border border-slate-200 px-4 py-3">Varies by carrier</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-4 py-3">Sea Freight</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono">N/A</td>
                  <td className="border border-slate-200 px-4 py-3">Charged by CBM, not DIM</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 my-6">
            <h4 className="font-bold text-slate-900 mb-2">Pro Tip: USPS for Light Items</h4>
            <p className="text-slate-700">
              If you're fulfilling orders yourself (FBM), USPS's 166 divisor can save you money on lightweight but bulky items. The same package that costs $15 via FedEx might cost $11 via USPS due to the different DIM calculations.
            </p>
          </div>
        </section>

        {/* Section 5 */}
        <section id="optimization" className="mb-12">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900 mb-4">
            <CheckCircle className="text-orange-500" size={28} />
            Packaging Optimization Strategies
          </h2>

          <p className="text-slate-600 leading-relaxed mb-6">
            Reducing dimensional weight is one of the most effective ways to lower your Amazon FBA costs. Here are proven strategies:
          </p>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-3">1. Right-Size Your Packaging</h4>
              <p className="text-slate-600 mb-3">
                Use the smallest box that safely fits your product. Amazon measures the actual package dimensions, so every inch counts.
              </p>
              <div className="bg-green-50 rounded-lg p-3 text-sm">
                <strong className="text-green-700">Savings Example:</strong> Reducing a box from 12"×10"×8" to 10"×8"×6" reduces DIM weight from 7 lb to 4 lb — saving ~$1.50 per unit in FBA fees.
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-3">2. Consider Poly Bags</h4>
              <p className="text-slate-600 mb-3">
                For soft goods (clothing, plush toys, textiles), poly bags can dramatically reduce dimensions compared to boxes.
              </p>
              <div className="bg-green-50 rounded-lg p-3 text-sm">
                <strong className="text-green-700">Savings Example:</strong> A t-shirt in a 14"×10"×3" box = 4 lb DIM. Same t-shirt in a poly bag = actual weight only (~0.5 lb).
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-3">3. Vacuum Sealing</h4>
              <p className="text-slate-600 mb-3">
                Compressible items like bedding, pillows, or clothing can be vacuum-sealed to significantly reduce volume.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-3">4. Redesign Product Packaging</h4>
              <p className="text-slate-600 mb-3">
                Work with your manufacturer to create compact packaging. Flat-pack or knockdown designs can reduce DIM weight by 50% or more.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-3">5. Remove Excess Void Fill</h4>
              <p className="text-slate-600 mb-3">
                If you're using a box larger than necessary and filling it with air pillows or paper, you're paying for that air! Downsize the box instead.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6 - Calculator CTA */}
        <section id="calculator" className="mb-12">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">
              {lang === 'zh' ? '使用我們的免費計算器' : 'Use Our Free Calculator'}
            </h2>
            <p className="text-white/90 mb-6">
              {lang === 'zh'
                ? '立即計算您產品的體積重量和 FBA 費用估算。支援公制和英制單位。'
                : 'Calculate your product\'s dimensional weight and estimate FBA fees instantly. Supports both metric and imperial units.'}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/fba"
                className="bg-white text-orange-600 px-6 py-3 rounded-xl font-bold hover:bg-orange-50 transition-colors"
              >
                {lang === 'zh' ? 'FBA 尺寸計算器' : 'FBA Size Calculator'}
              </Link>
              <Link
                to="/packing"
                className="bg-orange-400 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-300 transition-colors border border-orange-300"
              >
                {lang === 'zh' ? '裝箱計算器' : 'Packing Calculator'}
              </Link>
            </div>
          </div>
        </section>

        {/* Summary */}
        <section className="bg-slate-100 rounded-2xl p-8 mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            {lang === 'zh' ? '總結' : 'Summary'}
          </h2>
          <ul className="space-y-3 text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-orange-500 font-bold">•</span>
              Amazon uses a <strong>139 cubic inch divisor</strong> for dimensional weight
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 font-bold">•</span>
              You pay for whichever is greater: <strong>actual weight or DIM weight</strong>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 font-bold">•</span>
              DIM weight is <strong>rounded UP</strong> to the nearest pound
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 font-bold">•</span>
              <strong>Right-sizing packaging</strong> is the #1 way to reduce DIM weight fees
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 font-bold">•</span>
              Use <strong>poly bags</strong> for eligible items to avoid DIM weight entirely
            </li>
          </ul>
        </section>

      </div>

      {/* Related Guides */}
      <div className="border-t border-slate-200 pt-8 mt-8">
        <h3 className="font-bold text-slate-900 mb-4">{lang === 'zh' ? '相關指南' : 'Related Guides'}</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Link to="/guides/fba-size-tiers-2025" className="block p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-colors">
            <h4 className="font-bold text-slate-900 mb-1">Amazon FBA Size Tiers 2025</h4>
            <p className="text-sm text-slate-600">Complete guide to FBA size tier classifications and fees</p>
          </Link>
          <Link to="/guides/dimensional-weight-calculator" className="block p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-colors">
            <h4 className="font-bold text-slate-900 mb-1">Dimensional Weight Calculator Guide</h4>
            <p className="text-sm text-slate-600">Compare DIM weight across carriers and shipping methods</p>
          </Link>
        </div>
      </div>
    </article>
  );
}
