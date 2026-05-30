-- M3a — Plans + Subscriptions + Payment Events
--
-- Drie tabellen voor abonnementen-tracking:
--   1. plans            — statische catalogus van pakketten (free/webshop/agency)
--   2. subscriptions    — koppelt user aan plan + Mollie-id + periode
--   3. payment_events   — alle Mollie webhook-events voor idempotency + audit-trail
--
-- Quota-handhaving: count(*) op public.audits in huidige kalendermaand,
-- vergelijken met plans.audit_quota_per_month van de actieve subscription.
-- Voor 'free' tier: hard limit. Voor betaalde tiers: NULL = onbeperkt.

-- ============================================================================
-- 1. PLANS
-- ============================================================================

create table if not exists public.plans (
  id                      uuid          primary key default gen_random_uuid(),
  slug                    text          not null unique,         -- 'free' / 'webshop' / 'agency'
  name                    text          not null,                -- gebruikersvriendelijke naam
  description             text,
  price_cents             integer       not null default 0,      -- in centen, excl BTW
  currency                text          not null default 'EUR',
  billing_interval        text          not null default 'monthly' check (billing_interval in ('monthly', 'yearly')),
  audit_quota_per_month   integer,                               -- null = onbeperkt
  features                jsonb         not null default '[]'::jsonb,  -- array van strings voor pricing-UI
  is_active               boolean       not null default true,   -- false = uit verkoop, bestaande blijven
  sort_order              integer       not null default 0,      -- voor pricing-page volgorde
  created_at              timestamptz   not null default now()
);

-- Plans zijn publiek leesbaar (voor pricing-page) — geen RLS nodig op SELECT.
-- Mutaties alleen via service_role (server actions met admin client).
alter table public.plans enable row level security;

create policy "plans_read_all"
  on public.plans for select
  using (true);

-- Seed de drie tiers
insert into public.plans (slug, name, description, price_cents, audit_quota_per_month, features, sort_order) values
  (
    'free',
    'Probeer',
    'Test het uit zonder verplichtingen.',
    0,
    2,
    '["Geen account vereist", "Alle 5 flow-types", "2 audits per maand", "Basis PDF-rapport", "Issue progress tracking"]'::jsonb,
    1
  ),
  (
    'webshop',
    'Webshop',
    'Voor één webshop.',
    1900,
    null,  -- onbeperkt
    '["Account met audits in de cloud", "Audits op alle apparaten", "Onbeperkt aantal audits", "Issue progress tracking", "Voorrang support", "Branded PDF-rapport (binnenkort)", "Voor/na vergelijking (binnenkort)", "E-mail rapporten (binnenkort)"]'::jsonb,
    2
  ),
  (
    'agency',
    'Agency',
    'Voor freelance UX''ers + bureaus.',
    5900,
    null,
    '["Alles van Webshop", "Onbeperkt webshops", "White-label rapporten", "Eigen logo + huisstijl", "Multi-tenant workspaces", "API access"]'::jsonb,
    3
  )
on conflict (slug) do nothing;


-- ============================================================================
-- 2. SUBSCRIPTIONS
-- ============================================================================

create table if not exists public.subscriptions (
  id                       uuid          primary key default gen_random_uuid(),
  user_id                  uuid          not null references auth.users (id) on delete cascade,
  plan_id                  uuid          not null references public.plans (id) on delete restrict,
  status                   text          not null check (status in (
                              'active',           -- normale betalende sub
                              'canceled',         -- geannuleerd, loopt af op current_period_end
                              'past_due',         -- betaling mislukt, wachten op retry
                              'incomplete',       -- net aangemaakt, eerste betaling nog niet ontvangen
                              'expired'           -- afgelopen na cancel of na te lang past_due
                           )),
  mollie_customer_id       text,                                 -- ctr_xxxx voor latere upgrades/cancels
  mollie_subscription_id   text          unique,                 -- sub_xxxx — null voor 'free' tier
  current_period_start     timestamptz   not null default now(),
  current_period_end       timestamptz,                          -- null voor 'free' (geen periode)
  cancel_at_period_end     boolean       not null default false, -- user heeft cancel aangevraagd
  canceled_at              timestamptz,
  created_at               timestamptz   not null default now(),
  updated_at               timestamptz   not null default now()
);

-- Eén user heeft op elk moment max één actieve subscription
create unique index if not exists subscriptions_one_active_per_user
  on public.subscriptions (user_id)
  where status in ('active', 'past_due', 'incomplete');

create index if not exists subscriptions_user_id_idx
  on public.subscriptions (user_id);

create index if not exists subscriptions_mollie_sub_id_idx
  on public.subscriptions (mollie_subscription_id);

alter table public.subscriptions enable row level security;

-- Users zien alleen eigen subscriptions
create policy "subscriptions_select_own"
  on public.subscriptions for select
  using ((select auth.uid()) = user_id);

-- Insert/update alleen via service_role (webhook handler).
-- Geen policy = standaard verbod voor anon/authenticated rollen.


-- ============================================================================
-- 3. PAYMENT EVENTS (Mollie webhook log)
-- ============================================================================

-- Elke binnenkomende Mollie webhook wordt hier opgeslagen voordat we
-- erop reageren. Geeft ons:
--   - Idempotency (negeer event als al verwerkt)
--   - Audit-trail (wat gebeurde wanneer)
--   - Replay-mogelijkheid bij bugs in handler

create table if not exists public.payment_events (
  id                  uuid          primary key default gen_random_uuid(),
  provider            text          not null default 'mollie' check (provider in ('mollie', 'stripe')),
  external_id         text          not null,                   -- Mollie payment-id of subscription-id
  event_type          text          not null,                   -- 'payment.paid', 'subscription.canceled', etc.
  subscription_id     uuid          references public.subscriptions (id) on delete set null,
  payload             jsonb         not null,                   -- volledige webhook body
  processed_at        timestamptz,                              -- null = nog niet verwerkt
  error               text,                                     -- fout-message als verwerking faalde
  received_at         timestamptz   not null default now()
);

create unique index if not exists payment_events_provider_external_idx
  on public.payment_events (provider, external_id, event_type);

create index if not exists payment_events_subscription_id_idx
  on public.payment_events (subscription_id);

alter table public.payment_events enable row level security;
-- Geen policy = alleen service_role kan lezen/schrijven (correct).


-- ============================================================================
-- 4. HELPER FUNCTIE — audits per maand tellen voor quota-check
-- ============================================================================
--
-- App-code (Next.js server actions) doet de plan-resolution zelf via
-- supabase.from('subscriptions').select(...).join('plans'). Hier alleen
-- de count-helper omdat date_trunc + range-filter beter SQL-side gaat
-- dan via PostgREST query-builder.

create or replace function public.audits_this_month(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.audits
  where user_id = p_user_id
    and created_at >= date_trunc('month', now())
    and created_at < date_trunc('month', now()) + interval '1 month';
$$;
