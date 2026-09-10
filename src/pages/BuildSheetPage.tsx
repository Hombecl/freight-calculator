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
  return <main className="max-w-5xl mx-auto p-6 space-y-4">
    <Helmet><title>{T('Crew build sheet','倉務砌板單')} | DimPack3D</title><meta name="description" content={T('Pallet build steps, receiver screening and measured actuals.','卡板砌板步驟、收貨方篩查同實量記錄。')}/></Helmet>
    <style>{`@media print { header, footer, nav { display:none!important } .sheet-pallet { break-after:page; } .sheet-pallet:last-child { break-after:auto; } .sheet-steps { columns:3;font-size:8pt } .sheet-pallet svg { max-height:210px } }`}</style>
    <div className="print:hidden space-y-3"><h1 className="text-3xl font-bold">{T('Crew build sheet','倉務砌板單')}</h1>
      <label className="block">{T('Order-quote result JSON','Order-quote 結果 JSON')}<textarea data-testid="sheet-json" className="border w-full h-32" value={paste} onChange={e=>setPaste(e.target.value)}/></label>
      <button className="border p-2" onClick={()=>{try{load(JSON.parse(paste));}catch(e){setError(String(e));}}}>{T('Load quote','載入報價')}</button>
      <input aria-label={T('Upload quote JSON','上載報價 JSON')} type="file" accept=".json,application/json" onChange={async e=>{try{const f=e.target.files?.[0];if(!f)return;if(f.size>5000000)throw new Error('File too large');load(JSON.parse(await f.text()));}catch(e){setError(String(e));}}}/>
      <label className="block">{T('Receiver profile','收貨方設定')}<select className="border p-2" value={profileId} onChange={e=>{setProfileId(e.target.value);setManual({});}}>{profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <button className="border p-2" onClick={()=>{window.print();track('build_sheet_print');}}>{T('Print','列印')}</button> <Link className="underline" to={lang==='zh'?'/zh/order-quote':'/order-quote'}>{T('Return to quote and variance','返回報價同偏差記錄')}</Link>
    </div>
    {error&&<p role="alert">{error}</p>}{q&&<><p>{q.orderId??q.meter.id} · {q.status} · {q.summary.cartonsPlaced}/{q.summary.cartonsRequested} {T('cartons placed','箱已放入')} · {q.engineVersion}</p><p className="text-xs">{q.semantics}</p>
    {profile.template&&<p className="bg-amber-100 p-2">{T('Verify with your buyer','請同買家核實')}</p>}<p>{profile.name} · {version} · {profile.approvedBy} {profile.approvedAt}</p>{!!profile.unverified?.length&&<p>{T('Unverified','未核實')}: {profile.unverified.join(', ')}</p>}
    {q.pallets.map(p=><article key={q.inputHash+p.index} data-testid="sheet-pallet" className="sheet-pallet border rounded p-4 space-y-3">
      <h2 className="text-xl font-bold">{T('Pallet','卡板')} {p.index+1} · {p.cartonCount} {T('cartons','箱')}</h2><p className="text-xs">{q.orderId??q.meter.id} · {profile.name} · {T('Profile version','設定版本')}: {version}</p>
      <PalletEstimateView countTestId="sheet-placed-count" zh={lang==='zh'} result={{boxes:p.boxes,loadedHeight:p.loadedHeight.cm,pallet:{l:p.outerDims.l.cm,w:p.outerDims.w.cm,baseHeight:q.buildInput?.pallet.baseHeight??Math.max(0,p.loadedHeight.cm-Math.max(0,...p.boxes.map(b=>b.py+b.h))),maxHeight:p.outerDims.h.cm,maxWeight:p.grossWeight.kg}}}/>
      <ol className="sheet-steps">{buildSteps(p).map((b,i)=><li data-testid="sheet-build-step" key={b.id}>{i+1}. {b.label} · {b.id} · {b.l}×{b.w}×{b.h} cm · ({b.px},{b.py},{b.pz})</li>)}</ol>
      <p>{T('Position: x, height above pallet deck, z (cm).','位置：x、板面以上高度、z（cm）。')}</p>
      <ul>{(checks[p.index]??[]).map(c=>{const rule=profile.rules.find(r=>r.code===c.code)!;const key=`${p.index}:${version}:${c.code}`;return <li key={c.code}><label><input type="checkbox" disabled={rule.check!=='manual'} checked={rule.check==='manual'?!!manual[key]:c.status==='pass'} onChange={e=>setManual({...manual,[key]:e.target.checked})}/> {rule.text} · {c.status}</label><p className="text-xs">{c.assumption}</p></li>;})}</ul>
      <fieldset className="grid sm:grid-cols-2 gap-2"><legend>{T('Measured actuals (cm / kg)','實量（cm／kg）')}</legend>
        {(['height','grossWeight','crewInitials','timestamp'] as const).map((k,i)=><label key={k}>{[T('Loaded height (cm)','連板高度（cm）'),T('Gross weight (kg)','毛重（kg）'),T('Crew initials','倉務員簡稱'),T('Timestamp','時間')][i]}<input data-testid={`actual-${k}-${p.index}`} className="border p-2 w-full" type={i<2?'number':'text'} min="0" step="any" value={actuals[p.index]?.[k]??''} onChange={e=>setActuals({...actuals,[p.index]:{...actuals[p.index],[k]:i<2?(e.target.value===''?undefined:+e.target.value):e.target.value}})}/></label>)}
        <label className="print:hidden">{T('Photo (device only)','相片（只存本機）')}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2000000){setError(T('Use PNG/JPEG/WebP under 2 MB','請用 2 MB 以下 PNG/JPEG/WebP'));return;}const reader=new FileReader();reader.onload=()=>setActuals(old=>({...old,[p.index]:{...old[p.index],photo:String(reader.result)}}));reader.readAsDataURL(file);}}/></label>
        {actuals[p.index]?.photo&&<img className="max-h-40" src={actuals[p.index].photo} alt={T('Measured pallet photo','實際卡板相片')}/>}
      </fieldset>
    </article>)}
    <div className="print:hidden"><label>{T('Actual pallet count','實際板數')}<input data-testid="actual-pallet-count" className="border p-2" type="number" min="0" step="1" value={count??''} onChange={e=>setCount(e.target.value===''?undefined:+e.target.value)}/></label><button className="border p-2" data-testid="save-actuals" onClick={save}>{T('Save actuals','儲存實量')}</button><p role="status">{message}</p></div></>}
  </main>;
}
