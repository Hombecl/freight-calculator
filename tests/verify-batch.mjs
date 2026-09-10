/** Adversarial public-output checks. Run: npx tsx tests/verify-batch.mjs.
 * No expected failures: every violated invariant makes the process fail.
 * VERIFY_RESULTS optionally writes all failures and exact seeded inputs to JSON.
 */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { estimatePallet, PalletInputError } from '../src/lib/palletEstimate.ts';
import { quoteOrder } from '../src/lib/orderQuote.ts';
import { findOrderOptions } from '../src/lib/orderOptions.ts';
import { designCases, casePalletView, parseCaseRequest } from '../src/lib/caseDesign.ts';
import { consolidate } from '../src/lib/consolidation.ts';
import { optimizeBoxCatalog, chooseBox } from '../src/lib/boxCatalog.ts';
import { perLayer } from '../src/lib/pallets.ts';
import { packContainer } from '../src/lib/binPacking.ts';
import { CONTAINER_PRESETS } from '../src/lib/packChecks.ts';

const SEED = 0x51a7b00c, N = 200, EPS = 1e-6;
let state = SEED;
const int = (a,b) => { state = (Math.imul(state,1664525)+1013904223)>>>0; return a+state%(b-a+1); };
const pick = a => a[int(0,a.length-1)];
const clone = structuredClone;
const failures = [], counts = {}, groups = {};
let checks = 0;
async function check(library, index, property, input, fn) {
  checks++;
  try { await fn(); } catch(e) {
    const key = `${library}: ${property}`;
    groups[key] = (groups[key]??0)+1;
    failures.push({library,index,property,input:clone(input),message:e.message});
    if(groups[key]===1) console.error(`FAIL ${key}: ${e.message.split('\n')[0]}`);
  }
}
const near = (a,b,msg) => assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=EPS, `${msg}: ${a} != ${b}`);
function approximate(a,b,path='result') {
  if(typeof a==='number' && typeof b==='number') return near(a,b,path);
  if(a && b && typeof a==='object' && typeof b==='object') {
    assert.deepEqual(Object.keys(a).sort(),Object.keys(b).sort(),path);
    for(const k of Object.keys(a)) approximate(a[k],b[k],`${path}.${k}`);
  } else assert.deepEqual(a,b,path);
}
// Convert physical request quantities only; billing stays in its declared units.
function imperial(r) {
  const out=clone(r); out.units='in-lb';
  const dims=new Set(['l','w','h','baseHeight','maxHeight','height','maxLoadedHeight','maxDim','boardThickness','headspace','overhang']);
  const weights=new Set(['weight','maxWeight','tareWeight','maxStack','maxGrossWeight','grossWeight']);
  function walk(o) { if(!o || typeof o!=='object') return; for(const k of Object.keys(o)) {
    if(k==='billing'||k==='costs'||k==='economics') continue;
    if(typeof o[k]==='number' && (dims.has(k)||weights.has(k))) o[k]/=dims.has(k)?2.54:.45359237; else walk(o[k]);
  }} walk(out); return out;
}
const overlap = (a,al,b,bl)=>Math.max(0,Math.min(a+al,b+bl)-Math.max(a,b));
function geometry(boxes,vessel,specFor) {
  const supports=boxes.map((b,i)=>boxes.flatMap((s,j)=>j!==i&&Math.abs(s.py+s.h-b.py)<=EPS&&overlap(b.px,b.l,s.px,s.l)*overlap(b.pz,b.w,s.pz,s.w)>EPS?[j]:[]));
  for(let i=0;i<boxes.length;i++) {
    const b=boxes[i], s=specFor(b); assert.ok(s,`unknown box ${b.id}`);
    assert.ok(b.px>=-EPS&&b.py>=-EPS&&b.pz>=-EPS&&b.px+b.l<=vessel.l+EPS&&b.pz+b.w<=vessel.w+EPS&&b.py+b.h<=vessel.h+EPS,`bounds ${b.id}`);
    approximate([b.l,b.w,b.h].sort((a,b)=>a-b),[s.l,s.w,s.h].sort((a,b)=>a-b),'rotation dimensions');
    if(s.keepUpright) near(b.h,s.h,`upright ${b.id}`);
    for(let j=0;j<i;j++) { const c=boxes[j]; assert.ok(!(overlap(b.px,b.l,c.px,c.l)>EPS&&overlap(b.py,b.h,c.py,c.h)>EPS&&overlap(b.pz,b.w,c.pz,c.w)>EPS),`overlap ${b.id}/${c.id}`); }
    if(b.py>EPS) { const area=supports[i].reduce((n,j)=>n+overlap(b.px,b.l,boxes[j].px,boxes[j].l)*overlap(b.pz,b.w,boxes[j].pz,boxes[j].w),0); assert.ok(area/(b.l*b.w)>=.6-EPS,`support ${b.id}: ${area/(b.l*b.w)}`); }
  }
  // Independently propagate each carton's weight recursively through all paths;
  // a shared ancestor must receive contributions from BOTH branches.
  const above=boxes.map(()=>0);
  function add(i,load) { const parents=supports[i]; for(const j of parents) { above[j]+=load/parents.length; add(j,load/parents.length); } }
  boxes.forEach((b,i)=>add(i,specFor(b).weight));
  boxes.forEach((b,i)=>assert.ok(above[i]<=(specFor(b).fragile?0:specFor(b).maxStack??Infinity)+EPS,`maxStack ${b.id}: ${above[i]} > ${specFor(b).maxStack}`));
  if(vessel.maxWeight!==undefined) assert.ok(boxes.reduce((n,b)=>n+specFor(b).weight,0)<=vessel.maxWeight+EPS,'payload');
}
const specForItems = items => b => items[Number(/sku(\d+)-/.exec(b.id)?.[1])];
function missing(cs,code,isMissing) { const c=cs.find(c=>c.code===code); assert.ok(c,`missing check ${code}`); assert.equal(c.status==='not_evaluated',isMissing,`${code} not_evaluated`); }
function palletAudit(r,q) {
  const p=r.pallet;
  geometry(q.boxes,{l:p.l,w:p.w,h:p.maxHeight-p.baseHeight,maxWeight:p.maxWeight},specForItems(r.items));
  r.items.forEach((it,i)=>{const row=q.byItem[i],placed=q.boxes.filter(b=>b.id.startsWith(`sku${i}-`)).length;assert.equal(row.placed,placed);assert.equal(it.qty,placed+row.remaining);});
  assert.equal(q.requestedCount,q.placedCount+q.unplacedCount);assert.equal(q.placedCount,q.boxes.length);
  assert.equal(q.status,q.unplacedCount?'partial':'complete');
  missing(q.checks,'SUPPORT_AREA',!q.boxes.length);missing(q.checks,'COG_HEIGHT',!q.boxes.length);
}
function quoteAudit(r,q) {
  q.pallets.forEach(p=>{
    geometry(p.boxes,{l:r.pallet.l,w:r.pallet.w,h:r.pallet.maxHeight-r.pallet.baseHeight,maxWeight:r.pallet.maxWeight},specForItems(r.items));
    assert.equal(p.cartonCount,p.boxes.length);
    missing(p.checks,'LOADED_HEIGHT',r.limits?.maxLoadedHeight===undefined);
    missing(p.checks,'GROSS_WEIGHT',r.limits?.maxGrossWeight===undefined);
    const height=Math.max(0,...p.boxes.map(b=>b.py+b.h))+r.pallet.baseHeight+(r.packagingAllowance?.height??0);
    const gross=p.boxes.reduce((n,b)=>n+specForItems(r.items)(b).weight,0)+(r.pallet.tareWeight??0)+(r.packagingAllowance?.weight??0);
    if(height>(r.limits?.maxLoadedHeight??Infinity)+EPS || gross>(r.limits?.maxGrossWeight??Infinity)+EPS) assert.ok(['needs_review','partial'].includes(q.status),'receiver violation labelled complete');
  });
  r.items.forEach((it,i)=>{const row=q.byItem[i],placed=q.pallets.reduce((n,p)=>n+p.boxes.filter(b=>b.id.startsWith(`sku${i}-`)).length,0);assert.equal(row.placed,placed);assert.equal(it.qty,placed+row.remaining);});
  assert.equal(q.summary.cartonsRequested,q.summary.cartonsPlaced+q.summary.cartonsUnplaced);
  if([...q.checks,...q.pallets.flatMap(p=>p.checks)].some(c=>c.status==='fail')) assert.notEqual(q.status,'complete');
}
function request() {
  return {pallet:{l:pick([60,80,100,120]),w:pick([60,80,100]),baseHeight:10,maxHeight:int(5,14)*10,maxWeight:int(2,20)*10,tareWeight:10},items:Array.from({length:int(1,3)},(_,i)=>({sku:`S${i}`,label:`S${i}`,l:int(1,7)*10,w:int(1,6)*10,h:int(1,5)*10,weight:int(1,15),qty:int(1,12),keepUpright:!!int(0,1),...(int(0,2)?{maxStack:pick([0,10,30,100])}:{})})),maxPallets:int(1,3),...(int(0,1)?{limits:{maxLoadedHeight:int(4,18)*10,maxGrossWeight:int(2,20)*10}}:{}),packagingAllowance:{height:2,weight:1}};
}
async function units(l,i,r,run,base,strip=x=>x) {
  const converted=await run(imperial(r));
  await check(l,i,'unit hash',r,()=>assert.equal(base.inputHash,converted.inputHash));
  await check(l,i,'unit cm results',r,()=>approximate(strip(base),strip(converted)));
}
const withoutHashes = x => {
  if(Array.isArray(x))return x.map(withoutHashes);
  if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).filter(([k])=>!['inputHash','candidateHash','id','meter','units','checks','reviewReasons'].includes(k)).map(([k,v])=>[k,withoutHashes(v)]));
  return x;
};
for(let i=0;i<N;i++) {
  const r=request();
  for(const [l,run,audit] of [['palletEstimate',x=>estimatePallet(x,{strategy:'layered'}),palletAudit],['orderQuote',quoteOrder,quoteAudit]]) {
    counts[l]=(counts[l]??0)+1;const q=await run(r);
    await check(l,i,'conservation geometry support stack limits',r,()=>audit(r,q));
    await check(l,i,'determinism',r,async()=>assert.deepEqual(q,await run(r)));
    if(l==='orderQuote') {
      await units(l,i,r,run,q,withoutHashes);
      await check(l,i,'maxPallets monotonicity',r,async()=>assert.ok((await run({...r,maxPallets:r.maxPallets+1})).summary.cartonsUnplaced<=q.summary.cartonsUnplaced));
    }
  }
  const o={...r,searchBudget:20,targetPalletCount:1,adjustments:[{sku:'S0',minQty:Math.max(0,r.items[0].qty-4),maxQty:r.items[0].qty+4,qtyStep:2}],economics:{palletFreight:80,handlingPerPallet:10,contributionPerUnit:Object.fromEntries(r.items.map(it=>[it.sku,3])),deferralCostPerUnit:Object.fromEntries(r.items.map(it=>[it.sku,2]))}};
  counts.orderOptions=(counts.orderOptions??0)+1;
  const options=await findOrderOptions(o);
  await check('orderOptions',i,'baseline and alternatives',o,()=>{
    quoteAudit(o,options.baseline.quote);
    if(options.outcome==='found')assert.ok(options.alternatives.length);
    for(const a of options.alternatives) {
      const items=o.items.map(it=>({...it,qty:a.quantityChanges.find(c=>c.sku===it.sku)?.to??it.qty}));
      for(const it of items) { const orig=o.items.find(s=>s.sku===it.sku),permission=o.adjustments.find(s=>s.sku===it.sku); if(permission){assert.ok(it.qty>=permission.minQty&&it.qty<=permission.maxQty);assert.ok((it.qty-orig.qty)%permission.qtyStep===0);}else assert.equal(it.qty,orig.qty); }
      quoteAudit({...o,items:items.filter(it=>it.qty)},a.quote);
      assert.ok(a.palletCount<=options.baseline.palletCount||a.quantityChanges.some(c=>c.delta>0));
      const saved=options.baseline.palletCount-a.palletCount;
      near(a.economics.netSavings,saved*90+a.quantityChanges.reduce((n,c)=>n+c.delta*3-Math.max(0,-c.delta)*2,0),'netSavings');
    }
  });
  await check('orderOptions',i,'determinism',o,async()=>assert.deepEqual(options,await findOrderOptions(o)));
  await units('orderOptions',i,o,findOrderOptions,options,x=>withoutHashes({...x,alternatives:x.alternatives.map(a=>({...a,id:undefined}))}));
  // TI×HI guarantee: all 200 fixtures are within the 200-carton public cap.
  const s={label:'grid',l:int(2,6)*10,w:int(2,5)*10,h:int(2,5)*10,weight:int(1,10),keepUpright:true};
  const p={l:120,w:100,baseHeight:10,maxHeight:int(6,12)*10,maxWeight:int(5,20)*10};
  const ti=perLayer(s.l,s.w,p.l,p.w),hi=Math.min(Math.floor((p.maxHeight-p.baseHeight)/s.h+EPS),Math.floor(p.maxWeight/(ti*s.weight)+EPS)),n=ti*hi;
  if(n) {const grid={pallet:p,items:[{...s,qty:n}]};counts.uniformGrid=(counts.uniformGrid??0)+1;await check('palletEstimate',i,'TI x HI lower bound',grid,()=>{const q=estimatePallet(grid,{strategy:'layered'});assert.ok(q.placedCount>=n,`${q.placedCount} < ${n}`);palletAudit(grid,q);});}
  if(i%25===24)console.log(`pallet/quote/options: ${i+1}/${N}`);
}

for(let i=0;i<N;i++) {
  const r={product:{l:int(5,15),w:int(5,15),h:int(5,20),weight:int(1,10)/10,keepUpright:!!int(0,1)},unitsPerCase:int(1,8),caseConstraints:{boardThickness:.4,headspace:.5,...(int(0,1)?{maxWeight:int(2,12),maxDim:int(20,100)}:{})},...(i%3?{pallet:{l:80,w:60,baseHeight:10,maxHeight:int(6,12)*10,maxWeight:int(2,10)*20}}:{}),container:i%3?{preset:pick(['20gp','40hq'])}:{l:60,w:50,h:50,maxWeight:int(2,10)*10},costs:{boardCostPerM2:2,handlingPerCase:1,freightPerContainer:400,...(i%3?{freightPerPallet:15}:{})},candidates:3};
  counts.caseDesign=(counts.caseDesign??0)+1;const q=await designCases(r);
  await check('caseDesign',i,'geometry capacity limits economics',r,()=>{
    for(const c of q.candidates) {
      assert.equal(c.arrangement.a*c.arrangement.b*c.arrangement.c,c.unitsPerCase);
      const d=Object.fromEntries(Object.entries(c.caseOuter).map(([k,v])=>[k,v.cm]));
      if(r.product.keepUpright) assert.ok(['lwh','wlh'].includes(c.arrangement.orientation));
      const orient=c.arrangement.orientation.split('').map(k=>r.product[k]);
      near(d.l,c.arrangement.a*orient[0]+.8,'case L');near(d.w,c.arrangement.b*orient[1]+.8,'case W');near(d.h,c.arrangement.c*orient[2]+1.3,'case H');
      const area=2*(d.l*d.w+d.l*d.h+d.w*d.h)/10000;
      near(c.caseWeight.kg,c.unitsPerCase*r.product.weight+area*.6,'board mass');
      missing(c.checks,'CASE_WEIGHT',r.caseConstraints.maxWeight===undefined);missing(c.checks,'CASE_DIM',r.caseConstraints.maxDim===undefined);missing(c.checks,'PALLET_HEIGHT',!r.pallet);missing(c.checks,'PALLET_PAYLOAD',!r.pallet);
      assert.ok(!c.checks.some(c=>c.status==='fail'));
      if(c.pallet) { const view=casePalletView(c,parseCaseRequest(r));assert.equal(view.boxes.length,c.pallet.casesPerPallet);geometry(view.boxes,{l:r.pallet.l,w:r.pallet.w,h:r.pallet.maxHeight-r.pallet.baseHeight,maxWeight:r.pallet.maxWeight},()=>({...d,weight:c.caseWeight.kg,keepUpright:true}));assert.equal(c.pallet.unitsPerPallet,c.pallet.casesPerPallet*c.unitsPerCase); }
      const env=r.container.preset?CONTAINER_PRESETS[r.container.preset]:r.container;
      if(c.container) {
        assert.equal(c.container.unitsPerContainer,c.container.casesPerContainer*c.unitsPerCase);
        if(c.container.requestedCases!==undefined) {
          assert.equal(c.container.requestedCases,c.container.casesPerContainer+c.container.unplacedCases);
          const spec={...d,id:'case',label:'Case',qty:c.container.requestedCases,weight:c.caseWeight.kg,keepUpright:true,color:0x2563eb};
          const placed=packContainer(env,[spec]);
          assert.equal(placed.boxes.length,c.container.casesPerContainer);
          geometry(placed.boxes,env,()=>spec);
        }
        assert.ok(c.container.casesPerContainer*c.caseWeight.kg+(c.container.palletsPerContainer??0)*25<=env.maxWeight+EPS);
        if(env.door&&c.container.casesPerContainer)assert.ok(c.pallet?c.pallet.loadedHeight.cm<=env.door.h&&Math.min(r.pallet.l,r.pallet.w)<=env.door.w:d.h<=env.door.h&&Math.min(d.l,d.w)<=env.door.w);
      }
      if(c.costPerUnit) near(c.costPerUnit.value,area*2/c.unitsPerCase+1/c.unitsPerCase+400/c.container.unitsPerContainer+(r.pallet?15/c.pallet.unitsPerPallet:0),'cost/unit');
    }
  });
  await check('caseDesign',i,'determinism',r,async()=>assert.deepEqual(q,await designCases(r)));
  await units('caseDesign',i,r,designCases,q,withoutHashes);
  const con={pos:Array.from({length:int(1,3)},(_,pi)=>({poId:`PO${pi}`,supplier:`F${pi}`,readyDate:i%4===0?'2026-09-01':'2026-09-15',items:Array.from({length:int(1,2)},(_,si)=>({sku:`S${si}`,l:pick([50,100,200,240]),w:pick([50,100,240]),h:pick([50,100,230]),weight:int(1,1000),qty:int(1,6),keepUpright:!!int(0,1),maxStack:pick([0,100,10000])}))})),containers:[{preset:'20gp',maxCount:2,ratePerContainer:1000}],lcl:{ratePerCbm:50,minCbm:2},...(i%4===0?{window:{from:'2026-09-10'}}:{}),rules:{keepPoTogether:!!int(0,1)},searchBudget:8};
  counts.consolidation=(counts.consolidation??0)+1;const cq=await consolidate(con);
  await check('consolidation',i,'conservation geometry limits cost checks',con,()=>{
    for(const plan of cq.plans) {
      for(const c of plan.containers) {
        const env=CONTAINER_PRESETS[c.preset], lookup=b=>{const m=/po(\d+)-sku(\d+)-/.exec(b.id);return con.pos[+m[1]].items[+m[2]];};
        geometry(c.boxes,env,lookup);assert.equal(c.cartons,c.boxes.length);
        for(const b of c.boxes) {const s=lookup(b),d=[s.l,s.w,s.h];assert.ok(s.keepUpright?s.h<=env.door.h&&Math.min(s.l,s.w)<=env.door.w:d.some((v,j)=>v<=env.door.h&&d.some((w,k)=>j!==k&&w<=env.door.w)),'door');}
        missing(c.checks,'DOOR_APERTURE',false);missing(c.checks,'AXLE_LOADS',true);missing(c.checks,'ZONE_SEGREGATION',true);
      }
      con.pos.forEach((po,pi)=>po.items.forEach((s,si)=>{const placed=plan.containers.reduce((n,c)=>n+c.boxes.filter(b=>b.id.includes(`-po${pi}-sku${si}-`)).length,0),remaining=plan.remainder.byPo.find(p=>p.poId===po.poId)?.items.find(it=>it.sku===s.sku)?.qty??0,skipped=cq.eligible.skipped.some(p=>p.poId===po.poId)?s.qty:0;assert.equal(s.qty,placed+remaining+skipped);}));
      assert.equal(plan.remainder.cartons,plan.remainder.byPo.reduce((n,p)=>n+p.cartons,0));
      const cbm=plan.remainder.byPo.reduce((n,p)=>n+p.items.reduce((m,it)=>{const s=con.pos.find(po=>po.poId===p.poId).items.find(s=>s.sku===it.sku);return m+it.qty*s.l*s.w*s.h/1e6;},0),0);
      near(plan.remainder.cbm,cbm,'remainder cbm');
      const lc=plan.remainder.cartons?Math.max(cbm,2)*50:0;
      near(plan.cost.total,plan.containers.length*1000+lc,'consolidation total');near(plan.cost.perUnit,cq.cargo.cartons?plan.cost.total/cq.cargo.cartons:0,'perUnit');
      missing(plan.checks,'WINDOW_RESPECTED',!con.window);missing(plan.checks,'RATES_PROVIDED',false);
      assert.equal(plan.checks.find(c=>c.code==='ALL_CARGO_PLACED').status,plan.remainder.cartons?'fail':'pass');
    }
  });
  await check('consolidation',i,'failure status contract',con,()=>{
    assert.equal(cq.status, !cq.cargo.cartons || cq.plans.some(p=>p.remainder.cartons===0) ? 'complete' : 'partial');
    for(const plan of cq.plans)assert.equal(plan.status,plan.remainder.cartons?'partial':'complete');
    for(const plan of cq.plans)if([...plan.checks,...plan.containers.flatMap(c=>c.checks)].some(c=>c.status==='fail'))assert.ok(['partial','needs_review'].includes(plan.status??cq.status),'failed checks require partial/needs_review');
  });
  await check('consolidation',i,'determinism',con,async()=>assert.deepEqual(cq,await consolidate(con)));
  await units('consolidation',i,con,consolidate,cq,withoutHashes);
  if(i%25===24)console.log(`case/consolidation: ${i+1}/${N}`);
}
for(let i=0;i<N;i++) {
  const r={skus:Array.from({length:int(1,3)},(_,si)=>({sku:`S${si}`,l:int(1,4)*5,w:int(1,4)*5,h:int(1,4)*5,weight:int(1,20)/10,keepUpright:!!int(0,1),fragile:!int(0,3)})),orders:[],candidateBoxes:Array.from({length:4},(_,j)=>({id:`B${j}`,l:int(2,8)*10,w:int(2,6)*10,h:int(2,6)*10,maxWeight:pick([0,5,20,100]),cost:j})),catalogSize:int(1,3),billing:{unit:pick(['cm-kg','in-lb']),dimDivisor:5000,minBillableWeight:2,...(i%3?{ratePerKgOrLb:2}:{})},coverageFirst:true,voidFillCostPerLitre:.1,searchBudget:40};
  r.orders=Array.from({length:int(1,4)},(_,j)=>({orderId:`O${j}`,lines:r.skus.map(s=>({sku:s.sku,qty:int(1,4)})),count:int(1,20)}));
  counts.boxCatalog=(counts.boxCatalog??0)+1; const q=await optimizeBoxCatalog(r);
  await check('boxCatalog',i,'billing coverage checks',r,()=>{
    let billed=0,cost=0;
    for(const o of q.perOrder) {
      const b=q.catalog.find(b=>b.id===o.boxId)??[...r.candidateBoxes].sort((a,b)=>b.l*b.w*b.h-a.l*a.w*a.h)[0];
      const actual=o.lines.reduce((n,line)=>n+r.skus.find(s=>s.sku===line.sku).weight*line.qty,0),dim=b.l*b.w*b.h/(r.billing.unit==='in-lb'?2.54**3:1)/r.billing.dimDivisor*(r.billing.unit==='in-lb'?.45359237:1),w=Math.max(actual,dim,2*(r.billing.unit==='in-lb'?.45359237:1));
      near(o.billedWeight.kg,w,'billed kg');near(o.actualWeight.kg,actual,'actual kg');near(o.dimWeight.kg,dim,'dim kg');billed+=w*o.count;
      const itemVolume=o.lines.reduce((n,l)=>{const s=r.skus.find(s=>s.sku===l.sku);return n+s.l*s.w*s.h*l.qty;},0),voidLitres=Math.max(0,b.l*b.w*b.h-itemVolume)/1000;
      near(o.voidLitres,voidLitres,'void');if(r.billing.ratePerKgOrLb!==undefined) {const c=w/(r.billing.unit==='in-lb'?.45359237:1)*2+voidLitres*.1+b.cost;near(o.cost,c,'cost');cost+=c*o.count;}
    }
    near(q.totals.billedWeight.kg,billed,'weighted billing');if(r.billing.ratePerKgOrLb!==undefined)near(q.totals.cost,cost,'weighted cost');
    missing(q.checks,'RATE_PROVIDED',r.billing.ratePerKgOrLb===undefined);
    assert.equal(q.checks.find(c=>c.code==='ALL_ORDERS_FIT').status,q.totals.unfitOrders?'fail':'pass');
  });
  for(const order of r.orders) await check('boxCatalog',i,'single-order geometry conservation payload',r,async()=>{
    const single=await chooseBox({...r,lines:order.lines},q.catalog);
    for(const line of order.lines) {const placed=single.plan.boxes.filter(b=>b.id.startsWith(`${line.sku}-`)).length;assert.equal(placed+(single.box?0:line.qty),line.qty);}
    assert.equal(single.plan.boxes.length+single.plan.unplaced,order.lines.reduce((n,l)=>n+l.qty,0));
    if(single.box)geometry(single.plan.boxes,single.box,b=>r.skus.find(s=>b.id.startsWith(`${s.sku}-`)));
    const larger=q.catalog.map(b=>({...b,l:b.l+10,w:b.w+10,h:b.h+10}));
    if(single.box)assert.ok((await chooseBox({...r,lines:order.lines},larger)).box,'enlarged box loses fit');
  });
  await check('boxCatalog',i,'failure status contract',r,()=>{
    assert.equal(q.status,q.totals.unfitOrders?'partial':'complete');
    if(q.checks.some(c=>c.status==='fail'))assert.ok(['partial','needs_review'].includes(q.status),'failed checks require partial/needs_review');
  });
  await check('boxCatalog',i,'catalogSize monotonicity',r,async()=>assert.ok((await optimizeBoxCatalog({...r,catalogSize:r.catalogSize+1})).totals.unfitOrders<=q.totals.unfitOrders));
  await check('boxCatalog',i,'determinism',r,async()=>assert.deepEqual(q,await optimizeBoxCatalog(r)));
  await units('boxCatalog',i,r,optimizeBoxCatalog,q,withoutHashes);
  if(i%25===24)console.log(`boxCatalog: ${i+1}/${N}`);
}

// Explicit adversarial fixtures complement the seeded distribution.
const tiny={pallet:{l:60,w:60,baseHeight:10,maxHeight:50,maxWeight:150},items:[{sku:'A',label:'A',l:10,w:10,h:10,qty:1,weight:1,keepUpright:true}],maxPallets:1};
await check('oracle',0,'reject overlap floating upright and recursive overload',{},()=>{
  const base={id:'a',px:0,py:0,pz:0,l:10,w:10,h:10,weight:1};
  const spec={l:10,w:10,h:10,weight:1,keepUpright:true,maxStack:1};
  const env={l:30,w:30,h:50,maxWeight:100};
  assert.throws(()=>geometry([base,{...base,id:'b',px:5}],env,()=>spec),/overlap/);
  assert.throws(()=>geometry([{...base,py:10}],env,()=>spec),/support/);
  assert.throws(()=>geometry([{...base,px:25}],env,()=>spec),/bounds/);
  assert.throws(()=>geometry([{...base,l:20,h:10}],env,()=>({...spec,l:10,h:20})),/upright/);
  assert.throws(()=>geometry([base,{...base,id:'b',py:10},{...base,id:'c',py:20}],env,()=>spec),/maxStack/);
  geometry([base,{...base,id:'b',py:10},{...base,id:'c',py:20}],env,()=>({...spec,maxStack:2}));
});
const stack={pallet:{l:60,w:60,baseHeight:10,maxHeight:50,maxWeight:150},items:[
  {sku:'A',label:'A',l:10,w:30,h:50,weight:14,qty:1,keepUpright:false,maxStack:0},
  {sku:'B',label:'B',l:50,w:10,h:50,weight:8,qty:1,keepUpright:false,maxStack:0},
  {sku:'C',label:'C',l:30,w:30,h:20,weight:4,qty:3,keepUpright:false}],maxPallets:1};
await check('orderQuote','minimal','late support maxStack',stack,async()=>quoteAudit(stack,await quoteOrder(stack)));
await check('palletEstimate','minimal','late support maxStack default',stack,()=>palletAudit(stack,estimatePallet(stack)));
await check('palletEstimate','contract','legacy version identity exception',tiny,()=>{const q=estimatePallet(tiny);assert.equal(typeof q.version,'string');});
await check('palletEstimate','contract','legacy in-lb rejected',tiny,()=>assert.throws(()=>estimatePallet(imperial(tiny)),e=>e instanceof PalletInputError && e.field==='units' && e.message==='units: this endpoint is cm/kg only; use /api/order-quote for units'));
const noTare={...tiny,limits:{maxGrossWeight:1},packagingAllowance:{weight:2}};
await check('orderQuote','minimal','known gross excess without tare',noTare,async()=>quoteAudit(noTare,await quoteOrder(noTare)));
const generated={skus:[{sku:'A',l:10,w:10,h:10,weight:1}],orders:[{lines:[{sku:'A',qty:1}]}],catalogSize:1,billing:{unit:'cm-kg',dimDivisor:5000}};
await units('boxCatalog','generated',generated,optimizeBoxCatalog,await optimizeBoxCatalog(generated),withoutHashes);
const missingCosts={product:{l:10,w:10,h:10,weight:1},unitsPerCase:1};
await check('caseDesign','missing','optional checks',missingCosts,async()=>{const q=await designCases(missingCosts);assert.ok(q.candidates.length);for(const c of q.candidates)for(const code of ['CASE_WEIGHT','CASE_DIM','PALLET_HEIGHT','PALLET_PAYLOAD','COST_INPUTS_PROVIDED'])missing(c.checks,code,true);});
const unrated={pos:[{poId:'A',items:[{sku:'A',l:100,w:100,h:100,weight:1,qty:1}]}],containers:[{preset:'20gp',maxCount:1}]};
await check('consolidation','missing','rate check',unrated,async()=>{const q=await consolidate(unrated);for(const p of q.plans){missing(p.checks,'RATES_PROVIDED',true);assert.equal(p.cost,null);}});
// Exercise actual handlers in-process; no deployment or live API requests.
const endpointCases=[
  ['pallet-estimate',tiny,32768],['order-quote',tiny,32768],['order-options',{...tiny,searchBudget:1},49152],
  ['case-design',missingCosts,32768],['consolidate',unrated,65536],['box-catalog',generated,98304],
];
for(const [name,r,limit] of endpointCases) {
  const endpoint=await import(`../functions/api/${name}.ts`);
  for(const [status,body,type] of [[200,JSON.stringify(r),'application/json'],[400,'{}','application/json'],[413,'x'.repeat(limit+1),'application/json'],[415,'{}','text/plain']]) {
    await check('endpoint',name,`HTTP ${status}`,r,async()=>{const response=await endpoint.onRequestPost({env:{},request:new Request(`https://local.test/api/${name}`,{method:'POST',headers:{'Content-Type':type},body})});assert.equal(response.status,status);if(status===400)assert.equal(typeof(await response.json()).field,'string');});
  }
}
const report={seed:SEED,cases:counts,checks,failed:failures.length,groups,failures};
if(process.env.VERIFY_RESULTS)writeFileSync(process.env.VERIFY_RESULTS,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({seed:SEED,cases:counts,checks,failed:failures.length,groups},null,2));
if(failures.length)process.exitCode=1;
