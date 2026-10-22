import assert from 'node:assert/strict';
import {optimizePacking} from '../src/lib/optimizePacking.ts';
import {plannerAlternatives,layoutSignature} from '../src/lib/plannerAlternatives.ts';
import {reviewPlanner} from '../src/lib/plannerReview.ts';
import {computeStats} from '../src/lib/binPacking.ts';
const c={l:1203,w:235,h:269,maxWeight:26500};
const specs=[{id:'a',label:'Cargo',l:60,w:40,h:35,weight:1,qty:1000,color:1}];
const original=JSON.stringify(specs),base=optimizePacking(c,specs),baseBefore=JSON.stringify(base);
const alternatives=plannerAlternatives(c,specs,base);
assert.ok(alternatives.length>=1 && alternatives.length<=2);
assert.ok(alternatives.some(a=>a.result.boxes.length===820),'retains a real general-solver arrangement');
assert.equal(JSON.stringify(base),baseBefore);assert.equal(JSON.stringify(specs),original);
const seen=new Set([layoutSignature(base.boxes)]);
for(const {result} of alternatives){
 assert.equal(reviewPlanner(result.boxes,c,specs).issues.length,0);
 assert.equal(result.unplaced,1000-result.boxes.length);
 assert.deepEqual(result.stats,computeStats(result.boxes,c));
 assert.ok(!seen.has(layoutSignature(result.boxes)));seen.add(layoutSignature(result.boxes));
}
assert.equal(layoutSignature(base.boxes),layoutSignature([...base.boxes].reverse().map((b,i)=>({...b,id:`renamed-${i}`}))));
const tiny={l:40,w:40,h:40,maxWeight:10};
const one=[{...specs[0],l:40,w:40,h:40,qty:1,allowRotate:false}];
assert.equal(plannerAlternatives(tiny,one,optimizePacking(tiny,one)).length,0,'do not duplicate an identical plan');
const mixed=[{...specs[0],qty:9,unloadOrder:2,maxStack:0},{...specs[0],id:'b',l:30,w:20,h:20,qty:15,unloadOrder:1,keepUpright:true}];
const small={l:180,w:100,h:100,maxWeight:30,door:{w:90,h:90}};
for(const {result} of plannerAlternatives(small,mixed,optimizePacking(small,mixed)))assert.equal(reviewPlanner(result.boxes,small,mixed,small.door).issues.length,0);
console.log('Planner alternatives: distinct real layouts, quantities, constraints, identity, immutability and no-duplicate fallback passed');
