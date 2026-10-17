import {track} from './track';
export interface UsageRecord {job:string;revision:string;day:number;kind:string}
export interface UsageState {records:UsageRecord[]}
/** IDs and revision hashes stay on this device. Only categorical outcomes leave it. */
export function usageTransition(state:UsageState,entry:UsageRecord){
 const records=state.records.filter(r=>entry.day-r.day<=90).slice(-199);
 if(records.some(r=>r.job===entry.job&&r.revision===entry.revision&&r.kind===entry.kind))return {state:{records},event:null};
 const previous=records.filter(r=>r.job===entry.job);
 const gap=records.length?entry.day-Math.max(...records.map(r=>r.day)):0;
 return {state:{records:[...records,entry]},event:{job:previous.some(r=>r.revision===entry.revision)?'same_version':previous.length?'revision':records.length?'next_job':'first_job',return:gap>=30?'30d_plus':gap>=7?'7_29d':gap>=1?'1_6d':'same_day'}};
}
export function recordWorkflowOutput(job:string,revision:string,kind:'carrier_csv'|'build_sheet'|'actuals',sample:boolean){
 if(sample){track('workflow_output',`sample;${kind}`);return;}
 try{const key='dp_workflow_usage_v1',saved=JSON.parse(localStorage.getItem(key)??'{"records":[]}');
 const records=Array.isArray(saved.records)?saved.records.filter((r:UsageRecord)=>typeof r.job==='string'&&typeof r.revision==='string'&&Number.isFinite(r.day)&&typeof r.kind==='string'):[];
 const next=usageTransition({records},{job,revision,kind,day:Math.floor(Date.now()/86400000)});
 localStorage.setItem(key,JSON.stringify(next.state));
 if(next.event)track('workflow_output',`own;${kind};${next.event.job};${next.event.return}`);
 }catch{track('workflow_output',`unknown_storage;${kind}`);}
}
