import {normalizedExportEmail} from '../lib/exportPreflight';
import { useEffect, useRef, useState } from 'react';
import { X, Download } from 'lucide-react';
import { LEAD_PURPOSES, validLeadPurpose, type LeadPurpose } from '../lib/leadPurpose';
import { IS_ZH } from '../lib/locale';
import { track } from '../lib/track';

export interface PaywallAuth {
  enabled: boolean; isSignedIn: boolean; email: string | null; isPro: boolean;
  onSignIn: (email: string) => Promise<{ error: string | null }>;
  onUpgrade: () => void; onSignOut: () => void;
}
interface Props {
  open: boolean; onClose: () => void;
  onSubmit: (email: string, proWaitlist: boolean, purpose?: LeadPurpose) => void;
  auth?: PaywallAuth; proPrice?: string;
}
const PURPOSE_ZH = ['裝櫃或裝車','規劃卡板或檢查高度','準備運費報價','分享裝載指示','探索或學習','其他工作'];
/** Free export lead capture. Billing belongs in account settings, not this task. */
export default function PaywallModal({open,onClose,onSubmit}: Props) {
  const T=(en:string,zh:string)=>IS_ZH?zh:en;
  const [email,setEmail]=useState(''),[wantPro,setWantPro]=useState(false);
  const [purpose,setPurpose]=useState<LeadPurpose>();
  const [touched,setTouched]=useState(false);
  const dialog=useRef<HTMLDivElement>(null),input=useRef<HTMLInputElement>(null);
  const closeRef=useRef(onClose);closeRef.current=onClose;
  const close=(reason:string)=>{track('export_gate_close_reason',reason);closeRef.current();};
  useEffect(()=>{
    if(!open)return;
    const previous=document.activeElement as HTMLElement|null;
    setTouched(false);input.current?.focus();
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.preventDefault();track('export_gate_close_reason','escape');closeRef.current();}
      if(e.key!=='Tab')return;
      const nodes=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),summary,[tabindex="0"]')??[]).filter(n=>n.getClientRects().length);
      const first=nodes[0],last=nodes[nodes.length-1];
      if(e.shiftKey&&(document.activeElement===first||!dialog.current?.contains(document.activeElement))){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&(document.activeElement===last||!dialog.current?.contains(document.activeElement))){e.preventDefault();first?.focus();}
    };
    document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('keydown',key);previous?.focus();};
  },[open]);
  if(!open)return null;
  const valid=normalizedExportEmail(email);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={()=>close('backdrop')}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="export-gate-title" className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90dvh] overflow-y-auto p-6" onClick={e=>e.stopPropagation()}>
      <div className="flex items-start justify-between gap-3"><div><h2 id="export-gate-title" className="font-bold text-slate-800">{T('Download your plan — free','免費下載你的方案')}</h2><p className="text-sm text-slate-600 mt-1">{T('Enter your email to open PDF and CSV exports. No payment or password required.','填寫電郵即可匯出 PDF 及 CSV，毋須付款或設定密碼。')}</p></div><button type="button" onClick={()=>close('button')} aria-label={T('Close export dialog','關閉匯出視窗')} className="p-2"><X size={18}/></button></div>
      <form noValidate onSubmit={e=>{e.preventDefault();setTouched(true);if(valid)onSubmit(valid,wantPro,purpose);else{track('export_gate_validation','invalid_email');input.current?.focus();}}} className="mt-4 space-y-3">
        <label htmlFor="export-email" className="block text-sm font-medium">{T('Email address','電郵地址')}</label>
        <input ref={input} id="export-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={e=>setEmail(e.target.value)} aria-invalid={touched&&!valid} aria-describedby={touched&&!valid?'export-email-error':'export-email-privacy'} placeholder="you@company.com" className="w-full rounded-lg border border-slate-300 px-3 py-2"/>
        {touched&&!valid&&<p id="export-email-error" role="alert" className="text-sm text-red-700">{T('Enter a valid email address.','請輸入有效電郵地址。')}</p>}
        <details className="text-sm"><summary className="cursor-pointer text-slate-600">{T('Add your task (optional)','補充用途（可略過）')}</summary><label className="block mt-2">{T('What is this plan for?','方案用途')}<select className="mt-1 w-full border rounded-lg p-2" value={purpose??''} onChange={e=>setPurpose(validLeadPurpose(e.target.value))}><option value="">{T('Choose or skip','選擇或略過')}</option>{LEAD_PURPOSES.map(([v,en],i)=><option key={v} value={v}>{T(en,PURPOSE_ZH[i])}</option>)}</select></label></details>
        <label className="flex gap-2 items-start text-sm text-slate-600"><input type="checkbox" checked={wantPro} onChange={e=>setWantPro(e.target.checked)}/>{T('Email me product updates (optional)','電郵通知產品更新（自願訂閱）')}</label>
        <button type="submit" className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-white font-semibold"><Download size={16}/>{T('Unlock & download','解鎖並下載')}</button>
        <p id="export-email-privacy" className="text-xs text-slate-500">{T('Your email unlocks export on this browser. Product updates are sent only if you opt in.','電郵會解鎖此瀏覽器的匯出功能。只有自願訂閱先會收到產品更新。')}</p>
      </form>
    </div>
  </div>;
}
