// /admin/audits — recente audits over alle tenants.
//
// Server Component met requireAdmin()-gate. Toont laatste 50 audits met
// webshop, user, score, datum. Klikbaar webshop_url voor snelle verificatie.

import { requireAdmin } from '@/lib/admin-auth';
import { listRecentAudits } from '@/lib/admin-queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function scoreColor(score: number | null): string {
  if (score === null) return 'text-slate-400';
  if (score >= 7) return 'text-emerald-600';
  if (score >= 5) return 'text-amber-600';
  return 'text-red-600';
}

export default async function AdminAuditsPage() {
  await requireAdmin();
  const audits = await listRecentAudits({ limit: 50 });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Recente audits</h1>
        <p className="text-sm text-slate-500 mt-1">
          Laatste {audits.length} audits over alle accounts
        </p>
      </header>

      {audits.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
          Geen audits gevonden.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Webshop</th>
                  <th className="text-left px-4 py-3 font-semibold">Flow</th>
                  <th className="text-left px-4 py-3 font-semibold">User</th>
                  <th className="text-right px-4 py-3 font-semibold">Score</th>
                  <th className="text-left px-4 py-3 font-semibold">Datum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {audits.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{a.webshopName}</div>
                      {a.webshopUrl && (
                        <a
                          href={a.webshopUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-orange-600 hover:underline break-all"
                        >
                          {a.webshopUrl}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700 capitalize">{a.flowType}</td>
                    <td className="px-4 py-3 text-slate-700 break-all">{a.userEmail}</td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${scoreColor(a.score)}`}>
                      {a.score?.toFixed(1) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {formatDate(a.createdAt)}
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
