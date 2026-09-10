import { Link } from 'react-router-dom';
import { importHistory } from '../lib/boxCatalogImport';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useApp } from '../context/AppContext';
import InteractiveLoadPlanner from '../components/InteractiveLoadPlanner';
import { BOX_EXAMPLE, chooseBox, optimizeBoxCatalog, type BoxCatalogRequest, type BoxCatalogResult, type Units } from '../lib/boxCatalog';
import { parseDelimited, parseFile, parseText, type ImportResult } from '../lib/importCartons';
import { DIM_PRESETS } from '../lib/dimPresets';
import { track } from '../lib/track';
const csv = (rows: unknown[][]) => rows.map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
function download(name: string, text: string) { const url = URL.createObjectURL(new Blob([text], { type: name.endsWith('.json') ? 'application/json' : 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }
const inputCls = 'w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const btnCls = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-40';
const primaryCls = 'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 text-sm font-bold disabled:opacity-50';

export default function BoxCatalogPage() {
    const { lang } = useApp();
    const T = (en: string, zh: string) => lang === 'zh' ? zh : en;
    const [skuText, setSkuText] = useState('sku,length,width,height,weight,qty,fragile,upright\nA,10,10,10,0.2,1,no,no');
    const [history, setHistory] = useState('orderId,sku,qty\none,A,1\ntwo,A,2');
    const [current, setCurrent] = useState(JSON.stringify(BOX_EXAMPLE.currentBoxes));
    const [candidates, setCandidates] = useState(JSON.stringify(BOX_EXAMPLE.candidateBoxes));
    const [unit, setUnit] = useState<Units>('cm-kg');
    const [billingUnit, setBillingUnit] = useState<Units>('cm-kg');
    const [size, setSize] = useState(2), [divisor, setDivisor] = useState(5000), [rate, setRate] = useState('2'), [minimum, setMinimum] = useState('0'), [voidCost, setVoidCost] = useState('0');
    const [coverageFirst, setCoverageFirst] = useState(true);
    const [result, setResult] = useState<BoxCatalogResult>();
    const [request, setRequest] = useState<BoxCatalogRequest>();
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [filter, setFilter] = useState('');
    const [single, setSingle] = useState('A,2');
    const [picked, setPicked] = useState<Awaited<ReturnType<typeof chooseBox>>>();
    useEffect(() => { track('tool_box_catalog'); }, []);
    function imported(r: ImportResult) { if (r.warnings.some(w => /skipped|No usable|No rows/.test(w)))
        throw new Error(r.warnings.join('; ')); return r.specs.map(s => ({ sku: s.label, l: s.l, w: s.w, h: s.h, weight: s.weight, fragile: s.maxStack === 0, keepUpright: s.keepUpright ?? false })); }
    async function run() { setBusy(true); setError(''); setPicked(undefined); setResult(undefined); try {
        const req: BoxCatalogRequest = { units: unit, skus: imported(parseText(skuText)), orders: importHistory(history), ...(current.trim() ? { currentBoxes: JSON.parse(current) } : {}), ...(candidates.trim() ? { candidateBoxes: JSON.parse(candidates) } : {}), catalogSize: size, coverageFirst, billing: { unit: billingUnit, dimDivisor: divisor, minBillableWeight: Number(minimum), ...(rate.trim() ? { ratePerKgOrLb: Number(rate) } : {}) }, voidFillCostPerLitre: Number(voidCost) };
        const r = await optimizeBoxCatalog(req);
        setRequest(req);
        setResult(r);
        track('box_catalog_run', `candidates=${r.searched.candidates};unfit=${r.totals.unfitOrders}`);
    }
    catch (e) {
        setError(String(e));
    }
    finally {
        setBusy(false);
    } }
    async function pick() { if (!request || !result)
        return; setError(''); setPicked(undefined); try {
        const lines = parseDelimited(single).map(r => { if (r.length !== 2)
            throw new Error('sku,qty required'); return { sku: r[0], qty: Number(r[1]) }; });
        const L = request.units === 'in-lb' ? 2.54 : 1, W = request.units === 'in-lb' ? .45359237 : 1;
        setPicked(await chooseBox({ ...request, lines }, result.catalog.map(b => ({ ...b, l: b.l / L, w: b.w / L, h: b.h / L, ...(b.maxWeight === undefined ? {} : { maxWeight: b.maxWeight / W }) }))));
    }
    catch (e) {
        setError(String(e));
    } }
    const input = `${inputCls} block my-2`;
    return <main className="[&_input[type=file]]:max-w-full [&_fieldset]:min-w-0 break-words max-w-6xl mx-auto px-4 py-8 space-y-6">
    <Helmet><title>{T('Box catalog optimizer | DimPack3D', '紙箱目錄優化 | DimPack3D')}</title><meta name="description" content={T('Find a small box catalog for your order mix, compare DIM billing and preview a packed order.', '按訂單組合搵合適紙箱目錄，比較體積重收費並預覽裝箱。')}/></Helmet>
    <h1 className="text-3xl font-black text-slate-900">{T('Box catalog optimizer', '紙箱目錄優化')}</h1>
    <p className="text-slate-600 max-w-3xl">{T('Compare a small box catalog for your order mix, estimate billing and preview how a single order fits.', '按訂單組合比較精簡紙箱目錄、估算收費，再預覽單張訂單點樣裝箱。')}</p>
    <p className="text-xs text-slate-500">{T('Limits: 300 SKUs, 500 order shapes, 40 candidate boxes; 60 units and 10 distinct SKUs per order.', '上限：300 款貨品、500 種訂單組合、40 個候選箱；每單 60 件、10 款貨品。')}</p>
    <div className="grid lg:grid-cols-2 gap-6 items-start">
    <section className="min-w-0 rounded-2xl border border-slate-200 p-5 space-y-3"><h2 className="font-black text-slate-900">{T('1. SKUs — paste or upload', '1. 貨品 — 貼上或上載')}</h2><label>{T('Input units (all dimensions and weights)', '輸入單位（所有尺寸同重量）')}<select className={input} value={unit} onChange={e => setUnit(e.target.value as Units)}><option>cm-kg</option><option>in-lb</option></select></label>
      <label>{T('SKU CSV: sku,length,width,height,weight,qty,fragile,upright', 'SKU CSV：sku,length,width,height,weight,qty,fragile,upright')}<textarea className={input} rows={4} value={skuText} onChange={e => setSkuText(e.target.value)}/></label>
      <input aria-label={T('Upload SKUs', '上載貨品')} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" onChange={async (e) => { const f = e.target.files?.[0]; if (!f)
        return; try {
        const s = imported(await parseFile(f));
        setSkuText(csv([['sku', 'length', 'width', 'height', 'weight', 'qty', 'fragile', 'upright'], ...s.map(s => [s.sku, s.l, s.w, s.h, s.weight, 1, s.fragile, s.keepUpright])]));
    }
    catch (e) {
        setError(String(e));
    } }}/>
    </section>
    <section className="min-w-0 rounded-2xl border border-slate-200 p-5 space-y-3"><h2 className="font-black text-slate-900">{T('2. Order history', '2. 訂單記錄')}</h2><p>{T('Rows: orderId,sku,qty. Identical order shapes are compressed with counts; the first order ID labels each shape.', '每行：orderId,sku,qty。相同貨品組合會合併計次數，並用第一張訂單編號標示。')}</p><textarea aria-label={T('Order history', '訂單記錄')} className={input} rows={4} value={history} onChange={e => setHistory(e.target.value)}/></section>
    </div>
    <section className="min-w-0 rounded-2xl border border-slate-200 p-5 space-y-3"><h2 className="font-black text-slate-900">{T('3. Boxes and billing', '3. 紙箱同收費')}</h2><p>{T('Optional box arrays: id,l,w,h,maxWeight?,cost?. Blank candidates generate a grid. Dimensions are usable internal dimensions; billing uses those same dimensions.', '可選紙箱陣列：id,l,w,h,maxWeight?,cost?。候選留空會自動產生。尺寸係可用內徑；收費估算亦用同一尺寸。')}</p>
      <label>{T('Current boxes (JSON, optional)', '現有紙箱（JSON，可選）')}<textarea className={input} value={current} onChange={e => setCurrent(e.target.value)}/></label>
      <label>{T('Candidate boxes (JSON, optional)', '候選紙箱（JSON，可選）')}<textarea className={input} value={candidates} onChange={e => setCandidates(e.target.value)}/></label>
      <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2"><label>{T('Catalog size', '目錄箱型數')}<input className={input} type="number" min={1} max={12} value={size} onChange={e => setSize(Number(e.target.value))}/></label>
      <label>{T('Divisor templates — verify with your buyer / carrier', '除數範本 — 請向買家／承運商核實')}<select className={input} defaultValue="express" onChange={e => { const p = DIM_PRESETS.find(p => p.key === e.target.value)!; setDivisor(p.divisor); setBillingUnit(p.system === 'metric' ? 'cm-kg' : 'in-lb'); }}>{DIM_PRESETS.map(p => <option key={p.key} value={p.key}>{p.label} · {p.divisor}</option>)}</select></label>
      <label>{T('Billing unit', '收費單位')}<select className={input} value={billingUnit} onChange={e => setBillingUnit(e.target.value as Units)}><option>cm-kg</option><option>in-lb</option></select></label>
      <label>{T('DIM divisor', '體積重除數')}<input className={input} type="number" value={divisor} onChange={e => setDivisor(Number(e.target.value))}/></label>
      {[[T('Rate per kg/lb (blank = no cost estimate)', '每 kg/lb 費率（留空唔估費用）'), rate, setRate], [T('Minimum billable kg/lb', '最低計費 kg/lb'), minimum, setMinimum], [T('Void fill cost per litre', '每公升填充費用'), voidCost, setVoidCost]].map(([label, value, set]) => <label key={String(label)}>{String(label)}<input className={input} type="number" min={0} value={String(value)} onChange={e => (set as (v: string) => void)(e.target.value)}/></label>)}
      </div>
    </section>
    <details className="rounded-xl border border-slate-200 p-4 text-sm"><summary>{T('Advanced', '進階')}</summary><label><input data-testid="box-coverage-first" type="checkbox" checked={coverageFirst} onChange={e => setCoverageFirst(e.target.checked)}/>{T('Prioritize order coverage (disable for analysis only)', '優先覆蓋訂單（停用只供分析）')}</label></details>
    <button data-testid="box-optimize" disabled={busy} className={primaryCls} onClick={run}>{T('Optimize catalog', '優化紙箱目錄')}</button>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {result && request && <section className="space-y-4"><h2 className="font-black text-slate-900 text-2xl">{T('Best option found', '搵到嘅最佳方案')}</h2>
      <p data-testid="box-unfit-share" role="status" className={result.totals.unfitOrders ? 'rounded-2xl border-2 border-red-300 bg-red-50 text-red-800 p-5 font-bold' : 'rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 font-bold text-emerald-800'}><span className="mb-2 block w-fit rounded-full bg-white px-2 py-1 text-xs font-black uppercase">{result.totals.unfitOrders ? T('Needs review', '需要核對') : T('All orders fit', '所有訂單放得落')}</span>{result.unfitSharePct.toFixed(1)}{T('% of orders would need a box outside this catalog', '% 訂單需要用呢個目錄以外嘅紙箱')}</p>
      <div className="rounded-2xl border border-slate-200 p-5 overflow-x-auto"><h3 className="font-black text-slate-900 mb-3">{T('Recommended catalog', '建議目錄')}</h3><table data-testid="box-catalog-table" className="w-full text-sm border-collapse"><thead className="text-left text-slate-500 border-b border-slate-200"><tr>{[T('Box', '紙箱'), T('Dimensions cm / in', '尺寸 cm / in'), T('Share of orders', '訂單佔比')].map(h => <th key={h} className="py-2 pr-3 font-semibold whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{result.catalog.map(b => <tr key={b.id}><td className="py-3 pr-3 border-b border-slate-100">{b.id}</td><td className="py-3 pr-3 border-b border-slate-100">{Object.values(b.dims.cm).map(n => n.toFixed(2)).join(' × ')} / {Object.values(b.dims.in).map(n => n.toFixed(2)).join(' × ')}</td><td className="py-3 pr-3 border-b border-slate-100">{b.sharePct.toFixed(1)}% ({b.usedByOrders})</td></tr>)}</tbody></table></div>
      <div className="rounded-2xl border border-slate-200 p-5 overflow-x-auto"><h3 className="font-black text-slate-900 mb-3">{T('Totals vs baseline', '總計同現有目錄比較')}</h3><table className="w-full text-sm border-collapse"><thead className="text-left text-slate-500 border-b border-slate-200"><tr><th className="py-2 pr-3 font-semibold">{T('Estimate', '估算')}</th><th className="py-2 pr-3 font-semibold">{T('Catalog', '新目錄')}</th>{result.baseline && <th className="py-2 pr-3 font-semibold">{T('Baseline', '現有')}</th>}</tr></thead><tbody>{[
                [T('Orders', '訂單數'), result.totals.orders, result.baseline?.orders], [T('Billed kg', '計費 kg'), result.totals.billedWeight.kg, result.baseline?.billedWeight.kg], [T('DIM penalty kg', '額外體積重 kg'), result.totals.dimPenaltyWeight.kg, result.baseline?.dimPenaltyWeight.kg], [T('Void litres', '空隙公升'), result.totals.voidLitres, result.baseline?.voidLitres], [T('Cost / 1,000 orders', '每千單費用'), result.totals.cost === undefined ? undefined : result.totals.cost / result.totals.orders * 1000, result.baseline?.cost === undefined ? undefined : result.baseline.cost / result.baseline.orders * 1000], [T('Unfit orders', '放唔落嘅訂單'), result.totals.unfitOrders, result.baseline?.unfitOrders]
            ].map(([label, a, b]) => <tr key={label}><td className="py-3 pr-3 border-b border-slate-100">{label}</td><td className="py-3 pr-3 border-b border-slate-100">{typeof a === 'number' ? a.toFixed(2) : '—'}</td>{result.baseline && <td className="py-3 pr-3 border-b border-slate-100">{typeof b === 'number' ? b.toFixed(2) : '—'}</td>}</tr>)}</tbody></table></div>
      {result.savings && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{T('Savings per 1,000 comparable orders', '每千張可比較訂單節省')}: {result.savings.costPer1000Orders?.toFixed(2) ?? '—'} · {result.savings.billedWeightPct.toFixed(2)}% {T('billed weight', '計費重量')} · {T('Basis orders', '比較訂單數')}: {result.savings.basisOrders} · {T('Excluded unfit orders', '已排除放唔落嘅訂單')}: {result.savings.excludedUnfit}{result.savings.partial && T(' · Partial comparison', ' · 部分訂單比較')}</p>}
      <div className="min-w-0 rounded-2xl border border-slate-200 p-5"><h3 className="font-black text-slate-900 mb-3">{T('Per-order estimates', '逐單估算')}</h3><label>{T('Filter order ID / SKU / box (unfit)', '篩選訂單／SKU／紙箱（unfit）')}<input className={input} value={filter} onChange={e => setFilter(e.target.value)}/></label>
      <div className="overflow-x-auto"><table className="w-full text-sm border-collapse"><thead className="text-left text-slate-500 border-b border-slate-200"><tr>{['Order / SKU', 'Count', 'Box', 'Billed kg / lb', 'Actual kg', 'DIM kg', 'Void L', 'Cost'].map((h, i) => <th key={h} className="py-2 pr-3 font-semibold whitespace-nowrap">{T(h, ['訂單／SKU', '次數', '紙箱', '計費 kg / lb', '實重 kg', '體積重 kg', '空隙 L', '費用'][i])}</th>)}</tr></thead><tbody>{result.perOrder.filter(o => `${o.orderId} ${o.lines.map(l => l.sku)} ${o.boxId ?? 'unfit'}`.toLowerCase().includes(filter.toLowerCase())).map((o, i) => <tr key={i} className={o.unfit ? 'bg-red-100 text-red-800' : ''}><td className="py-3 pr-3 border-b border-slate-100">{o.orderId} / {o.lines.map(l => `${l.sku} × ${l.qty}`).join(', ')}</td><td className="py-3 pr-3 border-b border-slate-100">{o.count}</td><td className="py-3 pr-3 border-b border-slate-100">{o.boxId ?? T('Unfit — estimated charge only', '放唔落 — 只係估算費用')}</td><td className="py-3 pr-3 border-b border-slate-100">{o.billedWeight.kg.toFixed(2)} / {o.billedWeight.lb.toFixed(2)}</td><td className="py-3 pr-3 border-b border-slate-100">{o.actualWeight.kg.toFixed(2)}</td><td className="py-3 pr-3 border-b border-slate-100">{o.dimWeight.kg.toFixed(2)}</td><td className="py-3 pr-3 border-b border-slate-100">{o.voidLitres.toFixed(2)}</td><td className="py-3 pr-3 border-b border-slate-100">{o.cost?.toFixed(2) ?? '—'}</td></tr>)}</tbody></table></div>
      </div>
      <p className="text-xs text-slate-500">{T('Search evaluations / budget', '搜尋評估／預算')}: {result.searched.combos} / {result.searched.budget}</p>
      <div className="flex flex-wrap gap-2">{result.checks.map(c => <span key={c.code} title={c.assumption} className={`rounded-full px-2 py-1 text-xs font-semibold ${c.status === 'pass' ? 'bg-emerald-100 text-emerald-800' : c.status === 'fail' ? 'bg-red-100 text-red-800' : c.status === 'warn' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{c.code}: {T(c.status, {pass:'通過',fail:'未通過',warn:'留意',not_evaluated:'未評估'}[c.status])}</span>)}</div>
      <div className="flex flex-wrap gap-3"><button className={btnCls} onClick={() => download('catalog.csv', csv([['id', 'l_cm', 'w_cm', 'h_cm', 'l_in', 'w_in', 'h_in', 'orders', 'sharePct'], ...result.catalog.map(b => [b.id, b.l, b.w, b.h, ...Object.values(b.dims.in), b.usedByOrders, b.sharePct])]))}>{T('Catalog CSV', '目錄 CSV')}</button><button className={btnCls} onClick={() => download('per-order.csv', csv([['orderId', 'count', 'boxId', 'unfit', 'billed_kg', 'billed_lb', 'actual_kg', 'dim_kg', 'voidLitres', 'cost'], ...result.perOrder.map(o => [o.orderId, o.count, o.boxId, o.unfit, o.billedWeight.kg, o.billedWeight.lb, o.actualWeight.kg, o.dimWeight.kg, o.voidLitres, o.cost])]))}>{T('Per-order CSV', '訂單 CSV')}</button><button className={btnCls} onClick={() => download('box-request.json', JSON.stringify(request, null, 2))}>{T('Request JSON', '請求 JSON')}</button></div>
      <pre className="overflow-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{`curl https://www.dimpack3d.com/api/box-catalog -H 'Content-Type: application/json' --data-binary @box-request.json`}</pre>
      <section className="rounded-2xl border border-slate-200 p-5"><h2 className="font-black text-slate-900 mb-4">{T('Which box for this order?', '呢張訂單用邊個箱？')}</h2><div className="grid lg:grid-cols-2 gap-6 items-start"><div className="min-w-0"><label>sku,qty<textarea className={input} value={single} onChange={e => setSingle(e.target.value)}/></label><button className={primaryCls} data-testid="box-choose" onClick={pick}>{T('Choose box', '揀紙箱')}</button></div><div className="min-w-0">
      {picked && (picked.box ? <><p>{picked.boxId} · {T('Placed units', '已放件數')}: {picked.plan.boxes.length}</p><InteractiveLoadPlanner key={picked.inputHash} container={picked.box} boxes={picked.plan.boxes} readOnly showDoor={false} placedCountTestId="box-placed-count"/></> : <p role="status">{T('No box fits this complete order.', '冇紙箱放得落成張訂單。')}</p>)}
      </div></div></section>
    </section>}
    <aside className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{T('Heuristic estimate, not an optimum. No cushioning/dunnage model. Fragile means zero top-load weight; upright preserves height. Divisor and rates are yours: verify with your buyer/carrier. Unfit orders remain counted and charged at the largest candidate as estimates only; savings exclude orders unfit in either catalog. No carrier rounding, box tare or outer-wall allowance. Paccurate and Packsize exist for enterprise workflows.', '呢個係啟發式估算，唔保證最優。冇緩衝／墊料模型。易碎表示頂部承重為零；直立會保持高度。除數同費率由你提供，請向買家／承運商核實。放唔落嘅訂單仍會計數，並按最大候選箱估費，只作估算；任何一個目錄放唔落嘅訂單都唔計入節省。冇計承運商進位、空箱重量或箱壁厚度。企業流程可考慮 Paccurate 同 Packsize。')}</aside>
    <nav aria-label={T('Related tools', '相關工具')} className="flex flex-wrap gap-3 border-t border-slate-200 pt-5 print:hidden">
      <Link className={btnCls} to={lang === 'zh' ? '/zh/order-quote' : '/order-quote'}>{T('Order → pallet quote', '訂單 → 卡板報價')} →</Link>
      <Link className={btnCls} to={lang === 'zh' ? '/zh/case-designer' : '/case-designer'}>{T('Case designer', '裝箱設計')} →</Link>
      <Link className={btnCls} to={lang === 'zh' ? '/zh/consolidation' : '/consolidation'}>{T('Consolidation', '併櫃規劃')} →</Link>
      <Link className={btnCls} to={lang === 'zh' ? '/zh/receiver-profiles' : '/receiver-profiles'}>{T('Receiver profiles', '收貨方設定')} →</Link>
      <Link className={btnCls} to={lang === 'zh' ? '/zh/build-sheet' : '/build-sheet'}>{T('Crew build sheet', '倉務砌板單')} →</Link>
    </nav>
  </main>;
}
