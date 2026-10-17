begin;
do $$declare uid uuid; old_time timestamptz; row jsonb;begin
 select user_id into uid from public.dp_plans limit 1;
 select updated_at into old_time from public.dp_subscriptions where user_id=uid;
 row:=jsonb_build_object('user_id',uid,'status','active','ls_subscription_id','999999999','updated_at',coalesce(old_time,now())+interval '1 minute');
 if not public.dp_apply_subscription_event(row) then raise exception 'New event not applied';end if;
 if public.dp_apply_subscription_event(row) then raise exception 'Duplicate event applied';end if;
 if public.dp_apply_subscription_event(row||jsonb_build_object('status','expired','updated_at',coalesce(old_time,now()))) then raise exception 'Old event applied';end if;
 if (select status from public.dp_subscriptions where user_id=uid)<>'active' then raise exception 'Out-of-order event changed state';end if;
 if has_function_privilege('authenticated','public.dp_apply_subscription_event(jsonb)','execute') or has_function_privilege('anon','public.dp_apply_subscription_event(jsonb)','execute') then raise exception 'Public billing write exposed';end if;
end $$;
rollback;
select 'PASS: billing idempotency, timestamp ordering, public write denial; all changes rolled back' as result;
