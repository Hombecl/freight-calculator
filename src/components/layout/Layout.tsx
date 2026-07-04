import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from './Header';
import Footer from './Footer';
import { track } from '../../lib/track';
import { IS_ZH, localeUrls } from '../../lib/locale';

export default function Layout() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const urls = localeUrls(location.pathname);

  useEffect(() => {
    track('pageview');
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* locale-aware canonical + hreflang for every page (pages must NOT set
          their own <link rel="canonical"> or these would be overridden) */}
      <Helmet>
        <html lang={IS_ZH ? 'zh-Hant' : 'en'} />
        <link rel="canonical" href={IS_ZH ? urls.zh : urls.en} />
        <link rel="alternate" hrefLang="en" href={urls.en} />
        <link rel="alternate" hrefLang="zh-Hant" href={urls.zh} />
        <link rel="alternate" hrefLang="x-default" href={urls.en} />
      </Helmet>
      <Header />
      <main className={`flex-1 ${isHomePage ? '' : 'p-3 md:p-4'}`}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
