import {useState} from 'react';
import {readEntitlement} from '../lib/entitlement';
import {useApp} from '../context/AppContext';
export default function EmailFollowup({format}:{format:'pdf'|'csv'}){
 const {lang}=useApp();const T=(a:string,b:string)=>lang==='zh'?b:a;
 const [email,setEmail]=useState(()=>readEntitlement().email||''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[sent,setSent]=useState(false),[error,setError]=useState('');
 // Only expose when the sender, schedule and reply page have been verified.
 if((import.meta as ImportMeta & {env?:Record<string,string>}).env?.VITE_EMAIL_FOLLOWUP_ENABLED!=='true')return null;
 if(sent)return <p role="status" className="text-sm mt-3">{T('Preference saved. If eligible, we will send one follow-up in about five days.','設定已儲存；如符合跟進條件，約五日後會收到一封電郵。')}</p>;
 return <form className="border-t mt-4 pt-3 space-y-2" onSubmit={async e=>{e.preventDefault();if(!consent||busy)return;setBusy(true);setError('');try{const r=await fetch('/api/followup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,consent:true,version:'export-followup-v1',format})});if(!r.ok)throw Error();setSent(true);}catch{setError(T('Could not save your preference. Your export is unaffected.','未能儲存設定，唔影響匯出。'));}finally{setBusy(false);}}}>
 <label className="text-sm flex gap-2"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>{T('Email me once in about five days to ask whether this plan worked.','約五日後寄一封電郵，問我呢個方案用成點。')}</label>
 {consent&&<><input aria-label={T('Follow-up email','跟進電郵')} type="email" autoComplete="email" required maxLength={200} value={email} onChange={e=>setEmail(e.target.value)} className="w-full border rounded p-2"/><p className="text-xs text-slate-500">{T('Optional. No product updates. You can stop follow-ups from the email.','自願參與，唔會訂閱產品更新，可從電郵停止跟進。')}</p><button disabled={busy} className="border rounded px-3 py-2 text-sm">{busy?T('Saving…','儲存中…'):T('Save email preference','儲存電郵設定')}</button></>}
 {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
 </form>;
}
