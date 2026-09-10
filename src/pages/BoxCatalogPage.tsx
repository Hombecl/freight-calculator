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
    const input = 'block w-full border rounded p-2 my-2';
    return <main className="max-w-5xl mx-auto p-6 space-y-6">
    <Helmet><title>{T('Box catalog optimizer | DimPack3D', '紙箱目錄優化 | DimPack3D')}</title><meta name="description" content={T('Find a small box catalog for your order mix, compare DIM billing and preview a packed order.', '按訂單組合搵合適紙箱目錄，比較體積重收費並預覽裝箱。')}/></Helmet>
    <h1 className="text-3xl font-bold">{T('Box catalog optimizer', '紙箱目錄優化')}</h1>
    <section><h2>{T('1. SKUs — paste or upload', '1. 貨品 — 貼上或上載')}</h2><label>{T('Input units (all dimensions and weights)', '輸入單位（所有尺寸同重量）')}<select className={input} value={unit} onChange={e => setUnit(e.target.value as Units)}><option>cm-kg</option><option>in-lb</option></select></label>
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
    <section><h2>{T('2. Order history', '2. 訂單記錄')}</h2><p>{T('Rows: orderId,sku,qty. Identical order shapes are compressed with counts; the first order ID labels each shape.', '每行：orderId,sku,qty。相同貨品組合會合併計次數，並用第一張訂單編號標示。')}</p><textarea aria-label={T('Order history', '訂單記錄')} className={input} rows={4} value={history} onChange={e => setHistory(e.target.value)}/></section>
    <section><h2>{T('3. Boxes and billing', '3. 紙箱同收費')}</h2><p>{T('Optional box arrays: id,l,w,h,maxWeight?,cost?. Blank candidates generate a grid. Dimensions are usable internal dimensions; billing uses those same dimensions.', '可選紙箱陣列：id,l,w,h,maxWeight?,cost?。候選留空會自動產生。尺寸係可用內徑；收費估算亦用同一尺寸。')}</p>
      <label>{T('Current boxes (JSON, optional)', '現有紙箱（JSON，可選）')}<textarea className={input} value={current} onChange={e => setCurrent(e.target.value)}/></label>
      <label>{T('Candidate boxes (JSON, optional)', '候選紙箱（JSON，可選）')}<textarea className={input} value={candidates} onChange={e => setCandidates(e.target.value)}/></label>
      <label>{T('Catalog size', '目錄箱型數')}<input className={input} type="number" min={1} max={12} value={size} onChange={e => setSize(Number(e.target.value))}/></label>
      <label>{T('Divisor templates — verify with your buyer / carrier', '除數範本 — 請向買家／承運商核實')}<select className={input} defaultValue="express" onChange={e => { const p = DIM_PRESETS.find(p => p.key === e.target.value)!; setDivisor(p.divisor); setBillingUnit(p.system === 'metric' ? 'cm-kg' : 'in-lb'); }}>{DIM_PRESETS.map(p => <option key={p.key} value={p.key}>{p.label} · {p.divisor}</option>)}</select></label>
      <label>{T('Billing unit', '收費單位')}<select className={input} value={billingUnit} onChange={e => setBillingUnit(e.target.value as Units)}><option>cm-kg</option><option>in-lb</option></select></label>
      <label>{T('DIM divisor', '體積重除數')}<input className={input} type="number" value={divisor} onChange={e => setDivisor(Number(e.target.value))}/></label>
      {[[T('Rate per kg/lb (blank = no cost estimate)', '每 kg/lb 費率（留空唔估費用）'), rate, setRate], [T('Minimum billable kg/lb', '最低計費 kg/lb'), minimum, setMinimum], [T('Void fill cost per litre', '每公升填充費用'), voidCost, setVoidCost]].map(([label, value, set]) => <label key={String(label)}>{String(label)}<input className={input} type="number" min={0} value={String(value)} onChange={e => (set as (v: string) => void)(e.target.value)}/></label>)}
    </section>
    <details><summary>{T('Advanced', '進階')}</summary><label><input data-testid="box-coverage-first" type="checkbox" checked={coverageFirst} onChange={e => setCoverageFirst(e.target.checked)}/>{T('Prioritize order coverage (disable for analysis only)', '優先覆蓋訂單（停用只供分析）')}</label></details>
    <button data-testid="box-optimize" disabled={busy} className="bg-blue-700 text-white rounded px-4 py-2" onClick={run}>{T('Optimize catalog', '優化紙箱目錄')}</button>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {result && request && <section className="space-y-4"><h2>{T('Best option found', '搵到嘅最佳方案')}</h2>
      <p data-testid="box-unfit-share" role="status" className={result.totals.unfitOrders ? 'border border-red-600 bg-red-50 text-red-800 p-4 text-xl font-bold' : 'font-semibold'}>{result.unfitSharePct.toFixed(1)}{T('% of orders would need a box outside this catalog', '% 訂單需要用呢個目錄以外嘅紙箱')}</p>
      <table data-testid="box-catalog-table" className="w-full"><thead><tr>{[T('Box', '紙箱'), T('Dimensions cm / in', '尺寸 cm / in'), T('Share of orders', '訂單佔比')].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{result.catalog.map(b => <tr key={b.id}><td>{b.id}</td><td>{Object.values(b.dims.cm).map(n => n.toFixed(2)).join(' × ')} / {Object.values(b.dims.in).map(n => n.toFixed(2)).join(' × ')}</td><td>{b.sharePct.toFixed(1)}% ({b.usedByOrders})</td></tr>)}</tbody></table>
      <table className="w-full"><thead><tr><th>{T('Estimate', '估算')}</th><th>{T('Catalog', '新目錄')}</th><th>{T('Baseline', '現有')}</th></tr></thead><tbody>{[
                [T('Orders', '訂單數'), result.totals.orders, result.baseline?.orders], [T('Billed kg', '計費 kg'), result.totals.billedWeight.kg, result.baseline?.billedWeight.kg], [T('DIM penalty kg', '額外體積重 kg'), result.totals.dimPenaltyWeight.kg, result.baseline?.dimPenaltyWeight.kg], [T('Void litres', '空隙公升'), result.totals.voidLitres, result.baseline?.voidLitres], [T('Cost / 1,000 orders', '每千單費用'), result.totals.cost === undefined ? undefined : result.totals.cost / result.totals.orders * 1000, result.baseline?.cost === undefined ? undefined : result.baseline.cost / result.baseline.orders * 1000], [T('Unfit orders', '放唔落嘅訂單'), result.totals.unfitOrders, result.baseline?.unfitOrders]
            ].map(([label, a, b]) => <tr key={label}><td>{label}</td><td>{typeof a === 'number' ? a.toFixed(2) : '—'}</td><td>{typeof b === 'number' ? b.toFixed(2) : '—'}</td></tr>)}</tbody></table>
      {result.savings && <p>{T('Savings per 1,000 comparable orders', '每千張可比較訂單節省')}: {result.savings.costPer1000Orders?.toFixed(2) ?? '—'} · {result.savings.billedWeightPct.toFixed(2)}% {T('billed weight', '計費重量')} · {T('Basis orders', '比較訂單數')}: {result.savings.basisOrders} · {T('Excluded unfit orders', '已排除放唔落嘅訂單')}: {result.savings.excludedUnfit}{result.savings.partial && T(' · Partial comparison', ' · 部分訂單比較')}</p>}
      <label>{T('Filter order ID / SKU / box (unfit)', '篩選訂單／SKU／紙箱（unfit）')}<input className={input} value={filter} onChange={e => setFilter(e.target.value)}/></label>
      <table className="w-full"><thead><tr>{['Order / SKU', 'Count', 'Box', 'Billed kg / lb', 'Actual kg', 'DIM kg', 'Void L', 'Cost'].map((h, i) => <th key={h}>{T(h, ['訂單／SKU', '次數', '紙箱', '計費 kg / lb', '實重 kg', '體積重 kg', '空隙 L', '費用'][i])}</th>)}</tr></thead><tbody>{result.perOrder.filter(o => `${o.orderId} ${o.lines.map(l => l.sku)} ${o.boxId ?? 'unfit'}`.toLowerCase().includes(filter.toLowerCase())).map((o, i) => <tr key={i} className={o.unfit ? 'bg-red-100 text-red-800' : ''}><td>{o.orderId} / {o.lines.map(l => `${l.sku} × ${l.qty}`).join(', ')}</td><td>{o.count}</td><td>{o.boxId ?? T('Unfit — estimated charge only', '放唔落 — 只係估算費用')}</td><td>{o.billedWeight.kg.toFixed(2)} / {o.billedWeight.lb.toFixed(2)}</td><td>{o.actualWeight.kg.toFixed(2)}</td><td>{o.dimWeight.kg.toFixed(2)}</td><td>{o.voidLitres.toFixed(2)}</td><td>{o.cost?.toFixed(2) ?? '—'}</td></tr>)}</tbody></table>
      <p>{T('Search evaluations / budget', '搜尋評估／預算')}: {result.searched.combos} / {result.searched.budget}</p>
      {result.checks.map(c => <p key={c.code}>{c.code}: {c.status}</p>)}
      <div className="flex gap-4"><button onClick={() => download('catalog.csv', csv([['id', 'l_cm', 'w_cm', 'h_cm', 'l_in', 'w_in', 'h_in', 'orders', 'sharePct'], ...result.catalog.map(b => [b.id, b.l, b.w, b.h, ...Object.values(b.dims.in), b.usedByOrders, b.sharePct])]))}>{T('Catalog CSV', '目錄 CSV')}</button><button onClick={() => download('per-order.csv', csv([['orderId', 'count', 'boxId', 'unfit', 'billed_kg', 'billed_lb', 'actual_kg', 'dim_kg', 'voidLitres', 'cost'], ...result.perOrder.map(o => [o.orderId, o.count, o.boxId, o.unfit, o.billedWeight.kg, o.billedWeight.lb, o.actualWeight.kg, o.dimWeight.kg, o.voidLitres, o.cost])]))}>{T('Per-order CSV', '訂單 CSV')}</button><button onClick={() => download('box-request.json', JSON.stringify(request, null, 2))}>{T('Request JSON', '請求 JSON')}</button></div>
      <pre className="overflow-auto">{`curl https://www.dimpack3d.com/api/box-catalog -H 'Content-Type: application/json' --data-binary @box-request.json`}</pre>
      <h2>{T('Which box for this order?', '呢張訂單用邊個箱？')}</h2><label>sku,qty<textarea className={input} value={single} onChange={e => setSingle(e.target.value)}/></label><button data-testid="box-choose" onClick={pick}>{T('Choose box', '揀紙箱')}</button>
      {picked && (picked.box ? <><p>{picked.boxId} · {T('Placed units', '已放件數')}: {picked.plan.boxes.length}</p><InteractiveLoadPlanner key={picked.inputHash} container={picked.box} boxes={picked.plan.boxes} readOnly showDoor={false} placedCountTestId="box-placed-count"/></> : <p role="status">{T('No box fits this complete order.', '冇紙箱放得落成張訂單。')}</p>)}
    </section>}
    <aside className="bg-amber-50 border rounded p-4">{T('Heuristic estimate, not an optimum. No cushioning/dunnage model. Fragile means zero top-load weight; upright preserves height. Divisor and rates are yours: verify with your buyer/carrier. Unfit orders remain counted and charged at the largest candidate as estimates only; savings exclude orders unfit in either catalog. No carrier rounding, box tare or outer-wall allowance. Paccurate and Packsize exist for enterprise workflows.', '呢個係啟發式估算，唔保證最優。冇緩衝／墊料模型。易碎表示頂部承重為零；直立會保持高度。除數同費率由你提供，請向買家／承運商核實。放唔落嘅訂單仍會計數，並按最大候選箱估費，只作估算；任何一個目錄放唔落嘅訂單都唔計入節省。冇計承運商進位、空箱重量或箱壁厚度。企業流程可考慮 Paccurate 同 Packsize。')}</aside>
  </main>;
}
