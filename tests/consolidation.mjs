import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { consolidate, parseConsolidationRequest, CONSOLIDATION_EXAMPLE } from '../src/lib/consolidation.ts';
import { CONTAINER_PRESETS, CHECK_SEMANTICS } from '../src/lib/packChecks.ts';
import InteractiveLoadPlanner from '../src/components/InteractiveLoadPlanner.tsx';
import { onRequestPost, onRequestGet, onRequestOptions } from '../functions/api/consolidate.ts';
import { ENDPOINT_BASE_LIMITS } from '../src/lib/apiTiers.ts';
let count = 0;
async function test(name, fn) { await fn(); count++; console.log(`PASS consolidation: ${name}`); }
const simple = () => ({ pos: [{ poId: 'P1', supplier: 'S1', items: [{ sku: 'A', l: 110, w: 110, h: 100, qty: 38, weight: 10 }] }], containers: [{ preset: '20gp', maxCount: 2, ratePerContainer: 1000 }, { preset: '40hq', maxCount: 1, ratePerContainer: 1500 }] });
const check = (p, code) => p.checks.find(c => c.code === code).status;
function verify(q, r) {
  assert.equal(q.semantics, CHECK_SEMANTICS); assert.match(q.inputHash, /^[a-f0-9]{64}$/);
  assert.ok(q.plans.length <= 3); assert.ok(q.searched.mixes <= 12); assert.ok(q.searched.packs <= q.searched.budget);
  const parsed = parseConsolidationRequest(r);
  for (const p of q.plans) {
    assert.match(p.candidateHash, /^[a-f0-9]{64}$/);
    assert.equal(p.containers.reduce((s,c) => s+c.cartons,0)+p.remainder.cartons,q.cargo.cartons);
    const ids = new Set();
    for (const po of parsed.pos.filter(po => q.eligible.poIds.includes(po.poId))) {
      for (const it of po.items) {
        const placed = p.containers.flatMap(c => c.boxes).filter(b => b.id.includes(`-${it.id}-`)).length;
        assert.equal(placed + (p.remainder.byPo.find(x => x.poId === po.poId)?.items.find(x => x.sku === it.sku)?.qty ?? 0), it.qty);
      }
    }
    for (const c of p.containers) {
      assert.equal(c.cartons, c.boxes.length);
      const env = CONTAINER_PRESETS[c.preset];
      assert.ok(c.weight.kg <= env.maxWeight + 1e-6);
      assert.equal(c.dimensions.l.cm, env.l); assert.equal(c.dimensions.l.in, env.l/2.54);
      assert.equal(c.zones.reduce((s,z)=>s+z.count,0),c.cartons);
      assert.equal(c.checks.find(c=>c.code==='DOOR_APERTURE').status,'pass');
      assert.equal(c.checks.find(c=>c.code==='VGM').status,'not_evaluated');
      assert.ok(c.checks.find(c=>c.code==='VGM').observed.includes(String(env.tare)));
      for (const [i,b] of c.boxes.entries()) {
        assert.ok(!ids.has(b.id)); ids.add(b.id);
        assert.ok(b.px >= 0 && b.py >= 0 && b.pz >= 0);
        assert.ok(b.px+b.l<=env.l+1e-6 && b.py+b.h<=env.h+1e-6 && b.pz+b.w<=env.w+1e-6);
        for (const a of c.boxes.slice(i+1)) assert.ok(!(b.px<a.px+a.l-1e-6 && a.px<b.px+b.l-1e-6 && b.py<a.py+a.h-1e-6 && a.py<b.py+b.h-1e-6 && b.pz<a.pz+a.w-1e-6 && a.pz<b.pz+b.w-1e-6));
      }
    }
  }
}
await test('happy path, conservation by SKU and PO, geometry and deterministic result', async()=> {
  const r = structuredClone(CONSOLIDATION_EXAMPLE), before = structuredClone(r), q=await consolidate(r);
  assert.equal(q.outcome,'found'); assert.ok(q.plans[0].containers.length); verify(q,r);
  assert.deepEqual(q, await consolidate(r)); assert.deepEqual(r,before);
  assert.notEqual(q.inputHash,(await consolidate({...r,searchBudget:1})).inputHash);
});
await test('cheaper 1×40HQ ranks over feasible 2×20GP',async()=> {
  const r=simple(),q=await consolidate(r);verify(q,r);
  assert.equal(q.plans[0].containers[0].preset,'40hq'); assert.equal(q.plans[0].cost.total,1500);
  assert.ok(q.plans.some(p=>p.containers.length===2 && p.remainder.cartons===0 && p.cost.total===2000));
  assert.equal(q.plans[0].cost.perUnit,1500/38);
});
await test('inclusive window, missing/before/after reasons, priority then date',async()=> {
  const r=simple();r.pos=['2026-09-10','2026-09-11','2026-09-12',undefined,'2026-09-09'].map((d,i)=>({poId:`P${i}`,readyDate:d,priority:i===1?1:2,items:[{sku:'A',l:10,w:10,h:10,qty:1,weight:1}]}));r.window={from:'2026-09-10',to:'2026-09-11'};
  const q=await consolidate(r);verify(q,r);assert.deepEqual(q.eligible.poIds,['P1','P0']);assert.equal(q.eligible.skipped.length,3);
  assert.ok(q.eligible.skipped.some(p=>p.reason.includes('missing')));assert.ok(q.eligible.skipped.some(p=>p.reason.includes('before')));assert.ok(q.eligible.skipped.some(p=>p.reason.includes('after')));
  assert.equal(check(q.plans[0],'WINDOW_RESPECTED'),'pass');
  r.window={to:'2020-01-01'};const empty=await consolidate(r);assert.equal(empty.cargo.cartons,0);verify(empty,r);
});
await test('whole PO when feasible; split warning when impossible',async()=> {
  const r=simple();r.rules={keepPoTogether:true};let q=await consolidate(r);verify(q,r);assert.equal(check(q.plans[0],'PO_TOGETHER'),'pass');
  r.containers=[{preset:'20gp',maxCount:2}];q=await consolidate(r);verify(q,r);assert.equal(check(q.plans[0],'PO_TOGETHER'),'warn');assert.equal(q.plans[0].remainder.cartons,0);
});
await test('supplier cap and unload zones preserve cargo',async()=> {
  const r=structuredClone(CONSOLIDATION_EXAMPLE);r.rules={maxSuppliersPerContainer:1,unloadOrderByPo:true,keepPoTogether:true};
  const q=await consolidate(r);verify(q,r);for(const p of q.plans)for(const c of p.containers)assert.ok(c.pos.length<=1);
  r.rules.maxSuppliersPerContainer=2;const q2=await consolidate(r);verify(q2,r);assert.ok(q2.plans.some(p=>p.containers.some(c=>c.zones.length>1)));
});
await test('remainder LCL minimum math, missing rates, all status values',async()=> {
  const r=simple();r.containers=[{preset:'20gp',maxCount:1,ratePerContainer:100}];r.lcl={ratePerCbm:20,minCbm:30};const q=await consolidate(r);verify(q,r);
  const p=q.plans[0];assert.ok(p.remainder.cartons>0);assert.equal(p.lcl.cbm,30);assert.equal(p.lcl.cost,600);assert.equal(p.cost.total,700);assert.equal(check(p,'ALL_CARGO_PLACED'),'fail');assert.equal(check(p,'RATES_PROVIDED'),'pass');
  delete r.lcl.ratePerCbm;const n=await consolidate(r);assert.equal(n.plans[0].cost,null);assert.equal(check(n.plans[0],'RATES_PROVIDED'),'not_evaluated');assert.equal(check(n.plans[0],'WINDOW_RESPECTED'),'not_evaluated');
  const statuses=new Set([...q.plans,...n.plans].flatMap(p=>[...p.checks,...p.containers.flatMap(c=>c.checks)]).map(c=>c.status));assert.deepEqual([...statuses].sort(),['fail','not_evaluated','pass','warn']);
});
await test('no fit, zero allowed count and budget exhaustion account for remainder',async()=> {
  const r=simple();r.pos[0].items[0].l=2000;const q=await consolidate(r);assert.equal(q.outcome,'none_fit_budget');verify(q,r);assert.ok(q.plans.length);
  r.containers.forEach(c=>c.maxCount=0);const n=await consolidate(r);assert.equal(n.plans[0].remainder.cartons,38);verify(n,r);
  const b={...CONSOLIDATION_EXAMPLE,searchBudget:1};const limited=await consolidate(b);assert.equal(limited.searched.packs,1);verify(limited,b);
});
await test('door, fragile, maxStack and upright constraints',async()=> {
  const r=simple();r.containers=[{preset:'20gp',maxCount:1}];r.pos[0].items=[{sku:'too-tall',l:50,w:50,h:230,qty:1,weight:1,keepUpright:true},{sku:'fragile',l:110,w:110,h:100,qty:20,weight:10,fragile:true}];
  const q=await consolidate(r);verify(q,r);assert.ok(q.plans[0].remainder.byPo[0].items.some(it=>it.sku==='too-tall'));for(const b of q.plans[0].containers.flatMap(c=>c.boxes))assert.equal(b.py,0);
});
await test('imperial normalization returns both units',async()=> {
  const r=simple(),metric=await consolidate(r);r.units='in-lb';r.pos.forEach(p=>p.items.forEach(it=>{for(const k of ['l','w','h'])it[k]/=2.54;it.weight/=.45359237;}));const q=await consolidate(r);verify(q,r);assert.ok(Math.abs(q.cargo.weight.kg-metric.cargo.weight.kg)<1e-8);assert.equal(q.cargo.cartons,metric.cargo.cartons);
});
await test('validation for every request field and structural limits',async()=> {
  const cases=[['units','bad'],['pos',[]],['pos',null],['window',[]],['window.from','2026-02-30'],['window.to','x'],['containers',[]],['containers.0.preset','truck'],['containers.0.maxCount',-1],['containers.0.maxCount',1.5],['containers.0.ratePerContainer',-1],['lcl',[]],['lcl.ratePerCbm',-1],['lcl.minCbm',-1],['rules',[]],['rules.keepPoTogether','yes'],['rules.unloadOrderByPo',1],['rules.maxSuppliersPerContainer',0],['searchBudget',0],['searchBudget',121],['searchBudget',1.5],['pos.0.poId',''],['pos.0.supplier',3],['pos.0.readyDate','2026-02-30'],['pos.0.priority',0],['pos.0.items',[]],['pos.0.items.0.sku',2],['pos.0.items.0.label',false],['pos.0.items.0.l',0],['pos.0.items.0.w',-1],['pos.0.items.0.h',Infinity],['pos.0.items.0.qty',1.5],['pos.0.items.0.weight',-1],['pos.0.items.0.maxStack',-1],['pos.0.items.0.keepUpright','false'],['pos.0.items.0.fragile',1]];
  for(const [path,v]of cases){const r=simple();let o=r;const keys=path.split('.');for(const k of keys.slice(0,-1))o=o[k]??=( {} );o[keys.at(-1)]=v;await assert.rejects(consolidate(r),e=>typeof e.field==='string',path);}
  for(const raw of [null,[],1])await assert.rejects(consolidate(raw));
  const r=simple();r.pos.push(structuredClone(r.pos[0]));await assert.rejects(consolidate(r),/duplicate/);
  const d=simple();d.pos[0].items.push(structuredClone(d.pos[0].items[0]));await assert.rejects(consolidate(d),/duplicate/);
  const c=simple();c.containers.push({...c.containers[0]});await assert.rejects(consolidate(c),/unique/);
  const w=simple();w.window={from:'2026-09-12',to:'2026-09-11'};await assert.rejects(consolidate(w));
  const many=simple();many.pos=Array.from({length:31},(_,i)=>({...many.pos[0],poId:`P${i}`}));await assert.rejects(consolidate(many));
  const types=simple();types.pos[0].items=Array.from({length:61},(_,i)=>({...types.pos[0].items[0],sku:`S${i}`,qty:1}));await assert.rejects(consolidate(types));
  const total=simple();total.pos[0].items[0].qty=3000;total.pos.push({poId:'P2',items:[{l:1,w:1,h:1,qty:1,weight:1}]});await assert.rejects(consolidate(total));
});
await test('maximum accepted PO/type/carton boundaries and anonymous quota', async()=> {
  const r={pos:Array.from({length:30},(_,i)=>({poId:`P${i}`,items:Array.from({length:2},(_,j)=>({sku:`S${j}`,l:1,w:1,h:1,qty:50,weight:0}))})),containers:[{preset:'20gp',maxCount:0}],searchBudget:120};
  const q=await consolidate(r);verify(q,r);assert.equal(q.cargo.cartons,3000);assert.equal(q.plans[0].remainder.cartons,3000);
  const data=new Map(),env={LEADS:{get:async k=>data.get(k)??null,put:async(k,v)=>{data.set(k,v);}}};
  const send=()=>onRequestPost({env,request:new Request('https://example.com/api/consolidate',{method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.44'},body:'{}'})});
  for(let i=0;i<5;i++)assert.equal((await send()).status,400);
  assert.equal((await send()).status,429);
});
await test('read-only viewer count equals boxes and edit controls absent',async()=> {
  const q=await consolidate(simple()),c=q.plans[0].containers[0];const html=renderToStaticMarkup(React.createElement(InteractiveLoadPlanner,{readOnly:true,placedCountTestId:'container-placed-count',container:CONTAINER_PRESETS[c.preset],boxes:c.boxes}));assert.ok(html.includes(`data-testid="container-placed-count">${c.cartons}</span>`));assert.ok(!html.includes('Reset to auto'));assert.ok(!html.includes('Rotate 90'));
});
const env=()=>({LEADS:{get:async()=>null,put:async()=>{}}});
const post=(body,headers={},e=env())=>onRequestPost({env:e,request:new Request('https://example.com/api/consolidate',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)})});
await test('endpoint 200/400/413/415, GET, CORS, invalid key and tier',async()=> {
  assert.deepEqual(ENDPOINT_BASE_LIMITS.consolidate,{perMin:5,perDay:50});
  const r=await post(simple());assert.equal(r.status,200);assert.equal((await r.json()).tier,'anonymous');
  const bad=await post({});assert.equal(bad.status,400);assert.equal((await bad.json()).field,'pos');assert.equal((await post('{')).status,400);
  assert.equal((await post('x'.repeat(65537))).status,413);assert.equal((await post('{}',{'Content-Type':'text/plain'})).status,415);
  const invalid=await post(simple(),{'X-API-Key':'dp_live_'+'a'.repeat(32)});assert.ok((await invalid.json()).warning);
  const docs=await (await onRequestGet({})).json();for(const k of ['endpoint','purpose','request','limits','response','semantics','docs'])assert.ok(docs[k]);
  assert.equal((await post(docs.request)).status,200);
  const options=await onRequestOptions({});assert.equal(options.status,204);assert.ok(options.headers.get('Access-Control-Allow-Headers').includes('Authorization'));
});
console.log(`${count} consolidation tests passed`);
