-- 009 — Audit share-links voor klant-portal (Agency-feature).
--
-- Use-case: agency doet audit voor klant → klikt "Deel met klant" → krijgt
-- unieke URL die de klant zonder Conversielek-account kan openen.
-- Klant ziet read-only versie van het rapport.
--
-- Niet alleen voor Agency-tier — als sales-vehicle ook waardevol voor
-- Webshop-tier ("stuur rapport naar je business partner"). UI-gating kan
-- later per tier als nodig.
--
-- Token: 32 hex chars (16 bytes random) = ~3×10^38 mogelijkheden, brute
-- force onmogelijk. Gegenereerd via gen_random_bytes() in default-clause.
--
-- Toegangs-tracking: access_count + last_accessed_at zodat de eigenaar
-- ziet of klant heeft gekeken (sales-signaal).
--
-- Cascade: bij verwijderen audit → shares cascaden mee (data-consistency).

create table if not exists public.audit_shares (
  token             text         primary key default encode(gen_random_bytes(16), 'hex'),
  audit_id          uuid         not null references public.audits (id) on delete cascade,
  created_by        uuid         references auth.users (id) on delete set null,
  created_at        timestamptz  not null default now(),
  expires_at        timestamptz, -- null = onbeperkt (in MVP altijd null)
  access_count      integer      not null default 0,
  last_accessed_at  timestamptz,
  -- Optioneel: aangepaste begroeting voor de klant
  recipient_name    text,
  recipient_email   text,
  note              text         -- vrij tekstveld voor agency: "Voor Jan v.d. Berg, deadline 15 jun"
);

create index if not exists audit_shares_audit_id_idx on public.audit_shares (audit_id);
create index if not exists audit_shares_created_by_idx on public.audit_shares (created_by);

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.audit_shares enable row level security;

-- SELECT — user ziet alleen shares die hij zelf heeft aangemaakt (voor de
-- admin-UI "welke links heb ik uitgedeeld?"). Public access via token
-- gaat via service-role API-route, niet via RLS.
drop policy if exists "audit_shares_select_own" on public.audit_shares;
create policy "audit_shares_select_own"
  on public.audit_shares
  for select
  to authenticated
  using (created_by = auth.uid());

-- INSERT — user kan share aanmaken voor audits waar hij eigenaar van is.
-- We checken in de Server Action zelf óók of de audit.user_id = caller,
-- maar deze RLS is een veiligheidsnet.
drop policy if exists "audit_shares_insert_own" on public.audit_shares;
create policy "audit_shares_insert_own"
  on public.audit_shares
  for insert
  to authenticated
  with check (created_by = auth.uid());

-- DELETE — user kan eigen shares intrekken.
drop policy if exists "audit_shares_delete_own" on public.audit_shares;
create policy "audit_shares_delete_own"
  on public.audit_shares
  for delete
  to authenticated
  using (created_by = auth.uid());

-- Geen UPDATE policy = updates alleen via service-role (voor access_count
-- increment uit de public share-page). Correct.
