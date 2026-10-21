import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { track } from '../lib/track';
import { feedbackMeta, feedbackAnswerMeta, RECIPIENTS, CHOICE_REASONS } from '../lib/exportFeedback';
import type { ExportFormat } from '../lib/exportTracking';

/** One click records usefulness. Extra context is optional and never delays output. */
export default function ExportFeedback({tool, format, onClose}: {tool:'planner'|'warehouse';format:ExportFormat|null;onClose:()=>void}) {
 const {lang}=useApp();const T=(a:string,b:string)=>lang==='zh'?b:a;
 const key=`dp_export_feedback_${tool}`;
 const [done,setDone]=useState(()=>{try{return sessionStorage.getItem(key)==='done';}catch{return false;}});
 const [outcome,setOutcome]=useState(''),[purpose,setPurpose]=useState('unknown'),[blocker,setBlocker]=useState('');
 const shown=useRef(false),answered=useRef(false);
 useEffect(()=>{if(format&&!done&&!shown.current){shown.current=true;track('export_feedback_shown',`${tool}:${format}`);}},[format,done,tool]);
 const remember=()=>{try{sessionStorage.setItem(key,'done');}catch{}};
 const finish=()=>{remember();setDone(true);onClose();};
 if(!format||done)return null;
 const meta=feedbackMeta(tool,format,outcome,purpose,blocker);
 const answer=(value:string)=>{if(answered.current)return;const m=feedbackAnswerMeta(tool,format,'usefulness',value);if(!m)return;answered.current=true;setOutcome(value);remember();track('export_usefulness',m);};
 const detail=(kind:'recipient'|'choice',value:string)=>{const m=feedbackAnswerMeta(tool,format,kind,value);if(m)track(kind==='recipient'?'export_recipient':'export_choice',m);};
 return <section aria-label={T('Report feedback','報告意見')} className="fixed bottom-3 right-3 left-3 sm:left-auto sm:w-96 z-40 rounded-xl border border-slate-300 bg-white p-4 shadow-xl max-h-[75vh] overflow-y-auto print:hidden">
 <div className="flex justify-between gap-3"><h2 className="font-bold">{T('Can you use this report for your task?','呢份報告幫唔幫到你完成工作？')}</h2><button type="button" className="px-2" aria-label={T('Skip feedback','略過意見')} onClick={()=>{if(!answered.current)track('export_feedback_skipped',`${tool}:${format}`);finish();}}>×</button></div>
 <p className="text-xs text-slate-600 my-2">{T('Optional. Your export has already opened or started. Only selected answers are sent, not shipment details.','自願回答，匯出已開啟或開始。只傳送所選答案，唔會傳送貨物內容。')}</p>
 {!outcome?<div className="flex flex-wrap gap-2">{[['usable','Ready to use','可以直接用'],['edit','Needs changes','仲要修改'],['explore','Just exploring','只係試用']].map(([v,en,zh])=><button key={v} type="button" className="border rounded p-2" onClick={()=>answer(v)}>{T(en,zh)}</button>)}</div>:<>
 <p role="status" className="text-emerald-800 text-sm">{T('Answer saved. You can close this now; the details below are optional.','答案已記錄。可以直接關閉；以下資料可略過。')}</p>
 <form onSubmit={e=>{e.preventDefault();if(meta){track('export_feedback',meta);finish();}}} className="space-y-3 mt-3">
 <label className="block text-sm">{T('Who is the report for? (optional)','報告交畀邊個？（可略過）')}<select defaultValue="" onChange={e=>detail('recipient',e.target.value)} className="block border rounded p-2 w-full"><option value="">{T('Choose…','請選擇…')}</option>{RECIPIENTS.map(([v,en,zh])=><option key={v} value={v}>{T(en,zh)}</option>)}</select></label>
 {outcome==='edit'&&<label className="block text-sm">{T('Main thing to improve','最需要改善嘅地方')}<select required value={blocker} onChange={e=>setBlocker(e.target.value)} className="block border rounded p-2 w-full"><option value="">{T('Choose…','請選擇…')}</option>{[['layout','Report layout','報告版面'],['fields','Missing information','欠缺資料欄位'],['math','Calculation / constraints','計算／限制'],['placement','Cargo arrangement','貨物排位'],['download','Opening / saving file','開啟／儲存檔案'],['other','Something else','其他']].map(([v,en,zh])=><option key={v} value={v}>{T(en,zh)}</option>)}</select></label>}
 <details><summary className="text-sm cursor-pointer">{T('Add more context (optional)','補充用途／選用原因（可略過）')}</summary><label className="block text-sm mt-2">{T('What is it for?','用嚟做乜？')}<select value={purpose} onChange={e=>setPurpose(e.target.value)} className="block border rounded p-2 w-full">{[['unknown','Prefer not to say','暫不回答'],['load','Container / truck loading','裝櫃／裝車'],['pallet','Pallet planning','卡板規劃'],['quote','Freight quote','運費報價'],['crew','Warehouse instructions','倉務交接'],['other','Other task','其他用途']].map(([v,en,zh])=><option key={v} value={v}>{T(en,zh)}</option>)}</select></label><label className="block text-sm mt-2">{T('Main reason for using DimPack today','今次選用 DimPack 嘅主要原因')}<select defaultValue="" onChange={e=>detail('choice',e.target.value)} className="block border rounded p-2 w-full"><option value="">{T('Choose…','請選擇…')}</option>{CHOICE_REASONS.map(([v,en,zh])=><option key={v} value={v}>{T(en,zh)}</option>)}</select></label></details>
 <button disabled={!meta} className="rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-40">{T('Send details','提交補充資料')}</button><button type="button" className="border rounded px-3 py-2 ml-2" onClick={finish}>{T('Done','完成')}</button>
 </form></>}
 </section>;
}
