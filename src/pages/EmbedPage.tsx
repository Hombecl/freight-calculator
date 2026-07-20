import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Calculator from '../components/Calculator';
import { track } from '../lib/track';

/**
 * /embed — chrome-less packing calculator for embedding on other sites via
 * iframe (see public/widget.js). No site header/footer, no canonical/hreflang
 * (noindex — the widget host page is the audience, not search engines).
 * /zh/embed serves the Chinese UI via the router basename, same as every page.
 *
 * Talks to the parent page with postMessage:
 *  - widget → host: { type: 'dp3d:height', height, wid } for iframe auto-resize
 *    (wid echoes the ?wid= query param so multiple widgets on one page can
 *    tell their messages apart).
 * The 3D simulation stays behind the "Open 3D" button — three.js only loads
 * from CDN when a user opens it, so the default embed stays light.
 */
export default function EmbedPage() {
  useEffect(() => {
    track('pageview');
    track('embed_view', document.referrer ? new URL(document.referrer).hostname : 'direct');

    if (window.parent === window) return; // opened directly, nothing to resize
    const wid = new URLSearchParams(window.location.search).get('wid') ?? '';
    const report = () => {
      // body offsetHeight = natural content height (documentElement.scrollHeight
      // is clamped to the iframe viewport, so the widget could never shrink)
      window.parent.postMessage(
        { type: 'dp3d:height', height: document.body.offsetHeight, wid },
        '*',
      );
    };
    const ro = new ResizeObserver(report);
    ro.observe(document.body);
    report();
    return () => ro.disconnect();
  }, []);

  return (
    // natural height on purpose — min-h-screen inside the iframe would ratchet
    // the postMessage-reported height up and never let it shrink
    <div className="bg-slate-50">
      <Helmet>
        <title>Packing Calculator Widget | DimPack3D</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      {/* Calculator's own root already carries bg-slate-50 + p-4 */}
      <Calculator fixedMode="packing" hideHeader={true} embed={true} />
      <div className="px-4 pb-3 text-right">
        <a
          href="https://www.dimpack3d.com/packing?ref=widget"
          target="_blank"
          rel="noopener"
          className="text-[11px] text-slate-400 hover:text-blue-600 font-medium"
        >
          Powered by DimPack3D
        </a>
      </div>
    </div>
  );
}
