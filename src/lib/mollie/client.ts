// Server-side Mollie client. MOLLIE_API_KEY env var bepaalt automatisch
// test- of live-mode (Mollie keys beginnen met test_ of live_).

import createMollieClient, { type MollieClient } from '@mollie/api-client';

let cached: MollieClient | null = null;

export function mollieClient(): MollieClient {
  if (cached) return cached;
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) {
    throw new Error('MOLLIE_API_KEY ontbreekt — zet die in Vercel env vars.');
  }
  cached = createMollieClient({ apiKey });
  return cached;
}
