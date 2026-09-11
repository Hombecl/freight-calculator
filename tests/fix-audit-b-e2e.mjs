import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

export async function fixAuditBTests({test,page,BASE}) {
 await test('fix B: quote stale actions and frozen exports',async()=>{
  await page.goto(`${BASE}/order-quote`);await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});await page.reload();
  await page.getByRole('button',{name:'Quote this order',exact:false}).click();
  const requestButton=page.getByRole('button',{name:'API request JSON',exact:true});await requestButton.waitFor();
  const download=page.waitForEvent('download');await requestButton.click();const request=JSON.parse(await readFile(await (await download).path(),'utf8'));
  assert.equal(request.pallet.tareWeight,22);
  await page.getByLabel('Tare weight kg',{exact:true}).fill('100');
  await page.getByTestId('quote-stale').waitFor();
  for(const name of ['API request JSON','Full result JSON','Carrier-input CSV','Verify against /api/order-quote']) assert.ok(await page.getByRole('button',{name,exact:true}).isDisabled());
  assert.equal(await page.getByRole('link',{name:'Open build sheet',exact:true}).getAttribute('aria-disabled'),'true');
  assert.equal(await page.getByRole('button',{name:/Find options/}).count(),0);
  await page.getByRole('button',{name:'Quote this order',exact:false}).click();await page.getByTestId('quote-stale').waitFor({state:'detached'});
  const updated=page.waitForEvent('download');await requestButton.click();assert.equal(JSON.parse(await readFile(await (await updated).path(),'utf8')).pallet.tareWeight,100);
  const inputs=page.locator('table').first().locator('tbody input');assert.ok(await inputs.count()>0);for(const el of await inputs.all())assert.ok(await el.getAttribute('aria-label'));
  await page.getByText('Call this from your WMS / order system',{exact:true}).click();
  const curl=await page.locator('pre').filter({hasText:'curl -X POST'}).innerText();
  const args=execFileSync('/bin/sh',['-c',`curl() { printf '%s\\n' "$@"; }\n${curl}`],{encoding:'utf8'});
  assert.ok(args.includes('--data-binary\n@order-quote-request.json'));assert.ok(args.includes('Content-Type: application/json'));
 },page);
 await test('fix B: imperial import preserves maxStack zero',async()=>{
  await page.goto(`${BASE}/order-quote`);
  await page.getByLabel('Rows are in in/lb',{exact:true}).check();
  await page.locator('textarea').first().fill('sku,length,width,height,weight,qty,maxStack\nIMPORT,10,8,6,2,1,0');
  await page.getByRole('button',{name:'Use pasted rows',exact:true}).click();
  assert.equal(await page.getByLabel('IMPORT length cm',{exact:true}).inputValue(),'25.4');
  assert.equal(await page.getByLabel('IMPORT weight kg',{exact:true}).inputValue(),'0.91');
  assert.equal(await page.getByLabel('IMPORT max on top kg',{exact:true}).inputValue(),'0');
 },page);
 await test('fix B: every zh quote cross-tool link renders',async()=>{
  await page.goto(`${BASE}/zh/order-quote`);await page.locator('main h1').first().waitFor();
  await page.getByRole('button',{name:'計呢張訂單',exact:true}).click();await page.getByTestId('quote-result').waitFor();
  const links=await page.locator('main a[href^="/zh/"]').evaluateAll(els=>els.map(a=>({href:a.getAttribute('href'),text:a.textContent})));
  assert.ok(links.length>=5);
  for(const {href,text} of links){assert.ok(!href.includes('/zh/zh/'));await page.goto(`${BASE}/zh/order-quote`);await page.locator('main h1').first().waitFor();for (const detail of await page.locator('details').all()) { if (!await detail.getAttribute('open')) await detail.locator('summary').click(); } await page.locator('main a').filter({hasText:text}).first().click();await page.locator('main h1').first().waitFor();assert.ok(await page.locator('main h1').first().innerText());}
 },page);
 await test('fix B: case invalid run clears exports',async()=>{
  await page.goto(`${BASE}/case-designer`);await page.getByLabel('Overhang per side cm',{exact:true}).fill('10');await page.getByTestId('design-run').click();await page.getByTestId('design-candidate-row').first().waitFor();
  await page.getByTestId('design-candidate-row').first().click();
  const base=page.locator('[data-box-id="base"]').first();assert.equal(await base.getAttribute('data-box-l'),'120');assert.equal(await base.getAttribute('data-box-w'),'80');
  assert.ok(await page.locator('[data-box-x="-10"]').count()>0);
  await page.getByLabel('Product length cm',{exact:true}).fill('-1');
  assert.equal(await page.getByTestId('design-candidate-row').count(),0);
  await page.getByTestId('design-run').click();await page.getByRole('alert').waitFor();
  assert.equal(await page.getByRole('button',{name:'Candidates CSV',exact:true}).count(),0);
 },page);
 await test('fix B: four tool pages fit 390px',async()=>{
  await page.setViewportSize({width:390,height:844});
  try {for(const route of ['order-quote','api-docs','planner','warehouse']){await page.goto(`${BASE}/${route}`);await page.locator('main h1').first().waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=392),`${route} overflows: ${await page.evaluate(()=>document.documentElement.scrollWidth)}`);}}
  finally {await page.setViewportSize({width:1440,height:900});}
 },page);
 await test('fix B: pricing lists every endpoint and zh explanations render',async()=>{
  await page.goto(`${BASE}/api-pricing`);await page.locator('main h1').waitFor();
  const { ENDPOINT_BASE_LIMITS } = await import('../src/lib/apiTiers.ts');
  const main=await page.locator('main').first().innerText();assert.ok(main.includes(`${Object.keys(ENDPOINT_BASE_LIMITS).length} endpoints`));
  for(const ep of Object.keys(ENDPOINT_BASE_LIMITS))assert.ok(main.includes(`/api/${ep}`));
  await page.goto(`${BASE}/zh/receiver-profiles`);await page.locator('main h1').waitFor();assert.ok((await page.locator('main').first().innerText()).includes('未能核實 Amazon 最新收貨規則'));
  assert.ok(!(await page.locator('main').first().innerText()).includes('DNS'));
  await page.goto(`${BASE}/zh/consolidation`);await page.getByTestId('consolidation-run').click();await page.getByTestId('consolidation-result').waitFor();
  assert.ok((await page.getByTestId('consolidation-result').innerText()).includes('整單裝載'));
  for(const title of await page.getByTestId('consolidation-result').locator('[title]').evaluateAll(es=>es.map(e=>e.title)))assert.match(title,/[一-鿿]/);
 },page);
 await test('fix B: export email disclosure and optional updates',async()=>{
  await page.goto(`${BASE}/planner`);await page.evaluate(()=>localStorage.removeItem('dimpack_entitlement'));await page.reload();
  await page.getByTestId('export-email-notice').waitFor();await page.getByRole('button',{name:'CSV',exact:true}).click();
  const updates=page.getByRole('checkbox',{name:/Email me product updates/});await updates.waitFor();assert.equal(await updates.isChecked(),false);
 },page);
}
if(process.argv[1]?.endsWith('/fix-audit-b-e2e.mjs')) {
 const {chromium}=await import('playwright');const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(15000);let failed=0;
 await fixAuditBTests({page,BASE:process.argv[2]??'http://127.0.0.1:4187',test:async(name,fn)=>{try{await fn();console.log('PASS',name);}catch(e){failed++;console.error('FAIL',name,e.message);}}});
 await browser.close();process.exitCode=failed?1:0;
}
