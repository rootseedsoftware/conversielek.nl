// Sprint M6 — Gedeelde types voor branding.
//
// Client en server gebruiken dezelfde shape. Kleur-waarden zijn altijd
// 6-char hex zonder hash (bv. "f97316") zodat we 'm in template literals
// kunnen prefixen met # naar believen.

export type BrandingSettings = {
  /** Primaire kleur als 6-char hex zonder hash (bv. "f97316"). Null = default oranje. */
  primaryColor: string | null;
  /** Optionele secundaire/accent-kleur. Null = afgeleid van primary. */
  secondaryColor: string | null;
  /** Brand-naam in PDF-header. Null = "Conversielek" default. */
  brandName: string | null;
  /** Storage path naar logo (bv. "uid/logo.png"). Null = geen logo. */
  logoPath: string | null;
  /** Custom footer-tekst. Null = standaard KvK-blok. */
  footerText: string | null;
};

/** Hex-string normaliseren: strip #, lowercase. Returnt null bij invalid. */
export function normalizeHex(input: string): string | null {
  if (!input) return null;
  const stripped = input.replace(/^#/, '').toLowerCase().trim();
  if (!/^[0-9a-f]{6}$/.test(stripped)) return null;
  return stripped;
}

/** Default Conversielek-branding gebruikt als user geen overrides heeft. */
export const defaultBranding: BrandingSettings = {
  primaryColor: 'f97316', // Tailwind orange-500
  secondaryColor: 'dc2626', // Tailwind red-600
  brandName: null,
  logoPath: null,
  footerText: null,
};

/** Returns een BrandingSettings met defaults gevuld voor null-velden. */
export function applyBrandingDefaults(b: BrandingSettings | null): BrandingSettings {
  if (!b) return defaultBranding;
  return {
    primaryColor: b.primaryColor ?? defaultBranding.primaryColor,
    secondaryColor: b.secondaryColor ?? defaultBranding.secondaryColor,
    brandName: b.brandName,
    logoPath: b.logoPath,
    footerText: b.footerText,
  };
}
