-- 006 — Terug naar dead-simple audits-RLS.
--
-- Symptoom (na 004 + 005): nieuwe audits worden geïnsert (geen UI-error)
-- maar verschijnen niet in "Mijn audits". Compare-knop verschijnt ook niet
-- omdat die afhangt van history.length >= 2. RLS blokkeert dus SELECT.
--
-- Root cause (vermoeden): de `(select auth.uid())`-wrap + workspace-subquery
-- in 004 evalueert in sommige Postgres-versies anders dan een directe
-- `user_id = auth.uid()`. Reden onbekend maar irrelevant: voor de huidige
-- saveAudit-flow (zie src/lib/audit-store.ts — geen workspace_id meegegeven)
-- is workspace-membership-check sowieso loos werk. user_id check is alles
-- wat nodig is.
--
-- Beslissing: drop alle audits-policies, recreate met M2-niveau eenvoud:
--   - één policy per actie (select/insert/update/delete)
--   - alleen `user_id = auth.uid()` — geen wrap, geen subquery
--   - `to authenticated`-role-target
--
-- Multi-tenant team-sharing (Agency-tier) komt in M5c via SECURITY DEFINER
-- function die `is_workspace_member(audit_id, user_id)` uitrekent zonder
-- RLS-recursion. Tot dan: audits zijn strict user-owned. Voor MVP fine —
-- 99% van users zit alleen in z'n personal workspace.
--
-- Idempotent. Veilig om opnieuw te draaien.

-- ============================================================================
-- Force RLS (nogmaals, idempotent)
-- ============================================================================
alter table public.audits enable row level security;

-- ============================================================================
-- Drop ALLE bestaande audits-policies (clean slate)
-- ============================================================================
drop policy if exists "audits_select_own" on public.audits;
drop policy if exists "audits_insert_own" on public.audits;
drop policy if exists "audits_update_own" on public.audits;
drop policy if exists "audits_delete_own" on public.audits;
drop policy if exists "audits_select_workspace_member" on public.audits;
drop policy if exists "audits_insert_workspace_member" on public.audits;
drop policy if exists "audits_update_workspace_member" on public.audits;
drop policy if exists "audits_delete_workspace_member" on public.audits;
drop policy if exists "audits_select_any_access" on public.audits;
drop policy if exists "audits_insert_own_or_workspace" on public.audits;
drop policy if exists "audits_update_any_access" on public.audits;
drop policy if exists "audits_delete_any_access" on public.audits;
drop policy if exists "audits_select_workspace_or_owner" on public.audits;
drop policy if exists "audits_insert_workspace_or_owner" on public.audits;
drop policy if exists "audits_update_workspace_or_owner" on public.audits;
drop policy if exists "audits_delete_workspace_or_owner" on public.audits;
drop policy if exists "audits_select_v2" on public.audits;
drop policy if exists "audits_insert_v2" on public.audits;
drop policy if exists "audits_update_v2" on public.audits;
drop policy if exists "audits_delete_v2" on public.audits;
drop policy if exists "audits_owner_select" on public.audits;
drop policy if exists "audits_owner_insert" on public.audits;
drop policy if exists "audits_owner_update" on public.audits;
drop policy if exists "audits_owner_delete" on public.audits;

-- ============================================================================
-- DEAD-SIMPLE: user ziet/beheert alleen z'n eigen audits
-- ============================================================================

create policy "audits_owner_select"
  on public.audits
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "audits_owner_insert"
  on public.audits
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "audits_owner_update"
  on public.audits
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "audits_owner_delete"
  on public.audits
  for delete
  to authenticated
  using (user_id = auth.uid());
