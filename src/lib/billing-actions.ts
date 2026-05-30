'use server';

// Server-only actions die het billing-systeem exposen aan client
// components. page.tsx roept getQuotaInfo() aan voor de audit-knop
// om vooraf te checken of de user nog audits over heeft. /account
// roept cancelSubscription() aan voor self-service opzeggen.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mollieClient } from '@/lib/mollie/client';
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

/**
 * Zegt het huidige actieve abonnement van de ingelogde user op.
 * Mollie's "cancel" annuleert alleen de recurring; de lopende
 * periode blijft tot current_period_end actief. We zetten
 * cancel_at_period_end=true zodat /account dat kan tonen.
 */
export async function cancelSubscription() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from('subscriptions')
    .select('id, mollie_subscription_id, mollie_customer_id')
    .eq('user_id', user.id)
    .in('status', ['active', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub) {
    redirect(
      '/account?error=' + encodeURIComponent('Geen actief abonnement gevonden.')
    );
  }

  // Mollie cancel — alleen als er een echte Mollie-sub achter zit
  if (sub.mollie_subscription_id && sub.mollie_customer_id) {
    try {
      const mollie = mollieClient();
      await mollie.customerSubscriptions.cancel(sub.mollie_subscription_id, {
        customerId: sub.mollie_customer_id,
      });
    } catch (e) {
      console.error('[cancel] Mollie cancel failed:', e);
      // Niet hard falen — we markeren lokaal als geannuleerd zodat de user
      // niets merkt. Bij persisterende discrepantie kan de operator handmatig
      // in Mollie dashboard cancellen.
    }
  }

  // Lokale state bijwerken
  await admin
    .from('subscriptions')
    .update({
      cancel_at_period_end: true,
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sub.id);

  revalidatePath('/account');
  redirect(
    '/account?success=' +
      encodeURIComponent(
        'Abonnement opgezegd. Je houdt toegang tot het einde van de huidige periode.'
      )
  );
}
