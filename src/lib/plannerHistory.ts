import type {PackItemSpec} from './binPacking';
import type {PlannerBox} from './plannerBox';
import {plannerRevision} from './plannerReview';
export interface PlannerSnapshot {jobId:string;name:string;containerKey:string;overhangCm:number;specs:PackItemSpec[];boxes:PlannerBox[];revision:string;savedAt:string}
export const PLANNER_HISTORY='dp_planner_history_v1';
export function snapshotRevision(s:Pick<PlannerSnapshot,'containerKey'|'overhangCm'|'specs'|'boxes'>){return plannerRevision({containerKey:s.containerKey,overhangCm:s.overhangCm,specs:s.specs,boxes:s.boxes});}
export function validSnapshot(v:unknown):v is PlannerSnapshot {
 const s=v as PlannerSnapshot;
 return !!s&&typeof s.jobId==='string'&&s.jobId.length<=100&&typeof s.name==='string'&&s.name.length<=120&&typeof s.containerKey==='string'&&[0,2.5,5].includes(s.overhangCm)&&typeof s.revision==='string'&&typeof s.savedAt==='string'&&Array.isArray(s.specs)&&s.specs.length<=300&&s.specs.every(i=>typeof i.id==='string'&&typeof i.label==='string'&&[i.l,i.w,i.h,i.qty,i.weight,i.color].every(Number.isFinite)&&i.l>0&&i.w>0&&i.h>0&&i.qty>=1&&Number.isInteger(i.qty)&&i.weight>=0)&&Array.isArray(s.boxes)&&s.boxes.length<=10000&&s.boxes.every(b=>typeof b.id==='string'&&typeof b.label==='string'&&[b.px,b.py,b.pz,b.l,b.w,b.h,b.color,b.weight].every(Number.isFinite)&&b.l>0&&b.w>0&&b.h>0);
}
export function readPlannerHistory():PlannerSnapshot[]{try{const v=JSON.parse(localStorage.getItem(PLANNER_HISTORY)??'[]');return Array.isArray(v)?v.filter(validSnapshot).slice(-20):[];}catch{return [];}}
export function savePlannerSnapshot(s:PlannerSnapshot):PlannerSnapshot[]{
 if(!validSnapshot(s))throw Error('Invalid snapshot');
 const old=readPlannerHistory();if(old.some(x=>x.jobId===s.jobId&&x.revision===s.revision))return old;
 const next=[...old,structuredClone(s)].slice(-20);localStorage.setItem(PLANNER_HISTORY,JSON.stringify(next));return next;
}
export function snapshotChanges(a:PlannerSnapshot,b:PlannerSnapshot){
 const ids=new Set([...a.specs.map(s=>s.id),...b.specs.map(s=>s.id)]);
 return {equipment:a.containerKey!==b.containerKey||a.overhangCm!==b.overhangCm,cargoRows:[...ids].filter(id=>JSON.stringify(a.specs.find(s=>s.id===id))!==JSON.stringify(b.specs.find(s=>s.id===id))).length,layout:JSON.stringify(a.boxes)!==JSON.stringify(b.boxes)};
}
