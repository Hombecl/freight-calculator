import { checkAssumption, ruleText, profileText, unverifiedText, screeningSemanticsZh } from '../lib/auditPageLocale';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useApp } from '../context/AppContext';
import { buildSteps } from '../lib/orderPlanning';
import { evaluateProfile, loadProfiles } from '../lib/receiverProfiles';
import { deviceProfiles, parseSheetQuote, quoteStorageKey, SHEET_STORAGE } from '../lib/receiverStorage';
import { measuredActuals, recordActuals, type SheetQuote, type MeasuredActual } from '../lib/buildSheet';
import type { Check } from '../lib/packChecks';
import PalletEstimateView from '../components/PalletEstimateView';
import { track } from '../lib/track';

const inputCls = 'w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const btnCls = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-40';
const primaryCls = 'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 text-sm font-bold disabled:opacity-50';

export default function BuildSheetPage() {
  const {lang}=useApp();const T=(en:string,zh:string)=>lang==='zh'?zh:en;
  const [q,setQ]=useState<SheetQuote|null>(null),[paste,setPaste]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [profiles,setProfiles]=useState(()=>{try{return deviceProfiles(localStorage.getItem('dp_receiver_profiles'));}catch{return loadProfiles();}});
  const [profileId,setProfileId]=useState('custom'),[checks,setChecks]=useState<Record<number,Check[]>>({}),[version,setVersion]=useState('');
  const [actuals,setActuals]=useState<Record<string,MeasuredActual>>({}),[count,setCount]=useState<number|undefined>(),[manual,setManual]=useState<Record<string,boolean>>({});
  const profile=profiles.find(p=>p.id===profileId)!;
  const load=(value:unknown)=>{let quote=parseSheetQuote(value) as SheetQuote;const savedRaw=localStorage.getItem(quoteStorageKey(quote.orderId));if(savedRaw){const saved=JSON.parse(savedRaw);if(saved.inputHash===quote.inputHash)quote=parseSheetQuote({...quote,...saved}) as SheetQuote;}setQ(quote);setActuals(measuredActuals(quote));setCount(quote.variance?.summary.actualPalletCount);setManual(quote.manualChecklist??{});if(quote.profileSnapshot){setProfiles(old=>[...old.filter(p=>p.id!==quote.profileSnapshot!.id),quote.profileSnapshot!]);setProfileId(quote.profileSnapshot.id);}setError('');setMessage('');track('build_sheet_load');};
  useEffect(()=>{try{const raw=sessionStorage.getItem(SHEET_STORAGE);if(raw)load(JSON.parse(raw));}catch(e){setError(String(e));}},[]);
  useEffect(()=>{let active=true;setChecks({});if(q)Promise.all(q.pallets.map(p=>evaluateProfile({...q,pallets:[p]},profile))).then(results=>{if(active){setChecks(Object.fromEntries(results.map((e,i)=>[q.pallets[i].index,e.checks])));setVersion(results[0]?.profileVersion??'');}}).catch(e=>setError(String(e)));return()=>{active=false;};},[q,profile]);
  const save=()=>{try{
    if(!q)return;
    const next=recordActuals(q,actuals,count,manual,profile,version,new Date().toISOString());
    localStorage.setItem(quoteStorageKey(q.orderId),JSON.stringify(next));
    setMessage(T('Actuals saved locally','實量已儲存喺本機'));track('build_sheet_actuals_save');
  }catch(e){setError(String(e));}};
  return <main className="[&_input[type=file]]:max-w-full [&_fieldset]:min-w-0 [&_label]:min-w-0 break-words max-w-6xl mx-auto px-4 py-8 space-y-4">
    <Helmet><title>{T('Crew build sheet','倉務砌板單')} | DimPack3D</title><meta name="description" content={T('Pallet build steps, receiver screening and measured actuals.','卡板砌板步驟、收貨方篩查同實量記錄。')}/></Helmet>
    <style>{`@media print { header, footer, nav { display:none!important } .sheet-pallet { break-after:page; } .sheet-pallet:last-child { break-after:auto; } .sheet-steps { columns:3;font-size:8pt } .sheet-pallet svg { max-height:210px } }`}</style>
    <div className="print:hidden space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-black text-slate-900">{T('Crew build sheet','倉務砌板單')}</h1><button className={btnCls} onClick={()=>{window.print();track('build_sheet_print');}}>{T('Print','列印')}</button></div>
      <p className="text-slate-600 max-w-3xl">{T('Turn a pallet quote into a crew build sequence, check receiver rules and record the measured result.', '將卡板報價變成倉務砌板步驟，核對收貨規則，再記錄實量。')}</p>
      <p className="text-xs text-slate-500">{T('Quote JSON: up to 5 MB. Photos: PNG/JPEG/WebP under 2 MB each. Actuals are saved on this device.', '報價 JSON：上限 5 MB。相片：每張 2 MB 以下 PNG/JPEG/WebP。實量只存喺呢部裝置。')}</p>
      <section className="rounded-2xl border border-slate-200 p-5 space-y-4"><h2 className="font-black text-slate-900">{T('Quote and receiver profile', '報價同收貨方設定')}</h2>
      <label className="block">{T('Order-quote result JSON','Order-quote 結果 JSON')}<textarea data-testid="sheet-json" className={`${inputCls} h-32 font-mono`} value={paste} onChange={e=>setPaste(e.target.value)}/></label>
      <button className={primaryCls} onClick={()=>{try{load(JSON.parse(paste));}catch(e){setError(String(e));}}}>{T('Load quote','載入報價')}</button>
      <input aria-label={T('Upload quote JSON','上載報價 JSON')} type="file" accept=".json,application/json" onChange={async e=>{try{const f=e.target.files?.[0];if(!f)return;if(f.size>5000000)throw new Error('File too large');load(JSON.parse(await f.text()));}catch(e){setError(String(e));}}}/>
      <label className="block">{T('Receiver profile','收貨方設定')}<select className={inputCls} value={profileId} onChange={e=>{setProfileId(e.target.value);setManual({});}}>{profiles.map(p=><option key={p.id} value={p.id}>{profileText(p, 'name', lang)}</option>)}</select></label>
      <Link className="underline" to="/order-quote">{T('Return to quote and variance','返回報價同偏差記錄')}</Link></section>
    </div>
    {error&&<p role="alert">{error}</p>}{q&&<><div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-5 space-y-2"><p className="font-bold text-slate-900"><span className="mr-2 inline-flex rounded-full bg-slate-200 px-2 py-1 text-xs font-black uppercase">{T(q.status, {complete:'完成',partial:'部分完成',needs_review:'需要核對'}[q.status])}</span>{q.orderId??q.meter.id} · {q.summary.cartonsPlaced}/{q.summary.cartonsRequested} {T('cartons placed','箱已放入')} · {q.engineVersion}</p><p className="text-xs">{T(q.semantics, screeningSemanticsZh)}</p></div>
    {profile.template&&<p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{T('Verify with your buyer','請同買家核實')}</p>}<p>{profileText(profile, 'name', lang)} · {version} · {profile.approvedBy} {profile.approvedAt}</p>{!!profile.unverified?.length&&<p>{T('Unverified','未核實')}: {unverifiedText(profile.unverified, lang)}</p>}
    {q.pallets.map(p=><article key={q.inputHash+p.index} data-testid="sheet-pallet" className="sheet-pallet rounded-2xl border border-slate-200 p-5 space-y-4">
      <h2 className="text-xl font-black text-slate-900">{T('Pallet','卡板')} {p.index+1} · {p.cartonCount} {T('cartons','箱')}</h2><p className="text-xs">{q.orderId??q.meter.id} · {profileText(profile, 'name', lang)} · {T('Profile version','設定版本')}: {version}</p>
      <div className="grid lg:grid-cols-2 gap-6 items-start"><div className="min-w-0 overflow-x-auto"><table className="sheet-steps w-full text-sm border-collapse"><thead className="text-left text-slate-500 border-b border-slate-200"><tr>{['#', 'SKU', T('x / y / z (cm)', 'x／y／z（cm）'), T('Layer', '層')].map(h=><th key={h} className="py-2 pr-3 font-semibold">{h}</th>)}</tr></thead><tbody>{buildSteps(p).map((b,i)=><tr data-testid="sheet-build-step" key={b.id} className="border-b border-slate-100"><td className="py-2 pr-3">{i+1}</td><td className="py-2 pr-3">{b.label}<span className="block text-xs text-slate-500">{b.id} · {b.l}×{b.w}×{b.h} cm</span></td><td className="py-2 pr-3">{b.px} / {b.py} / {b.pz}</td><td className="py-2">{[...new Set(p.boxes.map(box=>box.py))].sort((a,b)=>a-b).indexOf(b.py)+1}</td></tr>)}</tbody></table><p className="mt-3 text-xs text-slate-500">{T('Position: x, height above pallet deck, z (cm). Layers group cartons at the same starting height.', '位置：x、板面以上高度、z（cm）。同一起始高度嘅箱歸為一層。')}</p></div><div className="min-w-0">
      <PalletEstimateView countTestId="sheet-placed-count" zh={lang==='zh'} result={{boxes:p.boxes,loadedHeight:p.loadedHeight.cm,pallet:{l:p.outerDims.l.cm,w:p.outerDims.w.cm,baseHeight:q.buildInput?.pallet.baseHeight??Math.max(0,p.loadedHeight.cm-Math.max(0,...p.boxes.map(b=>b.py+b.h))),maxHeight:p.outerDims.h.cm,maxWeight:p.grossWeight.kg}}}/>      </div></div>
      <h3 className="font-black text-slate-900">{T('Receiver checklist', '收貨方檢查清單')}</h3>
      <ul className="space-y-3 rounded-xl bg-slate-50 p-4">{(checks[p.index]??[]).map(c=>{const rule=profile.rules.find(r=>r.code===c.code)!;const key=`${p.index}:${version}:${c.code}`;return <li key={c.code}><label><input type="checkbox" disabled={rule.check!=='manual'} checked={rule.check==='manual'?!!manual[key]:c.status==='pass'} onChange={e=>setManual({...manual,[key]:e.target.checked})}/> {ruleText(rule, lang)} · <span title={checkAssumption(c, lang)} className={`rounded-full px-2 py-1 text-xs font-semibold ${c.status==='pass'?'bg-emerald-100 text-emerald-800':c.status==='fail'?'bg-red-100 text-red-800':c.status==='warn'?'bg-amber-100 text-amber-800':'bg-slate-200 text-slate-600'}`}>{T(c.status,{pass:'通過',fail:'未通過',warn:'留意',not_evaluated:'未評估'}[c.status])}</span></label><p className="text-xs">{checkAssumption(c, lang)}</p></li>;})}</ul>
      <fieldset className="grid sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 p-4"><legend className="px-2 font-black text-slate-900">{T('Measured actuals (cm / kg)','實量（cm／kg）')}</legend>
        {(['height','grossWeight','crewInitials','timestamp'] as const).map((k,i)=><label key={k}>{[T('Loaded height (cm)','連板高度（cm）'),T('Gross weight (kg)','毛重（kg）'),T('Crew initials','倉務員簡稱'),T('Timestamp','時間')][i]}<input data-testid={`actual-${k}-${p.index}`} className={inputCls} type={i<2?'number':'text'} min="0" step="any" value={actuals[p.index]?.[k]??''} onChange={e=>setActuals({...actuals,[p.index]:{...actuals[p.index],[k]:i<2?(e.target.value===''?undefined:+e.target.value):e.target.value}})}/></label>)}
        <label className="print:hidden">{T('Photo (device only)','相片（只存本機）')}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2000000){setError(T('Use PNG/JPEG/WebP under 2 MB','請用 2 MB 以下 PNG/JPEG/WebP'));return;}const reader=new FileReader();reader.onload=()=>setActuals(old=>({...old,[p.index]:{...old[p.index],photo:String(reader.result)}}));reader.readAsDataURL(file);}}/></label>
        {actuals[p.index]?.photo&&<img className="max-h-40" src={actuals[p.index].photo} alt={T('Measured pallet photo','實際卡板相片')}/>}
      </fieldset>
    </article>)}
    <div className="print:hidden"><label>{T('Actual pallet count','實際板數')}<input data-testid="actual-pallet-count" className={inputCls} type="number" min="0" step="1" value={count??''} onChange={e=>setCount(e.target.value===''?undefined:+e.target.value)}/></label><button className={primaryCls} data-testid="save-actuals" onClick={save}>{T('Save actuals','儲存實量')}</button><p role="status">{message}</p></div></>}
    <nav aria-label={T('Related tools', '相關工具')} className="flex flex-wrap gap-3 border-t border-slate-200 pt-5 print:hidden">
      <Link className={btnCls} to="/order-quote">{T('Order → pallet quote', '訂單 → 卡板報價')} →</Link>
      <Link className={btnCls} to="/case-designer">{T('Case designer', '裝箱設計')} →</Link>
      <Link className={btnCls} to="/consolidation">{T('Consolidation', '併櫃規劃')} →</Link>
      <Link className={btnCls} to="/box-catalog">{T('Box catalog', '紙箱目錄')} →</Link>
      <Link className={btnCls} to="/receiver-profiles">{T('Receiver profiles', '收貨方設定')} →</Link>
    </nav>
  </main>;
}
