import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/_middleware.ts';
import { apiDemand } from '../src/lib/apiDemand.ts';
const key = 'dp_live_' + 'a'.repeat(32);
async function run({path='pack',method='POST',status=200,credential=key,revoked=false,fail=false,telemetryFails=false}={}) {
  const points=[], pending=[];
  const response=new Response('unchanged', {status});
  const ctx={request:new Request(`https://example.com/api/${path}`,{method,headers:{'X-API-Key':credential}}),
    env:{LEADS:{get:async()=> revoked ? JSON.stringify({tier:'free',revokedAt:'now'}) : JSON.stringify({tier:'free'})},
      API_ANALYTICS:{writeDataPoint:p=>{if(telemetryFails) throw Error('sink failed'); points.push(p);}}},
    next:async()=>{if(fail) throw Error('handler failed'); return response;},waitUntil:p=>pending.push(p)};
  if(fail) await assert.rejects(onRequest(ctx),/handler failed/);
  else assert.equal(await onRequest(ctx),response);
  await Promise.all(pending);
  return points;
}
const [a]=await run(), [b]=await run({status:400});
assert.equal(a.indexes[0],b.indexes[0]);
assert.match(a.indexes[0],/^[a-f0-9]{64}$/);
assert.ok(!JSON.stringify(a).includes(key));
assert.equal(b.blobs[1],'400');
assert.equal((await run({status:429}))[0].blobs[1],'429');
assert.equal((await run({fail:true}))[0].blobs[1],'500');
assert.equal((await run({revoked:true}))[0].indexes[0],'anonymous');
assert.equal((await run({revoked:true}))[0].blobs[3],'invalid_key');
assert.equal((await run({credential:''}))[0].blobs[3],'anonymous');
assert.deepEqual(await run({telemetryFails:true}),[]);
assert.deepEqual(await run({method:'GET'}),[]);
assert.deepEqual(await run({method:'OPTIONS'}),[]);
assert.deepEqual(await run({path:'hit'}),[]);
assert.deepEqual(apiDemand({apiPurpose:'container-loading',monthlyVolume:'1000-10000'}),{apiPurpose:'container-loading',monthlyVolume:'1000-10000'});
assert.deepEqual(apiDemand({apiPurpose:'arbitrary payload',monthlyVolume:'999'}),{apiPurpose:'',monthlyVolume:''});
console.log('API telemetry: status, privacy, legacy keys, revocation, isolation and fail-open checks passed');
