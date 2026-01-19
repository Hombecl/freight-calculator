import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Package, Container, Cuboid, ArrowRight, CheckCircle, Zap, Globe, Calculator, Star, Play } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useState, useEffect } from 'react';

// Animated counter component
function AnimatedNumber({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current * 10) / 10);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{prefix}{count.toFixed(value < 10 ? 1 : 0)}{suffix}</span>;
}

// Floating particle component
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-float-particle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${5 + Math.random() * 5}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  const { lang } = useApp();
  const [activeDemo, setActiveDemo] = useState(0);

  // Cycle through demo stats
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveDemo(prev => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const demoStats = [
    { label: 'CBM', value: 0.096, color: 'text-blue-300', bgColor: 'bg-blue-500/20' },
    { label: 'Utilization', value: 92.4, suffix: '%', color: 'text-green-300', bgColor: 'bg-green-500/20' },
    { label: 'Units/Box', value: 24, color: 'text-amber-300', bgColor: 'bg-amber-500/20' },
  ];

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
      <section className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white overflow-hidden min-h-[90vh] flex items-center">
        {/* Animated Background */}
        <div className="absolute inset-0">
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }} />
          {/* Radial glow */}
          <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse-slow" />
          <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-500/15 rounded-full blur-[100px] animate-pulse-slow animation-delay-2000" />
          <Particles />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 pt-24 md:pt-32 pb-20 md:pb-32 w-full">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="z-10">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-full px-4 py-1.5 text-sm mb-6 backdrop-blur-sm">
                <Zap size={14} className="text-yellow-400" />
                <span>{lang === 'zh' ? '100% 免費使用' : '100% Free to Use'}</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-6">
                {lang === 'zh' ? (
                  <>
                    <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">3D 智能包裝</span>
                    <br/>
                    <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">計算工具</span>
                  </>
                ) : (
                  <>
                    <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">Smart 3D</span>
                    <br/>
                    <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Packaging</span>
                    <br/>
                    <span className="text-white">Calculator</span>
                  </>
                )}
              </h1>

              <p className="text-lg md:text-xl text-blue-100/80 mb-8 leading-relaxed max-w-lg">
                {lang === 'zh'
                  ? '專為跨境電商賣家設計。計算最佳裝箱方案、海空運費用、貨櫃裝載率，以及 Amazon FBA 尺寸分級。'
                  : 'Built for e-commerce sellers. Calculate optimal packing, shipping costs, container loading, and Amazon FBA size tiers.'}
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  to="/packing"
                  className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-6 py-3.5 rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105"
                >
                  <Play size={18} className="group-hover:scale-110 transition-transform" />
                  {lang === 'zh' ? '開始使用' : 'Get Started'}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#tools"
                  className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-white/40 text-white px-6 py-3.5 rounded-xl font-bold text-lg transition-all backdrop-blur-sm"
                >
                  {lang === 'zh' ? '瀏覽工具' : 'View Tools'}
                </a>
              </div>

              {/* Quick stats under CTA */}
              <div className="flex flex-wrap gap-6 mt-10 pt-8 border-t border-white/10">
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-black text-white">3</div>
                  <div className="text-xs text-blue-300 uppercase tracking-wider">{lang === 'zh' ? '計算工具' : 'Tools'}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-black text-white">2025</div>
                  <div className="text-xs text-blue-300 uppercase tracking-wider">{lang === 'zh' ? 'FBA 標準' : 'FBA Rates'}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-black text-white">3D</div>
                  <div className="text-xs text-blue-300 uppercase tracking-wider">{lang === 'zh' ? '視覺化' : 'Visualize'}</div>
                </div>
              </div>
            </div>

            {/* 3D Interactive Demo */}
            <div className="hidden md:flex justify-center items-center">
              <div className="relative w-[420px] h-[420px]">
                {/* Glow effect behind box */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 bg-blue-500/30 rounded-full blur-[60px] animate-pulse-slow" />
                </div>

                {/* 3D Animated Box */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-72 h-72 animate-float" style={{ perspective: '1000px' }}>
                    <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl animate-rotate-y-slow">
                      <defs>
                        <linearGradient id="topFace" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#93C5FD"/>
                          <stop offset="100%" stopColor="#3B82F6"/>
                        </linearGradient>
                        <linearGradient id="leftFace" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#2563EB"/>
                          <stop offset="100%" stopColor="#1E40AF"/>
                        </linearGradient>
                        <linearGradient id="rightFace" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#1D4ED8"/>
                          <stop offset="100%" stopColor="#1E3A8A"/>
                        </linearGradient>
                        <filter id="glow">
                          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>

                      <g transform="translate(20, 20)" filter="url(#glow)">
                        {/* Main box */}
                        <polygon points="80,10 150,45 80,80 10,45" fill="url(#topFace)"/>
                        <polygon points="10,45 80,80 80,150 10,115" fill="url(#leftFace)"/>
                        <polygon points="80,80 150,45 150,115 80,150" fill="url(#rightFace)"/>

                        {/* Dimension lines with animation */}
                        <g className="animate-pulse">
                          <line x1="80" y1="10" x2="80" y2="-5" stroke="#93C5FD" strokeWidth="2" strokeDasharray="4,2"/>
                          <line x1="70" y1="-5" x2="90" y2="-5" stroke="#93C5FD" strokeWidth="2"/>
                          <text x="80" y="-10" textAnchor="middle" fill="#93C5FD" fontSize="10" fontWeight="bold">L</text>
                        </g>

                        <g className="animate-pulse animation-delay-500">
                          <line x1="155" y1="80" x2="170" y2="75" stroke="#60A5FA" strokeWidth="2" strokeDasharray="4,2"/>
                          <line x1="170" y1="65" x2="170" y2="85" stroke="#60A5FA" strokeWidth="2"/>
                          <text x="178" y="78" fill="#60A5FA" fontSize="10" fontWeight="bold">W</text>
                        </g>

                        <g className="animate-pulse animation-delay-1000">
                          <line x1="5" y1="80" x2="-10" y2="80" stroke="#818CF8" strokeWidth="2" strokeDasharray="4,2"/>
                          <line x1="-10" y1="55" x2="-10" y2="105" stroke="#818CF8" strokeWidth="2"/>
                          <text x="-18" y="83" fill="#818CF8" fontSize="10" fontWeight="bold">H</text>
                        </g>

                        {/* Inner products visualization */}
                        <g opacity="0.6">
                          <rect x="30" y="55" width="20" height="15" fill="#FBBF24" rx="2" className="animate-pulse animation-delay-300"/>
                          <rect x="55" y="55" width="20" height="15" fill="#FBBF24" rx="2" className="animate-pulse animation-delay-600"/>
                          <rect x="80" y="55" width="20" height="15" fill="#FBBF24" rx="2" className="animate-pulse animation-delay-900"/>
                          <rect x="42" y="72" width="20" height="15" fill="#F59E0B" rx="2" className="animate-pulse animation-delay-400"/>
                          <rect x="67" y="72" width="20" height="15" fill="#F59E0B" rx="2" className="animate-pulse animation-delay-700"/>
                        </g>
                      </g>
                    </svg>
                  </div>
                </div>

                {/* Floating stat cards */}
                <div className={`absolute top-8 right-0 transition-all duration-500 ${activeDemo === 0 ? 'opacity-100 scale-100' : 'opacity-50 scale-95'}`}>
                  <div className={`${demoStats[0].bgColor} backdrop-blur-md rounded-xl px-4 py-3 border border-white/10 shadow-xl`}>
                    <div className={`text-xs ${demoStats[0].color} font-medium mb-1`}>{demoStats[0].label}</div>
                    <div className="text-xl font-black text-white">
                      {activeDemo === 0 ? <AnimatedNumber value={demoStats[0].value} /> : demoStats[0].value}
                    </div>
                  </div>
                </div>

                <div className={`absolute bottom-24 left-0 transition-all duration-500 ${activeDemo === 1 ? 'opacity-100 scale-100' : 'opacity-50 scale-95'}`}>
                  <div className={`${demoStats[1].bgColor} backdrop-blur-md rounded-xl px-4 py-3 border border-white/10 shadow-xl`}>
                    <div className={`text-xs ${demoStats[1].color} font-medium mb-1`}>{demoStats[1].label}</div>
                    <div className="text-xl font-black text-white">
                      {activeDemo === 1 ? <AnimatedNumber value={demoStats[1].value} suffix="%" /> : `${demoStats[1].value}%`}
                    </div>
                  </div>
                </div>

                <div className={`absolute bottom-8 right-8 transition-all duration-500 ${activeDemo === 2 ? 'opacity-100 scale-100' : 'opacity-50 scale-95'}`}>
                  <div className={`${demoStats[2].bgColor} backdrop-blur-md rounded-xl px-4 py-3 border border-white/10 shadow-xl`}>
                    <div className={`text-xs ${demoStats[2].color} font-medium mb-1`}>{demoStats[2].label}</div>
                    <div className="text-xl font-black text-white">
                      {activeDemo === 2 ? <AnimatedNumber value={demoStats[2].value} /> : demoStats[2].value}
                    </div>
                  </div>
                </div>

                {/* Orbit ring */}
                <div className="absolute inset-8 border border-blue-500/20 rounded-full animate-spin-slow" />
                <div className="absolute inset-16 border border-dashed border-blue-400/10 rounded-full animate-spin-slow-reverse" />
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
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle size={16} className="text-green-600" />
              </div>
              <span className="font-medium">{lang === 'zh' ? '無需註冊' : 'No Sign Up'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <CheckCircle size={16} className="text-blue-600" />
              </div>
              <span className="font-medium">{lang === 'zh' ? '數據本地保存' : 'Local Storage'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Globe size={16} className="text-purple-600" />
              </div>
              <span className="font-medium">{lang === 'zh' ? '中英文切換' : 'Bilingual'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <Calculator size={16} className="text-amber-600" />
              </div>
              <span className="font-medium">{lang === 'zh' ? '精確計算' : 'Precise'}</span>
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
              <div className="relative bg-gradient-to-br from-blue-50 to-white border-2 border-blue-100 hover:border-blue-300 rounded-2xl p-6 transition-all hover:shadow-xl hover:shadow-blue-100/50 h-full overflow-hidden">
                {/* Decorative background */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />

                <div className="relative">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-500 text-white w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-lg shadow-blue-500/30">
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
                    {lang === 'zh' ? '立即使用' : 'Try Now'} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Container Calculator Card */}
            <Link to="/container" className="group">
              <div className="relative bg-gradient-to-br from-teal-50 to-white border-2 border-teal-100 hover:border-teal-300 rounded-2xl p-6 transition-all hover:shadow-xl hover:shadow-teal-100/50 h-full overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />

                <div className="relative">
                  <div className="bg-gradient-to-br from-teal-600 to-teal-500 text-white w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-lg shadow-teal-500/30">
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
                    {lang === 'zh' ? '立即使用' : 'Try Now'} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>

            {/* FBA Calculator Card */}
            <Link to="/fba" className="group">
              <div className="relative bg-gradient-to-br from-amber-50 to-white border-2 border-amber-100 hover:border-amber-300 rounded-2xl p-6 transition-all hover:shadow-xl hover:shadow-amber-100/50 h-full overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />

                <div className="relative">
                  <div className="bg-gradient-to-br from-amber-500 to-amber-400 text-white w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-lg shadow-amber-500/30">
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
                    {lang === 'zh' ? '立即使用' : 'Try Now'} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              {lang === 'zh' ? '簡單三步驟' : 'How It Works'}
            </h2>
            <p className="text-lg text-slate-600">
              {lang === 'zh' ? '輸入數據，即時獲得結果' : 'Enter data, get instant results'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: lang === 'zh' ? '輸入尺寸' : 'Enter Dimensions',
                desc: lang === 'zh' ? '輸入產品和紙箱的長寬高、重量' : 'Input product and carton dimensions & weight',
                color: 'blue'
              },
              {
                step: '02',
                title: lang === 'zh' ? '自動計算' : 'Auto Calculate',
                desc: lang === 'zh' ? '系統自動計算最佳裝箱方案和費用' : 'System calculates optimal packing & costs',
                color: 'teal'
              },
              {
                step: '03',
                title: lang === 'zh' ? '3D 視覺化' : '3D Visualize',
                desc: lang === 'zh' ? '以 3D 視覺化檢視擺放方案' : 'View placement in interactive 3D',
                color: 'amber'
              }
            ].map((item, i) => (
              <div key={i} className="relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-slate-200 to-slate-100" />
                )}
                <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-${item.color}-100 text-${item.color}-600 font-black text-lg mb-4`}
                    style={{
                      backgroundColor: item.color === 'blue' ? '#DBEAFE' : item.color === 'teal' ? '#CCFBF1' : '#FEF3C7',
                      color: item.color === 'blue' ? '#2563EB' : item.color === 'teal' ? '#0D9488' : '#D97706'
                    }}
                  >
                    {item.step}
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.desc}</p>
                </div>
              </div>
            ))}
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
                icon: Star,
                color: 'amber'
              },
              {
                title: lang === 'zh' ? '跨境電商' : 'E-commerce',
                desc: lang === 'zh' ? '計算最佳裝箱方案，節省運費成本' : 'Calculate optimal packing to save shipping costs',
                icon: Package,
                color: 'blue'
              },
              {
                title: lang === 'zh' ? '貨運代理' : 'Freight Forwarders',
                desc: lang === 'zh' ? '快速估算貨物體積和重量' : 'Quickly estimate cargo volume and weight',
                icon: Container,
                color: 'teal'
              },
              {
                title: lang === 'zh' ? '工廠/供應商' : 'Manufacturers',
                desc: lang === 'zh' ? '為客戶提供專業包裝方案' : 'Provide professional packaging solutions',
                icon: Calculator,
                color: 'purple'
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="group bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                    style={{
                      backgroundColor: item.color === 'amber' ? '#FEF3C7' : item.color === 'blue' ? '#DBEAFE' : item.color === 'teal' ? '#CCFBF1' : '#F3E8FF',
                    }}
                  >
                    <Icon
                      size={24}
                      style={{
                        color: item.color === 'amber' ? '#D97706' : item.color === 'blue' ? '#2563EB' : item.color === 'teal' ? '#0D9488' : '#9333EA'
                      }}
                    />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            {lang === 'zh' ? '立即開始計算' : 'Start Calculating Now'}
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
            {lang === 'zh' ? '無需註冊，完全免費，即時獲得結果' : 'No signup required. Completely free. Get instant results.'}
          </p>
          <Link
            to="/packing"
            className="group inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
          >
            {lang === 'zh' ? '開始使用' : 'Get Started'}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
}
