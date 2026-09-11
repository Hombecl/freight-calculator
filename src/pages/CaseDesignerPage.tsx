import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { track } from '../lib/track';
import { CASE_EXAMPLE, designCases, parseCaseRequest, evaluateCase, casePalletView, type CaseDesignRequest, type CaseDesignResult, type CaseCandidate } from '../lib/caseDesign';
import { PALLETS } from '../lib/pallets';
import LayerDiagram from '../components/LayerDiagram';
import PalletEstimateView from '../components/PalletEstimateView';

const initial = { l:10,w:8,h:15,weight:.3,min:6,max:12,maxWeight:20,maxDim:100,boardThickness:.4,headspace:.5,pl:120,pw:80,baseHeight:15,maxHeight:180,payload:1000,overhang:0,bl:40,bw:30,bh:30,bn:12 };
type Fields = typeof initial;
function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text],{type})), a = document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function CaseDesignerPage() {
  const { lang } = useApp(); const T = (en:string,zh:string) => lang==='zh'?zh:en;
  const [fields,setFields]=useState(initial), [units,setUnits]=useState<'cm-kg'|'in-lb'>('cm-kg'), [upright,setUpright]=useState(true);
  const [palletEnabled,setPalletEnabled]=useState(true), [container,setContainer]=useState('40hq'), [baselineEnabled,setBaselineEnabled]=useState(false);
  const [costs,setCosts]=useState({boardCostPerM2:'',freightPerContainer:'',freightPerPallet:'',handlingPerCase:'',currency:'USD'});
  const [result,setResult]=useState<CaseDesignResult>(), [selected,setSelected]=useState<string>(), [request,setRequest]=useState<CaseDesignRequest>(CASE_EXAMPLE), [baseline,setBaseline]=useState<CaseCandidate>();
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{track('tool_case_design');},[]);
  const f=fields, unit=units==='cm-kg'?'cm':'in', wu=units==='cm-kg'?'kg':'lb';
  const parsed=useMemo(()=>parseCaseRequest(request),[request]);
  const chosen=result?.candidates.find(c=>c.id===selected);
  const view=useMemo(()=>chosen?casePalletView(chosen,parsed):undefined,[chosen,parsed]);
  const inputClass='w-full border border-slate-300 rounded-lg p-2 bg-white';
  const field=(key:keyof Fields,en:string,zh:string,suffix=unit)=><label key={key} className="block text-sm">{T(en,zh)} {suffix}<input className={inputClass} type="number" step="any" value={f[key]} onChange={e=>setFields(v=>({...v,[key]:Number(e.target.value)}))}/></label>;
  const toggle=()=>{
    setResult(undefined);setBaseline(undefined);setSelected(undefined);
    const L=units==='cm-kg'?1/2.54:2.54,W=units==='cm-kg'?1/.45359237:.45359237;
    setFields(v=>Object.fromEntries(Object.entries(v).map(([k,n])=>[k,n*(['min','max','bn'].includes(k)?1:['weight','maxWeight','payload'].includes(k)?W:L)])) as Fields);
    setUnits(units==='cm-kg'?'in-lb':'cm-kg');
  };
  async function run() {
    setBusy(true);setError('');setResult(undefined);setBaseline(undefined);setSelected(undefined);
    try {
      const supplied=Object.fromEntries(Object.entries(costs).filter(([k,v])=>k!=='currency'&&v!=='').map(([k,v])=>[k,Number(v)]));
      const next:CaseDesignRequest={units,product:{l:f.l,w:f.w,h:f.h,weight:f.weight,keepUpright:upright},unitsPerCase:{min:f.min,max:f.max},caseConstraints:{maxWeight:f.maxWeight,maxDim:f.maxDim,boardThickness:f.boardThickness,headspace:f.headspace,allowedOrientations:upright?'upright':'any'},...(palletEnabled?{pallet:{l:f.pl,w:f.pw,baseHeight:f.baseHeight,maxHeight:f.maxHeight,maxWeight:f.payload,overhang:f.overhang}}:{}),...(container?{container:{preset:container as '20gp'|'40gp'|'40hq'}}:{}),...(Object.keys(supplied).length?{costs:{...supplied,currency:costs.currency}}:{})};
      const normal=parseCaseRequest(next);
      let current:CaseCandidate|undefined;
      if(baselineEnabled) {
        // Reuse the same validation and evaluation as generated cases.
        parseCaseRequest({...next,product:{l:f.bl,w:f.bw,h:f.bh,weight:f.weight},unitsPerCase:f.bn});
        const scale=units==='cm-kg'?1:2.54;
        current=evaluateCase(normal,{l:f.bl*scale,w:f.bw*scale,h:f.bh*scale},f.bn,{a:1,b:1,c:f.bn,orientation:'current'},'current');
      }
      const output=await designCases(next);setRequest(next);setResult(output);setSelected(undefined);setBaseline(current);track('case_design_run',String(output.candidates.length));
    } catch(e) {setError(e instanceof Error?e.message:String(e));} finally {setBusy(false);}
  }
  const fmt=(n:number)=>Number(n.toFixed(3)).toLocaleString(lang==='zh'?'zh-HK':'en-US');
  const dimension=(v:{cm:number;in:number})=>fmt(v[request.units==='in-lb'?'in':'cm']);
  const outputUnit=request.units==='in-lb'?'in':'cm';
  const csv=()=>{
    const headers=['id','units_per_case','arrangement','orientation','length_cm','width_cm','height_cm','case_kg','ti','hi','cases_per_pallet','units_per_pallet','pallet_fill_pct','pallets_per_container','cases_per_container','units_per_container','container_fill_pct','loaded_height_cm','cargo_kg','cost_per_unit','currency'];
    const rows=result!.candidates.map(c=>[c.id,c.unitsPerCase,`${c.arrangement.a}x${c.arrangement.b}x${c.arrangement.c}`,c.arrangement.orientation,c.caseOuter.l.cm,c.caseOuter.w.cm,c.caseOuter.h.cm,c.caseWeight.kg,c.pallet?.ti,c.pallet?.hi,c.pallet?.casesPerPallet,c.pallet?.unitsPerPallet,c.pallet?.cubeUtilPct,c.container?.palletsPerContainer,c.container?.casesPerContainer,c.container?.unitsPerContainer,c.container?.volumeUtilPct,c.pallet?.loadedHeight.cm,c.pallet?.cargoWeight.kg,c.costPerUnit?.value,c.costPerUnit?.currency]);
    download('case-designs.csv',[headers,...rows].map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n'),'text/csv');track('case_design_csv');
  };
  return <main className="max-w-7xl mx-auto px-4 py-10 space-y-6">
    <Helmet><title>{T('Case designer — best shipping options found | DimPack3D','外箱設計 — 搵出更合適嘅出貨方案 | DimPack3D')}</title><meta name="description" content={T('Explore case arrangements, TI-HI, container capacity and supplied cost per sellable unit.','比較外箱排列、TI-HI、貨櫃容量同每件出貨成本估算。')}/></Helmet>
    <h1 className="text-3xl font-black">{T('Case designer','外箱設計')}</h1>
    <p>{T('Find case options by delivered cost per sellable unit, or container capacity when costs are absent. Best options found, not a proven optimum.','按每件出貨成本比較外箱方案；冇成本資料就按貨櫃件數排序。結果係搜尋搵到嘅較佳方案，唔係已證明嘅最優解。')}</p>
    <aside className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
      <b>{T('Limits & assumptions','限制同假設')}</b>
      <p>{T('At most 24 evenly sampled case quantities, 400 unique designs, 10 results; floor loading tests up to 2,000 cases. Board mass: 0.6 kg/m² of outer surface area. Default board: 0.4 cm per side; headspace: 0.5 cm. Column stack only, no interlocking patterns.','最多平均抽樣 24 個每箱件數、400 個獨立設計、10 個結果；散裝測試最多 2,000 箱。紙板重量按外表面積每平方米 0.6 kg 估算。預設每邊紙板厚 0.4 cm、頂部空隙 0.5 cm。只計直柱堆疊，唔計交錯排列。')}</p>
      <p>{T('Pallet tare assumed 25 kg; up to two pallet tiers, strength unverified. Missing costs count as zero. Fill measures case cube, not product cube.','卡板自重假設 25 kg；最多疊兩板，未驗證承重強度。冇填嘅成本當零計。使用率按外箱體積計，唔係產品體積。')}</p>
    </aside>
    <form onChange={() => { setResult(undefined); setBaseline(undefined); setSelected(undefined); }} onSubmit={e=>{e.preventDefault();void run();}} className="space-y-5">
      <button type="button" className="border rounded-lg p-2" onClick={toggle}>{T('Switch units','轉換單位')} · {units}</button>
      <div className="grid md:grid-cols-2 gap-6">
        <section className="border rounded-xl p-5 space-y-4"><h2 className="font-bold">{T('Product & case','產品同外箱')}</h2>
          <div className="grid grid-cols-3 gap-3">{field('l','Product length','產品長')}{field('w','Product width','產品闊')}{field('h','Product height','產品高')}{field('weight','Product weight','產品重量',wu)}{field('min','Min units/case','每箱最少件數','')}{field('max','Max units/case','每箱最多件數','')}</div>
          <label className="block"><input type="checkbox" checked={upright} onChange={e=>setUpright(e.target.checked)}/> {T('Keep products upright','產品保持直放')}</label>
          <div className="grid grid-cols-2 gap-3">{field('maxWeight','Max case weight','外箱重量上限',wu)}{field('maxDim','Longest side cap','最長邊上限')}{field('boardThickness','Board thickness per side','每邊紙板厚度')}{field('headspace','Headspace','頂部空隙')}</div>
          <label className="block"><input type="checkbox" checked={baselineEnabled} onChange={e=>setBaselineEnabled(e.target.checked)}/> {T('Compare my current case','比較我而家用緊嘅外箱')}</label>
          {baselineEnabled&&<div className="grid grid-cols-2 gap-3">{field('bl','Current case length','現用外箱長')}{field('bw','Current case width','現用外箱闊')}{field('bh','Current case height','現用外箱高')}{field('bn','Current units/case','現用每箱件數','')}</div>}
        </section>
        <section className="border rounded-xl p-5 space-y-4"><h2 className="font-bold">{T('Destination & optional costs','目的地同可選成本')}</h2>
          <label className="block"><input type="checkbox" checked={palletEnabled} onChange={e=>setPalletEnabled(e.target.checked)}/> {T('Palletised (off = floor load)','打板（取消即散裝）')}</label>
          {palletEnabled&&<><div className="flex flex-wrap gap-2">{PALLETS.map(p=><button key={p.key} type="button" className="border rounded-lg p-2" onClick={()=>{setResult(undefined);setBaseline(undefined);setSelected(undefined);const L=units==='cm-kg'?1:1/2.54,W=units==='cm-kg'?1:1/.45359237;setFields(v=>({...v,pl:p.l*L,pw:p.w*L,baseHeight:15*L,maxHeight:(p.maxH+15)*L,payload:p.maxWt*W}));}}>{p.key==='eur'?'EUR':p.key==='gma'?'GMA':T('Industrial','工業板')}</button>)}<button type="button" className="border rounded-lg p-2" onClick={e=>e.currentTarget.parentElement?.nextElementSibling?.querySelector('input')?.focus()}>{T('Custom','自訂')}</button></div>
          <div className="grid grid-cols-3 gap-3">{field('pl','Pallet length','卡板長')}{field('pw','Pallet width','卡板闊')}{field('baseHeight','Base height','板底高')}{field('maxHeight','Total height cap','總高度上限')}{field('payload','Cargo payload cap','貨物重量上限',wu)}{field('overhang','Overhang per side','每邊懸出')}</div></>}
          <label className="block">{T('Container','貨櫃')}<select className={inputClass} value={container} onChange={e=>setContainer(e.target.value)}><option value="">{T('None','唔使用')}</option>{['20gp','40gp','40hq'].map(c=><option key={c}>{c}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-3">{([['boardCostPerM2','Board cost / m²','紙板成本 / m²'],['freightPerContainer','Freight / container','每櫃運費'],['freightPerPallet','Freight / pallet','每板運費'],['handlingPerCase','Handling / case','每箱處理費']] as const).map(([key,en,zh])=><label key={key} className="text-sm">{T(en,zh)}<input type="number" min="0" step="any" className={inputClass} value={costs[key]} onChange={e=>setCosts(v=>({...v,[key]:e.target.value}))}/></label>)}</div>
          <label className="block">{T('Currency','貨幣')}<input className={inputClass} value={costs.currency} maxLength={3} onChange={e=>setCosts(v=>({...v,currency:e.target.value.toUpperCase()}))}/></label>
        </section>
      </div>
      <button data-testid="design-run" disabled={busy} className="bg-blue-600 text-white font-bold px-6 py-3 rounded-lg">{busy?T('Designing…','計算緊…'):T('Design cases','設計外箱')}</button>
      {error&&<p role="alert" className="text-red-700">{T('Check input:','請檢查輸入：')} {error}</p>}
    </form>
    {result&&<section className="space-y-4" aria-live="polite"><h2 className="text-xl font-bold">{T('Best options found','搜尋搵到嘅較佳方案')}</h2>
      <p>{T('Designs screened / rejected:','已篩選／淘汰設計：')} {result.searched.enumerated} / {result.searched.rejected}</p>
      {!result.candidates.length&&<p>{T('No feasible design found within this search. Review dimensions and limits.','今次搜尋搵唔到可行設計，請檢查尺寸同限制。')}</p>}
      <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr>{[T('Units/case','件/箱'),T('Arrangement','排列'),`L × W × H (${outputUnit})`,T('Case weight','箱重'), 'TI × HI',T('Cases/pallet','箱/板'),T('Units/pallet','件/板'),T('Pallet fill %','卡板使用率 %'),T('Pallets/container','板/櫃'),T('Units/container','件/櫃'),T('Container fill %','貨櫃使用率 %'),T('Cost/unit','每件成本')].map(h=><th key={h} className="p-2 border-b whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{result.candidates.map(c=><tr key={c.id} data-testid="design-candidate-row" className={`cursor-pointer ${selected===c.id?'bg-blue-100':'hover:bg-slate-50'}`} onClick={()=>setSelected(c.id)}>
        <td className="p-2"><button type="button" className="underline" onClick={()=>setSelected(c.id)}>{c.unitsPerCase}</button></td><td>{c.arrangement.a}×{c.arrangement.b}×{c.arrangement.c} ({c.arrangement.orientation})</td><td className="whitespace-nowrap">{dimension(c.caseOuter.l)}×{dimension(c.caseOuter.w)}×{dimension(c.caseOuter.h)}</td><td>{fmt(request.units==='in-lb'?c.caseWeight.lb:c.caseWeight.kg)} {request.units==='in-lb'?'lb':'kg'}</td><td>{c.pallet?`${c.pallet.ti}×${c.pallet.hi}`:'—'}</td><td data-testid="design-cases-per-pallet">{c.pallet?.casesPerPallet??'—'}</td><td>{c.pallet?.unitsPerPallet??'—'}</td><td>{c.pallet?fmt(c.pallet.cubeUtilPct):'—'}</td><td>{c.container?.palletsPerContainer??'—'}</td><td className="font-bold">{c.container?.unitsPerContainer??'—'}</td><td>{c.container?fmt(c.container.volumeUtilPct):'—'}</td><td>{c.costPerUnit?`${fmt(c.costPerUnit.value)} ${c.costPerUnit.currency}`:'—'}</td>
      </tr>)}</tbody></table></div>
      {baseline&&<div data-testid="design-comparison" className="bg-blue-50 border rounded-xl p-4"><b>{T('Current case baseline','現用外箱基準')}</b><p>{dimension(baseline.caseOuter.l)}×{dimension(baseline.caseOuter.w)}×{dimension(baseline.caseOuter.h)} {outputUnit} · {baseline.unitsPerCase} {T('units/case','件/箱')} · {baseline.container?.unitsPerContainer??'—'} {T('units/container','件/櫃')}</p>{result.candidates[0]?.container&&baseline.container&&<p>{(chosen??result.candidates[0]).container!.unitsPerContainer-baseline.container.unitsPerContainer>=0?'+':''}{(chosen??result.candidates[0]).container!.unitsPerContainer-baseline.container.unitsPerContainer} {T('units per container vs today','件/櫃，比而家多（負數即減少）')}</p>}{baseline.checks.filter(c=>c.status==='fail').map(c=><p key={c.code}>{c.code}: {T('fails supplied limit','超出所填限制')}</p>)}</div>}
      {chosen&&<div data-testid="design-detail" className="border rounded-xl p-4 space-y-3"><h3 className="font-bold">{T('Selected design','已選設計')} {chosen.id}</h3>{view&&<div className="grid md:grid-cols-2 gap-4"><LayerDiagram overhang={parsed.pallet?.overhang} cartonL={chosen.caseOuter.l.cm} cartonW={chosen.caseOuter.w.cm} palletL={view.pallet.l} palletW={view.pallet.w} label={T('Pallet layer','卡板每層排列')}/><PalletEstimateView key={`${result.inputHash}-${chosen.id}`} result={view} zh={lang==='zh'} countTestId="design-placed-count"/></div>}
        {chosen.checks.map(c=><p key={c.code} className="text-sm">{T(({CASE_WEIGHT:'Case weight (kg)',CASE_DIM:'Longest case side (cm)',PALLET_HEIGHT:'Loaded pallet height (cm)',PALLET_PAYLOAD:'Pallet cargo weight (kg)',BOARD_MASS_ASSUMED:'Estimated board mass (kg)',COST_INPUTS_PROVIDED:'Costs supplied'} as Record<string,string>)[c.code]??c.code,({CASE_WEIGHT:'外箱重量 (kg)',CASE_DIM:'外箱最長邊 (cm)',PALLET_HEIGHT:'卡板裝載高度 (cm)',PALLET_PAYLOAD:'卡板貨物重量 (kg)',BOARD_MASS_ASSUMED:'估算紙板重量 (kg)',COST_INPUTS_PROVIDED:'已提供成本'} as Record<string,string>)[c.code]??c.code)} · {T(c.status,({pass:'通過',fail:'不通過',warn:'注意',not_evaluated:'未評估'})[c.status])} · {typeof c.observed==='number'?fmt(c.observed):c.observed??'—'} / {typeof c.limit==='number'?fmt(c.limit):c.limit??'—'}</p>)}
        <p>{T('All dimensions are geometric estimates. Board seams, flaps, waste, dividers and product damage are excluded. Supplied freight per pallet and per container are additive.','所有尺寸都係幾何估算，未計接縫、箱蓋、損耗、間隔板同產品損壞。所填每板同每櫃運費會相加。')}</p>
        {chosen.costPerUnit&&<p>{T('Cost per unit: board / handling / freight','每件成本：紙板／處理／運費')} = {Object.values(chosen.costPerUnit.breakdown).map(fmt).join(' / ')} {chosen.costPerUnit.currency}</p>}
      </div>}
      <div className="flex gap-3"><button className="border rounded-lg p-2" onClick={csv}>{T('Candidates CSV','候選方案 CSV')}</button><button className="border rounded-lg p-2" onClick={()=>download('case-design-request.json',JSON.stringify(request,null,2),'application/json')}>{T('API request JSON','API 請求 JSON')}</button></div>
      <p className="text-xs break-all">{result.engineVersion} · SHA-256 {result.inputHash}</p>
    </section>}
    <pre className="bg-slate-950 text-white p-4 rounded-xl overflow-auto text-xs"><code>{`curl https://www.dimpack3d.com/api/case-design -H 'Content-Type: application/json' --data-binary @case-design-request.json`}</code></pre>
    <p>{T('Structural ECT/BCT design is out of scope.','唔包括 ECT/BCT 結構設計。')} <Link className="text-blue-700 underline" to="/planner">{T('McKee helper in the planner (Est. beside Max on top)','規劃器 McKee 輔助計算（Max on top 旁嘅 Est.）')}</Link></p>
    <nav className="flex gap-5"><Link className="text-blue-700 underline" to="/order-quote">{T('Quote the order','訂單報價')}</Link><Link className="text-blue-700 underline" to="/ti-hi-calculator">{T('TI-HI calculator','TI-HI 計算器')}</Link><Link className="text-blue-700 underline" to="/api-docs#case-design">{T('API documentation','API 文件')}</Link></nav>
  </main>;
}
