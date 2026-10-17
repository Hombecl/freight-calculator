/** Capability links: immutable snapshots, explicit expiry, revocation by creator token. */
import { parseSheetQuote } from '../../src/lib/receiverStorage';
interface Env { LEADS: KVNamespace }
const ID_RE=/^(?:[a-z0-9]{10}|[a-f0-9]{32})$/;
const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
export const shareDigest=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,'0')).join('');
export const onRequestPost:PagesFunction<Env>=async ctx=>{
 const raw=await ctx.request.text();
 if(new TextEncoder().encode(raw).length>200000)return new Response('too large',{status:413});
 let plan:any;try{plan=JSON.parse(raw);}catch{return new Response('bad json',{status:400});}
 const days=plan?.shareDays??7;
 if(![1,7,30].includes(days))return new Response('bad expiry',{status:400});
 let payload:any;
 if(plan?.type==='build-sheet'){
  try{const q:any=parseSheetQuote(plan.quote);const {actuals,manualChecklist,variance,request,...clean}=q;
   payload={type:'build-sheet',feedbackEnabled:plan.allowFeedback===true,quote:{...clean,pallets:clean.pallets.map(({variance,...p}:any)=>p),...(request?{request:{...request,actuals:undefined}}:{})}};
  }catch{return new Response('bad build sheet',{status:400});}
 }else if(plan?.container&&Array.isArray(plan.specs)){
  payload={containerKey:plan.containerKey,container:plan.container,specs:plan.specs,boxes:plan.boxes};
 }else if(plan?.type==='warehouse'&&plan.floor&&Array.isArray(plan.items)){
  payload={...plan};delete payload.shareDays;
 }else return new Response('bad plan',{status:400});
 const id=crypto.randomUUID().replace(/-/g,''),revokeToken=crypto.randomUUID();
 const crewToken=payload.feedbackEnabled?crypto.randomUUID():undefined;
 const expiresAt=new Date(Date.now()+days*86400000).toISOString();
 await ctx.env.LEADS.put(`share_${id}`,JSON.stringify({...payload,sharedAt:new Date().toISOString(),expiresAt}),{expirationTtl:days*86400});
 await ctx.env.LEADS.put(`share_owner_${id}`,await shareDigest(revokeToken),{expirationTtl:days*86400});
 if(crewToken)await ctx.env.LEADS.put(`share_crew_${id}`,await shareDigest(crewToken),{expirationTtl:days*86400});
 return new Response(JSON.stringify({id,revokeToken,expiresAt,...(crewToken?{crewToken}:{})}),{headers});
};
export const onRequestGet:PagesFunction<Env>=async ctx=>{
 const id=new URL(ctx.request.url).searchParams.get('id')??'';
 if(!ID_RE.test(id))return new Response('bad id',{status:400});
 const raw=await ctx.env.LEADS.get(`share_${id}`);
 if(!raw)return new Response('not found or expired',{status:404,headers});
 const p=JSON.parse(raw);if(p.expiresAt&&Date.parse(p.expiresAt)<=Date.now())return new Response('expired',{status:404,headers});
 return new Response(raw,{headers});
};
export const onRequestDelete:PagesFunction<Env>=async ctx=>{
 const id=new URL(ctx.request.url).searchParams.get('id')??'',token=ctx.request.headers.get('Authorization')?.replace(/^Bearer /,'')??'';
 if(!ID_RE.test(id)||token.length>100)return new Response('bad request',{status:400});
 const owner=await ctx.env.LEADS.get(`share_owner_${id}`);
 if(!owner||await shareDigest(token)!==owner)return new Response('forbidden',{status:403});
 await ctx.env.LEADS.delete(`share_crew_${id}`);
 await ctx.env.LEADS.delete(`share_${id}`);await ctx.env.LEADS.delete(`share_owner_${id}`);
 return new Response(null,{status:204,headers});
};
