import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { track } from '../lib/track';
import { feedbackMeta } from '../lib/exportFeedback';
import type { ExportFormat } from '../lib/exportTracking';

/** Non-modal and optional: never delays the file or takes focus from the planner. */
export default function ExportFeedback({tool, format, onClose}: {tool:'planner'|'warehouse';format:ExportFormat|null;onClose:()=>void}) {
  const {lang}=useApp(); const T=(en:string,zh:string)=>lang==='zh'?zh:en;
  const key=`dp_export_feedback_${tool}`;
  const [done,setDone]=useState(()=>{try{return sessionStorage.getItem(key)==='done';}catch{return false;}});
  const [outcome,setOutcome]=useState(''),[purpose,setPurpose]=useState('unknown'),[blocker,setBlocker]=useState('');
  const shown=useRef(false);
  useEffect(()=>{if(format&&!done&&!shown.current){shown.current=true;track('export_feedback_shown',`${tool}:${format}`);}},[format,done,tool]);
  const finish=()=>{setDone(true);try{sessionStorage.setItem(key,'done');}catch{}onClose();};
  if(!format||done)return null;
  const meta=feedbackMeta(tool,format,outcome,purpose,blocker);
  return <section aria-label={T('Report feedback','報告意見')} className="fixed bottom-3 right-3 left-3 sm:left-auto sm:w-96 z-40 rounded-xl border border-slate-300 bg-white p-4 shadow-xl max-h-[75vh] overflow-y-auto print:hidden">
    <div className="flex justify-between gap-3"><h2 className="font-bold">{T('Can you use this report for your task?','呢份報告幫唔幫到你完成工作？')}</h2><button type="button" className="px-2" aria-label={T('Skip feedback','略過意見')} onClick={()=>{track('export_feedback_skipped',`${tool}:${format}`);finish();}}>×</button></div>
    <p className="text-xs text-slate-600 my-2">{T('Optional. Your export has already opened or started. Only your selected answers are sent, not shipment details.','自願回答，匯出已開啟或開始。只傳送所選答案，唔會傳送貨物內容。')}</p>
    <form onSubmit={e=>{e.preventDefault();if(meta){track('export_feedback',meta);finish();}}} className="space-y-3">
      <label className="block text-sm">{T('Usefulness','使用情況')}<select required value={outcome} onChange={e=>setOutcome(e.target.value)} className="block border rounded p-2 w-full"><option value="">{T('Choose…','請選擇…')}</option><option value="usable">{T('Ready to use','可以直接用')}</option><option value="edit">{T('Needs changes','仲要修改')}</option><option value="explore">{T('Just exploring','只係試用')}</option></select></label>
      <label className="block text-sm">{T('What is it for? (optional)','用嚟做乜？（可略過）')}<select value={purpose} onChange={e=>setPurpose(e.target.value)} className="block border rounded p-2 w-full">{[['unknown','Prefer not to say','暫不回答'],['load','Container / truck loading','裝櫃／裝車'],['pallet','Pallet planning','卡板規劃'],['quote','Freight quote','運費報價'],['crew','Warehouse instructions','倉務交接'],['other','Other task','其他用途']].map(([v,en,zh])=><option key={v} value={v}>{T(en,zh)}</option>)}</select></label>
      {outcome==='edit'&&<label className="block text-sm">{T('Main thing to improve','最需要改善嘅地方')}<select required value={blocker} onChange={e=>setBlocker(e.target.value)} className="block border rounded p-2 w-full"><option value="">{T('Choose…','請選擇…')}</option>{[['layout','Report layout','報告版面'],['fields','Missing information','欠缺資料欄位'],['math','Calculation / constraints','計算／限制'],['placement','Cargo arrangement','貨物排位'],['download','Opening / saving file','開啟／儲存檔案'],['other','Something else','其他']].map(([v,en,zh])=><option key={v} value={v}>{T(en,zh)}</option>)}</select></label>}
      <button disabled={!meta} className="rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-40">{T('Send feedback','提交意見')}</button>
    </form>
  </section>;
}
