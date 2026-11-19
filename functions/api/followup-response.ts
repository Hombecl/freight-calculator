// Only fixed template copy is translated; no submitted content is rendered.
const translations:Record<string,string>={
  "This link has expired or is unavailable.": "連結已過期或失效。",
  "Follow-up emails are stopped.": "已停止跟進電郵。",
  "Stop follow-up emails?": "停止跟進電郵？",
  "Confirm stop": "確認停止",
  "Thank you. Your response has been saved.": "多謝，已儲存你嘅回覆。",
  "Did you use your plan?": "你有採用呢個方案嗎？",
  "Export follow-up requested on": "你同意接收匯出跟進電郵嘅日期：",
  "What happened?": "方案使用情況",
  "Add context (optional)": "補充資料（自願）",
  "If you changed or did not use it, why?": "如有調整或冇採用，原因係乜嘢？",
  "What were you using it for?": "你用嚟做乜嘢？",
  "Where did you find us?": "你喺邊度搵到我哋？",
  "What should we improve?": "你希望我哋改善啲乜嘢？",
  "Please do not include confidential shipment details.": "請勿提供機密貨運資料。",
  "Your answers are linked to this follow-up request and retained for up to 90 days. No product-update subscription.": "答案會連結到呢次跟進請求，並保留最多90日；唔會訂閱產品更新。",
  "Send feedback": "提交回饋",
  "Choose…": "請選擇…",
  "Used as planned": "直接採用",
  "Used after changes": "調整後採用",
  "Not used yet": "暫時未用",
  "Decided not to use it": "決定唔用",
  "Layout difficult to execute": "擺放方式難以實行",
  "Missing loading constraints": "缺少裝載限制設定",
  "Report missing information": "報告缺少資料",
  "Difficult to use": "操作困難",
  "Shipment changed or cancelled": "貨運安排已改動或取消",
  "Loading a container": "貨櫃裝載",
  "Quoting or comparing options": "報價或比較方案",
  "Warehouse instructions": "倉庫操作指引",
  "Learning or testing": "學習或試用",
  "Search engine": "搜尋引擎",
  "Colleague or customer": "同事或客戶",
  "Social media": "社交媒體",
  "Other": "其他",
  "Invalid form.": "表格資料有誤。",
  "Your response or preference is already saved.": "已儲存你嘅回覆或設定。",
  "Please select a result and go back to submit.": "請返回並選擇使用情況再提交。",
  "Thank you.": "多謝。",
  "Your feedback will help improve DimPack3D. No further email is scheduled for this request.": "你嘅回饋會幫助改善 DimPack3D。呢次請求唔會再安排跟進電郵。"
};
const translate=(text:string)=>Object.entries(translations).sort((a,b)=>b[0].length-a[0].length).reduce((out,[en,zh])=>out.split(en).join(zh),text);
import {saveFollowup,type Followup,type FollowupEnv} from './_followup';
const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"};
const renderPage=(body:string,status=200,locale="en")=>new Response(`<!doctype html><html lang="${locale==='zh'?'zh-Hant':'en'}"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DimPack3D — ${locale==='zh'?'方案回饋':'Plan feedback'}</title><style>body{font:16px system-ui;color:#172554;background:#f8fafc;margin:0;padding:24px}main{max-width:520px;margin:5vh auto;background:white;padding:24px;border-radius:16px}label{display:block;margin:16px 0}select,textarea{display:block;width:100%;box-sizing:border-box;padding:12px;margin-top:6px;border:1px solid #cbd5e1;border-radius:8px}button{background:#4f46e5;color:white;border:0;border-radius:8px;padding:12px 20px;cursor:pointer}p{line-height:1.5}small{color:#475569}</style><main><h1>DimPack3D</h1>${locale==='zh'?translate(body):body}</main></html>`,{status,headers});
const choices=(name:string,label:string,options:string[][],required=false)=>`<label>${label}<select name="${name}" ${required?'required':''}><option value="">Choose…</option>${options.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label>`;
const results=[['matched','Used as planned'],['adjusted','Used after changes'],['not_yet','Not used yet'],['unused','Decided not to use it']];
const reasons=[['placement','Layout difficult to execute'],['constraints','Missing loading constraints'],['report','Report missing information'],['controls','Difficult to use'],['changed_order','Shipment changed or cancelled'],['other','Other']];
const purposes=[['loading','Loading a container'],['quote','Quoting or comparing options'],['crew','Warehouse instructions'],['learning','Learning or testing'],['other','Other']];
const sources=[['search','Search engine'],['colleague','Colleague or customer'],['social','Social media'],['other','Other']];
async function lookup(request:Request,env:FollowupEnv){const token=new URL(request.url).searchParams.get('token')||'';if(!/^[a-f0-9-]{72}$/.test(token))return null;const id=await env.LEADS.get(`followup-token|${token}`);if(!id)return null;const raw=await env.LEADS.get(`followup|${id}`);if(!raw)return null;const record:Followup=JSON.parse(raw);return {id,record};}
export const onRequestGet:PagesFunction<FollowupEnv>=async({request,env})=>{
 const found=await lookup(request,env);const page=(body:string,status=200)=>renderPage(body,status,found?.record.locale);if(!found)return page('<p>This link has expired or is unavailable.</p>',404);
 const stop=new URL(request.url).searchParams.get('action')==='stop';
 if(found.record.state==='stopped')return page('<p>Follow-up emails are stopped.</p>');
 if(stop)return page('<h2>Stop follow-up emails?</h2><form method="post"><input type="hidden" name="action" value="stop"><button>Confirm stop</button></form>');
 if(found.record.state==='answered')return page('<p>Thank you. Your response has been saved.</p>');
 return page(`<h2>Did you use your plan?</h2><p>Export follow-up requested on ${found.record.consentAt.slice(0,10)}.</p><form method="post">${choices('result','What happened?',results,true)}<details><summary>Add context (optional)</summary>${choices('reason','If you changed or did not use it, why?',reasons)}${choices('purpose','What were you using it for?',purposes)}${choices('source','Where did you find us?',sources)}<label>What should we improve?<textarea name="comment" maxlength="1500" rows="3"></textarea></label><small>Please do not include confidential shipment details.</small></details><p><small>Your answers are linked to this follow-up request and retained for up to 90 days. No product-update subscription.</small></p><button>Send feedback</button></form>`);
};
export const onRequestPost:PagesFunction<FollowupEnv>=async({request,env})=>{
 if(request.headers.get('Origin')!==new URL(request.url).origin)return renderPage('<p>Invalid request.</p>',403);
 if(Number(request.headers.get('Content-Length')||0)>8192)return renderPage('<p>Response too long.</p>',413);
 const found=await lookup(request,env);const page=(body:string,status=200)=>renderPage(body,status,found?.record.locale);if(!found)return page('<p>This link has expired.</p>',404);
 let data:FormData;try{data=await request.formData();}catch{return page('<p>Invalid form.</p>',400);}
 if(data.get('action')==='stop'){
 await env.LEADS.put(`followup-stop|${found.id}`,'true');
 await saveFollowup(env,found.id,{...found.record,state:'stopped'});
 return page('<p>Follow-up emails are stopped.</p>');
 }
 if(['answered','stopped'].includes(found.record.state))return page('<p>Your response or preference is already saved.</p>');
 const result=String(data.get('result')||'');if(!results.some(([v])=>v===result))return page('<p>Please select a result and go back to submit.</p>',400);
 const category=(name:string,allowed:string[][])=>{const v=String(data.get(name)||'');return allowed.some(([key])=>key===v)?v:'';};
 await saveFollowup(env,found.id,{...found.record,state:'answered',result,reason:category('reason',reasons),comment:String(data.get('comment')||'').slice(0,1500),purpose:category('purpose',purposes),source:category('source',sources)} as Followup);
 return page('<h2>Thank you.</h2><p>Your feedback will help improve DimPack3D. No further email is scheduled for this request.</p>');
};
