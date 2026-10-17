import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { detectColumns, IMPORT_FIELDS, parseDelimited, readImportFile, rowsToSpecs, TEMPLATE_CSV, type ImportRows, type ImportOptions } from '../lib/importCartons';
import { downloadText } from '../lib/exportPlan';
import type { PackItemSpec } from '../lib/binPacking';
import { track } from '../lib/track';

interface Props { open:boolean; onClose:()=>void; onImport:(specs:PackItemSpec[])=>void; actionLabel?:string }
const cls='rounded-lg border border-slate-300 p-2 text-sm min-w-0';
const MAPPING_KEY='dp_import_mapping_v1';
export default function ImportModal({open,onClose,onImport,actionLabel}:Props) {
 const {lang}=useApp();const T=(en:string,zh:string)=>lang==='zh'?zh:en;
 const [sheets,setSheets]=useState<{name:string;rows:ImportRows}[]>([]),[sheet,setSheet]=useState(0);
 const [options,setOptions]=useState<ImportOptions>({lengthUnit:'cm',weightUnit:'kg'});
 const [paste,setPaste]=useState(''),[error,setError]=useState(''),[confirmed,setConfirmed]=useState(false),[page,setPage]=useState(0);
 const request=useRef(0);
 const rows=sheets[sheet]?.rows??[];const result=rowsToSpecs(rows,options);
 const change=(next:ImportRows,index=sheet)=>{setSheets(old=>old.map((s,i)=>i===index?{...s,rows:next}:s));setConfirmed(false);};
 const choose=(index:number,data=sheets)=>{setSheet(index);setOptions({lengthUnit:'cm',weightUnit:'kg',...detectColumns(data[index]?.rows??[])});setConfirmed(false);setPage(0);};
 const file=async(f?:File)=>{if(!f)return;const id=++request.current;try{const data=await readImportFile(f);if(id!==request.current)return;setSheets(data);choose(0,data);setError('');track('import_stage','review');}catch(e){if(id===request.current)setError(String(e));track('import_stage','file_error');}};
 const update=(patch:Partial<ImportOptions>)=>{setOptions(o=>({...o,...patch}));setConfirmed(false);};
 if(!open)return null;
 const names:Record<string,string>={label:T('Name / SKU','名稱／SKU'),l:T('Length','長'),w:T('Width','闊'),h:T('Height','高'),weight:T('Weight each','每件重量'),qty:T('Quantity','數量'),maxStack:T('Max weight on top','頂部承重'),fragile:T('Fragile','易碎'),keepUpright:T('Upright','直立'),group:T('Group / PO','組別／PO'),unloadOrder:T('Delivery stop','送貨次序')};
 return <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-labelledby="import-title"><div className="bg-white rounded-2xl p-5 w-full max-w-5xl max-h-[92vh] overflow-y-auto space-y-4">
 <div className="flex justify-between"><h2 id="import-title" className="font-bold text-xl">{T('Review your carton list','核對貨單')}</h2><button aria-label={T('Close import','關閉匯入')} onClick={onClose}><X/></button></div>
 <p>{T('Header or cell units take priority. Values without units use your selection below. All accepted rows are converted once to cm / kg.','優先使用欄名或儲存格單位。沒有標示單位嘅數值用以下選擇，接受嘅資料只換算一次成 cm／kg。')}</p>
 <input aria-label={T('Upload carton list','上載貨單')} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" onChange={e=>{void file(e.target.files?.[0]);e.target.value='';}}/>
 <textarea aria-label={T('Paste carton list','貼上貨單')} className={`${cls} w-full h-24`} value={paste} onChange={e=>setPaste(e.target.value)} placeholder="name,length (in),width (in),height (in),weight (lb),qty"/>
 <div className="flex flex-wrap gap-3"><button className={cls} onClick={()=>{request.current++;const data=[{name:T('Pasted rows','貼上資料'),rows:parseDelimited(paste)}];setSheets(data);choose(0,data);setError('');track('import_stage','review');}}>{T('Review pasted rows','預覽貼上資料')}</button><button className={cls} onClick={()=>downloadText('dimpack3d-template.csv',TEMPLATE_CSV)}>{T('Download template','下載範本')}</button></div>
 {error&&<p role="alert" className="text-red-700">{error}</p>}
 {!!rows.length&&<>
 <div className="flex flex-wrap gap-4"><label>{T('Worksheet','工作表')} <select className={cls} value={sheet} onChange={e=>choose(+e.target.value)}>{sheets.map((s,i)=><option key={i} value={i}>{s.name}</option>)}</select></label><label><input type="checkbox" checked={options.headerRow??false} onChange={e=>update({headerRow:e.target.checked})}/> {T('First row contains headings','第一行係欄名')}</label>
 <label>{T('Unlabelled dimensions','未標示尺寸單位')} <select aria-label="Default dimension unit" className={cls} value={options.lengthUnit} onChange={e=>update({lengthUnit:e.target.value as ImportOptions['lengthUnit']})}>{['cm','mm','m','in'].map(u=><option key={u}>{u}</option>)}</select></label>
 <label>{T('Unlabelled weights','未標示重量單位')} <select aria-label="Default weight unit" className={cls} value={options.weightUnit} onChange={e=>update({weightUnit:e.target.value as ImportOptions['weightUnit']})}>{['kg','g','lb'].map(u=><option key={u}>{u}</option>)}</select></label></div>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{IMPORT_FIELDS.map(f=><label key={f} className="text-sm">{names[f]}<select aria-label={`Map ${f}`} className={`${cls} w-full`} value={options.columns?.[f]??-1} onChange={e=>{const columns={...options.columns};if(+e.target.value<0)delete columns[f];else columns[f]=+e.target.value;update({columns});}}><option value={-1}>{T('Not supplied','未提供')}</option>{rows[0].map((v,i)=><option key={i} value={i}>{i+1}: {options.headerRow?String(v):T('Column','欄')}</option>)}</select></label>)}</div>
 <div className="flex gap-3"><button className={cls} onClick={()=>{try{localStorage.setItem(MAPPING_KEY,JSON.stringify({...options,excludeRows:[]}));setError('');track('import_mapping_saved');}catch{setError(T('Mapping could not be saved on this device.','本機未能儲存映射。'));}}}>{T('Remember mapping on this device','本機記住映射')}</button><button className={cls} onClick={()=>{try{const saved=JSON.parse(localStorage.getItem(MAPPING_KEY)??'null');if(!saved?.columns||!['cm','mm','m','in'].includes(saved.lengthUnit)||!['kg','g','lb'].includes(saved.weightUnit)||Object.values(saved.columns).some(v=>!Number.isInteger(v)||Number(v)<0||Number(v)>=rows[0].length))throw Error();update(saved);track('import_mapping_reused');}catch{setError(T('No saved mapping.','未有儲存映射。'));}}}>{T('Reuse saved mapping','沿用映射')}</button></div>
 <p className="font-semibold">{result.specs.length} {T('accepted types','種已接受')} · {result.acceptedQty??0} {T('cartons','箱')} · {result.excludedRows??0} {T('excluded rows','行已排除')}</p>
 {!!result.warnings.length&&<details open><summary>{T('Review warnings','核對提示')}</summary><ul className="max-h-32 overflow-auto text-amber-900">{result.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></details>}
 <div className="overflow-auto max-h-72"><table className="text-xs w-full"><thead><tr><th>{T('Use','使用')}</th><th>#</th>{rows[0].map((v,i)=><th key={i}>{options.headerRow?String(v):i+1}</th>)}<th>{T('Converted result','換算結果')}</th></tr></thead><tbody>{(result.rows??[]).slice(page*25,page*25+25).map(r=><tr key={r.row} className={r.error?'bg-amber-50':'border-b'}><td><input aria-label={`Use row ${r.row}`} type="checkbox" checked={!options.excludeRows?.includes(r.row)} onChange={e=>update({excludeRows:e.target.checked?(options.excludeRows??[]).filter(n=>n!==r.row):[...(options.excludeRows??[]),r.row]})}/></td><td>{r.row}</td>{rows[r.row-1].map((v,i)=><td key={i}><input aria-label={`Row ${r.row} column ${i+1}`} className="w-24 border rounded p-1" value={String(v??'')} onChange={e=>change(rows.map((row,index)=>index===r.row-1?row.map((c,j)=>j===i?e.target.value:c):row))}/></td>)}<td className="min-w-48">{r.error??r.normalized}</td></tr>)}</tbody></table></div>
 <div className="flex gap-3"><button className={cls} disabled={page===0} onClick={()=>setPage(p=>p-1)}>{T('Previous rows','上一頁')}</button><button className={cls} disabled={(page+1)*25>=(result.rows?.length??0)} onClick={()=>setPage(p=>p+1)}>{T('Next rows','下一頁')}</button></div>
 <label className="block"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> {T('I checked units, accepted quantities and excluded rows.','我已核對單位、接受件數同排除行。')}</label>
 <button className="bg-blue-600 text-white font-bold rounded-lg p-3 disabled:opacity-40" disabled={!confirmed||!result.specs.length} onClick={()=>{try{onImport(result.specs);track('import_stage',result.excludedRows?'accepted_partial':'accepted');setSheets([]);setPaste('');setConfirmed(false);onClose();}catch(e){setError(String(e));}}}>{actionLabel??T('Use this list and calculate','使用貨單並計算')}</button>
 </>}
 </div></div>;
}
