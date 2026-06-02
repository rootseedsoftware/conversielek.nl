// POST /api/billing/webhook  —  Mollie webhook handler.
//
// Mollie POST't form-encoded { id: tr_xxxx } bij elke status-wijziging
// van een payment. We:
//   1. Lezen payment-id uit form body
//   2. Halen verse payment-data op via Mollie API (verifiëren)
//   3. Opslaan in payment_events (idempotency op unieke index)
//   4. Reageren op status:
//        - paid + sequenceType=first → mandate OK → maak Subscription
//        - paid + recurring          → bump current_period_end
//        - failed/expired/canceled   → status='past_due' op sub
//   5. Mark event processed
//
// Mollie verwacht altijd HTTP 200 terug; bij non-200 retries Mollie
// elke paar uur tot 24h. Wij returnen alleen non-200 bij echte fouten
// die retry zinvol maken (DB-storing etc).

import { NextRequest } from 'next/server';
import { type MollieClient, type Payment, SequenceType } from '@mollie/api-client';
import { createAdminClient } from '@/lib/supabase/admin';
import { mollieClient } from '@/lib/mollie/client';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  // 1. Lees payment-id uit form body
  let paymentId: string | null = null;
  try {
    const formData = await req.formData();
    const raw = formData.get('id');
    if (typeof raw === 'string' && raw.startsWith('tr_')) {
      paymentId = raw;
    }
  } catch {
    /* niet form-encoded — return 400 */
  }
  if (!paymentId) {
    return new Response('Missing or invalid payment id', { status: 400 });
  }

  // 2. Verifieer met Mollie
  const mollie = mollieClient();
  let payment;
  try {
    payment = await mollie.payments.get(paymentId);
  } catch (e) {
    console.error('[webhook] mollie.payments.get failed:', e);
    return new Response('Mollie API error', { status: 502 });
  }

  const admin = createAdminClient();
  const eventType = `payment.${payment.status}`;

  // 3. Idempotency check
  const { data: existing } = await admin
    .from('payment_events')
    .select('id, processed_at')
    .eq('provider', 'mollie')
    .eq('external_id', paymentId)
    .eq('event_type', eventType)
    .maybeSingle();
  if (existing?.processed_at) {
    return new Response('Already processed', { status: 200 });
  }

  // 4. Sla event op (of update bestaande als nog niet processed)
  let eventRowId: string | undefined;
  if (existing) {
    eventRowId = existing.id as string;
  } else {
    const { data: inserted, error: insertErr } = await admin
      .from('payment_events')
      .insert({
        provider: 'mollie',
        external_id: paymentId,
        event_type: eventType,
        payload: payment as unknown as Record<string, unknown>,
      })
      .select('id')
      .single();
    if (insertErr) {
      console.error('[webhook] payment_events.insert failed:', insertErr);
      // Niet kritiek — door naar de handling. Idempotency-check faalt
      // hooguit en we doen het werk 2x bij retry.
    } else {
      eventRowId = inserted?.id as string | undefined;
    }
  }

  // 5. Handle by status
  try {
    if (payment.status === 'paid') {
      if (payment.sequenceType === SequenceType.first && payment.customerId) {
        await handleFirstPaymentPaid(payment, admin, mollie, req);
      } else if (payment.sequenceType === SequenceType.oneoff) {
        // Test-mode workaround: checkout-route gebruikt 'oneoff' in test mode
        // omdat Mollie test geen first-payments toelaat zonder live profiel.
        // Activeer de incomplete subscription voor 1 maand zonder recurring.
        await handleOneoffPaymentPaid(payment, admin);
      } else if (payment.subscriptionId) {
        await handleRecurringPaymentPaid(payment.subscriptionId, admin);
      }
    } else if (
      payment.status === 'failed' ||
      payment.status === 'expired' ||
      payment.status === 'canceled'
    ) {
      if (payment.subscriptionId) {
        await admin
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('mollie_subscription_id', payment.subscriptionId);
      }
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error('[webhook] handler failed:', errMsg);
    if (eventRowId) {
      await admin
        .from('payment_events')
        .update({ error: errMsg })
        .eq('id', eventRowId);
    }
    return new Response('Handler error', { status: 500 });
  }

  // 6. Mark processed
  if (eventRowId) {
    await admin
      .from('payment_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', eventRowId);
  }

  return new Response('OK', { status: 200 });
}

// ---- Helpers --------------------------------------------------------------

async function handleFirstPaymentPaid(
  payment: Payment,
  admin: ReturnType<typeof createAdminClient>,
  mollie: MollieClient,
  req: NextRequest
) {
  const metadata = (payment.metadata ?? {}) as {
    plan_slug?: string;
    supabase_user_id?: string;
  };
  const planSlug = metadata.plan_slug;
  const userId = metadata.supabase_user_id;
  const customerId = payment.customerId;
  if (!planSlug || !userId || !customerId) {
    throw new Error(
      `Missing metadata on first payment ${payment.id}: planSlug=${planSlug} userId=${userId}`
    );
  }

  const { data: plan } = await admin
    .from('plans')
    .select('id, name, slug, price_cents, currency')
    .eq('slug', planSlug)
    .single();
  if (!plan) throw new Error(`Plan slug "${planSlug}" niet gevonden`);

  // Maak Mollie subscription (recurring)
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host = req.headers.get('host') ?? 'conversielek.nl';
  const webhookUrl = `${proto}://${host}/api/billing/webhook`;

  const sub = await mollie.customerSubscriptions.create({
    customerId,
    amount: {
      currency: plan.currency,
      value: (plan.price_cents / 100).toFixed(2),
    },
    interval: '1 month',
    description: `${plan.name} — maandelijks`,
    webhookUrl,
    metadata: {
      supabase_user_id: userId,
      plan_slug: plan.slug,
    },
  });

  // Update bestaande incomplete sub-record OF maak nieuwe als die er
  // niet is (edge-case: checkout-record was niet ingevoegd door
  // race-condition).
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { data: updated } = await admin
    .from('subscriptions')
    .update({
      status: 'active',
      mollie_subscription_id: sub.id,
      current_period_end: periodEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('mollie_customer_id', customerId)
    .eq('status', 'incomplete')
    .select('id');

  if (!updated || updated.length === 0) {
    await admin.from('subscriptions').insert({
      user_id: userId,
      plan_id: plan.id,
      status: 'active',
      mollie_customer_id: customerId,
      mollie_subscription_id: sub.id,
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd.toISOString(),
    });
  }
}

/**
 * Test-mode flow: oneoff payment is binnen → activeer subscription voor
 * 1 maand zonder recurring mandate (geen mollie_subscription_id).
 *
 * Belangrijk: dit pad ALLEEN actief in test mode (zie checkout-route).
 * In live mode komt oneoff niet voor — dan is alles sequenceType: first.
 *
 * Na 1 maand verloopt de sub stilletjes (current_period_end < now). User
 * moet dan handmatig opnieuw betalen — maar dat is OK want test mode.
 */
async function handleOneoffPaymentPaid(
  payment: Payment,
  admin: ReturnType<typeof createAdminClient>
) {
  const metadata = (payment.metadata ?? {}) as {
    plan_slug?: string;
    supabase_user_id?: string;
  };
  const planSlug = metadata.plan_slug;
  const userId = metadata.supabase_user_id;
  const customerId = payment.customerId;

  if (!planSlug || !userId) {
    console.warn(
      `[webhook oneoff] payment ${payment.id} mist metadata — skip activatie`
    );
    return;
  }

  const { data: plan } = await admin
    .from('plans')
    .select('id, name, slug')
    .eq('slug', planSlug)
    .single();
  if (!plan) throw new Error(`Plan slug "${planSlug}" niet gevonden`);

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Probeer eerst de incomplete sub-record te upgraden (normale flow)
  const { data: updated } = await admin
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_end: periodEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('status', 'incomplete')
    .select('id');

  if (!updated || updated.length === 0) {
    // Edge-case: geen incomplete record — insert direct
    await admin.from('subscriptions').insert({
      user_id: userId,
      plan_id: plan.id,
      status: 'active',
      mollie_customer_id: customerId,
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd.toISOString(),
    });
  }
}

async function handleRecurringPaymentPaid(
  mollieSubscriptionId: string,
  admin: ReturnType<typeof createAdminClient>
) {
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  await admin
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_end: periodEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('mollie_subscription_id', mollieSubscriptionId);
}
