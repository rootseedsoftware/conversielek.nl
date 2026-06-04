-- 013 — M7: API-keys voor Agency-tier (programmatic access).
--
-- Plain key wordt NOOIT opgeslagen — alleen sha256-hash + 8-char prefix
-- voor display ("cl_a1b2...c3d4"). User ziet plain key één keer bij
-- aanmaak; daarna alleen prefix in /account/api-keys.
--
-- Format: cl_<32 hex chars> = 35 chars totaal.
-- 16 bytes (128 bits) random = ~3.4 × 10^38 ruimte, brute force-onmogelijk.
--
-- Per key tracken we last_used_at + usage_count zodat owner ziet welke
-- keys actief zijn (= veilig om in te trekken als ze stil staan).
--
-- Soft-delete via revoked_at: query naar geldige keys checkt
-- revoked_at IS NULL. Behouden audit-trail (welke key bestond ooit).

create table if not exists public.api_keys (
  id               uuid          primary key default gen_random_uuid(),
  user_id          uuid          not null references auth.users (id) on delete cascade,
  name             text          not null check (length(name) between 1 and 80),
  -- sha256-hex van de plain key (64 chars). Unieke index voor snelle lookup
  -- in de API-auth-flow.
  key_hash         text          not null unique,
  -- Voor display in UI: "cl_a1b2...c3d4". 12 chars (3 + 4 + 5).
  key_prefix       text          not null,
  created_at       timestamptz   not null default now(),
  last_used_at     timestamptz,
  usage_count      integer       not null default 0,
  revoked_at       timestamptz
);

create index if not exists api_keys_user_id_idx on public.api_keys (user_id);
-- Lookup-index op hash (al unique, maar explicit voor clarity)
create index if not exists api_keys_key_hash_idx on public.api_keys (key_hash)
  where revoked_at is null;

-- ============================================================================
-- RLS — alleen owner kan eigen keys lezen + intrekken
-- API-auth-flow gebruikt admin-client (service-role, bypass RLS).
-- ============================================================================
alter table public.api_keys enable row level security;

drop policy if exists "api_keys_select_own" on public.api_keys;
create policy "api_keys_select_own"
  on public.api_keys for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "api_keys_insert_own" on public.api_keys;
create policy "api_keys_insert_own"
  on public.api_keys for insert
  to authenticated
  with check (user_id = auth.uid());

-- Update: alleen revoked_at-veld (= intrekken). Plain key/hash mag niet
-- gewijzigd worden (zou auth-flow doorbreken). Voor MVP doen we hier
-- geen column-level RLS maar vertrouwen op de Server Action die alleen
-- revoked_at zet.
drop policy if exists "api_keys_update_own" on public.api_keys;
create policy "api_keys_update_own"
  on public.api_keys for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Geen DELETE-policy — keys worden soft-deleted via revoked_at. Audit-
-- trail blijft intact.
