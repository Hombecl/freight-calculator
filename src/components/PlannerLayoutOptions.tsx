import type {OptimizedResult} from '../lib/optimizePacking';
import type {LayoutAlternative,LayoutMethod} from '../lib/plannerAlternatives';
export function layoutName(id:LayoutMethod|'recommended',zh:boolean){
 const names={recommended:['Original recommendation','原有推薦方案'],standard:['Standard placement','標準排列'], 'low-top':['Lower-top search','較低層排列'],footprint:['Large footprint first','大底面優先'],layers:['Layer-by-layer placement','逐層排列']};
 return names[id][zh?1:0];
}
export default function PlannerLayoutOptions({base,items,status,selected,modified,disabled,zh,onFind,onCancel,onSelect}:{base:OptimizedResult;items:LayoutAlternative[];status:string;selected:number;modified:boolean;disabled:boolean;zh:boolean;onFind:()=>void;onCancel:()=>void;onSelect:(n:number)=>void}){
 const T=(a:string,b:string)=>zh?b:a;
 const options=[{id:'recommended' as const,result:base},...items];
 const mostVolume=Math.max(...options.map(o=>o.result.stats.volumeUtil));
 return <section className="my-3 rounded-xl border border-blue-200 bg-white p-3" aria-label={T('Compare loading layouts','比較裝載擺法')}>
  <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-sm">{T('Compare loading layouts','比較裝載擺法')}</h2>
   {status==='running'?<button type="button" className="text-sm rounded border px-3 py-1" onClick={onCancel}>{T('Cancel comparison','取消比較')}</button>:status!=='done'&&<button type="button" className="rounded bg-blue-600 text-white text-sm px-3 py-1.5 disabled:opacity-40" disabled={disabled} onClick={onFind}>{T('Find alternative layouts','計算其他擺法')}</button>}
  </div>
  <p className="text-xs text-slate-500 mt-1">{T('Compare the same cargo and rules. The highest-volume candidate is preselected unless you have edited or opened a saved layout. Placement methods do not guarantee easier loading.','沿用同一貨單及限制，比較不同擺位方式。預選候選中利用率最高者；手動或保存擺位則保留。不同擺法不代表一定更易裝卸。')}</p>
  {status==='running'&&<p role="status" className="text-sm mt-2">{T('Checking distinct layouts… Your current plan stays available.','正在檢查不同擺法…目前方案仍可使用。')}</p>}
  {status==='error'&&<p role="status" className="text-sm text-amber-800 mt-2">{T('Comparison could not finish. Retry without changing your current plan.','比較未能完成，可重試；目前方案保留。')}</p>}
  {status==='cancelled'&&<p role="status" className="text-sm mt-2">{T('Comparison cancelled. Your current plan is unchanged.','已取消比較，目前方案不變。')}</p>}
  {status==='done'&&<>
   <p className="text-xs mt-2 text-slate-600">{items.length?T('Select a card to apply its 3D layout, checks and exports. Your current layout is saved locally before switching.','選擇方案卡會同步更新 3D、檢查及匯出內容。切換前會在本機保存目前擺位。'):T('No distinct alternative passed the checks for these inputs. We keep one result rather than duplicate it.','這組輸入未找到通過檢查的不同擺法，因此只保留一個結果。')}</p>
   {modified&&<p className="text-xs text-amber-800 mt-2">{T('Viewing a manual or saved layout. Selecting an option replaces this view after saving it locally.','目前顯示手動或保存擺位；選擇方案會先保存本機版本，再更換畫面。')}</p>}
   <div className="grid gap-2 md:grid-cols-3 mt-2" data-testid="planner-layout-options">
    {options.map((option,i)=><button key={option.id} type="button" disabled={disabled} aria-pressed={!modified&&selected===i} data-testid={`planner-layout-${i}`} onClick={()=>onSelect(i)} className={`min-w-0 rounded-lg border p-3 text-left disabled:opacity-40 ${!modified&&selected===i?'border-blue-600 bg-blue-50 ring-1 ring-blue-600':'border-slate-200 hover:border-blue-400'}`}>
     <span className="block text-sm font-semibold">{i+1}. {layoutName(option.id,zh)}</span>
     {option.result.stats.volumeUtil===mostVolume && <span className="text-xs text-blue-700">{T("Highest volume among these options", "候選中利用率最高")}</span>}
     <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm"><strong>{option.result.stats.volumeUtil.toFixed(1)}% {T('volume','利用率')}</strong><span>{option.result.boxes.length} {T('loaded','箱已裝')}</span></span>
     <span className="mt-1 block text-xs text-slate-600">{option.result.unplaced} {T('remaining','箱未裝')} · {option.result.stats.totalWeight.toLocaleString(undefined,{maximumFractionDigits:0})} kg</span>
     <span className="mt-1 block text-xs text-slate-600">{T('Cargo centre height','貨物重心高度')}: {option.result.stats.cog.y.toFixed(0)} cm</span>
    </button>)}
   </div>
  </>}
 </section>;
}
