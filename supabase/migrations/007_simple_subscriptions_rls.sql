-- 007 — Subscriptions-RLS naar dezelfde dead-simple vorm als 006 deed
-- voor audits.
--
-- Symptoom: na succesvolle test-checkout (oneoff-flow) staat de
-- subscription op 'active' in de DB (zichtbaar via admin client), maar
-- /account toont nog steeds het free-plan. Identiek aan het RLS-probleem
-- dat we voor audits in 006 fixten: de `(select auth.uid())`-wrap faalt
-- silent — query returnt 0 rijen ipv error.
--
-- Beslissing: drop de oude policy, recreate met pure `user_id = auth.uid()`
-- + `to authenticated` role-target. Identiek patroon als 006.
--
-- Plus payment_events: had geen policy (impliciet deny) — dat blijft zo,
-- alleen service_role kan lezen/schrijven. Geen wijziging nodig.
--
-- Idempotent. Veilig om opnieuw te draaien.

-- ============================================================================
-- Force RLS (nogmaals, idempotent)
-- ============================================================================
alter table public.subscriptions enable row level security;

-- ============================================================================
-- Drop alle oude subscriptions-policies
-- ============================================================================
drop policy if exists "subscriptions_select_own" on public.subscriptions;
drop policy if exists "subscriptions_owner_select" on public.subscriptions;

-- ============================================================================
-- Dead-simple: user ziet eigen subscriptions
-- ============================================================================
create policy "subscriptions_owner_select"
  on public.subscriptions
  for select
  to authenticated
  using (user_id = auth.uid());

-- Geen INSERT/UPDATE/DELETE policies — service_role (webhook + checkout-route)
-- regelt mutations. authenticated heeft geen schrijfrechten op subscriptions,
-- dat is correct.
