import type {SearchMethod} from './singleSkuPacking';
import {computeStats, packWithConstraints, type PackContainer, type PackItemSpec, type PackingOptions} from './binPacking';
import type {OptimizedResult} from './optimizePacking';
import {reviewPlanner} from './plannerReview';
import type {PlannerBox} from './plannerBox';
export type LayoutMethod = SearchMethod | 'standard' | 'low-top' | 'footprint' | 'layers';
export interface LayoutAlternative {id:LayoutMethod; result:OptimizedResult}
/** Ignore incidental instance IDs and array ordering, but retain SKU identity. */
export function layoutSignature(boxes:PlannerBox[]) {
 return boxes.map(b=>[b.specId??b.label,b.px,b.py,b.pz,b.l,b.w,b.h].join('|')).sort().join(';');
}
/** Same requested cargo and constraints. Never manufacture a lesser plan by dropping boxes. */
export function plannerAlternatives(container:PackContainer & {door?:{w:number;h:number}|null},specs:PackItemSpec[],recommended:OptimizedResult):LayoutAlternative[]{
 const seen=new Set([layoutSignature(recommended.boxes)]), found:LayoutAlternative[]=[];
 const requested=specs.reduce((n,s)=>n+s.qty,0);
 for(const candidate of recommended.candidates??[]){
  const signature=layoutSignature(candidate.boxes);
  if(seen.has(signature)||reviewPlanner(candidate.boxes,container,specs,container.door).issues.length)continue;
  seen.add(signature);
  found.push({id:candidate.id,result:{boxes:candidate.boxes,unplaced:requested-candidate.boxes.length,stats:computeStats(candidate.boxes,container),zones:[{unloadOrder:specs.find(s=>s.qty>0)?.unloadOrder??1,xStart:0,xEnd:container.l,count:candidate.boxes.length}],optimization:{baselineCount:recommended.optimization.baselineCount,addedCount:candidate.boxes.length-recommended.optimization.baselineCount,method:'single-sku'}}});
 }
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

 }
 return found.sort((a,b)=>b.result.stats.volumeUtil-a.result.stats.volumeUtil || b.result.boxes.length-a.result.boxes.length || a.result.stats.cog.y-b.result.stats.cog.y).slice(0,2);
}
