'use server';

// Server-only actions die het billing-systeem exposen aan client
// components. page.tsx roept getQuotaInfo() aan voor de audit-knop
// om vooraf te checken of de user nog audits over heeft + om de
// "Je hebt nog X audits deze maand"-banner te tonen.

import { createClient } from '@/lib/supabase/server';
import { checkAuditQuota, getCurrentPlan } from '@/lib/billing';

export type QuotaInfo = {
  /** Ingelogd? */
  authenticated: boolean;
  /** Mag een nieuwe audit gestart worden? */
  ok: boolean;
  /** Hoeveel audits deze kalendermaand al gedaan? */
  used: number;
  /** Max audits per maand voor het huidige plan (null = onbeperkt) */
  quota: number | null;
  /** Slug van huidig plan */
  planSlug: string;
  /** Mooie naam van huidig plan */
  planName: string;
};

export async function getQuotaInfo(): Promise<QuotaInfo> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Anonieme bezoekers: geen server-side quota — localStorage-flow
  // werkt onbeperkt op één device. De cross-device + history-pull
  // is de prikkel om in te loggen, niet de aantallen.
  if (!user) {
    return {
      authenticated: false,
      ok: true,
      used: 0,
      quota: null,
      planSlug: 'free',
      planName: 'Probeer',
    };
  }

  const [{ plan }, quota] = await Promise.all([
    getCurrentPlan(user.id),
    checkAuditQuota(user.id),
  ]);

  return {
    authenticated: true,
    ok: quota.ok,
    used: quota.used,
    quota: quota.quota,
    planSlug: plan.slug,
    planName: plan.name,
  };
}
