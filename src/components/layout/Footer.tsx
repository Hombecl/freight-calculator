import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export default function Footer() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);

  const product = [
    { to: '/planner', label: T('3D Load Planner', '3D 裝載規劃器') },
    { to: '/packing', label: T('Carton Packing Calculator', '產品裝箱計算器') },
    { to: '/container', label: T('Container Quick-Calc', '貨櫃快速計算') },
    { to: '/fba', label: T('Amazon FBA Size & Fees', 'FBA 尺寸與費用') },
  ];

  const guides = [
    { to: '/guides/container-loading-optimization', label: T('Container Loading Guide', '貨櫃裝載指南') },
    { to: '/guides/cbm-calculator-shipping', label: T('CBM & Shipping Costs', 'CBM 與運費') },
    { to: '/guides/pallet-calculator', label: T('Pallet Calculator Guide', '卡板計算指南') },
    { to: '/guides/fba-size-tiers-2025', label: T('FBA Size Tiers 2025', 'FBA 尺寸分級 2025') },
    { to: '/guides', label: T('All guides →', '全部指南 →') },
  ];

  return (
    <footer className="bg-slate-950 text-slate-400 mt-auto border-t border-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <svg viewBox="0 0 60 60" className="w-9 h-9">
                <polygon points="30,5 55,17 30,29 5,17" fill="#60A5FA"/>
                <polygon points="5,17 30,29 30,55 5,43" fill="#2563EB"/>
                <polygon points="30,29 55,17 55,43 30,55" fill="#1D4ED8"/>
              </svg>
              <span className="text-xl font-bold text-white">
                <span className="text-blue-400">Dim</span>Pack<span className="text-blue-300">3D</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-md mb-5">
              {T(
                'Free 3D container load planning — real bin-packing with weight and stacking limits, hand fine-tuning, and PDF load plan export. Runs entirely in your browser.',
                '免費 3D 貨櫃裝載規劃 — 真實裝箱算法、重量與堆疊限制、手動微調、PDF 裝載方案導出。全程喺你瀏覽器運行。',
              )}
            </p>
            <ul className="space-y-1.5 text-xs text-slate-500">
              <li>✓ {T('No signup to plan', '規劃無需註冊')}</li>
              <li>✓ {T('Shipment data never leaves your device', '貨運數據永不離開你部機')}</li>
            </ul>
            <p className="text-sm mt-5">
              {T('Questions, partnerships, feedback:', '查詢、合作、意見:')}{' '}
              <a href="mailto:hello@dimpack3d.com" className="text-blue-400 hover:text-blue-300 font-medium">hello@dimpack3d.com</a>
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">{T('Product', '產品')}</h4>
            <ul className="space-y-2.5 text-sm">
              {product.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Guides */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">{T('Guides', '指南')}</h4>
            <ul className="space-y-2.5 text-sm">
              {guides.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800/70 mt-10 pt-7 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <p>&copy; 2026 DimPack3D. {T('All rights reserved.', '版權所有。')}</p>
          <p>{T('Made for importers, sellers and freight forwarders.', '為進口商、賣家同貨代而設。')}</p>
        </div>
      </div>
    </footer>
  );
}
