import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Package, Container, Cuboid, ArrowRight, CheckCircle, Zap, Globe, Calculator, Star, Play, RotateCcw, Sparkles, X, Check, TrendingDown, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useState, useEffect, useMemo } from 'react';
import Packing3DPreview from '../components/Packing3DPreview';

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

// Interactive Demo Component
function InteractiveDemo({ lang }: { lang: 'en' | 'zh' }) {
  const [product, setProduct] = useState({ l: 15, w: 10, h: 5 });
  const [carton, setCarton] = useState({ l: 60, w: 40, h: 40 });
  const [showResult, setShowResult] = useState(true);

  // Calculate packing results
  const results = useMemo(() => {
    const orientations = [
      { l: product.l, w: product.w, h: product.h },
      { l: product.l, w: product.h, h: product.w },
      { l: product.w, w: product.l, h: product.h },
      { l: product.w, w: product.h, h: product.l },
      { l: product.h, w: product.l, h: product.w },
      { l: product.h, w: product.w, h: product.l },
    ];

    let bestFit = 0;
    let bestOrientation = orientations[0];

    orientations.forEach((orient) => {
      const countL = Math.floor(carton.l / orient.l);
      const countW = Math.floor(carton.w / orient.w);
      const countH = Math.floor(carton.h / orient.h);
      const total = countL * countW * countH;
      if (total > bestFit) {
        bestFit = total;
        bestOrientation = orient;
      }
    });

    const productVolume = (product.l * product.w * product.h) / 1000000; // m³
    const cartonVolume = (carton.l * carton.w * carton.h) / 1000000; // m³
    const cbm = cartonVolume;
    const utilization = cartonVolume > 0 ? ((productVolume * bestFit) / cartonVolume) * 100 : 0;

    return {
      unitsPerBox: bestFit,
      cbm: cbm,
      utilization: Math.min(utilization, 100),
      orientation: bestOrientation,
    };
  }, [product, carton]);

  const resetDemo = () => {
    setProduct({ l: 15, w: 10, h: 5 });
    setCarton({ l: 60, w: 40, h: 40 });
    setShowResult(false);
    setTimeout(() => setShowResult(true), 100);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="grid md:grid-cols-2">
        {/* Input Section */}
        <div className="p-6 md:p-8 bg-gradient-to-br from-slate-50 to-white">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles size={20} className="text-blue-500" />
              {lang === 'zh' ? '即時試用' : 'Try It Now'}
            </h3>
            <button
              onClick={resetDemo}
              className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title={lang === 'zh' ? '重置' : 'Reset'}
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {/* Product Dimensions */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="text-sm font-semibold text-slate-700">
                {lang === 'zh' ? '產品尺寸 (cm)' : 'Product Size (cm)'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(['l', 'w', 'h'] as const).map((dim) => (
                <div key={dim} className="relative">
                  <label className="absolute -top-2 left-2 px-1 bg-white text-xs text-slate-400 font-medium">
                    {dim === 'l' ? (lang === 'zh' ? '長' : 'L') : dim === 'w' ? (lang === 'zh' ? '寬' : 'W') : (lang === 'zh' ? '高' : 'H')}
                  </label>
                  <input
                    type="number"
                    value={product[dim]}
                    onChange={(e) => setProduct({ ...product, [dim]: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 border-2 border-amber-200 rounded-lg text-center font-mono font-bold text-slate-800 focus:border-amber-400 focus:ring-0 focus:outline-none transition-colors bg-amber-50/50"
                    min="1"
                    max="500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Carton Dimensions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm font-semibold text-slate-700">
                {lang === 'zh' ? '紙箱尺寸 (cm)' : 'Carton Size (cm)'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(['l', 'w', 'h'] as const).map((dim) => (
                <div key={dim} className="relative">
                  <label className="absolute -top-2 left-2 px-1 bg-white text-xs text-slate-400 font-medium">
                    {dim === 'l' ? (lang === 'zh' ? '長' : 'L') : dim === 'w' ? (lang === 'zh' ? '寬' : 'W') : (lang === 'zh' ? '高' : 'H')}
                  </label>
                  <input
                    type="number"
                    value={carton[dim]}
                    onChange={(e) => setCarton({ ...carton, [dim]: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 border-2 border-blue-200 rounded-lg text-center font-mono font-bold text-slate-800 focus:border-blue-400 focus:ring-0 focus:outline-none transition-colors bg-blue-50/50"
                    min="1"
                    max="500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Tips */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-700">
              💡 {lang === 'zh'
                ? '提示：調整尺寸即時查看結果，完整功能請使用計算器'
                : 'Tip: Adjust dimensions to see instant results. Use full calculator for more features.'}
            </p>
          </div>
        </div>

        {/* Results Section */}
        <div className="p-6 md:p-8 bg-gradient-to-br from-slate-800 to-slate-900 text-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl" />

          <div className="relative">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Calculator size={20} className="text-blue-400" />
              {lang === 'zh' ? '計算結果' : 'Results'}
            </h3>

            <div className={`space-y-4 transition-all duration-300 ${showResult ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
              {/* Units per Box */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-blue-200 text-sm">{lang === 'zh' ? '每箱數量' : 'Units per Box'}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{results.unitsPerBox}</span>
                    <span className="text-blue-300 text-sm">{lang === 'zh' ? '件' : 'pcs'}</span>
                  </div>
                </div>
              </div>

              {/* CBM */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-green-200 text-sm">CBM</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{results.cbm.toFixed(3)}</span>
                    <span className="text-green-300 text-sm">m³</span>
                  </div>
                </div>
              </div>

              {/* Utilization */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-amber-200 text-sm">{lang === 'zh' ? '空間利用率' : 'Space Utilization'}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{results.utilization.toFixed(1)}</span>
                    <span className="text-amber-300 text-sm">%</span>
                  </div>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      results.utilization >= 70 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                      results.utilization >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                      'bg-gradient-to-r from-red-400 to-red-500'
                    }`}
                    style={{ width: `${results.utilization}%` }}
                  />
                </div>
              </div>
            </div>

            {/* CTA */}
            <Link
              to="/packing"
              className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 group"
            >
              {lang === 'zh' ? '使用完整計算器' : 'Use Full Calculator'}
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
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

        {/* HowTo Schema - How to use the calculator */}
        <script type="application/ld+json">{`
          {
            "@context": "https://schema.org",
            "@type": "HowTo",
            "name": "How to Calculate Optimal Product Packing with DimPack3D",
            "description": "Learn how to use DimPack3D to calculate the optimal way to pack products into cartons, estimate shipping costs, and visualize in 3D.",
            "totalTime": "PT2M",
            "estimatedCost": {
              "@type": "MonetaryAmount",
              "currency": "USD",
              "value": "0"
            },
            "tool": [
              {
                "@type": "HowToTool",
                "name": "Web browser with JavaScript enabled"
              }
            ],
            "step": [
              {
                "@type": "HowToStep",
                "position": 1,
                "name": "Enter Product Dimensions",
                "text": "Input your product's length, width, height (in cm or inches) and weight (in kg or lbs). You can also add multiple products to your library.",
                "url": "https://www.dimpack3d.com/packing"
              },
              {
                "@type": "HowToStep",
                "position": 2,
                "name": "Enter Carton Dimensions",
                "text": "Input your carton (box) dimensions. DimPack3D will automatically calculate how many products fit using the optimal orientation.",
                "url": "https://www.dimpack3d.com/packing"
              },
              {
                "@type": "HowToStep",
                "position": 3,
                "name": "View 3D Visualization",
                "text": "See exactly how products are arranged inside the carton with interactive 3D view. Rotate and zoom to inspect the packing arrangement.",
                "url": "https://www.dimpack3d.com/packing"
              },
              {
                "@type": "HowToStep",
                "position": 4,
                "name": "Review Results",
                "text": "Check the calculated CBM, utilization rate, units per box, and estimated shipping costs for air and sea freight.",
                "url": "https://www.dimpack3d.com/packing"
              }
            ]
          }
        `}</script>

        {/* BreadcrumbList Schema */}
        <script type="application/ld+json">{`
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://www.dimpack3d.com/"
              }
            ]
          }
        `}</script>

        {/* ItemList Schema - Featured Tools */}
        <script type="application/ld+json">{`
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "DimPack3D Packaging Tools",
            "description": "Three powerful packaging and logistics calculators for e-commerce sellers",
            "numberOfItems": 3,
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Product Packing Calculator",
                "description": "Calculate optimal product-to-carton packing with 3D visualization and shipping cost estimates",
                "url": "https://www.dimpack3d.com/packing"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Container Loading Calculator",
                "description": "Calculate carton-to-container loading for 20GP, 40GP, 40HQ with maximum space utilization",
                "url": "https://www.dimpack3d.com/container"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": "Amazon FBA Size Tier Calculator",
                "description": "Calculate Amazon FBA size tiers and estimate fulfillment fees based on 2025 standards",
                "url": "https://www.dimpack3d.com/fba"
              }
            ]
          }
        `}</script>
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

      {/* 3D Visualization Showcase */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              {lang === 'zh' ? '3D 視覺化裝箱方案' : 'See Your Packing in 3D'}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {lang === 'zh'
                ? '即時查看產品如何擺放在紙箱內，每個方向、每個角度都一目了然'
                : 'Instantly visualize how products fit inside cartons - every orientation, every angle, crystal clear'}
            </p>
          </div>

          {/* 3D Preview Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Packing 3D View - REAL 3D */}
            <Link to="/packing" className="group">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all">
                <div className="aspect-[4/3] relative overflow-hidden">
                  {/* Real 3D Component */}
                  <Packing3DPreview
                    product={{ l: 15, w: 10, h: 5 }}
                    carton={{ l: 60, w: 40, h: 40 }}
                    autoRotate={true}
                  />
                  {/* Stats overlay */}
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm font-bold text-emerald-400">
                    24 pcs
                  </div>
                  {/* Drag hint */}
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] text-slate-300">
                    {lang === 'zh' ? '拖曳旋轉' : 'Drag to rotate'}
                  </div>
                </div>
                <div className="p-4 text-center">
                  <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{lang === 'zh' ? '產品裝箱視圖' : 'Product Packing View'}</h3>
                  <p className="text-sm text-slate-500 mt-1">{lang === 'zh' ? '查看每件產品如何擺放' : 'See how each product fits'}</p>
                </div>
              </div>
            </Link>

            {/* Container Loading View */}
            <Link to="/container" className="group">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all">
                <div className="aspect-[4/3] bg-gradient-to-br from-slate-800 to-slate-900 p-6 relative overflow-hidden">
                  {/* Simulated Container View */}
                  <svg viewBox="0 0 200 150" className="w-full h-full">
                    <defs>
                      <linearGradient id="boxTop2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#93C5FD"/>
                        <stop offset="100%" stopColor="#3B82F6"/>
                      </linearGradient>
                      <linearGradient id="boxLeft2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2563EB"/>
                        <stop offset="100%" stopColor="#1E40AF"/>
                      </linearGradient>
                      <linearGradient id="boxRight2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1D4ED8"/>
                        <stop offset="100%" stopColor="#1E3A8A"/>
                      </linearGradient>
                    </defs>
                    {/* Container outline */}
                    <g transform="translate(20, 15)">
                      <polygon points="80,40 160,70 80,100 0,70" fill="#1E3A5F" opacity="0.5"/>
                      <polygon points="0,70 80,100 80,130 0,100" fill="#0F172A" opacity="0.7"/>
                      <polygon points="80,100 160,70 160,100 80,130" fill="#1E293B" opacity="0.6"/>
                      {/* Cartons inside */}
                      <g className="animate-pulse animation-delay-300">
                        <polygon points="25,58 50,70 25,82 0,70" fill="url(#boxTop2)"/>
                        <polygon points="0,70 25,82 25,100 0,88" fill="url(#boxLeft2)"/>
                        <polygon points="25,82 50,70 50,88 25,100" fill="url(#boxRight2)"/>
                      </g>
                      <g transform="translate(25, 0)" className="animate-pulse animation-delay-500">
                        <polygon points="25,58 50,70 25,82 0,70" fill="url(#boxTop2)"/>
                        <polygon points="0,70 25,82 25,100 0,88" fill="url(#boxLeft2)"/>
                        <polygon points="25,82 50,70 50,88 25,100" fill="url(#boxRight2)"/>
                      </g>
                      <g transform="translate(50, 0)" className="animate-pulse animation-delay-700">
                        <polygon points="25,58 50,70 25,82 0,70" fill="url(#boxTop2)"/>
                        <polygon points="0,70 25,82 25,100 0,88" fill="url(#boxLeft2)"/>
                        <polygon points="25,82 50,70 50,88 25,100" fill="url(#boxRight2)"/>
                      </g>
                      <g transform="translate(25, -12)" className="animate-pulse animation-delay-400">
                        <polygon points="25,58 50,70 25,82 0,70" fill="url(#boxTop2)"/>
                        <polygon points="0,70 25,82 25,100 0,88" fill="url(#boxLeft2)"/>
                        <polygon points="25,82 50,70 50,88 25,100" fill="url(#boxRight2)"/>
                      </g>
                      <g transform="translate(50, -12)" className="animate-pulse animation-delay-600">
                        <polygon points="25,58 50,70 25,82 0,70" fill="url(#boxTop2)"/>
                        <polygon points="0,70 25,82 25,100 0,88" fill="url(#boxLeft2)"/>
                        <polygon points="25,82 50,70 50,88 25,100" fill="url(#boxRight2)"/>
                      </g>
                    </g>
                    {/* Stats */}
                    <g>
                      <rect x="8" y="8" width="55" height="22" rx="4" fill="rgba(0,0,0,0.6)"/>
                      <text x="14" y="22" fill="#14B8A6" fontSize="10" fontWeight="bold">92.4%</text>
                    </g>
                  </svg>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-16 bg-teal-500/20 blur-2xl" />
                </div>
                <div className="p-4 text-center">
                  <h3 className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors">{lang === 'zh' ? '貨櫃裝載視圖' : 'Container Loading View'}</h3>
                  <p className="text-sm text-slate-500 mt-1">{lang === 'zh' ? '最大化貨櫃空間利用' : 'Maximize container space'}</p>
                </div>
              </div>
            </Link>

            {/* FBA Size View */}
            <Link to="/fba" className="group">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all">
                <div className="aspect-[4/3] bg-gradient-to-br from-slate-800 to-slate-900 p-6 relative overflow-hidden">
                  {/* FBA Size Comparison */}
                  <svg viewBox="0 0 200 150" className="w-full h-full">
                    <g transform="translate(20, 30)">
                      <g className="animate-pulse animation-delay-300">
                        <rect x="0" y="70" width="25" height="30" fill="#10B981" rx="2"/>
                        <text x="12" y="115" fill="#6EE7B7" fontSize="7" textAnchor="middle">Small</text>
                      </g>
                      <g className="animate-pulse animation-delay-500">
                        <rect x="40" y="50" width="35" height="50" fill="#3B82F6" rx="2"/>
                        <text x="57" y="115" fill="#93C5FD" fontSize="7" textAnchor="middle">Large</text>
                      </g>
                      <g className="animate-pulse animation-delay-700">
                        <rect x="90" y="25" width="50" height="75" fill="#F59E0B" rx="2"/>
                        <text x="115" y="115" fill="#FCD34D" fontSize="7" textAnchor="middle">Bulky</text>
                      </g>
                      <g className="animate-pulse animation-delay-900">
                        <rect x="155" y="5" width="30" height="95" fill="#EF4444" rx="2"/>
                        <text x="170" y="115" fill="#FCA5A5" fontSize="7" textAnchor="middle">XL</text>
                      </g>
                      <g transform="translate(40, 35)" className="animate-pulse">
                        <polygon points="17,0 22,8 12,8" fill="#22D3EE"/>
                      </g>
                    </g>
                    <g>
                      <rect x="8" y="8" width="70" height="22" rx="4" fill="rgba(0,0,0,0.6)"/>
                      <text x="14" y="22" fill="#60A5FA" fontSize="9" fontWeight="bold">Large Std</text>
                    </g>
                    <g>
                      <rect x="122" y="8" width="70" height="22" rx="4" fill="rgba(0,0,0,0.6)"/>
                      <text x="128" y="22" fill="#FBBF24" fontSize="9" fontWeight="bold">$5.68/unit</text>
                    </g>
                  </svg>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-16 bg-amber-500/20 blur-2xl" />
                </div>
                <div className="p-4 text-center">
                  <h3 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{lang === 'zh' ? 'FBA 尺寸分級' : 'FBA Size Tier'}</h3>
                  <p className="text-sm text-slate-500 mt-1">{lang === 'zh' ? '即時查看費用分級' : 'Instant fee tier lookup'}</p>
                </div>
              </div>
            </Link>
          </div>

          {/* CTA */}
          <div className="text-center mt-10">
            <Link
              to="/packing"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 group"
            >
              {lang === 'zh' ? '立即體驗 3D 視覺化' : 'Try 3D Visualization Now'}
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
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

      {/* Before/After Comparison Section - Real 3D Case Study */}
      <section className="py-16 md:py-24 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-100 to-green-100 border border-slate-200 rounded-full px-4 py-1.5 text-sm mb-4">
              <TrendingUp size={14} className="text-green-600" />
              <span className="text-slate-700 font-medium">{lang === 'zh' ? '真實案例' : 'Real Case Study'}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              {lang === 'zh' ? '3D 視覺化優化對比' : '3D Visualization: Before vs After'}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {lang === 'zh'
                ? '產品尺寸 22×14×5 cm，看看不同箱子和擺放方式的差異'
                : 'Product: 22×14×5 cm - See how box choice and orientation affects efficiency'}
            </p>
          </div>

          {/* 3-Stage Comparison */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Stage 1: Original - Wrong orientation */}
            <div className="relative">
              <div className="absolute -top-3 left-4 z-10">
                <span className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                  {lang === 'zh' ? '隨便買箱' : 'Random Box'}
                </span>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-slate-50 border-2 border-red-200 rounded-2xl overflow-hidden h-full">
                {/* 3D Preview - Bad orientation: flat laying */}
                <div className="aspect-square relative">
                  <Packing3DPreview
                    product={{ l: 22, w: 14, h: 5 }}
                    carton={{ l: 50, w: 40, h: 35 }}
                    forceOrientation={{ l: 22, w: 14, h: 5 }} // Force flat position
                    cartonColor={0xef4444}
                    autoRotate={true}
                  />
                  {/* Utilization badge */}
                  <div className="absolute top-3 left-3 bg-red-500 text-white text-sm font-bold px-3 py-1.5 rounded-lg shadow-lg">
                    {lang === 'zh' ? '利用率' : 'Util'}: 62%
                  </div>
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-sm font-bold px-3 py-1.5 rounded-lg">
                    28 {lang === 'zh' ? '件/箱' : 'pcs'}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 bg-white border-t border-red-100">
                  <div className="flex items-center gap-2 mb-2">
                    <X size={16} className="text-red-500" />
                    <span className="font-bold text-slate-800 text-sm">{lang === 'zh' ? '50×40×35 cm 箱，平放' : '50×40×35 cm box, flat'}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    {lang === 'zh' ? '產品平放入箱，尺寸不是完美倍數，浪費空間' : 'Products laid flat, box size not perfect multiple - wasted space'}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{lang === 'zh' ? '每1000件需要' : '1000 units need'}</span>
                    <span className="font-bold text-red-600">36 {lang === 'zh' ? '箱' : 'boxes'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stage 2: Optimized orientation, same box */}
            <div className="relative">
              <div className="absolute -top-3 left-4 z-10">
                <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                  {lang === 'zh' ? '優化擺放' : 'Optimized Layout'}
                </span>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-slate-50 border-2 border-amber-300 rounded-2xl overflow-hidden h-full">
                {/* 3D Preview - Optimized orientation: standing on side */}
                <div className="aspect-square relative">
                  <Packing3DPreview
                    product={{ l: 22, w: 14, h: 5 }}
                    carton={{ l: 50, w: 40, h: 35 }}
                    forceOrientation={{ l: 22, w: 5, h: 14 }} // Force side-standing position
                    cartonColor={0xf59e0b}
                    autoRotate={true}
                  />
                  {/* Utilization badge */}
                  <div className="absolute top-3 left-3 bg-amber-500 text-white text-sm font-bold px-3 py-1.5 rounded-lg shadow-lg">
                    {lang === 'zh' ? '利用率' : 'Util'}: 70%
                  </div>
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-sm font-bold px-3 py-1.5 rounded-lg">
                    32 {lang === 'zh' ? '件/箱' : 'pcs'}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 bg-white border-t border-amber-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Check size={16} className="text-amber-500" />
                    <span className="font-bold text-slate-800 text-sm">{lang === 'zh' ? '同樣箱子，側放' : 'Same box, side-standing'}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    {lang === 'zh' ? '用 DimPack3D 計算最佳旋轉方向，多放 14%' : 'DimPack3D finds best rotation - 14% more fits'}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{lang === 'zh' ? '每1000件需要' : '1000 units need'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 line-through text-xs">36</span>
                      <span className="font-bold text-amber-600">32 {lang === 'zh' ? '箱' : 'boxes'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stage 3: Recommended box size */}
            <div className="relative">
              <div className="absolute -top-3 left-4 z-10">
                <span className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                  <Star size={12} />
                  {lang === 'zh' ? '最佳方案' : 'Best Solution'}
                </span>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-400 rounded-2xl overflow-hidden h-full shadow-lg shadow-green-100">
                {/* 3D Preview - Recommended box: perfect fit */}
                <div className="aspect-square relative">
                  <Packing3DPreview
                    product={{ l: 22, w: 14, h: 5 }}
                    carton={{ l: 44, w: 42, h: 30 }} // Perfect fit box size
                    cartonColor={0x22c55e}
                    autoRotate={true}
                  />
                  {/* Utilization badge */}
                  <div className="absolute top-3 left-3 bg-green-500 text-white text-sm font-bold px-3 py-1.5 rounded-lg shadow-lg">
                    {lang === 'zh' ? '利用率' : 'Util'}: 100%
                  </div>
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-sm font-bold px-3 py-1.5 rounded-lg">
                    36 {lang === 'zh' ? '件/箱' : 'pcs'}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 bg-white border-t border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={16} className="text-green-500" />
                    <span className="font-bold text-slate-800 text-sm">{lang === 'zh' ? '44×42×30 cm 建議箱' : '44×42×30 cm recommended'}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    {lang === 'zh' ? '選擇完美倍數尺寸的紙箱，零浪費' : 'Box sized as perfect multiple - zero waste'}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{lang === 'zh' ? '每1000件需要' : '1000 units need'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 line-through text-xs">36</span>
                      <span className="font-bold text-green-600">28 {lang === 'zh' ? '箱' : 'boxes'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Savings summary */}
          <div className="mt-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative">
              {/* Comparison summary */}
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                  <div className="text-green-200 text-xs mb-1">{lang === 'zh' ? '紙箱減少' : 'Fewer Boxes'}</div>
                  <div className="text-3xl font-black">22%</div>
                  <div className="text-green-200 text-xs">36 → 28</div>
                </div>
                <div className="text-center p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                  <div className="text-green-200 text-xs mb-1">{lang === 'zh' ? '利用率提升' : 'Utilization Up'}</div>
                  <div className="text-3xl font-black">+38%</div>
                  <div className="text-green-200 text-xs">62% → 100%</div>
                </div>
                <div className="text-center p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                  <div className="text-green-200 text-xs mb-1">{lang === 'zh' ? '每箱裝載量' : 'Units/Box'}</div>
                  <div className="text-3xl font-black">+29%</div>
                  <div className="text-green-200 text-xs">28 → 36</div>
                </div>
                <div className="text-center p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                  <div className="text-green-200 text-xs mb-1">{lang === 'zh' ? '運費節省' : 'Shipping Saved'}</div>
                  <div className="text-3xl font-black">~$80</div>
                  <div className="text-green-200 text-xs">{lang === 'zh' ? '每1000件' : 'per 1000 units'}</div>
                </div>
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-green-100 text-sm text-center sm:text-left">
                  {lang === 'zh'
                    ? '以上是真實計算結果。輸入你的產品尺寸，即時查看最佳方案！'
                    : 'Real calculations above. Enter your product dimensions to see your optimal solution!'}
                </p>
                <Link
                  to="/packing"
                  className="group inline-flex items-center gap-2 bg-white text-green-600 px-6 py-3 rounded-xl font-bold text-lg hover:bg-green-50 transition-all shadow-lg hover:shadow-xl flex-shrink-0"
                >
                  {lang === 'zh' ? '計算我的產品' : 'Calculate My Product'}
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 rounded-full px-4 py-1.5 text-sm mb-4">
              <Play size={14} className="text-blue-600" />
              <span className="text-blue-700 font-medium">{lang === 'zh' ? '互動示範' : 'Interactive Demo'}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              {lang === 'zh' ? '即時體驗計算功能' : 'Try It Yourself'}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {lang === 'zh'
                ? '輸入您的產品和紙箱尺寸，即時查看計算結果。不需要註冊，馬上開始！'
                : "Enter your product and carton dimensions to see instant results. No signup required - start now!"}
            </p>
          </div>

          <InteractiveDemo lang={lang} />

          <p className="text-center text-sm text-slate-500 mt-6">
            {lang === 'zh'
              ? '完整版本包含：3D 視覺化、運費計算、產品庫、多箱比較等功能'
              : 'Full version includes: 3D visualization, shipping costs, product library, multi-box comparison, and more'}
          </p>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="py-16 md:py-24 bg-white">
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
