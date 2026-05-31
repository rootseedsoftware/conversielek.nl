-- M5a — Multi-tenant workspaces
--
-- Introduceert workspaces als top-level tenant. Elke user heeft minimaal
-- één "personal" workspace (default na signup); Agency-tier kan extra
-- "team" workspaces aanmaken met meerdere leden + invites.
--
-- Backward-compat: bestaande users krijgen een auto-aangemaakte personal
-- workspace, hun bestaande audits worden eraan gekoppeld. RLS-policies
-- werken vanaf nu op workspace-membership ipv puur user_id, met fallback
-- op user_id voor audits zonder workspace_id (verzekert dat anonymous/
-- legacy data niet plots ontoegankelijk wordt).
--
-- Trigger op auth.users zorgt dat nieuwe signups direct een personal
-- workspace krijgen — page.tsx kan vanaf user-create rekenen op
-- aanwezigheid van een workspace.

-- ============================================================================
-- 1. WORKSPACES
-- ============================================================================

create table if not exists public.workspaces (
  id          uuid          primary key default gen_random_uuid(),
  name        text          not null,
  slug        text          not null unique,
  owner_id    uuid          not null references auth.users (id) on delete cascade,
  type        text          not null default 'personal' check (type in ('personal', 'team')),
  created_at  timestamptz   not null default now(),
  updated_at  timestamptz   not null default now()
);

create index if not exists workspaces_owner_id_idx on public.workspaces (owner_id);

-- ============================================================================
-- 2. WORKSPACE_MEMBERS
-- ============================================================================

create table if not exists public.workspace_members (
  workspace_id  uuid          not null references public.workspaces (id) on delete cascade,
  user_id       uuid          not null references auth.users (id) on delete cascade,
  role          text          not null default 'member' check (role in ('owner', 'admin', 'member')),
  invited_at    timestamptz,
  joined_at     timestamptz   not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists workspace_members_user_id_idx on public.workspace_members (user_id);

-- ============================================================================
-- 3. WORKSPACE_INVITES (pending invites, niet-geclaimd)
-- ============================================================================

create table if not exists public.workspace_invites (
  id            uuid          primary key default gen_random_uuid(),
  workspace_id  uuid          not null references public.workspaces (id) on delete cascade,
  email         text          not null,
  role          text          not null default 'member' check (role in ('admin', 'member')),
  token         text          not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by    uuid          not null references auth.users (id) on delete cascade,
  invited_at    timestamptz   not null default now(),
  expires_at    timestamptz   not null default (now() + interval '14 days')
);

create unique index if not exists workspace_invites_unique_email_per_ws
  on public.workspace_invites (workspace_id, lower(email));

create index if not exists workspace_invites_email_idx
  on public.workspace_invites (lower(email));

-- ============================================================================
-- 4. AUDITS — koppel aan workspace
-- ============================================================================

alter table public.audits
  add column if not exists workspace_id uuid references public.workspaces (id) on delete set null;

create index if not exists audits_workspace_id_idx on public.audits (workspace_id);

-- ============================================================================
-- 5. SUBSCRIPTIONS — koppel optioneel aan workspace (voor Agency multi-ws billing later)
-- ============================================================================

alter table public.subscriptions
  add column if not exists workspace_id uuid references public.workspaces (id) on delete set null;

create index if not exists subscriptions_workspace_id_idx on public.subscriptions (workspace_id);

-- ============================================================================
-- 6. MIGRATIE — geef bestaande users een default personal workspace
-- ============================================================================
-- Loop over alle users die ergens al data hebben (audits, subs, of auth.users
-- direct). Maak een personal workspace + member-row + link audits eraan.
-- Idempotent: do nothing als de user al een workspace heeft.

do $$
declare
  u record;
  ws_id uuid;
begin
  for u in
    select id from auth.users
    where id not in (select owner_id from public.workspaces where type = 'personal')
  loop
    insert into public.workspaces (name, slug, owner_id, type)
    values (
      'Persoonlijke workspace',
      'ws-' || replace(u.id::text, '-', ''),
      u.id,
      'personal'
    )
    returning id into ws_id;

    insert into public.workspace_members (workspace_id, user_id, role)
    values (ws_id, u.id, 'owner');

    -- Koppel bestaande audits + subs (waar workspace_id null is)
    update public.audits
      set workspace_id = ws_id
      where user_id = u.id and workspace_id is null;

    update public.subscriptions
      set workspace_id = ws_id
      where user_id = u.id and workspace_id is null;
  end loop;
end $$;

-- ============================================================================
-- 7. AUTO-TRIGGER — nieuwe signups krijgen meteen personal workspace
-- ============================================================================

create or replace function public.create_default_workspace_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_ws_id uuid;
begin
  insert into public.workspaces (name, slug, owner_id, type)
  values (
    'Persoonlijke workspace',
    'ws-' || replace(new.id::text, '-', ''),
    new.id,
    'personal'
  )
  returning id into new_ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_ws_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_workspace on auth.users;
create trigger on_auth_user_created_workspace
  after insert on auth.users
  for each row execute function public.create_default_workspace_for_user();

-- ============================================================================
-- 8. RLS POLICIES
-- ============================================================================

-- WORKSPACES — members zien hun workspaces, owners muteren
alter table public.workspaces enable row level security;

create policy "workspaces_select_member"
  on public.workspaces for select
  using (
    id in (
      select workspace_id from public.workspace_members
      where user_id = (select auth.uid())
    )
  );

create policy "workspaces_insert_self"
  on public.workspaces for insert
  with check (owner_id = (select auth.uid()));

create policy "workspaces_update_owner"
  on public.workspaces for update
  using (owner_id = (select auth.uid()));

create policy "workspaces_delete_owner"
  on public.workspaces for delete
  using (owner_id = (select auth.uid()));

-- WORKSPACE_MEMBERS — members van zelfde ws zien elkaar; admins muteren
alter table public.workspace_members enable row level security;

create policy "workspace_members_select_same_ws"
  on public.workspace_members for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = (select auth.uid())
    )
  );

create policy "workspace_members_insert_admin"
  on public.workspace_members for insert
  with check (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = (select auth.uid()) and role in ('owner', 'admin')
    )
  );

create policy "workspace_members_delete_admin"
  on public.workspace_members for delete
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = (select auth.uid()) and role in ('owner', 'admin')
    )
  );

create policy "workspace_members_update_admin"
  on public.workspace_members for update
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = (select auth.uid()) and role in ('owner', 'admin')
    )
  );

-- WORKSPACE_INVITES — alleen admins/owners van de workspace
alter table public.workspace_invites enable row level security;

create policy "workspace_invites_select_admin"
  on public.workspace_invites for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = (select auth.uid()) and role in ('owner', 'admin')
    )
  );

create policy "workspace_invites_insert_admin"
  on public.workspace_invites for insert
  with check (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = (select auth.uid()) and role in ('owner', 'admin')
    )
  );

create policy "workspace_invites_delete_admin"
  on public.workspace_invites for delete
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = (select auth.uid()) and role in ('owner', 'admin')
    )
  );

-- AUDITS — herschrijven naar workspace-membership met user_id fallback
drop policy if exists "audits_select_own" on public.audits;
drop policy if exists "audits_insert_own" on public.audits;
drop policy if exists "audits_update_own" on public.audits;
drop policy if exists "audits_delete_own" on public.audits;

create policy "audits_select_workspace_or_owner"
  on public.audits for select
  using (
    (workspace_id is not null and workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = (select auth.uid())
    ))
    or (workspace_id is null and user_id = (select auth.uid()))
  );

create policy "audits_insert_workspace_or_owner"
  on public.audits for insert
  with check (
    (workspace_id is not null and workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = (select auth.uid())
    ))
    or (workspace_id is null and user_id = (select auth.uid()))
  );

create policy "audits_update_workspace_or_owner"
  on public.audits for update
  using (
    (workspace_id is not null and workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = (select auth.uid())
    ))
    or (workspace_id is null and user_id = (select auth.uid()))
  );

create policy "audits_delete_workspace_or_owner"
  on public.audits for delete
  using (
    (workspace_id is not null and workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = (select auth.uid())
    ))
    or (workspace_id is null and user_id = (select auth.uid()))
  );
