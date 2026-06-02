// /billing/return  —  landing page na Mollie checkout.
//
// User landt hier direct na Mollie's redirect. Probeer eerst even (een paar
// seconden) of Mollie's webhook al binnen is. Als de subscription nog
// incomplete is na die wachttijd → trigger syncMyPendingSubscription die
// zelf bij Mollie checkt of de betaling paid is. Webhook-onafhankelijk
// vangnet.
//
// Implementeerd als client-component zodat we de wait-loop + sync-action
// achter elkaar kunnen draaien met visuele feedback. Server Component
// kan dat niet zonder side-effects-in-render-warning.

import BillingReturnClient from './BillingReturnClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Bedankt — Conversielek',
};

export default function BillingReturnPage() {
  return <BillingReturnClient />;
}
