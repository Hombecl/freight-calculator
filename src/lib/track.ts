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
let initialized = false;
let lastPage = '';
let pageReferrer = '';
const GA_ID = 'G-N21RV614FJ';
const DEBUG = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_ANALYTICS_DEBUG === 'true';
type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

/** Never send share IDs, calculator query strings, or auth fragments. */
export function analyticsPath(path: string): string {
  return path.replace(/(\/review\/)[^/]+/, '$1:id');
}

function referrerOrigin(): string {
  try { return document.referrer ? new URL(document.referrer).origin + '/' : ''; }
  catch { return ''; }
}

function initialize(context: Record<string, string>) {
  if (initialized || DEBUG) return;
  initialized = true;
  const win = window as AnalyticsWindow;
  win.dataLayer = win.dataLayer || [];
  win.gtag = function () { win.dataLayer!.push(arguments); };
  win.gtag('js', new Date());
  win.gtag('set', context);
  // Queue config BEFORE the first event, and let the router own page views.
  const campaign: Record<string, string> = {};
  const params = new URLSearchParams(location.search);
  for (const key of ['source', 'medium', 'campaign', 'term', 'content']) {
    const value = params.get(`utm_${key}`);
    if (value) campaign[key === 'campaign' ? 'campaign_name' : `campaign_${key}`] = value.slice(0, 100);
  }
  win.gtag('config', GA_ID, { send_page_view: false, ...campaign });
  const load = () => setTimeout(() => {
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    script.async = true;
    document.head.appendChild(script);
  }, 1500);
  if (document.readyState === 'complete') load();
  else window.addEventListener('load', load, { once: true });
}

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
    if (!DEBUG && (navigator.webdriver || !['dimpack3d.com', 'www.dimpack3d.com'].includes(location.hostname))) return;
    const path = analyticsPath(location.pathname);
    const page = location.origin + path;
    if (event === 'pageview') {
      // StrictMode, query/hash edits and remounts are not new page views.
      if (page === lastPage) return;
      pageReferrer = lastPage || referrerOrigin();
      lastPage = page;
    }
    const context = { page_path: path, page_location: page, page_title: document.title,
      page_referrer: pageReferrer || referrerOrigin(),
    };
    const parameters = { ...context,
      ...(meta ? { meta } : {}),
      ...(event === 'generate_lead' ? { lead_source: meta } : {}),
    };
    if (DEBUG) { console.info('[analytics]', event === 'pageview' ? 'page_view' : event, parameters); return; }
    initialize(context);
    // Automatic engagement/scroll events must use the same current, clean URL.
    (window as AnalyticsWindow).gtag?.('set', context);
    (window as AnalyticsWindow).gtag?.(
      'event',
      event === 'pageview' ? 'page_view' : event,
      parameters,
    );

    hookLifecycle();
    pending.push({
      e: event,
      p: path,
      r: referrerOrigin() ? new URL(referrerOrigin()).hostname : '',
      m: meta ?? '',
    });

    if (pending.length >= MAX_BATCH) flush();
    else if (flushTimer === undefined) flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
  } catch { /* analytics must never break the app */ }
}
