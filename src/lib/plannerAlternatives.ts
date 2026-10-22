import {packWithConstraints, type PackContainer, type PackItemSpec, type PackingOptions} from './binPacking';
import type {OptimizedResult} from './optimizePacking';
import {reviewPlanner} from './plannerReview';
import type {PlannerBox} from './plannerBox';
export type LayoutMethod = 'standard' | 'low-top' | 'footprint' | 'layers';
export interface LayoutAlternative {id:LayoutMethod; result:OptimizedResult}
/** Ignore incidental instance IDs and array ordering, but retain SKU identity. */
export function layoutSignature(boxes:PlannerBox[]) {
 return boxes.map(b=>[b.specId??b.label,b.px,b.py,b.pz,b.l,b.w,b.h].join('|')).sort().join(';');
}
/** Same requested cargo and constraints. Never manufacture a lesser plan by dropping boxes. */
export function plannerAlternatives(container:PackContainer & {door?:{w:number;h:number}|null},specs:PackItemSpec[],recommended:OptimizedResult):LayoutAlternative[]{
 const seen=new Set([layoutSignature(recommended.boxes)]), found:LayoutAlternative[]=[];
 const methods:[LayoutMethod,PackingOptions][]=[['standard',{}],['low-top',{strategy:'height'}],['footprint',{strategy:'footprint',ordering:'largest-footprint-first'}],['layers',{strategy:'layered'}]];
 for(const [id,options] of methods){
  // The default general result is already shown; avoid repeating that work.
  if(id==='standard' && recommended.optimization.method==='general')continue;
  const candidate=packWithConstraints(container,specs,options);
  if(!candidate.boxes.length)continue;
  const signature=layoutSignature(candidate.boxes);
  if(seen.has(signature))continue;
  seen.add(signature);
  if(reviewPlanner(candidate.boxes,container,specs,container.door).issues.length)continue;
  found.push({id,result:{...candidate,optimization:{baselineCount:candidate.boxes.length,addedCount:0,method:'general'}}});
  if(found.length===2)break;
 }
 return found;
}
