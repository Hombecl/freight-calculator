import assert from 'node:assert/strict';
import {onRequestPost as optin} from '../functions/api/followup.ts';
import {onRequestGet as get,onRequestPost as post} from '../functions/api/followup-response.ts';
import {sendDue,emailHash} from '../functions/api/_followup.ts';
const rows=new Map();const env={FOLLOWUP_ENABLED:'true',FOLLOWUP_FROM:'research@example.test',RESEND_API_KEY:'test',LEADS:{async get(k){return rows.get(k)||null},async put(k,v){rows.set(k,v)},async list({prefix}){return {keys:[...rows.keys()].filter(k=>k.startsWith(prefix)).map(name=>({name})),list_complete:true}}}};
const origin='https://www.dimpack3d.com';
const enroll=(data)=>optin({env,request:new Request(origin+'/api/followup',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(data)})});
const data={email:'TEST@example.test',consent:true,version:'export-followup-v1',format:'pdf'};
assert.equal((await enroll({...data,consent:false})).status,400);assert.equal(rows.size,0);
assert.equal((await enroll(data)).status,200);
const id=await emailHash(data.email),key='followup|'+id;const first=JSON.parse(rows.get(key));
assert.ok(first.due-Date.now()>4.9*86400000);
await enroll({...data,email:'test@example.test'});assert.equal(JSON.parse(rows.get(key)).token,first.token);
let calls=0;const original=globalThis.fetch;
try{
 globalThis.fetch=async()=>{calls++;return Response.json({id:'mock-provider-id'})};
 await sendDue(env);assert.equal(calls,0);
 const url=origin+'/api/followup-response?token='+first.token;
 const before=rows.get(key);assert.equal((await get({env,request:new Request(url)})).status,200);assert.equal(rows.get(key),before);
 await sendDue(env,first.due+1);assert.equal(calls,1);assert.equal(JSON.parse(rows.get(key)).state,'sent');
 await sendDue(env,first.due+2);assert.equal(calls,1);
 const response=(body)=>post({env,request:new Request(url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body)})});
 assert.equal((await response({result:'adjusted',reason:'constraints',comment:'Needs support checks'})).status,200);
 assert.equal(JSON.parse(rows.get(key)).reason,'constraints');
 await response({result:'unused'});assert.equal(JSON.parse(rows.get(key)).result,'adjusted');
 const stopGet=await get({env,request:new Request(url+'&action=stop')});assert.equal(stopGet.status,200);assert.equal(await env.LEADS.get('followup-stop|'+id),null);
 await response({action:'stop'});assert.equal(await env.LEADS.get('followup-stop|'+id),'true');
 assert.equal((await post({env,request:new Request(url,{method:'POST',headers:{Origin:'https://other.test'},body:'action=stop'})})).status,403);
 // An ambiguous failed send is never automatically retried.
 rows.set(key,JSON.stringify({...first,state:'pending'}));rows.delete('followup-stop|'+id);
 globalThis.fetch=async()=>{calls++;throw Error('timeout')};
 await sendDue(env,first.due+1);assert.equal(JSON.parse(rows.get(key)).state,'attempted');
 await sendDue(env,first.due+10*86400000);assert.equal(calls,2);
 env.FOLLOWUP_ENABLED='false';assert.equal((await enroll(data)).status,503);
}finally{globalThis.fetch=original;}
console.log('Follow-up consent, dedup, delay, scanner-safe GET, explicit response, stop and ambiguous delivery checks passed');
// Concurrent enrollment may create two valid bearer aliases. The email that
// wins provider idempotency must still resolve even if the latest record differs.
const alias=crypto.randomUUID()+crypto.randomUUID();rows.set('followup-token|'+alias,id);
assert.equal((await get({env,request:new Request(origin+'/api/followup-response?token='+alias)})).status,200);
const {onRequestPost:dispatchPost}=await import('../functions/api/followup-dispatch.ts');
const {dispatch}=await import('../workers/followup/index.ts');
assert.equal((await dispatchPost({env,request:new Request(origin+'/api/followup-dispatch',{method:'POST'})})).status,403);
let dispatched=0;
try{
 globalThis.fetch=async(url,init)=>{dispatched++;assert.equal(url,origin+'/api/followup-dispatch');assert.equal(init.headers.Authorization,'Bearer fixture-token');assert.equal(init.headers['User-Agent'],'DimPack3D-Followup/1.0');return Response.json({ok:true});};
 await dispatch({FOLLOWUP_ENABLED:'false',FOLLOWUP_CRON_TOKEN:'fixture-token'});assert.equal(dispatched,0);
 await dispatch({FOLLOWUP_ENABLED:'true',FOLLOWUP_CRON_TOKEN:'fixture-token'});assert.equal(dispatched,1);
}finally{globalThis.fetch=original;}
