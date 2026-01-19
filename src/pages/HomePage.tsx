import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Package, Container, Cuboid, ArrowRight, CheckCircle, Zap, Globe, Calculator, Star } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function HomePage() {
  const { lang } = useApp();

  return (
    <div className="-mt-14 md:-mt-16">
      <Helmet>
        <title>DimPack3D - Free 3D Packaging Calculator | CBM & FBA Size Optimizer</title>
        <meta name="description" content="Free 3D packaging calculator for e-commerce sellers. Calculate CBM, optimize FBA packaging dimensions, visualize container loading, and estimate shipping costs. Perfect for Amazon & Walmart sellers." />
        <meta name="keywords" content="packaging calculator, CBM calculator, FBA calculator, dimensional weight calculator, 3D container loading, Amazon FBA size tiers, box packing calculator, shipping calculator, carton calculator, e-commerce logistics" />
        <link rel="canonical" href="https://www.dimpack3d.com/" />
        <meta property="og:url" content="https://www.dimpack3d.com/" />
        <meta property="og:title" content="DimPack3D - Free 3D Packaging Calculator | CBM & FBA Size Optimizer" />
        <meta property="og:description" content="Free 3D packaging calculator for e-commerce sellers. Calculate CBM, optimize packaging, visualize container loading in 3D." />
      </Helmet>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23fff' stroke-width='1'%3E%3Cpath d='M30 5L55 17L30 29L5 17L30 5Z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 pt-24 md:pt-32 pb-20 md:pb-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-1.5 text-sm mb-6">
                <Zap size={14} className="text-yellow-400" />
                <span>{lang === 'zh' ? '100% 免費使用' : '100% Free to Use'}</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-6">
                {lang === 'zh' ? (
                  <>3D 智能包裝<br/>計算工具</>
                ) : (
                  <>Smart 3D<br/>Packaging<br/>Calculator</>
                )}
              </h1>

              <p className="text-lg md:text-xl text-blue-100 mb-8 leading-relaxed max-w-lg">
                {lang === 'zh'
                  ? '專為跨境電商賣家設計。計算最佳裝箱方案、海空運費用、貨櫃裝載率，以及 Amazon FBA 尺寸分級。'
                  : 'Built for e-commerce sellers. Calculate optimal packing, shipping costs, container loading, and Amazon FBA size tiers.'}
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  to="/packing"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105"
                >
                  {lang === 'zh' ? '開始使用' : 'Get Started'}
                  <ArrowRight size={20} />
                </Link>
                <a
                  href="#tools"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-3 rounded-xl font-bold text-lg transition-all"
                >
                  {lang === 'zh' ? '瀏覽工具' : 'View Tools'}
                </a>
              </div>
            </div>

            {/* 3D Box Animation */}
            <div className="hidden md:flex justify-center">
              <div className="relative w-80 h-80">
                <svg viewBox="0 0 200 200" className="w-full h-full animate-float">
                  <defs>
                    <linearGradient id="topFace" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#60A5FA"/>
                      <stop offset="100%" stopColor="#3B82F6"/>
                    </linearGradient>
                  </defs>
                  <g transform="translate(20, 30)">
                    <polygon points="80,10 150,45 80,80 10,45" fill="url(#topFace)" opacity="0.9"/>
                    <polygon points="10,45 80,80 80,150 10,115" fill="#2563EB"/>
                    <polygon points="80,80 150,45 150,115 80,150" fill="#1D4ED8"/>
                    {/* Dimension markers */}
                    <line x1="80" y1="10" x2="80" y2="0" stroke="#93C5FD" strokeWidth="2"/>
                    <line x1="75" y1="0" x2="85" y2="0" stroke="#93C5FD" strokeWidth="2"/>
                    <line x1="155" y1="80" x2="165" y2="75" stroke="#93C5FD" strokeWidth="2"/>
                  </g>
                </svg>

                {/* Floating stats */}
                <div className="absolute top-4 right-0 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 text-sm border border-white/10">
                  <div className="text-blue-300 text-xs">CBM</div>
                  <div className="font-bold">0.096</div>
                </div>
                <div className="absolute bottom-10 left-0 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 text-sm border border-white/10">
                  <div className="text-green-300 text-xs">Utilization</div>
                  <div className="font-bold">92.4%</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" className="w-full">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#f8fafc"/>
          </svg>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-8 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-8 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" />
              {lang === 'zh' ? '無需註冊' : 'No Sign Up'}
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" />
              {lang === 'zh' ? '數據本地保存' : 'Local Storage'}
            </div>
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-blue-500" />
              {lang === 'zh' ? '中英文切換' : 'Bilingual'}
            </div>
            <div className="flex items-center gap-2">
              <Calculator size={16} className="text-purple-500" />
              {lang === 'zh' ? '精確計算' : 'Precise'}
            </div>
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section id="tools" className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              {lang === 'zh' ? '三大核心工具' : 'Three Powerful Tools'}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {lang === 'zh'
                ? '從產品裝箱到貨櫃裝載，從運費計算到 FBA 尺寸分級，一站式解決包裝物流難題。'
                : 'From product packing to container loading, shipping costs to FBA sizing - solve all your packaging challenges in one place.'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Packing Calculator Card */}
            <Link to="/packing" className="group">
              <div className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-100 hover:border-blue-300 rounded-2xl p-6 transition-all hover:shadow-xl hover:shadow-blue-100/50 h-full">
                <div className="bg-blue-600 text-white w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Package size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {lang === 'zh' ? '產品裝箱計算' : 'Packing Calculator'}
                </h3>
                <p className="text-slate-600 mb-4 text-sm leading-relaxed">
                  {lang === 'zh'
                    ? '計算產品最佳裝箱方式，自動計算海空運費用，3D 視覺化擺放方案。'
                    : 'Calculate optimal product-to-carton packing with 3D visualization and shipping cost estimates.'}
                </p>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-blue-500 flex-shrink-0" />
                    {lang === 'zh' ? '智能擺放算法' : 'Smart packing algorithm'}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-blue-500 flex-shrink-0" />
                    {lang === 'zh' ? '海空運費用估算' : 'Air & sea freight costs'}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-blue-500 flex-shrink-0" />
                    {lang === 'zh' ? '3D 模擬視覺化' : '3D simulation view'}
                  </li>
                </ul>
                <div className="mt-6 flex items-center text-blue-600 font-bold text-sm group-hover:gap-3 gap-2 transition-all">
                  {lang === 'zh' ? '立即使用' : 'Try Now'} <ArrowRight size={16} />
                </div>
              </div>
            </Link>

            {/* Container Calculator Card */}
            <Link to="/container" className="group">
              <div className="bg-gradient-to-br from-teal-50 to-white border-2 border-teal-100 hover:border-teal-300 rounded-2xl p-6 transition-all hover:shadow-xl hover:shadow-teal-100/50 h-full">
                <div className="bg-teal-600 text-white w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Container size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {lang === 'zh' ? '貨櫃裝載計算' : 'Container Loading'}
                </h3>
                <p className="text-slate-600 mb-4 text-sm leading-relaxed">
                  {lang === 'zh'
                    ? '計算紙箱裝入 20GP/40GP/40HQ 貨櫃的最佳方案，最大化空間利用率。'
                    : 'Calculate carton-to-container loading for 20GP, 40GP, 40HQ with maximum utilization.'}
                </p>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-teal-500 flex-shrink-0" />
                    {lang === 'zh' ? '支援三種貨櫃' : '3 container types'}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-teal-500 flex-shrink-0" />
                    {lang === 'zh' ? '空間利用率計算' : 'Space utilization'}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-teal-500 flex-shrink-0" />
                    {lang === 'zh' ? '同步裝箱數據' : 'Sync from packing'}
                  </li>
                </ul>
                <div className="mt-6 flex items-center text-teal-600 font-bold text-sm group-hover:gap-3 gap-2 transition-all">
                  {lang === 'zh' ? '立即使用' : 'Try Now'} <ArrowRight size={16} />
                </div>
              </div>
            </Link>

            {/* FBA Calculator Card */}
            <Link to="/fba" className="group">
              <div className="bg-gradient-to-br from-amber-50 to-white border-2 border-amber-100 hover:border-amber-300 rounded-2xl p-6 transition-all hover:shadow-xl hover:shadow-amber-100/50 h-full">
                <div className="bg-amber-500 text-white w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Cuboid size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {lang === 'zh' ? 'FBA 尺寸分級' : 'FBA Size Tier'}
                </h3>
                <p className="text-slate-600 mb-4 text-sm leading-relaxed">
                  {lang === 'zh'
                    ? '根據 Amazon 2025 標準，計算產品 FBA 尺寸分級和預估費用。'
                    : 'Calculate Amazon FBA size tiers and estimated fees based on 2025 standards.'}
                </p>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-amber-500 flex-shrink-0" />
                    {lang === 'zh' ? '2025 最新標準' : '2025 standards'}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-amber-500 flex-shrink-0" />
                    {lang === 'zh' ? '費用預估' : 'Fee estimation'}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-amber-500 flex-shrink-0" />
                    {lang === 'zh' ? '優化建議' : 'Optimization tips'}
                  </li>
                </ul>
                <div className="mt-6 flex items-center text-amber-600 font-bold text-sm group-hover:gap-3 gap-2 transition-all">
                  {lang === 'zh' ? '立即使用' : 'Try Now'} <ArrowRight size={16} />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              {lang === 'zh' ? '專為這些人設計' : 'Built For'}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: lang === 'zh' ? 'Amazon 賣家' : 'Amazon Sellers',
                desc: lang === 'zh' ? '優化 FBA 包裝尺寸，降低配送費用' : 'Optimize FBA packaging to reduce fulfillment fees',
                icon: Star
              },
              {
                title: lang === 'zh' ? '跨境電商' : 'E-commerce',
                desc: lang === 'zh' ? '計算最佳裝箱方案，節省運費成本' : 'Calculate optimal packing to save shipping costs',
                icon: Package
              },
              {
                title: lang === 'zh' ? '貨運代理' : 'Freight Forwarders',
                desc: lang === 'zh' ? '快速估算貨物體積和重量' : 'Quickly estimate cargo volume and weight',
                icon: Container
              },
              {
                title: lang === 'zh' ? '工廠/供應商' : 'Manufacturers',
                desc: lang === 'zh' ? '為客戶提供專業包裝方案' : 'Provide professional packaging solutions',
                icon: Calculator
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <Icon size={24} className="text-blue-600 mb-3" />
                  <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            {lang === 'zh' ? '立即開始計算' : 'Start Calculating Now'}
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            {lang === 'zh' ? '無需註冊，完全免費，即時獲得結果' : 'No signup required. Completely free. Get instant results.'}
          </p>
          <Link
            to="/packing"
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg hover:scale-105"
          >
            {lang === 'zh' ? '開始使用' : 'Get Started'}
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>
    </div>
  );
}
