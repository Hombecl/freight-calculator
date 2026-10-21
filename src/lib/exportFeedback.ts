export const OUTCOMES = ['usable', 'edit', 'explore'] as const;
export const PURPOSES = ['unknown', 'load', 'pallet', 'quote', 'crew', 'other'] as const;
export const BLOCKERS = ['layout', 'fields', 'math', 'placement', 'download', 'other'] as const;
export function feedbackMeta(tool: string, format: string, outcome: string, purpose: string, blocker: string) {
  if (!['planner', 'warehouse'].includes(tool) || !['pdf', 'csv'].includes(format)
    || !(OUTCOMES as readonly string[]).includes(outcome) || !(PURPOSES as readonly string[]).includes(purpose)
    || (outcome === 'edit' && !(BLOCKERS as readonly string[]).includes(blocker))) return null;
  // Fixed categories only; stays within the first-party collector's 40-character limit.
  return [tool === 'planner' ? 'p' : 'w', format, outcome, purpose, outcome === 'edit' ? blocker : 'none'].join(':');
}

export const RECIPIENTS=[['self','My own decision','自己比較方案'],['customer','Customer','客戶'],['crew','Warehouse crew','倉庫'],['forwarder','Freight forwarder','貨代'],['learning','Learning / demonstration','學習／示範'],['other','Other','其他']] as const;
export const CHOICE_REASONS=[['quick','Quick calculation','快速試算'],['cost','Free / cost','免費／成本'],['visual','Clear 3D view','3D 易理解'],['files','Import / export format','匯入／匯出格式'],['gap','Another tool lacks a feature','其他工具欠功能'],['compare','Comparing several tools','同時比較工具'],['other','Other','其他']] as const;
export function feedbackAnswerMeta(tool:string,format:string,kind:'usefulness'|'recipient'|'choice',value:string){
 const allowed:readonly string[]=kind==='usefulness'?OUTCOMES:kind==='recipient'?RECIPIENTS.map(x=>x[0]):CHOICE_REASONS.map(x=>x[0]);
 return ['planner','warehouse'].includes(tool)&&['pdf','csv'].includes(format)&&allowed.includes(value)?`${tool==='planner'?'p':'w'}:${format}:${value}`:null;
}
