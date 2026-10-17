import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { track } from '../lib/track';

/** Inside Suspense so a route counts only after its content has loaded. */
export default function AnalyticsRoute() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Helmet commits the new title on a frame; capture it with this route.
    const frame = requestAnimationFrame(() => track('pageview'));
    return () => cancelAnimationFrame(frame);
  }, [pathname]);
  return null;
}
