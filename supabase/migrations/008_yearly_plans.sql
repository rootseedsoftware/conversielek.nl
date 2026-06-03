-- 008 — Sprint 6: Jaarlijkse pricing met 2 maanden korting.
--
-- Voegt twee nieuwe plan-rijen toe naast bestaande webshop/agency:
--   webshop_yearly  — €190/jaar (vs €19 × 12 = €228, dus 16.7% korting)
--   agency_yearly   — €590/jaar (vs €59 × 12 = €708, dus 16.7% korting)
--
-- Bestaande maandelijkse rijen blijven onveranderd. UI laat een toggle
-- "Maandelijks / Jaarlijks" zien op de pricing-sectie.
--
-- Plans-tabel structuur is hier al klaar voor: billing_interval-veld
-- bestaat al en accepteert 'yearly'. Geen schema-wijziging nodig.
--
-- Idempotent: ON CONFLICT op slug.

insert into public.plans (
  slug, name, description, price_cents, currency, billing_interval,
  audit_quota_per_month, features, is_active, sort_order
) values
  (
    'webshop_yearly',
    'Webshop — Jaarlijks',
    'Voor één webshop. Jaarbetaling = 2 maanden gratis.',
    19000,  -- €190,00 in centen
    'EUR',
    'yearly',
    null,   -- onbeperkt audits
    '["Alles van Webshop", "Jaarbetaling: 2 maanden gratis", "Voorspelbaardere kosten"]'::jsonb,
    true,
    21      -- net na webshop (sort_order=20)
  ),
  (
    'agency_yearly',
    'Agency — Jaarlijks',
    'Voor freelance UX''ers + bureaus. Jaarbetaling = 2 maanden gratis.',
    59000,  -- €590,00 in centen
    'EUR',
    'yearly',
    null,
    '["Alles van Agency", "Jaarbetaling: 2 maanden gratis", "Voorspelbaardere kosten"]'::jsonb,
    true,
    31      -- net na agency (sort_order=30)
  )
on conflict (slug) do update
  set name = EXCLUDED.name,
      description = EXCLUDED.description,
      price_cents = EXCLUDED.price_cents,
      billing_interval = EXCLUDED.billing_interval,
      features = EXCLUDED.features,
      is_active = EXCLUDED.is_active,
      sort_order = EXCLUDED.sort_order;
