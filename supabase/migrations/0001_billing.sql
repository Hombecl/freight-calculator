-- ⛔ DimPack3D tables use the dp_ prefix (shared commerce-ops SG project — see DATA.md)
-- DimPack3D billing schema
-- One row per user, written ONLY by the billing webhook (service role).
-- RLS lets a user read their own row but never write it, so Pro status
-- cannot be forged from the client.

create table if not exists public.dp_subscriptions (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  email              text,
  status             text not null default 'none',   -- active | on_trial | past_due | cancelled | expired | none
  plan               text,
  ls_subscription_id text,
  ls_customer_id     text,
  current_period_end timestamptz,
  updated_at         timestamptz not null default now()
);

alter table public.dp_subscriptions enable row level security;

-- read-only for the owner
drop policy if exists "dp_subscriptions read own" on public.dp_subscriptions;
create policy "dp_subscriptions read own"
  on public.dp_subscriptions for select
  using (auth.uid() = user_id);

-- NOTE: no insert/update/delete policy for anon/authenticated on purpose.
-- The Edge Function uses the service_role key, which bypasses RLS, so only the
-- verified webhook can write. Do not add a client write policy.

-- optional: capture lead emails (for the free export gate) if you want them
-- server-side too. Anyone may insert their own email; nobody may read the list.
create table if not exists public.dp_leads (
  id         bigint generated always as identity primary key,
  email      text not null,
  source     text,
  pro_waitlist boolean default false,
  created_at timestamptz not null default now()
);
alter table public.dp_leads enable row level security;
drop policy if exists "dp_leads anyone can submit" on public.dp_leads;
create policy "dp_leads anyone can submit"
  on public.dp_leads for insert to anon, authenticated
  with check (true);
