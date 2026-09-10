import assert from 'node:assert/strict';
import { loadProfiles, parseProfile, evaluateProfile, profileToQuoteLimits, applyProfile, checkReceiver, attachProfile } from '../src/lib/receiverProfiles.ts';
import { quoteOrder, QUOTE_EXAMPLE } from '../src/lib/orderQuote.ts';
import { buildSteps } from '../src/lib/orderPlanning.ts';
import { parseSheetQuote } from '../src/lib/receiverStorage.ts';
import { onRequestPost, onRequestGet, onRequestOptions } from '../functions/api/receiver-check.ts';
let count=0;
async function test(name,fn){await fn();count++;console.log(`PASS receiver: ${name}`);}
const templates=loadProfiles();
const request={...structuredClone(QUOTE_EXAMPLE),items:[{sku:'A',l:40,w:30,h:25,weight:5,qty:4,keepUpright:true,maxStack:100}]};
const profile={id:'test',name:'Test profile',template:false,source:'customer supplied',verifiedAt:'2026-09-11',approvedBy:'Buyer',approvedAt:'2026-09-11',pallet:{l:121.92,w:101.6},limits:{maxLoadedHeight:100,maxGrossWeight:100,overhangCm:0},rules:['height','gross','footprint','overhang','stack','upright','manual'].map(check=>({code:check.toUpperCase(),text:check,check}))};
const quote=await quoteOrder(request);
await test('exact shipped templates, sources and unverified Amazon',()=>{
 assert.deepEqual(templates.map(p=>p.id),['amazon-fba-us','ltl-standard-us','eur-retail-dc','custom']);
 for(const p of templates){assert.ok(p.source);assert.ok(p.verifiedAt);assert.deepEqual(parseProfile(p),p);}
 assert.deepEqual(templates[0].limits,{});assert.deepEqual(templates[0].pallet,{});assert.ok(templates[0].unverified.includes('limits.maxLoadedHeight'));
});
await test('rule mapping and explicit manual semantics',async()=>{
 const e=await evaluateProfile(quote,profile);
 assert.equal(e.checks.length,7);assert.equal(e.approvedBy,'Buyer');assert.equal(e.approvedAt,'2026-09-11');
 assert.deepEqual(e.checks.slice(0,6).map(c=>[c.code,c.status]),profile.rules.slice(0,6).map(r=>[r.code,'pass']));
 assert.equal(e.checks[6].status,'not_evaluated');assert.equal(e.checks[6].assumption,'crew confirms on the build sheet');
});
await test('failed height uses caller rule code, including customer-confirmed FBA fixture',async()=>{
 // This is test-only customer input, never a shipped/verified Amazon rule.
 const p={...profile,id:'amazon-fba-us',limits:{...profile.limits,maxLoadedHeight:20},rules:[{code:'MAX_HEIGHT_72IN',text:'Customer test height',check:'height'}]};
 const result=await attachProfile(quote,p);assert.equal(result.status,'needs_review');assert.equal(result.profileChecks[0].code,'MAX_HEIGHT_72IN');assert.equal(result.profileChecks[0].status,'fail');
});
await test('gross warn without tare; missing values stay not_evaluated',async()=>{
 const r=structuredClone(request);delete r.pallet.tareWeight;
 assert.equal((await evaluateProfile(await quoteOrder(r),profile)).checks.find(c=>c.code==='GROSS').status,'warn');
 const e=await evaluateProfile(quote,{...profile,pallet:{},limits:{}});
 for(const code of ['HEIGHT','GROSS','FOOTPRINT','OVERHANG'])assert.equal(e.checks.find(c=>c.code===code).status,'not_evaluated');
 const missing=structuredClone(quote);delete missing.buildInput;missing.checks.find(c=>c.code==='STACK_LIMITS_PROVIDED').status='warn';
 const m=await evaluateProfile(missing,profile);assert.equal(m.checks.find(c=>c.code==='STACK').status,'not_evaluated');assert.equal(m.checks.find(c=>c.code==='UPRIGHT').status,'not_evaluated');
});
await test('gross footprint overhang upright fail branches',async()=>{
 const bad=structuredClone(quote);bad.buildInput.pallet.tareWeight=1000;bad.buildInput.pallet.l=50;bad.pallets[0].grossWeight.kg=1000;bad.pallets[0].outerDims.l.cm=50;bad.pallets[0].boxes[0].px=-1;bad.pallets[0].boxes[0].h=20;
 const checks=(await evaluateProfile(bad,profile)).checks;
 for(const code of ['GROSS','FOOTPRINT','OVERHANG','UPRIGHT'])assert.equal(checks.find(c=>c.code===code).status,'fail');
 const empty=structuredClone(quote);empty.pallets=[];assert.ok((await evaluateProfile(empty,profile)).checks.every(c=>c.status==='not_evaluated'));
});
await test('profile hash changes for every top-level field and is deterministic',async()=>{
 const original=await evaluateProfile(quote,profile);assert.deepEqual(await evaluateProfile(quote,profile),original);
 for(const [k,v] of Object.entries({id:'other',name:'Other',template:true,source:'other',verifiedAt:'2026-09-10',approvedBy:'Other',approvedAt:'2026-09-10',pallet:{l:120,w:80},limits:{maxLoadedHeight:40},rules:[],unverified:['a'],verificationNote:'note'}))assert.notEqual((await evaluateProfile(quote,{...profile,[k]:v})).profileVersion,original.profileVersion,k);
});
await test('profile validation each field',()=>{
 for(const [key,value] of Object.entries({id:'',name:null,source:4,verifiedAt:'invalid',template:'yes',approvedBy:3,approvedAt:'2026-02-30',pallet:null,limits:[],rules:[{code:'X',text:'x',check:'unknown'}],unverified:[3],verificationNote:3}))assert.throws(()=>parseProfile({...profile,[key]:value}),undefined,key);
 for(const group of ['pallet','limits'])for(const key of group==='pallet'?['l','w','baseHeight','maxHeight','maxWeight','tareWeight']:['maxLoadedHeight','maxGrossWeight','overhangCm','clampable'])assert.throws(()=>parseProfile({...profile,[group]:{[key]:'invalid'}}));
 assert.throws(()=>parseProfile(null));assert.throws(()=>parseProfile({...profile,rules:[profile.rules[0],profile.rules[0]]}));
});
await test('profile mapping preserves packing envelope and converts imperial',async()=>{
 assert.equal(profileToQuoteLimits(profile).limits.maxLoadedHeight,100);
 const r=applyProfile({...request,units:'in-lb'},profile);assert.equal(r.pallet.l,48);assert.equal(r.pallet.maxHeight,request.pallet.maxHeight);assert.equal(r.limits.maxGrossWeight,100/.45359237);
 const a=await checkReceiver({...request,profile});assert.deepEqual(await checkReceiver({...request,profile}),a);
 assert.equal(a.summary.cartonsPlaced+a.summary.cartonsUnplaced,a.summary.cartonsRequested);
});
await test('geometry conservation and build step/render input count',()=>{
 assert.deepEqual(parseSheetQuote(quote),quote);assert.throws(()=>parseSheetQuote({}));
 assert.equal(quote.summary.cartonsPlaced+quote.summary.cartonsUnplaced,4);
 for(const p of quote.pallets){assert.equal(buildSteps(p).length,p.cartonCount);
 for(const b of p.boxes){assert.ok(b.px>=0&&b.py>=0&&b.pz>=0);assert.ok(b.px+b.l<=p.outerDims.l.cm+.01);assert.ok(b.pz+b.w<=p.outerDims.w.cm+.01);assert.ok(b.py+b.h+request.pallet.baseHeight<=p.loadedHeight.cm+.01);}
 for(let i=0;i<p.boxes.length;i++)for(let j=i+1;j<p.boxes.length;j++){const a=p.boxes[i],b=p.boxes[j];assert.ok(a.px+a.l<=b.px+1e-6||b.px+b.l<=a.px+1e-6||a.py+a.h<=b.py+1e-6||b.py+b.h<=a.py+1e-6||a.pz+a.w<=b.pz+1e-6||b.pz+b.w<=a.pz+1e-6);}}
});
await test('endpoint 200/400/404/413/415 and GET/OPTIONS',async()=>{
 const ctx=(body,headers={})=>({request:new Request('https://example.com/api/receiver-check',{method:'POST',headers:{'Content-Type':'application/json',...headers},body}),env:{},waitUntil(){}});
 const call=async(body,headers)=>onRequestPost(ctx(typeof body==='string'?body:JSON.stringify(body),headers));
 const r=await call({...request,profileId:'ltl-standard-us'});assert.equal(r.status,200);const q=await r.json();assert.equal(q.tier,'anonymous');assert.equal(q.profile.id,'ltl-standard-us');assert.ok(q.semantics);assert.ok(q.checks);assert.match(q.inputHash,/^[a-f0-9]{64}$/);
 for(const [body,status] of [[{...request,profileId:'missing'},404],[{...request,profile:{...profile,name:''}},400],[{...request,profile,profileId:'custom'},400],[{...request,profile,items:[]},400],['{',400],['x'.repeat(40000),413]])assert.equal((await call(body)).status,status);
 assert.equal((await call('{}',{'Content-Type':'text/plain'})).status,415);
 const get=await(await onRequestGet()).json();assert.equal(get.profiles.length,4);for(const k of ['endpoint','purpose','request','limits','response','semantics','docs'])assert.ok(get[k]);
 assert.equal((await onRequestOptions()).status,204);
});
await test('actuals validation, imperial replay, photos and variance', async()=>{
 const {recordActuals,measuredActuals}=await import('../src/lib/buildSheet.ts');
 const q={...quote,units:{...quote.units,request:'in-lb'},request:{...request,units:'in-lb'}};
 const actual={0:{height:100,grossWeight:50,crewInitials:'AB',photo:'data:image/png;base64,YQ=='}};
 const saved=recordActuals(q,actual,1,{'0:manual':true},profile,'version','2026-09-11T00:00:00Z');
 assert.equal(saved.actuals[0].height,100/2.54);assert.equal(saved.actuals[0].grossWeight,50/.45359237);assert.equal(measuredActuals(saved)[0].height,100);assert.equal(saved.pallets[0].variance.height.measured,100);assert.equal(saved.actuals[0].photo,actual[0].photo);assert.equal(saved.request.actuals.summary.actualPalletCount,1);
 for(const a of [{0:{height:-1}},{0:{grossWeight:Infinity}},{0:{timestamp:'invalid'}},{0:{photo:'https://example.com/photo'}},{99:{height:1}}])assert.throws(()=>recordActuals(q,a,1,{},profile,'v','2026-09-11T00:00:00Z'));
 assert.throws(()=>recordActuals(q,{},1.5,{},profile,'v','2026-09-11T00:00:00Z'));
});
await test('device profiles validate duplicates and SVG matches carton count',async()=>{
 const {deviceProfiles}=await import('../src/lib/receiverStorage.ts');
 assert.equal(deviceProfiles(JSON.stringify([profile])).length,5);assert.throws(()=>deviceProfiles(JSON.stringify([profile,profile])));assert.throws(()=>deviceProfiles(JSON.stringify([templates[0]])));
 const React=await import('react');const {renderToStaticMarkup}=await import('react-dom/server');const {default:View}=await import('../src/components/PalletEstimateView.tsx');
 for(const p of quote.pallets){const html=renderToStaticMarkup(React.createElement(View,{countTestId:'sheet-placed-count',result:{boxes:p.boxes,pallet:request.pallet,loadedHeight:p.loadedHeight.cm}}));assert.ok(html.includes(`data-testid="sheet-placed-count" class="sr-only">${p.cartonCount}</output>`));assert.equal((html.match(/data-box-id="sku/g)??[]).length,p.cartonCount*6);}
});
console.log(`receiver-profiles.mjs: ${count} tests passed`);
