import { ruleText, profileText, unverifiedText } from '../lib/auditPageLocale';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useApp } from '../context/AppContext';
import { loadProfiles, parseProfile, type ReceiverProfile } from '../lib/receiverProfiles';
import { deviceProfiles, PROFILE_STORAGE } from '../lib/receiverStorage';
import { track } from '../lib/track';

const inputCls = 'w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const btnCls = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-40';
const primaryCls = 'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 text-sm font-bold disabled:opacity-50';

export default function ReceiverProfilesPage() {
  const { lang } = useApp(); const T = (en:string,zh:string) => lang === 'zh' ? zh : en;
  const [profiles,setProfiles] = useState(() => { try { return deviceProfiles(localStorage.getItem('dp_receiver_profiles')); } catch { return loadProfiles(); } });
  const [draft,setDraft] = useState<ReceiverProfile | null>(null);
  const [rules,setRules] = useState('[]'); const [error,setError] = useState(''); const [message,setMessage] = useState('');
  const edit = (p:ReceiverProfile) => { const d = {...p,id:`my-${Date.now()}`,name:`${profileText(p, 'name', lang)} (${T('my profile','我嘅設定')})`,template:false,approvedBy:undefined,approvedAt:undefined}; setDraft(d);setRules(JSON.stringify(d.rules,null,2));setError(''); };
  const save = () => { try {
    const p = parseProfile({...draft,rules:JSON.parse(rules)});
    if (loadProfiles().some(v => v.id === p.id)) throw new Error(T('Use a unique custom ID','請用獨立自訂 ID'));
    const next = [...profiles.filter(v => v.id !== p.id),p];
    localStorage.setItem(PROFILE_STORAGE,JSON.stringify(next.filter(v => !loadProfiles().some(s => s.id === v.id))));
    setProfiles(next);setMessage(T('Saved locally','已儲存喺本機'));setError('');track('receiver_profile_save');
  } catch(e) {setError(String(e));} };
  return <main className="[&_input[type=file]]:max-w-full [&_fieldset]:min-w-0 break-words max-w-6xl mx-auto px-4 py-8 space-y-5">
    <Helmet><title>{T('Receiver profiles','收貨方設定')} | DimPack3D</title><meta name="description" content={T('Versioned customer-approved pallet screening profiles.','有版本記錄、由客戶確認嘅卡板篩查設定。')} /></Helmet>
    <h1 className="text-3xl font-black text-slate-900">{T('Receiver profiles','收貨方設定')}</h1>
    <p className="text-slate-600 max-w-3xl">{T('Start with a receiver template, confirm the limits with your buyer and save your own version for pallet screening.', '由收貨方範本開始，同買家確認限制，再儲存你嘅版本作砌板篩查。')}</p>
    <p className="text-xs text-slate-500">{T('Profile imports: JSON up to 100 KB. Dimensions in cm, weights in kg. Custom profiles stay on this device.', '設定匯入：JSON 上限 100 KB。尺寸用 cm、重量用 kg。自訂設定只存喺呢部裝置。')}</p>
    <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{T('Templates must be confirmed with the buyer. We record your approval; these checks do not predict acceptance or chargebacks.','範本必須同買家確認。我哋只記錄你嘅確認；檢查唔代表會獲接收，亦唔預測扣款。')}</p>
    <div className="grid md:grid-cols-2 gap-4">{profiles.map(p => <article key={p.id} className="relative rounded-2xl border border-slate-200 p-5 space-y-3 min-w-0">
      <h2 className="font-black text-slate-900 pr-20">{profileText(p, 'name', lang)}</h2>{p.template && <p className="absolute right-4 top-4 rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">{T('Template', '範本')}</p>} {p.template && <p className="text-sm text-amber-800">{T('Verify with your buyer','請同買家核實')}</p>}
      <p data-testid="profile-source" className="inline-flex flex-wrap gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 break-all">{T('Source / date','來源／日期')}: {p.source.startsWith('https://') ? <a className="underline" href={p.source}>{p.source.slice(8).split(/[/?#]/)[0]}</a> : T(p.source, '由客戶提供／通用範本，請同買家核實')} · {p.verifiedAt}</p>
      <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm"><div><dt className="text-slate-500">{T('Pallet footprint', '板面尺寸')}</dt><dd className="font-semibold">{p.pallet.l ?? '—'} × {p.pallet.w ?? '—'} cm</dd></div><div><dt className="text-slate-500">{T('Loaded height limit', '連板高度上限')}</dt><dd className="font-semibold">{p.limits.maxLoadedHeight === undefined ? T('Unspecified', '未指定') : `${p.limits.maxLoadedHeight} cm`}</dd></div><div><dt className="text-slate-500">{T('Gross weight limit', '毛重上限')}</dt><dd className="font-semibold">{p.limits.maxGrossWeight === undefined ? T('Unspecified', '未指定') : `${p.limits.maxGrossWeight} kg`}</dd></div><div><dt className="text-slate-500">{T('Overhang allowance', '超出板邊限額')}</dt><dd className="font-semibold">{p.limits.overhangCm === undefined ? T('Unspecified', '未指定') : `${p.limits.overhangCm} cm`}</dd></div></dl>
      {p.verificationNote && <p>{profileText(p, 'verificationNote', lang)}</p>}{!!p.unverified?.length && <p>{T('Unverified','未核實')}: {unverifiedText(p.unverified, lang)}</p>}
      {p.approvedBy && <p>{T('Customer approval','客戶確認')}: {p.approvedBy} · {p.approvedAt}</p>}
      {!loadProfiles().some(s=>s.id===p.id)&&<button className={btnCls} onClick={()=>{setDraft(structuredClone(p));setRules(JSON.stringify(p.rules,null,2));setError('');}}>{T('Edit my profile','編輯我嘅設定')}</button>} <button className={btnCls} onClick={() => edit(p)}>{T('Duplicate as my profile','複製為我嘅設定')}</button>
    </article>)}</div>
    <label className="block">{T('Import profile JSON','匯入設定 JSON')}<input type="file" accept=".json,application/json" onChange={async e => {try { const f=e.target.files?.[0];if (!f) return; if(f.size>100000) throw new Error('File too large');const p=parseProfile(JSON.parse(await f.text()));setDraft(p);setRules(JSON.stringify(p.rules,null,2));setError(''); }catch(err){setError(String(err));}}} /></label>
    {draft && <section className="rounded-2xl border border-slate-200 p-5 space-y-4"><h2 className="font-black text-slate-900">{T('Edit profile — cm / kg','編輯設定 — cm／kg')}</h2>
      <div className="grid sm:grid-cols-2 gap-4">{(['id','name','source','verifiedAt','approvedBy','approvedAt'] as const).map((k,i) => <label className="block" key={k}>{[T('ID','ID'),T('Name','名稱'),T('Source','來源'),T('Source date','來源日期'),T('Approved by (customer)','確認人（客戶）'),T('Approval date','確認日期')][i]}<input className={inputCls} type={k.endsWith('At')?'date':'text'} value={draft[k]??''} onChange={e=>setDraft({...draft,[k]:e.target.value || undefined})}/></label>)}
      </div><label><input type="checkbox" checked={draft.template} onChange={e=>setDraft({...draft,template:e.target.checked})}/>{T('Starting template — verify with buyer','起始範本 — 請同買家核實')}</label>
      {(['pallet','limits'] as const).map(group => <fieldset key={group}><legend>{group==='pallet'?T('Pallet','卡板'):T('Receiver limits','收貨限制')}</legend><div className="grid grid-cols-2 gap-2">{(group==='pallet'?['l','w','baseHeight','maxHeight','maxWeight','tareWeight']:['maxLoadedHeight','maxGrossWeight','overhangCm']).map(k=><label key={k}>{({l:T('Length (cm)','長度（cm）'),w:T('Width (cm)','闊度（cm）'),baseHeight:T('Pallet base height (cm)','板底高度（cm）'),maxHeight:T('Packing height cap (cm)','砌板高度上限（cm）'),maxWeight:T('Cargo weight cap (kg)','貨物重量上限（kg）'),tareWeight:T('Pallet tare (kg)','卡板自重（kg）'),maxLoadedHeight:T('Receiver loaded height (cm)','收貨連板高度（cm）'),maxGrossWeight:T('Receiver gross weight (kg)','收貨毛重（kg）'),overhangCm:T('Overhang allowance (cm)','超出板邊限額（cm）')} as Record<string,string>)[k]}<input className={inputCls} type="number" min="0" step="any" value={(draft[group] as Record<string,number>)[k]??''} onChange={e=>{const next={...draft[group]} as Record<string,unknown>;if(e.target.value==='')delete next[k];else next[k]=+e.target.value;setDraft({...draft,[group]:next});}}/></label>)}</div></fieldset>)}
      <label className="block">{T('Clampable (manual confirmation only)','可夾抱（只供人手確認）')}<select className={inputCls} value={draft.limits.clampable===undefined?'':String(draft.limits.clampable)} onChange={e=>{const limits={...draft.limits};if(e.target.value==='')delete limits.clampable;else limits.clampable=e.target.value==='true';setDraft({...draft,limits});}}><option value="">{T('Unspecified','未指定')}</option><option value="true">{T('Yes','係')}</option><option value="false">{T('No','唔係')}</option></select></label>
      <label className="block">{T('Unverified fields (one per line; remove only after customer confirmation)','未核實欄位（每行一項；客戶確認後先移除）')}<textarea className={inputCls} value={draft.unverified?.join('\n')??''} onChange={e=>setDraft({...draft,unverified:e.target.value.split('\n').filter(Boolean)})}/></label>
      <fieldset className="space-y-2"><legend>{T('Crew rules','倉務規則')}</legend>
        <div className="overflow-x-auto"><table className="w-full text-sm border-collapse"><thead className="text-left text-slate-500 border-b border-slate-200"><tr>{[T('Rule code','規則代碼'),T('Instructions','指示'),T('Check','檢查'),T('Actions','操作')].map(h=><th key={h} className="py-2 pr-3 font-semibold">{h}</th>)}</tr></thead><tbody>{draft.rules.map((r,i)=><tr key={i} className="border-b border-slate-100 align-top">
          <td className="py-2 pr-3 min-w-40"><label><span className="sr-only">{T('Rule code','規則代碼')}</span><input className={inputCls} value={r.code} onChange={e=>{const next=draft.rules.map((r,j)=>j===i?{...r,code:e.target.value}:r);setDraft({...draft,rules:next});setRules(JSON.stringify(next,null,2));}}/></label></td>
          <td className="py-2 pr-3 min-w-40"><label><span className="sr-only">{T('Instructions','指示')}</span><input className={inputCls} value={ruleText(r, lang)} onChange={e=>{const next=draft.rules.map((r,j)=>j===i?{...r,[lang==='zh'?'textZh':'text']:e.target.value}:r);setDraft({...draft,rules:next});setRules(JSON.stringify(next,null,2));}}/></label></td>
          <td className="py-2 pr-3 min-w-40"><label><span className="sr-only">{T('Check','檢查')}</span><select className={inputCls} value={r.check} onChange={e=>{const next=draft.rules.map((r,j)=>j===i?{...r,check:e.target.value as typeof r.check}:r);setDraft({...draft,rules:next});setRules(JSON.stringify(next,null,2));}}>{(['height','gross','footprint','overhang','stack','upright','manual'] as const).map((c,i)=><option key={c} value={c}>{[T('Loaded height','連板高度'),T('Gross weight','毛重'),T('Footprint','板面尺寸'),T('Overhang','超出板邊'),T('Stack strength','堆疊承重'),T('Upright','直立'),T('Manual checklist','人手清單')][i]}</option>)}</select></label></td>
          <td className="py-2"><button className={btnCls} onClick={()=>{const next=draft.rules.filter((_,j)=>j!==i);setDraft({...draft,rules:next});setRules(JSON.stringify(next,null,2));}}>{T('Remove rule','移除規則')}</button></td>
        </tr>)}</tbody></table></div>
        <button className={btnCls} onClick={()=>{const next=[...draft.rules,{code:`MANUAL_${draft.rules.length+1}`,text:T('Crew confirms','倉務員確認'),check:'manual' as const}];setDraft({...draft,rules:next});setRules(JSON.stringify(next,null,2));}}>{T('Add rule','新增規則')}</button>
      </fieldset>
      <button className={primaryCls} onClick={save}>{T('Save locally','儲存喺本機')}</button> <button className={btnCls} onClick={()=>{try{const p=parseProfile({...draft,rules:JSON.parse(rules)});const url=URL.createObjectURL(new Blob([JSON.stringify(p,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`${p.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);track('receiver_profile_export');}catch(e){setError(String(e));}}}>{T('Export JSON','匯出 JSON')}</button>
    </section>}{error&&<p role="alert">{error}</p>}<p role="status">{message}</p>
    <nav aria-label={T('Related tools', '相關工具')} className="flex flex-wrap gap-3 border-t border-slate-200 pt-5 print:hidden">
      <Link className={btnCls} to="/order-quote">{T('Order → pallet quote', '訂單 → 卡板報價')} →</Link>
      <Link className={btnCls} to="/case-designer">{T('Case designer', '裝箱設計')} →</Link>
      <Link className={btnCls} to="/consolidation">{T('Consolidation', '併櫃規劃')} →</Link>
      <Link className={btnCls} to="/box-catalog">{T('Box catalog', '紙箱目錄')} →</Link>
      <Link className={btnCls} to="/build-sheet">{T('Crew build sheet', '倉務砌板單')} →</Link>
    </nav>
  </main>;
}
