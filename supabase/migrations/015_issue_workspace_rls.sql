-- 015 — Sprint 9 v2: Issue-collaboration RLS uitbreiden naar workspace-members.
--
-- Sprint 9 v1 (migration 012) had owner-only RLS omdat M5c nog niet klaar
-- was: alleen de audit-eigenaar kon issues zien/muteren. Nu M5c live is,
-- moeten teamgenoten in dezelfde workspace ook status kunnen wijzigen,
-- comments plaatsen én toegewezen worden.
--
-- Nieuwe check: caller mag als:
--   * audits.user_id = auth.uid()  (owner-fallback voor pre-workspace-tijden
--     of audits zonder workspace_id — matcht audit-RLS-patroon uit 003)
--   * OR audits.workspace_id is lid-van door de caller (via workspace_members)
--
-- Comment-auteurschap: onveranderd — alleen auteur mag eigen comment
-- verwijderen. Toewijzen van issues: alleen aan users die daadwerkelijk lid
-- zijn van de workspace (application-level check in server-action, niet in
-- RLS want dat zou een subselect met workspace_id vereisen die we niet
-- makkelijk beschikbaar hebben op issue_states-row-niveau).

-- ============================================================================
-- ISSUE_STATES policies — vervangen met workspace-aware varianten
-- ============================================================================

drop policy if exists "issue_states_select_owner" on public.issue_states;
create policy "issue_states_select_owner_or_workspace"
  on public.issue_states for select
  to authenticated
  using (
    exists (
      select 1 from public.audits a
      where a.id = issue_states.audit_id
        and (
          a.user_id = auth.uid()
          or (
            a.workspace_id is not null
            and a.workspace_id in (
              select workspace_id from public.workspace_members
              where user_id = auth.uid()
            )
          )
        )
    )
  );

drop policy if exists "issue_states_insert_owner" on public.issue_states;
create policy "issue_states_insert_owner_or_workspace"
  on public.issue_states for insert
  to authenticated
  with check (
    updated_by = auth.uid()
    and exists (
      select 1 from public.audits a
      where a.id = issue_states.audit_id
        and (
          a.user_id = auth.uid()
          or (
            a.workspace_id is not null
            and a.workspace_id in (
              select workspace_id from public.workspace_members
              where user_id = auth.uid()
            )
          )
        )
    )
  );

drop policy if exists "issue_states_update_owner" on public.issue_states;
create policy "issue_states_update_owner_or_workspace"
  on public.issue_states for update
  to authenticated
  using (
    exists (
      select 1 from public.audits a
      where a.id = issue_states.audit_id
        and (
          a.user_id = auth.uid()
          or (
            a.workspace_id is not null
            and a.workspace_id in (
              select workspace_id from public.workspace_members
              where user_id = auth.uid()
            )
          )
        )
    )
  )
  with check (updated_by = auth.uid());

drop policy if exists "issue_states_delete_owner" on public.issue_states;
create policy "issue_states_delete_owner_or_workspace"
  on public.issue_states for delete
  to authenticated
  using (
    exists (
      select 1 from public.audits a
      where a.id = issue_states.audit_id
        and (
          a.user_id = auth.uid()
          or (
            a.workspace_id is not null
            and a.workspace_id in (
              select workspace_id from public.workspace_members
              where user_id = auth.uid()
            )
          )
        )
    )
  );

-- ============================================================================
-- ISSUE_COMMENTS policies — vervangen met workspace-aware varianten
-- ============================================================================

drop policy if exists "issue_comments_select_owner" on public.issue_comments;
create policy "issue_comments_select_owner_or_workspace"
  on public.issue_comments for select
  to authenticated
  using (
    exists (
      select 1 from public.audits a
      where a.id = issue_comments.audit_id
        and (
          a.user_id = auth.uid()
          or (
            a.workspace_id is not null
            and a.workspace_id in (
              select workspace_id from public.workspace_members
              where user_id = auth.uid()
            )
          )
        )
    )
  );

drop policy if exists "issue_comments_insert_owner" on public.issue_comments;
create policy "issue_comments_insert_owner_or_workspace"
  on public.issue_comments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.audits a
      where a.id = issue_comments.audit_id
        and (
          a.user_id = auth.uid()
          or (
            a.workspace_id is not null
            and a.workspace_id in (
              select workspace_id from public.workspace_members
              where user_id = auth.uid()
            )
          )
        )
    )
  );

-- issue_comments_delete_own blijft onveranderd — auteur-only cleanup
