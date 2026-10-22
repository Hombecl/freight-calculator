import assert from 'node:assert/strict';
import {singleSkuPacking,verifySingleSkuPacking} from '../src/lib/singleSkuPacking.ts';
import {optimizePacking} from '../src/lib/optimizePacking.ts';
import {packWithConstraints} from '../src/lib/binPacking.ts';
const container={l:1203,w:235,h:269,maxWeight:26500};
const spec={id:'cargo',label:'Cargo',l:60,w:40,h:35,weight:1,qty:1000,color:1};
const result=optimizePacking(container,[spec]);
assert.ok(result.boxes.length>=876,'single-SKU search closes most of the independently reproduced 820-carton gap');
assert.equal(result.optimization.baselineCount,820);
assert.equal(result.unplaced,1000-result.boxes.length);
assert.equal(verifySingleSkuPacking(result.boxes,container,spec),true);
const invalid=result.boxes.map(b=>({...b}));invalid[1]={...invalid[0],id:invalid[1].id};
assert.equal(verifySingleSkuPacking(invalid,container,spec),false,'independent checker rejects overlapping cartons');
assert.equal(verifySingleSkuPacking([{...result.boxes[0],py:1}],container,spec),false,'floating carton rejected');
assert.equal(verifySingleSkuPacking(result.boxes,{...container,maxWeight:1},spec),false,'payload violation rejected');
assert.equal(verifySingleSkuPacking([{...result.boxes[0],l:2}],container,spec),false,'wrong orientation rejected');
for(const patch of [{maxStack:0},{maxStack:3},{keepUpright:true},{allowRotate:false},{qty:13},{weight:0,maxStack:0},{qty:0}]){
 const s={...spec,...patch};const c={l:180,w:110,h:130,maxWeight:50};const boxes=singleSkuPacking(c,s);
 assert.ok(verifySingleSkuPacking(boxes,c,s),JSON.stringify(patch));assert.ok(boxes.length<=s.qty);
}
let seed=20261022;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
for(let i=0;i<45;i++){
 const c={l:100+Math.floor(random()*140),w:80+Math.floor(random()*70),h:90+Math.floor(random()*80),maxWeight:300};
 const s={...spec,l:15+Math.floor(random()*60),w:15+Math.floor(random()*50),h:15+Math.floor(random()*50),qty:100,weight:2,keepUpright:i%3===0,maxStack:i%4===0?6:undefined};
 assert.ok(verifySingleSkuPacking(singleSkuPacking(c,s),c,s),`holdout ${i}`);
}
const mixed=[{...spec,qty:10},{...spec,id:'b',l:30,qty:4,unloadOrder:1}];
const original=packWithConstraints(container,mixed),optimized=optimizePacking(container,mixed);
assert.deepEqual(optimized.boxes,original.boxes,'mixed cargo retains general solver behavior');
assert.deepEqual(optimized.zones,original.zones);
const limited={...spec,qty:20,weight:10,maxStack:0,unloadOrder:2};
const constrained=optimizePacking({l:100,w:100,h:100,maxWeight:30},[limited]);
assert.ok(verifySingleSkuPacking(constrained.boxes,{l:100,w:100,h:100,maxWeight:30},limited));
console.log('Single-SKU improvements, full support, constraints, independent rejection checks and 45 seeded holdouts passed');
