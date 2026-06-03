// Sprint M6 — Server helpers voor branding-settings.
//
// Twee soorten lookups:
//   1. getMyBranding(): voor de ingelogde user (Server Action voor /account/branding)
//   2. getUserBranding(userId): voor de PDF-generator (kan vanuit Server Action
//      worden aangeroepen waarin we de audit + branding parallel ophalen)
//
// Logo's: opgeslagen in Supabase Storage bucket 'branding' onder
// pad <user_id>/<filename>. Public bucket → URL is direct browser-leesbaar
// zonder auth, perfect voor PDF-embed (en share-link consumers).

'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeHex } from '@/lib/branding-types';
import type { BrandingSettings } from '@/lib/branding-types';

// ---- Row-mapping ---------------------------------------------------------

type DbRow = {
  primary_color: string | null;
  secondary_color: string | null;
  brand_name: string | null;
  logo_path: string | null;
  footer_text: string | null;
};

function rowToBranding(row: DbRow): BrandingSettings {
  return {
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    brandName: row.brand_name,
    logoPath: row.logo_path,
    footerText: row.footer_text,
  };
}

// ---- Public URL helper ---------------------------------------------------

/**
 * Bouw de publieke Supabase Storage URL voor een logo-path.
 * Werkt zonder auth (bucket is public). Used in PDF + UI preview.
 */
export async function getLogoPublicUrl(logoPath: string | null): Promise<string | null> {
  if (!logoPath) return null;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return null;
  // Pattern: <base>/storage/v1/object/public/branding/<path>
  return `${baseUrl}/storage/v1/object/public/branding/${logoPath}`;
}

// ---- Read ----------------------------------------------------------------

export async function getMyBranding(): Promise<BrandingSettings | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('branding_settings')
    .select('primary_color, secondary_color, brand_name, logo_path, footer_text')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) return null;
  return rowToBranding(data as DbRow);
}

/**
 * Voor server-side PDF-generatie: branding ophalen voor een specifieke user.
 * Gebruikt admin-client (bypass RLS) want kan worden aangeroepen vanuit
 * contexten waar de aanvragende user geen toegang heeft tot de owner-rij
 * (bv. share-link page bekijken door anonieme bezoeker).
 */
export async function getUserBranding(userId: string): Promise<BrandingSettings | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('branding_settings')
    .select('primary_color, secondary_color, brand_name, logo_path, footer_text')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return rowToBranding(data as DbRow);
}

// ---- Save ----------------------------------------------------------------

export type SaveBrandingInput = {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  brandName?: string | null;
  logoPath?: string | null;
  footerText?: string | null;
};

/**
 * Upserts branding voor de huidige user. Kleur-velden worden via
 * normalizeHex genormaliseerd (zonder # prefix, lowercase). Null = veld
 * wissen.
 */
export async function saveMyBranding(
  input: SaveBrandingInput
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Niet ingelogd.' };

  // Normaliseer kleuren — laat undefined met rust (= niet aanraken), normaliseer alleen wanneer expliciet meegegeven.
  const row: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };
  if (input.primaryColor !== undefined) {
    row.primary_color = input.primaryColor ? normalizeHex(input.primaryColor) : null;
  }
  if (input.secondaryColor !== undefined) {
    row.secondary_color = input.secondaryColor ? normalizeHex(input.secondaryColor) : null;
  }
  if (input.brandName !== undefined) {
    row.brand_name = input.brandName?.trim() || null;
  }
  if (input.logoPath !== undefined) {
    row.logo_path = input.logoPath;
  }
  if (input.footerText !== undefined) {
    row.footer_text = input.footerText?.trim() || null;
  }

  const { error } = await supabase
    .from('branding_settings')
    .upsert(row, { onConflict: 'user_id' });

  if (error) {
    console.error('[saveMyBranding] upsert failed:', error);
    return { ok: false, error: 'Kon branding niet opslaan.' };
  }
  return { ok: true };
}

/**
 * Verwijdert het opgeslagen logo (zowel Storage-bestand als DB-veld).
 * Toleert ontbrekend Storage-bestand silently.
 */
export async function deleteMyLogo(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Niet ingelogd.' };

  // Lees huidige logo-path
  const { data: current } = await supabase
    .from('branding_settings')
    .select('logo_path')
    .eq('user_id', user.id)
    .maybeSingle();

  const path = (current?.logo_path as string | undefined) ?? null;

  // Storage delete (silent als bestand niet bestaat)
  if (path) {
    await supabase.storage.from('branding').remove([path]);
  }

  // DB-veld leegmaken
  const { error } = await supabase
    .from('branding_settings')
    .upsert(
      { user_id: user.id, logo_path: null, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('[deleteMyLogo] db update failed:', error);
    return { ok: false, error: 'Kon logo niet verwijderen.' };
  }
  return { ok: true };
}
