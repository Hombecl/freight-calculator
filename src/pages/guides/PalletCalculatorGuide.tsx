import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Layers, Package, Truck, Calculator, Ruler, CheckCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function PalletCalculatorGuide() {
  const { lang } = useApp();

  return (
    <article className="max-w-4xl mx-auto">
      <Helmet>
        <title>Pallet Calculator Guide: Optimize Pallet Loading & Shipping | DimPack3D</title>
        <meta name="description" content="Free pallet calculator guide. Learn standard pallet sizes, calculate cartons per pallet, optimize pallet loading patterns, and reduce LTL and FTL shipping costs." />
        <meta name="keywords" content="pallet calculator, pallet loading calculator, cartons per pallet, pallet size, pallet weight calculator, LTL shipping, FTL shipping, pallet optimization, 48x40 pallet" />
        <meta property="og:url" content="https://www.dimpack3d.com/guides/pallet-calculator" />
        <meta property="og:title" content="Pallet Calculator Guide: Optimize Pallet Loading & Shipping" />
        <meta property="og:description" content="Learn standard pallet sizes, calculate cartons per pallet, and optimize your pallet loading for cost-effective shipping." />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "Pallet Calculator Guide: Optimize Pallet Loading & Shipping",
            "description": "Free pallet calculator guide. Learn standard pallet sizes, calculate cartons per pallet, optimize pallet loading patterns, and reduce shipping costs.",
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
                "name": "What is the standard pallet size in the US?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "The standard GMA pallet size in the US is 48\" × 40\" (1219mm × 1016mm). This is used by about 30% of all pallets produced in North America. Other common sizes include 42\" × 42\" (grocery), 48\" × 48\" (drums), and 40\" × 40\" (dairy)."
                }
              },
              {
                "@type": "Question",
                "name": "How do I calculate cartons per pallet?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Calculate cartons per pallet using: Floor positions = (Pallet Length ÷ Carton Length) × (Pallet Width ÷ Carton Width), rounded down. Then multiply by the number of layers: Layers = Max Stack Height ÷ Carton Height. Total cartons = Floor positions × Layers."
                }
              },
              {
                "@type": "Question",
                "name": "What is the maximum pallet height for shipping?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Standard maximum pallet height is 48\" (including the pallet). For LTL shipping, most carriers accept up to 48-60\" total height. For FTL (full truckload), the limit is typically 96-102\" to fit in a standard dry van trailer."
                }
              },
              {
                "@type": "Question",
                "name": "How much weight can a standard pallet hold?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "A standard GMA wood pallet can hold 2,500-3,000 lbs when properly stacked. However, LTL carriers often have per-pallet weight limits of 2,000-2,500 lbs. For floor-loaded positions, the limit may be 1,500 lbs. Always check your carrier's specific requirements."
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
          <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-medium">Logistics</span>
          <span>•</span>
          <span>8 min read</span>
          <span>•</span>
          <span>Updated Jan 2025</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
          {lang === 'zh'
            ? '棧板計算器指南：優化棧板裝載與運輸'
            : 'Pallet Calculator Guide: Optimize Pallet Loading & Shipping'}
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed">
          {lang === 'zh'
            ? '學習標準棧板尺寸、計算每棧板紙箱數量、優化棧板裝載方式，以降低 LTL 和 FTL 運輸成本。'
            : 'Learn standard pallet sizes, calculate cartons per pallet, optimize pallet loading patterns, and reduce your LTL and FTL shipping costs.'}
        </p>
      </header>

      {/* Key Stats Box */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-indigo-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-indigo-600">48×40"</div>
          <div className="text-sm text-slate-600">Standard US Pallet</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-blue-600">2,500 lb</div>
          <div className="text-sm text-slate-600">Max Weight</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-green-600">48-60"</div>
          <div className="text-sm text-slate-600">LTL Max Height</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-amber-600">22-26</div>
          <div className="text-sm text-slate-600">Pallets per Truck</div>
        </div>
      </div>

      {/* Table of Contents */}
      <nav className="bg-slate-50 rounded-xl p-6 mb-10">
        <h2 className="font-bold text-slate-900 mb-4">{lang === 'zh' ? '目錄' : 'Table of Contents'}</h2>
        <ol className="space-y-2 text-blue-600">
          <li><a href="#sizes" className="hover:underline">1. Standard Pallet Sizes</a></li>
          <li><a href="#calculation" className="hover:underline">2. Cartons Per Pallet Calculation</a></li>
          <li><a href="#patterns" className="hover:underline">3. Pallet Loading Patterns</a></li>
          <li><a href="#weight" className="hover:underline">4. Weight Limits & Restrictions</a></li>
          <li><a href="#ltl-ftl" className="hover:underline">5. LTL vs FTL Shipping</a></li>
          <li><a href="#optimization" className="hover:underline">6. Pallet Optimization Tips</a></li>
        </ol>
      </nav>

      {/* Main Content */}
      <div className="prose prose-slate max-w-none">

        {/* Section 1 */}
        <section id="sizes" className="mb-12">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900 mb-4">
            <Ruler className="text-indigo-500" size={28} />
            Standard Pallet Sizes
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Choosing the right pallet size is crucial for maximizing shipping efficiency. Different industries and regions use different standards. Here are the most common pallet sizes:
          </p>

          <h3 className="font-bold text-slate-900 mt-8 mb-4">North American Pallet Sizes</h3>
          <div className="overflow-x-auto my-6">
            <table className="w-full border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
              <thead className="bg-indigo-100">
                <tr>
                  <th className="border border-slate-200 px-4 py-3 text-left font-bold">Size (inches)</th>
                  <th className="border border-slate-200 px-4 py-3 text-left font-bold">Size (mm)</th>
                  <th className="border border-slate-200 px-4 py-3 text-left font-bold">Common Use</th>
                  <th className="border border-slate-200 px-4 py-3 text-left font-bold">% of Market</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-indigo-50">
                  <td className="border border-slate-200 px-4 py-3 font-bold text-indigo-600">48" × 40"</td>
                  <td className="border border-slate-200 px-4 py-3">1219 × 1016</td>
                  <td className="border border-slate-200 px-4 py-3">GMA Standard (Most Common)</td>
                  <td className="border border-slate-200 px-4 py-3 font-bold">30%</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-4 py-3 font-bold">42" × 42"</td>
                  <td className="border border-slate-200 px-4 py-3">1067 × 1067</td>
                  <td className="border border-slate-200 px-4 py-3">Grocery, Warehouse Clubs</td>
                  <td className="border border-slate-200 px-4 py-3">~5%</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-4 py-3 font-bold">48" × 48"</td>
                  <td className="border border-slate-200 px-4 py-3">1219 × 1219</td>
                  <td className="border border-slate-200 px-4 py-3">Drums, Barrels</td>
                  <td className="border border-slate-200 px-4 py-3">~5%</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-4 py-3 font-bold">40" × 40"</td>
                  <td className="border border-slate-200 px-4 py-3">1016 × 1016</td>
                  <td className="border border-slate-200 px-4 py-3">Dairy Industry</td>
                  <td className="border border-slate-200 px-4 py-3">~3%</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-4 py-3 font-bold">48" × 42"</td>
                  <td className="border border-slate-200 px-4 py-3">1219 × 1067</td>
                  <td className="border border-slate-200 px-4 py-3">Chemical, Paint</td>
                  <td className="border border-slate-200 px-4 py-3">~3%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="font-bold text-slate-900 mt-8 mb-4">International Pallet Sizes (ISO)</h3>
          <div className="overflow-x-auto my-6">
            <table className="w-full border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-200 px-4 py-3 text-left font-bold">Size (mm)</th>
                  <th className="border border-slate-200 px-4 py-3 text-left font-bold">Size (inches)</th>
                  <th className="border border-slate-200 px-4 py-3 text-left font-bold">Region</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-200 px-4 py-3 font-bold text-blue-600">1200 × 800</td>
                  <td className="border border-slate-200 px-4 py-3">47.2" × 31.5"</td>
                  <td className="border border-slate-200 px-4 py-3">Europe (EUR Pallet)</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-4 py-3 font-bold">1200 × 1000</td>
                  <td className="border border-slate-200 px-4 py-3">47.2" × 39.4"</td>
                  <td className="border border-slate-200 px-4 py-3">Europe, Asia</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-4 py-3 font-bold">1100 × 1100</td>
                  <td className="border border-slate-200 px-4 py-3">43.3" × 43.3"</td>
                  <td className="border border-slate-200 px-4 py-3">Asia, Australia</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 my-6">
            <h4 className="font-bold text-slate-900 mb-2">Pro Tip: Amazon FBA Pallets</h4>
            <p className="text-slate-700">
              Amazon FBA accepts <strong>40" × 48" or 48" × 40"</strong> standard GMA pallets. Maximum pallet height including the pallet is <strong>72 inches</strong> for most fulfillment centers. Non-standard pallets may be rejected or incur additional fees.
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section id="calculation" className="mb-12">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900 mb-4">
            <Calculator className="text-indigo-500" size={28} />
            Cartons Per Pallet Calculation
          </h2>

          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl p-6 my-6">
            <h3 className="font-bold text-xl mb-4">Pallet Loading Formula</h3>
            <div className="space-y-2 bg-white/20 rounded-lg p-4 font-mono text-sm">
              <p><strong>Floor Positions</strong> = ⌊Pallet L ÷ Carton L⌋ × ⌊Pallet W ÷ Carton W⌋</p>
              <p><strong>Layers</strong> = ⌊Max Height ÷ Carton H⌋</p>
              <p><strong>Total Cartons</strong> = Floor Positions × Layers</p>
            </div>
            <p className="text-white/80 text-sm mt-3">⌊ ⌋ means round down to nearest whole number</p>
          </div>

          <h3 className="font-bold text-slate-900 mt-8 mb-4">Step-by-Step Example</h3>
          <div className="bg-white border border-slate-200 rounded-xl p-6 my-6">
            <h4 className="font-bold text-slate-900 mb-4">Scenario: Loading cartons onto a 48" × 40" pallet</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-500 mb-2">Given:</p>
                <ul className="space-y-1 text-slate-700">
                  <li>• Pallet: 48" × 40"</li>
                  <li>• Carton: 18" × 12" × 10"</li>
                  <li>• Max stack height: 48"</li>
                </ul>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-2">Calculation:</p>
                <div className="bg-slate-50 rounded-lg p-3 font-mono text-sm space-y-1">
                  <p>Length: 48 ÷ 18 = 2.67 → <strong>2</strong></p>
                  <p>Width: 40 ÷ 12 = 3.33 → <strong>3</strong></p>
                  <p>Floor positions: 2 × 3 = <strong>6 cartons</strong></p>
                  <p>Layers: 48 ÷ 10 = 4.8 → <strong>4 layers</strong></p>
                  <p className="pt-2 border-t border-slate-200">Total: 6 × 4 = <strong className="text-indigo-600">24 cartons</strong></p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 my-6">
            <h4 className="font-bold text-slate-900 mb-2">Don't Forget: Try Both Orientations!</h4>
            <p className="text-slate-700">
              Always calculate with your carton in both orientations (length vs width swapped). Sometimes rotating 90° yields more cartons per pallet.
            </p>
          </div>
        </section>

        {/* Section 3 */}
        <section id="patterns" className="mb-12">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900 mb-4">
            <Layers className="text-indigo-500" size={28} />
            Pallet Loading Patterns
          </h2>

          <p className="text-slate-600 leading-relaxed mb-6">
            The way you arrange cartons on a pallet affects both capacity and stability. Here are the most common loading patterns:
          </p>

          <div className="grid md:grid-cols-2 gap-6 my-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-3">Column Stacking</h4>
              <div className="bg-slate-100 rounded-lg p-4 mb-3 text-center font-mono text-sm">
                ┌─┬─┬─┐<br/>
                │A│A│A│<br/>
                ├─┼─┼─┤<br/>
                │A│A│A│<br/>
                └─┴─┴─┘
              </div>
              <p className="text-slate-600 text-sm mb-2">
                All cartons in same orientation, stacked directly on top of each other.
              </p>
              <div className="flex gap-2">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Max capacity</span>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Less stable</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-3">Interlocking (Brick)</h4>
              <div className="bg-slate-100 rounded-lg p-4 mb-3 text-center font-mono text-sm">
                Layer 1: ┌─┬─┬─┐<br/>
                Layer 2: ┌─┼─┼─┐<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│ └─┴─┘ │
              </div>
              <p className="text-slate-600 text-sm mb-2">
                Alternating layers rotated 90° to create interlock.
              </p>
              <div className="flex gap-2">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Most stable</span>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">May reduce capacity</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-3">Pinwheel Pattern</h4>
              <div className="bg-slate-100 rounded-lg p-4 mb-3 text-center font-mono text-sm">
                ┌──┬─┐<br/>
                │ ─┤ │<br/>
                ├─ ├──┤<br/>
                └─┴──┘
              </div>
              <p className="text-slate-600 text-sm mb-2">
                Cartons arranged in rotating pattern around center.
              </p>
              <div className="flex gap-2">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Good stability</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Good capacity</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-3">Split Row</h4>
              <div className="bg-slate-100 rounded-lg p-4 mb-3 text-center font-mono text-sm">
                ┌──┬──┬──┐<br/>
                │ A│ B│ A│<br/>
                ├──┼──┼──┤<br/>
                │ B│ A│ B│<br/>
                └──┴──┴──┘
              </div>
              <p className="text-slate-600 text-sm mb-2">
                Mix of two orientations within the same layer.
              </p>
              <div className="flex gap-2">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Fills gaps</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Maximizes space</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section id="weight" className="mb-12">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900 mb-4">
            <Package className="text-indigo-500" size={28} />
            Weight Limits & Restrictions
          </h2>

          <p className="text-slate-600 leading-relaxed mb-4">
            Understanding weight limits prevents damage, rejected shipments, and safety issues. Here are the key limits to know:
          </p>

          <div className="overflow-x-auto my-6">
            <table className="w-full border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-200 px-4 py-3 text-left font-bold">Limit Type</th>
                  <th className="border border-slate-200 px-4 py-3 text-left font-bold">Standard Value</th>
                  <th className="border border-slate-200 px-4 py-3 text-left font-bold">Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-200 px-4 py-3 font-medium">Wood Pallet Capacity</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono font-bold text-indigo-600">2,500-3,000 lb</td>
                  <td className="border border-slate-200 px-4 py-3 text-slate-600">For standard GMA pallet</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-4 py-3 font-medium">LTL Per-Pallet Limit</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono font-bold text-indigo-600">2,000-2,500 lb</td>
                  <td className="border border-slate-200 px-4 py-3 text-slate-600">Varies by carrier</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-4 py-3 font-medium">LTL Total Shipment</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono font-bold text-indigo-600">10,000-20,000 lb</td>
                  <td className="border border-slate-200 px-4 py-3 text-slate-600">Above this, consider FTL</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-4 py-3 font-medium">FTL Dry Van Limit</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono font-bold text-indigo-600">44,000-45,000 lb</td>
                  <td className="border border-slate-200 px-4 py-3 text-slate-600">Legal road weight limit</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-4 py-3 font-medium">Amazon FBA Per-Pallet</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono font-bold text-indigo-600">1,500 lb</td>
                  <td className="border border-slate-200 px-4 py-3 text-slate-600">Strict limit enforced</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-5 my-6">
            <h4 className="font-bold text-red-800 mb-2">Weight Distribution Matters</h4>
            <p className="text-slate-700">
              Heavy items should be on the bottom layers, lighter items on top. Uneven weight distribution can cause pallet collapse during transport. Never exceed 50% of weight on the top half of the pallet.
            </p>
          </div>
        </section>

        {/* Section 5 */}
        <section id="ltl-ftl" className="mb-12">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900 mb-4">
            <Truck className="text-indigo-500" size={28} />
            LTL vs FTL Shipping
          </h2>

          <p className="text-slate-600 leading-relaxed mb-6">
            Understanding when to use LTL (Less Than Truckload) vs FTL (Full Truckload) can save significant shipping costs:
          </p>

          <div className="grid md:grid-cols-2 gap-6 my-6">
            <div className="bg-white border-2 border-blue-200 rounded-xl p-5">
              <h4 className="font-bold text-blue-700 mb-3">LTL (Less Than Truckload)</h4>
              <ul className="space-y-2 text-slate-600 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
                  <span>1-10 pallets typically</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
                  <span>Shared truck space with other shippers</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
                  <span>Priced by freight class + weight</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
                  <span>3-7 day transit typical</span>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
                <strong>Best for:</strong> Smaller shipments, flexible delivery timing
              </div>
            </div>

            <div className="bg-white border-2 border-green-200 rounded-xl p-5">
              <h4 className="font-bold text-green-700 mb-3">FTL (Full Truckload)</h4>
              <ul className="space-y-2 text-slate-600 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
                  <span>22-26 pallets (53' trailer)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
                  <span>Dedicated truck, direct route</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
                  <span>Flat rate per load</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
                  <span>1-3 day transit typical</span>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-green-50 rounded-lg text-sm">
                <strong>Best for:</strong> Large shipments, time-sensitive, fragile goods
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 my-6">
            <h4 className="font-bold text-slate-900 mb-2">Cost Comparison Rule of Thumb</h4>
            <p className="text-slate-700">
              FTL typically becomes more cost-effective than LTL at around <strong>10-12 pallets</strong> or <strong>10,000+ lbs</strong>. Always get quotes for both to compare.
            </p>
          </div>

          <h3 className="font-bold text-slate-900 mt-8 mb-4">Standard Trailer Capacities</h3>
          <div className="overflow-x-auto my-6">
            <table className="w-full border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-200 px-4 py-3 text-left font-bold">Trailer Type</th>
                  <th className="border border-slate-200 px-4 py-3 text-left font-bold">Dimensions</th>
                  <th className="border border-slate-200 px-4 py-3 text-left font-bold">Pallet Capacity</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-200 px-4 py-3">53' Dry Van</td>
                  <td className="border border-slate-200 px-4 py-3">53' × 8.5' × 9'</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono font-bold text-indigo-600">22-26 pallets</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-4 py-3">48' Dry Van</td>
                  <td className="border border-slate-200 px-4 py-3">48' × 8.5' × 9'</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono font-bold text-indigo-600">20-24 pallets</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-4 py-3">40' Container</td>
                  <td className="border border-slate-200 px-4 py-3">40' × 7.8' × 7.8'</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono font-bold text-indigo-600">18-20 pallets</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-4 py-3">20' Container</td>
                  <td className="border border-slate-200 px-4 py-3">20' × 7.8' × 7.8'</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono font-bold text-indigo-600">8-10 pallets</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 6 */}
        <section id="optimization" className="mb-12">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900 mb-4">
            <CheckCircle className="text-indigo-500" size={28} />
            Pallet Optimization Tips
          </h2>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-3">1. Design Cartons for Pallet Fit</h4>
              <p className="text-slate-600 mb-3">
                Design your carton dimensions to maximize pallet coverage. Ideal carton dimensions divide evenly into pallet dimensions.
              </p>
              <div className="bg-green-50 rounded-lg p-3 text-sm">
                <strong className="text-green-700">Example:</strong> For 48" × 40" pallet, cartons of 12" × 10" fit perfectly (4 × 4 = 16 per layer with 100% coverage)
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-3">2. Stack to Maximum Height</h4>
              <p className="text-slate-600 mb-3">
                Utilize the full 48" or 60" height allowance when possible. More layers = more cartons = lower per-unit shipping cost.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-3">3. Use Slip Sheets</h4>
              <p className="text-slate-600 mb-3">
                Place cardboard slip sheets between layers for stability. This prevents carton crushing and allows for better interlocking.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-3">4. Proper Stretch Wrapping</h4>
              <p className="text-slate-600 mb-3">
                Wrap pallets with at least 3 layers of stretch film, including the pallet base. Corner boards protect edges and add stability.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-3">5. Avoid Overhang</h4>
              <p className="text-slate-600 mb-3">
                Cartons should not extend beyond pallet edges. Overhang leads to damage, rejection, and stacking problems in warehouses.
              </p>
            </div>
          </div>
        </section>

        {/* Calculator CTA */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">
              {lang === 'zh' ? '使用我們的免費計算器' : 'Optimize Your Shipping'}
            </h2>
            <p className="text-white/90 mb-6">
              {lang === 'zh'
                ? '使用我們的計算器優化您的包裝和裝載策略，降低運輸成本。'
                : 'Use our calculators to optimize your packaging and loading strategy for maximum cost savings.'}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/container"
                className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors"
              >
                {lang === 'zh' ? '貨櫃裝載計算器' : 'Container Calculator'}
              </Link>
              <Link
                to="/packing"
                className="bg-indigo-400 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-300 transition-colors border border-indigo-300"
              >
                {lang === 'zh' ? '裝箱計算器' : 'Packing Calculator'}
              </Link>
            </div>
          </div>
        </section>

      </div>

      {/* Related Guides */}
      <div className="border-t border-slate-200 pt-8 mt-8">
        <h3 className="font-bold text-slate-900 mb-4">{lang === 'zh' ? '相關指南' : 'Related Guides'}</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Link to="/guides/container-loading-optimization" className="block p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-colors">
            <h4 className="font-bold text-slate-900 mb-1">Container Loading Optimization</h4>
            <p className="text-sm text-slate-600">Maximize 20GP, 40GP, 40HQ container utilization</p>
          </Link>
          <Link to="/guides/cbm-calculator-shipping" className="block p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-colors">
            <h4 className="font-bold text-slate-900 mb-1">CBM Calculator Guide</h4>
            <p className="text-sm text-slate-600">Master shipping volume calculations</p>
          </Link>
        </div>
      </div>
    </article>
  );
}
