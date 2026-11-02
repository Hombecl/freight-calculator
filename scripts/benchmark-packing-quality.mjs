// Reproducible synthetic benchmark; no customer data or competitor-speed claims.
import {mkdirSync,writeFileSync} from 'node:fs';
import {productPackingScenarios,calculatePackingScenarios} from '../src/lib/productPacking.ts';
import {optimizePacking} from '../src/lib/optimizePacking.ts';
import {verifySingleSkuPacking} from '../src/lib/singleSkuPacking.ts';
const out=process.argv[2]??'artifacts/packing-quality';mkdirSync(out,{recursive:true});
const EPS=1e-6;
function geometry(boxes,space){
 const failures=[];
 for(let i=0;i<boxes.length;i++){
  const a=boxes[i];
  if(![a.x,a.y,a.z,a.l,a.w,a.h].every(Number.isFinite)||Math.min(a.l,a.w,a.h)<=0||Math.min(a.x,a.y,a.z)<-EPS||a.x+a.l>space.l+EPS||a.y+a.w>space.w+EPS||a.z+a.h>space.h+EPS)failures.push('bounds');
  for(const b of boxes.slice(0,i))if(a.x+a.l>b.x+EPS&&b.x+b.l>a.x+EPS&&a.y+a.w>b.y+EPS&&b.y+b.w>a.y+EPS&&a.z+a.h>b.z+EPS&&b.z+b.h>a.z+EPS)failures.push('overlap');
 }
 return [...new Set(failures)];
}
const products=[{l:20,w:12,h:8},{l:17,w:11,h:7},{l:13,w:9,h:6},{l:15,w:10,h:8},{l:10,w:10,h:10},{l:100,w:100,h:100}];
const spaces=[{l:59,w:39,h:39},{l:49,w:39,h:29},{l:39,w:29,h:29},{l:40,w:30,h:20}];
const cartons=[];
for(const space of spaces)for(const item of products){
 const t=performance.now();const plans=productPackingScenarios(item,space),ms=performance.now()-t;
 const baseline=calculatePackingScenarios(item,space)[0]?.count??0;
 const upper=Math.floor(space.l*space.w*space.h/(item.l*item.w*item.h)+EPS);
 const alternatives=plans.map(p=>({count:p.count,utilization:p.utilization,geometryFailures:geometry(p.items,space)}));
 const loaded=plans[0]?.count??0;
 cartons.push({id:`carton-${cartons.length+1}`,item,space,baseline,loaded,gain:loaded-baseline,volumeUpperBound:upper,boundReached:loaded===upper,elapsedMs:+ms.toFixed(2),alternatives});
 writeFileSync(`${out}/carton-${cartons.length}-placements.json`,JSON.stringify({item,space,plans},null,2));
}
const base={id:'a',label:'Synthetic A',l:60,w:40,h:35,qty:150,weight:10,color:1};
const container={l:250,w:235,h:239,maxWeight:1500};
const fixtures=[['single',container,[base]],['payload',{...container,maxWeight:65},[base]],['upright',container,[{...base,keepUpright:true}]],['fixed_orientation',container,[{...base,allowRotate:false}]],['no_stack',container,[{...base,maxStack:0}]],['mixed',container,[{...base,qty:40},{...base,id:'b',label:'Synthetic B',l:45,w:40,h:30,qty:35,weight:6,maxStack:0,unloadOrder:1}]]];
const containers=[];
for(const [id,c,specs] of fixtures){
 const t=performance.now(),r=optimizePacking(c,specs),elapsedMs=performance.now()-t;
 const failures=geometry(r.boxes.map(b=>({x:b.px,y:b.pz,z:b.py,l:b.l,w:b.w,h:b.h})),c);
 const requested=specs.reduce((n,s)=>n+s.qty,0),weight=r.boxes.reduce((n,b)=>n+(b.weight??0),0);
 if(r.boxes.length+r.unplaced!==requested)failures.push('quantity_conservation');
 if(weight>c.maxWeight+EPS)failures.push('payload');
 for(const s of specs){
  const placed=r.boxes.filter(b=>b.specId===s.id||(!b.specId&&b.label===s.label));
  if(placed.length>s.qty)failures.push('sku_quantity');
  if(s.keepUpright&&placed.some(b=>Math.abs(b.h-s.h)>EPS))failures.push('upright');
  if(s.allowRotate===false&&placed.some(b=>Math.abs(b.l-s.l)>EPS||Math.abs(b.w-s.w)>EPS||Math.abs(b.h-s.h)>EPS))failures.push('orientation');
 }
 const verifiedSingle=specs.length===1?verifySingleSkuPacking(r.boxes,c,specs[0]):null;
 containers.push({id,requested,loaded:r.boxes.length,unplaced:r.unplaced,weight,elapsedMs:+elapsedMs.toFixed(2),failures:[...new Set(failures)],verifiedSingle,mixedStackValidation:specs.length>1?'not_independently_evaluated':null});
 writeFileSync(`${out}/container-${id}.json`,JSON.stringify({container:c,specs,result:r},null,2));
}
const summary={cartonCases:cartons.length,improved:cartons.filter(c=>c.gain>0).length,unchanged:cartons.filter(c=>c.gain===0).length,regressions:cartons.filter(c=>c.gain<0).length,boundReached:cartons.filter(c=>c.boundReached).length,invalidAlternatives:cartons.flatMap(c=>c.alternatives).filter(a=>a.geometryFailures.length).length,containerCases:containers.length,containerFailures:containers.filter(c=>c.failures.length||c.verifiedSingle===false).length};
const evidence={createdAt:new Date().toISOString(),method:'Synthetic fixtures, first invocation per geometry in a fresh process. Timing includes optimization only, not independent benchmark geometry audit. Volume bound is an upper limit, not an achievable target. Packing permits free rotation; cushioning must be included in dimensions. Mixed-SKU full stacking/load propagation and actual loading remain unverified by this independent benchmark. No global-optimum or customer-satisfaction conclusion.',summary,cartons,containers};
writeFileSync(`${out}/scorecard.json`,JSON.stringify(evidence,null,2));console.log(JSON.stringify(summary,null,2));
if(summary.regressions||summary.invalidAlternatives||summary.containerFailures)process.exitCode=1;
