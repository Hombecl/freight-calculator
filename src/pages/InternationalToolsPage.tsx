import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import LayerDiagram from '../components/LayerDiagram';
import { MARKET_COPY } from '../lib/marketCopy';
import { ALL_MARKET_LANGS, MARKET_NAMES, MARKET_EXAMPLE, marketCsv, marketHref, marketNumber, marketResult, marketTag, type MarketInput, type MarketLanguage, type MarketTool } from '../lib/internationalTools';
import { SITE } from '../lib/locale';
import { track } from '../lib/track';
import { recordToolOutput } from '../lib/workflowUsage';

const inputStyle = 'mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-950 focus:ring-2 focus:ring-blue-500';
const buttonStyle = 'rounded-lg border border-slate-300 px-4 py-3 font-semibold hover:bg-blue-50 disabled:opacity-40';
const stringInputs = () => Object.fromEntries(Object.entries(MARKET_EXAMPLE).map(([k,v]) => [k, String(v)])) as Record<keyof MarketInput,string>;

export default function InternationalToolsPage({ lang, tool }: {lang: MarketLanguage; tool: MarketTool}) {
 const t = MARKET_COPY[lang];
 const hub = tool === 'shipping-tools', pallet = tool === 'pallet-calculator';
 const title = hub ? t.hub : pallet ? t.pallet : t.cbm;
 const intro = hub ? t.intro : pallet ? t.palletIntro : t.cbmIntro;
 const prefix = lang === 'zh' || lang === 'zh-hans' ? '/zh' : '';
 const [draft, setDraft] = useState(stringInputs);
 const [snapshot, setSnapshot] = useState<MarketInput | null>(null);
 const [error, setError] = useState(false), [outputError, setOutputError] = useState(false);
 const [job, setJob] = useState(() => ({ id: crypto.randomUUID(), own: false }));
 const input = Object.fromEntries(Object.entries(draft).map(([k,v]) => [k,marketNumber(v)])) as unknown as MarketInput;
 const result = snapshot ? marketResult(snapshot, tool) : null;
 const stale = !!snapshot && JSON.stringify(snapshot) !== JSON.stringify(input);
 const keys: (keyof MarketInput)[] = ['l','w','h','qty','weight', ...(pallet ? ['pl','pw','loadHeight','payload'] as const : [])];
 const format = (n: number) => new Intl.NumberFormat(marketTag(lang), { maximumFractionDigits: 4 }).format(n);
 const resultRows: Array<[string, number]> = result ? [[t.volume,result.volume],[t.mass,result.mass], ...(pallet ? [[t.layer,result.layer],[t.layers,result.layers],[t.capacity,result.capacity],[t.pallets,result.pallets]] as Array<[string,number]> : [])] : [];
 const emit = (event: string) => track(`intl_${event}`,`${lang};${pallet?'pallet':'cbm'};${job.own?'own':'sample'}`);
 const validOutput = !!result && !stale && (!pallet || result.capacity > 0);
 const outputRows = (): Array<[string,string|number]> => [
  ['DimPack3D', title], ...keys.map(k => [t[k], snapshot![k]] as [string,number]), ...resultRows,
  [t.limits, pallet ? t.palletLimits : t.cbmLimits], [t.method, pallet ? t.palletMethod : t.cbmMethod],
 ];
 const exportCsv = () => {
  if (!validOutput) return;
  setOutputError(false);
  try {
   const url = URL.createObjectURL(new Blob([marketCsv(outputRows())],{type:'text/csv;charset=utf-8'}));
   const a = document.createElement('a'); a.href=url; a.download=`dimpack3d-${tool}-${lang}.csv`; document.body.appendChild(a); a.click(); a.remove();
   setTimeout(() => URL.revokeObjectURL(url),30000);
   emit('csv_requested'); void recordToolOutput(job, 'calculator_csv', {tool,input:snapshot,result});
  } catch { setOutputError(true); emit('output_error'); }
 };
 const print = () => { if(validOutput) { emit('print_requested'); window.print(); } };
 const change = (key: keyof MarketInput, value: string) => {setDraft(d=>({...d,[key]:value}));setError(false);setOutputError(false);};
 const reset = () => {setDraft(stringInputs());setSnapshot(null);setError(false);setOutputError(false);setJob({id:crypto.randomUUID(),own:false});};
 return <div className="min-h-screen bg-slate-50 text-slate-900">
  <Helmet>
   <html lang={marketTag(lang)}/><title>{title} | DimPack3D</title><meta name="description" content={intro}/>
   <link rel="canonical" href={SITE+marketHref(lang,tool)}/>
   {ALL_MARKET_LANGS.map(l=><link key={l} rel="alternate" hrefLang={marketTag(l)} href={SITE+marketHref(l,tool)}/>)}
   <link rel="alternate" hrefLang="x-default" href={SITE+marketHref('en',tool)}/>
  </Helmet>
  <header className="border-b bg-white print:hidden"><div className="max-w-5xl mx-auto p-4 flex flex-wrap items-center justify-between gap-4">
   <a className="text-xl font-black text-blue-700" href={marketHref(lang,'shipping-tools')}>DimPack3D</a>
   <nav aria-label={t.language} className="flex flex-wrap gap-3 text-sm">{ALL_MARKET_LANGS.map(l=><a className={l===lang?'font-bold underline':'text-slate-600 hover:underline'} key={l} href={marketHref(l,tool)} hrefLang={marketTag(l)} lang={marketTag(l)} aria-current={l===lang?'page':undefined}>{MARKET_NAMES[l]}</a>)}</nav>
  </div></header>
  <main className="max-w-5xl mx-auto px-4 py-10 print:py-2">
   <p className="text-blue-700 font-semibold text-sm mb-3 print:hidden">{t.free}</p>
   <h1 className="text-3xl md:text-4xl font-black tracking-tight max-w-3xl">{title}</h1>
   <p className="text-slate-600 mt-4 max-w-3xl leading-relaxed">{intro}</p>
   {hub ? <div className="grid md:grid-cols-2 gap-5 mt-8">{(['cbm-calculator','pallet-calculator'] as const).map(k=><a key={k} href={marketHref(lang,k)} className="rounded-xl bg-white border p-6 hover:border-blue-500"><h2 className="text-xl font-bold text-blue-700">{k==='cbm-calculator'?t.cbm:t.pallet} →</h2><p className="mt-3 text-slate-600">{k==='cbm-calculator'?t.cbmIntro:t.palletIntro}</p></a>)}</div> : <>
   <div className="grid lg:grid-cols-2 gap-6 mt-8">
    <form className="bg-white border rounded-xl p-5 print:hidden" onSubmit={e=>{e.preventDefault();const r=marketResult(input,tool);setError(!r);setSnapshot(r?input:null);setOutputError(false);if(r)emit('calculated');}} noValidate>
     {pallet && <fieldset className="mb-5"><legend className="text-sm font-semibold mb-2">{t.preset}</legend><div className="flex flex-wrap gap-2">{[[120,80,'EUR / EPAL'],[121.92,101.6,'GMA 48 × 40 in'],[120,100,'120 × 100 cm'],[110,110,'110 × 110 cm']].map(([l,w,label])=><button type="button" className={buttonStyle+' text-xs'} key={label} onClick={()=>{setDraft(d=>({...d,pl:String(l),pw:String(w)}));setError(false);}}>{label}</button>)}</div><p className="mt-2 text-xs text-slate-600">{t.custom}</p></fieldset>}
     <div className="grid sm:grid-cols-2 gap-4">{keys.map(k=><label key={k} className="text-sm font-semibold">{t[k]}<input data-testid={`intl-${k}`} className={inputStyle} inputMode={k==='qty'?'numeric':'decimal'} value={draft[k]} onChange={e=>change(k,e.target.value)} aria-describedby={error?'intl-error':undefined}/></label>)}</div>
     <label className="flex items-start gap-2 text-sm mt-5"><input type="checkbox" className="mt-1" checked={job.own} onChange={e=>setJob(j=>({...j,own:e.target.checked}))}/>{t.own}</label>
     {error && <p id="intl-error" role="alert" className="text-red-700 mt-3">{t.error}</p>}
     <div className="flex flex-wrap gap-2 mt-5"><button className="bg-blue-700 text-white rounded-lg px-5 py-3 font-bold hover:bg-blue-800" type="submit">{t.calculate}</button><button className={buttonStyle} type="button" onClick={reset}>{t.example}</button><button className={buttonStyle} type="button" onClick={()=>{setSnapshot(null);setJob({id:crypto.randomUUID(),own:false});}}>{t.nextJob}</button></div>
    </form>
    <section aria-live="polite" className="bg-white border rounded-xl p-5 print:border-0">
     <h2 className="text-xl font-bold">{t.result}</h2>
     {stale ? <p role="status" className="mt-4 text-amber-800">{t.stale}</p> : result && snapshot ? <>
      <dl className="grid grid-cols-2 gap-4 my-5">{resultRows.map(([label,value])=><div key={label}><dt className="text-sm text-slate-600">{label}</dt><dd className="text-2xl font-bold text-blue-800">{format(value)}</dd></div>)}</dl>
      <dl className="hidden print:block">{keys.map(k=><div key={k}>{t[k]}: {format(snapshot[k])}</div>)}</dl>
      {pallet && result.capacity===0 && <p className="text-red-700">{t.noFit}</p>}
      {pallet && result.weightLimited && <p className="text-amber-800 mb-4">{t.weightLimited}</p>}
      {pallet && result.capacity>0 && (result.layer<=400 ? <figure><LayerDiagram cartonL={snapshot.l} cartonW={snapshot.w} palletL={snapshot.pl} palletW={snapshot.pw} label={t.diagram}/><figcaption className="text-sm text-slate-600 mt-3">{t.diagram}</figcaption></figure> : <p>{t.tooDense}</p>)}
     </> : <p className="text-slate-600 mt-4">{pallet?t.palletMethod:t.cbmMethod}</p>}
     <div className="flex gap-2 flex-wrap mt-5 print:hidden"><button className={buttonStyle} disabled={!validOutput} onClick={exportCsv}>{t.csv}</button><button className={buttonStyle} disabled={!validOutput} onClick={print}>{t.print}</button></div>
     {outputError && <p role="alert" className="text-red-700 mt-3">{t.outputError}</p>}
    </section>
   </div>
   <section className="mt-8 max-w-3xl"><h2 className="font-bold text-xl">{t.method}</h2><p className="mt-3 leading-relaxed text-slate-600">{pallet?t.palletMethod:t.cbmMethod}</p><h2 className="font-bold text-xl mt-6">{t.limits}</h2><p className="mt-3 leading-relaxed text-slate-600">{pallet?t.palletLimits:t.cbmLimits}</p></section>
   </>}
   <section className="mt-10 border-t pt-6 print:hidden"><h2 className="text-xl font-bold">{t.next}</h2><ul className="mt-4 space-y-3 text-blue-700 underline">
    {!hub && <li><a href={marketHref(lang,'shipping-tools')}>{t.home}</a></li>}
    <li><a href={prefix+'/planner'} onClick={()=>track('intl_handoff',`${lang};planner`)}>{t.planner}</a></li>
    <li><a href={prefix+'/guides/excel-container-load-plan'} onClick={()=>track('intl_handoff',`${lang};excel`)}>{t.excel}</a></li>
    <li><a href={`${lang==='en'?'':lang==='zh-hans'?'/zh':'/'+lang}/pallet-height-calculator`} onClick={()=>track('intl_handoff',`${lang};height`)}>{t.heightTool}</a></li>
   </ul></section>
  </main>
  <footer className="max-w-5xl mx-auto px-4 pb-8 text-sm text-slate-500 print:hidden"><a href={prefix+'/privacy'}>{t.privacy}</a> · DimPack3D</footer>
 </div>;
}

/** Remount on route changes so a language/tool switch cannot reuse a stale report. */
export function InternationalRoute({lang,tool}:{lang:MarketLanguage;tool:MarketTool}) {
 const location=useLocation();
 return <InternationalToolsPage key={location.pathname} lang={lang} tool={tool}/>;
}
