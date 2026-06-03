-- 011 — Sprint 10: Audit-reminders + score-regressie-alerts.
--
-- Doel: user doet maandelijks audit om verbetering te tracken. Tussen
-- audits door vergeten ze het — wij sturen vriendelijke reminder via
-- email op het ingestelde interval. Plus: automatische alert bij score-
-- regressie als nieuwe audit lagere score heeft dan vorige.
--
-- Schema-keuze: één tabel per "wat-wanneer" combinatie. Geen aparte
-- frequency-tabel — interval_days inline maakt queries simpel.
--
-- Cron: Vercel daily cron POST't /api/cron/send-reminders die scant naar
-- next_remind_at <= now() AND active = true. Email via Resend, daarna
-- last_reminded_at + next_remind_at incrementeren.

create table if not exists public.audit_reminders (
  id                       uuid          primary key default gen_random_uuid(),
  user_id                  uuid          not null references auth.users (id) on delete cascade,
  -- Hostname OR genormaliseerde naam (zelfde key-conventie als audit-grouping.ts)
  webshop_key              text          not null,
  webshop_display_name     text          not null,
  webshop_url              text,
  -- Interval-days bepaalt next_remind_at na elke verzending
  interval_days            integer       not null default 30 check (interval_days between 7 and 365),
  -- Email-bestemming. Default = user-email, maar override mogelijk (bv. team-inbox)
  email_address            text          not null,
  -- Stuur regressie-alerts bij score-drop ≥ 0.5 punt
  alert_on_regression      boolean       not null default true,
  active                   boolean       not null default true,
  last_reminded_at         timestamptz,
  next_remind_at           timestamptz   not null,
  created_at               timestamptz   not null default now(),
  updated_at               timestamptz   not null default now()
);

create index if not exists audit_reminders_next_remind_idx
  on public.audit_reminders (next_remind_at)
  where active = true;

create index if not exists audit_reminders_user_id_idx
  on public.audit_reminders (user_id);

-- Eén reminder per user × webshop_key (geen dupes bij her-opslaan)
create unique index if not exists audit_reminders_user_webshop_unique
  on public.audit_reminders (user_id, webshop_key);

-- ============================================================================
-- RLS — alleen owner kan eigen reminders zien/muteren. Cron-handler gebruikt
-- service-role (bypass RLS) om alle reminders te scannen.
-- ============================================================================
alter table public.audit_reminders enable row level security;

drop policy if exists "audit_reminders_select_own" on public.audit_reminders;
create policy "audit_reminders_select_own"
  on public.audit_reminders
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "audit_reminders_insert_own" on public.audit_reminders;
create policy "audit_reminders_insert_own"
  on public.audit_reminders
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "audit_reminders_update_own" on public.audit_reminders;
create policy "audit_reminders_update_own"
  on public.audit_reminders
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "audit_reminders_delete_own" on public.audit_reminders;
create policy "audit_reminders_delete_own"
  on public.audit_reminders
  for delete
  to authenticated
  using (user_id = auth.uid());
