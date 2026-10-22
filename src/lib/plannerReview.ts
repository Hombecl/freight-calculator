import type { PackContainer, PackItemSpec } from './binPacking';
import type { PlannerBox } from './plannerBox';

const EPS = 1e-6;
export type ReviewCode = 'invalid'|'identity'|'bounds'|'overlap'|'support'|'stack'|'orientation'|'weight'|'payload'|'door'|'unload'|'unverified';
export interface ReviewIssue { code: ReviewCode; ids: string[]; }
export interface CargoRow { id: string; label: string; requested: number; placed: number; remaining: number; reason: 'dimensions'|'door'|'payload'|'search'|null; }
export interface PlannerReview { issues: ReviewIssue[]; cargo: CargoRow[]; complete: boolean; checked: boolean; }
export function allowedOrientations(s: PackItemSpec) {
 const {l,w,h}=s;
 return s.allowRotate===false?[[l,w,h]]:s.keepUpright?[[l,w,h],[w,l,h]]:[[l,w,h],[w,l,h],[l,h,w],[h,w,l],[w,h,l],[h,l,w]];
}
/** New boxes carry an explicit source ID. Legacy snapshots use an unambiguous generated ID, never a display label. */
export function sourceSpec(b:PlannerBox,specs:PackItemSpec[]) {
 if(b.specId)return specs.find(s=>s.id===b.specId);
 const matches=specs.filter(s=>b.id.startsWith(s.id+'-') && /^\d+$/.test(b.id.slice(s.id.length+1)));
 return matches.length===1?matches[0]:undefined;
}
const area=(a:PlannerBox,b:PlannerBox)=>Math.max(0,Math.min(a.px+a.l,b.px+b.l)-Math.max(a.px,b.px))*Math.max(0,Math.min(a.pz+a.w,b.pz+b.w)-Math.max(a.pz,b.pz));
/** Same 60% support and equal-support load split as the packing engine; a screening model, not a load certification. */
export function reviewPlanner(boxes:PlannerBox[],container:PackContainer,specs?:PackItemSpec[],door?:{w:number;h:number}|null,minSupportRatio=.6):PlannerReview {
 const issues:ReviewIssue[]=[];
 const add=(code:ReviewCode,ids:string[])=>issues.push({code,ids});
 const valid=(b:PlannerBox)=>[b.px,b.py,b.pz,b.l,b.w,b.h,b.weight??NaN].every(Number.isFinite)&&b.l>0&&b.w>0&&b.h>0&&(b.weight??-1)>=0;
 const good=boxes.filter(valid), mapped=new Map(boxes.map(b=>[b,sourceSpec(b,specs??[])]));
 const seen=new Set<string>();
 for(const b of boxes){
  if(!valid(b)){add('invalid',[b.id]);continue;}
  if(seen.has(b.id))add('identity',[b.id]);seen.add(b.id);
  if(b.px<-EPS||b.py<-EPS||b.pz<-EPS||b.px+b.l>container.l+EPS||b.py+b.h>container.h+EPS||b.pz+b.w>container.w+EPS)add('bounds',[b.id]);
  const s=mapped.get(b);
  if(specs&&!s)add('identity',[b.id]);
  if(s){
   if(!allowedOrientations(s).some(([l,w,h])=>Math.abs(l-b.l)<EPS&&Math.abs(w-b.w)<EPS&&Math.abs(h-b.h)<EPS))add('orientation',[b.id]);
   if(s.weightKnown===false||Math.abs(s.weight-(b.weight??0))>EPS)add('weight',[b.id]);
   if(door&&!allowedOrientations(s).some(([,w,h])=>w<=door.w+EPS&&h<=door.h+EPS))add('door',[b.id]);
  }
 }
 for(let i=0;i<good.length;i++)for(let j=i+1;j<good.length;j++){
  const a=good[i],b=good[j];
  if(area(a,b)>EPS&&a.py<b.py+b.h-EPS&&b.py<a.py+a.h-EPS)add('overlap',[a.id,b.id]);
  // Conservative straight-door-access screen, not a simulated unloading route.
  const yz=Math.min(a.pz+a.w,b.pz+b.w)>Math.max(a.pz,b.pz)+EPS&&Math.min(a.py+a.h,b.py+b.h)>Math.max(a.py,b.py)+EPS;
  if(yz&&a.unloadOrder!=null&&b.unloadOrder!=null&&a.unloadOrder!==b.unloadOrder){
   const early=a.unloadOrder<b.unloadOrder?a:b,late=early===a?b:a;
   if(early.px+early.l<=late.px+EPS)add('unload',[early.id,late.id]);
  }
 }
 const supports=new Map<PlannerBox,PlannerBox[]>();
 for(const b of good){
  const below=good.filter(a=>a!==b&&a.py<b.py&&Math.abs(a.py+a.h-b.py)<EPS&&area(a,b)>EPS);
  supports.set(b,below);
  if(b.py>EPS&&below.reduce((n,a)=>n+area(a,b),0)/(b.l*b.w)<minSupportRatio-EPS)add('support',[b.id]);
 }
 const loads=new Map(good.map(b=>[b,0]));
 for(const b of [...good].sort((a,b)=>b.py-a.py)){
  const s=mapped.get(b),above=loads.get(b)!;
  if(s&&above>(s.maxStack??Infinity)+EPS)add('stack',[b.id]);
  const below=supports.get(b)!;
  for(const a of below)loads.set(a,loads.get(a)!+(above+(b.weight??0))/below.length);
 }
 if(container.maxWeight!=null&&good.reduce((n,b)=>n+(b.weight??0),0)>container.maxWeight+EPS)add('payload',[]);
 if(!specs)add('unverified',[]);
 if(specs&&new Set(specs.map(s=>s.id)).size!==specs.length)add('identity',[]);
 const cargo=(specs??[]).map(s=>{
  const placed=boxes.filter(b=>mapped.get(b)===s).length;
  if(placed>s.qty)add('identity',boxes.filter(b=>mapped.get(b)===s).map(b=>b.id));
  const remaining=Math.max(0,s.qty-placed),orientations=allowedOrientations(s);
  let reason:CargoRow['reason']=null;
  if(remaining)reason=!orientations.some(([l,w,h])=>l<=container.l+EPS&&w<=container.w+EPS&&h<=container.h+EPS)?'dimensions':door&&!orientations.some(([,w,h])=>w<=door.w+EPS&&h<=door.h+EPS)?'door':container.maxWeight!=null&&s.weight>container.maxWeight+EPS?'payload':'search';
  return {id:s.id,label:s.label,requested:s.qty,placed,remaining,reason};
 });
 return {issues,cargo,checked:!!specs,complete:!!specs&&issues.length===0&&cargo.every(r=>r.remaining===0)};
}
export function reviewText(code:ReviewCode,zh=false):string {
 const texts:Record<ReviewCode,[string,string]>={
 invalid:['Invalid dimensions, coordinates or weight.','尺寸、位置或重量無效。'],identity:['Cargo identity or quantity cannot be reconciled.','貨物編號或數量未能對數。'],bounds:['Cargo extends outside the allowed space.','貨物超出允許空間。'],overlap:['Cartons overlap.','紙箱互相重疊。'],support:['Less than 60% of this base is supported.','箱底承托少於 60%。'],stack:['Load above exceeds the entered stacking limit.','上方重量超過輸入的堆疊上限。'],orientation:['Orientation does not match the carton rules.','方向不符合紙箱限制。'],weight:['Carton weight is missing or differs from the input.','箱重未提供或與輸入不符。'],payload:['Total cargo exceeds the payload limit.','貨物總重超過載重上限。'],door:['No permitted orientation fits the entered door aperture.','允許方向均未能通過設定的門口尺寸。'],unload:['Earlier-stop cargo is behind later-stop cargo; review door access.','先卸貨物被後卸貨物擋住；請核對卸貨通道。'],unverified:['Original cargo rules are unavailable; only geometry was screened.','缺少原始貨物限制；只檢查幾何位置。']};
 return texts[code][zh?1:0];
}
export function remainderText(reason:CargoRow['reason'],zh=false):string {
 const texts={dimensions:['Too large in every allowed orientation.','所有允許方向都超出空間尺寸。'],door:['No allowed orientation fits the door.','允許方向均未能通過門口。'],payload:['One carton exceeds the full payload limit.','單箱已超過載重上限。'],search:['Not placed in this layout. Compare equipment or review rules; this is not proof that it cannot fit.','目前方案未裝入。可比較櫃型或核對限制；不代表已證明放不下。']};
 return reason?texts[reason][zh?1:0]:'';
}
/** Display-only content fingerprint. Not an authentication or security token. */
export function plannerRevision(value:unknown):string {
 const s=JSON.stringify(value);let a=2166136261,b=5381;
 for(let i=0;i<s.length;i++){a=Math.imul(a^s.charCodeAt(i),16777619);b=Math.imul(b,33)^s.charCodeAt(i);}
 return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');
}
