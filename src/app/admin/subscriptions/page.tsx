// /admin/subscriptions — alle subscription-rijen ongeacht status.
//
// Cruciaal voor debug: ziet 'incomplete' subs (checkout gestart, webhook
// nog niet binnen), 'active' subs (gelukt), 'past_due' (betaling mislukt),
// 'canceled' (opgezegd). Plus Mollie customer- en subscription-id voor
// directe lookup in Mollie dashboard.

import { requireAdmin } from '@/lib/admin-auth';
import { listAllSubscriptions } from '@/lib/admin-queries';
import SyncButton from './SyncButton';

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

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  incomplete: 'bg-amber-100 text-amber-700',
  past_due: 'bg-red-100 text-red-700',
  canceled: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  expired: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
};

export default async function AdminSubscriptionsPage() {
  await requireAdmin();
  const subs = await listAllSubscriptions({ limit: 100 });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Subscriptions</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {subs.length} rijen · alle statussen · nieuwste eerst
        </p>
      </header>

      {subs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Geen subscriptions — niemand heeft een checkout gestart.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">User</th>
                  <th className="text-left px-4 py-3 font-semibold">Plan</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Mollie IDs</th>
                  <th className="text-left px-4 py-3 font-semibold">Periode-einde</th>
                  <th className="text-left px-4 py-3 font-semibold">Aangemaakt</th>
                  <th className="text-left px-4 py-3 font-semibold">Actie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subs.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 align-top">
                    <td className="px-4 py-3 break-all">{s.userEmail}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{s.planName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[s.status] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {s.status}
                      </span>
                      {s.cancelAtPeriodEnd && (
                        <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                          opzegging
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300 space-y-0.5">
                      <div className="break-all">
                        <span className="text-slate-400 dark:text-slate-500">cust:</span> {s.mollieCustomerId ?? '—'}
                      </div>
                      <div className="break-all">
                        <span className="text-slate-400 dark:text-slate-500">sub: </span>
                        {s.mollieSubscriptionId ?? <span className="text-amber-600">(geen recurring)</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatDate(s.currentPeriodEnd)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(s.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <SyncButton
                        subscriptionId={s.id}
                        disabled={s.status === 'active'}
                      />
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
