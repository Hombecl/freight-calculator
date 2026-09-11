import { applyProfile, attachProfile, loadProfiles, parseProfile } from '../lib/receiverProfiles';
import { deviceProfiles, quoteStorageKey, SHEET_STORAGE } from '../lib/receiverStorage';
import PalletEstimateView from '../components/PalletEstimateView';
import { findOrderOptions, type OrderOptions, type OrderOptionsRequest } from '../lib/orderOptions';
import { parseQuoteRequest } from '../lib/orderQuote';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Check, Download, FileUp, RefreshCw, ShieldAlert, Upload } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { track } from '../lib/track';
import { parseFile, parseText } from '../lib/importCartons';
import { quoteOrder, quoteCsv, QUOTE_EXAMPLE, QUOTE_LIMITS, type OrderQuote, type OrderQuoteRequest, type QuoteUnits } from '../lib/orderQuote';

/**
 * /order-quote — pallet count + loaded dimensions BEFORE freight quoting.
 *
 * The workflow the first real API inbound described: an order comes in, the
 * shipper needs pallet count, outer dims and gross weight to rate LTL freight,
 * and later wants to know how far the prediction was from the pallet the crew
 * actually built. This page runs the SAME library as /api/order-quote in the
 * browser (deterministic, same inputHash), so a developer can eyeball the
 * contract before integrating, and an ops person can use it with a CSV today.
 *
 * Actuals entered here are stored per orderId in localStorage only — the
 * predicted-vs-measured record is the pilot evidence; nothing is uploaded.
 */

type Item = OrderQuoteRequest['items'][number];

const inputCls = 'w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const btnCls = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-40';
const primaryCls = 'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 text-sm font-bold disabled:opacity-50';

const CM_PER_IN = 2.54;
const KG_PER_LB = 0.45359237;
const r2 = (n: number) => Math.round(n * 100) / 100;

const toUnits = (req: OrderQuoteRequest, from: QuoteUnits, to: QuoteUnits): OrderQuoteRequest => {
  if (from === to) return req;
  const L = to === 'in-lb' ? 1 / CM_PER_IN : CM_PER_IN;
  const W = to === 'in-lb' ? 1 / KG_PER_LB : KG_PER_LB;
  const l = (v?: number) => (v === undefined ? undefined : r2(v * L));
  const w = (v?: number) => (v === undefined ? undefined : r2(v * W));
  return {
    ...req,
    units: to,
    pallet: { l: l(req.pallet.l)!, w: l(req.pallet.w)!, baseHeight: l(req.pallet.baseHeight)!, maxHeight: l(req.pallet.maxHeight)!, maxWeight: w(req.pallet.maxWeight)!, tareWeight: w(req.pallet.tareWeight) },
    packagingAllowance: { height: l(req.packagingAllowance?.height), weight: w(req.packagingAllowance?.weight) },
    limits: { ...req.limits, maxLoadedHeight: l(req.limits?.maxLoadedHeight), maxGrossWeight: w(req.limits?.maxGrossWeight) },
    items: req.items.map((it) => ({ ...it, l: l(it.l)!, w: l(it.w)!, h: l(it.h)!, weight: w(it.weight)!, maxStack: w(it.maxStack) })),
    actuals: req.actuals && Object.fromEntries(Object.entries(req.actuals).map(([k, a]) => [k, k === 'summary' ? a : { ...a, height: l(('height' in a ? a.height : undefined)), grossWeight: w(('grossWeight' in a ? a.grossWeight : undefined)) }])) as OrderQuoteRequest['actuals'],
  };
};

const storageKey = quoteStorageKey;

function download(text: string, filename: string, type: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function OrderQuotePage() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => (lang === 'zh' ? zh : en);
  const [profiles, setProfiles] = useState(() => { try { return deviceProfiles(localStorage.getItem('dp_receiver_profiles')); } catch { return loadProfiles(); } });
  const [profileId, setProfileId] = useState('');
  const selectedProfile = profiles.find(p => p.id === profileId);
  const [profileChecks, setProfileChecks] = useState<Awaited<ReturnType<typeof attachProfile>>['profileChecks']>([]);
  const [req, setReq] = useState<OrderQuoteRequest>(() => { try { const carried = JSON.parse(sessionStorage.getItem(SHEET_STORAGE) || '{}'); if (carried.request) { parseQuoteRequest(carried.request); return carried.request; } } catch { /* use example when no valid carried request */ } return structuredClone(QUOTE_EXAMPLE); });
  const units: QuoteUnits = req.units ?? 'cm-kg';
  const lu = units === 'in-lb' ? 'in' : 'cm';
  const wu = units === 'in-lb' ? 'lb' : 'kg';
  const [quotedRequest, setQuotedRequest] = useState<OrderQuoteRequest | null>(null);
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [paste, setPaste] = useState('');
  const [importNote, setImportNote] = useState<string[]>([]);
  const [serverState, setServerState] = useState<'' | 'match' | 'mismatch' | 'error'>('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { track('tool_order_quote'); }, []);

  // restore actuals for this orderId (evidence lives on the device only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(req.orderId));
      if (raw) {
        const saved = JSON.parse(raw) as { actuals?: OrderQuoteRequest['actuals']; actualsUnits?: QuoteUnits; request?: OrderQuoteRequest };
        if ('profileSnapshot' in saved && saved.profileSnapshot) { const p = parseProfile(saved.profileSnapshot); setProfiles(old => [...old.filter(v => v.id !== p.id), p]); setProfileId(p.id); }
        if (saved.request) { setReq(saved.request); if ('pallets' in saved) { setQuote(saved as unknown as OrderQuote); setQuotedRequest(saved.request); if ('profileChecks' in saved && Array.isArray(saved.profileChecks)) setProfileChecks(saved.profileChecks); } return; }
        if (saved.actuals && Object.keys(saved.actuals).length) setReq((r) => ({ ...r, actuals: toUnits({...r, actuals:saved.actuals},saved.actualsUnits??r.units??'cm-kg',r.units??'cm-kg').actuals }));
      }
    } catch { /* */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req.orderId]);

  const setPallet = (k: keyof OrderQuoteRequest['pallet'], v: number | undefined) => setReq((r) => ({ ...r, pallet: { ...r.pallet, [k]: v as number } }));
  const setItem = (i: number, patch: Partial<Item>) => setReq((r) => ({ ...r, items: r.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }));
  const numOr = (s: string) => (s.trim() === '' ? undefined : Number(s));

  const run = async () => {
    setBusy(true); setError(null); setServerState('');
    try {
      const base = await quoteOrder(req);
      const q = selectedProfile ? await attachProfile(base, selectedProfile) : base;
      setProfileChecks(selectedProfile ? (await attachProfile(base, selectedProfile)).profileChecks : []);
      setQuote(q);
      setQuotedRequest(structuredClone(req));
      track('order_quote_run', q.status);
      try { const old = JSON.parse(localStorage.getItem(storageKey(req.orderId)) || '{}'); localStorage.setItem(storageKey(req.orderId), JSON.stringify({ ...old, ...q, profileSnapshot: selectedProfile, request: req, actuals: req.actuals ?? {}, actualsUnits: req.units ?? 'cm-kg', at: new Date().toISOString() })); } catch { /* */ }
    } catch (e) {
      setQuote(null);
      setError(String((e as Error).message || e));
    } finally { setBusy(false); }
  };

  const importRows = async (text?: string, file?: File) => {
    try {
      const res = file ? await parseFile(file) : parseText(text ?? '');
      if (!res.specs.length) { setImportNote(res.warnings); return; }
      const factorL = units === 'in-lb' ? 1 / CM_PER_IN : 1; // importer assumes cm/kg
      const factorW = units === 'in-lb' ? 1 / KG_PER_LB : 1;
      const items: Item[] = res.specs.slice(0, QUOTE_LIMITS.types).map((s) => ({
        sku: s.label, label: s.label, l: r2(s.l * factorL), w: r2(s.w * factorL), h: r2(s.h * factorL), qty: s.qty, weight: r2(s.weight * factorW),
        keepUpright: s.keepUpright ?? true, ...(s.maxStack === undefined ? {} : { maxStack: r2(s.maxStack * factorW) }),
      }));
      const seen = new Set<string>();
      for (const it of items) { let k = it.sku!; let n = 2; while (seen.has(k)) k = `${it.sku}-${n++}`; seen.add(k); it.sku = k; }
      setReq((r) => ({ ...r, items }));
      setImportNote([...res.warnings, ...(res.specs.length > QUOTE_LIMITS.types ? [T(`Only the first ${QUOTE_LIMITS.types} carton types were kept.`, `只保留首 ${QUOTE_LIMITS.types} 種箱型。`)] : [])]);
      track('order_quote_import', file ? 'file' : 'paste');
    } catch (e) { setImportNote([String((e as Error).message || e)]); }
  };

  const serverCheck = async () => {
    if (!quote) return;
    setServerState('');
    try {
      const res = await fetch('/api/order-quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...req, actuals: undefined }) });
      if (!res.ok) throw new Error();
      const j = (await res.json()) as OrderQuote;
      const same = j.inputHash === quote.inputHash && JSON.stringify(j.pallets.map((p) => p.outerDims)) === JSON.stringify(quote.pallets.map((p) => p.outerDims));
      setServerState(same ? 'match' : 'mismatch');
      track('order_quote_api_check', same ? 'match' : 'mismatch');
    } catch { setServerState('error'); }
  };

  const curl = useMemo(() => `curl -X POST https://www.dimpack3d.com/api/order-quote \\\n  -H "Content-Type: application/json" \\\n  -H "X-API-Key: dp_live_…"   # optional, 5x limits\n  --data-binary @order-quote-request.json`, []);

  const totalCartons = req.items.reduce((s, it) => s + (it.qty || 0), 0);
  const badge = (s: string) => ({
    pass: 'bg-emerald-100 text-emerald-800', fail: 'bg-red-100 text-red-800', warn: 'bg-amber-100 text-amber-800', not_evaluated: 'bg-slate-100 text-slate-600',
  }[s] ?? 'bg-slate-100 text-slate-600');

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <Helmet>
        <title>{T('Order to Pallet Quote — pallet count, dimensions and weight before freight quoting', '訂單轉卡板報價 — 報運費前先知板數、尺寸同重量')} | DimPack3D</title>
        <meta name="description" content={T(
          'Paste an order’s carton list and get pallet count, outer dimensions and gross weight (incl. tare and packaging) checked against your carrier or receiver limits — before you quote LTL freight. Deterministic, same engine as the API, carrier-input CSV, predicted-vs-measured tracking.',
          '貼上訂單箱單,即得板數、外尺寸同毛重(連板底同包裝),並對照你嘅承運商或收貨方限制 — 報 LTL 運費之前先知道。確定性、同 API 同一引擎、承運商輸入 CSV、預測 vs 實量記錄。',
        )} />
      </Helmet>
      <label className="block my-4">{T('Receiver profile', '收貨方設定')}<select data-testid="quote-profile" className={inputCls} value={profileId} onChange={e => { const p = profiles.find(p => p.id === e.target.value); setProfileId(e.target.value); setQuote(null); setProfileChecks([]); if (p) setReq(r => applyProfile(r,p)); }}><option value="">{T('No profile', '未選設定')}</option>{profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      {selectedProfile?.template && <p className="bg-amber-100 p-2">{T('Verify with your buyer', '請同買家核實')} {selectedProfile.unverified?.join(', ')}</p>}
      <Link to={lang === 'zh' ? '/zh/receiver-profiles' : '/receiver-profiles'}>{T('Manage receiver profiles', '管理收貨方設定')}</Link>

      <h1 className="text-3xl font-black text-slate-900 mb-2">{T('Order → pallet quote', '訂單 → 卡板報價')}</h1>
      <p className="text-slate-600 mb-1 max-w-3xl">{T(
        'Before you rate LTL freight you need pallet count, outer L×W×H and gross weight — and you need to know if the receiver will take that pallet. This runs the same deterministic engine as the API and tells you what it assumed.',
        '報 LTL 運費之前你要知道板數、外尺寸 L×W×H 同毛重 — 仲要知道收貨方收唔收呢塊板。呢頁用同 API 一樣嘅確定性引擎,並講明佢假設咗啲乜。',
      )}</p>
      <p className="text-xs text-slate-500 mb-6">{T(
        `Limits per order: ${QUOTE_LIMITS.types} carton types, ${QUOTE_LIMITS.cartons} cartons, ${QUOTE_LIMITS.pallets} pallets. Larger orders: hello@dimpack3d.com.`,
        `每張訂單上限:${QUOTE_LIMITS.types} 種箱型、${QUOTE_LIMITS.cartons} 箱、${QUOTE_LIMITS.pallets} 板。更大訂單:hello@dimpack3d.com。`,
      )}</p>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 mb-8">
        {/* ---- cartons ---- */}
        <section className="rounded-2xl border border-slate-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="font-black text-slate-900">{T('1. Cartons in the order', '1. 訂單入面嘅箱')} <span className="text-xs font-semibold text-slate-500">({req.items.length} {T('types', '種')} · {totalCartons} {T('cartons', '箱')})</span></h2>
            <div className="flex gap-2">
              <button className={btnCls} onClick={() => fileRef.current?.click()}><FileUp size={14} />{T('CSV / Excel', 'CSV / Excel')}</button>
              <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importRows(undefined, f); e.target.value = ''; }} />
              <button className={btnCls} onClick={() => { setReq(structuredClone(QUOTE_EXAMPLE)); setQuote(null); setImportNote([]); }}>{T('Example', '例子')}</button>
            </div>
          </div>
          <textarea value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={T('Paste from Excel: sku/name, length, width, height, weight, qty (header row optional; cm/kg)', '由 Excel 貼上:sku/名稱、長、闊、高、重量、數量(可有標題行;cm/kg)')} className={`${inputCls} h-20 font-mono text-xs mb-2`} />
          <div className="flex items-center gap-3 mb-3">
            <button className={btnCls} disabled={!paste.trim()} onClick={() => void importRows(paste)}><Upload size={14} />{T('Use pasted rows', '用貼上嘅行')}</button>
            {importNote.length > 0 && <span className="text-xs text-amber-700">{importNote.join(' · ')}</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead><tr className="text-left text-slate-500 border-b border-slate-200">
                {['SKU', T('Label', '名稱'), `L ${lu}`, `W ${lu}`, `H ${lu}`, `${T('Weight', '重量')} ${wu}`, T('Qty', '數量'), T('Upright', '直立'), `${T('Max on top', '頂部承重')} ${wu}`, ''].map((h, i) => <th key={i} className="py-1.5 pr-2 font-semibold">{h}</th>)}
              </tr></thead>
              <tbody>
                {req.items.map((it, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-1 pr-2"><input className={`${inputCls} py-1 w-32`} value={it.sku ?? ''} onChange={(e) => setItem(i, { sku: e.target.value })} /></td>
                    <td className="py-1 pr-2"><input className={`${inputCls} py-1 w-36`} value={it.label ?? ''} onChange={(e) => setItem(i, { label: e.target.value })} /></td>
                    {(['l', 'w', 'h', 'weight'] as const).map((k) => (
                      <td key={k} className="py-1 pr-2"><input type="number" step="any" className={`${inputCls} py-1 w-20`} value={it[k] ?? ''} onChange={(e) => setItem(i, { [k]: numOr(e.target.value) } as Partial<Item>)} /></td>
                    ))}
                    <td className="py-1 pr-2"><input type="number" className={`${inputCls} py-1 w-16`} value={it.qty ?? ''} onChange={(e) => setItem(i, { qty: numOr(e.target.value) as number })} /></td>
                    <td className="py-1 pr-2 text-center"><input type="checkbox" checked={it.keepUpright ?? true} onChange={(e) => setItem(i, { keepUpright: e.target.checked })} /></td>
                    <td className="py-1 pr-2"><input type="number" step="any" className={`${inputCls} py-1 w-20`} placeholder="∞" value={it.maxStack ?? ''} onChange={(e) => setItem(i, { maxStack: numOr(e.target.value) })} /></td>
                    <td className="py-1"><button className="text-slate-400 hover:text-red-600" onClick={() => setReq((r) => ({ ...r, items: r.items.filter((_, j) => j !== i) }))} aria-label="remove">×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className={`${btnCls} mt-2`} disabled={req.items.length >= QUOTE_LIMITS.types} onClick={() => setReq((r) => ({ ...r, items: [...r.items, { sku: `SKU-${r.items.length + 1}`, label: '', l: 40, w: 30, h: 30, qty: 1, weight: 5, keepUpright: true }] }))}>+ {T('Carton type', '箱型')}</button>
        </section>

        {/* ---- pallet + limits ---- */}
        <section className="rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-slate-900">{T('2. Pallet, packaging, receiver', '2. 卡板、包裝、收貨方')}</h2>
            <div className="flex rounded-lg border border-slate-300 overflow-hidden text-xs font-bold">
              {(['cm-kg', 'in-lb'] as QuoteUnits[]).map((u) => (
                <button key={u} className={`px-2.5 py-1 ${units === u ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`} onClick={() => setReq((r) => toUnits(r, units, u))}>{u}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="col-span-2 font-semibold text-slate-600">{T('Order reference', '訂單編號')}<input className={`${inputCls} mt-1`} value={req.orderId ?? ''} onChange={(e) => setReq((r) => ({ ...r, orderId: e.target.value }))} placeholder="SO-10482" /></label>
            {([['l', `${T('Pallet length', '板長')} ${lu}`], ['w', `${T('Pallet width', '板闊')} ${lu}`], ['baseHeight', `${T('Base height', '板底高')} ${lu}`], ['tareWeight', `${T('Tare weight', '空板重')} ${wu}`], ['maxHeight', `${T('Packing height cap', '疊高上限')} ${lu}`], ['maxWeight', `${T('Payload cap', '載重上限')} ${wu}`]] as const).map(([k, label]) => (
              <label key={k} className="font-semibold text-slate-600">{label}<input type="number" step="any" className={`${inputCls} mt-1`} value={req.pallet[k] ?? ''} onChange={(e) => setPallet(k, numOr(e.target.value))} /></label>
            ))}
            <label className="font-semibold text-slate-600">{T('Wrap/cap height', '包裝加高')} {lu}<input type="number" step="any" className={`${inputCls} mt-1`} value={req.packagingAllowance?.height ?? ''} onChange={(e) => setReq((r) => ({ ...r, packagingAllowance: { ...r.packagingAllowance, height: numOr(e.target.value) } }))} /></label>
            <label className="font-semibold text-slate-600">{T('Wrap/cap weight', '包裝加重')} {wu}<input type="number" step="any" className={`${inputCls} mt-1`} value={req.packagingAllowance?.weight ?? ''} onChange={(e) => setReq((r) => ({ ...r, packagingAllowance: { ...r.packagingAllowance, weight: numOr(e.target.value) } }))} /></label>
            <label className="col-span-2 font-semibold text-slate-600 mt-1">{T('Receiver / carrier limit profile', '收貨方 / 承運商限制')}<input className={`${inputCls} mt-1`} value={req.limits?.name ?? ''} onChange={(e) => setReq((r) => ({ ...r, limits: { ...r.limits, name: e.target.value } }))} placeholder={T('e.g. Retailer DC, LTL standard, Amazon FBA', '例如 零售商 DC、LTL 標準、Amazon FBA')} /></label>
            <label className="font-semibold text-slate-600">{T('Max loaded height', '最高裝載高度')} {lu}<input type="number" step="any" className={`${inputCls} mt-1`} value={req.limits?.maxLoadedHeight ?? ''} onChange={(e) => setReq((r) => ({ ...r, limits: { ...r.limits, maxLoadedHeight: numOr(e.target.value) } }))} /></label>
            <label className="font-semibold text-slate-600">{T('Max gross weight', '最高毛重')} {wu}<input type="number" step="any" className={`${inputCls} mt-1`} value={req.limits?.maxGrossWeight ?? ''} onChange={(e) => setReq((r) => ({ ...r, limits: { ...r.limits, maxGrossWeight: numOr(e.target.value) } }))} /></label>
            <label className="font-semibold text-slate-600">{T('Max pallets', '最多板數')}<input type="number" className={`${inputCls} mt-1`} value={req.maxPallets ?? ''} onChange={(e) => setReq((r) => ({ ...r, maxPallets: numOr(e.target.value) }))} /></label>
          </div>
          <button className={`${primaryCls} w-full mt-4`} disabled={busy || !req.items.length} onClick={() => void run()}>
            {busy ? <RefreshCw size={16} className="animate-spin" /> : <ArrowRight size={16} />}{T('Quote this order', '計呢張訂單')}
          </button>
          {error && <p role="alert" className="text-sm text-red-700 mt-2">{error}</p>}
        </section>
      </div>

      {/* ---- result ---- */}
      {quote && (
        <section data-testid="quote-result" className="mb-10">
          <div className={`rounded-2xl border-2 p-5 mb-4 ${quote.status === 'complete' ? 'border-emerald-300 bg-emerald-50/50' : quote.status === 'partial' ? 'border-red-300 bg-red-50/50' : 'border-amber-300 bg-amber-50/50'}`}>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className={`text-xs font-black uppercase tracking-wider px-2 py-1 rounded-full ${badge(quote.status === 'complete' ? 'pass' : quote.status === 'partial' ? 'fail' : 'warn')}`}>{quote.status}</span>
              <span className="font-black text-slate-900 text-lg">{quote.summary.palletCount} {T('pallet(s)', '板')} · {quote.summary.totalGrossWeight.kg} kg / {quote.summary.totalGrossWeight.lb} lb · {T('tallest', '最高')} {quote.summary.maxOuterHeight.cm} cm / {quote.summary.maxOuterHeight.in} in</span>
            </div>
            <p className="text-sm text-slate-700">
              {quote.status === 'complete' && T('Every carton is placed and every supplied limit passed. Quote with the pallet lines below.', '所有箱已放入,所有已提供嘅限制通過。用下面嘅板資料報價。')}
              {quote.status === 'partial' && T(`${quote.summary.cartonsUnplaced} carton(s) did not fit within ${req.maxPallets ?? QUOTE_LIMITS.pallets} pallet(s). Do NOT quote this as the whole order — raise max pallets or the height cap.`, `${quote.summary.cartonsUnplaced} 箱未能放入 ${req.maxPallets ?? QUOTE_LIMITS.pallets} 板之內。唔好當成整張訂單報價 — 提高板數或疊高上限。`)}
              {quote.status === 'needs_review' && T(`Placed, but a limit failed: ${quote.reviewReasons.join(', ')}. A person should decide before this is quoted.`, `已放入,但有限制未通過:${quote.reviewReasons.join(', ')}。報價前應由人手決定。`)}
            </p>
            <p className="text-[11px] text-slate-500 mt-2 font-mono">inputHash {quote.inputHash.slice(0, 16)}… · {quote.engineVersion} · meter {quote.meter.unit}:{quote.meter.id}</p>
          </div>

          {quote.summary.palletCount >= 2 && quotedRequest && JSON.stringify(req) === JSON.stringify(quotedRequest) && <OrderOptionsPanel key={quote.inputHash} request={quotedRequest} baseline={quote} onUse={async (option) => {
            if (!window.confirm(T('Apply these quantity changes and use this pallet build?', '套用呢啲數量變更同砌板方案？'))) return;
            const normalized = parseQuoteRequest(quotedRequest);
            const next: OrderQuoteRequest = { ...quotedRequest, packing: option.packing, items: quotedRequest.items.flatMap((it, i) => {
              const change = option.quantityChanges.find(c => c.sku === normalized.items[i].sku);
              const qty = change?.to ?? it.qty;
              return qty ? [{ ...it, qty }] : [];
            }), actuals: { summary: { selectedOptionId: option.id } } };
            const base = await quoteOrder(next);
            const q = selectedProfile ? await attachProfile(base, selectedProfile) : base;
            setProfileChecks(selectedProfile ? (await attachProfile(base, selectedProfile)).profileChecks : []);
            setReq(next); setQuotedRequest(structuredClone(next)); setQuote(q); setServerState('');
            try { localStorage.setItem(storageKey(next.orderId), JSON.stringify({ ...q, profileSnapshot: selectedProfile, request: next, actuals: next.actuals, actualsUnits: next.units ?? 'cm-kg' })); } catch { /* device storage optional */ }
          }} />}
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead><tr className="text-left text-slate-500 border-b border-slate-200">
                {[T('Pallet', '板'), T('Cartons', '箱數'), `L×W×H (in)`, `L×W×H (cm)`, T('Gross lb / kg', '毛重 lb / kg'), T('Checks', '檢查'), T('Measured height', '實量高度') + ` (${lu})`, T('Measured gross', '實量毛重') + ` (${wu})`, T('Variance', '偏差')].map((h, i) => <th key={i} className="py-2 pr-3 font-semibold">{h}</th>)}
              </tr></thead>
              <tbody>
                {quote.pallets.map((p) => {
                  const a = req.actuals?.[`${p.index}`] ?? {};
                  return (
                    <tr key={p.index} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-3 font-bold">#{p.index + 1}</td>
                      <td className="py-2 pr-3">{p.cartonCount}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{p.outerDims.l.in} × {p.outerDims.w.in} × <b>{p.outerDims.h.in}</b></td>
                      <td className="py-2 pr-3 whitespace-nowrap">{p.outerDims.l.cm} × {p.outerDims.w.cm} × <b>{p.outerDims.h.cm}</b></td>
                      <td className="py-2 pr-3 whitespace-nowrap"><b>{p.grossWeight.lb}</b> / {p.grossWeight.kg}</td>
                      <td className="py-2 pr-3"><div className="flex flex-wrap gap-1">{p.checks.map((c) => <span key={c.code} title={c.assumption} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badge(c.status)}`}>{c.code} {c.status === 'pass' ? '✓' : c.status === 'fail' ? '✗' : c.status === 'warn' ? '!' : '–'}</span>)}</div></td>
                      <td className="py-2 pr-3"><input type="number" step="any" className={`${inputCls} py-1 w-24`} value={a.height ?? ''} onChange={(e) => setReq((r) => ({ ...r, actuals: { ...r.actuals, [p.index]: { ...a, height: numOr(e.target.value) } } }))} /></td>
                      <td className="py-2 pr-3"><input type="number" step="any" className={`${inputCls} py-1 w-24`} value={a.grossWeight ?? ''} onChange={(e) => setReq((r) => ({ ...r, actuals: { ...r.actuals, [p.index]: { ...a, grossWeight: numOr(e.target.value) } } }))} /></td>
                      <td className="py-2 text-xs whitespace-nowrap">
                        {p.variance?.height && <div>H {p.variance.height.delta > 0 ? '+' : ''}{p.variance.height.delta} cm ({p.variance.height.deltaPct}%)</div>}
                        {p.variance?.grossWeight && <div>W {p.variance.grossWeight.delta > 0 ? '+' : ''}{p.variance.grossWeight.delta} kg ({p.variance.grossWeight.deltaPct}%)</div>}
                        {!p.variance && <span className="text-slate-400">{T('enter + re-run', '輸入後再計')}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <Link className={btnCls} to={lang === 'zh' ? '/zh/build-sheet' : '/build-sheet'} onClick={e => {try {sessionStorage.setItem(SHEET_STORAGE, JSON.stringify({...JSON.parse(localStorage.getItem(storageKey(quote.orderId)) || '{}'), ...quote, request: quotedRequest, profileSnapshot: selectedProfile}));track('order_quote_build_sheet');} catch(err) {e.preventDefault();setError(String(err));}}}>{T('Open build sheet','打開砌板單')}</Link>
            <button className={btnCls} onClick={() => { download(quoteCsv(quote), `${req.orderId || 'order'}-pallets.csv`, 'text/csv'); track('order_quote_csv'); }}><Download size={14} />{T('Carrier-input CSV', '承運商輸入 CSV')}</button>
            <button className={btnCls} onClick={() => { download(JSON.stringify({ ...req, actuals: undefined }, null, 2), 'order-quote-request.json', 'application/json'); track('order_quote_request_json'); }}><Download size={14} />{T('API request JSON', 'API 請求 JSON')}</button>
            <button className={btnCls} onClick={() => { download(JSON.stringify(quote, null, 2), `${req.orderId || 'order'}-quote.json`, 'application/json'); }}><Download size={14} />{T('Full result JSON', '完整結果 JSON')}</button>
            <button className={btnCls} onClick={() => void serverCheck()}><ShieldAlert size={14} />{T('Verify against /api/order-quote', '同 /api/order-quote 對數')}</button>
            {serverState === 'match' && <span className="text-sm text-emerald-700 inline-flex items-center gap-1"><Check size={14} />{T('Server result matches (same inputHash and dimensions).', '伺服器結果一致(同一 inputHash 同尺寸)。')}</span>}
            {serverState === 'mismatch' && <span className="text-sm text-red-700">{T('Server result differs — report this with the inputHash.', '伺服器結果不同 — 請連同 inputHash 回報。')}</span>}
            {serverState === 'error' && <span className="text-sm text-amber-700">{T('Server unavailable (works only on dimpack3d.com).', '伺服器不可用(只喺 dimpack3d.com 有效)。')}</span>}
          </div>

          <details className="rounded-xl border border-slate-200 p-4 mb-4">
            <summary className="cursor-pointer font-bold text-slate-900 text-sm">{T('What was checked and what was assumed', '檢查咗啲乜、假設咗啲乜')}</summary>
            <ul className="mt-3 space-y-2 text-xs text-slate-700">
              {[...quote.checks, ...quote.pallets.flatMap((p) => p.checks), ...profileChecks].map((c, i) => (
                <li key={i} className="flex gap-2"><span className={`shrink-0 font-bold px-1.5 py-0.5 rounded ${badge(c.status)}`}>{c.status}</span><span><b>{c.code}{'pallet' in c && c.pallet !== undefined ? ` · pallet #${c.pallet + 1}` : ''}</b>{c.observed !== undefined && <> — {T('observed', '觀察')} {String(c.observed)}{c.limit !== undefined && <> / {T('limit', '限制')} {String(c.limit)}</>}</>}<br /><span className="text-slate-500">{c.assumption}</span></span></li>
              ))}
            </ul>
            <p className="text-[11px] text-slate-500 mt-3">{quote.notes.join(' ')}</p>
          </details>

          <details className="rounded-xl border border-slate-200 p-4">
            <summary className="cursor-pointer font-bold text-slate-900 text-sm">{T('Call this from your WMS / order system', '由你嘅 WMS / 訂單系統調用')}</summary>
            <pre className="mt-3 p-3 rounded-lg bg-slate-950 text-slate-100 text-xs overflow-x-auto"><code>{curl}</code></pre>
            <p className="text-xs text-slate-600 mt-2">{T('Same engine, same inputHash. Free without a key (10/min, 100/day per IP); a free key raises that 5×.', '同一引擎、同一 inputHash。免 key 免費(每 IP 10/分、100/日);免費 key 提升 5 倍。')} <Link to="/api-docs#order-quote" className="text-blue-700 font-semibold">{T('Field reference →', '欄位參考 →')}</Link> · <Link to="/api-pricing" className="text-blue-700 font-semibold">{T('Keys & plans →', 'Key 同方案 →')}</Link></p>
          </details>
        </section>
      )}

      {/* ---- pilot ---- */}
      <section className="rounded-2xl border-2 border-blue-200 bg-blue-50/40 p-6">
        <h2 className="font-black text-slate-900 mb-1.5">{T('Run a 30-order pilot with us', '同我哋做 30 張訂單試點')}</h2>
        <p className="text-sm text-slate-600 mb-3 max-w-3xl">{T(
          'Fixed-fee, 30 days: we quote 30 of your real orders, you build them, we compare predicted vs measured height, weight and pallet count against your freight invoices, with tolerances agreed up front. You keep the integration; we keep the evidence. If it does not hold up, you do not pay for month two.',
          '固定費用,30 日:我哋計你 30 張真實訂單,你砌板,我哋對比預測 vs 實量高度、重量同板數,並對照你嘅運費發票,tolerance 事先講好。整合你留住,證據我哋留住。如果數據企唔住,第二個月唔使俾。',
        )}</p>
        <a href={`mailto:hello@dimpack3d.com?subject=${encodeURIComponent('DimPack3D order-quote pilot')}&body=${encodeURIComponent('Company:\nOrders/day:\nWhere the quote is produced today (WMS / spreadsheet / carrier portal):\nTypical pallet + receiver limits:\n')}`} onClick={() => track('order_quote_pilot_click')} className={primaryCls}>{T('Ask about the pilot', '查詢試點')} <ArrowRight size={14} /></a>
        <Link to="/pallet-height-calculator" className="ml-4 text-sm text-blue-700 font-semibold">{T('Prefer the 3D pallet view? Open the height calculator →', '想睇 3D 卡板?打開高度計算器 →')}</Link>
      </section>
    </div>
  );
}

function OrderOptionsPanel({ request, baseline, onUse }: { request: OrderQuoteRequest; baseline: OrderQuote; onUse: (option: OrderOptions['alternatives'][number]) => Promise<void> }) {
  const { lang } = useApp();
  const T = (en: string, zh: string) => lang === 'zh' ? zh : en;
  const [target, setTarget] = useState(Math.max(1, baseline.summary.palletCount - 1));
  const [adjustments, setAdjustments] = useState<NonNullable<OrderOptionsRequest['adjustments']>>([]);
  const [economics, setEconomics] = useState<NonNullable<OrderOptionsRequest['economics']>>({});
  const [result, setResult] = useState<OrderOptions | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const parsed = useMemo(() => parseQuoteRequest(request), [request]);
  const numeric = (s: string) => s === '' ? undefined : Number(s);
  const search = async () => {
    setBusy(true); setError(''); setResult(null); setOpen(null);
    try {
      const r = await findOrderOptions({ ...request, targetPalletCount: target, adjustments, economics });
      setResult(r); track('order_options_run', r.outcome);
    } catch (e) { setError(String((e as Error).message)); }
    finally { setBusy(false); }
  };
  const invalidate = () => { setResult(null); setOpen(null); };
  return <section data-testid="order-options" className="rounded-2xl border border-blue-200 bg-blue-50/30 p-5 mb-6 space-y-4">
    <h2 className="text-xl font-bold">{T('Avoid another pallet', '慳返下一板')}</h2>
    <p className="text-sm text-slate-600">{T('Try another build first. Quantities stay locked unless you permit a change below. Added units may fit without another pallet. Costs are supplied by you.', '先試其他砌法。除非你喺下面准許更改，否則數量鎖定。加貨可能唔使加板。費用由你提供。')}</p>
    <fieldset disabled={busy} className="space-y-3">
      <label className="block text-sm">{T('Target pallets', '目標板數')}<input data-testid="option-target" className={inputCls} type="number" min={1} max={20} value={target} onChange={e => { setTarget(+e.target.value); invalidate(); }} /></label>
      {parsed.items.map(it => {
        const a = adjustments.find(a => a.sku === it.sku);
        return <div key={it.sku} className="rounded-lg border p-3 space-y-2">
          <label className="font-semibold text-sm"><input type="checkbox" checked={!!a} onChange={e => { setAdjustments(old => e.target.checked ? [...old, { sku: it.sku, minQty: it.qty, maxQty: it.qty, qtyStep: 1 }] : old.filter(a => a.sku !== it.sku)); invalidate(); }} /> {it.sku} — {T('Adjustable', '可改數量')} ({it.qty})</label>
          {a && <div className="grid grid-cols-3 gap-2">{(['minQty', 'maxQty', 'qtyStep'] as const).map((key, i) => <label key={key} className="text-xs">{[T('Min quantity', '最少數量'), T('Max quantity', '最多數量'), T('Quantity step', '數量步幅')][i]}<input className={inputCls} type="number" min={key === 'qtyStep' ? 1 : 0} max={200} value={a[key]} onChange={e => { setAdjustments(old => old.map(v => v.sku === it.sku ? { ...v, [key]: +e.target.value } : v)); invalidate(); }} /></label>)}</div>}
          <div className="grid grid-cols-2 gap-2">{(['contributionPerUnit', 'deferralCostPerUnit'] as const).map((key, i) => <label key={key} className="text-xs">{[T('Contribution/unit (optional)', '每件貢獻利潤（選填）'), T('Deferral cost/unit (optional)', '每件延後出貨費（選填）')][i]}<input className={inputCls} type="number" min={0} step="any" value={economics[key]?.[it.sku] ?? ''} onChange={e => {
            const values = { ...economics[key] }; const value = numeric(e.target.value);
            if (value === undefined) delete values[it.sku]; else values[it.sku] = value;
            setEconomics(old => ({ ...old, [key]: values })); invalidate();
          }} /></label>)}</div>
        </div>;
      })}
      <div className="grid sm:grid-cols-3 gap-2">
        {(['palletFreight', 'handlingPerPallet'] as const).map((key, i) => <label key={key} className="text-xs">{[T('Freight/pallet (optional)', '每板運費（選填）'), T('Handling/pallet (optional)', '每板處理費（選填）')][i]}<input className={inputCls} type="number" min={0} step="any" value={economics[key] ?? ''} onChange={e => { setEconomics(old => ({ ...old, [key]: numeric(e.target.value) })); invalidate(); }} /></label>)}
        <label className="text-xs">{T('Currency (optional)', '貨幣（選填）')}<input className={inputCls} placeholder="USD" maxLength={3} value={economics.currency ?? ''} onChange={e => { setEconomics(old => ({ ...old, currency: e.target.value.toUpperCase() || undefined })); invalidate(); }} /></label>
      </div>
      <button className={primaryCls} onClick={() => void search()}>{busy ? T('Searching…', '搜尋中…') : T('Search options', '搜尋方案')}</button>
    </fieldset>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {result && <div className="space-y-3" aria-live="polite">
      <p className="font-semibold">{result.alternatives.length ? T(`Best option found within ${result.searched.candidates} candidates`, `喺 ${result.searched.candidates} 個候選入面搵到嘅最佳方案`) : T(`Searched ${result.searched.candidates} candidates`, `已搜尋 ${result.searched.candidates} 個候選`)}</p>
      {!result.alternatives.length && <p data-testid="option-none">{result.outcome === 'already_at_target' ? T('Already at target.', '已達目標。') : T('No option found within this search.', '今次搜尋搵唔到合適方案。')}</p>}
      <div className="flex flex-wrap gap-2">{result.checks.map(c => <span key={c.code} title={c.assumption} className="rounded bg-white border px-2 py-1 text-xs">{c.code}: {c.status}</span>)}</div>
      {result.alternatives.map(a => <article key={a.id} data-testid="option-card" className="rounded-xl border bg-white p-4 space-y-3">
        <h3 className="font-bold">{a.palletCount} {T('pallet(s)', '板')} · <span data-testid="option-carton-count">{a.quote.summary.cartonsPlaced}</span> {T('cartons', '箱')}</h3>
        <p className="text-xs text-slate-600">{a.strategy} · {a.palletCount <= result.target ? T('Target met', '達到目標') : T('Above target', '未達目標')}</p>
        {a.quantityChanges.length ? <table className="w-full text-sm"><thead><tr>{['SKU', T('From', '原數量'), T('To', '新數量'), T('Change', '變更')].map(h => <th className="text-left" key={h}>{h}</th>)}</tr></thead><tbody>{a.quantityChanges.map(c => <tr key={c.sku}><td>{c.sku}</td><td>{c.from}</td><td>{c.to}</td><td>{c.delta > 0 ? '+' : ''}{c.delta}</td></tr>)}</tbody></table> : <p>{T('Repack only — quantities unchanged.', '只改砌法，數量不變。')}</p>}
        <p>{a.economics.netSavings === null ? T('Add costs to compute', '加入費用先可以計算') : `${T('Net savings', '淨節省')}: ${a.economics.netSavings.toFixed(2)} ${economics.currency ?? ''}`}</p>
        <div className="flex flex-wrap gap-1">{[...a.quote.checks, ...a.quote.pallets.flatMap(p => p.checks)].map((c, i) => <span key={i} title={c.assumption} className={`rounded px-2 py-1 text-xs ${c.status === 'pass' ? 'bg-emerald-100' : c.status === 'warn' ? 'bg-amber-100' : 'bg-slate-100'}`}>{c.code}: {c.status}</span>)}</div>
        <div className="flex gap-2"><button className={btnCls} aria-expanded={open === a.id} onClick={() => setOpen(open === a.id ? null : a.id)}>{T('View build', '睇砌板步驟')}</button><button className={primaryCls} disabled={busy} onClick={async () => { setBusy(true); try { await onUse(a); } catch (e) { setError(String((e as Error).message)); } finally { setBusy(false); } }}>{T('Use this option', '用呢個方案')}</button></div>
        {open === a.id && a.quote.pallets.map(p => <div key={p.index} data-testid="option-pallet" data-carton-count={p.cartonCount}><h4 className="font-semibold">#{p.index + 1} · {p.cartonCount} {T('cartons', '箱')}</h4><PalletEstimateView countTestId="option-placed-count" zh={lang === 'zh'} result={{ boxes: p.boxes, pallet: parsed.pallet, loadedHeight: p.loadedHeight.cm }} /></div>)}
      </article>)}
      <p className="text-xs text-slate-600">{T('Screening against your supplied limits; this does not certify stability or receiver acceptance. An exhausted budget does not prove no better option exists.', '只按你提供嘅限制做篩查，唔代表穩定性或收貨方接受嘅認證。用盡搜尋額度唔代表冇更好方案。')}</p>
    </div>}
  </section>;
}
