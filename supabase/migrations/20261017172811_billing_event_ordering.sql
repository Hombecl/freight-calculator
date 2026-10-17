-- Only the signed webhook service can call this. Never grant to authenticated.
create function public.dp_apply_subscription_event(event jsonb) returns boolean language plpgsql security invoker set search_path='' as $$
declare affected integer;
begin
 insert into public.dp_subscriptions(user_id,email,status,plan,ls_subscription_id,ls_customer_id,current_period_end,updated_at)
 values((event->>'user_id')::uuid,event->>'email',event->>'status',event->>'plan',event->>'ls_subscription_id',event->>'ls_customer_id',(event->>'current_period_end')::timestamptz,(event->>'updated_at')::timestamptz)
 on conflict(user_id) do update set email=excluded.email,status=excluded.status,plan=excluded.plan,
 ls_subscription_id=excluded.ls_subscription_id,ls_customer_id=excluded.ls_customer_id,current_period_end=excluded.current_period_end,updated_at=excluded.updated_at
 where public.dp_subscriptions.updated_at<excluded.updated_at;
 get diagnostics affected=row_count;
 return affected>0;
end $$;
revoke all on function public.dp_apply_subscription_event(jsonb) from public,anon,authenticated;
grant execute on function public.dp_apply_subscription_event(jsonb) to service_role;
