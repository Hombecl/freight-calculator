import type {PlannerReview} from '../lib/plannerReview';
import {reviewText,remainderText} from '../lib/plannerReview';
export default function PlannerReviewPanel({review,zh}:{review:PlannerReview;zh:boolean}){
 const T=(a:string,b:string)=>zh?b:a;
 return <section aria-label={T('Plan review','方案核對')} className="rounded-xl border border-slate-300 bg-white p-3 space-y-2 text-sm">
 <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">{T('Review before handoff','交付前核對')}</h2><p data-testid="planner-review-status" className={review.complete?'text-emerald-800':'text-amber-800'}>{review.complete?T('Complete · passed the listed screening checks','完整 · 通過列出的篩查'):T('Draft · review remaining cargo and issues','草稿 · 請核對餘貨及問題')}</p></div>

 {review.issues.length>0&&<ul className="space-y-2 max-h-60 overflow-auto">{review.issues.map((i,n)=><li key={n} className="text-amber-900 break-words">{reviewText(i.code,zh)} {i.ids.join(', ')}</li>)}</ul>}
 <details><summary className="cursor-pointer font-semibold">{T('Cargo reconciliation','貨物對數')} · {T('check details','檢查詳情')}</summary> <p className="text-xs text-slate-600">{T('Checks use your entered rules and a 60% base-support model. Loading paths, securing and transport safety still need operational review. Draft exports include these issues.','按輸入限制及 60% 箱底承托模型篩查；裝卸路徑、貨物固定及運輸安全仍需現場覆核。草稿匯出會附上問題。')}</p><div className="overflow-x-auto"><table className="w-full text-xs"><caption className="text-left font-semibold">{T('Cargo reconciliation','貨物對數')}</caption><thead><tr>{[T('Cargo / ID','貨物／編號'),T('Requested','要求'),T('Placed','已裝'),T('Remaining','餘貨')].map(x=><th key={x} className="p-1 text-left">{x}</th>)}</tr></thead><tbody>{review.cargo.map(r=><tr key={r.id} className="border-t"><td className="p-1">{r.label}<br/><span className="text-slate-500">{r.id}</span>{r.reason&&<p className="text-amber-800">{remainderText(r.reason,zh)}</p>}</td><td>{r.requested}</td><td>{r.placed}</td><td>{r.remaining}</td></tr>)}</tbody></table></div></details>
 </section>;
}
