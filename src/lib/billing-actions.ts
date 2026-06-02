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

/**
 * Mollie-sync voor de ingelogde user — zoekt alle incomplete subscriptions
 * van deze user, checkt bij Mollie of er paid payments zijn, activeert die
 * lokaal. Webhook-onafhankelijk.
 *
 * Wordt aangeroepen vanuit /billing/return zodat de user direct na de
 * Mollie checkout de juiste status ziet, ook als Mollie's webhook nog niet
 * (of nooit) bij ons aankomt.
 *
 * Verschil met admin-actions.syncSubscriptionFromMollie:
 *   - Geen requireAdmin — gebruikt user-session in plaats
 *   - Filtert strikt op user_id (kan niemand anders' sub triggeren)
 *   - Loopt over ALLE incomplete subs van user, niet één specifieke id
 */
export async function syncMyPendingSubscription(): Promise<{
  activated: number;
  message: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { activated: 0, message: 'Niet ingelogd.' };
  }

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from('subscriptions')
    .select('id, mollie_customer_id, status')
    .eq('user_id', user.id)
    .eq('status', 'incomplete');

  if (!subs || subs.length === 0) {
    return { activated: 0, message: 'Geen wachtende subscriptions.' };
  }

  const mollie = mollieClient();
  let activated = 0;

  for (const sub of subs as Array<{
    id: string;
    mollie_customer_id: string | null;
    status: string;
  }>) {
    if (!sub.mollie_customer_id) continue;

    // Zoek paid payment voor deze customer
    let hasPaid = false;
    try {
      const payments = await mollie.customerPayments.iterate({
        customerId: sub.mollie_customer_id,
      });
      for await (const p of payments) {
        if (p.status === 'paid') {
          hasPaid = true;
          break;
        }
      }
    } catch (e) {
      console.error('[syncMyPendingSubscription] Mollie error:', e);
      continue;
    }

    if (!hasPaid) continue;

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const { error } = await admin
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_end: periodEnd.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sub.id);

    if (!error) activated++;
  }

  if (activated > 0) {
    revalidatePath('/account');
  }

  return {
    activated,
    message:
      activated > 0
        ? `${activated} subscription geactiveerd.`
        : 'Mollie bevestigt nog geen betaling. Wacht even en refresh, of mail support.',
  };
}
