const EVENTS=new Set(['subscription_created','subscription_updated','subscription_cancelled','subscription_resumed','subscription_expired','subscription_paused','subscription_unpaused']);
/** Only subscription objects can replace subscription state. Invoice/order events are not subscriptions. */
export function subscriptionEvent(payload:any,store:string,variant:string){
 const a=payload?.data?.attributes;
 if(!EVENTS.has(payload?.meta?.event_name)||payload?.data?.type!=='subscriptions')return null;
 if(!a||a.test_mode!==false||String(a.store_id)!==store||String(a.variant_id)!==variant)return null;
 const user=payload.meta.custom_data?.user_id;
 if(typeof user!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user))throw Error('Invalid account');
 if(!['active','on_trial','past_due','paused','unpaid','cancelled','expired'].includes(a.status)||!Number.isFinite(Date.parse(a.updated_at))||!/^\d+$/.test(String(payload.data.id)))throw Error('Invalid subscription');
 const end=a.ends_at??a.trial_ends_at??a.renews_at??null;
 if(end!==null&&!Number.isFinite(Date.parse(end)))throw Error('Invalid period end');
 return {user_id:user,email:a.user_email??null,status:a.status,plan:a.product_name??a.variant_name??null,ls_subscription_id:String(payload.data.id),ls_customer_id:String(a.customer_id??''),current_period_end:end,updated_at:a.updated_at};
}
