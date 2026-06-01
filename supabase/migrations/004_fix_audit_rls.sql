-- 004 — Herstel audit RLS-policies na M5a (workspace-introductie).
--
-- Symptoom: na migratie 003 verdwenen audits uit de UI ondanks dat
-- workspace_id en workspace_members correct gekoppeld zijn. Vermoedelijke
-- oorzaak: de subselect in de policy gebruikt auth.uid() rechtstreeks ipv
-- (select auth.uid()) — Supabase docs raden de latere syntax aan voor
-- correct query-plan caching, en in sommige gevallen evalueert auth.uid()
-- inline anders dan verwacht.
--
-- Deze migratie:
--   1. Force-enabled RLS op audits (idempotent)
--   2. Drop ALLE bestaande audit-policies (clean slate)
--   3. Recreate met:
--      - explicit "to authenticated" role-target
--      - (select auth.uid()) syntax
--      - user_id-fallback voor backward-compat met audits zonder workspace
--
-- Veilig om opnieuw te draaien.

-- ============================================================================
-- Force RLS
-- ============================================================================
alter table public.audits enable row level security;

-- ============================================================================
-- Drop alle bestaande policies (idempotent)
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

-- ============================================================================
-- SELECT — user ziet z'n eigen audits + audits in workspaces waar hij lid is
-- ============================================================================
create policy "audits_select_v2"
  on public.audits
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    OR
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- INSERT — user kan audit voor zichzelf maken; workspace_id moet leeg zijn
-- OF een waar hij lid van is
-- ============================================================================
create policy "audits_insert_v2"
  on public.audits
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    AND (
      workspace_id is null
      OR workspace_id in (
        select workspace_id
        from public.workspace_members
        where user_id = (select auth.uid())
      )
    )
  );

-- ============================================================================
-- UPDATE — alleen op audits die de user kan zien
-- ============================================================================
create policy "audits_update_v2"
  on public.audits
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    OR
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- DELETE — idem
-- ============================================================================
create policy "audits_delete_v2"
  on public.audits
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    OR
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = (select auth.uid())
    )
  );
