import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { designCases, CASE_EXAMPLE, CASE_LIMITS, factorisations, sampleCaseCounts, parseCaseRequest, evaluateCase, casePalletView } from '../src/lib/caseDesign.ts';
import { perLayer, floorFit } from '../src/lib/pallets.ts';
import { packContainer } from '../src/lib/binPacking.ts';
import { CHECK_SEMANTICS } from '../src/lib/packChecks.ts';
import PalletEstimateView from '../src/components/PalletEstimateView.tsx';
import LayerDiagram from '../src/components/LayerDiagram.tsx';
import { onRequestGet,onRequestPost,onRequestOptions } from '../functions/api/case-design.ts';
import { ENDPOINT_BASE_LIMITS } from '../src/lib/apiTiers.ts';
let count=0;
async function test(name,fn){await fn();count++;console.log(`PASS case-design: ${name}`);}
const simple=()=>structuredClone(CASE_EXAMPLE);
function geometry(boxes,p){
 for(const [i,b] of boxes.entries()){
  assert.ok(b.px>=0&&b.py>=0&&b.pz>=0);
  assert.ok(b.px+b.l<=p.l+1e-6&&b.pz+b.w<=p.w+1e-6&&b.py+b.h<=p.maxHeight-p.baseHeight+1e-6);
  for(const c of boxes.slice(i+1))assert.ok(!(b.px<c.px+c.l-1e-6&&c.px<b.px+b.l-1e-6&&b.py<c.py+c.h-1e-6&&c.py<b.py+b.h-1e-6&&b.pz<c.pz+c.w-1e-6&&c.pz<b.pz+b.w-1e-6));
 }
}
await test('all 18 ordered factorisations of 12 and bounded inclusive sampling',()=>{
 const a=factorisations(12);assert.equal(a.length,18);assert.equal(new Set(a.map(v=>JSON.stringify(v))).size,18);a.forEach(v=>assert.equal(v.a*v.b*v.c,12));
 assert.deepEqual(sampleCaseCounts(12,12),[12]);assert.deepEqual(sampleCaseCounts(2,4),[2,3,4]);const s=sampleCaseCounts(1,2000);assert.equal(s.length,24);assert.equal(s[0],1);assert.equal(s.at(-1),2000);
});
await test('happy path, deterministic hash/result, dedupe, conservation and TI-HI',async()=>{
 const r=simple(),copy=structuredClone(r),out=await designCases(r);assert.equal(out.status,'found');assert.deepEqual(out,await designCases(r));assert.deepEqual(r,copy);assert.match(out.inputHash,/^[a-f0-9]{64}$/);assert.equal(out.semantics,CHECK_SEMANTICS);assert.equal(out.candidates.length,5);
 const dims=new Set();
 for(const c of out.candidates){
  assert.equal(c.arrangement.a*c.arrangement.b*c.arrangement.c,c.unitsPerCase);
  const d=Object.fromEntries(Object.entries(c.caseOuter).map(([k,v])=>[k,v.cm]));const key=Object.values(d).map(v=>v.toFixed(1)).join(':');assert.ok(!dims.has(key));dims.add(key);
  assert.equal(c.pallet.ti,perLayer(d.l,d.w,r.pallet.l,r.pallet.w));assert.equal(c.pallet.hi,Math.min(Math.floor((r.pallet.maxHeight-r.pallet.baseHeight)/d.h+1e-6),Math.floor(r.pallet.maxWeight/(c.pallet.ti*c.caseWeight.kg)+1e-6)));
  assert.equal(c.container.unitsPerContainer,c.container.palletsPerContainer*c.pallet.casesPerPallet*c.unitsPerCase);assert.equal(c.container.casesPerContainer,c.container.palletsPerContainer*c.pallet.casesPerPallet);
  assert.equal(c.pallet.casesPerPallet,c.pallet.ti*c.pallet.hi);assert.equal(c.pallet.unitsPerPallet,c.unitsPerCase*c.pallet.casesPerPallet);
  assert.ok(c.checks.every(c=>c.status!=='fail'));assert.ok(c.pallet.cubeUtilPct<=100+1e-6);assert.ok(c.container.volumeUtilPct<=100+1e-6);
  geometry(casePalletView(c,parseCaseRequest(r)).boxes,r.pallet);
 }
});
await test('weight/dimension rejection, no-fit branch and all check statuses',async()=>{
 for(const constraint of [{maxWeight:.001},{maxDim:1}]){
  const r={...simple(),caseConstraints:constraint};const out=await designCases(r);assert.equal(out.status,'none_within_search');assert.equal(out.candidates.length,0);assert.equal(out.searched.rejected,out.searched.enumerated);assert.equal(out.checks.find(c=>c.code==='CASE_WEIGHT').status,'not_evaluated');
  const c=evaluateCase(parseCaseRequest(r),{l:50,w:40,h:30},12,{a:3,b:2,c:2,orientation:'lwh'},'current');assert.ok(c.checks.some(c=>c.status==='fail'));
 }
 const r=simple();r.pallet.maxHeight=16;assert.equal((await designCases(r)).status,'none_within_search');
 const out=await designCases({product:r.product,unitsPerCase:12});assert.equal(out.status,'found');assert.equal(out.checks.find(c=>c.code==='PALLET_HEIGHT').status,'not_evaluated');assert.equal(out.checks.find(c=>c.code==='BOARD_MASS_ASSUMED').status,'warn');assert.equal(out.checks.find(c=>c.code==='COST_INPUTS_PROVIDED').status,'not_evaluated');
 const cost=await designCases({...simple(),costs:{handlingPerCase:1}});assert.equal(cost.checks.find(c=>c.code==='COST_INPUTS_PROVIDED').status,'pass');
});
await test('upright enforcement, board/headspace and six product orientations',async()=>{
 const r={product:{l:3,w:5,h:7,weight:1},unitsPerCase:1,candidates:10};const out=await designCases(r);assert.equal(out.candidates.length,6);assert.deepEqual(new Set(out.candidates.map(c=>c.arrangement.orientation)),new Set(['lwh','wlh','lhw','hwl','whl','hlw']));
 const up=await designCases({...r,product:{...r.product,keepUpright:true},caseConstraints:{allowedOrientations:'any'}});assert.equal(up.candidates.length,2);assert.ok(up.candidates.every(c=>c.caseOuter.h.cm===8.3));
 const cube=await designCases({...r,product:{l:5,w:5,h:5,weight:1}});assert.equal(cube.candidates.length,1);
});
await test('imperial input canonical hash and both output units',async()=>{
 const r=simple(),us=structuredClone(r);us.units='in-lb';for(const k of ['l','w','h'])us.product[k]/=2.54;us.product.weight/=.45359237;
 for(const k of ['l','w','baseHeight','maxHeight'])us.pallet[k]/=2.54;us.pallet.maxWeight/=.45359237;us.caseConstraints.maxWeight/=.45359237;
 const a=await designCases(r),b=await designCases(us);assert.deepEqual(a,b);for(const c of a.candidates){assert.equal(c.caseOuter.l.in,c.caseOuter.l.cm/2.54);assert.equal(c.caseWeight.lb,c.caseWeight.kg/.45359237);}
});
await test('container mixed floor, two tiers, door, payload and overhang',()=>{
 assert.equal(floorFit(120,80,589,235),11);assert.equal(floorFit(120,80,1203,235),25);
 const r=parseCaseRequest({...simple(),pallet:{l:120,w:80,baseHeight:15,maxHeight:100,maxWeight:1000},container:{preset:'20gp'}});
 const c=evaluateCase(r,{l:60,w:40,h:40},6,{a:1,b:2,c:3,orientation:'lwh'},'x');assert.equal(c.container.palletsPerContainer,22);
 const limited=evaluateCase({...r,container:{...r.container,maxWeight:30}},{l:60,w:40,h:40},6,{a:1,b:2,c:3,orientation:'lwh'},'x');assert.equal(limited.container.palletsPerContainer,0);
 const tall=evaluateCase({...r,pallet:{...r.pallet,maxHeight:240}},{l:60,w:40,h:220},6,{a:1,b:2,c:3,orientation:'lwh'},'x');assert.equal(tall.container.palletsPerContainer,0);
 const over={...r,pallet:{...r.pallet,overhang:2.5}};const base=evaluateCase(r,{l:62,w:40,h:40},6,{a:1,b:2,c:3,orientation:'lwh'},'x'),expanded=evaluateCase(over,{l:62,w:40,h:40},6,{a:1,b:2,c:3,orientation:'lwh'},'x');assert.ok(expanded.pallet.ti>base.pallet.ti);geometry(casePalletView(expanded,over).boxes.map(b=>({...b,px:b.px+2.5,pz:b.pz+2.5})),{...over.pallet,l:125,w:85});
});
await test('floor-load uses packContainer, conservation and geometry',async()=>{
 const r={product:{l:20,w:15,h:10,weight:1},unitsPerCase:1,caseConstraints:{boardThickness:0,headspace:0,allowedOrientations:'upright'},container:{l:60,w:40,h:30,maxWeight:100},candidates:2};
 const out=await designCases(r);for(const c of out.candidates){const d=Object.fromEntries(Object.entries(c.caseOuter).map(([k,v])=>[k,v.cm]));const p=packContainer(r.container,[{...d,id:'case',label:'Case',qty:c.container.requestedCases,weight:c.caseWeight.kg,keepUpright:true,color:0x2563eb}]);assert.equal(c.container.casesPerContainer,p.boxes.length);assert.equal(c.container.requestedCases,c.container.casesPerContainer+c.container.unplacedCases);assert.equal(c.container.unitsPerContainer,c.container.casesPerContainer*c.unitsPerCase);geometry(p.boxes,{...r.container,baseHeight:0,maxHeight:r.container.h});}
});
await test('floor-load cap is explicit even when more than 2,000 cases could fit',async()=>{
 const r={product:{l:1,w:1,h:1,weight:.1},unitsPerCase:1,caseConstraints:{boardThickness:0,headspace:0},container:{l:2000,w:2,h:1}};
 const c=(await designCases(r)).candidates[0];assert.equal(c.container.requestedCases,2000);assert.equal(c.container.casesPerContainer,2000);assert.equal(c.container.unplacedCases,0);assert.ok(c.assumptions.some(a=>a.includes('2,000')));assert.equal(c.container.volumeUtilPct,50);
});
await test('board cost changes geometric ranking; breakdown and freight shares',async()=>{
 const r={...simple(),unitsPerCase:{min:1,max:24},candidates:10};const a=await designCases(r),b=await designCases({...r,costs:{boardCostPerM2:100000,currency:'HKD'}});assert.notEqual(a.candidates[0].id,b.candidates[0].id);assert.ok(b.candidates[0].costPerUnit.value<=b.candidates.at(-1).costPerUnit.value);
 const c=(await designCases({...simple(),costs:{boardCostPerM2:2,handlingPerCase:1,freightPerContainer:1000,freightPerPallet:20,currency:'USD'}})).candidates[0];assert.equal(c.costPerUnit.value,Object.values(c.costPerUnit.breakdown).reduce((a,b)=>a+b,0));assert.equal(c.costPerUnit.breakdown.freight,1000/c.container.unitsPerContainer+20/c.pallet.unitsPerPallet);
});
await test('enumeration and result caps, no dropped case products',async()=>{
 const out=await designCases({...simple(),unitsPerCase:{min:1,max:2000},candidates:10,caseConstraints:{maxDim:100}});assert.ok(out.searched.enumerated<=400);assert.ok(out.candidates.length<=10);assert.equal(out.searched.counts.length,24);out.candidates.forEach(c=>assert.equal(c.arrangement.a*c.arrangement.b*c.arrangement.c,c.unitsPerCase));
});
await test('validation for every request field and malformed objects',async()=>{
 const fields=['units','product','unitsPerCase','caseConstraints','pallet','container','costs','candidates'];
 for(const field of fields){const r=simple();r[field]=null;await assert.rejects(designCases(r),e=>e.field?.startsWith(field),field);}
 const cases=[['product.l',0],['product.w','2'],['product.h',Infinity],['product.weight',-1],['product.keepUpright',1],['product.label',''],['unitsPerCase.min',0],['unitsPerCase.max',3],['caseConstraints.maxWeight',-1],['caseConstraints.maxDim',0],['caseConstraints.boardThickness',-1],['caseConstraints.headspace',-1],['caseConstraints.allowedOrientations','flat'],['pallet.l',0],['pallet.w',301],['pallet.baseHeight',-1],['pallet.maxHeight',15],['pallet.maxWeight',0],['pallet.overhang',-1],['container.preset','x'],['container.l',0],['container.w','3'],['container.h',NaN],['container.maxWeight',0],['costs.boardCostPerM2',-1],['costs.freightPerContainer',Infinity],['costs.freightPerPallet','3'],['costs.handlingPerCase',-1],['costs.currency','usd'],['candidates',11],['candidates',1.5],['units','mm']];
 for(const [path,value] of cases){const r=simple(),keys=path.split('.');let o=r;for(const k of keys.slice(0,-1))o=o[k]??= {};o[keys.at(-1)]=value;await assert.rejects(designCases(r),e=>e.field===path,path);}
 await assert.rejects(designCases(null),e=>e.field==='request');await assert.rejects(designCases({...simple(),unitsPerCase:1.5}),e=>e.field==='unitsPerCase.min');
 await assert.rejects(designCases({...simple(),container:{}}),e=>e.field==='container.l');
 await assert.rejects(designCases({product:simple().product,unitsPerCase:1,costs:{freightPerContainer:1}}),e=>e.field==='costs.freightPerContainer');
 await assert.rejects(designCases({product:simple().product,unitsPerCase:1,costs:{freightPerPallet:1}}),e=>e.field==='costs.freightPerPallet');
});
await test('SVG actual box count equals TI-HI including >200 cases and exact imperial layer',async()=>{
 const r=simple(),out=await designCases(r),c=out.candidates[0],view=casePalletView(c,parseCaseRequest(r));
 const html=renderToStaticMarkup(React.createElement(PalletEstimateView,{result:view,countTestId:'design-placed-count'}));assert.match(html,new RegExp(`data-testid="design-placed-count"[^>]*>${c.pallet.casesPerPallet}</output>`));const ids=new Set([...html.matchAll(/data-box-id="([^"]+)"/g)].map(m=>m[1]));ids.delete('base');assert.equal(ids.size,c.pallet.casesPerPallet);
 const p=parseCaseRequest(r),large=evaluateCase(p,{l:10,w:10,h:10},1,{a:1,b:1,c:1,orientation:'lwh'},'large');assert.ok(large.pallet.casesPerPallet>200);const v=casePalletView(large,p);assert.equal(v.boxes.length,large.pallet.casesPerPallet);geometry(v.boxes,v.pallet);
 const layer=renderToStaticMarkup(React.createElement(LayerDiagram,{cartonL:40.64,cartonW:30.48,palletL:121.92,palletW:101.6}));assert.equal([...layer.matchAll(/class="fill-blue-200 stroke-blue-500"/g)].length,9);
});
await test('endpoint 200/400/413/415, GET, CORS, invalid key and rate limits',async()=>{
 const ctx=(body,headers={})=>({env:{},request:new Request('https://x/api/case-design',{method:'POST',headers:{'Content-Type':'application/json',...headers},body,...(body instanceof ReadableStream?{duplex:'half'}:{})})});
 const body=JSON.stringify(simple());let res=await onRequestPost(ctx(body));assert.equal(res.status,200);assert.equal((await res.json()).tier,'anonymous');assert.equal(res.headers.get('Access-Control-Allow-Origin'),'*');
 res=await onRequestPost(ctx(JSON.stringify({...simple(),candidates:11})));assert.equal(res.status,400);assert.equal((await res.json()).field,'candidates');assert.equal((await onRequestPost(ctx('{'))).status,400);
 for(const ct of ['text/plain','application/jsonp'])assert.equal((await onRequestPost(ctx('{}',{'Content-Type':ct}))).status,415);
 assert.equal((await onRequestPost(ctx('x'.repeat(CASE_LIMITS.bodyBytes+1)))).status,413);
 const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(30000));c.enqueue(new Uint8Array(3000));c.close();}});assert.equal((await onRequestPost(ctx(stream))).status,413);
 assert.equal((await onRequestPost(ctx(body.padEnd(CASE_LIMITS.bodyBytes,' ')))).status,200);
 assert.ok((await (await onRequestPost(ctx(body,{'X-API-Key':'invalid'}))).json()).warning);
 const unknown={...ctx(body,{'X-API-Key':'dp_live_'+'a'.repeat(32)}),env:{LEADS:{get:async()=>null}}};assert.ok((await (await onRequestPost(unknown)).json()).warning);
 const get=await (await onRequestGet()).json();assert.equal(get.endpoint,'POST /api/case-design');for(const k of ['purpose','request','limits','response','semantics','docs'])assert.ok(get[k]);assert.equal(get.semantics,CHECK_SEMANTICS);assert.equal((await designCases(get.request)).status,'found');
 const options=await onRequestOptions();assert.equal(options.status,204);assert.match(options.headers.get('Access-Control-Allow-Headers'),/X-API-Key, Authorization/);assert.deepEqual(ENDPOINT_BASE_LIMITS['case-design'],{perMin:10,perDay:100});
 for(const [window,limit] of [[60,10],[86400,100]]){const env={LEADS:{get:async k=>k.includes(`|${window}|`)?String(limit):'0',put:async()=>{}}};res=await onRequestPost({...ctx(body,{'CF-Connecting-IP':'192.0.2.10'}),env});assert.equal(res.status,429);assert.ok(res.headers.get('Retry-After'));}
});
console.log(`${count} case-design checks passed`);
