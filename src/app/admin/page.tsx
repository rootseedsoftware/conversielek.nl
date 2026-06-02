// /admin dashboard — aggregaat-overzicht: users, audits, MRR, plan-verdeling.
//
// Server Component. Roept requireAdmin() bovenaan; bij geen admin → notFound().
// Geen useState/effects — alle data komt server-side, pagina is in essence
// een rendered SQL-snapshot.

import { Users, FileText, TrendingUp, Calendar, Euro } from 'lucide-react';
import { requireAdmin } from '@/lib/admin-auth';
import { getDashboardStats } from '@/lib/admin-queries';

// Geen caching — admin wil altijd actuele cijfers
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminDashboardPage() {
  const adminEmail = await requireAdmin();
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Ingelogd als <span className="font-mono">{adminEmail}</span> · cijfers zijn live (geen cache)
        </p>
      </header>

      {/* Top stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-4 h-4" />}
          label="Geregistreerde users"
          value={stats.totalUsers.toLocaleString('nl-NL')}
        />
        <StatCard
          icon={<FileText className="w-4 h-4" />}
          label="Audits totaal"
          value={stats.totalAudits.toLocaleString('nl-NL')}
        />
        <StatCard
          icon={<Calendar className="w-4 h-4" />}
          label="Audits laatste 7 dgn"
          value={stats.auditsLast7d.toLocaleString('nl-NL')}
          hint={`${stats.auditsLast30d.toLocaleString('nl-NL')} de laatste 30 dgn`}
        />
        <StatCard
          icon={<Euro className="w-4 h-4" />}
          label="MRR (geschat)"
          value={`€ ${stats.estimatedMrrEur.toLocaleString('nl-NL', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          hint={`${stats.activeSubscriptions} actieve abonnementen`}
        />
      </div>

      {/* Plan distribution */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-orange-500" />
          Plan-verdeling
        </h2>
        {stats.planDistribution.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-sm text-slate-500 dark:text-slate-400">
            Nog geen actieve abonnementen.
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100">
            {stats.planDistribution.map((p) => (
              <div key={p.plan} className="px-4 py-3 flex items-center justify-between">
                <span className="font-medium text-slate-900 dark:text-slate-100 capitalize">{p.plan}</span>
                <span className="text-slate-700 dark:text-slate-300 font-mono">{p.count}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
      {hint && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}
