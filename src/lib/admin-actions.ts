'use server';

// Admin Server Actions — alleen aanroepen vanuit /admin pages.
// requireAdmin() bovenaan elke actie verifieert toegang server-side.
//
// syncSubscriptionFromMollie: webhook-onafhankelijke activatie. Trekt
// alle payments op voor de mollie_customer_id van een subscription. Als
// er minstens één 'paid' is, activeert de subscription voor 1 maand.
//
// Doel: vangnet voor het geval Mollie's webhook niet aankomt (test-mode
// onbetrouwbaarheid, Vercel-deploy-timing, etc). In productie zou de
// webhook altijd moeten werken — maar deze actie is een veilige fallback
// die admin handmatig kan triggeren.

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { mollieClient } from '@/lib/mollie/client';

export type SyncResult = {
  ok: boolean;
  message: string;
  details?: {
    paymentsFound: number;
    paidPayments: number;
    newStatus?: string;
  };
};

export async function syncSubscriptionFromMollie(
  subscriptionId: string
): Promise<SyncResult> {
  await requireAdmin();
  const admin = createAdminClient();

  // 1. Haal de subscription op
  const { data: sub, error: subErr } = await admin
    .from('subscriptions')
    .select('id, user_id, status, mollie_customer_id, plan_id')
    .eq('id', subscriptionId)
    .single();

  if (subErr || !sub) {
    return { ok: false, message: `Subscription ${subscriptionId} niet gevonden.` };
  }
  if (!sub.mollie_customer_id) {
    return {
      ok: false,
      message: 'Geen mollie_customer_id — checkout-flow was niet voltooid.',
    };
  }
  if (sub.status === 'active') {
    return { ok: true, message: 'Subscription is al active. Niets te doen.' };
  }

  // 2. Haal payments op voor deze Mollie customer
  const mollie = mollieClient();
  let payments;
  try {
    payments = await mollie.customerPayments.iterate({
      customerId: sub.mollie_customer_id,
    });
  } catch (e) {
    const err = e as { message?: string; statusCode?: number };
    return {
      ok: false,
      message: `Mollie API fout: ${err.message ?? 'onbekend'} [HTTP ${err.statusCode ?? '?'}]`,
    };
  }

  let totalPayments = 0;
  let paidPayments = 0;
  let lastPaidPayment: { id: string; metadata: unknown } | null = null;

  for await (const p of payments) {
    totalPayments++;
    if (p.status === 'paid') {
      paidPayments++;
      lastPaidPayment = { id: p.id, metadata: p.metadata };
    }
  }

  if (paidPayments === 0) {
    return {
      ok: false,
      message: `Geen betaalde payments gevonden voor deze customer (${totalPayments} totaal). Mollie betaling was niet succesvol.`,
      details: { paymentsFound: totalPayments, paidPayments: 0 },
    };
  }

  // 3. Activeer subscription
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { error: updateErr } = await admin
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_end: periodEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sub.id);

  if (updateErr) {
    return {
      ok: false,
      message: `Subscription update faalde: ${updateErr.message}`,
      details: { paymentsFound: totalPayments, paidPayments },
    };
  }

  // 4. Log dit als handmatig "synthetic" payment_event zodat we de trail
  //    behouden — geen webhook is echt geweest, maar we documenteren dat
  //    een admin de subscription handmatig heeft geactiveerd.
  if (lastPaidPayment) {
    await admin.from('payment_events').insert({
      provider: 'mollie',
      external_id: lastPaidPayment.id,
      event_type: 'admin.manual_sync',
      payload: lastPaidPayment as unknown as Record<string, unknown>,
      processed_at: new Date().toISOString(),
    });
  }

  // Revalidate admin pages
  revalidatePath('/admin/subscriptions');
  revalidatePath('/admin/users');
  revalidatePath('/admin/payment-events');

  return {
    ok: true,
    message: `Subscription geactiveerd! ${paidPayments} paid payment(s) gevonden, periode loopt tot ${periodEnd.toLocaleDateString('nl-NL')}.`,
    details: { paymentsFound: totalPayments, paidPayments, newStatus: 'active' },
  };
}
