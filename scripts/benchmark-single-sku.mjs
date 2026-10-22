// Run: npx tsx scripts/benchmark-single-sku.mjs [output.json]
// Public fixture: https://brimload.com/t1/benchmark/dimpack3d_head_to_head_20261016.csv
// T1 counts are vendor-reported; this script independently checks our candidate placements.
import fs from 'node:fs';
import {optimizePacking} from '../src/lib/optimizePacking.ts';
import {verifySingleSkuPacking} from '../src/lib/singleSkuPacking.ts';
const [header,...lines]=fs.readFileSync(new URL('../tests/fixtures/brimload-single-sku-20261016.csv',import.meta.url),'utf8').trim().split(/\r?\n/);
const keys=header.split(',');
const results=[];
for(const line of lines){
 const row=Object.fromEntries(line.split(',').map((v,i)=>[keys[i],v]));
 const container={l:+row.space_l/10,w:+row.space_w/10,h:+row.space_h/10,maxWeight:26500};
 const spec={id:row.case_id,label:row.case_id,l:+row.box_l/10,w:+row.box_w/10,h:+row.box_h/10,weight:1,qty:+row.dimpack3d_cartons_requested,color:1};
 const start=performance.now();const result=optimizePacking(container,[spec]);
 const verified=result.optimization.method==='single-sku'?verifySingleSkuPacking(result.boxes,container,spec):null;
 const entry={id:row.case_id,stratum:row.stratum,baseline:result.optimization.baselineCount,loaded:result.boxes.length,t1Reported:+row.t1_deeper_cartons,improved:result.optimization.addedCount,verified,elapsedMs:Math.round(performance.now()-start)};
 results.push(entry);console.log(JSON.stringify(entry));
 if(verified===false||entry.loaded<entry.baseline)throw new Error(`Invalid or regressed plan: ${entry.id}`);
}
const summary={cases:results.length,improved:results.filter(r=>r.improved>0).length,unchanged:results.filter(r=>r.improved===0).length,regressions:results.filter(r=>r.improved<0).length,aboveT1:results.filter(r=>r.loaded>r.t1Reported).length,equalT1:results.filter(r=>r.loaded===r.t1Reported).length,belowT1:results.filter(r=>r.loaded<r.t1Reported).length,meanGainPct:results.reduce((s,r)=>s+(r.loaded/r.baseline-1)*100,0)/results.length,meanT1GapPct:results.reduce((s,r)=>s+(r.t1Reported/r.loaded-1)*100,0)/results.length};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify({summary,results},null,2));
console.log(summary);
