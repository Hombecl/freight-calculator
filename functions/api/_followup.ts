export interface FollowupEnv { LEADS: KVNamespace; RESEND_API_KEY?: string; FOLLOWUP_FROM?: string; FOLLOWUP_ENABLED?: string; LEAD_NOTIFY_FROM?:string }
export interface Followup { email: string; token: string; consentAt: string; consentVersion: 'export-followup-v1'|'export-followup-v2'; locale?: 'en'|'zh'; due: number; state: 'pending'|'attempted'|'sent'|'answered'|'stopped'; result?: string; reason?: string; comment?: string; purpose?:string; source?:string }
export const TTL=90*86400;
export const enabled=(env:FollowupEnv)=>env.FOLLOWUP_ENABLED==='true'&&!!env.RESEND_API_KEY&&!!(env.FOLLOWUP_FROM||env.LEAD_NOTIFY_FROM);
export async function emailHash(email:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(email.trim().toLowerCase()))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function saveFollowup(env:FollowupEnv,id:string,r:Followup){await env.LEADS.put(`followup|${id}`,JSON.stringify(r),{expirationTtl:TTL});}
export async function sendDue(env:FollowupEnv,now=Date.now()) {
 if(!enabled(env))return;
 let cursor:string|undefined;
 let sent=0;
 do {
 const page=await env.LEADS.list({prefix:'followup|',limit:100,cursor});
 for(const key of page.keys){
  const raw=await env.LEADS.get(key.name);if(!raw)continue;
  const r:Followup=JSON.parse(raw),id=key.name.slice(9);
  if(r.state!=='pending'||r.due>now||await env.LEADS.get(`followup-stop|${id}`))continue;
  // At-most-one automatic attempt. Ambiguous provider/network failures require
  // operator reconciliation, never a blind retry after provider dedup expires.
  await saveFollowup(env,id,{...r,state:'attempted'});
  const link=`https://www.dimpack3d.com/api/followup-response?token=${r.token}`;
  try {
   const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(8000),headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`dimpack-followup/${id}`},body:JSON.stringify({from:env.FOLLOWUP_FROM,to:[r.email],reply_to:'hello@dimpack3d.com',subject:r.locale==='zh'?'你有採用 DimPack3D 嘅裝載方案嗎？':'Did your DimPack3D plan work for your shipment?',text:(r.locale==='zh'?[
    '你好，','你之前匯出咗方案，並同意收到一封跟進電郵。你有採用呢個方案嗎？',
    '直接採用 / 調整後採用 / 暫時未用 / 決定唔用',
    `分享你嘅答案：${link}`,
    '你亦可以直接回覆呢封電郵。請勿提供機密貨運資料。',
    `停止跟進電郵：${link}&action=stop`,'DimPack3D 團隊',
   ]:[
    'Hi,','You recently exported a plan and asked for one follow-up. Did you use it?',
    'Used as planned / Used after changes / Not used yet / Decided not to use it',
    `Share your answer: ${link}`,
    'You can also reply to this email. Please do not include confidential shipment details.',
    `Stop follow-up emails: ${link}&action=stop`,
    'DimPack3D team',
   ]).join('\n\n')})});
   if(response.ok){const body=await response.json() as {id?:string};if(body.id){const latest=await env.LEADS.get(key.name);if(latest){const current:Followup=JSON.parse(latest);if(current.state==='attempted')await saveFollowup(env,id,{...current,state:'sent'});}}}
  }catch{ /* attempted stays visible for manual provider reconciliation */ }
  if(++sent>=20)return;
 }
 cursor=page.list_complete?undefined:page.cursor;
 }while(cursor);
}
