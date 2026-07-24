// Server-side Mollie client.
//
// Twee env-vars worden gelezen in deze volgorde:
//   1. MOLLIE_API_KEY_LIVE  — productie live-key (Sensitive + Production-only
//      in Vercel). Gebruikt zodra 'ie bestaat, ongeacht wat MOLLIE_API_KEY
//      bevat. Reden voor split: Vercel laat een bestaande env-var later
//      niet meer op Sensitive/scope-restricted zetten, dus is 't makkelijker
//      om de live-key in een aparte Sensitive-var te bewaren en dev-fallback
//      in de open var te houden.
//   2. MOLLIE_API_KEY       — fallback voor Preview/Development als
//      MOLLIE_API_KEY_LIVE daar niet gezet is. Typisch een test_-key.
//
// De Mollie SDK detecteert automatisch of het een test_ of live_ key is en
// route't naar de bijbehorende endpoint — geen extra config nodig.

import createMollieClient, { type MollieClient } from '@mollie/api-client';

let cached: MollieClient | null = null;

/**
 * Resolves the effective Mollie API-key voor deze omgeving.
 * Wordt ook door /api/billing/checkout + /api/billing/diagnose gebruikt
 * zodat er één bron van waarheid is voor "welke key draait er nu".
 */
export function getMollieApiKey(): string | null {
  return process.env.MOLLIE_API_KEY_LIVE || process.env.MOLLIE_API_KEY || null;
}

export function mollieClient(): MollieClient {
  if (cached) return cached;
  const apiKey = getMollieApiKey();
  if (!apiKey) {
    throw new Error(
      'Mollie API-key ontbreekt — zet MOLLIE_API_KEY_LIVE (productie) of MOLLIE_API_KEY (dev) in Vercel env vars.'
    );
  }
  cached = createMollieClient({ apiKey });
  return cached;
}
