// POST /api/billing/checkout
//
// Start een Mollie checkout-flow voor de ingelogde user:
//   1. Auth-check (must be logged in)
//   2. Find or create Mollie customer
//   3. Create een "first" payment (legt het mandate vast — vereist voor
//      recurring subscriptions later)
//   4. Insert subscription row met status='incomplete'
//   5. Return de Mollie checkout-URL
//
// Client doet vervolgens window.location = checkoutUrl. Na betalen
// landt user op /billing/return. Pas wanneer de Mollie webhook
// payment.paid binnenkomt op /api/billing/webhook wordt de subscription
// daadwerkelijk geactiveerd + de recurring sub aangemaakt.

import { NextRequest } from 'next/server';
import { SequenceType } from '@mollie/api-client';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mollieClient } from '@/lib/mollie/client';
import { getPlanBySlug } from '@/lib/billing';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return Response.json({ error: 'Niet ingelogd.' }, { status: 401 });
  }

  // 2. Parse body
  let body: { planSlug?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Ongeldige JSON.' }, { status: 400 });
  }
  const planSlug = body.planSlug;
  if (planSlug !== 'webshop' && planSlug !== 'agency') {
    return Response.json(
      { error: 'Plan moet "webshop" of "agency" zijn.' },
      { status: 400 }
    );
  }

  // 3. Get plan
  const plan = await getPlanBySlug(planSlug);
  if (!plan) {
    return Response.json({ error: 'Plan niet gevonden.' }, { status: 404 });
  }

  // 4. Find or create Mollie customer
  const admin = createAdminClient();
  const { data: existingSubs } = await admin
    .from('subscriptions')
    .select('mollie_customer_id')
    .eq('user_id', user.id)
    .not('mollie_customer_id', 'is', null)
    .limit(1);

  let mollieCustomerId = existingSubs?.[0]?.mollie_customer_id as string | undefined;

  const mollie = mollieClient();

  if (!mollieCustomerId) {
    try {
      const customer = await mollie.customers.create({
        email: user.email,
        name: user.email,
        metadata: { supabase_user_id: user.id },
      });
      mollieCustomerId = customer.id;
    } catch (e) {
      console.error('[checkout] customers.create failed:', e);
      return Response.json(
        { error: 'Kon Mollie-customer niet aanmaken.' },
        { status: 502 }
      );
    }
  }

  // 5. Build origin for redirect/webhook URLs
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host = req.headers.get('host') ?? 'conversielek.nl';
  const origin = `${proto}://${host}`;

  // 6. Create first payment (mandate-vesting)
  let payment;
  try {
    payment = await mollie.customerPayments.create({
      customerId: mollieCustomerId,
      amount: {
        currency: plan.currency,
        value: (plan.price_cents / 100).toFixed(2),
      },
      description: `${plan.name} — eerste maand`,
      sequenceType: SequenceType.first,
      redirectUrl: `${origin}/billing/return`,
      webhookUrl: `${origin}/api/billing/webhook`,
      metadata: {
        supabase_user_id: user.id,
        plan_slug: plan.slug,
      },
    });
  } catch (e) {
    console.error('[checkout] customerPayments.create failed:', e);
    return Response.json(
      { error: 'Kon betaling niet starten bij Mollie.' },
      { status: 502 }
    );
  }

  // 7. Insert incomplete subscription record
  const { error: insertErr } = await admin.from('subscriptions').insert({
    user_id: user.id,
    plan_id: plan.id,
    status: 'incomplete',
    mollie_customer_id: mollieCustomerId,
    current_period_start: new Date().toISOString(),
  });
  if (insertErr) {
    console.error('[checkout] subscriptions.insert failed:', insertErr);
    // Mollie payment is al aangemaakt; we kunnen wel doorgaan, webhook
    // valt later terug op customer_id om de sub-record te vinden.
  }

  // 8. Return checkout URL
  const checkoutUrl = payment.getCheckoutUrl();
  if (!checkoutUrl) {
    return Response.json(
      { error: 'Mollie gaf geen checkout-URL terug.' },
      { status: 502 }
    );
  }
  return Response.json({ checkoutUrl });
}
