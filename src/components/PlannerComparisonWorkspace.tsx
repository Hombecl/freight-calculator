import {useMemo,useState,useEffect} from 'react';
import {X} from 'lucide-react';
import InteractiveLoadPlanner from './InteractiveLoadPlanner';
import {createCameraSync} from '../lib/viewerCameraSync';
import {viewAngles,type ViewPreset} from '../lib/viewGeometry';
import type {OptimizedResult} from '../lib/optimizePacking';

export interface ComparisonOption {index:number;name:string;result:OptimizedResult}
export default function PlannerComparisonWorkspace({options,container,selected,disabled,zh,onUse,onClose,onExit}:{
  options:ComparisonOption[];container:{l:number;w:number;h:number};selected:number;
  disabled:boolean;zh:boolean;onUse:(index:number)=>boolean;onClose:()=>void;onExit:()=>void;
}){
  const T=(en:string,cn:string)=>zh?cn:en;
  const ranked=useMemo(()=>[...options].sort((a,b)=>b.result.stats.volumeUtil-a.result.stats.volumeUtil||b.result.boxes.length-a.result.boxes.length),[options]);
  const [a,setA]=useState(selected);
  const [b,setB]=useState(()=>ranked.find(o=>o.index!==selected)?.index??selected);
  const [mobileSide,setMobileSide]=useState<'A'|'B'>('A');
  const [rotating,setRotating]=useState(false);
  const [wide,setWide]=useState(()=>window.matchMedia('(min-width: 1024px)').matches);
  const camera=useMemo(createCameraSync,[]);
  useEffect(()=>{const q=window.matchMedia('(min-width: 1024px)');const update=()=>setWide(q.matches);q.addEventListener('change',update);return()=>q.removeEventListener('change',update);},[]);
  const left=options.find(o=>o.index===a)??ranked[0],right=options.find(o=>o.index===b)??ranked[1]??ranked[0];
  const setView=(preset:ViewPreset)=>{setRotating(false);camera.publish({...viewAngles(preset),zoom:1,fixed:preset!=='perspective'});};
  const zoom=(factor:number)=>camera.publish({...camera.get(),radius:undefined,zoom:Math.max(.35,Math.min(3,camera.get().zoom*factor))});
  const best=ranked[0].result.stats.volumeUtil;
  const difference=right.result.boxes.length-left.result.boxes.length;
  const volumeDifference=right.result.stats.volumeUtil-left.result.stats.volumeUtil;
  return <section className="absolute inset-0 z-30 flex flex-col bg-slate-100" aria-label={T('Compare two layouts','比較兩個方案')} data-testid="planner-comparison-workspace">
    <header className="shrink-0 border-b bg-white px-3 py-2 flex flex-wrap items-center gap-2">
      <h2 className="mr-auto text-sm font-bold">{T('Compare layouts','比較裝載方案')}</h2>
      <span className="hidden sm:inline text-xs text-slate-500">{T('Linked cameras · preview only','同步視角 · 預覽模式')}</span>
      <button type="button" aria-label={T('Back to selected layout','返回已選方案')} onClick={onClose} className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"><X size={16}/><span className="hidden sm:inline">{T('Back to selected layout','返回已選方案')}</span><span className="sm:hidden">{T('Back','返回')}</span></button>
      <button type="button" onClick={onExit} aria-label={T('Close comparison and expanded view','關閉比較及全螢幕')} className="rounded-lg border p-2.5" title={T('Close expanded view','關閉全螢幕')}><X size={18}/></button>
    </header>
    <div className="shrink-0 flex flex-wrap items-center gap-1 px-3 py-2 text-xs">
      {(['perspective','top','side','door'] as ViewPreset[]).map((v,i)=><button type="button" key={v} onClick={()=>setView(v)} className="rounded-lg bg-white px-3 py-2">{(zh?['立體','俯視','側視','門口']:['3D','Top','Side','Door'])[i]}</button>)}
      <div className="ml-auto flex gap-1">
        <button type="button" aria-label={T('Zoom both views in','放大兩個視角')} onClick={()=>zoom(.8)} className="rounded-lg bg-white px-3 py-2">+</button>
        <button type="button" aria-label={T('Zoom both views out','縮小兩個視角')} onClick={()=>zoom(1.25)} className="rounded-lg bg-white px-3 py-2">−</button>
        <button type="button" aria-pressed={rotating} onClick={()=>{if(!rotating)camera.publish({...camera.get(),fixed:false});setRotating(v=>!v);}} className="rounded-lg bg-blue-50 px-3 py-2 text-blue-800">{rotating?T('Pause rotation','暫停旋轉'):T('Rotate together','同步旋轉')}</button>
      </div>
    </div>
    <div className="shrink-0 mx-3 mb-2 rounded-lg bg-white px-3 py-2 text-xs" role="status">
      {T('B compared with A: ','B 相比 A：')}{difference===0&&Math.abs(volumeDifference)<.05?T('Same capacity · compare arrangement and centre height.','容量相同 · 可比較擺位及重心高度。'):`${difference>0?'+':''}${difference} ${T('cartons','箱')} · ${volumeDifference>0?'+':''}${volumeDifference.toFixed(1)} ${T('percentage points utilization','個百分點利用率')}`}
    </div>
    {!wide&&<div className="shrink-0 flex gap-2 px-3 pb-2" role="group" aria-label={T('Visible comparison','顯示比較方案')}>{(['A','B'] as const).map(side=><button key={side} type="button" aria-pressed={mobileSide===side} onClick={()=>setMobileSide(side)} className={`flex-1 rounded-lg py-2 font-semibold ${mobileSide===side?'bg-blue-600 text-white':'bg-white'}`}>{side}</button>)}</div>}
    <div className="min-h-0 flex-1 grid lg:grid-cols-2 gap-3 px-3 pb-3">
      {([{side:'A',option:left,set:setA},{side:'B',option:right,set:setB}] as const).filter(p=>wide||p.side===mobileSide).map(({side,option,set})=><article key={side} className="min-h-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden" aria-label={`${side}: ${option.name}`}>
        <div className="shrink-0 px-3 pt-3 pb-2 flex gap-2 items-center"><strong className="text-blue-800">{side}</strong><select aria-label={T(`Layout ${side}`,`方案 ${side}`)} value={option.index} onChange={e=>set(Number(e.target.value))} className="min-w-0 flex-1 rounded-lg border px-2 py-2 text-sm">{ranked.map((o,i)=><option key={o.index} value={o.index} disabled={o.index===(side==='A'?b:a)}>{T(`Option ${i+1}`,`方案 ${i+1}`)} · {o.result.stats.volumeUtil.toFixed(1)}% · {o.result.boxes.length} {T('cartons','箱')}</option>)}</select></div>
        <div className="shrink-0 px-3 pb-2 grid grid-cols-3 gap-2 text-xs text-slate-500">
          <span>{T('Utilization','利用率')}<strong className="block text-lg text-slate-900">{option.result.stats.volumeUtil.toFixed(1)}%</strong></span>
          <span>{T('Loaded','已裝')}<strong className="block text-lg text-slate-900">{option.result.boxes.length}</strong></span>
          <span>{T('Remaining','未裝')}<strong className="block text-lg text-amber-800">{option.result.unplaced}</strong></span>
        </div>
        <div className="relative min-h-0 flex-1 bg-slate-100" data-testid={`comparison-view-${side}`}>
          <InteractiveLoadPlanner minimalViewer cameraSync={camera} onCameraInteract={()=>setRotating(false)} lightTheme hideSummary readOnly container={container} boxes={option.result.boxes} autoSpin={rotating&&(wide?side==='A':true)} maxPixelRatio={1.5}/>
          <span className="absolute bottom-2 left-3 pointer-events-none text-[10px] text-slate-500">◇ DimPack3D.com · {T('Green frame = door','綠框＝櫃門')}</span>
        </div>
        <footer className="shrink-0 p-3 border-t">
          <p className="text-xs text-slate-600 mb-2">{option.result.stats.totalWeight.toLocaleString()} kg · {T('Centre height','重心高度')} {option.result.stats.cog.y.toFixed(1)} cm{Math.abs(option.result.stats.volumeUtil-best)<.05?T(' · Highest capacity',' · 最高容量'):''}</p>
          <button type="button" disabled={disabled} onClick={()=>{if(onUse(option.index))onClose();}} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">{T(`Use layout ${side}`,`使用方案 ${side}`)}</button>
        </footer>
      </article>)}
    </div>
  </section>;
}
