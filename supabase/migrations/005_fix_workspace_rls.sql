-- 005 — Herstel workspace-tabellen RLS-policies.
--
-- Symptoom: na 004 (audits-policy fix) bleven audits onzichtbaar.
-- Vermoedelijke oorzaak: de workspace_members SELECT-policy is
-- recursief (verwijst naar workspace_members in z'n eigen subquery).
-- Wanneer de audits-policy de inner select naar workspace_members
-- doet, klapt die recursie en returnt 0 rijen — wat de audits dan
-- ook verbergt.
--
-- Deze patch:
--   1. workspace_members SELECT vereenvoudigt naar 'eigen rijen alleen'
--      (user_id = auth.uid()) — geen self-reference meer.
--   2. workspaces SELECT herstelt met (select auth.uid()) syntax
--   3. workspace_invites SELECT/INSERT/DELETE idem
--   4. Voegt 'to authenticated' role-target overal toe
--
-- Trade-off: members van een team-workspace zien straks niet wie nog
-- meer in de workspace zit (alleen zichzelf). Voor MVP is dat fine —
-- die functionaliteit komt in M5c (members-page). Daar gebruiken we
-- een SECURITY DEFINER function die de check doet zonder RLS-recursion.

-- ============================================================================
-- WORKSPACE_MEMBERS
-- ============================================================================
alter table public.workspace_members enable row level security;

drop policy if exists "workspace_members_read_same_workspace" on public.workspace_members;
drop policy if exists "workspace_members_insert_admin" on public.workspace_members;
drop policy if exists "workspace_members_delete_admin" on public.workspace_members;
drop policy if exists "workspace_members_select_own" on public.workspace_members;
drop policy if exists "workspace_members_insert_self" on public.workspace_members;
drop policy if exists "workspace_members_delete_self" on public.workspace_members;

-- SELECT — user ziet alleen z'n eigen membership-rijen (geen recursion)
create policy "workspace_members_select_own"
  on public.workspace_members
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- INSERT — alleen via service_role (M5c-invite-flow gebruikt admin client)
-- Geen policy = standaard deny voor authenticated role. Correct.

-- DELETE — user kan zichzelf verlaten (leave workspace)
create policy "workspace_members_delete_self"
  on public.workspace_members
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ============================================================================
-- WORKSPACES
-- ============================================================================
alter table public.workspaces enable row level security;

drop policy if exists "workspaces_read_member" on public.workspaces;
drop policy if exists "workspaces_update_owner" on public.workspaces;
drop policy if exists "workspaces_delete_owner" on public.workspaces;
drop policy if exists "workspaces_insert_authenticated" on public.workspaces;
drop policy if exists "workspaces_select_v2" on public.workspaces;
drop policy if exists "workspaces_update_owner_v2" on public.workspaces;
drop policy if exists "workspaces_delete_owner_v2" on public.workspaces;
drop policy if exists "workspaces_insert_owner_v2" on public.workspaces;

-- SELECT — gebruik workspace_members subquery (now stabiel sinds workspace_members
-- policy non-recursive is)
create policy "workspaces_select_v2"
  on public.workspaces
  for select
  to authenticated
  using (
    id in (
      select workspace_id
      from public.workspace_members
      where user_id = (select auth.uid())
    )
  );

create policy "workspaces_insert_owner_v2"
  on public.workspaces
  for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "workspaces_update_owner_v2"
  on public.workspaces
  for update
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "workspaces_delete_owner_v2"
  on public.workspaces
  for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- ============================================================================
-- WORKSPACE_INVITES
-- ============================================================================
alter table public.workspace_invites enable row level security;

drop policy if exists "workspace_invites_read_admin" on public.workspace_invites;
drop policy if exists "workspace_invites_insert_admin" on public.workspace_invites;
drop policy if exists "workspace_invites_delete_admin" on public.workspace_invites;
drop policy if exists "workspace_invites_select_v2" on public.workspace_invites;
drop policy if exists "workspace_invites_insert_v2" on public.workspace_invites;
drop policy if exists "workspace_invites_delete_v2" on public.workspace_invites;

-- Voor MVP: alleen owners zien/maken/verwijderen invites. M5c kan dit
-- uitbreiden naar admins via SECURITY DEFINER function.
create policy "workspace_invites_select_v2"
  on public.workspace_invites
  for select
  to authenticated
  using (
    workspace_id in (
      select id from public.workspaces where owner_id = (select auth.uid())
    )
  );

create policy "workspace_invites_insert_v2"
  on public.workspace_invites
  for insert
  to authenticated
  with check (
    workspace_id in (
      select id from public.workspaces where owner_id = (select auth.uid())
    )
  );

create policy "workspace_invites_delete_v2"
  on public.workspace_invites
  for delete
  to authenticated
  using (
    workspace_id in (
      select id from public.workspaces where owner_id = (select auth.uid())
    )
  );
