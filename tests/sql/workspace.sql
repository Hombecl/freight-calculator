begin;
-- Reuse two existing DimPack accounts solely inside this rolled-back transaction.
select set_config('dp.test_owner',(select user_id::text from public.dp_plans group by user_id order by user_id limit 1),true);
select set_config('dp.test_member',(select user_id::text from public.dp_plans group by user_id order by user_id offset 1 limit 1),true);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('dp.test_owner'),true);
select set_config('dp.test_workspace',(inserted.id)::text,true) from (select null::uuid id) inserted where false;
do $$declare w uuid;r uuid;begin
 insert into public.dp_workspaces(name) values('ROLLBACK workspace regression') returning id into w;
 perform set_config('dp.test_workspace',w::text,true);
 r:=public.dp_save_workspace_revision(w,'order','Test job','{"request":{}}',true,null,0);
 perform set_config('dp.test_record',r::text,true);
 perform public.dp_save_workspace_revision(w,'order','Test job','{"request":{}}',true,r,1);
 begin perform public.dp_save_workspace_revision(w,'order','Test job','{}',true,r,1);raise exception 'TEST: stale revision accepted';
 exception when raise_exception then if sqlerrm like 'TEST:%' then raise; end if; end;
 begin update public.dp_workspace_revisions set payload='{}' where record_id=r;raise exception 'TEST: immutable revision changed';
 exception when insufficient_privilege then null;end;
 insert into public.dp_workspace_invites(workspace_id,token_hash,role) values(w,encode(extensions.digest(repeat('a',64),'sha256'),'hex'),'editor');
end $$;
select set_config('request.jwt.claim.sub',current_setting('dp.test_member'),true);
do $$declare w uuid:=current_setting('dp.test_workspace')::uuid;r uuid:=current_setting('dp.test_record')::uuid;begin
 if exists(select 1 from public.dp_workspaces where id=w) or exists(select 1 from public.dp_workspace_revisions where record_id=r) then raise exception 'TEST: outsider read';end if;
 begin perform public.dp_save_workspace_revision(w,'order','intruder','{}',true,r,2);raise exception 'TEST: outsider write';exception when raise_exception then if sqlerrm like 'TEST:%' then raise;end if;end;
 perform public.dp_accept_workspace_invite(repeat('a',64));
 if not exists(select 1 from public.dp_workspace_revisions where record_id=r and version=2) then raise exception 'TEST: editor read failed';end if;
 perform public.dp_save_workspace_revision(w,'order','edited','{}',true,r,2);
 begin perform public.dp_accept_workspace_invite(repeat('a',64));raise exception 'TEST: invite replay';exception when raise_exception then if sqlerrm like 'TEST:%' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('dp.test_owner'),true);
delete from public.dp_workspace_members where workspace_id=current_setting('dp.test_workspace')::uuid;
insert into public.dp_workspace_invites(workspace_id,token_hash,role) values(current_setting('dp.test_workspace')::uuid,encode(extensions.digest(repeat('b',64),'sha256'),'hex'),'viewer');
select set_config('request.jwt.claim.sub',current_setting('dp.test_member'),true);
do $$begin
 if exists(select 1 from public.dp_workspace_records where workspace_id=current_setting('dp.test_workspace')::uuid) then raise exception 'TEST: revoked access retained';end if;
 perform public.dp_accept_workspace_invite(repeat('b',64));
 if not exists(select 1 from public.dp_workspace_records where workspace_id=current_setting('dp.test_workspace')::uuid) then raise exception 'TEST: viewer read failed';end if;
 begin perform public.dp_save_workspace_revision(current_setting('dp.test_workspace')::uuid,'order','viewer','{}',true,current_setting('dp.test_record')::uuid,3);raise exception 'TEST: viewer write';exception when insufficient_privilege then null;when raise_exception then if sqlerrm<>'Editor access required' then raise;end if;end;
end $$;
reset role;
rollback;
select 'PASS: tenant isolation, editor/viewer roles, immutable revisions, conflict detection, single-use invitations, removal; all test rows rolled back' as result;
