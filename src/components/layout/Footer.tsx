import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export default function Footer() {
  const { lang } = useApp();

  return (
    <footer className="bg-slate-900 text-slate-400 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <svg viewBox="0 0 60 60" className="w-10 h-10">
                <polygon points="30,5 55,17 30,29 5,17" fill="#60A5FA"/>
                <polygon points="5,17 30,29 30,55 5,43" fill="#2563EB"/>
                <polygon points="30,29 55,17 55,43 30,55" fill="#1D4ED8"/>
              </svg>
              <span className="text-xl font-bold text-white">
                <span className="text-blue-400">Dim</span>Pack<span className="text-blue-300">3D</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-md">
              {lang === 'zh'
                ? '免費 3D 包裝計算工具，專為跨境電商賣家設計。計算 CBM、優化 FBA 包裝尺寸、3D 視覺化貨櫃裝載。'
                : 'Free 3D packaging calculator for e-commerce sellers. Calculate CBM, optimize FBA packaging, and visualize container loading.'}
            </p>
          </div>

          {/* Tools */}
          <div>
            <h4 className="font-bold text-white mb-4">{lang === 'zh' ? '工具' : 'Tools'}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/packing" className="hover:text-white transition-colors">
                  {lang === 'zh' ? '產品裝箱計算器' : 'Packing Calculator'}
                </Link>
              </li>
              <li>
                <Link to="/container" className="hover:text-white transition-colors">
                  {lang === 'zh' ? '貨櫃裝載計算器' : 'Container Calculator'}
                </Link>
              </li>
              <li>
                <Link to="/fba" className="hover:text-white transition-colors">
                  {lang === 'zh' ? 'FBA 尺寸分級' : 'FBA Size Tier'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-bold text-white mb-4">{lang === 'zh' ? '資源' : 'Resources'}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://sellercentral.amazon.com/help/hub/reference/GABBX6GZPA8MSZGW"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Amazon FBA Docs
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm">
          <p>&copy; 2025 DimPack3D. {lang === 'zh' ? '免費使用' : 'Free to use'}.</p>
        </div>
      </div>
    </footer>
  );
}
