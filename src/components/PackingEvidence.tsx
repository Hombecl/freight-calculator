import {useEffect,useRef,useState} from 'react';
import {track} from '../lib/track';

/** No dimensions, cargo names or shipment identifiers leave the browser. */
export default function PackingEvidence({revision,signature,count,lang}:{revision:number;signature:string;count:number;lang:string}) {
 const [own,setOwn]=useState(false),[answer,setAnswer]=useState('');
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
  <details className="mt-2"><summary className="cursor-pointer text-blue-700">{T('Does this layout help? (optional)','呢個擺法幫唔幫到你？（可略過）')}</summary>
   <p className="my-2 text-xs text-slate-500">{T('Only selected answers are sent, not your dimensions or product details.','只傳送所選答案，唔會傳送尺寸或產品資料。')}</p>
   {answer?<p role="status">{T('Thank you — feedback recorded.','多謝，意見已記錄。')}</p>:<div className="flex flex-wrap gap-2">{[['usable','Useful for my task','幫到我完成工作'],['constraints','Missing a constraint','欠缺需要嘅限制'],['layout','Need a different arrangement','需要另一種擺法'],['explore','Just exploring','只係試用']].map(([v,en,zh])=><button type="button" className="rounded border p-2" key={v} onClick={()=>{setAnswer(v);track('packing_usefulness',`${own?'own':'unconfirmed'}:${v}`);}}>{T(en,zh)}</button>)}</div>}
  </details>
 </section>;
}
