// /admin/payment-events — Mollie webhook event-log.
//
// Cruciaal voor debug: als deze leeg is, is Mollie's webhook NOOIT bij
// ons aangekomen → check Mollie dashboard + webhookUrl. Als wel rijen
// maar geen processed_at + error gevuld → handler crashte; error-kolom
// toont waarom.

import { requireAdmin } from '@/lib/admin-auth';
import { listPaymentEvents } from '@/lib/admin-queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('nl-NL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AdminPaymentEventsPage() {
  await requireAdmin();
  const events = await listPaymentEvents({ limit: 100 });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Payment events</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {events.length} events · Mollie webhook-log
        </p>
      </header>

      {events.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-sm text-amber-900">
          <strong>Geen events ontvangen.</strong> Als je net een checkout hebt voltooid maar
          deze lijst leeg is, is Mollie&apos;s webhook niet bij ons aangekomen. Mogelijke oorzaken:
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Vercel deploy was nog niet klaar tijdens checkout</li>
            <li>WebhookUrl in checkout-route was fout</li>
            <li>Mollie webhook gefaald (zie Mollie dashboard → Developers → Webhooks)</li>
          </ul>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Payment ID</th>
                  <th className="text-left px-4 py-3 font-semibold">Event</th>
                  <th className="text-left px-4 py-3 font-semibold">Verwerkt</th>
                  <th className="text-left px-4 py-3 font-semibold">Foutmelding</th>
                  <th className="text-left px-4 py-3 font-semibold">Ontvangen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 align-top">
                    <td className="px-4 py-3 font-mono text-xs break-all">{e.externalId}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{e.eventType}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {e.processedAt ? (
                        <span className="text-emerald-700 font-medium">
                          {formatDate(e.processedAt)}
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium">niet verwerkt</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-red-700 text-xs max-w-md break-words">
                      {e.error ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(e.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
