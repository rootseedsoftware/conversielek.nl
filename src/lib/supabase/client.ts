// Browser-side Supabase client (voor 'use client' componenten).
// Gebruikt anon-key — RLS-policies in Postgres beschermen data per user.

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
