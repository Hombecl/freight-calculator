import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, DollarSign, Package, TrendingUp, Calculator, BarChart3, PiggyBank } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function FbaFeeCalculatorGuide() {
  const { lang } = useApp();

  return (
    <article className="max-w-4xl mx-auto">
      <Helmet>
        <title>Amazon FBA Fee Calculator 2025: Complete Guide to FBA Costs | DimPack3D</title>
        <meta name="description" content="Free guide to Amazon FBA fees and costs. Learn how to calculate fulfillment fees, storage fees, referral fees, and maximize your FBA profit margins in 2025." />
        <meta name="keywords" content="FBA fee calculator, amazon FBA fees, FBA fulfillment fees, FBA cost calculator, amazon seller fees, FBA profit calculator, FBA revenue calculator, amazon profit margin" />
        <link rel="canonical" href="https://www.dimpack3d.com/guides/fba-fee-calculator" />
        <meta property="og:url" content="https://www.dimpack3d.com/guides/fba-fee-calculator" />
        <meta property="og:title" content="Amazon FBA Fee Calculator 2025: Complete Guide to FBA Costs" />
        <meta property="og:description" content="Learn how to calculate all Amazon FBA fees and maximize your profit margins with our comprehensive guide." />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "Amazon FBA Fee Calculator 2025: Complete Guide to FBA Costs",
            "description": "Free guide to Amazon FBA fees and costs. Learn how to calculate fulfillment fees, storage fees, referral fees, and maximize your FBA profit margins.",
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
                "name": "What fees does Amazon FBA charge?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Amazon FBA charges several fees: 1) Fulfillment fees based on size and weight, 2) Monthly storage fees ($0.78-$2.40/cubic foot), 3) Referral fees (8-15% of sale price), 4) Optional services like labeling and prep. The total typically ranges from 30-45% of your sale price."
                }
              },
              {
                "@type": "Question",
                "name": "How do I calculate FBA profit margin?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "FBA Profit = Sale Price - Product Cost - FBA Fulfillment Fee - Referral Fee - Storage Fee - Shipping to Amazon. A healthy FBA profit margin is typically 25-35% after all fees. Use our calculator to estimate your specific margins."
                }
              },
              {
                "@type": "Question",
                "name": "What is the FBA fulfillment fee for 2025?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "2025 FBA fulfillment fees range from $3.22 for small standard items under 4oz to $158.49+ for special oversize items. The exact fee depends on your product's size tier and shipping weight (actual or dimensional, whichever is greater)."
                }
              },
              {
                "@type": "Question",
                "name": "How can I reduce my Amazon FBA fees?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Reduce FBA fees by: 1) Optimizing packaging to fit a lower size tier, 2) Reducing dimensional weight with compact packaging, 3) Avoiding long-term storage fees by managing inventory, 4) Using Amazon's partnered carrier discounts for inbound shipping."
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
          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">FBA Fees</span>
          <span>•</span>
          <span>12 min read</span>
          <span>•</span>
          <span>Updated Jan 2025</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
          {lang === 'zh'
            ? 'Amazon FBA 費用計算器 2025：完整成本指南'
            : 'Amazon FBA Fee Calculator 2025: Complete Guide to FBA Costs'}
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed">
          {lang === 'zh'
            ? '深入了解所有 Amazon FBA 費用結構，學習如何計算配送費、倉儲費、推薦費，並最大化您的利潤率。'
            : 'Deep dive into all Amazon FBA fee structures. Learn how to calculate fulfillment fees, storage fees, referral fees, and maximize your profit margins.'}
        </p>
      </header>

      {/* Key Stats Box */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-green-600">$3.22+</div>
          <div className="text-sm text-slate-600">Min Fulfillment Fee</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-blue-600">8-15%</div>
          <div className="text-sm text-slate-600">Referral Fee</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-amber-600">$0.78+</div>
          <div className="text-sm text-slate-600">Storage/cu ft</div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-purple-600">30-45%</div>
          <div className="text-sm text-slate-600">Total Fee Range</div>
        </div>
      </div>

      {/* Table of Contents */}
      <nav className="bg-slate-50 rounded-xl p-6 mb-10">
        <h2 className="font-bold text-slate-900 mb-4">{lang === 'zh' ? '目錄' : 'Table of Contents'}</h2>
        <ol className="space-y-2 text-blue-600">
          <li><a href="#overview" className="hover:underline">1. FBA Fee Structure Overview</a></li>
          <li><a href="#fulfillment" className="hover:underline">2. Fulfillment Fees by Size Tier</a></li>
          <li><a href="#storage" className="hover:underline">3. Storage Fees Explained</a></li>
          <li><a href="#referral" className="hover:underline">4. Referral Fees by Category</a></li>
          <li><a href="#profit" className="hover:underline">5. Calculating Profit Margins</a></li>
          <li><a href="#reduce" className="hover:underline">6. Strategies to Reduce Fees</a></li>
        </ol>
      </nav>

      {/* Main Content */}
      <div className="prose prose-slate max-w-none">

        {/* Section 1 */}
        <section id="overview" className="mb-12">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900 mb-4">
            <DollarSign className="text-green-500" size={28} />
            FBA Fee Structure Overview
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Amazon FBA (Fulfillment by Amazon) charges multiple types of fees. Understanding each one is crucial for calculating your true profit margins and making informed pricing decisions.
          </p>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden my-6">
            <table className="w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">Fee Type</th>
                  <th className="px-4 py-3 text-left font-bold">When Charged</th>
                  <th className="px-4 py-3 text-left font-bold">Typical Range</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium">Fulfillment Fee</td>
                  <td className="px-4 py-3 text-slate-600">Per unit sold</td>
                  <td className="px-4 py-3 font-mono text-green-600">$3.22 - $158.49+</td>
                </tr>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td className="px-4 py-3 font-medium">Referral Fee</td>
                  <td className="px-4 py-3 text-slate-600">Per sale (% of price)</td>
                  <td className="px-4 py-3 font-mono text-green-600">8% - 15%</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium">Monthly Storage</td>
                  <td className="px-4 py-3 text-slate-600">Monthly per cu ft</td>
                  <td className="px-4 py-3 font-mono text-green-600">$0.78 - $2.40</td>
                </tr>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td className="px-4 py-3 font-medium">Long-term Storage</td>
                  <td className="px-4 py-3 text-slate-600">Items 271+ days</td>
                  <td className="px-4 py-3 font-mono text-green-600">$6.90/cu ft or $0.15/unit</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium">Removal/Disposal</td>
                  <td className="px-4 py-3 text-slate-600">When requested</td>
                  <td className="px-4 py-3 font-mono text-green-600">$0.97 - $13.05/unit</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 2 */}
        <section id="fulfillment" className="mb-12">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900 mb-4">
            <Package className="text-green-500" size={28} />
            Fulfillment Fees by Size Tier (2025)
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Fulfillment fees are the core FBA cost, charged per unit when an order ships. They're based on your product's <strong>size tier</strong> and <strong>shipping weight</strong> (actual or dimensional, whichever is greater).
          </p>

          <h3 className="font-bold text-slate-900 mt-8 mb-4">Standard Size Items</h3>
          <div className="overflow-x-auto my-6">
            <table className="w-full border-collapse bg-white rounded-xl overflow-hidden shadow-sm text-sm">
              <thead className="bg-green-100">
                <tr>
                  <th className="border border-slate-200 px-3 py-2 text-left font-bold">Size Tier</th>
                  <th className="border border-slate-200 px-3 py-2 text-left font-bold">Weight</th>
                  <th className="border border-slate-200 px-3 py-2 text-left font-bold">Fee</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-200 px-3 py-2">Small Standard</td>
                  <td className="border border-slate-200 px-3 py-2">4 oz or less</td>
                  <td className="border border-slate-200 px-3 py-2 font-mono font-bold text-green-600">$3.22</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-3 py-2">Small Standard</td>
                  <td className="border border-slate-200 px-3 py-2">4+ to 8 oz</td>
                  <td className="border border-slate-200 px-3 py-2 font-mono font-bold text-green-600">$3.40</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2">Small Standard</td>
                  <td className="border border-slate-200 px-3 py-2">8+ to 12 oz</td>
                  <td className="border border-slate-200 px-3 py-2 font-mono font-bold text-green-600">$3.58</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-3 py-2">Small Standard</td>
                  <td className="border border-slate-200 px-3 py-2">12+ to 16 oz</td>
                  <td className="border border-slate-200 px-3 py-2 font-mono font-bold text-green-600">$3.77</td>
                </tr>
                <tr className="bg-green-50">
                  <td className="border border-slate-200 px-3 py-2">Large Standard</td>
                  <td className="border border-slate-200 px-3 py-2">4 oz or less</td>
                  <td className="border border-slate-200 px-3 py-2 font-mono font-bold text-green-600">$3.86</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2">Large Standard</td>
                  <td className="border border-slate-200 px-3 py-2">4+ to 8 oz</td>
                  <td className="border border-slate-200 px-3 py-2 font-mono font-bold text-green-600">$4.08</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-3 py-2">Large Standard</td>
                  <td className="border border-slate-200 px-3 py-2">8+ to 12 oz</td>
                  <td className="border border-slate-200 px-3 py-2 font-mono font-bold text-green-600">$4.24</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2">Large Standard</td>
                  <td className="border border-slate-200 px-3 py-2">12+ to 16 oz</td>
                  <td className="border border-slate-200 px-3 py-2 font-mono font-bold text-green-600">$4.75</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-3 py-2">Large Standard</td>
                  <td className="border border-slate-200 px-3 py-2">1+ to 1.5 lb</td>
                  <td className="border border-slate-200 px-3 py-2 font-mono font-bold text-green-600">$5.19</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2">Large Standard</td>
                  <td className="border border-slate-200 px-3 py-2">1.5+ to 2 lb</td>
                  <td className="border border-slate-200 px-3 py-2 font-mono font-bold text-green-600">$5.44</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-3 py-2">Large Standard</td>
                  <td className="border border-slate-200 px-3 py-2">2+ to 3 lb</td>
                  <td className="border border-slate-200 px-3 py-2 font-mono font-bold text-green-600">$6.14</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2">Large Standard</td>
                  <td className="border border-slate-200 px-3 py-2">3+ to 20 lb</td>
                  <td className="border border-slate-200 px-3 py-2 font-mono font-bold text-green-600">$6.64 + $0.16/4oz over 3lb</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="font-bold text-slate-900 mt-8 mb-4">Oversize Items</h3>
          <div className="overflow-x-auto my-6">
            <table className="w-full border-collapse bg-white rounded-xl overflow-hidden shadow-sm text-sm">
              <thead className="bg-amber-100">
                <tr>
                  <th className="border border-slate-200 px-3 py-2 text-left font-bold">Size Tier</th>
                  <th className="border border-slate-200 px-3 py-2 text-left font-bold">Weight Range</th>
                  <th className="border border-slate-200 px-3 py-2 text-left font-bold">Fee</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-200 px-3 py-2">Small Oversize</td>
                  <td className="border border-slate-200 px-3 py-2">70 lb or less</td>
                  <td className="border border-slate-200 px-3 py-2 font-mono font-bold text-amber-600">$9.73 + $0.42/lb over 1lb</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-3 py-2">Medium Oversize</td>
                  <td className="border border-slate-200 px-3 py-2">150 lb or less</td>
                  <td className="border border-slate-200 px-3 py-2 font-mono font-bold text-amber-600">$19.05 + $0.42/lb over 1lb</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2">Large Oversize</td>
                  <td className="border border-slate-200 px-3 py-2">150 lb or less</td>
                  <td className="border border-slate-200 px-3 py-2 font-mono font-bold text-amber-600">$89.98 + $0.83/lb over 90lb</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-3 py-2">Special Oversize</td>
                  <td className="border border-slate-200 px-3 py-2">Over 150 lb</td>
                  <td className="border border-slate-200 px-3 py-2 font-mono font-bold text-amber-600">$158.49 + $0.83/lb over 90lb</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3 */}
        <section id="storage" className="mb-12">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900 mb-4">
            <BarChart3 className="text-green-500" size={28} />
            Storage Fees Explained
          </h2>

          <p className="text-slate-600 leading-relaxed mb-4">
            Amazon charges monthly storage fees based on the cubic feet your inventory occupies. Rates vary by time of year and how long items have been in storage.
          </p>

          <h3 className="font-bold text-slate-900 mt-8 mb-4">Monthly Storage Fees</h3>
          <div className="overflow-x-auto my-6">
            <table className="w-full border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-200 px-4 py-3 text-left font-bold">Period</th>
                  <th className="border border-slate-200 px-4 py-3 text-left font-bold">Standard Size</th>
                  <th className="border border-slate-200 px-4 py-3 text-left font-bold">Oversize</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-200 px-4 py-3">Jan - Sep</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono font-bold text-green-600">$0.78 / cu ft</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono font-bold text-green-600">$0.56 / cu ft</td>
                </tr>
                <tr className="bg-amber-50">
                  <td className="border border-slate-200 px-4 py-3">Oct - Dec (Peak)</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono font-bold text-amber-600">$2.40 / cu ft</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono font-bold text-amber-600">$1.40 / cu ft</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-5 my-6">
            <h4 className="font-bold text-red-800 mb-2">Long-Term Storage Fees (Aged Inventory Surcharge)</h4>
            <p className="text-slate-700 mb-3">
              Items stored for 271+ days incur additional fees:
            </p>
            <ul className="space-y-1 text-slate-700">
              <li>• <strong>271-365 days:</strong> $1.50/cu ft or $0.50/unit (whichever is greater)</li>
              <li>• <strong>365+ days:</strong> $6.90/cu ft or $0.15/unit (whichever is greater)</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 my-6">
            <h4 className="font-bold text-slate-900 mb-2">Storage Fee Calculation Example</h4>
            <p className="text-slate-700 mb-2">
              Product dimensions: 10" × 8" × 4" (0.19 cu ft per unit)
            </p>
            <p className="text-slate-700 mb-2">
              Inventory: 100 units = 19 cubic feet
            </p>
            <div className="bg-white rounded-lg p-3 font-mono text-sm mt-3">
              <p>January: 19 cu ft × $0.78 = <strong>$14.82/month</strong></p>
              <p>October: 19 cu ft × $2.40 = <strong>$45.60/month</strong></p>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section id="referral" className="mb-12">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900 mb-4">
            <TrendingUp className="text-green-500" size={28} />
            Referral Fees by Category
          </h2>

          <p className="text-slate-600 leading-relaxed mb-4">
            Amazon charges a referral fee on every sale — a percentage of the total sale price (including shipping charges set by the seller). Most categories charge 15%, but some vary.
          </p>

          <div className="overflow-x-auto my-6">
            <table className="w-full border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-200 px-4 py-3 text-left font-bold">Category</th>
                  <th className="border border-slate-200 px-4 py-3 text-left font-bold">Referral Fee</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-200 px-4 py-3">Most Categories (Default)</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono font-bold text-green-600">15%</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-4 py-3">Electronics & Computers</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono font-bold text-green-600">8%</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-4 py-3">Consumer Electronics</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono font-bold text-green-600">8%</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-4 py-3">Grocery & Gourmet</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono font-bold text-green-600">8-15%</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-4 py-3">Clothing & Accessories</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono font-bold text-green-600">17%</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-4 py-3">Jewelry</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono font-bold text-green-600">20%</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-4 py-3">Amazon Device Accessories</td>
                  <td className="border border-slate-200 px-4 py-3 font-mono font-bold text-green-600">45%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 my-6">
            <h4 className="font-bold text-slate-900 mb-2">Minimum Referral Fee</h4>
            <p className="text-slate-700">
              Most categories have a <strong>$0.30 minimum referral fee</strong>. This means even if 15% of your $1.50 item is only $0.225, Amazon will charge the $0.30 minimum.
            </p>
          </div>
        </section>

        {/* Section 5 */}
        <section id="profit" className="mb-12">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900 mb-4">
            <PiggyBank className="text-green-500" size={28} />
            Calculating FBA Profit Margins
          </h2>

          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl p-6 my-6">
            <h3 className="font-bold text-xl mb-4">FBA Profit Formula</h3>
            <div className="bg-white/20 rounded-lg p-4 font-mono text-center mb-4">
              Profit = Sale Price - Product Cost - FBA Fee - Referral Fee - Storage - Inbound Shipping
            </div>
          </div>

          <h3 className="font-bold text-slate-900 mt-8 mb-4">Example Profit Calculation</h3>
          <div className="bg-white border border-slate-200 rounded-xl p-6 my-6">
            <h4 className="font-bold text-slate-900 mb-4">Product: Phone Case (Small Standard, 6 oz)</h4>
            <div className="space-y-3 text-slate-700">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Sale Price</span>
                <span className="font-mono font-bold text-green-600">+$19.99</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Product Cost (incl. inbound shipping)</span>
                <span className="font-mono font-bold text-red-600">-$4.50</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>FBA Fulfillment Fee (Small Std, 6oz)</span>
                <span className="font-mono font-bold text-red-600">-$3.40</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Referral Fee (15%)</span>
                <span className="font-mono font-bold text-red-600">-$3.00</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Storage Fee (est. 1 month)</span>
                <span className="font-mono font-bold text-red-600">-$0.05</span>
              </div>
              <div className="flex justify-between pt-2 text-lg">
                <span className="font-bold">Net Profit</span>
                <span className="font-mono font-bold text-green-600">$9.04 (45%)</span>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-5 my-6">
            <h4 className="font-bold text-slate-900 mb-2">Healthy FBA Profit Margins</h4>
            <ul className="space-y-2 text-slate-700">
              <li><strong>Excellent:</strong> 35%+ net margin</li>
              <li><strong>Good:</strong> 25-35% net margin</li>
              <li><strong>Acceptable:</strong> 15-25% net margin</li>
              <li><strong>Risky:</strong> Below 15% (leaves little room for fees changes or competition)</li>
            </ul>
          </div>
        </section>

        {/* Section 6 */}
        <section id="reduce" className="mb-12">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900 mb-4">
            <Calculator className="text-green-500" size={28} />
            Strategies to Reduce FBA Fees
          </h2>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-3">1. Optimize to a Lower Size Tier</h4>
              <p className="text-slate-600 mb-3">
                The difference between Small Standard and Large Standard can be $0.50+ per unit. Redesign packaging to stay under 15" × 12" × 0.75" for Small Standard classification.
              </p>
              <div className="bg-green-50 rounded-lg p-3 text-sm">
                <strong className="text-green-700">Savings:</strong> $0.50-$1.00 per unit by staying in Small Standard
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-3">2. Reduce Dimensional Weight</h4>
              <p className="text-slate-600 mb-3">
                Use compact packaging to lower your billable weight. Every pound saved is ~$0.16-$0.42 saved per unit.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-3">3. Avoid Long-Term Storage Fees</h4>
              <p className="text-slate-600 mb-3">
                Monitor your Inventory Health Report. Remove or liquidate slow-moving inventory before the 271-day mark to avoid aged inventory surcharges.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-3">4. Ship During Non-Peak Months</h4>
              <p className="text-slate-600 mb-3">
                Send inventory to Amazon in September rather than October to avoid peak season storage rates ($2.40 vs $0.78 per cu ft).
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-3">5. Use Amazon's Partnered Carriers</h4>
              <p className="text-slate-600 mb-3">
                Amazon's partnered carrier program offers discounted inbound shipping rates. This can save 20-40% vs standard carrier rates.
              </p>
            </div>
          </div>
        </section>

        {/* Calculator CTA */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">
              {lang === 'zh' ? '使用我們的免費計算器' : 'Calculate Your FBA Fees Now'}
            </h2>
            <p className="text-white/90 mb-6">
              {lang === 'zh'
                ? '輸入您的產品尺寸和重量，立即獲得準確的 FBA 費用估算。'
                : 'Enter your product dimensions and weight to get accurate FBA fee estimates instantly.'}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/fba"
                className="bg-white text-green-600 px-6 py-3 rounded-xl font-bold hover:bg-green-50 transition-colors"
              >
                {lang === 'zh' ? 'FBA 費用計算器' : 'FBA Fee Calculator'}
              </Link>
              <Link
                to="/packing"
                className="bg-green-400 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-300 transition-colors border border-green-300"
              >
                {lang === 'zh' ? '裝箱優化計算器' : 'Packing Optimizer'}
              </Link>
            </div>
          </div>
        </section>

      </div>

      {/* Related Guides */}
      <div className="border-t border-slate-200 pt-8 mt-8">
        <h3 className="font-bold text-slate-900 mb-4">{lang === 'zh' ? '相關指南' : 'Related Guides'}</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Link to="/guides/fba-size-tiers-2025" className="block p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-colors">
            <h4 className="font-bold text-slate-900 mb-1">Amazon FBA Size Tiers 2025</h4>
            <p className="text-sm text-slate-600">Complete guide to FBA size tier classifications</p>
          </Link>
          <Link to="/guides/amazon-dimensional-weight" className="block p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-colors">
            <h4 className="font-bold text-slate-900 mb-1">Amazon Dimensional Weight Guide</h4>
            <p className="text-sm text-slate-600">Master DIM weight calculations for FBA</p>
          </Link>
        </div>
      </div>
    </article>
  );
}
