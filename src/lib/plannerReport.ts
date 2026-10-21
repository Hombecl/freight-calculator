import type { PackItemSpec, PackContainer } from './binPacking';
import type { PlannerBox } from './plannerBox';
import type { PlanMeta } from './exportPlan';
import { loadingSequence } from './realism';
import { reviewPlanner, reviewText, remainderText } from './plannerReview';
export type PlannerReportView='summary'|'crew'|'manifest';
export interface PlannerReportInput {
 meta:PlanMeta; boxes:PlannerBox[]; requestedSpecs:PackItemSpec[];
 reviewContainer?:PackContainer; door?:{w:number;h:number}|null;
 reportView?:PlannerReportView; reportReference?:string; revision?:string; zh?:boolean;
 imageDataUrl?:string|null;
}
const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const csv=(v:unknown)=>{let s=String(v??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
export function plannerManifestCSV(o:PlannerReportInput):string {
 const review=reviewPlanner(o.boxes,o.reviewContainer??o.meta.container,o.requestedSpecs,o.door);
 const status=review.complete?'screened_complete':'draft_review';
 const prefix=[o.reportReference??'',o.revision??'',status];
 const rows:unknown[][]=[['Record','Job','Revision','Status','SKU','Label','Requested','Placed','Remaining','LoadOrder','L(cm)','W(cm)','H(cm)','Weight(kg)','X(cm)','Y(cm)','Z(cm)','Note']];
 for(const r of review.cargo)rows.push(['cargo',...prefix,r.id,r.label,r.requested,r.placed,r.remaining,'','','','','','','','',remainderText(r.reason,!!o.zh)]);
 for(const [i,b] of loadingSequence(o.boxes).entries())rows.push(['placement',...prefix,b.specId??'',b.label,'','','',i+1,b.l,b.w,b.h,b.weight,b.px,b.py,b.pz,'']);
 for(const issue of review.issues)rows.push(['issue',...prefix,'','','','','','','','','','','','','',`${reviewText(issue.code,!!o.zh)} ${issue.ids.join(', ')}`]);
 rows.push(['assumption',...prefix,'','','','','','','','','','','','','',o.zh?'幾何及輸入限制篩查；不代表已驗證裝卸路徑、綁紮或運輸安全。':'Geometry and entered-rule screening; loading access, securing and transport safety are not certified.']);
 return rows.map(r=>r.map(csv).join(',')).join('\r\n');
}
export function buildPlannerReport(o:PlannerReportInput):string {
 const zh=!!o.zh,T=(a:string,b:string)=>zh?b:a;
 const c=o.reviewContainer??o.meta.container,view=o.reportView??'crew';
 const review=reviewPlanner(o.boxes,c,o.requestedSpecs,o.door),seq=loadingSequence(o.boxes);
 const issueHtml=review.issues.map(i=>`<li>${esc(reviewText(i.code,zh))} ${esc(i.ids.join(', '))}</li>`).join('');
 const ledger=`<h2>${T('Cargo reconciliation','貨物對數')}</h2><table><thead><tr>${[T('SKU / row ID','SKU／行編號'),T('Cargo','貨物'),T('Requested','要求'),T('Placed','已裝'),T('Remaining','餘貨'),T('Note','備註')].map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${review.cargo.map(r=>`<tr><td>${esc(r.id)}</td><td>${esc(r.label)}</td><td>${esc(r.requested)}</td><td>${r.placed}</td><td>${r.remaining}</td><td>${esc(remainderText(r.reason,zh))}</td></tr>`).join('')}</tbody></table>`;
 const rows=`<h2>${T('Loading sequence and positions','裝載次序及位置')}</h2><p>${T('Load supporting cartons first. Coordinates are cm: X from the back, Y above the floor, Z across the width. Door is at +X. Review access and securing with your loading team.','先放承托箱。座標單位 cm：X 由櫃尾起、Y 離地高度、Z 橫向；門口在 +X。請與裝載人員核對通道及固定方法。')}</p><table><thead><tr>${[T('Load #','裝載 #'),'SKU',T('Cargo','貨物'),T('Unload','卸貨'),T('L×W×H (cm)','長×闊×高 (cm)'),'kg','X / Y / Z'].map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${seq.map((b,i)=>`<tr><td>${i+1}</td><td>${esc(b.specId??'')}</td><td>${esc(b.label)}</td><td>${esc(b.unloadOrder??'')}</td><td>${esc(b.l)}×${esc(b.w)}×${esc(b.h)}</td><td>${esc(b.weight??'')}</td><td>${esc(b.px)} / ${esc(b.py)} / ${esc(b.pz)}</td></tr>`).join('')}</tbody></table>`;
 // Bounded top views: sequence numbers remain readable in the accompanying table.
 const batch=Math.max(10,Math.ceil(seq.length/20));
 const stages=view==='crew'?Array.from({length:Math.ceil(seq.length/batch)},(_,i)=>{
  const start=i*batch,end=Math.min(seq.length,start+batch),scale=700/c.l,height=Math.max(70,c.w*scale);
  const marks=seq.slice(0,end).filter(b=>[b.px,b.pz,b.l,b.w].every(Number.isFinite)).map(b=>{
   const n=seq.indexOf(b),active=n>=start;
   return `<g><rect x="${b.px*scale}" y="${b.pz*scale}" width="${b.l*scale}" height="${b.w*scale}" fill="${active?'#d0f1ed':'#eef0f2'}" stroke="${active?'#154e47':'#aeb8bf'}" stroke-width="1"/>${active?`<text x="${(b.px+b.l/2)*scale}" y="${(b.pz+b.w/2)*scale}" text-anchor="middle" font-size="10">${n+1}</text>`:''}</g>`;
  }).join('');
  return `<section class="stage"><h3>${T('Stage','階段')} ${i+1}: ${T('load','裝載')} ${start+1}–${end}</h3><svg role="img" aria-label="${T('Top view, door on right','俯視圖，門口在右')}" viewBox="-3 -3 750 ${height+30}" xmlns="http://www.w3.org/2000/svg"><rect width="700" height="${c.w*scale}" fill="white" stroke="#172d3b"/>${marks}<text x="708" y="20" font-size="11">${T('DOOR','門口')} →</text></svg><p>${T('Top view; stacked boxes may overlap in this view. Follow the numbered table for height and order.','俯視圖；疊箱可能遮住下層。高度及次序請對照編號表。')}</p></section>`;
 }).join(''):'';
 const status=review.complete?T('Complete · passed the listed screening checks','完整 · 通過列出的篩查'):T('DRAFT · remaining cargo or issues need review','草稿 · 有餘貨或問題待核對');
 const kg=o.boxes.reduce((n,b)=>n+(b.weight??0),0);
 return `<!doctype html><html lang="${zh?'zh-Hant':'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(o.meta.title)}</title><style>body{font:14px/1.5 system-ui,sans-serif;color:#172d3b;margin:24px;max-width:1100px}h1{font-size:24px}h2{font-size:19px;margin-top:26px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:7px;border:1px solid #b7c4cc;text-align:left;overflow-wrap:anywhere}thead{display:table-header-group}tr{break-inside:avoid}.status{border:2px solid #526876;padding:12px;font-weight:bold}.stage{break-inside:avoid;margin-top:22px}svg{width:100%;max-height:340px}img{max-width:100%}small{color:#415867}@media print{button{display:none}body{margin:0} @page{margin:12mm}table{font-size:10px}}</style></head><body><button onclick="window.print()">${T('Print / Save PDF','列印／儲存 PDF')}</button><h1>${esc(o.meta.title)}</h1><p>${esc(o.reportReference??'')} · ${T('Revision','版本')} ${esc(o.revision??'—')} · ${esc(o.meta.date)}</p><p>${esc(o.meta.containerLabel)} · ${c.l} × ${c.w} × ${c.h} cm · ${Number.isFinite(kg)?kg.toFixed(2):'—'} kg</p><p class="status">${status}</p><p>${T('Screened: identity/counts, bounds, overlap, 60% base support, entered stacking/orientation/weight limits and straight door-access order. This model does not certify real loading paths, cargo securing or transport safety.','篩查項目：編號／數量、界線、重疊、60% 箱底承托、輸入的堆疊／方向／重量限制及直線卸貨次序。此模型不認證實際裝卸路徑、貨物固定或運輸安全。')}</p>${issueHtml?`<ul>${issueHtml}</ul>`:''}${o.imageDataUrl?.startsWith('data:image/png;base64,')?`<img alt="${T('3D load plan','3D 裝載圖')}" src="${esc(o.imageDataUrl)}">`:''}${ledger}${view==='summary'?'':rows}${stages}<p><small>DimPack3D · dimpack3d.com · ${T('Changes require a new revision.','修改後需使用新版本。')}</small></p></body></html>`;
}
