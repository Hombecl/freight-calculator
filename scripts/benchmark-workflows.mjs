import {writeFileSync,mkdirSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {quoteOrder,QUOTE_EXAMPLE} from '../src/lib/orderQuote.ts';
const base=structuredClone(QUOTE_EXAMPLE);
const cases=[
 ['mixed-order',base],
 ['receiver-height',{...base,limits:{name:'Verified fixture cap',maxLoadedHeight:120}}],
 ['heavy-cartons',{...base,items:base.items.map(i=>({...i,weight:100})),pallet:{...base.pallet,maxWeight:250}}],
 ['upright-only',{...base,items:base.items.map(i=>({...i,keepUpright:true}))}],
 ['single-pallet-overflow',{...base,maxPallets:1,items:base.items.map(i=>({...i,qty:i.qty*5}))}],
 ['no-stacking',{...base,items:base.items.map(i=>({...i,maxStack:0}))}],
];
const out=process.argv[2]??'artifacts/workflow-benchmark';mkdirSync(out,{recursive:true});
const results=[];
for(const [id,request]of cases){
 const t=performance.now(),q=await quoteOrder(request),ms=performance.now()-t;
 const requested=request.items.reduce((a,b)=>a+b.qty,0);
 const placed=q.pallets.reduce((a,b)=>a+b.boxes.length,0);
 if(placed+q.summary.cartonsUnplaced!==requested)throw Error(`Conservation failed: ${id}`);
 for(const p of q.pallets)for(let i=0;i<p.boxes.length;i++){
  const b=p.boxes[i];if(b.px<-.001||b.py<-.001||b.pz<-.001||b.px+b.l>request.pallet.l+.001||b.pz+b.w>request.pallet.w+.001||b.py+b.h+request.pallet.baseHeight>request.pallet.maxHeight+.001)throw Error(`Out of bounds ${id}`);
  for(const c of p.boxes.slice(i+1))if(b.px<c.px+c.l-.001&&b.px+b.l>c.px+.001&&b.py<c.py+c.h-.001&&b.py+b.h>c.py+.001&&b.pz<c.pz+c.w-.001&&b.pz+b.w>c.pz+.001)throw Error(`Overlap ${id}`);
 }
 writeFileSync(`${out}/${id}.json`,JSON.stringify({request,dimpack:q},null,2));
 writeFileSync(`${out}/${id}.csv`,['Label,Length_cm,Width_cm,Height_cm,Weight_kg,Quantity,Keep_upright,Max_stack_kg',...request.items.map(i=>[JSON.stringify(i.label??i.sku??'Carton'),i.l,i.w,i.h,i.weight,i.qty,i.keepUpright??false,i.maxStack??''].join(','))].join('\n'));
 results.push({id,inputHash:q.inputHash,requested,placed,unplaced:q.summary.cartonsUnplaced,pallets:q.summary.palletCount,status:q.status,elapsedMs:Math.round(ms),geometry:'passed',competitorResults:null});
}
writeFileSync(`${out}/scorecard.json`,JSON.stringify({capturedAt:new Date().toISOString(),method:'Identical dimensions, weights, orientation, stack limits, pallet base and receiver limits are required before comparison. Runtime is local single-run diagnostic, not a competitor speed claim.',results,verdict:'DimPack fixtures verified. Competitor matched runs pending; no superiority conclusion.'},null,2));
console.log(JSON.stringify(results,null,2));
