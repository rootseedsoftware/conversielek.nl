-- 012 — Sprint 9: Team-collaboration op issues.
--
-- Per issue (= audit_id + issue_index) krijgen we:
--   1. issue_states: status (todo/in_progress/done) + optionele assignee.
--      Eén rij per (audit_id, issue_index). Upsert-pattern bij elk muteer.
--   2. issue_comments: thread van plain-text comments per issue.
--      Geen replies/threading voor MVP — pure tijdsorder.
--
-- RLS-scope (MVP): alleen audit-owner kan lezen/schrijven. Multi-user
-- via workspace_members volgt zodra audits-RLS ook workspace-aware is
-- (= M5c werk). Resolveert subselect via audits-tabel.
--
-- 'resolved' vinkje uit M2 blijft bestaan op audits.resolved_issues
-- JSONB-veld — overlapt deels met issue_states.status='done', maar we
-- houden ze gescheiden voor backward-compat. Eventueel later mergen.

-- ============================================================================
-- 1. ISSUE_STATES — status + assignee per issue
-- ============================================================================
create table if not exists public.issue_states (
  audit_id          uuid          not null references public.audits (id) on delete cascade,
  issue_index       integer       not null,
  status            text          not null default 'todo'
                                  check (status in ('todo', 'in_progress', 'done')),
  assigned_to       uuid          references auth.users (id) on delete set null,
  updated_at        timestamptz   not null default now(),
  updated_by        uuid          not null references auth.users (id) on delete cascade,
  primary key (audit_id, issue_index)
);

create index if not exists issue_states_assigned_to_idx
  on public.issue_states (assigned_to)
  where assigned_to is not null;

-- ============================================================================
-- 2. ISSUE_COMMENTS — plain-text comment-thread per issue
-- ============================================================================
create table if not exists public.issue_comments (
  id            uuid          primary key default gen_random_uuid(),
  audit_id      uuid          not null references public.audits (id) on delete cascade,
  issue_index   integer       not null,
  user_id       uuid          not null references auth.users (id) on delete cascade,
  text          text          not null check (length(text) between 1 and 2000),
  created_at    timestamptz   not null default now()
);

create index if not exists issue_comments_audit_issue_idx
  on public.issue_comments (audit_id, issue_index, created_at);

-- ============================================================================
-- 3. RLS — MVP: alleen owner van de audit
-- ============================================================================
alter table public.issue_states enable row level security;
alter table public.issue_comments enable row level security;

-- Helper: is huidige user owner van deze audit?
-- Inline EXISTS-subselect ipv security definer omdat audits-RLS in 006
-- al puur auth.uid()-based is — geen recursion-risico.

-- issue_states policies
drop policy if exists "issue_states_select_owner" on public.issue_states;
create policy "issue_states_select_owner"
  on public.issue_states for select
  to authenticated
  using (
    exists (
      select 1 from public.audits a
      where a.id = issue_states.audit_id and a.user_id = auth.uid()
    )
  );

drop policy if exists "issue_states_insert_owner" on public.issue_states;
create policy "issue_states_insert_owner"
  on public.issue_states for insert
  to authenticated
  with check (
    updated_by = auth.uid()
    and exists (
      select 1 from public.audits a
      where a.id = issue_states.audit_id and a.user_id = auth.uid()
    )
  );

drop policy if exists "issue_states_update_owner" on public.issue_states;
create policy "issue_states_update_owner"
  on public.issue_states for update
  to authenticated
  using (
    exists (
      select 1 from public.audits a
      where a.id = issue_states.audit_id and a.user_id = auth.uid()
    )
  )
  with check (updated_by = auth.uid());

drop policy if exists "issue_states_delete_owner" on public.issue_states;
create policy "issue_states_delete_owner"
  on public.issue_states for delete
  to authenticated
  using (
    exists (
      select 1 from public.audits a
      where a.id = issue_states.audit_id and a.user_id = auth.uid()
    )
  );

-- issue_comments policies
drop policy if exists "issue_comments_select_owner" on public.issue_comments;
create policy "issue_comments_select_owner"
  on public.issue_comments for select
  to authenticated
  using (
    exists (
      select 1 from public.audits a
      where a.id = issue_comments.audit_id and a.user_id = auth.uid()
    )
  );

drop policy if exists "issue_comments_insert_owner" on public.issue_comments;
create policy "issue_comments_insert_owner"
  on public.issue_comments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.audits a
      where a.id = issue_comments.audit_id and a.user_id = auth.uid()
    )
  );

-- Alleen auteur kan eigen comment verwijderen
drop policy if exists "issue_comments_delete_own" on public.issue_comments;
create policy "issue_comments_delete_own"
  on public.issue_comments for delete
  to authenticated
  using (user_id = auth.uid());
