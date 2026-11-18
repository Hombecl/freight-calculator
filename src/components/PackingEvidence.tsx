import {useEffect,useRef,useState} from 'react';
import {track} from '../lib/track';

/** No dimensions, cargo names or shipment identifiers leave the browser. */
export default function PackingEvidence({revision,signature,count,lang}:{revision:number;signature:string;count:number;lang:string}) {
 const [own,setOwn]=useState(false),[answer,setAnswer]=useState(''),[detail,setDetail]=useState('');
 const seen=useRef(new Set<string>()),started=useRef(false);
 const T=(en:string,zh:string)=>lang==='zh'?zh:en;
 useEffect(()=>{
  if(!revision)return;
  const timer=setTimeout(()=>{
   if(!started.current){started.current=true;track('packing_input_started','edited');}
   if(seen.current.has(signature))return;
   if(seen.current.size>=100)seen.current.delete(seen.current.values().next().value!);
   seen.current.add(signature);
   track('packing_result',`${own?'own':'unconfirmed'}:${count>0?'fit':'no_fit'}`);
  },800);
  return ()=>clearTimeout(timer);
 },[revision,signature,count,own]);
 if(!revision)return null;
 return <section aria-label={T('Packing feedback','裝箱意見')} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
  <label className="flex items-center gap-2"><input type="checkbox" checked={own} onChange={e=>{setOwn(e.target.checked);track('packing_job_context',e.target.checked?'own':'unconfirmed');}}/>{T('These dimensions are for my own job','呢組尺寸係我自己嘅工作')}</label>
  <div className="mt-3 border-t pt-3">
   <p className="mb-2 font-medium">{T('Does this layout help?','呢個擺法幫唔幫到你？')}</p>
   {!answer?<div className="flex flex-wrap gap-2">{[['usable','Useful','有幫助'],['constraints','Missing a constraint','欠缺限制'],['layout','Different arrangement','想換擺法'],['explore','Just exploring','只係試用']].map(([v,en,zh])=><button type="button" className="rounded-lg border px-3 py-2 hover:border-blue-400 hover:bg-blue-50" key={v} onClick={()=>{setAnswer(v);track('packing_usefulness',`${own?'own':'unconfirmed'}:${v}`);}}>{T(en,zh)}</button>)}</div>:
   (answer==='constraints'||answer==='layout')&&!detail?<div>
    <p className="mb-2 text-sm">{T('What would help?','你需要邊方面改善？')}</p>
    <div className="flex flex-wrap gap-2">{[['orientation','Keep upright / rotation','方向／旋轉'],['stacking','Stacking limits','堆疊限制'],['spacing','Clearance / padding','間隙／緩衝'],['grouping','Keep items together','同組放埋'],['access','Loading access','裝卸空間'],['other','Something else','其他']].map(([v,en,zh])=><button type="button" key={v} className="rounded-lg border px-3 py-2 hover:bg-blue-50" onClick={()=>{setDetail(v);track('packing_need',`${answer}:${v}`);}}>{T(en,zh)}</button>)}</div>
    <button type="button" className="mt-2 py-2 text-xs text-slate-500" onClick={()=>setDetail('skip')}>{T('Skip','略過')}</button>
   </div>:<p role="status" className="text-blue-700">{T('Thank you — feedback recorded.','多謝，已記錄。')}</p>}
  </div>
 </section>;
}
