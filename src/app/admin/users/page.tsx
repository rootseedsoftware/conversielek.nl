// /admin/users — lijst van alle users met plan + audit-counts.
//
// Server Component met requireAdmin()-gate. Toont laatste 100 users
// gesorteerd op last_sign_in_at (recent eerst). Paginatie komt later
// als nodig — voor MVP <1000 users.

import { requireAdmin } from '@/lib/admin-auth';
import { listAdminUsers } from '@/lib/admin-queries';
import EmptyState, { IllustrationUsers } from '@/app/components/EmptyState';

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

const planColors: Record<string, string> = {
  free: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  webshop: 'bg-blue-100 text-blue-700',
  agency: 'bg-purple-100 text-purple-700',
};

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await listAdminUsers({ limit: 100 });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Users</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {users.length} users · gesorteerd op laatste login
          </p>
        </div>
      </header>

      {users.length === 0 ? (
        <EmptyState
          illustration={<IllustrationUsers />}
          title="Nog geen geregistreerde users"
          description="Zodra iemand een account aanmaakt op conversielek.nl verschijnt die hier met plan en audit-gebruik."
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Email</th>
                  <th className="text-left px-4 py-3 font-semibold">Plan</th>
                  <th className="text-right px-4 py-3 font-semibold">Deze maand</th>
                  <th className="text-right px-4 py-3 font-semibold">Totaal</th>
                  <th className="text-left px-4 py-3 font-semibold">Laatste login</th>
                  <th className="text-left px-4 py-3 font-semibold">Aangemaakt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100 break-all">{u.email}</div>
                      <div className="font-mono text-xs text-slate-400 dark:text-slate-500">{u.id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          planColors[u.planSlug] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {u.planName}
                      </span>
                      {u.cancelAtPeriodEnd && (
                        <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                          opgezegd
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900 dark:text-slate-100">
                      {u.auditsThisMonth}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      {u.auditsTotal}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatDate(u.lastSignInAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(u.createdAt)}
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
