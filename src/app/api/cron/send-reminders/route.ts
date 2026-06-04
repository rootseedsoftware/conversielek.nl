// GET /api/cron/send-reminders
//
// Door Vercel Cron daily aangeroepen (zie vercel.json: "0 9 * * *" UTC).
// Stuurt audit-reminders naar users wier next_remind_at is verstreken.
//
// Security: Vercel cron-trigger zet automatisch x-vercel-cron header EN
// authorization Bearer met CRON_SECRET (als env-var gezet). Wij valideren
// beide om ongeautoriseerde manual hits te blokkeren.
//
// Failure-tolerant: één gefaalde email blokkeert niet de batch. We
// updaten next_remind_at alleen na succesvolle send zodat retries
// mogelijk zijn (volgende cron-run pakt 'm opnieuw mee).

import { NextRequest } from 'next/server';
import { listDueReminders, markReminderSent } from '@/lib/audit-reminders';
import { resendClient } from '@/lib/resend';
import { getResolvedBrandingForUser } from '@/lib/branding';
import { DEFAULT_RESOLVED_BRANDING, type ResolvedBranding } from '@/lib/branding-types';
import { company } from '@/lib/data/company';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // ---- Auth -------------------------------------------------------------
  // Vercel cron stuurt zowel het 'authorization' header met CRON_SECRET
  // (als env var gezet) als een 'user-agent: vercel-cron/1.0'. Accepteer
  // beide signalen.
  const authHeader = req.headers.get('authorization');
  const expectedToken = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get('user-agent')?.includes('vercel-cron');

  if (expectedToken) {
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (token !== expectedToken && !isVercelCron) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else if (!isVercelCron) {
    // Geen secret + niet door Vercel = weiger
    return Response.json(
      { error: 'CRON_SECRET niet ingesteld en geen vercel-cron header' },
      { status: 401 }
    );
  }

  // ---- Reminders ophalen + versturen -----------------------------------
  const dueList = await listDueReminders();
  let resend;
  try {
    resend = resendClient();
  } catch {
    return Response.json(
      { error: 'Resend niet geconfigureerd (RESEND_API_KEY ontbreekt)' },
      { status: 500 }
    );
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const reminder of dueList) {
    try {
      // Per reminder branding laden (extra DB-call OK voor MVP-volume).
      // Fallback naar default-Conversielek bij fout of geen branding.
      let branding: ResolvedBranding;
      try {
        branding = await getResolvedBrandingForUser(reminder.userId);
      } catch {
        branding = DEFAULT_RESOLVED_BRANDING;
      }

      const subject = `Tijd voor een nieuwe audit van ${reminder.webshopDisplayName}`;
      const html = buildReminderEmail({
        webshopName: reminder.webshopDisplayName,
        webshopUrl: reminder.webshopUrl,
        intervalDays: reminder.intervalDays,
        branding,
      });

      await resend.emails.send({
        from: `${branding.brandName} <noreply@${company.domain}>`,
        to: reminder.emailAddress,
        subject,
        html,
      });

      await markReminderSent(reminder.id, reminder.intervalDays);
      sent++;
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${reminder.id}: ${msg}`);
      console.error('[cron/send-reminders]', reminder.id, e);
    }
  }

  return Response.json({
    ok: true,
    total: dueList.length,
    sent,
    failed,
    errors: errors.slice(0, 10), // cap voor JSON-response
  });
}

// ---- Email template --------------------------------------------------------

function buildReminderEmail({
  webshopName,
  webshopUrl,
  intervalDays,
  branding,
}: {
  webshopName: string;
  webshopUrl: string | null;
  intervalDays: number;
  branding: ResolvedBranding;
}): string {
  const ctaUrl = `https://${company.domain}/?view=audit`;
  return `<!DOCTYPE html><html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0f172a; background: #f8fafc;">

<div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 14px rgba(15,23,42,0.08);">

  <div style="text-align: center; margin-bottom: 24px;">
    ${
      branding.logoUrl
        ? `<img src="${escapeHtml(branding.logoUrl)}" alt="${escapeHtml(branding.brandName)}" style="max-height:40px;max-width:160px;margin:0 auto 12px;display:block;" />`
        : ''
    }
    <div style="display: inline-block; padding: 8px 16px; background: ${branding.primaryHex}15; color: ${branding.primaryHex}; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
      ${intervalDays}-daagse reminder
    </div>
  </div>

  <h1 style="font-size: 26px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.2; text-align: center;">
    Tijd voor een nieuwe audit van<br>${escapeHtml(webshopName)}
  </h1>

  <p style="text-align: center; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
    ${intervalDays} dagen geleden deed je een audit. Met een verse audit zie je
    wat er beter werd én wat regressie ondervond. 5 minuten werk.
  </p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, ${branding.primaryHex}, ${branding.secondaryHex}); color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px;">
      Start audit nu →
    </a>
  </div>

  ${webshopUrl ? `<div style="text-align: center; font-size: 12px; color: #94a3b8; margin-bottom: 16px;">
    ${escapeHtml(webshopUrl)}
  </div>` : ''}

  <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 32px;">
    <p style="font-size: 12px; color: #64748b; line-height: 1.6; margin: 0;">
      <strong>Waarom audits herhalen?</strong> Een UX-audit is een momentopname.
      Je shop verandert continu — nieuwe producten, code-updates, third-party
      scripts. Regelmatige audits laten je zien of je aanpassingen écht conversie
      opleveren.
    </p>
  </div>

</div>

<div style="text-align: center; margin-top: 24px; font-size: 11px; color: #94a3b8; line-height: 1.6;">
  Wil je geen reminders meer?
  <a href="https://${company.domain}/account/schedules" style="color: ${branding.primaryHex};">Beheer voorkeuren</a>
  ${
    branding.isWhiteLabel
      ? `<br><span style="color:#cbd5e1;">Powered by <a href="https://${company.domain}" style="color:#94a3b8;">${escapeHtml(company.tradeName)}</a></span>`
      : `· <a href="https://${company.domain}" style="color: ${branding.primaryHex};">${escapeHtml(company.tradeName)}</a>`
  }
</div>

</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
