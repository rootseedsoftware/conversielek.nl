// M8 admin — server-side toegangscheck voor /admin routes.
//
// Beslissing: env var ADMIN_EMAILS (comma-separated) ipv een aparte
// admin_users tabel. Drie redenen:
//   1. Voor MVP zijn er 1-2 admins (jij + evt. compagnon). Een tabel
//      is overkill — env var is sneller te beheren via Vercel UI.
//   2. Geen DB-round-trip nodig per request — env var is in-memory.
//   3. Migratie naar admin_users tabel later is triviaal — alleen
//      deze helper en de UserMenu-hint hoeven aangepast.
//
// Veiligheid:
//   - ADMIN_EMAILS heeft GEEN NEXT_PUBLIC_ prefix → blijft server-only
//   - Check vergelijkt lowercased trim (typo-proof)
//   - Niet-admins krijgen notFound() (404), niet redirect — verklap
//     geen bestaan van /admin
//
// Importeer ALLEEN vanuit Server Components / Server Actions.

import 'server-only';

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function parseAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Gooit notFound() als de huidige user geen admin is, of niet ingelogd.
 * Geeft de email terug bij succes (handig voor logging in admin-pages).
 */
export async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    notFound();
  }

  const admins = parseAdminEmails();
  if (admins.length === 0) {
    // Niemand geconfigureerd → admin-panel is effectief gesloten.
    // Logge dit zodat we het in productie zien als de env var ontbreekt.
    console.warn('[admin-auth] ADMIN_EMAILS env var niet ingesteld — alle toegang geweigerd.');
    notFound();
  }

  if (!admins.includes(user.email.toLowerCase())) {
    notFound();
  }

  return user.email;
}

/**
 * Non-throwing variant voor UI-gating (bv. UserMenu om "Admin"-link te tonen).
 * Returnt true/false, gooit niks.
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return false;

    const admins = parseAdminEmails();
    return admins.includes(user.email.toLowerCase());
  } catch {
    return false;
  }
}
