/**
 * track.ts — first-party, cookie-less event beacon.
 * Fire-and-forget to /api/hit (Pages Function → KV). No identifiers are sent
 * or stored beyond coarse country (added server-side), so the "your data never
 * leaves your device" claim for shipment contents stays true — this records
 * only which pages/features are used.
 */

export function track(event: string, meta?: string) {
  try {
    // keep the data clean: never record automated browsers (Playwright, our
    // own E2E/visual QA, most scrapers set navigator.webdriver)
    if ((navigator as Navigator & { webdriver?: boolean }).webdriver) return;
    // mirror to GA4 when its lazy-loaded tag is present (see index.html)
    (window as any).gtag?.(
      'event',
      event === 'pageview' ? 'page_view' : event,
      event === 'pageview' ? { page_path: location.pathname } : { meta: meta ?? '' },
    );
    const body = JSON.stringify({
      e: event,
      p: location.pathname,
      r: document.referrer ? new URL(document.referrer).hostname : '',
      m: meta ?? '',
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/hit', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/hit', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
    }
  } catch { /* never break the app for analytics */ }
}
