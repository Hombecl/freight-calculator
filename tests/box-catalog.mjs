import assert from 'node:assert/strict';
import { optimizeBoxCatalog, chooseBox, parseBoxCatalog, BOX_EXAMPLE, BOX_LIMITS } from '../src/lib/boxCatalog.ts';
import { importHistory } from '../src/lib/boxCatalogImport.ts';
import { packContainer } from '../src/lib/binPacking.ts';
import { CHECK_SEMANTICS } from '../src/lib/packChecks.ts';
import { ENDPOINT_BASE_LIMITS } from '../src/lib/apiTiers.ts';
import { onRequestPost, onRequestGet, onRequestOptions } from '../functions/api/box-catalog.ts';
const example = () => structuredClone(BOX_EXAMPLE);
let count = 0;
async function test(name, fn) { await fn(); count++; console.log(`PASS box-catalog: ${name}`); }
const close = (a,b) => assert.ok(Math.abs(a-b) < 1e-7, `${a} != ${b}`);
async function geometry(req, catalog) {
  for (const o of req.orders) {
    const r = await chooseBox({...req, lines:o.lines},catalog);
    const total = o.lines.reduce((n,l)=>n+l.qty,0);
    assert.equal(r.plan.boxes.length+r.plan.unplaced,total);
    if (!r.box) { assert.equal(r.plan.unplaced,total); continue; }
    assert.equal(r.plan.unplaced,0);
    for (const [i,b] of r.plan.boxes.entries()) {
      assert.ok(b.px>=0&&b.py>=0&&b.pz>=0);
      assert.ok(b.px+b.l<=r.box.l+1e-6&&b.py+b.h<=r.box.h+1e-6&&b.pz+b.w<=r.box.w+1e-6);
      for (const c of r.plan.boxes.slice(i+1)) assert.ok(!(b.px<c.px+c.l-1e-6&&c.px<b.px+b.l-1e-6&&b.py<c.py+c.h-1e-6&&c.py<b.py+b.h-1e-6&&b.pz<c.pz+c.w-1e-6&&c.pz<b.pz+b.w-1e-6));
    }
    const parsed=parseBoxCatalog({...req,candidateBoxes:catalog});
    const specs=o.lines.map(l=>{const s=parsed.skus.find(s=>s.sku===l.sku);return {...s,id:s.sku,label:s.sku,qty:l.qty,color:0x60a5fa,...(s.fragile?{maxStack:0}:{})};});
    assert.deepEqual(r.plan,packContainer(r.box,specs));
  }
}
await test('happy path, baseline, counts, savings, required checks',async()=>{
 const r=await optimizeBoxCatalog(example());
 assert.equal(r.catalog.length,2);assert.equal(r.totals.orders,100);assert.equal(r.totals.unfitOrders,0);
 close(r.totals.billedWeight.kg,24);close(r.baseline.billedWeight.kg,540);close(r.totals.cost,48);close(r.baseline.cost,1080);
 close(r.savings.billedWeightPct,(540-24)/540*100);close(r.savings.costPer1000Orders,10320);
 assert.equal(r.catalog.reduce((n,b)=>n+b.usedByOrders,0),100);close(r.catalog.reduce((n,b)=>n+b.sharePct,0),100);
 assert.deepEqual(r.checks.map(c=>c.code),['ALL_ORDERS_FIT','DIVISOR_STATED','RATE_PROVIDED','CATALOG_SIZE_RESPECTED']);assert.ok(r.checks.every(c=>c.status==='pass'&&c.assumption));
 assert.equal(r.semantics,CHECK_SEMANTICS);assert.match(r.inputHash,/^[a-f0-9]{64}$/);await geometry(example(),r.catalog);
});
const finding = () => ({
 skus:[{sku:'A',l:20,w:15,h:10,weight:.2},{sku:'B',l:30,w:10,h:10,weight:.2},{sku:'C',l:30,w:15,h:20,weight:.2}],
 orders:[{orderId:'o1',lines:[{sku:'A',qty:1}],count:500},{orderId:'o2',lines:[{sku:'B',qty:1}],count:300},{orderId:'o3',lines:[{sku:'C',qty:1}],count:200}],
 currentBoxes:[{id:'old',l:45,w:35,h:30}],catalogSize:2,billing:{unit:'cm-kg',dimDivisor:5000,ratePerKgOrLb:2}
});
await test('05b generated 500/300/200 regression, feasible two-box cover and analysis objective',async()=>{
 const a=finding();const pool=(await optimizeBoxCatalog({...a,catalogSize:12})).catalog;
 assert.ok(pool.some(b=>b.l===20&&b.w===15&&b.h===10));
 const covering=pool.find(b=>b.l>=30&&b.w>=15&&b.h>=20);assert.ok(covering);
 await geometry(a,[pool.find(b=>b.l===20&&b.w===15&&b.h===10),covering]);
 const r=await optimizeBoxCatalog(a);assert.equal(r.totals.unfitOrders,0);assert.equal(r.catalog.length,2);assert.equal(r.savings.basisOrders,1000);assert.equal(r.savings.excludedUnfit,0);
 assert.deepEqual(r,await optimizeBoxCatalog({...a,coverageFirst:true}));await geometry(a,r.catalog);
 const legacy=await optimizeBoxCatalog({...a,coverageFirst:false});assert.equal(legacy.totals.unfitOrders,200);assert.equal(legacy.savings.basisOrders,800);assert.equal(legacy.savings.partial,true);assert.notEqual(legacy.inputHash,r.inputHash);
 delete a.billing.ratePerKgOrLb;assert.equal((await optimizeBoxCatalog(a)).totals.unfitOrders,0);
});
await test('05b impossible two-box cover maximizes counts and excludes unfit savings',async()=>{
 const a=finding();a.skus=[{sku:'A',l:40,w:5,h:5,weight:.2,keepUpright:true},{sku:'B',l:20,w:20,h:5,weight:.2,keepUpright:true},{sku:'C',l:10,w:10,h:30,weight:.2,keepUpright:true}];
 a.candidateBoxes=a.skus.map(s=>({id:s.sku,l:s.l,w:s.w,h:s.h}));
 for(let i=0;i<3;i++){const r=await optimizeBoxCatalog({...a,candidateBoxes:a.candidateBoxes.filter((_,j)=>j!==i)});assert.ok(r.totals.unfitOrders>0);}
 const r=await optimizeBoxCatalog(a);assert.equal(r.totals.unfitOrders,200);assert.equal(r.unfitSharePct,20);assert.equal(r.checks[0].status,'fail');assert.ok(r.notes.includes('COVERAGE_LIMITED_BY_CATALOG_SIZE'));assert.equal(r.savings.partial,true);assert.equal(r.savings.basisOrders,800);assert.equal(r.savings.excludedUnfit,200);
 const base=800*45*35*30/5000,newWeight=500*.2+300*.4;close(r.savings.billedWeightPct,(base-newWeight)/base*100);close(r.savings.costPer1000Orders,(base-newWeight)*2/800*1000);
 assert.equal(r.catalog.reduce((n,b)=>n+b.usedByOrders,0)+r.totals.unfitOrders,1000);await geometry(a,r.catalog);
 a.currentBoxes=[a.candidateBoxes[0]];const partial=await optimizeBoxCatalog(a);assert.equal(partial.savings.basisOrders,500);assert.equal(partial.savings.excludedUnfit,500);close(partial.savings.billedWeightPct,0);
 a.currentBoxes=[{id:'tiny',l:1,w:1,h:1}];const none=await optimizeBoxCatalog(a);assert.equal(none.savings.basisOrders,0);assert.equal(none.savings.excludedUnfit,1000);assert.equal(none.savings.partial,true);close(none.savings.billedWeightPct,0);close(none.savings.costPer1000Orders,0);
 delete a.currentBoxes;const noBaseline=await optimizeBoxCatalog(a);assert.ok(!('baseline' in noBaseline));assert.ok(!('savings' in noBaseline));
});
await test('deterministic result and hash; canonical duplicate lines',async()=>{
 const a=example();assert.deepEqual(await optimizeBoxCatalog(a),await optimizeBoxCatalog(a));
 a.orders[1].lines=[{sku:'A',qty:1},{sku:'A',qty:1}];assert.deepEqual(await optimizeBoxCatalog(a),await optimizeBoxCatalog(example()));
 a.billing.dimDivisor=6000;assert.notEqual((await optimizeBoxCatalog(a)).inputHash,(await optimizeBoxCatalog(example())).inputHash);
});
await test('imperial billing, minimum, independent input and billing units',async()=>{
 const a={units:'in-lb',skus:[{sku:'A',l:10,w:10,h:10,weight:1}],orders:[{lines:[{sku:'A',qty:1}]}],candidateBoxes:[{id:'b',l:10,w:10,h:10}],catalogSize:1,billing:{unit:'in-lb',dimDivisor:139,minBillableWeight:10,ratePerKgOrLb:3}};
 let r=await optimizeBoxCatalog(a);close(r.perOrder[0].dimWeight.lb,1000/139);close(r.totals.billedWeight.lb,10);close(r.totals.cost,30);close(r.catalog[0].dims.cm.l,25.4);
 const metric=structuredClone(a);metric.units='cm-kg';metric.skus[0]={sku:'A',l:25.4,w:25.4,h:25.4,weight:.45359237};metric.candidateBoxes[0]={id:'b',l:25.4,w:25.4,h:25.4};close((await optimizeBoxCatalog(metric)).totals.cost,30);
 a.billing.minBillableWeight=0;r=await optimizeBoxCatalog(a);close(r.totals.billedWeight.lb,1000/139);
 a.billing={unit:'cm-kg',dimDivisor:5000,minBillableWeight:5,ratePerKgOrLb:2};r=await optimizeBoxCatalog(a);close(r.totals.billedWeight.kg,5);close(r.totals.cost,10);
});
await test('void cost, box cost, missing and zero rate, no baseline',async()=>{
 const a=example();a.candidateBoxes=[{id:'b',l:30,w:30,h:30,cost:1}];a.voidFillCostPerLitre=.5;
 let r=await optimizeBoxCatalog(a);close(r.totals.voidLitres,2580);close(r.totals.cost,1080+1290+100);
 delete a.billing.ratePerKgOrLb;delete a.currentBoxes;r=await optimizeBoxCatalog(a);assert.equal(r.checks[2].status,'not_evaluated');assert.ok(!('cost'in r.totals));assert.ok(!('baseline'in r));assert.ok(!('savings'in r));assert.ok(!('cost'in r.perOrder[0]));
 a.billing.ratePerKgOrLb=0;r=await optimizeBoxCatalog(a);close(r.totals.cost,1390);assert.equal(r.checks[2].status,'pass');
});
await test('unfit fallback counts all quantities and history occurrences',async()=>{
 const a=example();a.candidateBoxes=[{id:'tiny',l:1,w:1,h:1},{id:'too-light',l:30,w:30,h:30,maxWeight:0}];
 const r=await optimizeBoxCatalog(a);assert.equal(r.totals.unfitOrders,100);assert.equal(r.checks[0].status,'fail');assert.ok(r.perOrder.every(o=>o.boxId===null));close(r.totals.billedWeight.kg,540);assert.equal(r.perOrder.reduce((n,o)=>n+o.count*o.lines.reduce((q,l)=>q+l.qty,0),0),120);
 await geometry(a,a.candidateBoxes);
});
await test('upright and fragile use packContainer semantics',async()=>{
 const a={skus:[{sku:'A',l:2,w:2,h:8,weight:1,keepUpright:true}],orders:[{lines:[{sku:'A',qty:1}]}],candidateBoxes:[{id:'flat',l:8,w:2,h:2}],catalogSize:1,billing:{unit:'cm-kg',dimDivisor:5000}};
 assert.equal((await optimizeBoxCatalog(a)).totals.unfitOrders,1);a.skus[0].keepUpright=false;assert.equal((await optimizeBoxCatalog(a)).totals.unfitOrders,0);await geometry(a,a.candidateBoxes);
 a.skus[0]={sku:'A',l:10,w:10,h:10,weight:1,fragile:true};a.orders[0].lines[0].qty=2;a.candidateBoxes=[{id:'stack',l:10,w:10,h:20}];assert.equal((await optimizeBoxCatalog(a)).totals.unfitOrders,1);
 a.candidateBoxes.push({id:'floor',l:20,w:10,h:10});await geometry(a,a.candidateBoxes);assert.equal((await chooseBox({...a,lines:a.orders[0].lines},a.candidateBoxes)).boxId,'floor');
});
await test('single order chooses billed weight even with different box costs',async()=>{
 const a=example();a.candidateBoxes[0].cost=100;const r=await chooseBox({...a,lines:[{sku:'A',qty:1}]},a.candidateBoxes);assert.equal(r.boxId,'small');assert.equal(r.plan.boxes.length,1);assert.equal(r.perOrder[0].boxId,'small');assert.equal(r.semantics,CHECK_SEMANTICS);
});
await test('size and bounded budgets, generation and rounding',async()=>{
 for (const budget of [1,2,5,200,1000]) {const a=example();a.searchBudget=budget;a.catalogSize=3;const r=await optimizeBoxCatalog(a);assert.equal(r.catalog.length,3);assert.ok(r.searched.combos<=budget);}
 for (const units of ['cm-kg','in-lb']) {const a=example();a.units=units;delete a.candidateBoxes;const r=await optimizeBoxCatalog(a);assert.equal(r.totals.unfitOrders,0);assert.ok(r.searched.candidates<=40);for(const b of r.catalog)for(const n of Object.values(b.dims.cm))close(n,Math.round(n));const cat=r.catalog.map(b=>({...b,...(units==='in-lb'?b.dims.in:b.dims.cm)}));await geometry(a,cat);}
 const a=example();a.catalogSize=12;assert.equal((await optimizeBoxCatalog(a)).catalog.length,3);
});
await test('generated large boxes remain usable by the single-order picker',async()=>{
 const a={skus:[{sku:'large',l:1000,w:1000,h:1000,weight:1}],orders:[{lines:[{sku:'large',qty:2}]}],catalogSize:1,billing:{unit:'cm-kg',dimDivisor:5000}};
 const r=await optimizeBoxCatalog(a);assert.equal(r.totals.unfitOrders,0);await geometry(a,r.catalog);
});
await test('history groups duplicate lines and shapes without dropping orders',async()=>{
 const r=importHistory('orderId,sku,qty\na,A,1\na,A,1\nb,A,2\nc,B,1');assert.deepEqual(r,[{orderId:'a',count:2,lines:[{sku:'A',qty:2}]},{orderId:'c',count:1,lines:[{sku:'B',qty:1}]}]);
 for(const s of ['a,A,0','a,A,1.2','a,,1','a,A,no','a,A,1,extra'])assert.throws(()=>importHistory(s));
});
await test('validation of every request field and limits',async()=>{
 const cases=[];const add=(path,value,field=path)=>cases.push([path,value,field]);
 for(const [p,v] of [['coverageFirst','true'],['coverageFirst',null],['coverageFirst',0],['units','mm'],['units',null],['skus',[]],['skus',Array(301).fill({})],['orders',[]],['orders',Array(501).fill({})],['catalogSize',0],['catalogSize',13],['catalogSize',1.5],['billing',null],['billing.unit','kg'],['billing.dimDivisor',0],['billing.minBillableWeight',-1],['billing.ratePerKgOrLb',-1],['voidFillCostPerLitre',-1],['searchBudget',0],['searchBudget',1001],['searchBudget',1.5]])add(p,v);
 for(const p of ['skus.0.sku','orders.0.orderId'])add(p,' ',p.replace('.0','[0]'));
 for(const k of ['l','w','h','weight']){add(`skus.0.${k}`,k==='weight'?-1:0,`skus[0].${k}`);add(`skus.0.${k}`,NaN,`skus[0].${k}`);}
 for(const k of ['fragile','keepUpright'])add(`skus.0.${k}`,'true',`skus[0].${k}`);
 for(const [p,v] of [['orders.0.count',0],['orders.0.count',1.5],['orders.0.lines',[]],['orders.0.lines.0.sku','missing'],['orders.0.lines.0.qty',0],['orders.0.lines.0.qty',61],['orders.0.lines.0.qty',1.5]])add(p,v,p.replaceAll('.0','[0]'));
 for(const pool of ['candidateBoxes','currentBoxes']) {add(pool,[]);add(pool,Array(41).fill({}));add(`${pool}.0`,null,`${pool}[0]`);for(const k of ['id','l','w','h','maxWeight','cost'])add(`${pool}.0.${k}`,k==='id'?'':-1,`${pool}[0].${k}`);}
 for(const [path,value,field] of cases){const a=example(),keys=path.split('.');let x=a;for(const k of keys.slice(0,-1))x=x[k];x[keys.at(-1)]=value;await assert.rejects(optimizeBoxCatalog(a),e=>e.field===field,`${path}=${value}`);}
 for(const a of [null,[],1])await assert.rejects(optimizeBoxCatalog(a),e=>e.field==='request');
 const a=example();a.skus.push(a.skus[0]);await assert.rejects(optimizeBoxCatalog(a),e=>e.field==='skus[1].sku');
 for(const pool of ['candidateBoxes','currentBoxes']){const a=example();a[pool].push(a[pool][0]);await assert.rejects(optimizeBoxCatalog(a),e=>e.field===`${pool}[${a[pool].length-1}].id`);}
 const many=example();many.skus=Array.from({length:11},(_,i)=>({...many.skus[0],sku:String(i)}));many.orders=[{lines:many.skus.map(s=>({sku:s.sku,qty:1}))}];await assert.rejects(optimizeBoxCatalog(many),e=>e.field==='orders[0].lines');
 const big=example();big.orders[0].lines=[{sku:'A',qty:40},{sku:'A',qty:21}];await assert.rejects(optimizeBoxCatalog(big),e=>e.field==='orders[0].lines');
});
await test('endpoint 200/400/413/415, CORS, tier, invalid keys and rate limits',async()=>{
 const ctx=(body,headers={})=>({env:{},request:new Request('https://x/api/box-catalog',{method:'POST',headers:{'Content-Type':'application/json',...headers},body,...(body instanceof ReadableStream?{duplex:'half'}:{})})});
 const body=JSON.stringify(example());let res=await onRequestPost(ctx(body));assert.equal(res.status,200);assert.equal(res.headers.get('Access-Control-Allow-Origin'),'*');assert.equal((await res.json()).tier,'anonymous');
 res=await onRequestPost(ctx('{}'));assert.equal(res.status,400);assert.equal((await res.json()).field,'skus');assert.equal((await onRequestPost(ctx('{'))).status,400);
 for(const type of ['text/plain','application/jsonp'])assert.equal((await onRequestPost(ctx(body,{'Content-Type':type}))).status,415);
 assert.equal((await onRequestPost(ctx('x'.repeat(BOX_LIMITS.bodyBytes+1)))).status,413);
 assert.equal((await onRequestPost(ctx(new ReadableStream({start(c){c.enqueue(new Uint8Array(60000));c.enqueue(new Uint8Array(40000));c.close();}})))).status,413);
 assert.equal((await onRequestPost(ctx(body.padEnd(BOX_LIMITS.bodyBytes,' ')))).status,200);
 assert.ok((await(await onRequestPost(ctx(body,{'X-API-Key':'bad'}))).json()).warning);
 const get=await(await onRequestGet()).json();for(const k of ['endpoint','purpose','request','limits','response','semantics','docs'])assert.ok(get[k]);assert.equal(get.semantics,CHECK_SEMANTICS);assert.deepEqual(get.request,BOX_EXAMPLE);
 const opt=await onRequestOptions();assert.equal(opt.status,204);assert.match(opt.headers.get('Access-Control-Allow-Headers'),/X-API-Key, Authorization/);assert.deepEqual(ENDPOINT_BASE_LIMITS['box-catalog'],{perMin:5,perDay:50});
 const counters=new Map(),env={LEADS:{get:async k=>counters.get(k)??null,put:async(k,v)=>{counters.set(k,v);}}};
 for(let i=0;i<5;i++)assert.equal((await onRequestPost({...ctx(body,{'CF-Connecting-IP':'192.0.2.5'}),env})).status,200);
 assert.equal((await onRequestPost({...ctx(body,{'CF-Connecting-IP':'192.0.2.5'}),env})).status,429);
 const daily={LEADS:{get:async k=>k.includes('|86400|')?'50':'0',put:async()=>{}}};assert.equal((await onRequestPost({...ctx(body,{'CF-Connecting-IP':'192.0.2.6'}),env:daily})).status,429);
});
console.log(`${count} box-catalog checks passed`);
