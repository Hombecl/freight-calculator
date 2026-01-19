import { Link, useLocation } from 'react-router-dom';
import { Package, Container, Cuboid, Languages, Settings, RotateCcw, BookOpen } from 'lucide-react';
import Logo from './Logo';
import { useApp } from '../../context/AppContext';

export default function Header() {
  const location = useLocation();
  const { lang, setLang, units, toggleLengthUnit, toggleWeightUnit, toggleCurrency, setIsSettingsOpen, handleClearData, t } = useApp();

  const navItems = [
    { path: '/packing', label: 'Packing', labelZh: '產品裝箱', icon: Package, activeColor: 'bg-blue-600' },
    { path: '/container', label: 'Container', labelZh: '貨櫃裝載', icon: Container, activeColor: 'bg-teal-600' },
    { path: '/fba', label: 'FBA Size', labelZh: 'FBA 尺寸', icon: Cuboid, activeColor: 'bg-amber-500' },
    { path: '/guides', label: 'Guides', labelZh: '指南', icon: BookOpen, activeColor: 'bg-purple-600' },
  ];

  const isHomePage = location.pathname === '/';
  const isGuidesPage = location.pathname.startsWith('/guides');
  const showNavigation = !isHomePage; // Show navigation on all pages except home

  return (
    <header className={`sticky top-0 z-40 ${isHomePage ? 'bg-transparent absolute w-full' : 'bg-white border-b border-gray-200 shadow-sm'}`}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14 md:h-16">
          <Logo size="md" showText={!isHomePage || window.innerWidth >= 768} />

          {/* Desktop Navigation - Only show on tool pages */}
          {!isHomePage && (
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = item.path === '/guides'
                  ? location.pathname.startsWith('/guides')
                  : location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
                      ${isActive
                        ? `${item.activeColor} text-white shadow-md`
                        : 'text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    <Icon size={16} />
                    {lang === 'zh' ? item.labelZh : item.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Controls */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <button
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                isHomePage
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              <Languages size={14} className="inline mr-1" />
              {lang === 'zh' ? '繁' : 'EN'}
            </button>

            {!isHomePage && (
              <>
                <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg">
                  <button onClick={toggleLengthUnit} className="px-2 py-1 text-xs font-bold text-slate-600 hover:bg-white rounded transition-colors">
                    {units.length.toUpperCase()}
                  </button>
                  <span className="text-slate-300">|</span>
                  <button onClick={toggleWeightUnit} className="px-2 py-1 text-xs font-bold text-slate-600 hover:bg-white rounded transition-colors">
                    {units.weight.toUpperCase()}
                  </button>
                  <span className="text-slate-300">|</span>
                  <button onClick={toggleCurrency} className="px-2 py-1 text-xs font-bold text-green-700 bg-green-50 hover:bg-white rounded transition-colors">
                    {units.currency}
                  </button>
                </div>

                <button
                  onClick={handleClearData}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title={t('reset')}
                >
                  <RotateCcw size={16} />
                </button>

                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors group"
                  title={t('settings')}
                >
                  <Settings size={16} className="group-hover:rotate-45 transition-transform duration-300" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation - Only show on tool pages */}
        {!isHomePage && (
          <nav className="md:hidden flex gap-1 pb-2 overflow-x-auto -mx-4 px-4">
            {navItems.map((item) => {
              const isActive = item.path === '/guides'
                ? location.pathname.startsWith('/guides')
                : location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-all
                    ${isActive ? `${item.activeColor} text-white shadow-md` : 'bg-gray-100 text-gray-600'}`}
                >
                  <Icon size={14} />
                  {lang === 'zh' ? item.labelZh : item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
