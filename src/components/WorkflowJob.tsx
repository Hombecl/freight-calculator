import {resumeWorkflowJob} from '../lib/workflowUsage';
import {useState} from 'react';
import {useApp} from '../context/AppContext';
export interface WorkflowJobState {id:string;own:boolean}
export function useWorkflowJob(tool:string){
 const key=`dp_active_job_${tool}`;
 const [job,setJob]=useState<WorkflowJobState>(()=>{try{const v=JSON.parse(localStorage.getItem(key)??'null');if(v&&typeof v.id==='string')return resumeWorkflowJob(v);}catch{}return {id:crypto.randomUUID(),own:false};});
 const update=(next:WorkflowJobState)=>{setJob(next);try{localStorage.setItem(key,JSON.stringify(next));}catch{}};
 return [job,update] as const;
}
export default function WorkflowJob({job,onChange}:{job:WorkflowJobState;onChange:(next:WorkflowJobState)=>void}){
 const {lang}=useApp();const T=(a:string,b:string)=>lang==='zh'?b:a;
 return <section className="rounded-lg border p-3 print:hidden space-y-3"><label className="flex min-h-11 items-start gap-2 text-sm leading-relaxed"><input className="mt-1 h-4 w-4 !min-h-0 shrink-0" type="checkbox" checked={job.own} onChange={e=>onChange({...job,own:e.target.checked})}/> {T('This is my own job, not a sample','這是我自己的工作，並非範例')}</label><button className="border rounded px-3 py-2 text-sm" onClick={()=>onChange({id:crypto.randomUUID(),own:true})}>{T('Start next job (keep inputs)','開始下一份工作（保留輸入）')}</button><p className="text-xs leading-relaxed text-slate-600">{T('Keep the same job while revising it. Start the next job for a different shipment or analysis. Confirm own-job again after reopening; the job identity is retained.','修改時沿用同一工作；另一批出貨或分析才開始下一份。重開後請重新確認是否自己的工作；工作編號會保留。')}</p></section>;
}
