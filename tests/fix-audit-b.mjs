import assert from 'node:assert/strict';
import { parseText } from '../src/lib/importCartons.ts';
import { parseCaseRequest, evaluateCase, casePalletView } from '../src/lib/caseDesign.ts';
import { checkAssumption, ruleText, profileText } from '../src/lib/auditPageLocale.ts';
import profiles from '../src/data/receiverProfiles.json' with {type:'json'};
let count = 0;
for (const alias of ['maxStack','max stack','max on top','stack','top load','頂部承重']) {
 for (const value of [0,5.5,100]) {
  const result = parseText(`sku,length,width,height,weight,qty,${alias}\nA,40,30,20,5,2,${value}`);
  assert.equal(result.specs[0].maxStack,value); assert.equal(result.specs[0].qty,2); count++;
 }
}
for (const value of ['-1','text','Infinity']) {
 const result = parseText(`sku,length,width,height,weight,qty,maxStack\nA,40,30,20,5,2,${value}`);
 assert.equal(result.specs.length,0);assert.ok(result.warnings.some(w=>w.includes('maxStack')));count++;
}
assert.equal(parseText('sku,length,width,height,weight,qty,maxStack\nA,40,30,20,5,2,').specs[0].maxStack,undefined);count++;
for(const overhang of [0,2.5,10]) {
 const p=parseCaseRequest({product:{l:10,w:10,h:10,weight:1},unitsPerCase:1,pallet:{l:120,w:80,baseHeight:15,maxHeight:100,maxWeight:1000,overhang}});
 const c=evaluateCase(p,{l:60,w:40,h:40},1,{a:1,b:1,c:1,orientation:'lwh'},'fixture');
 const view=casePalletView(c,p);
 assert.equal(view.pallet.l,120);assert.equal(view.pallet.w,80);
 assert.equal(view.boxes.length,c.pallet.casesPerPallet);
 assert.equal(Math.min(...view.boxes.map(b=>b.px)),overhang === 0 ? 0 : -overhang);
 assert.equal(Math.min(...view.boxes.map(b=>b.pz)),overhang === 0 ? 0 : -overhang);
 assert.deepEqual(view,casePalletView(c,p));
 for(const b of view.boxes){assert.ok(b.px>=-overhang && b.px+b.l<=120+overhang);assert.ok(b.pz>=-overhang && b.pz+b.w<=80+overhang);}
 count++;
}
for(const p of profiles.profiles){assert.ok(profileText(p,'name','zh'));for(const r of p.rules){assert.equal(ruleText(r,'zh'),r.textZh);assert.equal(ruleText(r,'en'),r.text);count++;}}
for(const status of ['pass','fail','warn','not_evaluated']){const c={code:'PAYLOAD',status,assumption:'payload explanation'};assert.equal(checkAssumption(c,'en'),c.assumption);assert.match(checkAssumption(c,'zh'),/載重/);count++;}
console.log(`FIX-AUDIT-B: ${count} regression cases passed`);
