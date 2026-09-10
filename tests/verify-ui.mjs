/** System Chrome; first run npx vite build and vite preview --host 127.0.0.1 --port 4175.
 * Node imports the public libraries through tsx; expected counts are never read
 * from UI labels or data-carton-count. Not part of npm test.
 */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { register } from 'tsx/esm/api';
import { chromium } from 'playwright';
register();
const { findOrderOptions } = await import('../src/lib/orderOptions.ts');
const { QUOTE_EXAMPLE } = await import('../src/lib/orderQuote.ts');
const { designCases, casePalletView, parseCaseRequest } = await import('../src/lib/caseDesign.ts');
const { consolidate, CONSOLIDATION_EXAMPLE } = await import('../src/lib/consolidation.ts');
const { optimizeBoxCatalog, chooseBox, BOX_EXAMPLE } = await import('../src/lib/boxCatalog.ts');
const BASE='http://127.0.0.1:4175';
const results=[], proof=[];
let browser;
try { browser=await chromium.launch({channel:'chrome',headless:true}); }
catch(e) { console.error(`System Chrome launch failed: ${e.message}`); process.exit(1); }
async function test(name,fn) {
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(20000);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  try {await fn(page);assert.deepEqual(errors,[],'console/page errors');results.push({name,pass:true,errors});console.log(`PASS ${name}`);}
  catch(e){results.push({name,pass:false,message:e.message,errors});console.error(`FAIL ${name}: ${e.message}`);await page.screenshot({path:`/tmp/verify-ui-${name}.png`,fullPage:true}).catch(()=>{});}
  finally {await context.close();}
}
async function count(scope,id,n) {
  await scope.getByTestId(id).waitFor({state:'attached'});
  assert.equal(Number(await scope.getByTestId(id).textContent()),n,`${id} vs Node plan`);
}
async function svgCount(scope,n) {
  const ids=await scope.locator('svg [data-box-id]').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.getAttribute('data-box-id')).filter(id=>id!=='base'))]);
  assert.equal(ids.length,n,'actual SVG cargo count');
}
async function animation(scope,id,n) {
  assert.ok(n>0);
  await count(scope,id,n);await svgCount(scope,n);
  const slider=scope.locator('input[type="range"]');assert.equal(Number(await slider.getAttribute('max')),n);
  for(const k of [...new Set([1,Math.ceil(n/2),n])]) {await slider.fill(String(k));await count(scope,id,k);await svgCount(scope,k);}
  await scope.getByRole('button',{name:'Play steps',exact:true}).click();
  await count(scope,id,0);
  await svgCount(scope,0);
  // Real timer, no fake clocks or Show-all shortcut. Wait for every 900ms step.
  await scope.getByTestId(id).filter({hasText:new RegExp(`^${n}$`)}).waitFor({state:'attached',timeout:n*900+15000});
  await scope.getByRole('button',{name:'Play steps',exact:true}).waitFor();
  await count(scope,id,n);await svgCount(scope,n);
}
await test('order-options',async page=>{
  const items=[{sku:'S0',label:'S0',l:70,w:40,h:50,weight:2,qty:6,keepUpright:true},{sku:'S1',label:'S1',l:70,w:60,h:20,weight:7,qty:5,keepUpright:true},{sku:'S2',label:'S2',l:70,w:40,h:30,weight:3,qty:5,keepUpright:true}];
  const request={...structuredClone(QUOTE_EXAMPLE),items,pallet:{l:100,w:100,baseHeight:10,maxHeight:100,maxWeight:1000,tareWeight:10},packagingAllowance:{height:0,weight:0},maxPallets:20};
  const options=await findOrderOptions({...request,targetPalletCount:1,adjustments:[],economics:{}});
  assert.ok(options.alternatives.length,'fixture must produce a build');proof.push({page:'order-quote',request,result:options});
  await page.goto(`${BASE}/order-quote`);
  await page.locator('textarea').fill('sku,length,width,height,weight,qty,upright\nS0,70,40,50,2,6,yes\nS1,70,60,20,7,5,yes\nS2,70,40,30,3,5,yes');
  await page.getByRole('button',{name:/use pasted rows/i}).click();
  for(const [label,value] of [[/pallet length/i,100],[/pallet width/i,100],[/base height/i,10],[/packing height cap/i,100],[/payload cap/i,1000],[/tare weight/i,10],[/wrap\/cap height/i,0],[/wrap\/cap weight/i,0],[/max pallets/i,20]])await page.getByLabel(label).fill(String(value));
  await page.getByRole('button',{name:/quote this order/i}).click();
  await page.getByTestId('option-target').fill('1');
  await page.getByRole('button',{name:/search options/i}).click();
  await page.getByTestId('option-card').first().waitFor();
  assert.equal(await page.getByTestId('option-card').count(),options.alternatives.length);
  for(let ai=0;ai<options.alternatives.length;ai++) {
    const a=options.alternatives[ai],card=page.getByTestId('option-card').nth(ai);
    await count(card,'option-carton-count',a.quote.summary.cartonsPlaced);
    await card.getByRole('button',{name:/view build/i}).click();
    const ps=card.getByTestId('option-pallet');assert.equal(await ps.count(),a.quote.pallets.length);
    for(let pi=0;pi<a.quote.pallets.length;pi++)await animation(ps.nth(pi),'option-placed-count',a.quote.pallets[pi].cartonCount);
  }
});
await test('case-designer',async page=>{
  // Small explicit destination keeps real-time animation short while testing
  // the same detail component and full public design pipeline.
  const request={units:'cm-kg',product:{l:10,w:8,h:15,weight:.3,keepUpright:true},unitsPerCase:{min:6,max:12},caseConstraints:{maxWeight:20,maxDim:100,boardThickness:.4,headspace:.5,allowedOrientations:'upright'},pallet:{l:60,w:40,baseHeight:15,maxHeight:55,maxWeight:1000,overhang:0},container:{preset:'40hq'}};
  const result=await designCases(request);assert.ok(result.candidates.length);proof.push({page:'case-designer',request,result});
  await page.goto(`${BASE}/case-designer`);
  for(const [label,v] of [[/pallet length/i,60],[/pallet width/i,40],[/total height cap/i,55]])await page.getByLabel(label).fill(String(v));
  await page.getByTestId('design-run').click();await page.getByTestId('design-candidate-row').first().waitFor();
  assert.equal(await page.getByTestId('design-candidate-row').count(),result.candidates.length);
  for(let i=0;i<result.candidates.length;i++) {
    const c=result.candidates[i],view=casePalletView(c,parseCaseRequest(request));assert.equal(view.boxes.length,c.pallet.casesPerPallet);
    await page.getByTestId('design-candidate-row').nth(i).click();
    const scope=page.getByTestId('design-placed-count').locator('..');
    await animation(scope,'design-placed-count',view.boxes.length);
  }
});
await test('consolidation',async page=>{
  const request=structuredClone(CONSOLIDATION_EXAMPLE),result=await consolidate(request);proof.push({page:'consolidation',request,result});
  await page.goto(`${BASE}/consolidation`);await page.getByTestId('consolidation-run').click();await page.getByTestId('consolidation-plan').first().waitFor();
  assert.equal(await page.getByTestId('consolidation-plan').count(),result.plans.length);
  for(let pi=0;pi<result.plans.length;pi++) {
    const cards=page.getByTestId('consolidation-plan').nth(pi).getByTestId('container-card');assert.equal(await cards.count(),result.plans[pi].containers.length);
    for(let ci=0;ci<result.plans[pi].containers.length;ci++) {const c=result.plans[pi].containers[ci];await count(cards.nth(ci),'card-placed-count',c.boxes.length);await cards.nth(ci).getByTestId('open-container').click();await count(page,'container-placed-count',c.boxes.length);}
  }
});
await test('box-catalog',async page=>{
  const request={...structuredClone(BOX_EXAMPLE),units:'cm-kg',skus:[{sku:'A',l:10,w:10,h:10,weight:.2,fragile:false,keepUpright:false}],orders:[{orderId:'one',lines:[{sku:'A',qty:1}],count:1},{orderId:'two',lines:[{sku:'A',qty:2}],count:1}],coverageFirst:true,billing:{unit:'cm-kg',dimDivisor:5000,minBillableWeight:0,ratePerKgOrLb:2},voidFillCostPerLitre:0};
  const catalog=await optimizeBoxCatalog(request),result=await chooseBox({...request,lines:[{sku:'A',qty:2}]},catalog.catalog);assert.ok(result.box);proof.push({page:'box-catalog',request,catalog,result});
  await page.goto(`${BASE}/box-catalog`);await page.getByTestId('box-optimize').click();await page.getByTestId('box-choose').click();await count(page,'box-placed-count',result.plan.boxes.length);
});
await browser.close();
if(process.env.VERIFY_UI_RESULTS)writeFileSync(process.env.VERIFY_UI_RESULTS,JSON.stringify({results,proof},null,2)+'\n');
console.log(`${results.filter(r=>r.pass).length}/${results.length} UI checks passed`);
if(results.some(r=>!r.pass))process.exitCode=1;
