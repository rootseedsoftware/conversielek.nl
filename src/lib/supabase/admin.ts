// Admin Supabase client met service_role key. Omzeilt RLS — gebruik
// UITSLUITEND in server-only code (API routes, server actions) voor
// gevallen waar je géén user-context hebt (bv. Mollie webhook handler
// die anonymous binnenkomt, of admin-acties).
//
// NOOIT importeren in client-componenten. NOOIT exposen via NEXT_PUBLIC_.

import { createClient as createSbClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'Supabase admin client niet beschikbaar — NEXT_PUBLIC_SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY ontbreekt.'
    );
  }
  return createSbClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
