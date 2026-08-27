/**
 * First-party, cookie-less event beacon.
 * Events are batched briefly, then written by /api/hit to Analytics Engine.
 * No shipment contents or persistent identifiers are sent.
 */

interface Hit {
  e: string;
  p: string;
  r: string;
  m: string;
}

const MAX_BATCH = 20;
const FLUSH_DELAY_MS = 1_000;
const pending: Hit[] = [];
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let lifecycleHooked = false;

function send(events: Hit[]) {
  const body = JSON.stringify({ events });
  if (navigator.sendBeacon) {
    const accepted = navigator.sendBeacon('/api/hit', new Blob([body], { type: 'application/json' }));
    if (accepted) return;
  }
  fetch('/api/hit', {
    method: 'POST',
    body,
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
  }).catch(() => {});
}

function flush() {
  if (flushTimer !== undefined) clearTimeout(flushTimer);
  flushTimer = undefined;
  if (pending.length === 0) return;
  send(pending.splice(0, MAX_BATCH));
  if (pending.length > 0) flushTimer = setTimeout(flush, 0);
}

function hookLifecycle() {
  if (lifecycleHooked) return;
  lifecycleHooked = true;
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

export function track(event: string, meta?: string) {
  try {
    if ((navigator as Navigator & { webdriver?: boolean }).webdriver) return;
    (window as typeof window & { gtag?: (...args: unknown[]) => void }).gtag?.(
      'event',
      event === 'pageview' ? 'page_view' : event,
      event === 'pageview' ? { page_path: location.pathname } : { meta: meta ?? '' },
    );

    hookLifecycle();
    pending.push({
      e: event,
      p: location.pathname,
      r: document.referrer ? new URL(document.referrer).hostname : '',
      m: meta ?? '',
    });

    if (pending.length >= MAX_BATCH) flush();
    else if (flushTimer === undefined) flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
  } catch { /* analytics must never break the app */ }
}
