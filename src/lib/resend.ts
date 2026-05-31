// Resend client voor onze eigen API-calls (audit-rapport per mail,
// later welkomstmail, betalingsbevestigingen). Apart van de Supabase
// SMTP-config — die gebruikt Resend voor auth-mails (wachtwoord-reset
// etc.) via SMTP-protocol, deze module roept Resend's REST API direct.

import { Resend } from 'resend';

let cached: Resend | null = null;

export function resendClient(): Resend {
  if (cached) return cached;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY ontbreekt — voeg toe in Vercel env vars (Sensitive, alle env).'
    );
  }
  cached = new Resend(apiKey);
  return cached;
}
