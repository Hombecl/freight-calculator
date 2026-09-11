import { removedPalletCount } from '../src/lib/warehouseInventory.ts';
import { autoArrangeFloorD } from '../src/lib/warehouse.ts';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { queryNumber } from '../src/lib/queryNumber.ts';
import { containerCountLimit, constrainContainerScenarios } from '../src/lib/legacyContainer.ts';
import { CONTAINER_PRESETS } from '../src/lib/packChecks.ts';
import { loadingSequence } from '../src/lib/realism.ts';
import { toPackingCSV, buildPrintableHTML } from '../src/lib/exportPlan.ts';
import { onRequestPost as pack } from '../functions/api/pack.ts';
import { onRequestPost as key } from '../functions/api/key.ts';
import { onRequestPost as lead } from '../functions/api/lead.ts';
import { onRequestPost as receiver, onRequestGet as receiverDocs } from '../functions/api/receiver-check.ts';
import { attachProfile } from '../src/lib/receiverProfiles.ts';
import { quoteOrder } from '../src/lib/orderQuote.ts';
import { FBA_RATE_AS_OF, FBA_SIZE_TIERS, FBA_RATE_METADATA } from '../src/data/fbaRates.ts';
let count = 0;
async function test(name, fn) { await fn(); count++; console.log(`PASS audit-fixes-a: ${name}`); }
let ip = 0;
function ctx(body) {
  const storage = new Map();
  return { request: new Request('https://example.test/api/test', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': `192.0.2.${++ip}` }, body: JSON.stringify(body) }), env: { LEADS: { get: async k => storage.get(k) ?? null, put: async (k,v) => storage.set(k,v) } } };
}
const item = { l: 60, w: 40, h: 40, weight: 1000 };
await test('F02/F03 all preset payloads, exact limits, zero weight and door rejection', () => {
  for (const [preset, c] of Object.entries(CONTAINER_PRESETS)) {
    assert.equal(containerCountLimit(item, preset).maxCount, Math.floor(c.maxWeight / 1000));
    assert.equal(containerCountLimit({...item, weight: c.maxWeight}, preset).maxCount, 1);
    assert.equal(containerCountLimit({...item, weight: c.maxWeight + 1}, preset).maxCount, 0);
    assert.equal(containerCountLimit({...item, weight: 0}, preset).maxCount, Infinity);
  }
  assert.equal(containerCountLimit({l:230,w:230,h:230,weight:100}, '20gp').maxCount, 0);
  assert.equal(containerCountLimit({l:230,w:230,h:230,weight:100}, '40hq').doorFits, true);
  assert.equal(containerCountLimit({l:300,w:228,h:234,weight:100}, '20gp').doorFits, true);
});
await test('F02 constrained scene and statistics agree; geometry conserved without overlap', () => {
  const items = Array.from({length: 54}, (_, i) => ({x: (i%9)*60, y: Math.floor(i/9)%3*40, z: Math.floor(i/27)*40}));
  const source = [{count:54,utilization:54,items}];
  const result = constrainContainerScenarios(source, item, '20gp')[0];
  assert.equal(result.count,28); assert.equal(result.items.length,28); assert.equal(result.utilization,28);
  assert.equal(source[0].items.length,54);
  assert.deepEqual(constrainContainerScenarios(source,item,'20gp')[0],result);
  for(const b of result.items) { assert.ok(b.z <= 40); assert.ok(b.x >= 0 && b.x+60 <= 589 && b.y+40 <=120); }
  assert.equal(new Set(result.items.map(b=>`${b.x},${b.y},${b.z}`)).size,28);
  const blocked=constrainContainerScenarios(source,{l:230,w:230,h:230,weight:100},'20gp')[0];
  assert.equal(blocked.count,0); assert.deepEqual(blocked.items,[]); assert.equal(blocked.utilization,0);
});
await test('F04 zero survives query parsing; absent/invalid retain defaults', () => {
  for(const fallback of [0,1,3,6,10,20,500,1000]) {
    for(const invalid of [null,'',' ','text','Infinity','-Infinity']) assert.equal(queryNumber(invalid,fallback),fallback);
    assert.equal(queryNumber('0',fallback),0); assert.equal(queryNumber('2.5',fallback),2.5);
  }
  assert.equal(20*queryNumber('0',20)*2+20*queryNumber('0',6),0);
  for(const page of ['PalletStorageCost','PalletsPerContainer','WarehouseSpaceCalc','TiHiCalc','FreightClassCalc','DimWeightCalc','CbmCalc','PalletCalc','AisleWidthCalc']) {
    assert.doesNotMatch(readFileSync(`src/pages/${page}Page.tsx`,'utf8'),/Number\(params\.get\([^\n]+?\|\|/);
  }
});
await test('F05 quantity rejects zero, negatives, fractions, strings, null and missing', async () => {
  for(const qty of [0,-1,1.5,'text','2',null,undefined,Infinity,NaN]) {
    const r=await pack(ctx({container:{l:100,w:100,h:100},items:[{l:40,w:40,h:50,qty}]}));
    assert.equal(r.status,400); assert.equal((await r.json()).field,'items[0].qty');
  }
});
await test('F05 dimensions and weight reject nonnumeric types and nonfinite values', async () => {
  for(const field of ['l','w','h','weight']) for(const value of ['1',true,{},[],null,-1,Infinity,...(field==='weight'?[]:[0,undefined])]) {
    const r=await pack(ctx({container:{l:100,w:100,h:100},items:[{l:40,w:40,h:50,weight:0,qty:1,[field]:value}]}));
    assert.equal(r.status,400,`${field} ${value}`); assert.equal((await r.json()).field,`items[0].${field}`);
  }
  const r=await pack(ctx({container:{l:100,w:100,h:100},items:[null]})); assert.equal(r.status,400);
});
await test('F05 valid pack conserves requested units, accepts optional/zero weight', async () => {
  for(const weight of [undefined,0,10]) {
    const r=await pack(ctx({container:{l:100,w:100,h:100},items:[{l:40,w:40,h:50,qty:2,weight}]}));
    assert.equal(r.status,200); const j=await r.json(); assert.equal(j.boxes.length,2); assert.equal(j.unplaced,0);
  }
});
const base={id:'base',label:'Base',px:20,py:0,pz:0,l:80,w:100,h:10,color:0,weight:1};
const top={...base,id:'top',label:'Top',px:0,py:10,l:100};
const meta={title:'Bridge',containerLabel:'Test',container:{l:100,w:100,h:100},unit:'cm',date:'2026-09-11'};
await test('F06 bridge support precedes top in sequence, CSV and printable PDF', () => {
  assert.deepEqual(loadingSequence([top,base]).map(b=>b.id),['base','top']);
  const csv=toPackingCSV([top,base],[],meta); assert.match(csv.split('\n')[1],/^1,Base,/);
  const html=buildPrintableHTML({meta,boxes:[top,base],zones:[],totalRequested:2,imageDataUrl:null,stats:{placedCount:2,volumeUtil:18,totalWeight:2,weightUtil:null,cogOffsetPct:{x:0,z:0}}});
  assert.ok(html.indexOf('</span>Base')<html.indexOf('</span>Top'));
});
await test('F06 multiple supports, vertical chain, edge contacts and spatial tie breaks', () => {
  const left={...base,id:'left',px:0,l:50}; const right={...base,id:'right',px:50,l:50};
  const upper={...top,id:'upper',py:20};
  assert.deepEqual(loadingSequence([upper,top,right,left]).map(b=>b.id),['left','right','top','upper']);
  const edge={...base,id:'edge',px:100};
  assert.deepEqual(loadingSequence([edge,top,left]).map(b=>b.id),['left','top','edge']);
  assert.deepEqual(loadingSequence([]),[]);
  const input=[right,left,top];assert.deepEqual(loadingSequence(input),loadingSequence(input));assert.equal(input[0],right);
});
const request={pallet:{l:120,w:80,baseHeight:15,maxHeight:115,maxWeight:1000,tareWeight:25},maxPallets:1,items:[{sku:'A',l:40,w:40,h:50,weight:20,qty:30,maxStack:5}],limits:{}};
const profile={id:'audit',name:'Audit',template:false,source:'synthetic',verifiedAt:'2026-09-11',pallet:{},limits:{maxLoadedHeight:20},rules:[{code:'HEIGHT',text:'Height',check:'height'}]};
await test('F10 partial precedes failed profile rules in library and real receiver handler', async () => {
  const q=await quoteOrder(request); assert.equal(q.status,'partial');
  const result=await attachProfile(q,profile); assert.equal(result.status,'partial');
  assert.equal(result.profileChecks[0].status,'fail'); assert.ok(result.reviewReasons.includes('HEIGHT'));
  const response=await receiver(ctx({...request,profile})); assert.equal(response.status,200);
  const j=await response.json();assert.equal(j.status,'partial');assert.equal(j.profileChecks[0].status,'fail');
  assert.equal(j.summary.cartonsPlaced+j.summary.cartonsUnplaced,30);
  assert.deepEqual(await attachProfile(q,profile),result);
  assert.match((await (await receiverDocs({})).json()).semantics,/partial takes precedence/);
  const full=await quoteOrder({...request,items:[{...request.items[0],qty:1}]});
  assert.equal((await attachProfile(full,profile)).status,'needs_review');
  assert.equal((await attachProfile(full,{...profile,limits:{maxLoadedHeight:200}})).status,full.status);
});
await test('F15 key and lead reject all non-object bodies with JSON 400', async () => {
  for(const handler of [key,lead]) for(const body of [null,[],[{}],'text',42,true]) {
    const r=await handler(ctx(body)); assert.equal(r.status,400);
    assert.deepEqual(await r.json(),{error:'body must be a JSON object'});
  }
});
await test('F21 rebuild uses exact quantities and detects removals per physical type', () => {
  const spec={id:'eur',label:'EUR',l:120,w:80,h:150,weight:600,qty:40,color:0,kind:'cargo'};
  const old=autoArrangeFloorD({l:2000,w:1200},[spec],300,'E');
  for(const qty of [0,1,6,12]) {
    const rows=autoArrangeFloorD({l:2000,w:1200},[{...spec,qty}],300,'E');
    assert.equal(rows.length,qty);assert.equal(removedPalletCount(old,rows),Math.max(0,old.length-qty));
  }
  assert.equal(removedPalletCount([base],[{...base,id:'manual',l:base.w,w:base.l}]),0);
  assert.equal(removedPalletCount([base],[{...base,weight:2}]),1);
  assert.equal(removedPalletCount([base],[top]),1);
});
await test('F12 original fee data retained with recorded year and illustrative metadata', () => {
  assert.equal(FBA_RATE_AS_OF,'2025');assert.equal(FBA_RATE_METADATA.template,true);
  assert.deepEqual(Object.values(FBA_SIZE_TIERS).map(t=>t.baseFee),[3.22,4.75,9.73,26.33,40.12,54.81,194.95]);
  const source=readFileSync('src/components/Calculator.tsx','utf8');
  assert.match(source,/US FBA size-tier base rates as of \$\{FBA_RATE_AS_OF\}/);
  assert.match(source,/excludes surcharges, category and low-price programs; verify in Seller Central/);
});
await test('F13 editable rate controls and disclaimer precede cost output', () => {
  const source=readFileSync('src/components/Calculator.tsx','utf8');
  assert.ok(source.indexOf('Illustrative default, not a quote.')<source.indexOf('displayMoney(packingCosts.air.unit)'));
  assert.match(source,/data-testid=\{`\$\{kind\}-rate`\}/);assert.match(source,/rates.airCurrency : rates.seaCurrency/);
  assert.match(source,/setRates\(prev => \(\{\.\.\.prev, \[kind\]: value\}\)\)/);
});
await test('F14 every competitor has the exact owner-verified source and date', () => {
  const {competitors}=JSON.parse(readFileSync('src/data/competitors.json','utf8'));
  assert.equal(competitors.length,11);
  for(const c of competitors) {
    assert.equal(c.pricingSource.checkedAt,'2026-09-10');
    const expected=c.slug.includes('cubemaster')?'https://www.cubemaster.net/subscription/pricing.asp':c.slug.includes('searates')?'https://www.searates.com/pricing/load-calculator':/cargo-planner|easycargo|3dbinpacking|cargowiz|goodloading/.test(c.slug)?'https://containermath.com/blog/best-container-loading-software':'https://sourceforge.net/software/load-planning/';
    assert.equal(c.pricingSource.url,expected);
  }
  const source=readFileSync('src/pages/ComparePage.tsx','utf8');assert.match(source,/Reported by/);assert.match(source,/href=\{c.pricingSource.url\}/);
});
console.log(`audit-fixes-a: ${count} regression groups passed`);
