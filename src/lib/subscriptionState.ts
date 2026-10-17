export interface Subscription {
 status:string;plan:string|null;current_period_end:string|null;
}
/** Cancellation preserves the already-paid period; unknown states never grant access. */
export function isActive(sub:Subscription|null,now=Date.now()):boolean{
 if(!sub)return false;
 if(['active','on_trial','past_due'].includes(sub.status))return true;
 return sub.status==='cancelled'&&!!sub.current_period_end&&Date.parse(sub.current_period_end)>now;
}
