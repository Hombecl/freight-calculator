import { Outlet, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MARKET_LANGS, marketHref, marketTag, type MarketTool } from '../../lib/internationalTools';
import Header from './Header';
import ToolNavigation from './ToolNavigation';
import { WorkspacePreferences, WorkspaceSettings } from './WorkspacePreferences';
import Footer from './Footer';
import { IS_ZH, localeUrls } from '../../lib/locale';

export default function Layout() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const urls = localeUrls(location.pathname);

  return (
    <WorkspacePreferences><div className="min-h-screen bg-slate-50 flex flex-col">
      {/* locale-aware canonical + hreflang for every page (pages must NOT set
          their own <link rel="canonical"> or these would be overridden) */}
      <Helmet>
        <html lang={IS_ZH ? 'zh-Hant' : 'en'} />
        <link rel="canonical" href={IS_ZH ? urls.zh : urls.en} />
        <link rel="alternate" hrefLang="en" href={urls.en} />
        <link rel="alternate" hrefLang="zh-Hant" href={urls.zh} />
        {['/cbm-calculator','/pallet-calculator'].includes(location.pathname) && MARKET_LANGS.map(l => <link key={l} rel="alternate" hrefLang={marketTag(l)} href={'https://www.dimpack3d.com'+marketHref(l,location.pathname.slice(1) as MarketTool)}/>)}
        <link rel="alternate" hrefLang="x-default" href={urls.en} />
      </Helmet>
      <Header />
      <div className="flex flex-1 min-w-0">
      {!isHomePage && <ToolNavigation />}
      <main data-tool-page={location.pathname} className={`min-w-0 flex-1 ${isHomePage || location.pathname === '/planner' ? '' : 'p-3 md:p-4'}`}>
        <Outlet />
      </main>
      </div>
      <WorkspaceSettings />
      <Footer />
    </div></WorkspacePreferences>
  );
}
