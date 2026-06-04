-- 014 — M8: Error-logging in Supabase (eigen monitoring ipv Sentry).
--
-- Doel: client + server crashes vastleggen zodat we ze in /admin/errors
-- kunnen reviewen. Geen third-party data-processor (= consistent met
-- onze AVG-positionering).
--
-- Grouping via fingerprint: zelfde error meerdere keren = upsert +
-- occurrences++ ipv N nieuwe rijen. Anders krijg je log-spam bij een
-- error die in een render-loop zit.
--
-- Fingerprint-strategie (client-side):
--   - Normaliseer message: strip line/col numbers, strip URL-paths,
--     strip random IDs (uuids, hashes)
--   - Hash met sha-1 (snel, geen crypto-strength nodig voor grouping)
--   - sha1 in hex zonder #
--
-- Bewaartermijn: handmatig, geen auto-purge. Admin kan oude rijen
-- dismissen (soft-delete via dismissed flag).

create table if not exists public.error_logs (
  id              uuid          primary key default gen_random_uuid(),
  fingerprint     text          not null,
  level           text          not null default 'error'
                                check (level in ('error', 'warning', 'info')),
  source          text          not null default 'client'
                                check (source in ('client', 'server', 'edge', 'cron')),
  message         text          not null check (length(message) between 1 and 2000),
  stack           text          check (stack is null or length(stack) <= 8000),
  url             text,
  user_agent      text,
  -- user_id is null voor anonymous errors (uitgelogde flow / public pages)
  user_id         uuid          references auth.users (id) on delete set null,
  -- Vrij JSONB-veld voor breadcrumbs, route-state, etc.
  context         jsonb         default '{}'::jsonb,
  occurrences     integer       not null default 1,
  first_seen_at   timestamptz   not null default now(),
  last_seen_at    timestamptz   not null default now(),
  dismissed       boolean       not null default false,
  dismissed_at    timestamptz,
  dismissed_by    uuid          references auth.users (id) on delete set null
);

-- Unique op fingerprint → bij upsert kunnen we count + last_seen_at bumpen
-- ipv een nieuwe rij toe te voegen.
create unique index if not exists error_logs_fingerprint_unique
  on public.error_logs (fingerprint);

create index if not exists error_logs_last_seen_idx
  on public.error_logs (last_seen_at desc);

create index if not exists error_logs_undismissed_idx
  on public.error_logs (last_seen_at desc)
  where dismissed = false;

-- ============================================================================
-- RLS — alleen via service-role accessable (admin-client doet inserts +
-- de admin-page rendert via service-role queries). Geen authenticated
-- RLS-policies nodig: deze data is voor operator, niet voor end-users.
-- ============================================================================
alter table public.error_logs enable row level security;

-- Geen policies = standaard deny voor anon/authenticated. Service-role
-- bypassed RLS, dus alle inserts/selects gebeuren via admin-client uit
-- onze API-routes + admin-page.
