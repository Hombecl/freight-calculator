import { Link, useLocation } from 'react-router-dom';
import { Languages, Settings, RotateCcw } from 'lucide-react';
import Logo from './Logo';
import { track } from '../../lib/track';
import { navItems } from './ToolNavigation';
import { useApp } from '../../context/AppContext';
import { localeSwitchHref } from '../../lib/locale';

export default function Header() {
  const location = useLocation();
  const { lang, units, toggleLengthUnit, toggleWeightUnit, toggleCurrency, setIsSettingsOpen, handleClearData, t } = useApp();

  const isHomePage = location.pathname === '/';

  // homepage: absolute over the dark hero, scrolls away with the page —
  // sticky+transparent followed the scroll and overlapped content
  return (
    <header className={`print:hidden ${isHomePage ? 'absolute top-0 z-40 w-full bg-transparent' : 'sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm'}`}>
      <div className={isHomePage ? "max-w-6xl mx-auto px-4" : "px-4"}>
        <div className="flex items-center justify-between h-14 md:h-16">
          <Logo size={isHomePage ? "sm" : "md"} inverse={isHomePage} />

          {isHomePage && <nav aria-label={lang==='zh'?'首頁導覽':'Homepage navigation'} className="ml-auto mr-3 flex items-center gap-3 text-sm text-white">
            <Link to="/planner" onClick={()=>track('home_entry','nav:planner')} className="hidden sm:block rounded px-2 py-2 hover:bg-white/10">{lang==='zh'?'裝載規劃':'Load Planner'}</Link>
            <Link to="/plans" onClick={()=>track('home_entry','nav:plans')} className="hidden md:block rounded px-2 py-2 hover:bg-white/10">{lang==='zh'?'我的方案':'My plans'}</Link>
            <details className="relative"><summary className="cursor-pointer rounded-lg border border-slate-600 px-3 py-2 list-none">{lang==='zh'?'選單 ▾':'Menu ▾'}</summary>
              <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-700 bg-slate-950 shadow-xl p-2">
                {[['/planner','Load Planner','裝載規劃'],['/packing','Carton Packing','產品裝箱'],['/container','Container Quick-Calc','貨櫃快速計算'],['/plans','My plans & templates','我的方案與範本'],['/#more-tools','All tools','全部工具'],['/guides','Guides','指南']].map(([to,en,zh])=><Link key={to} to={to} className="block rounded-lg px-3 py-3 hover:bg-slate-800" onClick={e=>{const menu=e.currentTarget.closest('details');if(menu)menu.open=false;track('home_entry',`menu:${to}`);}}>{lang==='zh'?zh:en}</Link>)}
              </div>
            </details>
          </nav>}
          {/* Controls */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <button
              onClick={() => { window.location.href = localeSwitchHref(); }}
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
                <div className={`hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg ${location.pathname === '/planner' ? '!hidden' : ''}`}>
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
                  aria-label={t('settings')}
                  aria-haspopup="dialog"
                >
                  <Settings size={16} className="group-hover:rotate-45 transition-transform duration-300" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation - Only show on tool pages */}
        {!isHomePage && (
          <nav className="xl:hidden flex gap-1 pb-2 overflow-x-auto -mx-4 px-4">
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
