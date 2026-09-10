import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useApp } from '../context/AppContext';
import { consolidate, CONSOLIDATION_EXAMPLE, type ConsolidationRequest, type ConsolidationResult, type ConsolidationContainer } from '../lib/consolidation';
import { parseText, parseFile, type ImportResult } from '../lib/importCartons';
import { downloadText, toPackingCSV } from '../lib/exportPlan';
import { CONTAINER_PRESETS, type Check } from '../lib/packChecks';
import InteractiveLoadPlanner from '../components/InteractiveLoadPlanner';
import { track } from '../lib/track';

const inputClass = 'border rounded px-2 py-1 w-full bg-white';
const buttonClass = 'border rounded px-3 py-2 bg-white hover:bg-blue-50 disabled:opacity-50';
export default function ConsolidationPage() {
  const { lang } = useApp();
  const T = (en: string, zh: string) => lang === 'zh' ? zh : en;
  const [request, setRequest] = useState<ConsolidationRequest>(() => structuredClone(CONSOLIDATION_EXAMPLE));
  const [result, setResult] = useState<ConsolidationResult>();
  const [ranRequest, setRanRequest] = useState<ConsolidationRequest>();
  const [selected, setSelected] = useState<ConsolidationContainer>();
  const [paste, setPaste] = useState<Record<number, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { track('tool_consolidation'); }, []);
  const edit = (next: ConsolidationRequest) => { setRequest(next); setResult(undefined); setSelected(undefined); setRanRequest(undefined); };
  const updatePo = (i: number, changes: Partial<ConsolidationRequest['pos'][number]>) => edit({ ...request, pos: request.pos.map((p, j) => j === i ? { ...p, ...changes } : p) });
  const imported = (i: number, data: ImportResult) => {
    // The shared importer can skip malformed rows; make that visible and require
    // correction rather than replacing cargo with a silently shortened list.
    if (data.warnings.length) { setMessage(T('Import needs review: ', '匯入需要核對：') + data.warnings.join('; ')); return; }
    updatePo(i, { items: data.specs.map(s => ({ sku: s.label, label: s.label, l: s.l, w: s.w, h: s.h, qty: s.qty, weight: s.weight, keepUpright: s.keepUpright, maxStack: s.maxStack })) });
    setMessage(T('Rows imported in the selected units.', '已按所選單位匯入。'));
  };
  const run = async () => {
    setBusy(true); setMessage(''); setSelected(undefined);
    try { const r = await consolidate(request); setResult(r); setRanRequest(structuredClone(request)); track('consolidation_run', r.outcome); }
    catch (e) { setResult(undefined); setMessage(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  const json = (name: string, value: unknown) => downloadText(name, JSON.stringify(value, null, 2), 'application/json');
  const badges = (checks: Check[]) => <div className="flex flex-wrap gap-2 my-2">{checks.map(c => <span key={c.code} title={c.assumption} className={`text-xs border rounded px-2 py-1 ${c.status === 'fail' ? 'bg-red-50' : c.status === 'warn' ? 'bg-amber-50' : 'bg-slate-50'}`}>{c.code}: {T(c.status, ({ pass: '通過', fail: '未通過', warn: '留意', not_evaluated: '未評估' })[c.status])}<span className="sr-only"> {c.assumption}</span></span>)}</div>;
  return <main className="max-w-6xl mx-auto p-4 space-y-5">
    <Helmet><title>{T('PO container consolidation estimate | DimPack3D', '多訂單併櫃估算 | DimPack3D')}</title><meta name="description" content={T('Compare container mixes for multiple purchase orders with 3D loads, shipment windows and your FCL/LCL quotes.', '比較多張訂單嘅併櫃方案、3D 擺位、出貨時間窗同你提供嘅整櫃／散貨報價。')} /></Helmet>
    <h1 className="text-3xl font-bold">{T('Multi-PO container consolidation', '多訂單併櫃規劃')}</h1>
    <p>{T('Same origin region, one destination. Compare the best options found before booking.', '同一出發地區、同一目的地。訂艙前比較搵到嘅最佳方案。')}</p>
    <label>{T('Input units (including imported rows)', '輸入單位（包括匯入資料）')}<select className={inputClass} value={request.units ?? 'cm-kg'} onChange={e => {
      const next = e.target.value as 'cm-kg' | 'in-lb', L = next === 'in-lb' ? 1 / 2.54 : 2.54, W = next === 'in-lb' ? 1 / .45359237 : .45359237;
      edit({ ...request, units: next, pos: request.pos.map(p => ({ ...p, items: p.items.map(it => ({ ...it, l: it.l * L, w: it.w * L, h: it.h * L, weight: it.weight * W, ...(it.maxStack === undefined ? {} : { maxStack: it.maxStack * W }) })) })) });
    }}><option value="cm-kg">cm / kg</option><option value="in-lb">in / lb</option></select></label>
    <div className="overflow-x-auto"><table className="w-full"><thead><tr>{[T('PO', '訂單'), T('Supplier', '供應商'), T('Ready date', '備妥日期'), T('Priority (1 first)', '優先（1 先行）'), T('Carton rows', '紙箱資料')].map(x => <th key={x} className="p-2 text-left">{x}</th>)}</tr></thead><tbody>{request.pos.map((po, i) => <tr key={i} className="border-b align-top">
      <td className="p-2"><input aria-label={T(`PO ${i + 1}`, `訂單 ${i + 1}`)} className={inputClass} value={po.poId} onChange={e => updatePo(i, { poId: e.target.value })} /><button className={buttonClass} onClick={() => edit({ ...request, pos: request.pos.filter((_, j) => j !== i) })}>{T('Remove', '移除')}</button></td>
      <td className="p-2"><input aria-label={T(`Supplier ${i + 1}`, `供應商 ${i + 1}`)} className={inputClass} value={po.supplier ?? ''} onChange={e => updatePo(i, { supplier: e.target.value || undefined })} /></td>
      <td className="p-2"><input aria-label={T(`Ready date ${i + 1}`, `備妥日期 ${i + 1}`)} className={inputClass} type="date" value={po.readyDate ?? ''} onChange={e => updatePo(i, { readyDate: e.target.value || undefined })} /></td>
      <td className="p-2"><input aria-label={T(`Priority ${i + 1}`, `優先 ${i + 1}`)} className={inputClass} type="number" min="1" value={po.priority ?? 2} onChange={e => updatePo(i, { priority: Number(e.target.value) })} /></td>
      <td className="p-2 min-w-80"><p>{po.items.reduce((s, it) => s + it.qty, 0)} {T('cartons', '箱')}</p>
        {po.items.map((it, j) => <fieldset key={j} className="grid grid-cols-3 gap-1 border p-2 my-1"><legend>{it.sku ?? it.label ?? j + 1}</legend>{(['l', 'w', 'h', 'qty', 'weight', 'maxStack'] as const).map(k => <label key={k} className="text-xs">{T(({ l: 'Length', w: 'Width', h: 'Height', qty: 'Quantity', weight: 'Weight', maxStack: 'Max on top' })[k], ({ l: '長', w: '闊', h: '高', qty: '數量', weight: '重量', maxStack: '頂部承重' })[k])}<input className={inputClass} type="number" value={it[k] ?? ''} onChange={e => updatePo(i, { items: po.items.map((x, n) => n === j ? { ...x, [k]: e.target.value === '' && k === 'maxStack' ? undefined : Number(e.target.value) } : x) })} /></label>)}{(['keepUpright', 'fragile'] as const).map(k => <label key={k} className="text-xs"><input type="checkbox" checked={it[k] ?? (k === 'keepUpright')} onChange={e => updatePo(i, { items: po.items.map((x, n) => n === j ? { ...x, [k]: e.target.checked } : x) })} />{k === 'fragile' ? T('Fragile', '易碎') : T('Upright', '直立')}</label>)}</fieldset>)}
        <textarea aria-label={T(`Paste cartons ${i + 1}`, `貼上紙箱 ${i + 1}`)} className={inputClass} placeholder="sku,length,width,height,weight,qty" value={paste[i] ?? ''} onChange={e => setPaste({ ...paste, [i]: e.target.value })} />
        <button className={buttonClass} onClick={() => imported(i, parseText(paste[i] ?? ''))}>{T('Import pasted rows', '匯入貼上資料')}</button>
        <label className="block text-sm">{T('Upload CSV / Excel (headers required)', '上載 CSV / Excel（需要欄名）')}<input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" onChange={async e => { const f = e.target.files?.[0]; if (f) try { imported(i, await parseFile(f)); } catch (err) { setMessage(String(err)); } e.target.value = ''; }} /></label>
      </td></tr>)}</tbody></table></div>
    <button className={buttonClass} disabled={request.pos.length >= 30} onClick={() => edit({ ...request, pos: [...request.pos, { poId: `PO-${request.pos.length + 1}`, items: [{ sku: 'A', l: 60, w: 40, h: 40, qty: 1, weight: 10 }] }] })}>{T('Add PO', '新增訂單')}</button>
    <div className="grid sm:grid-cols-2 gap-3">{(['from', 'to'] as const).map(k => <label key={k}>{k === 'from' ? T('Window from (inclusive)', '時間窗由（包含）') : T('Window to (inclusive)', '時間窗至（包含）')}<input className={inputClass} type="date" value={request.window?.[k] ?? ''} onChange={e => edit({ ...request, window: { ...request.window, [k]: e.target.value || undefined } })} /></label>)}</div>
    <fieldset className="border p-4 space-y-2"><legend>{T('Allowed containers and your quotes (one currency)', '允許櫃型同你嘅報價（同一貨幣）')}</legend>{(['20gp', '40gp', '40hq'] as const).map(preset => {
      const c = request.containers.find(c => c.preset === preset);
      return <div key={preset} className="grid grid-cols-3 gap-3"><label><input type="checkbox" checked={!!c} onChange={e => edit({ ...request, containers: e.target.checked ? [...request.containers, { preset, maxCount: 1 }] : request.containers.filter(c => c.preset !== preset) })} /> {preset.toUpperCase()}</label>{(['maxCount', 'ratePerContainer'] as const).map(k => <label key={k}>{k === 'maxCount' ? T('Max count', '最多櫃數') : T('Rate / container', '每櫃報價')}<input type="number" min="0" className={inputClass} disabled={!c} value={c?.[k] ?? ''} onChange={e => edit({ ...request, containers: request.containers.map(c => c.preset === preset ? { ...c, [k]: e.target.value === '' ? undefined : Number(e.target.value) } : c) })} /></label>)}</div>;
    })}</fieldset>
    <div className="grid sm:grid-cols-3 gap-3">{(['ratePerCbm', 'minCbm'] as const).map(k => <label key={k}>{k === 'ratePerCbm' ? T('LCL rate / CBM (optional)', '散貨每 CBM 報價（可選）') : T('LCL minimum CBM', '散貨最低 CBM')}<input className={inputClass} type="number" min="0" value={request.lcl?.[k] ?? ''} onChange={e => edit({ ...request, lcl: { ...request.lcl, [k]: e.target.value === '' ? undefined : Number(e.target.value) } })} /></label>)}<label>{T('Packing run budget (1–120)', '砌櫃次數上限（1–120）')}<input className={inputClass} type="number" min="1" max="120" value={request.searchBudget ?? 40} onChange={e => edit({ ...request, searchBudget: Number(e.target.value) })} /></label></div>
    <fieldset className="border p-4 space-x-4"><legend>{T('Rules', '規則')}</legend>{(['keepPoTogether', 'unloadOrderByPo'] as const).map(k => <label key={k}><input type="checkbox" checked={request.rules?.[k] ?? false} onChange={e => edit({ ...request, rules: { ...request.rules, [k]: e.target.checked } })} />{k === 'keepPoTogether' ? T('Keep PO together when feasible', '可行時整張 PO 一齊裝') : T('Unload by PO order', '按 PO 次序卸貨')}</label>)}<label>{T('Max suppliers / container', '每櫃最多供應商')}<input className={inputClass} type="number" min="1" max="30" value={request.rules?.maxSuppliersPerContainer ?? 30} onChange={e => edit({ ...request, rules: { ...request.rules, maxSuppliersPerContainer: Number(e.target.value) } })} /></label></fieldset>
    <button data-testid="consolidation-run" className="rounded bg-blue-700 text-white px-5 py-3" disabled={busy} onClick={run}>{busy ? T('Planning…', '規劃中…') : T('Plan consolidation', '規劃併櫃')}</button>
    {message && <p role="alert" className="bg-amber-50 p-3">{message}</p>}
    {result && <section data-testid="consolidation-result" className="space-y-4">
      <h2 className="text-2xl font-bold">{result.outcome === 'found' ? T('Best options found', '搵到嘅最佳方案') : T('No container fit within budget', '搜尋上限內未能裝櫃')}</h2>
      <p>{result.cargo.cartons} {T('eligible cartons', '合資格箱')} · {result.cargo.cbm.toFixed(3)} CBM · {result.cargo.weight.kg.toFixed(1)} kg / {result.cargo.weight.lb.toFixed(1)} lb · {result.searched.packs}/{result.searched.budget} {T('packing runs', '次砌櫃')}</p>
      {result.eligible.skipped.map(p => <p key={p.poId}>{T('Skipped', '已跳過')} {p.poId}: {T(p.reason, p.reason.includes('missing') ? '時間窗內需要備妥日期' : p.reason.includes('before') ? '備妥日期早過時間窗' : '備妥日期遲過時間窗')}</p>)}
      <div className="flex gap-2 flex-wrap"><button className={buttonClass} onClick={() => json('consolidation-plan.json', result)}>{T('Plan JSON', '方案 JSON')}</button><button className={buttonClass} onClick={() => json('consolidation-request.json', ranRequest)}>{T('API request JSON', 'API 請求 JSON')}</button><button className={buttonClass} onClick={() => downloadText('consolidation.sh', `curl -X POST https://www.dimpack3d.com/api/consolidate -H 'Content-Type: application/json' --data-binary @consolidation-request.json\n`, 'text/plain')}>curl</button></div>
      {result.plans.map((p, pi) => <article key={p.id} className="border rounded-xl p-4" data-testid="consolidation-plan">
        <h3 className="text-xl font-bold">{T('Option', '方案')} {pi + 1}</h3>{badges(p.checks)}
        {p.containers.map(c => <div key={c.index} data-testid="container-card" className="border rounded p-3 my-2"><b>{c.preset.toUpperCase()} #{c.index + 1}</b><p>{c.pos.join(', ')} · <span data-testid="card-placed-count">{c.cartons}</span> {T('cartons', '箱')} · {c.volumeUtilPct.toFixed(1)}% · {c.weight.kg.toFixed(1)} kg / {c.weight.lb.toFixed(1)} lb</p>{badges(c.checks)}<button data-testid="open-container" className={buttonClass} onClick={() => setSelected(c)}>{T('Open 3D container', '睇 3D 櫃')}</button> <button className={buttonClass} onClick={() => downloadText(`${p.id}-container-${c.index + 1}.csv`, toPackingCSV(c.boxes, c.zones, { title: p.id, containerLabel: c.preset, container: CONTAINER_PRESETS[c.preset], unit: 'cm', weightUnit: 'kg', date: '' }))}>{T('Packing list CSV', '裝櫃清單 CSV')}</button></div>)}
        <p>{T('Remainder', '餘貨')}: {p.remainder.cartons} {T('cartons', '箱')} · {p.remainder.cbm.toFixed(3)} CBM</p>{p.remainder.byPo.map(po => <p key={po.poId}>{po.poId}: {po.cartons} ({po.items.map(it => `${it.sku}: ${it.qty}`).join(', ')})</p>)}
        {p.lcl && <p>{T('LCL estimate (billable CBM)', '散貨估算（收費 CBM）')}: {p.lcl.cbm.toFixed(3)} · {p.lcl.cost?.toFixed(2) ?? T('rate missing', '欠報價')}</p>}
        <p>{p.cost ? `${T('Cost in your quote currency', '按你報價貨幣計算成本')}: ${p.cost.containers.toFixed(2)} FCL + ${p.cost.lcl.toFixed(2)} LCL = ${p.cost.total.toFixed(2)} · ${p.cost.perUnit.toFixed(2)} / ${T('unit (carton)', '單位（箱）')}` : T('Add all used container and remainder LCL rates for total cost per unit.', '提供所有用到嘅櫃型同餘貨散貨報價，先可計每箱總成本。')}</p>
      </article>)}
      {selected && <section data-testid="container-view" className="border rounded p-4"><h3>{selected.preset.toUpperCase()} #{selected.index + 1} · {T('Read-only load', '唯讀擺位')}</h3><div className="flex gap-3">{selected.pos.map(po => <span key={po}><span style={{ color: `#${selected.boxes.find(b => b.group === po)!.color.toString(16).padStart(6, '0')}` }}>■</span> {po}</span>)}</div><InteractiveLoadPlanner key={`${result.inputHash}-${selected.boxes.map(b => b.id).join(',')}-${selected.preset}`} readOnly placedCountTestId="container-placed-count" container={CONTAINER_PRESETS[selected.preset]} boxes={selected.boxes} unitLabel="cm" /></section>}
    </section>}
    <aside className="bg-amber-50 border rounded p-4">{T('Heuristic estimate, not a booking or a proven optimum. Rates are yours and must use one currency. Origin/destination charges and cut-offs are not modelled unless included in your quotes. LCL is a volume/cost estimate, not a verified load. Missing ready dates are excluded when a window is set. Check badges are screening; hover for assumptions.', '呢個係啟發式估算，唔係訂艙或已證明最優方案。報價由你提供，必須同一貨幣。起點／目的地費用同截關時間未有建模，除非你已計入報價。散貨只係容積／成本估算，未驗證擺位。有時間窗時，冇備妥日期嘅 PO 會被排除。檢查只作篩查，滑鼠移上徽章睇假設。')}{result?.notes.some(n => n.startsWith('No mix')) && <p>{T(result.notes.find(n => n.startsWith('No mix'))!, '55–85% 容積範圍內冇組合；已明確改用最接近容積嘅允許組合作後備篩查。')}</p>}</aside>
  </main>;
}
