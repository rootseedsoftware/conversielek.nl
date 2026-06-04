// Sprint 8 (klant-portal) — Server helpers voor share-tokens.
//
// Twee categorieën operaties:
//   1. Authenticated user creëert/bekijkt/intrekt eigen shares
//      → user-context Supabase client (RLS-gated)
//   2. Public bezoeker opent /share/[token]
//      → admin client (service-role) want geen auth-context. We checken
//        zelf de token-geldigheid + expires_at in code.
//
// Tracking: bij elke public access incrementeren we access_count + zetten
// last_accessed_at. Daarmee kan de agency in z'n eigen admin zien "klant
// heeft 3x gekeken, laatst gisteren".

'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { company } from '@/lib/data/company';
import { getUserBranding, resolveBranding } from '@/lib/branding';
import type { ResolvedBranding } from '@/lib/branding-types';
import type { AuditResult } from '@/lib/claude';
import type { FlowType } from '@/lib/data/flow-types';

// LET OP: ResolvedBranding type wordt NIET re-exported uit 'use server'
// files — share-page importeert direct uit @/lib/branding-types.

export type AuditShare = {
  token: string;
  auditId: string;
  createdAt: string;
  expiresAt: string | null;
  accessCount: number;
  lastAccessedAt: string | null;
  recipientName: string | null;
  recipientEmail: string | null;
  note: string | null;
};

export type SharedAuditPayload = {
  share: AuditShare;
  audit: {
    id: string;
    createdAt: string;
    webshopName: string;
    webshopUrl: string | null;
    productCategory: string;
    flowType: FlowType['value'];
    result: AuditResult;
  };
  /** Sprint M6-vervolg: resolved branding van de audit-eigenaar. */
  branding: ResolvedBranding;
};

// ─────────────────────────────────────────────────────────────────────────
// Branding-resolution — verplaatst naar /lib/branding.ts voor hergebruik
// in email-templates. resolveBranding wordt geïmporteerd bovenin.
// ─────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────
// AUTHENTICATED — eigen shares beheren
// ─────────────────────────────────────────────────────────────────────────

/**
 * Maakt een nieuwe share-link voor een audit. Caller moet eigenaar van
 * de audit zijn (RLS-policy op audits filtert dit al).
 *
 * Returnt het token + de volledige URL die de agency kan kopiëren.
 */
export async function createAuditShare(input: {
  auditId: string;
  recipientName?: string;
  recipientEmail?: string;
  note?: string;
}): Promise<{ token: string; url: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Niet ingelogd.' };

  // Eerst valideren dat user eigenaar is van de audit (RLS op audits doet
  // dit ook, maar we willen een duidelijke foutmelding ipv silent zero rows)
  const { data: audit, error: auditErr } = await supabase
    .from('audits')
    .select('id, user_id')
    .eq('id', input.auditId)
    .maybeSingle();
  if (auditErr || !audit) return { error: 'Audit niet gevonden of geen toegang.' };
  if (audit.user_id !== user.id) return { error: 'Geen rechten op deze audit.' };

  const { data, error } = await supabase
    .from('audit_shares')
    .insert({
      audit_id: input.auditId,
      created_by: user.id,
      recipient_name: input.recipientName ?? null,
      recipient_email: input.recipientEmail ?? null,
      note: input.note ?? null,
    })
    .select('token')
    .single();

  if (error || !data) {
    console.error('[createAuditShare] insert failed:', error);
    return { error: 'Kon share-link niet aanmaken.' };
  }

  // Build absolute URL. Bewust GEEN VERCEL_URL meer — die geeft de
  // preview-deploy-URL (bv. project-zw80y-...vercel.app) die de oude
  // project-naam bevat, niet ons production-domain. Gebruik altijd
  // company.url (= conversielek.nl). NEXT_PUBLIC_SITE_URL als override
  // voor lokale dev (bv. http://localhost:3000).
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? company.url;

  return {
    token: data.token,
    url: `${origin}/share/${data.token}`,
  };
}

/**
 * Alle shares die de huidige user heeft uitgegeven voor een specifieke audit.
 * Voor "ingetrokken"-UI en het tonen van access-counts in de eigen rapport-view.
 */
export async function listAuditShares(auditId: string): Promise<AuditShare[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('audit_shares')
    .select(
      'token, audit_id, created_at, expires_at, access_count, last_accessed_at, recipient_name, recipient_email, note'
    )
    .eq('audit_id', auditId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map((r) => ({
    token: r.token as string,
    auditId: r.audit_id as string,
    createdAt: r.created_at as string,
    expiresAt: (r.expires_at as string | null) ?? null,
    accessCount: r.access_count as number,
    lastAccessedAt: (r.last_accessed_at as string | null) ?? null,
    recipientName: (r.recipient_name as string | null) ?? null,
    recipientEmail: (r.recipient_email as string | null) ?? null,
    note: (r.note as string | null) ?? null,
  }));
}

/** Trekt een share-link in. Caller moet eigenaar zijn (RLS-gated). */
export async function revokeAuditShare(token: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('audit_shares').delete().eq('token', token);
  if (error) {
    console.error('[revokeAuditShare] delete failed:', error);
    return { ok: false, error: 'Kon link niet intrekken.' };
  }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────
// PUBLIC — share-token resolven (vanuit /share/[token] page)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Resolved een token naar de bijbehorende audit-data. Geen auth-context;
 * gebruikt service-role client. Logt access voor sales-signaal aan agency.
 *
 * Returnt `null` als token ongeldig, niet bestaat, of verlopen is.
 */
export async function resolveSharedAudit(token: string): Promise<SharedAuditPayload | null> {
  if (!token || token.length !== 32) return null;

  const admin = createAdminClient();

  // 1. Share ophalen
  const { data: shareRow, error: shareErr } = await admin
    .from('audit_shares')
    .select(
      'token, audit_id, created_at, expires_at, access_count, last_accessed_at, recipient_name, recipient_email, note'
    )
    .eq('token', token)
    .maybeSingle();

  if (shareErr || !shareRow) return null;

  // 2. Expires check
  if (shareRow.expires_at) {
    const exp = new Date(shareRow.expires_at as string).getTime();
    if (exp < Date.now()) return null;
  }

  // 3. Audit ophalen via admin-client (bypass RLS — public share-toegang)
  const { data: auditRow, error: auditErr } = await admin
    .from('audits')
    .select(
      'id, created_at, user_id, webshop_name, webshop_url, product_category, flow_type, audit'
    )
    .eq('id', shareRow.audit_id)
    .maybeSingle();

  if (auditErr || !auditRow) return null;

  // 3b. Branding van audit-eigenaar (sprint M6-vervolg: white-label share-page)
  const rawBranding = await getUserBranding(auditRow.user_id as string);
  const branding = await resolveBranding(rawBranding);

  // 4. Access tracken — fire-and-forget, niet blokken op een falende update
  void admin
    .from('audit_shares')
    .update({
      access_count: (shareRow.access_count as number) + 1,
      last_accessed_at: new Date().toISOString(),
    })
    .eq('token', token);

  return {
    share: {
      token: shareRow.token as string,
      auditId: shareRow.audit_id as string,
      createdAt: shareRow.created_at as string,
      expiresAt: (shareRow.expires_at as string | null) ?? null,
      accessCount: (shareRow.access_count as number) + 1,
      lastAccessedAt: new Date().toISOString(),
      recipientName: (shareRow.recipient_name as string | null) ?? null,
      recipientEmail: (shareRow.recipient_email as string | null) ?? null,
      note: (shareRow.note as string | null) ?? null,
    },
    audit: {
      id: auditRow.id as string,
      createdAt: auditRow.created_at as string,
      webshopName: auditRow.webshop_name as string,
      webshopUrl: (auditRow.webshop_url as string | null) ?? null,
      productCategory: auditRow.product_category as string,
      flowType: auditRow.flow_type as FlowType['value'],
      result: auditRow.audit as AuditResult,
    },
    branding,
  };
}
