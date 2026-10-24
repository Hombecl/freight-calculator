import assert from 'node:assert/strict';
import {calculatePackingScenarios,productPackingScenarios} from '../src/lib/productPacking.ts';
const item={l:20,w:12,h:8},space={l:59,w:39,h:39};
assert.equal(calculatePackingScenarios(item,space)[0].count,30);
const improved=productPackingScenarios(item,space);
assert.equal(improved[0].count,35);
assert.equal(improved[0].type,'optimized');
assert.ok(improved.some(s=>s.count===30));
const started=performance.now();let cases=0,better=0;
for(const box of [space,{l:49,w:39,h:29},{l:39,w:29,h:29},{l:40,w:30,h:20}])for(const product of [item,{l:17,w:11,h:7},{l:13,w:9,h:6},{l:15,w:10,h:8},{l:10,w:10,h:10},{l:100,w:100,h:100}]){
 const old=calculatePackingScenarios(product,box),next=productPackingScenarios(product,box);
 assert.ok((next[0]?.count??0)>=(old[0]?.count??0));
 if((next[0]?.count??0)>(old[0]?.count??0))better++;
 for(const s of next){
  assert.equal(s.count,s.items.length);
  assert.ok(s.utilization<=100+1e-6);
  for(const b of s.items){assert.ok(b.x>=0&&b.y>=0&&b.z>=0);assert.ok(b.x+b.l<=box.l+1e-6&&b.y+b.w<=box.w+1e-6&&b.z+b.h<=box.h+1e-6);}
  if(s.type==='optimized')for(let i=0;i<s.items.length;i++)for(let j=0;j<i;j++){
   const a=s.items[i],b=s.items[j];assert.ok(a.x+a.l<=b.x+1e-6||b.x+b.l<=a.x+1e-6||a.y+a.w<=b.y+1e-6||b.y+b.w<=a.y+1e-6||a.z+a.h<=b.z+1e-6||b.z+b.h<=a.z+1e-6);
  }
 }
 cases++;
}
assert.deepEqual(productPackingScenarios({...item,l:NaN},space),[]);
assert.deepEqual(productPackingScenarios({...item,l:0},space),[]);
assert.equal(productPackingScenarios({l:1,w:1,h:1},{l:20,w:20,h:10})[0].type,'standard');
const scaled=productPackingScenarios({l:2,w:1.2,h:.8},{l:5.9,w:3.9,h:3.9});assert.equal(scaled[0].count,35);
console.log(JSON.stringify({suite:'product packing',cases,better,elapsedMs:Math.round(performance.now()-started),note:'synthetic regression cases; not representative customer uplift'}));
