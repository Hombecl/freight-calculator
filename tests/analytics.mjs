import assert from 'node:assert/strict';

// Exercise delivery and failure paths without contacting Google or the lead sink.
const timers = [];
const listeners = {};
const beacons = [];
globalThis.setTimeout = (fn) => { timers.push(fn); return timers.length; };
globalThis.clearTimeout = () => {};
globalThis.window = { addEventListener: (name, fn) => { listeners[name] = fn; } };
globalThis.document = { referrer: 'https://www.google.com/search?q=private', readyState: 'loading',
  addEventListener: () => {}, createElement: () => ({}), head: { appendChild: () => {} } };
globalThis.location = { hostname: 'localhost', origin: 'http://localhost', pathname: '/', search: '' };
Object.defineProperty(globalThis, 'navigator', { configurable: true,
  value: { webdriver: false, sendBeacon: (_url, body) => { beacons.push(body); return true; } } });
const { track, analyticsPath } = await import('../src/lib/track.ts');
track('pageview');
assert.equal(window.dataLayer, undefined, 'local QA must not reach production analytics');
Object.assign(location, { hostname: 'www.dimpack3d.com', origin: 'https://www.dimpack3d.com', search: '?email=private@example.com#token' });
navigator.webdriver = true;
track('pageview');
assert.equal(window.dataLayer, undefined, 'automated visits excluded');
navigator.webdriver = false;
const events = () => window.dataLayer.filter(x => x[0] === 'event');
track('pageview');
track('pageview');
assert.equal(events().length, 1, 'duplicate mount sends only one pageview');
assert.equal(window.dataLayer[1][0], 'set', 'clean URLs precede GA initialization');
assert.equal(window.dataLayer[2][0], 'config', 'configuration precedes queued events');
assert.equal(window.dataLayer[2][2].send_page_view, false);
assert.equal(events()[0][2].page_location, 'https://www.dimpack3d.com/');
assert.equal(events()[0][2].page_referrer, 'https://www.google.com/');
location.search = '?units=in';
track('pageview');
assert.equal(events().length, 1, 'calculator query changes are not navigation');
location.pathname = '/zh/pallet-height-calculator'; track('pageview');
location.pathname = '/'; track('pageview');
assert.equal(events().length, 3, 'back navigation counts a new view');
assert.equal(events()[2][2].page_referrer, 'https://www.dimpack3d.com/zh/pallet-height-calculator');
assert.equal(analyticsPath('/zh/review/private-id'), '/zh/review/:id');
listeners.pagehide();
const body = await beacons[0].text();
assert.equal(JSON.parse(body).events.length, 3);
assert.ok(!body.includes('private'), 'first-party beacon excludes private URL fields');

const storage = new Map();
globalThis.localStorage = { getItem: k => storage.get(k), setItem: (k,v) => storage.set(k,v) };
const { captureLead } = await import('../src/lib/entitlement.ts');
const settle = () => new Promise(resolve => setImmediate(resolve));
for (const result of [
  { ok: false, json: async () => ({ ok: true }) },
  { ok: true, json: async () => ({ ok: false }) },
  { ok: true, json: async () => { throw new Error('invalid JSON'); } },
  new Error('offline'),
]) {
  globalThis.fetch = async () => { if (result instanceof Error) throw result; return result; };
  captureLead('private@example.com'); await settle();
}
assert.equal(events().filter(x => x[1] === 'generate_lead').length, 0, 'failed submissions never become leads');
let finish;
globalThis.fetch = () => new Promise(resolve => { finish = resolve; });
captureLead('private@example.com', { source: 'pro-waitlist' });
assert.equal(events().filter(x => x[1] === 'generate_lead').length, 0, 'waits for server confirmation');
finish({ ok: true, json: async () => ({ ok: true }) }); await settle();
const leads = events().filter(x => x[1] === 'generate_lead');
assert.equal(leads.length, 1);
assert.equal(leads[0][2].lead_source, 'pro-waitlist');
assert.ok(!JSON.stringify(window.dataLayer).includes('private'), 'no email, auth query or search query in analytics');
console.log('PASS analytics: routing, attribution, local exclusion, batching, lead success/failure, privacy');
