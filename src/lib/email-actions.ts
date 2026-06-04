'use server';

// Server-only actions voor outbound mails via Resend. Wordt vanuit
// page.tsx aangeroepen (fire-and-forget) na een succesvolle audit als
// de user een e-mailadres heeft opgegeven.

import { headers } from 'next/headers';
import { resendClient } from '@/lib/resend';
import { createClient } from '@/lib/supabase/server';
import { company } from '@/lib/data/company';
import { renderAuditEmail } from '@/lib/email/audit-report';
import { getResolvedBrandingForUser } from '@/lib/branding';
import type { AuditResult } from '@/lib/claude';

export type SendAuditInput = {
  to: string;
  webshopName: string;
  audit: AuditResult;
};

export async function sendAuditByEmail(input: SendAuditInput): Promise<{
  ok: boolean;
  error?: string;
}> {
  // Lichte input-validatie — Resend faalt anders alsnog maar dit
  // scheelt een API-call.
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.to.trim());
  if (!emailOk) {
    return { ok: false, error: 'Ongeldig e-mailadres.' };
  }

  // Bouw de link naar /account waar de user 't rapport kan herzien
  const hdrs = await headers();
  const host = hdrs.get('host') ?? company.domain;
  const proto = hdrs.get('x-forwarded-proto') ?? 'https';
  const reportUrl = `${proto}://${host}/account`;

  // White-label: branding van caller ophalen. Bij uitgelogde flow OF
  // user zonder branding → default Conversielek-stijl.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const branding = user ? await getResolvedBrandingForUser(user.id) : undefined;

  const { html, subject, text } = renderAuditEmail({
    webshopName: input.webshopName,
    audit: input.audit,
    reportUrl,
    branding,
  });

  try {
    const resend = resendClient();
    // Voor white-label: "From" toch op noreply@conversielek.nl (we hebben
    // geen verified SMTP-domein voor agency-emails). Reply-To op email
    // van de owner zou idealer zijn maar vereist gebruikers-input.
    const { error } = await resend.emails.send({
      from: `${branding?.brandName ?? company.tradeName} <noreply@${company.domain}>`,
      to: input.to.trim(),
      subject,
      html,
      text,
    });
    if (error) {
      console.error('[email] Resend rejected:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[email] send failed:', msg);
    return { ok: false, error: msg };
  }
}
