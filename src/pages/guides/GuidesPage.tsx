import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BookOpen, ArrowRight, Clock, Tag } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface GuideCard {
  slug: string;
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
  readTime: string;
  tags: string[];
  featured?: boolean;
}

const guides: GuideCard[] = [
  {
    slug: 'fba-size-tiers-2025',
    title: 'Amazon FBA Size Tiers 2025: Complete Guide to Reduce Fees',
    titleZh: 'Amazon FBA 尺寸分級 2025：完整省費指南',
    description: 'Learn how Amazon FBA size tiers work in 2025, understand dimensional weight calculations, and discover strategies to optimize your packaging to reduce fulfillment fees.',
    descriptionZh: '了解 2025 年 Amazon FBA 尺寸分級運作方式、理解體積重量計算，並探索優化包裝策略以降低配送費用。',
    readTime: '8 min',
    tags: ['FBA', 'Amazon', 'Size Tiers', 'Fees'],
    featured: true,
  },
  {
    slug: 'cbm-calculator-shipping',
    title: 'CBM Calculator Guide: Master Shipping Volume Calculations',
    titleZh: 'CBM 計算器指南：掌握運輸體積計算',
    description: 'Complete guide to CBM (Cubic Meter) calculations for international shipping. Learn formulas, container capacities, and how to optimize your cargo loading.',
    descriptionZh: '國際運輸 CBM（立方米）計算完整指南。學習計算公式、貨櫃容量，以及如何優化貨物裝載。',
    readTime: '6 min',
    tags: ['CBM', 'Shipping', 'Container', 'Logistics'],
  },
  {
    slug: 'container-loading-optimization',
    title: 'Container Loading Optimization: Maximize Space Utilization',
    titleZh: '貨櫃裝載優化：最大化空間利用率',
    description: 'Expert strategies for optimizing container loading. Learn about 20GP, 40GP, 40HQ containers and how to achieve 90%+ space utilization.',
    descriptionZh: '貨櫃裝載優化專家策略。了解 20GP、40GP、40HQ 貨櫃，以及如何達到 90% 以上空間利用率。',
    readTime: '7 min',
    tags: ['Container', '20GP', '40GP', '40HQ'],
  },
];

export default function GuidesPage() {
  const { lang } = useApp();

  return (
    <div className="max-w-5xl mx-auto">
      <Helmet>
        <title>Shipping & FBA Guides - Free Calculator Tutorials | DimPack3D</title>
        <meta name="description" content="Free guides on Amazon FBA size tiers, CBM calculations, container loading optimization, and shipping cost reduction. Expert tutorials for e-commerce sellers." />
        <meta name="keywords" content="FBA guide, CBM calculator tutorial, container loading guide, shipping optimization, Amazon seller guide, e-commerce logistics" />
        <link rel="canonical" href="https://www.dimpack3d.com/guides" />
        <meta property="og:url" content="https://www.dimpack3d.com/guides" />
        <meta property="og:title" content="Shipping & FBA Guides - Free Calculator Tutorials | DimPack3D" />
        <meta property="og:description" content="Free guides on Amazon FBA size tiers, CBM calculations, and container loading optimization for e-commerce sellers." />
      </Helmet>

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-purple-600 text-white p-2.5 rounded-xl">
            <BookOpen size={24} />
          </div>
          <h1 className="text-3xl font-black text-slate-900">
            {lang === 'zh' ? '指南與教學' : 'Guides & Tutorials'}
          </h1>
        </div>
        <p className="text-lg text-slate-600 max-w-2xl">
          {lang === 'zh'
            ? '學習如何優化包裝、降低運費、提高利潤。為 Amazon 賣家和跨境電商提供的免費實用指南。'
            : 'Learn how to optimize packaging, reduce shipping costs, and increase profits. Free practical guides for Amazon sellers and e-commerce businesses.'}
        </p>
      </div>

      {/* Featured Guide */}
      {guides.filter(g => g.featured).map(guide => (
        <Link
          key={guide.slug}
          to={`/guides/${guide.slug}`}
          className="block mb-8 group"
        >
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 hover:border-amber-400 rounded-2xl p-6 md:p-8 transition-all hover:shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {lang === 'zh' ? '精選' : 'FEATURED'}
              </span>
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <Clock size={14} />
                {guide.readTime}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3 group-hover:text-amber-700 transition-colors">
              {lang === 'zh' ? guide.titleZh : guide.title}
            </h2>
            <p className="text-slate-600 mb-4 text-lg leading-relaxed">
              {lang === 'zh' ? guide.descriptionZh : guide.description}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {guide.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-xs bg-white/80 text-slate-600 px-2 py-1 rounded-md border border-slate-200">
                    <Tag size={10} />
                    {tag}
                  </span>
                ))}
              </div>
              <span className="flex items-center gap-2 text-amber-600 font-bold group-hover:gap-3 transition-all">
                {lang === 'zh' ? '閱讀更多' : 'Read More'} <ArrowRight size={18} />
              </span>
            </div>
          </div>
        </Link>
      ))}

      {/* All Guides Grid */}
      <h2 className="text-xl font-bold text-slate-900 mb-4">
        {lang === 'zh' ? '所有指南' : 'All Guides'}
      </h2>
      <div className="grid md:grid-cols-2 gap-6">
        {guides.filter(g => !g.featured).map(guide => (
          <Link
            key={guide.slug}
            to={`/guides/${guide.slug}`}
            className="group"
          >
            <div className="bg-white border border-gray-200 hover:border-blue-300 rounded-xl p-5 transition-all hover:shadow-lg h-full flex flex-col">
              <div className="flex items-center gap-2 mb-2 text-sm text-slate-500">
                <Clock size={14} />
                {guide.readTime}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                {lang === 'zh' ? guide.titleZh : guide.title}
              </h3>
              <p className="text-slate-600 text-sm mb-4 flex-grow">
                {lang === 'zh' ? guide.descriptionZh : guide.description}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {guide.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-12 bg-blue-600 rounded-2xl p-8 text-center text-white">
        <h2 className="text-2xl font-bold mb-3">
          {lang === 'zh' ? '準備好優化你的包裝了嗎？' : 'Ready to Optimize Your Packaging?'}
        </h2>
        <p className="text-blue-100 mb-6">
          {lang === 'zh'
            ? '使用我們的免費計算器，立即開始節省運費。'
            : 'Start saving on shipping costs with our free calculators.'}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/packing"
            className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors"
          >
            {lang === 'zh' ? '裝箱計算器' : 'Packing Calculator'}
          </Link>
          <Link
            to="/fba"
            className="bg-blue-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-400 transition-colors border border-blue-400"
          >
            {lang === 'zh' ? 'FBA 計算器' : 'FBA Calculator'}
          </Link>
        </div>
      </div>
    </div>
  );
}
