import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Check, Copy, KeyRound } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { track } from '../lib/track';
import { API_PLANS, ENDPOINT_BASE_LIMITS, type ApiPlan } from '../lib/apiTiers';

/**
 * /api-pricing — API plans + self-serve key issuance.
 *
 * Until 2026-09 the API said "free beta, volume licensing: hello@" and had no
 * key, no plan and no self-serve path. The first real inbound (a warehouse
 * automation engineer asking "what might be needed to try this out?") showed
 * the gap: a developer could not tell what they were allowed to do, or how to
 * get more. This page answers both. Limits shown here are read from the same
 * module the server enforces (src/lib/apiTiers.ts), so they cannot drift.
 *
 * Paid tiers are issued by hand (mailto) until checkout is wired — honest
 * about that on the page rather than faking a buy button.
 */

const ENDPOINT_LABEL: Record<string, [string, string]> = {
  pack: ['Container packing', '貨櫃裝箱'],
  'pallet-estimate': ['Pallet height', '卡板高度'],
  'order-plan': ['Multi-pallet order', '多卡板訂單'],
  'order-options': ['Order options', '訂單方案'],
  'order-quote': ['Order → pallet quote', '訂單→卡板報價'],
};

type Issued = { key: string; limits: Record<string, { perMin: number; perDay: number }> };

export default function ApiPricingPage() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);

  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [useCase, setUseCase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    track('api_key_request');
    try {
      const r = await fetch('/api/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, company, useCase }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setIssued({ key: j.key, limits: j.limits });
      track('api_key_issued');
    } catch (err) {
      setError(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  const copyKey = async () => {
    if (!issued) return;
    try { await navigator.clipboard.writeText(issued.key); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* */ }
  };

  const planName = (p: ApiPlan) => {
    switch (p.tier) {
      case 'anonymous': return T('No key', '免 key');
      case 'free': return T('Free key', '免費 key');
      case 'starter': return 'Starter';
      case 'business': return 'Business';
    }
  };
  const planBlurb = (p: ApiPlan) => {
    switch (p.tier) {
      case 'anonymous': return T('Try any endpoint right now. Limits are per IP, so shared office networks share them.', '即刻試任何 endpoint。限額按 IP 計,同一辦公室網絡會共用。');
      case 'free': return T('Your own bucket, 5× the anonymous limits. Enough for a pilot integration or a nightly batch.', '你自己嘅配額,係匿名限額 5 倍。夠做一個試點整合或者每晚批次。');
      case 'starter': return T('For a live integration at order time: 20× limits, email support, and a named contact for schema changes.', '適合落單時即時調用:20 倍限額、電郵支援、schema 變更會有專人通知。');
      case 'business': return T('100× limits, priority fixes, custom fields or vehicle presets, and a written SLA. Volume above this is quoted.', '100 倍限額、優先修復、自訂欄位或車輛預設、書面 SLA。再高用量另行報價。');
    }
  };

  const curl = (key: string) => `curl -X POST https://www.dimpack3d.com/api/pallet-estimate \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${key}" \\
  -d @order-request.json`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Helmet>
        <title>{T('Bin Packing API Pricing — free key, Starter, Business', '裝箱 API 價目 — 免費 key、Starter、Business')} | DimPack3D</title>
        <meta name="description" content={T(
          'DimPack3D API plans: use the 3D bin-packing, pallet-height and multi-pallet order endpoints with no key, get a free API key for 5× limits in 10 seconds, or move to Starter ($49/mo) and Business ($199/mo) for production volumes.',
          'DimPack3D API 方案:免 key 直接用 3D 裝箱、卡板高度同多卡板訂單 endpoint;10 秒攞免費 API key 享 5 倍限額;生產用量可選 Starter($49/月)或 Business($199/月)。',
        )} />
      </Helmet>

      <h1 className="text-3xl font-black text-slate-900 mb-3">{T('API pricing', 'API 價目')}</h1>
      <p className="text-slate-600 mb-8 max-w-3xl">
        {T(
          'Four endpoints — container packing, pallet height, multi-pallet order planning, order → pallet quote — behind one key. Every plan calls the same engine; plans differ only in how many calls you can make and how much help you get. Limits below are the ones the server enforces.',
          '四個 endpoint — 貨櫃裝箱、卡板高度、多卡板訂單規劃、訂單→卡板報價 — 一條 key 通用。所有方案用同一個引擎;分別只在調用次數同支援程度。下面嘅限額就係伺服器實際執行嘅限額。',
        )}
      </p>

      <div className="grid md:grid-cols-4 gap-4 mb-10">
        {API_PLANS.map((p) => (
          <div key={p.tier} className={`rounded-2xl border p-5 flex flex-col ${p.tier === 'free' ? 'border-2 border-blue-300 bg-blue-50/40' : 'border-slate-200'}`}>
            <div className="font-black text-slate-900">{planName(p)}</div>
            <div className="text-2xl font-black text-slate-900 my-2">
              {p.priceUsd == null ? T('Free', '免費') : `$${p.priceUsd}`}
              {p.priceUsd != null && <span className="text-sm font-semibold text-slate-500">/{T('mo', '月')}</span>}
            </div>
            <p className="text-sm text-slate-600 mb-4 flex-1">{planBlurb(p)}</p>
            <ul className="text-xs text-slate-700 space-y-1.5 mb-4">
              {Object.entries(ENDPOINT_BASE_LIMITS).map(([ep, b]) => (
                <li key={ep} className="flex gap-2"><Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span><b>{T(ENDPOINT_LABEL[ep][0], ENDPOINT_LABEL[ep][1])}</b>: {(b.perMin * p.multiplier).toLocaleString()}/{T('min', '分')} · {(b.perDay * p.multiplier).toLocaleString()}/{T('day', '日')}</span>
                </li>
              ))}
            </ul>
            {p.tier === 'anonymous' && (
              <Link to="/api-docs" className="text-blue-700 font-bold text-sm inline-flex items-center gap-1">{T('Read the docs', '睇文檔')} <ArrowRight size={14} /></Link>
            )}
            {p.tier === 'free' && (
              <a href="#get-key" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-4 py-2 rounded-lg text-center">{T('Get a free key', '攞免費 key')}</a>
            )}
            {!p.selfServe && (
              <a
                href={`mailto:hello@dimpack3d.com?subject=${encodeURIComponent(`DimPack3D API — ${p.name} plan`)}&body=${encodeURIComponent('Company:\nUse case:\nExpected calls/day:\nCurrent free key (if any):')}`}
                onClick={() => track('api_plan_click', p.tier)}
                className="border border-slate-300 hover:border-blue-400 text-slate-800 text-sm font-bold px-4 py-2 rounded-lg text-center"
              >{T('Request this plan', '申請呢個方案')}</a>
            )}
          </div>
        ))}
      </div>

      <section id="get-key" className="rounded-2xl border-2 border-blue-200 bg-blue-50/40 p-6 mb-10 scroll-mt-6">
        <h2 className="text-xl font-black text-slate-900 mb-1 flex items-center gap-2"><KeyRound size={20} className="text-blue-700" />{T('Get a free API key', '攞免費 API key')}</h2>
        <p className="text-sm text-slate-600 mb-4">{T(
          'Issued instantly. The key is shown once — save it somewhere safe; we do not email it. Send it as X-API-Key on any endpoint.',
          '即時發出。Key 只顯示一次 — 請自行保存,我們唔會電郵俾你。喺任何 endpoint 加上 X-API-Key header 即可。',
        )}</p>
        {!issued ? (
          <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={T('Work email', '工作電郵')} className="px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder={T('Company (optional)', '公司(可選)')} className="px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            <input value={useCase} onChange={(e) => setUseCase(e.target.value)} placeholder={T('What will you build? e.g. pallet height at order time (optional)', '你想做啲乜?例如落單時估卡板高度(可選)')} className="px-3 py-2 rounded-lg border border-slate-300 text-sm sm:col-span-2" />
            <div className="sm:col-span-2 flex items-center gap-3">
              <button disabled={busy} type="submit" className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-lg text-sm">{busy ? T('Issuing…', '發出中…') : T('Create my key', '建立我嘅 key')}</button>
              {error && <span className="text-sm text-red-600">{error}</span>}
            </div>
          </form>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <code data-testid="issued-key" className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono break-all">{issued.key}</code>
              <button onClick={copyKey} className="inline-flex items-center gap-1 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold"><Copy size={14} />{copied ? T('Copied', '已複製') : T('Copy', '複製')}</button>
            </div>
            <p className="text-xs text-slate-600 mb-3">{T('Your limits now', '你而家嘅限額')}: {Object.entries(issued.limits).map(([ep, l]) => `${ep} ${l.perMin}/min · ${l.perDay}/day`).join(' · ')}</p>
            <pre className="p-4 rounded-lg bg-slate-950 text-slate-100 text-xs overflow-x-auto"><code>{curl(issued.key)}</code></pre>
            <p className="text-xs text-slate-500 mt-3">{T('Lost it? Create another — up to 5 per day. Older keys keep working until you ask us to revoke them.', '唔見咗?再建立一條 — 每日最多 5 條。舊 key 會繼續有效,直至你要求我們撤銷。')}</p>
          </div>
        )}
      </section>

      <section className="grid md:grid-cols-3 gap-4 mb-10 text-sm">
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="font-bold text-slate-900 mb-1">{T('What counts as a call?', '點樣計一次調用?')}</div>
          <p className="text-slate-600">{T('One POST to /api/pack, /api/pallet-estimate, /api/order-plan or /api/order-quote. GET (docs) and OPTIONS are never counted. A 400 for bad input still counts; a 429 does not.', '一次 POST 到 /api/pack、/api/pallet-estimate 或 /api/order-plan。GET(文檔)同 OPTIONS 唔計。輸入錯誤嘅 400 照計;429 唔計。')}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="font-bold text-slate-900 mb-1">{T('Where does my data go?', '我嘅數據去咗邊?')}</div>
          <p className="text-slate-600">{T('Requests are computed on Cloudflare’s edge and not stored. We log only counts per key for rate limiting. No carton data is retained.', '請求喺 Cloudflare edge 計算,唔會儲存。我們只記錄每條 key 嘅調用次數作限流。唔保留任何箱單數據。')}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="font-bold text-slate-900 mb-1">{T('Why is Starter not self-serve yet?', '為何 Starter 未可以自助購買?')}</div>
          <p className="text-slate-600">{T('We are onboarding the first paying integrations by hand so we can see real workloads before locking the tiers. Email us; we reply within one business day.', '我們正逐個手動 onboard 首批付費整合,先睇清真實用量再鎖定方案。電郵我們,一個工作日內回覆。')}</p>
        </div>
      </section>

      <div className="flex flex-wrap gap-4 text-sm">
        <Link to="/api-docs" className="text-blue-700 font-bold inline-flex items-center gap-1">{T('API reference', 'API 參考')} <ArrowRight size={14} /></Link>
        <Link to="/pallet-height-calculator" className="text-blue-700 font-bold inline-flex items-center gap-1">{T('Try the pallet-height endpoint with a UI', '用介面試卡板高度 endpoint')} <ArrowRight size={14} /></Link>
      </div>
    </div>
  );
}
