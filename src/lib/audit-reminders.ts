// Sprint 10 — Server helpers voor audit-reminders + score-regressie alerts.
//
// Drie soorten operaties:
//   1. Owner CRUD: createReminder, listMyReminders, toggleActive, deleteReminder
//   2. Cron-handler: listDueReminders + markReminderSent (admin-client)
//   3. Score-regressie: detectRegression bij saveAudit, sendRegressionAlert
//
// Regressie-detectie: bij elke nieuwe audit checken we of er een eerdere
// audit bestaat voor dezelfde webshop_key. Als die er is én de nieuwe
// score is ≥0.5 punt lager → email-alert (mits alert_on_regression true
// op de reminder, of altijd als reminder bestaat).

'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resendClient } from '@/lib/resend';
import { getResolvedBrandingForUser } from '@/lib/branding';
import { DEFAULT_RESOLVED_BRANDING } from '@/lib/branding-types';
import { company } from '@/lib/data/company';

export type AuditReminder = {
  id: string;
  webshopKey: string;
  webshopDisplayName: string;
  webshopUrl: string | null;
  intervalDays: number;
  emailAddress: string;
  alertOnRegression: boolean;
  active: boolean;
  lastRemindedAt: string | null;
  nextRemindAt: string;
  createdAt: string;
};

type DbRow = {
  id: string;
  webshop_key: string;
  webshop_display_name: string;
  webshop_url: string | null;
  interval_days: number;
  email_address: string;
  alert_on_regression: boolean;
  active: boolean;
  last_reminded_at: string | null;
  next_remind_at: string;
  created_at: string;
};

function rowToReminder(r: DbRow): AuditReminder {
  return {
    id: r.id,
    webshopKey: r.webshop_key,
    webshopDisplayName: r.webshop_display_name,
    webshopUrl: r.webshop_url,
    intervalDays: r.interval_days,
    emailAddress: r.email_address,
    alertOnRegression: r.alert_on_regression,
    active: r.active,
    lastRemindedAt: r.last_reminded_at,
    nextRemindAt: r.next_remind_at,
    createdAt: r.created_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// OWNER CRUD
// ─────────────────────────────────────────────────────────────────────────

export type CreateReminderInput = {
  webshopKey: string;
  webshopDisplayName: string;
  webshopUrl?: string;
  intervalDays: number;
  emailAddress?: string;
  alertOnRegression?: boolean;
};

export async function createReminder(
  input: CreateReminderInput
): Promise<{ ok: true; reminder: AuditReminder } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: 'Niet ingelogd.' };

  const nextRemind = new Date();
  nextRemind.setDate(nextRemind.getDate() + input.intervalDays);

  const { data, error } = await supabase
    .from('audit_reminders')
    .upsert(
      {
        user_id: user.id,
        webshop_key: input.webshopKey,
        webshop_display_name: input.webshopDisplayName,
        webshop_url: input.webshopUrl ?? null,
        interval_days: input.intervalDays,
        email_address: input.emailAddress ?? user.email,
        alert_on_regression: input.alertOnRegression ?? true,
        active: true,
        next_remind_at: nextRemind.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,webshop_key' }
    )
    .select(
      'id, webshop_key, webshop_display_name, webshop_url, interval_days, email_address, alert_on_regression, active, last_reminded_at, next_remind_at, created_at'
    )
    .single();

  if (error || !data) {
    console.error('[createReminder] insert failed:', error);
    return { ok: false, error: 'Kon reminder niet opslaan.' };
  }
  return { ok: true, reminder: rowToReminder(data as DbRow) };
}

export async function listMyReminders(): Promise<AuditReminder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('audit_reminders')
    .select(
      'id, webshop_key, webshop_display_name, webshop_url, interval_days, email_address, alert_on_regression, active, last_reminded_at, next_remind_at, created_at'
    )
    .order('next_remind_at', { ascending: true });

  if (error || !data) return [];
  return (data as DbRow[]).map(rowToReminder);
}

export async function toggleReminderActive(
  id: string,
  active: boolean
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('audit_reminders')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function deleteReminder(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('audit_reminders').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────
// CRON-HANDLER — gebruik vanuit /api/cron/send-reminders
// ─────────────────────────────────────────────────────────────────────────

export type DueReminder = AuditReminder & { userEmail: string; userId: string };

/**
 * Alle reminders met next_remind_at <= now() AND active. Gebruikt admin-
 * client (service-role, bypass RLS) want cron-handler heeft geen user-
 * sessie.
 */
export async function listDueReminders(): Promise<DueReminder[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('audit_reminders')
    .select(
      'id, user_id, webshop_key, webshop_display_name, webshop_url, interval_days, email_address, alert_on_regression, active, last_reminded_at, next_remind_at, created_at'
    )
    .eq('active', true)
    .lte('next_remind_at', new Date().toISOString());

  if (error || !data) return [];

  // userId expliciet exposen — cron-handler heeft 'm nodig voor white-
  // label branding lookup per reminder.
  return (data as Array<DbRow & { user_id: string }>).map((r) => ({
    ...rowToReminder(r),
    userId: r.user_id,
    userEmail: r.email_address, // email-address staat al in de reminder zelf
  }));
}

/**
 * Update next_remind_at na succesvolle verzending. Cron-handler roept
 * dit aan na elke email-batch.
 */
export async function markReminderSent(id: string, intervalDays: number): Promise<void> {
  const admin = createAdminClient();
  const next = new Date();
  next.setDate(next.getDate() + intervalDays);
  await admin
    .from('audit_reminders')
    .update({
      last_reminded_at: new Date().toISOString(),
      next_remind_at: next.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}

// ─────────────────────────────────────────────────────────────────────────
// SCORE-REGRESSIE DETECTIE
// ─────────────────────────────────────────────────────────────────────────

/**
 * Wordt aangeroepen direct na een nieuwe audit-save. Checkt of er een
 * eerdere audit bestond voor dezelfde webshop_key. Bij score-drop ≥0.5
 * punt: email-alert via Resend.
 *
 * Bij geen reminder of alertOnRegression=false: skip silently.
 * Fail-silent: een gefaalde email-alert mag de audit-save niet breken.
 */
export async function checkAndAlertRegression(input: {
  userId: string;
  webshopKey: string;
  newScore: number;
}): Promise<{ alerted: boolean; previousScore?: number; delta?: number }> {
  try {
    const admin = createAdminClient();

    // 1. Reminder ophalen — alleen reageren als user expliciet alerts wil
    const { data: reminder } = await admin
      .from('audit_reminders')
      .select('email_address, alert_on_regression, webshop_display_name')
      .eq('user_id', input.userId)
      .eq('webshop_key', input.webshopKey)
      .maybeSingle();

    if (!reminder || !reminder.alert_on_regression) {
      return { alerted: false };
    }

    // 2. Vorige audit ophalen (laatste audit van deze user voor deze webshop)
    //    Cross-check op webshop_url + webshop_name (genormaliseerd via key
    //    is moeilijker zonder de exacte normalisatie hier te dupliceren —
    //    daarom: zoek alle audits van user, neem voor-laatste voor zelfde
    //    display-name match).
    const { data: previousAudits } = await admin
      .from('audits')
      .select('audit')
      .eq('user_id', input.userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!previousAudits || previousAudits.length < 2) {
      // Alleen de net-bewaarde audit zelf bestaat → geen vergelijking mogelijk
      return { alerted: false };
    }

    // Eerste = net opgeslagen (newScore), tweede = vorige
    type Row = { audit: { overall_score?: number } | null };
    const rows = previousAudits as Row[];
    const previousScore = rows[1]?.audit?.overall_score;
    if (typeof previousScore !== 'number') return { alerted: false };

    const delta = input.newScore - previousScore;
    if (delta > -0.5) {
      // Geen significante regressie
      return { alerted: false, previousScore, delta };
    }

    // 3. Email versturen (resendClient throwt bij ontbrekende key — wrap)
    let resend;
    try {
      resend = resendClient();
    } catch {
      console.warn('[regression-alert] Resend not configured');
      return { alerted: false };
    }

    // White-label: branding van audit-owner laden. Fallback bij fout.
    let branding;
    try {
      branding = await getResolvedBrandingForUser(input.userId);
    } catch {
      branding = DEFAULT_RESOLVED_BRANDING;
    }

    const subject = `Score-regressie: ${reminder.webshop_display_name} ${previousScore.toFixed(1)} → ${input.newScore.toFixed(1)}`;
    const html = `<!DOCTYPE html><html><body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0f172a;">
<div style="background: linear-gradient(135deg, ${branding.primaryHex}, ${branding.secondaryHex}); color: white; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
  ${
    branding.logoUrl
      ? `<img src="${escapeHtmlMin(branding.logoUrl)}" alt="${escapeHtmlMin(branding.brandName)}" style="max-height:32px;max-width:140px;margin-bottom:12px;display:block;" />`
      : ''
  }
  <h1 style="margin: 0 0 8px 0; font-size: 20px;">⚠ Score-regressie gedetecteerd</h1>
  <p style="margin: 0; opacity: 0.9; font-size: 14px;">${escapeHtmlMin(reminder.webshop_display_name as string)}</p>
</div>
<div style="display: flex; gap: 12px; margin-bottom: 24px;">
  <div style="flex: 1; padding: 16px; background: #f8fafc; border-radius: 10px; text-align: center;">
    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Vorige score</div>
    <div style="font-size: 32px; font-weight: 800; color: #64748b;">${previousScore.toFixed(1)}</div>
  </div>
  <div style="flex: 1; padding: 16px; background: #fef2f2; border-radius: 10px; text-align: center;">
    <div style="font-size: 11px; color: #991b1b; text-transform: uppercase; letter-spacing: 1px;">Nieuwe score</div>
    <div style="font-size: 32px; font-weight: 800; color: #dc2626;">${input.newScore.toFixed(1)}</div>
    <div style="font-size: 12px; color: #dc2626; font-weight: 600; margin-top: 4px;">${delta.toFixed(1)}</div>
  </div>
</div>
<p style="line-height: 1.6; color: #334155;">Je laatste audit voor <strong>${escapeHtmlMin(reminder.webshop_display_name as string)}</strong> liet een lagere score zien dan de vorige. Mogelijk is er iets veranderd op je site dat de gebruikerservaring beïnvloedt.</p>
<p style="margin-top: 24px;">
  <a href="https://${company.domain}" style="display: inline-block; background: ${branding.primaryHex}; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Bekijk audit in dashboard</a>
</p>
<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px 0;">
<p style="font-size: 11px; color: #94a3b8; line-height: 1.6;">
  Je krijgt deze melding omdat je regressie-alerts hebt aangezet voor deze webshop.
  Beheer voorkeuren via je <a href="https://${company.domain}/account/schedules" style="color: ${branding.primaryHex};">reminder-instellingen</a>.
  ${branding.isWhiteLabel ? `<br>Powered by <a href="https://${company.domain}" style="color:#94a3b8;">${escapeHtmlMin(company.tradeName)}</a>` : ''}
</p>
</body></html>`;

    await resend.emails.send({
      from: `${branding.brandName} <noreply@${company.domain}>`,
      to: reminder.email_address as string,
      subject,
      html,
    });

    return { alerted: true, previousScore, delta };
  } catch (e) {
    console.error('[checkAndAlertRegression] failed:', e);
    return { alerted: false };
  }
}

/**
 * Minimal HTML-escape helper voor regressie-alert template.
 * Pure server-side, geen client exposure. Behoudt < > & " ' safe.
 */
function escapeHtmlMin(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
