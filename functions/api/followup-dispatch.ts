import {sendDue,type FollowupEnv} from './_followup';
interface DispatchEnv extends FollowupEnv {FOLLOWUP_CRON_TOKEN?:string;LEAD_NOTIFY_FROM?:string;LEAD_NOTIFY_TO?:string}
/** Scheduler-only capability. Never accepts a recipient or email content. */
export const onRequestPost:PagesFunction<DispatchEnv>=async({request,env})=>{
 const supplied=request.headers.get('Authorization')||'';
 if(!env.FOLLOWUP_CRON_TOKEN||supplied!==`Bearer ${env.FOLLOWUP_CRON_TOKEN}`)return new Response('Forbidden',{status:403});
 const configured={...env,FOLLOWUP_FROM:env.FOLLOWUP_FROM||env.LEAD_NOTIFY_FROM};
 if(!configured.FOLLOWUP_FROM||!env.RESEND_API_KEY)return Response.json({error:'sender not configured'},{status:503});
 if(new URL(request.url).searchParams.get('mode')==='verify'){
  if(!env.LEAD_NOTIFY_TO)return Response.json({error:'internal recipient not configured'},{status:503});
  const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(8000),headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':'dimpack-followup-release-check-20261118'},body:JSON.stringify({from:configured.FOLLOWUP_FROM,to:[env.LEAD_NOTIFY_TO],subject:'DimPack3D follow-up deployment check',text:'Internal deployment verification only. The opt-in follow-up sender is configured. Existing leads are not enrolled. No customer message was sent.'})});
  if(!response.ok)return Response.json({accepted:false,providerStatus:response.status},{status:502});
  const result=await response.json() as {id?:string};return Response.json({accepted:!!result.id},{status:result.id?200:502});
 }
 if(env.FOLLOWUP_ENABLED!=='true')return Response.json({enabled:false},{status:503});
 await sendDue(configured);
 return Response.json({ok:true});
};
