-- ⛔ DimPack3D dp_ prefix (shared commerce-ops SG project — see DATA.md)
-- Applied 2026-07-05 as dimpack3d_dp_review_and_audit + dp_events_owner_insert.
-- Plan approval flow + audit trail: dp_plans.status/review_token,
-- dp_plan_events, RPCs dp_submit_for_review / dp_get_plan_for_review /
-- dp_review_action (security definer, token validated in-function).
-- Canonical SQL lives in the applied migrations; this file mirrors them.

alter table public.dp_plans add column if not exists status text not null default 'draft';
alter table public.dp_plans add column if not exists review_token text;

create table if not exists public.dp_plan_events (
  id          bigint generated always as identity primary key,
  plan_id     uuid not null references public.dp_plans(id) on delete cascade,
  actor_id    uuid,
  actor_email text,
  action      text not null,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists dp_plan_events_plan_idx on public.dp_plan_events (plan_id, created_at);
alter table public.dp_plan_events enable row level security;

drop policy if exists "dp_plan_events owner read" on public.dp_plan_events;
create policy "dp_plan_events owner read" on public.dp_plan_events
  for select using (exists (select 1 from public.dp_plans p where p.id = plan_id and p.user_id = auth.uid()));

drop policy if exists "dp_plan_events owner insert" on public.dp_plan_events;
create policy "dp_plan_events owner insert" on public.dp_plan_events
  for insert to authenticated
  with check (exists (select 1 from public.dp_plans p where p.id = plan_id and p.user_id = auth.uid()));

-- RPCs: see applied migration dimpack3d_dp_review_and_audit (functions:
-- dp_submit_for_review, dp_get_plan_for_review, dp_review_action).
