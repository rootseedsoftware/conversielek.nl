-- 010 — White-label branding voor Agency-tier (sprint M6).
--
-- Twee componenten:
--   1. branding_settings tabel (per user) met kleuren + footer-tekst
--   2. Storage-bucket 'branding' voor logo-bestanden (PNG/JPG max 500KB)
--
-- Agency uploadt eigen logo + kiest primary color → PDF-rapport gebruikt
-- die branding ipv onze default Conversielek-oranje. Klant ziet rapport
-- alsof het van de agency komt (white-label).
--
-- Tier-gating: SQL-niveau open voor alle users. UI-niveau gating
-- (alleen Agency-tier kan branding gebruiken) komt later in code zodra
-- Mollie groen is en we echte betalende klanten hebben.
--
-- Cascade: bij user-verwijdering → branding mee + Storage-object losse
-- cleanup nodig (geen automatic delete cross-system, doen we via
-- delete-user-trigger als/wanneer relevant).

-- ============================================================================
-- 1. BRANDING_SETTINGS — kleuren + tekst per user
-- ============================================================================

create table if not exists public.branding_settings (
  user_id           uuid         primary key references auth.users (id) on delete cascade,
  -- Kleuren in hex zonder hash, bv. "f97316". 6 chars exact zodat we 'm
  -- altijd kunnen voorvoegen met # in template literals.
  primary_color     text         check (primary_color is null or primary_color ~ '^[0-9a-fA-F]{6}$'),
  -- Voor accent / lichte achtergrondtinten. Optioneel; default afgeleid.
  secondary_color   text         check (secondary_color is null or secondary_color ~ '^[0-9a-fA-F]{6}$'),
  -- Brand-naam die in plaats van "Conversielek" in PDF-header verschijnt
  brand_name        text         check (brand_name is null or length(brand_name) <= 60),
  -- Storage-path naar logo (relatief vanuit branding-bucket), bv. "uid/logo.png"
  logo_path         text,
  -- Eigen footer-tekst die onder PDF verschijnt ipv standaard KvK-blok
  footer_text       text         check (footer_text is null or length(footer_text) <= 500),
  created_at        timestamptz  not null default now(),
  updated_at        timestamptz  not null default now()
);

-- ============================================================================
-- RLS — alleen owner kan branding lezen + muteren
-- ============================================================================
alter table public.branding_settings enable row level security;

drop policy if exists "branding_settings_select_own" on public.branding_settings;
create policy "branding_settings_select_own"
  on public.branding_settings
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "branding_settings_insert_own" on public.branding_settings;
create policy "branding_settings_insert_own"
  on public.branding_settings
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "branding_settings_update_own" on public.branding_settings;
create policy "branding_settings_update_own"
  on public.branding_settings
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "branding_settings_delete_own" on public.branding_settings;
create policy "branding_settings_delete_own"
  on public.branding_settings
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- 2. STORAGE BUCKET — logo uploads
-- ============================================================================
-- Public bucket = logo-URLs publiek leesbaar (correct: logos zijn niet
-- gevoelig en moeten via PDF-rapport zichtbaar zijn voor klanten met
-- alleen een share-link).
-- Path-conventie: <user_id>/logo.<ext>
-- RLS via storage.objects policies: alleen owner kan write, iedereen read.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'branding',
  'branding',
  true,
  524288,  -- 500 KB max per bestand (logos hoeven niet groot)
  array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS policies (op storage.objects schema)
-- Lezen: iedereen (public bucket impliceert dit al, maar expliciet voor zekerheid)
drop policy if exists "Branding logos publicly readable" on storage.objects;
create policy "Branding logos publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'branding');

-- Upload: alleen in eigen folder (eerste path-segment = user-id)
drop policy if exists "Branding logo upload by owner" on storage.objects;
create policy "Branding logo upload by owner"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'branding'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Update + delete: alleen owner van het bestand
drop policy if exists "Branding logo update by owner" on storage.objects;
create policy "Branding logo update by owner"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'branding'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Branding logo delete by owner" on storage.objects;
create policy "Branding logo delete by owner"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'branding'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
