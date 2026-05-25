-- M2 — Audits tabel
-- Vervangt de localStorage-opslag in de oude Vite-app. Eén rij per audit,
-- gekoppeld aan een ingelogde Supabase-user via user_id. Resolved-issues
-- worden inline in dezelfde rij bewaard (jsonb) zodat we geen aparte
-- tabel + join nodig hebben voor de progress-tracker.

create table if not exists public.audits (
  id              uuid          primary key default gen_random_uuid(),
  user_id         uuid          not null references auth.users (id) on delete cascade,
  created_at      timestamptz   not null default now(),
  flow_type       text          not null check (flow_type in ('homepage','product','cart','checkout','mobile')),
  webshop_name    text          not null,
  webshop_url     text,
  product_category text         not null,
  email           text,
  audit           jsonb         not null,
  resolved_issues jsonb         not null default '{}'::jsonb
);

-- Snelle history-query: laatste audits per user
create index if not exists audits_user_id_created_at_idx
  on public.audits (user_id, created_at desc);

-- Row-Level Security: elke user ziet en muteert alleen z'n eigen rijen
alter table public.audits enable row level security;

create policy "audits_select_own"
  on public.audits for select
  using ((select auth.uid()) = user_id);

create policy "audits_insert_own"
  on public.audits for insert
  with check ((select auth.uid()) = user_id);

create policy "audits_update_own"
  on public.audits for update
  using ((select auth.uid()) = user_id);

create policy "audits_delete_own"
  on public.audits for delete
  using ((select auth.uid()) = user_id);
