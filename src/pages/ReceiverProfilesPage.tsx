import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useApp } from '../context/AppContext';
import { loadProfiles, parseProfile, type ReceiverProfile } from '../lib/receiverProfiles';
import { deviceProfiles, PROFILE_STORAGE } from '../lib/receiverStorage';
import { track } from '../lib/track';

export default function ReceiverProfilesPage() {
  const { lang } = useApp(); const T = (en:string,zh:string) => lang === 'zh' ? zh : en;
  const [profiles,setProfiles] = useState(() => { try { return deviceProfiles(localStorage.getItem('dp_receiver_profiles')); } catch { return loadProfiles(); } });
  const [draft,setDraft] = useState<ReceiverProfile | null>(null);
  const [rules,setRules] = useState('[]'); const [error,setError] = useState(''); const [message,setMessage] = useState('');
  const edit = (p:ReceiverProfile) => { const d = {...p,id:`my-${Date.now()}`,name:`${p.name} (${T('my profile','我嘅設定')})`,template:false,approvedBy:undefined,approvedAt:undefined}; setDraft(d);setRules(JSON.stringify(d.rules,null,2));setError(''); };
  const save = () => { try {
    const p = parseProfile({...draft,rules:JSON.parse(rules)});
    if (loadProfiles().some(v => v.id === p.id)) throw new Error(T('Use a unique custom ID','請用獨立自訂 ID'));
    const next = [...profiles.filter(v => v.id !== p.id),p];
    localStorage.setItem(PROFILE_STORAGE,JSON.stringify(next.filter(v => !loadProfiles().some(s => s.id === v.id))));
    setProfiles(next);setMessage(T('Saved locally','已儲存喺本機'));setError('');track('receiver_profile_save');
  } catch(e) {setError(String(e));} };
  return <main className="max-w-5xl mx-auto p-6 space-y-5">
    <Helmet><title>{T('Receiver profiles','收貨方設定')} | DimPack3D</title><meta name="description" content={T('Versioned customer-approved pallet screening profiles.','有版本記錄、由客戶確認嘅卡板篩查設定。')} /></Helmet>
    <h1 className="text-3xl font-bold">{T('Receiver profiles','收貨方設定')}</h1>
    <p className="bg-amber-100 p-4">{T('Templates must be confirmed with the buyer. We record your approval; these checks do not predict acceptance or chargebacks.','範本必須同買家確認。我哋只記錄你嘅確認；檢查唔代表會獲接收，亦唔預測扣款。')}</p>
    <div className="grid md:grid-cols-2 gap-4">{profiles.map(p => <article key={p.id} className="border rounded p-4 space-y-2">
      <h2 className="font-bold">{p.name}</h2>{p.template && <p className="bg-amber-100">{T('Verify with your buyer','請同買家核實')}</p>}
      <p data-testid="profile-source" className="text-sm">{T('Source / date','來源／日期')}: {p.source.startsWith('https://') ? <a className="underline" href={p.source}>{p.source}</a> : p.source} · {p.verifiedAt}</p>
      {p.verificationNote && <p>{p.verificationNote}</p>}{!!p.unverified?.length && <p>{T('Unverified','未核實')}: {p.unverified.join(', ')}</p>}
      {p.approvedBy && <p>{T('Customer approval','客戶確認')}: {p.approvedBy} · {p.approvedAt}</p>}
      {!loadProfiles().some(s=>s.id===p.id)&&<button className="border p-2" onClick={()=>{setDraft(structuredClone(p));setRules(JSON.stringify(p.rules,null,2));setError('');}}>{T('Edit my profile','編輯我嘅設定')}</button>} <button className="border p-2" onClick={() => edit(p)}>{T('Duplicate as my profile','複製為我嘅設定')}</button>
    </article>)}</div>
    <label className="block">{T('Import profile JSON','匯入設定 JSON')}<input type="file" accept=".json,application/json" onChange={async e => {try { const f=e.target.files?.[0];if (!f) return; if(f.size>100000) throw new Error('File too large');const p=parseProfile(JSON.parse(await f.text()));setDraft(p);setRules(JSON.stringify(p.rules,null,2));setError(''); }catch(err){setError(String(err));}}} /></label>
    {draft && <section className="border p-4 space-y-3"><h2 className="font-bold">{T('Edit profile — cm / kg','編輯設定 — cm／kg')}</h2>
      {(['id','name','source','verifiedAt','approvedBy','approvedAt'] as const).map((k,i) => <label className="block" key={k}>{[T('ID','ID'),T('Name','名稱'),T('Source','來源'),T('Source date','來源日期'),T('Approved by (customer)','確認人（客戶）'),T('Approval date','確認日期')][i]}<input className="border p-2 w-full" type={k.endsWith('At')?'date':'text'} value={draft[k]??''} onChange={e=>setDraft({...draft,[k]:e.target.value || undefined})}/></label>)}
      <label><input type="checkbox" checked={draft.template} onChange={e=>setDraft({...draft,template:e.target.checked})}/>{T('Starting template — verify with buyer','起始範本 — 請同買家核實')}</label>
      {(['pallet','limits'] as const).map(group => <fieldset key={group}><legend>{group==='pallet'?T('Pallet','卡板'):T('Receiver limits','收貨限制')}</legend><div className="grid grid-cols-2 gap-2">{(group==='pallet'?['l','w','baseHeight','maxHeight','maxWeight','tareWeight']:['maxLoadedHeight','maxGrossWeight','overhangCm']).map(k=><label key={k}>{({l:T('Length (cm)','長度（cm）'),w:T('Width (cm)','闊度（cm）'),baseHeight:T('Pallet base height (cm)','板底高度（cm）'),maxHeight:T('Packing height cap (cm)','砌板高度上限（cm）'),maxWeight:T('Cargo weight cap (kg)','貨物重量上限（kg）'),tareWeight:T('Pallet tare (kg)','卡板自重（kg）'),maxLoadedHeight:T('Receiver loaded height (cm)','收貨連板高度（cm）'),maxGrossWeight:T('Receiver gross weight (kg)','收貨毛重（kg）'),overhangCm:T('Overhang allowance (cm)','超出板邊限額（cm）')} as Record<string,string>)[k]}<input className="border p-2 w-full" type="number" min="0" step="any" value={(draft[group] as Record<string,number>)[k]??''} onChange={e=>{const next={...draft[group]} as Record<string,unknown>;if(e.target.value==='')delete next[k];else next[k]=+e.target.value;setDraft({...draft,[group]:next});}}/></label>)}</div></fieldset>)}
      <label className="block">{T('Clampable (manual confirmation only)','可夾抱（只供人手確認）')}<select className="border" value={draft.limits.clampable===undefined?'':String(draft.limits.clampable)} onChange={e=>{const limits={...draft.limits};if(e.target.value==='')delete limits.clampable;else limits.clampable=e.target.value==='true';setDraft({...draft,limits});}}><option value="">{T('Unspecified','未指定')}</option><option value="true">{T('Yes','係')}</option><option value="false">{T('No','唔係')}</option></select></label>
      <label className="block">{T('Unverified fields (one per line; remove only after customer confirmation)','未核實欄位（每行一項；客戶確認後先移除）')}<textarea className="border w-full" value={draft.unverified?.join('\n')??''} onChange={e=>setDraft({...draft,unverified:e.target.value.split('\n').filter(Boolean)})}/></label>
      <fieldset className="space-y-2"><legend>{T('Crew rules','倉務規則')}</legend>
        {draft.rules.map((r,i)=><div key={i} className="grid sm:grid-cols-4 gap-2">
          <label>{T('Rule code','規則代碼')}<input className="border w-full" value={r.code} onChange={e=>{const next=draft.rules.map((r,j)=>j===i?{...r,code:e.target.value}:r);setDraft({...draft,rules:next});setRules(JSON.stringify(next,null,2));}}/></label>
          <label>{T('Instructions','指示')}<input className="border w-full" value={r.text} onChange={e=>{const next=draft.rules.map((r,j)=>j===i?{...r,text:e.target.value}:r);setDraft({...draft,rules:next});setRules(JSON.stringify(next,null,2));}}/></label>
          <label>{T('Check','檢查')}<select className="border w-full" value={r.check} onChange={e=>{const next=draft.rules.map((r,j)=>j===i?{...r,check:e.target.value as typeof r.check}:r);setDraft({...draft,rules:next});setRules(JSON.stringify(next,null,2));}}>{(['height','gross','footprint','overhang','stack','upright','manual'] as const).map((c,i)=><option key={c} value={c}>{[T('Loaded height','連板高度'),T('Gross weight','毛重'),T('Footprint','板面尺寸'),T('Overhang','超出板邊'),T('Stack strength','堆疊承重'),T('Upright','直立'),T('Manual checklist','人手清單')][i]}</option>)}</select></label>
          <button className="border" onClick={()=>{const next=draft.rules.filter((_,j)=>j!==i);setDraft({...draft,rules:next});setRules(JSON.stringify(next,null,2));}}>{T('Remove rule','移除規則')}</button>
        </div>)}
        <button className="border p-2" onClick={()=>{const next=[...draft.rules,{code:`MANUAL_${draft.rules.length+1}`,text:T('Crew confirms','倉務員確認'),check:'manual' as const}];setDraft({...draft,rules:next});setRules(JSON.stringify(next,null,2));}}>{T('Add rule','新增規則')}</button>
      </fieldset>
      <button className="border p-2" onClick={save}>{T('Save locally','儲存喺本機')}</button> <button className="border p-2" onClick={()=>{try{const p=parseProfile({...draft,rules:JSON.parse(rules)});const url=URL.createObjectURL(new Blob([JSON.stringify(p,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`${p.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);track('receiver_profile_export');}catch(e){setError(String(e));}}}>{T('Export JSON','匯出 JSON')}</button>
    </section>}{error&&<p role="alert">{error}</p>}<p role="status">{message}</p>
  </main>;
}
