import LayoutThumbnail from './LayoutThumbnail';
import type {PackingBenchmark} from '../lib/packingBenchmark';
import type {OptimizedResult} from '../lib/optimizePacking';
import type {LayoutAlternative,LayoutMethod} from '../lib/plannerAlternatives';
export function layoutName(id:LayoutMethod|'recommended',zh:boolean){
 const names={'grid-search':['Supported columns','完整支撐直列'], 'layer-search':['Supported mixed layers','完整支撐混合層'], 'partition-search':['Partitioned layout','分區排列'], 'axis-length':['Lengthwise search','長向排列'], 'axis-width':['Crosswise search','橫向排列'],recommended:['Initial layout','初步方案'],standard:['Standard placement','標準排列'], 'low-top':['Lower-top search','較低層排列'],footprint:['Large footprint first','大底面優先'],layers:['Layer-by-layer placement','逐層排列']};
 return names[id][zh?1:0];
}
export default function PlannerLayoutOptions({container,benchmark,base,items,status,selected,modified,disabled,zh,onFind,onCancel,onSelect}:{container:{l:number;w:number;h:number};benchmark?:PackingBenchmark|null;base:OptimizedResult;items:LayoutAlternative[];status:string;selected:number;modified:boolean;disabled:boolean;zh:boolean;onFind:()=>void;onCancel:()=>void;onSelect:(n:number)=>void}){
 const T=(a:string,b:string)=>zh?b:a;
 const options=[{id:'recommended' as const,result:base},...items];
 const mostVolume=Math.max(...options.map(o=>o.result.stats.volumeUtil));
 return <section className="my-3 rounded-xl border border-blue-200 bg-white p-3" aria-label={T('Compare loading layouts','比較裝載擺法')}>
  <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-sm">{T('Compare loading layouts','比較裝載擺法')}</h2>
   {status==='running'?<button type="button" className="text-sm rounded border px-3 py-1" onClick={onCancel}>{T('Cancel comparison','取消比較')}</button>:status!=='done'&&<button type="button" className="rounded bg-blue-600 text-white text-sm px-3 py-1.5 disabled:opacity-40" disabled={disabled} onClick={onFind}>{T('Find alternative layouts','計算其他擺法')}</button>}
  </div>
  <p className="text-xs text-slate-500 mt-1">{T('Same cargo and rules. The highest-volume option is preselected; manual or saved layouts stay unchanged.','沿用同一貨單及限制。預選利用率最高者；手動或保存擺位則保留。')}</p>
  {status==='running'&&<p role="status" className="text-sm mt-2">{T('Checking distinct layouts… Your current plan stays available.','正在檢查不同擺法…目前方案仍可使用。')}</p>}
  {status==='error'&&<p role="status" className="text-sm text-amber-800 mt-2">{T('Comparison could not finish. Retry without changing your current plan.','比較未能完成，可重試；目前方案保留。')}</p>}
  {status==='cancelled'&&<p role="status" className="text-sm mt-2">{T('Comparison cancelled. Your current plan is unchanged.','已取消比較，目前方案不變。')}</p>}
  {status==='done'&&<>
   <p className="text-xs mt-2 text-slate-600">{items.length?T('Select a card to update 3D, checks and exports. Your current layout is saved on this device before switching.','選擇方案卡會同步更新 3D、檢查及匯出內容。切換前會在本機保存目前擺位。'):T('No distinct alternative passed the checks for these inputs. We keep one result rather than duplicate it.','這組輸入未找到通過檢查的不同擺法，因此只保留一個結果。')}</p>
   {modified&&<p className="text-xs text-amber-800 mt-2">{T('Viewing a manual or saved layout. Selecting an option replaces this view after saving it locally.','目前顯示手動或保存擺位；選擇方案會先保存本機版本，再更換畫面。')}</p>}
   {benchmark&&<details className="mt-2 rounded-lg bg-slate-50 p-2 text-xs" data-testid="packing-public-reference"><summary className="cursor-pointer font-medium">{T('Published reference', '公開數字參考')}: {benchmark.count} {T('cartons', '箱')} · {benchmark.date}</summary><p className="mt-2">{T('Brimload T1 historical, vendor-reported count for these recorded dimensions and quantity. Competitor constraints and layout have not been independently reproduced. A matching count does not mean the same arrangement.', 'Brimload T1 對呢組記錄尺寸及數量公佈嘅歷史箱數。對方限制及擺位未經獨立重現；箱數相同不代表擺法相同。')}</p><a className="mt-1 inline-block text-blue-700 underline" href={benchmark.source} target="_blank" rel="noopener noreferrer">{T('View source', '查看來源')}</a></details>}
   <div className="grid gap-2 md:grid-cols-3 mt-2" data-testid="planner-layout-options">
    {options.map((option,i)=>({option,i})).sort((a,b)=>b.option.result.stats.volumeUtil-a.option.result.stats.volumeUtil || b.option.result.boxes.length-a.option.result.boxes.length).map(({option,i},rank)=><button key={option.id} type="button" disabled={disabled} aria-pressed={!modified&&selected===i} data-testid={`planner-layout-${i}`} onClick={()=>onSelect(i)} className={`flex flex-col items-stretch justify-start min-w-0 rounded-lg border p-3 text-left disabled:opacity-40 ${!modified&&selected===i?'border-blue-600 bg-blue-50 ring-1 ring-blue-600':'border-slate-200 hover:border-blue-400'}`}>
     <span className="block text-sm font-semibold">{T(`Option ${rank+1}`,`方案 ${rank+1}`)}</span>
     <LayoutThumbnail boxes={option.result.boxes} container={container} label={T(`Option ${rank+1}: ${option.result.boxes.length} cartons, isometric preview`,`方案 ${rank+1}：${option.result.boxes.length} 箱，等角預覽`)}/>
     <span className="text-xs text-slate-500">{layoutName(option.id,zh)}</span>
     {option.result.boxes.length!==base.boxes.length&&<span className="font-semibold text-sm text-blue-800">{T(`${option.result.boxes.length-base.boxes.length>0?'+':''}${option.result.boxes.length-base.boxes.length} cartons vs initial layout`,`比初步方案 ${option.result.boxes.length-base.boxes.length>0?'+':''}${option.result.boxes.length-base.boxes.length} 箱`)}</span>}
     {option.result.stats.volumeUtil===mostVolume && <span className="text-xs text-blue-700">{rank===0?T("Highest volume among these options", "候選中利用率最高"):T("Same volume · different layout", "相同利用率 · 不同擺法")}</span>}
     {benchmark&&<span className="mt-1 block text-xs text-slate-600">{option.result.boxes.length===benchmark.count?T('Matches the published count', '達到公開參考箱數'):T(`${option.result.boxes.length-benchmark.count>0?'+':''}${option.result.boxes.length-benchmark.count} cartons vs published count`, `相比公開箱數 ${option.result.boxes.length-benchmark.count>0?'+':''}${option.result.boxes.length-benchmark.count} 箱`)}</span>}
     <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm"><strong>{option.result.stats.volumeUtil.toFixed(1)}% {T('volume','利用率')}</strong><span>{option.result.boxes.length} {T('loaded','箱已裝')}</span></span>
     <span className="mt-1 block text-xs text-slate-600">{mostVolume-option.result.stats.volumeUtil>0.05 ? T(`${(mostVolume-option.result.stats.volumeUtil).toFixed(1)} percentage points below the highest-volume option`, `比最高利用率方案低 ${(mostVolume-option.result.stats.volumeUtil).toFixed(1)} 個百分點`) : T('Same inputs and loading rules', '相同貨單及裝載限制')}</span>
     <span className="mt-1 block text-xs text-slate-600">{option.result.unplaced} {T('remaining','箱未裝')} · {option.result.stats.totalWeight.toLocaleString(undefined,{maximumFractionDigits:0})} kg</span>
     <span className="mt-1 block text-xs text-slate-600">{T('Cargo centre height','貨物重心高度')}: {option.result.stats.cog.y.toFixed(0)} cm</span>
    </button>)}
   </div>
  </>}
 </section>;
}
