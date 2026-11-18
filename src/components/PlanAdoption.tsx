import {useEffect,useRef,useState} from 'react';
import {useApp} from '../context/AppContext';
import {track} from '../lib/track';
import EmailFollowup from './EmailFollowup';
import {ADOPTION_KEY,validReminder,reminderDue,deferReminder,adoptionMeta,type AdoptionReminder} from '../lib/planAdoption';
const DAY=86400000;
export default function PlanAdoption({format,job,onClose}:{format:'pdf'|'csv'|null;job:string;onClose:()=>void}) {
 const {lang}=useApp(); const T=(en:string,zh:string)=>lang==='zh'?zh:en;
 const [reminder,setReminder]=useState<AdoptionReminder|null>(()=>{try{const r=validReminder(JSON.parse(localStorage.getItem(ADOPTION_KEY)||'null'));if(!r)localStorage.removeItem(ADOPTION_KEY);return r;}catch{return null;}});
 const asked=useRef(new Set<string>());
 const [dismissed,setDismissed]=useState(false),[intent,setIntent]=useState(''),[frequency,setFrequency]=useState(''),[result,setResult]=useState(''),[reason,setReason]=useState(''),[error,setError]=useState('');
 useEffect(()=>{if(format){if(asked.current.has(job)){onClose();return;}setIntent('');setError('');track('adoption_prompt','p:export');}},[format,job]);
 const due=!!reminder&&reminderDue(reminder)&&!dismissed&&!format;
 useEffect(()=>{if(due)track('adoption_followup_shown','p');},[due]);
 if(!format&&!due)return null;
 const close=()=>{if(format)asked.current.add(job);setDismissed(true);onClose();};
 const write=(r:AdoptionReminder|null)=>{try{if(r)localStorage.setItem(ADOPTION_KEY,JSON.stringify(r));else localStorage.removeItem(ADOPTION_KEY);setReminder(r);return true;}catch{setError(T('Could not save on this device.','本機未能儲存。'));return false;}};
 const submit=()=>{if(!reminder)return;const meta=adoptionMeta(result,reason,reminder.frequency);if(!meta)return;if(!write(result==='not_yet'?deferReminder(reminder):null))return;track('plan_adoption',meta);close();};
 return <section aria-label={T('Plan use feedback','方案使用回饋')} className="fixed bottom-3 right-3 left-3 sm:left-auto sm:w-96 z-40 rounded-xl border border-slate-300 bg-white p-4 shadow-xl max-h-[70vh] overflow-y-auto print:hidden">
 <div className="flex justify-between gap-3"><h2 className="font-bold">{due?T('Did you use your previous plan?','上次匯出嘅方案用成點？'):T('Is this for a real shipment?','今次係真實工作，定試用？')}</h2><button type="button" aria-label={T('Close feedback','關閉回饋')} onClick={()=>{if(due&&reminder)write(deferReminder(reminder));close();}}>×</button></div>
 <p className="my-2 text-xs text-slate-600">{T('Optional. No cargo details are sent.','自願回答，唔會傳送貨物資料。')}</p>
 {due?<>
 <p className="text-xs text-slate-500 mb-2">{T('Exported on','匯出日期')} {new Date(reminder!.created).toLocaleDateString()}</p>
 <select aria-label={T('Result','使用結果')} value={result} onChange={e=>{setResult(e.target.value);setReason('');}} className="border rounded p-2 w-full"><option value="">{T('Choose…','請選擇…')}</option>{[['matched','Used as planned','按方案使用'],['adjusted','Used after changes','修改後使用'],['unused','Did not use it','冇採用'],['not_yet','Not used yet','仲未使用']].map(([v,en,zh])=><option key={v} value={v}>{T(en,zh)}</option>)}</select>
 {['adjusted','unused'].includes(result)&&<select aria-label={T('Main reason','主要原因')} value={reason} onChange={e=>setReason(e.target.value)} className="border rounded p-2 w-full mt-2"><option value="">{T('Main reason…','主要原因…')}</option>{[['placement','Layout difficult to execute','擺法難執行'],['constraints','Missing loading constraints','欠缺裝載限制'],['report','Report missing information','報告欠資料'],['controls','Difficult to use','操作困難'],['changed_order','Shipment changed or cancelled','訂單更改或取消'],['other','Other','其他']].map(([v,en,zh])=><option key={v} value={v}>{T(en,zh)}</option>)}</select>}
 <button type="button" disabled={!adoptionMeta(result,reason,reminder!.frequency)} onClick={submit} className="mt-3 rounded bg-blue-600 text-white px-3 py-2 disabled:opacity-40">{T('Send','提交')}</button>
 <button type="button" className="ml-3 underline text-sm" onClick={()=>{if(write(null))close();}}>{T('Forget reminder','移除此提醒')}</button>
 </>:<>
 {!intent?<div className="flex gap-2">{[['real','Real work','真實工作'],['explore','Just exploring','只係試用']].map(([v,en,zh])=><button type="button" key={v} className="border rounded px-3 py-2" onClick={()=>{setIntent(v);track('plan_intent',`p:${format}:${v}`);if(v==='explore')close();}}>{T(en,zh)}</button>)}</div>:<>
 <label className="text-sm">{T('How often do you plan shipments?','通常幾耐規劃一次出貨？')}<select value={frequency} onChange={e=>setFrequency(e.target.value)} className="border rounded p-2 w-full mt-1"><option value="">{T('Choose…','請選擇…')}</option>{[['weekly','Weekly or more','每週或更頻密'],['monthly','Monthly','每月'],['occasional','Occasionally','間中']].map(([v,en,zh])=><option key={v} value={v}>{T(en,zh)}</option>)}</select></label>
 <p className="text-xs text-slate-500 my-2">{T('Save a reminder on this device for up to 90 days. We will ask here when you return after two days.','在本機保存提醒最多90日，兩日後再返嚟時喺呢度詢問結果。')}</p>
 <button type="button" disabled={!frequency} className="rounded bg-blue-600 text-white px-3 py-2 disabled:opacity-40" onClick={()=>{if(reminder){track('adoption_reminder','p:already_pending');close();return;}const now=Date.now();if(write({job,created:now,next:now+2*DAY,frequency})){track('adoption_reminder',`p:opt_in:${frequency}`);close();}}}>{T('Ask me next time','下次問我')}</button>
 <button type="button" className="ml-3 underline text-sm" onClick={close}>{T('Done','完成')}</button>
 </>}
 </>}{format&&intent==='real'&&<EmailFollowup format={format}/>} {error&&<p role="alert" className="text-sm text-red-700 mt-2">{error}</p>}
 </section>;
}
