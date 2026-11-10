import {useState} from 'react';
import {track} from '../lib/track';
/** Available before export; sends fixed categories only, never cargo contents. */
export default function ToolFeedback({zh=false}:{zh?:boolean}){
 const [open,setOpen]=useState(false),[sent,setSent]=useState(false);
 const T=(en:string,cn:string)=>zh?cn:en;
 return <div className="text-sm">
 <button type="button" aria-expanded={open} onClick={()=>{setOpen(v=>!v);if(!open)track('tool_feedback_open','planner');}} className="text-blue-700 underline">{T('Having trouble? Tell us what to improve','遇到問題？話畀我哋知')}</button>
 {open&&(sent?<p role="status" className="mt-2 text-emerald-800">{T('Thank you. Your feedback is recorded.','多謝，意見已記錄。')}</p>:<div className="mt-2"><p className="text-xs text-slate-600 mb-2">{T('Optional. Only your selected reason is sent, not your cargo details.','自願回答，只傳送所選原因，唔會傳送貨物資料。')}</p><div className="flex flex-wrap gap-2">{[['input','Entering cargo','輸入貨物'],['layout','Need another layout','需要另一種擺法'],['controls','3D controls','3D 操作'],['export','Export / email step','匯出／電郵步驟'],['report','Report information','報告資料'],['slow','Too slow','速度太慢'],['useful','Works for my task','幫到我完成工作']].map(([key,en,cn])=><button type="button" key={key} className="rounded border px-3 py-2" onClick={()=>{track('tool_feedback',`planner:${key}`);setSent(true);}}>{T(en,cn)}</button>)}</div></div>)}
 </div>;
}
