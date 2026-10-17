import {parseCrewFeedback} from '../../src/lib/crewFeedback';
import {shareDigest} from './share';
interface Env {LEADS:KVNamespace}
const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
const fail=(message:string,status:number)=>new Response(message,{status,headers});
async function context(ctx:EventContext<Env,string,unknown>,owner:boolean){
 const id=new URL(ctx.request.url).searchParams.get('id')??'';
 if(!/^[a-f0-9]{32}$/.test(id))return fail('Bad ID',400);
 const token=ctx.request.headers.get('Authorization')?.replace(/^Bearer /,'')??'';
 if(!token||token.length>100)return fail('Forbidden',403);
 const expected=await ctx.env.LEADS.get(`${owner?'share_owner_':'share_crew_'}${id}`);
 if(!expected||await shareDigest(token)!==expected)return fail('Forbidden',403);
 const raw=await ctx.env.LEADS.get(`share_${id}`);
 if(!raw)return fail('Share expired or revoked',404);
 const share=JSON.parse(raw);
 if(share.type!=='build-sheet'||!share.feedbackEnabled||Date.parse(share.expiresAt)<=Date.now())return fail('Share expired or unavailable',404);
 return {id,share};
}
export const onRequestPost:PagesFunction<Env>=async ctx=>{
 const auth=await context(ctx,false);if(auth instanceof Response)return auth;
 const raw=await ctx.request.text();if(new TextEncoder().encode(raw).length>12000)return fail('Too large',413);
 let report;try{report=parseCrewFeedback(JSON.parse(raw),auth.share.quote.inputHash,auth.share.quote.pallets.length);}catch{return fail('Invalid measurements or revision',400);}
 const key=`crew_report_${auth.id}_${report.reportId}`;
 const existing=await ctx.env.LEADS.get(key);
 if(existing){const saved=JSON.parse(existing);delete saved.receivedAt;if(JSON.stringify(saved)!==JSON.stringify(report))return fail('Report ID already used',409);return new Response(JSON.stringify({accepted:true,reportId:report.reportId}),{headers});}
 const list=await ctx.env.LEADS.list({prefix:`crew_report_${auth.id}_`,limit:21});
 if(list.keys.length>=20)return fail('Report limit reached. Ask the planner for a new link.',429);
 const ttl=Math.floor((Date.parse(auth.share.expiresAt)-Date.now())/1000);
 if(ttl<60)return fail('Share expires soon. Ask for a new link.',410);
 await ctx.env.LEADS.put(key,JSON.stringify({...report,receivedAt:new Date().toISOString()}),{expirationTtl:ttl});
 return new Response(JSON.stringify({accepted:true,reportId:report.reportId}),{headers});
};
export const onRequestGet:PagesFunction<Env>=async ctx=>{
 const auth=await context(ctx,true);if(auth instanceof Response)return auth;
 const list=await ctx.env.LEADS.list({prefix:`crew_report_${auth.id}_`,limit:100});
 const reports=(await Promise.all(list.keys.map(async k=>{const raw=await ctx.env.LEADS.get(k.name);return raw?JSON.parse(raw):null;}))).filter(Boolean);
 return new Response(JSON.stringify({revision:auth.share.quote.inputHash,reports}),{headers});
};
