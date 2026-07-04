import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { track } from '../../lib/track';

export default function Layout() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    track('pageview');
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <main className={`flex-1 ${isHomePage ? '' : 'p-3 md:p-4'}`}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
