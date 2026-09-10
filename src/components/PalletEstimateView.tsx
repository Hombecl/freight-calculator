import { useEffect, useRef, useState } from 'react';
import type { PalletEstimate } from '../lib/palletEstimate';
import { buildSteps } from '../lib/orderPlanning';
import { VIEW_COPY } from '../lib/orderViewLocale';
import type { OrderLanguage } from '../lib/orderLocale';

/** Orthographic 3D projection of solver coordinates. SVG works without WebGL and prints reliably. */
export default function PalletEstimateView({ result, zh = false, lang, copy, length = n => `${n} cm`, weight = n => `${n} kg`, countTestId = "placed-count" }: {
 result:Pick<PalletEstimate, "boxes" | "pallet" | "loadedHeight">; countTestId?:string; zh?:boolean; lang?:OrderLanguage;
 copy?:{diagram:string;turn:string;reveal:string;diagramNote:string;base:string};
 length?:(n:number)=>string; weight?:(n:number)=>string;
}) {
 const t=VIEW_COPY[lang ?? (zh?'zh':'en')];
 const [yaw,setYaw]=useState(-Math.PI/4), [pitch,setPitch]=useState(.55), [zoom,setZoom]=useState(1);
 const [selected,setSelected]=useState<string|null>(null), [step,setStep]=useState(result.boxes.length), [playing,setPlaying]=useState(false);
 const drag=useRef<{x:number;y:number;moved:boolean}|null>(null);
 const pressedBox=useRef<string|null>(null);
 const steps=buildSteps(result), p=result.pallet;
 useEffect(()=>{
   if(!playing) return;
   const timer=window.setInterval(()=>setStep(n=>Math.min(n+1,steps.length)),900);
   return ()=>clearInterval(timer);
 },[playing,steps.length]);
 useEffect(()=>{if(step>=steps.length)setPlaying(false);},[step,steps.length]);
 useEffect(()=>{const showAll=()=>{setPlaying(false);setStep(result.boxes.length);};window.addEventListener('beforeprint',showAll);return()=>window.removeEventListener('beforeprint',showAll);},[result.boxes.length]);
 const scale=Math.min(410/Math.hypot(p.l,p.w),260/Math.max(result.loadedHeight,Math.hypot(p.l,p.w)))*zoom;
 const project=(v:number[])=>{
   const x=v[0]-p.l/2,y=v[1]-result.loadedHeight/2,z=v[2]-p.w/2;
   const rx=x*Math.cos(yaw)+z*Math.sin(yaw),rz=-x*Math.sin(yaw)+z*Math.cos(yaw);
   return [270+rx*scale,175-(y*Math.cos(pitch)-rz*Math.sin(pitch))*scale,y*Math.sin(pitch)+rz*Math.cos(pitch)];
 };
 const boxes=[{id:'base',label:copy?.base??'Pallet',px:0,py:0,pz:0,l:p.l,h:p.baseHeight,w:p.w,color:0xb58a59},...steps.slice(0,step).map(b=>({...b,py:b.py+p.baseHeight}))];
 const faces=boxes.flatMap(b=>{
   const {px:x,py:y,pz:z,l,h,w}=b;
   const vertices=[[x,y,z],[x+l,y,z],[x+l,y,z+w],[x,y,z+w],[x,y+h,z],[x+l,y+h,z],[x+l,y+h,z+w],[x,y+h,z+w]].map(project);
   return [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]].map((ids,i)=>({b,i,points:ids.map(n=>vertices[n].slice(0,2).join(',')).join(' '),depth:ids.reduce((s,n)=>s+vertices[n][2],0)/4}));
 }).sort((a,b)=>a.depth-b.depth);
 const chosen=steps.slice(0,step).find(b=>b.id===selected);
 const button='rounded-lg border px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-40';
 const go=(n:number)=>{setPlaying(false);setStep(n);setSelected(steps[n-1]?.id??null);};
 return <div>
  <output data-testid={countTestId} className="sr-only">{boxes.length - 1}</output>
  <div className="px-5 pt-4 print:hidden">
   <p className="text-sm font-semibold text-slate-600">{copy?.diagram??t.orbit}</p>
   <div className="flex flex-wrap gap-2 mt-3">
    <button className={button} onClick={()=>{setPitch(Math.PI/2);setYaw(0);}}>{t.top}</button>
    <button className={button} onClick={()=>{setPitch(0);setYaw(0);}}>{t.side}</button>
    <button className={button} onClick={()=>{setPitch(.55);setYaw(-Math.PI/4);setZoom(1);}}>{t.reset}</button>
    <button className={button} aria-label="−" disabled={zoom<=.6} onClick={()=>setZoom(n=>Math.max(.6,n-.2))}>−</button>
    <button className={button} aria-label="+" disabled={zoom>=2} onClick={()=>setZoom(n=>Math.min(2,n+.2))}>+</button>
   </div>
   <p className="text-xs text-slate-500 mt-2">{t.orbit}</p>
  </div>
  <svg viewBox="0 0 540 350" className="w-full max-h-[390px] touch-none cursor-grab" aria-label={copy?.diagram??t.orbit}
   onPointerDown={e=>{pressedBox.current=(e.target as Element).getAttribute("data-box-id");drag.current={x:e.clientX,y:e.clientY,moved:false};e.currentTarget.setPointerCapture(e.pointerId);}}
   onPointerMove={e=>{const d=drag.current;if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.abs(dx)+Math.abs(dy)>2)d.moved=true;setYaw(n=>n+dx*.01);setPitch(n=>Math.max(0,Math.min(Math.PI/2,n+dy*.01)));d.x=e.clientX;d.y=e.clientY;}}
   onPointerUp={e=>{if(!drag.current?.moved && pressedBox.current && pressedBox.current!=="base")setSelected(pressedBox.current);drag.current=null;e.currentTarget.releasePointerCapture(e.pointerId);}}
   onPointerCancel={()=>{drag.current=null;}}>
   <rect width="540" height="350" fill="#f8fafc"/>
   {faces.map(({b,i,points})=><polygon aria-hidden="true" key={`${b.id}-${i}`} data-box-id={b.id} points={points} fill={`#${b.color.toString(16).padStart(6,'0')}`} stroke={b.id===selected?'#0f172a':'#ffffff'} strokeWidth={b.id===selected?2.5:.8} style={{filter:`brightness(${[.65,1.15,.8,.9,.8,.9][i]})`}}
><title>{`${b.id} · ${b.label}`}</title></polygon>)}
  </svg>
  <div className="px-5 pb-5 space-y-3 print:hidden">
   <div className="flex flex-wrap gap-2">
    <button className={button} disabled={!steps.length} onClick={()=>{if(playing){setPlaying(false);return;}if(step===steps.length){setStep(0);setSelected(null);}setPlaying(true);}}>{playing?t.pause:t.play}</button>
    <button className={button} disabled={step===0} onClick={()=>go(step-1)}>{t.previous}</button>
    <button className={button} disabled={step===steps.length} onClick={()=>go(step+1)}>{t.next}</button>
    <button className={button} onClick={()=>go(steps.length)}>{t.all}</button>
   </div>
   <label className="block text-sm">{t.step} {step} / {steps.length}<input aria-label={t.step} type="range" min={0} max={steps.length} value={step} onChange={e=>go(+e.target.value)} className="w-full accent-blue-600"/></label>
   <p className="text-sm text-slate-600 min-h-5" aria-live="polite">{chosen?`${chosen.id} · ${chosen.label} · ${length(chosen.l)} × ${length(chosen.w)} × ${length(chosen.h)} · ${weight(chosen.weight??0)}`:copy?.diagramNote}</p>
   <details><summary className="cursor-pointer text-sm font-semibold">{t.list}</summary><ol className="max-h-48 overflow-y-auto mt-2 space-y-1">{steps.map((b,i)=><li key={b.id}><button className={`w-full text-left text-sm rounded p-2 ${selected===b.id?'bg-blue-100':'hover:bg-slate-100'}`} aria-pressed={selected===b.id} onClick={()=>{setPlaying(false);setStep(n=>Math.max(n,i+1));setSelected(b.id);}}>{i+1}. {b.id} · {b.label} · {length(b.l)} × {length(b.w)} × {length(b.h)}</button></li>)}</ol></details>
  </div>
 </div>;
}
