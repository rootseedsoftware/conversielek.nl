// M8 — /admin/errors: error-log viewer voor operator.
//
// Toont alle actieve errors (dismissed=false) gegroepeerd op fingerprint
// met occurrence-count + first/last seen. Server Component met
// requireAdmin gate.
//
// Filter via URL param ?show=all = toon ook gearchiveerde rijen.

import Link from 'next/link';
import { AlertOctagon, AlertTriangle, Info, Eye, EyeOff } from 'lucide-react';
import { requireAdmin } from '@/lib/admin-auth';
import { listErrorLogs } from '@/lib/admin-queries';
import DismissErrorButton from './DismissErrorButton';

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

const levelConfig = {
  error: {
    icon: AlertOctagon,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-200 dark:border-red-500/30',
    label: 'Error',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/30',
    label: 'Warning',
  },
  info: {
    icon: Info,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/30',
    label: 'Info',
  },
} as const;

type Props = {
  searchParams: Promise<{ show?: string }>;
};

export default async function AdminErrorsPage({ searchParams }: Props) {
  await requireAdmin();
  const { show } = await searchParams;
  const showDismissed = show === 'all';

  const errors = await listErrorLogs({ limit: 100, showDismissed });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Error-logs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {errors.length} {showDismissed ? 'rijen (incl. afgehandeld)' : 'actieve errors'}
          </p>
        </div>
        <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <Link
            href="/admin/errors"
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition ${
              !showDismissed
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Actief
          </Link>
          <Link
            href="/admin/errors?show=all"
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition ${
              showDismissed
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Alles
          </Link>
        </div>
      </header>

      {errors.length === 0 ? (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-8 text-center text-sm text-emerald-700 dark:text-emerald-400">
          ✓ {showDismissed ? 'Geen errors gelogd.' : 'Geen actieve errors — alles werkt.'}
        </div>
      ) : (
        <div className="space-y-3">
          {errors.map((e) => {
            const cfg = levelConfig[e.level] ?? levelConfig.error;
            const Icon = cfg.icon;
            return (
              <div
                key={e.id}
                className={`bg-white dark:bg-slate-900 border ${cfg.border} rounded-2xl p-4 shadow-sm ${
                  e.dismissed ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 break-words">
                        {e.message}
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {e.source}
                        </span>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                      <span className="font-semibold">
                        {e.occurrences}× {e.occurrences === 1 ? 'gezien' : 'keer'}
                      </span>
                      <span>Eerste: {formatDate(e.firstSeenAt)}</span>
                      <span>Laatste: {formatDate(e.lastSeenAt)}</span>
                      <span className="font-mono text-[10px] truncate max-w-[120px]" title={e.fingerprint}>
                        #{e.fingerprint.slice(0, 8)}
                      </span>
                      {e.dismissed && (
                        <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          <EyeOff className="w-3 h-3" />
                          Afgehandeld
                        </span>
                      )}
                    </div>

                    {/* URL + user_agent */}
                    {e.url && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 break-all">
                        <span className="font-semibold">URL:</span> {e.url}
                      </div>
                    )}
                    {e.userAgent && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 break-all">
                        <span className="font-semibold">UA:</span> {e.userAgent}
                      </div>
                    )}

                    {/* Stack (collapsible) */}
                    {e.stack && (
                      <details className="mt-2">
                        <summary className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Stack-trace
                        </summary>
                        <pre className="mt-2 p-3 bg-slate-900 dark:bg-slate-950 text-slate-100 text-[10px] font-mono leading-relaxed rounded-lg overflow-x-auto whitespace-pre-wrap break-words">
                          {e.stack}
                        </pre>
                      </details>
                    )}

                    {!e.dismissed && (
                      <div className="mt-3">
                        <DismissErrorButton errorId={e.id} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
