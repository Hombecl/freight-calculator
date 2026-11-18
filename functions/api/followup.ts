import {emailHash,enabled,saveFollowup,TTL,type FollowupEnv} from './_followup';
import {rateLimit} from './_rateLimit';
export const onRequestPost:PagesFunction<FollowupEnv>=async({request,env})=>{
 if(request.headers.get('Origin')!==new URL(request.url).origin)return new Response('Forbidden',{status:403});
 if(!enabled(env))return Response.json({error:'Email follow-up is not available yet.'},{status:503});
 if(Number(request.headers.get('Content-Length')||0)>2048)return new Response('Too large',{status:413});
 let data;try{data=await request.json() as Record<string,unknown>;}catch{return new Response('Bad request',{status:400});}
 if(!data||data.consent!==true||data.version!=='export-followup-v1'||!['pdf','csv'].includes(String(data.format)))return new Response('Explicit consent required',{status:400});
 const email=String(data.email||'').trim().toLowerCase();
 if(email.length>200||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return new Response('Invalid email',{status:400});
 const budget=await rateLimit(env,request,[{name:'followup-day',limit:5,windowSec:86400}]);if(!budget.ok)return new Response('Try later',{status:429});
 const id=await emailHash(email);
 // Do not disclose whether an address exists or has opted out.
 if(!await env.LEADS.get(`followup-stop|${id}`)&&!await env.LEADS.get(`followup|${id}`)){
 const token=crypto.randomUUID()+crypto.randomUUID();const now=Date.now();
 await saveFollowup(env,id,{email,token,consentAt:new Date(now).toISOString(),consentVersion:'export-followup-v1',due:now+5*86400000,state:'pending'});
 await env.LEADS.put(`followup-token|${token}`,id,{expirationTtl:TTL});
 }
 return Response.json({ok:true});
};
