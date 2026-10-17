-- Isolated dp_ tables only; personal plans remain private.
create schema if not exists dp_private;
revoke all on schema dp_private from public;
grant usage on schema dp_private to authenticated;
create table public.dp_workspaces (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 100),
 owner_id uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);
create table public.dp_workspace_members (
 workspace_id uuid references public.dp_workspaces(id) on delete cascade, user_id uuid references auth.users(id),
 role text not null check(role in ('editor','viewer')), primary key(workspace_id,user_id)
);
create function dp_private.workspace_role(w uuid) returns text language sql stable security definer set search_path='' as $$
 select case when auth.uid() is null then null when exists(select 1 from public.dp_workspaces where id=w and owner_id=auth.uid()) then 'owner'
 else (select role from public.dp_workspace_members where workspace_id=w and user_id=auth.uid()) end
$$;
revoke all on function dp_private.workspace_role(uuid) from public;
grant execute on function dp_private.workspace_role(uuid) to authenticated;
alter table public.dp_workspaces enable row level security;
alter table public.dp_workspace_members enable row level security;
create policy dp_workspace_read on public.dp_workspaces for select to authenticated using(dp_private.workspace_role(id) is not null);
create policy dp_workspace_create on public.dp_workspaces for insert to authenticated with check(owner_id=auth.uid());
create policy dp_member_read on public.dp_workspace_members for select to authenticated using(dp_private.workspace_role(workspace_id) is not null);
create policy dp_member_remove on public.dp_workspace_members for delete to authenticated using(dp_private.workspace_role(workspace_id)='owner');
create table public.dp_workspace_invites (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.dp_workspaces(id) on delete cascade,
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'), role text not null check(role in ('editor','viewer')),
 expires_at timestamptz not null default now()+interval '7 days' check(expires_at <= now()+interval '8 days'),
 accepted_by uuid, created_at timestamptz not null default now()
);
alter table public.dp_workspace_invites enable row level security;
create policy dp_invite_owner on public.dp_workspace_invites for all to authenticated using(dp_private.workspace_role(workspace_id)='owner') with check(dp_private.workspace_role(workspace_id)='owner' and accepted_by is null);
create function dp_private.accept_invite(token text) returns uuid language plpgsql security definer set search_path='' as $$
declare invitation public.dp_workspace_invites; uid uuid:=auth.uid();
begin
 if uid is null or length(token)<>64 then raise exception 'Sign in with a valid invitation'; end if;
 select * into invitation from public.dp_workspace_invites where token_hash=encode(extensions.digest(token,'sha256'),'hex') for update;
 if invitation.id is null or invitation.expires_at<=now() or invitation.accepted_by is not null then raise exception 'Invitation expired or already used'; end if;
 if dp_private.workspace_role(invitation.workspace_id) is not null then raise exception 'Already a member'; end if;
 insert into public.dp_workspace_members values(invitation.workspace_id,uid,invitation.role);
 update public.dp_workspace_invites set accepted_by=uid where id=invitation.id;
 return invitation.workspace_id;
end $$;
revoke all on function dp_private.accept_invite(text) from public;
grant execute on function dp_private.accept_invite(text) to authenticated;
create function public.dp_accept_workspace_invite(token text) returns uuid language sql security invoker set search_path='' as $$select dp_private.accept_invite(token)$$;
revoke all on function public.dp_accept_workspace_invite(text) from public;
grant execute on function public.dp_accept_workspace_invite(text) to authenticated;
create table public.dp_workspace_records (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.dp_workspaces(id),
 name text not null check(length(name) between 1 and 100), kind text not null check(kind in ('order','cargo','receiver')),
 created_by uuid not null default auth.uid(), created_at timestamptz not null default now(), unique(id,workspace_id)
);
create index dp_records_workspace on public.dp_workspace_records(workspace_id,created_at);
create table public.dp_workspace_revisions (
 record_id uuid not null, workspace_id uuid not null, version integer not null check(version>0),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<500000),
 own_job boolean not null default false, created_by uuid not null default auth.uid(), created_at timestamptz not null default now(),
 primary key(record_id,version), foreign key(record_id,workspace_id) references public.dp_workspace_records(id,workspace_id)
);
create index dp_revisions_workspace on public.dp_workspace_revisions(workspace_id,created_at);
alter table public.dp_workspace_records enable row level security;
alter table public.dp_workspace_revisions enable row level security;
create policy dp_record_read on public.dp_workspace_records for select to authenticated using(dp_private.workspace_role(workspace_id) is not null);
create policy dp_record_write on public.dp_workspace_records for insert to authenticated with check(dp_private.workspace_role(workspace_id) in ('owner','editor') and created_by=auth.uid());
create policy dp_revision_read on public.dp_workspace_revisions for select to authenticated using(dp_private.workspace_role(workspace_id) is not null);
create policy dp_revision_write on public.dp_workspace_revisions for insert to authenticated with check(dp_private.workspace_role(workspace_id) in ('owner','editor') and created_by=auth.uid());
-- Serialize writers. A stale client gets a conflict, never a silent overwrite.
create function dp_private.check_revision() returns trigger language plpgsql security definer set search_path='' as $$
declare latest integer;
begin
 if auth.uid() is null or dp_private.workspace_role(new.workspace_id) not in ('owner','editor') then raise exception 'Editor access required'; end if;
 perform 1 from public.dp_workspace_records where id=new.record_id and workspace_id=new.workspace_id for update;
 select coalesce(max(version),0) into latest from public.dp_workspace_revisions where record_id=new.record_id;
 if new.version<>latest+1 then raise exception 'Revision conflict: reload the latest version before saving'; end if;
 new.created_at:=now(); new.created_by:=auth.uid(); return new;
end $$;
revoke all on function dp_private.check_revision() from public;
create trigger dp_revision_check before insert on public.dp_workspace_revisions for each row execute function dp_private.check_revision();
grant select,insert on public.dp_workspaces,public.dp_workspace_records,public.dp_workspace_revisions to authenticated;
grant select,delete on public.dp_workspace_members to authenticated;
grant select,insert,delete on public.dp_workspace_invites to authenticated;
revoke all on public.dp_workspaces,public.dp_workspace_members,public.dp_workspace_invites,public.dp_workspace_records,public.dp_workspace_revisions from anon;
create function public.dp_save_workspace_revision(w uuid,k text,n text,p jsonb,own boolean,r uuid default null,v integer default 0) returns uuid
language plpgsql security invoker set search_path='' as $$
declare rid uuid:=r;
begin
 if rid is null then
  if v<>0 then raise exception 'Invalid initial version'; end if;
  insert into public.dp_workspace_records(workspace_id,kind,name) values(w,k,n) returning id into rid;
 elsif not exists(select 1 from public.dp_workspace_records where id=rid and workspace_id=w and kind=k) then raise exception 'Record not found'; end if;
 insert into public.dp_workspace_revisions(record_id,workspace_id,version,payload,own_job) values(rid,w,v+1,p,own and k='order');
 return rid;
end $$;
revoke all on function public.dp_save_workspace_revision(uuid,text,text,jsonb,boolean,uuid,integer) from public;
grant execute on function public.dp_save_workspace_revision(uuid,text,text,jsonb,boolean,uuid,integer) to authenticated;
