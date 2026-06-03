'use client';

// Sprint 5 — AVG-deep-checks sectie.
//
// Verschilt visueel van NlDeepChecksSection door:
//   - Andere kleur-pallet (slate/indigo ipv oranje) — wet ≠ usability
//   - Prominent disclaimer: "geen vervanging van juridisch advies"
//   - AP-richtlijn-referentie per check (waar onze claim vandaan komt)
//   - Critical-gaps banner bovenaan ALS er kritieke ontbrekende checks zijn
//
// Past hetzelfde StatusIcon/CountBadge-patroon toe als NlDeepChecks,
// maar import die helpers lokaal om de twee secties onafhankelijk te
// houden (verschillende design-keuzes mogelijk later).

import { useState } from 'react';
import {
  CheckCircle2, AlertTriangle, XCircle, Minus, ShieldAlert, Scale,
  ExternalLink, Filter,
} from 'lucide-react';
import type { NlDeepCheck } from '@/lib/claude';
import { statusConfig } from '@/lib/data/nl-checks';
import {
  avgCheckCatalog, calculateAvgScore, countCriticalGaps,
} from '@/lib/data/avg-checks';

type FilterMode = 'all' | 'attention';

export default function AvgDeepChecksSection({ checks }: { checks: NlDeepCheck[] | undefined }) {
  const [filter, setFilter] = useState<FilterMode>('all');

  if (!checks || checks.length === 0) return null;

  const score = calculateAvgScore(checks);
  const criticalGaps = countCriticalGaps(checks);

  const scoreBgColor =
    score >= 80
      ? 'from-emerald-600 to-emerald-700'
      : score >= 60
      ? 'from-amber-600 to-amber-700'
      : 'from-red-600 to-red-700';

  const counts = checks.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  const visible = checks.filter((c) => {
    if (filter === 'attention') return c.status === 'warning' || c.status === 'missing';
    return true;
  });

  const catalog = new Map(avgCheckCatalog.map((m) => [m.id, m]));

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center">
          <Scale className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            AVG-conformiteit
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Op basis van AP-richtlijnen + AVG-artikelen. Geen vervanging van juridisch advies.
          </p>
        </div>
      </div>

      {/* Critical-gap warning */}
      {criticalGaps > 0 && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-4 mb-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-900 dark:text-red-300">
              {criticalGaps} kritieke ontbrekende {criticalGaps === 1 ? 'AVG-check' : 'AVG-checks'}
            </p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-1 leading-relaxed">
              Dit zijn wettelijke vereisten. Boetes onder AVG kunnen oplopen tot 4% van de
              jaaromzet. Sterke aanbeveling: handmatig laten verifiëren door jurist.
            </p>
          </div>
        </div>
      )}

      {/* Aggregaat-score */}
      <div className={`bg-gradient-to-br ${scoreBgColor} rounded-2xl p-5 mb-4 text-white`}>
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <div className="text-5xl font-bold leading-none">{score}%</div>
            <div className="text-xs uppercase tracking-wider mt-1 opacity-80">
              AVG-conformiteit
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <CountBadge icon={CheckCircle2} label="Geslaagd" count={counts.ok ?? 0} />
            <CountBadge icon={AlertTriangle} label="Verbeterpunten" count={counts.warning ?? 0} />
            <CountBadge icon={XCircle} label="Ontbreken" count={counts.missing ?? 0} />
            <CountBadge icon={Minus} label="N.v.t." count={counts.not_applicable ?? 0} />
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          <FilterTab active={filter === 'all'} onClick={() => setFilter('all')}>
            Alles ({checks.length})
          </FilterTab>
          <FilterTab
            active={filter === 'attention'}
            onClick={() => setFilter('attention')}
          >
            <Filter className="w-3 h-3" />
            Aandacht ({(counts.warning ?? 0) + (counts.missing ?? 0)})
          </FilterTab>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {visible.length === 0 && (
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-4 text-center text-sm text-emerald-700 dark:text-emerald-400">
            🎉 Geen verbeterpunten in deze categorie. AVG-conform op deze flow!
          </div>
        )}
        {visible.map((check) => {
          const meta = catalog.get(check.id);
          if (!meta) return null;
          const Icon = meta.icon;
          const status = statusConfig[check.status];
          return (
            <div
              key={check.id}
              className={`border rounded-xl p-4 ${status.badgeClass} bg-opacity-30`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <StatusIcon status={check.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="w-4 h-4 flex-shrink-0 opacity-70" />
                      <h3
                        className="font-semibold text-slate-900 dark:text-slate-100 text-sm"
                        title={meta.description}
                      >
                        {meta.label}
                      </h3>
                    </div>
                    <span
                      className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${status.badgeClass}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-2">
                    {check.finding}
                  </p>
                  {check.recommendation && check.status !== 'ok' && (
                    <p className="text-xs leading-relaxed mt-2 p-2 bg-white/60 dark:bg-slate-950/40 rounded-md">
                      <span className="font-semibold">Aanbeveling: </span>
                      {check.recommendation}
                    </p>
                  )}
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 italic mt-2 flex items-center gap-1">
                    <ExternalLink className="w-2.5 h-2.5" />
                    Bron: {meta.reference}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div className="mt-5 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
          ⚖️ Juridische disclaimer
        </p>
        <p>
          Deze checks signaleren risico&apos;s op basis van AP-richtlijnen en AVG-artikelen.
          Het is <strong>geen vervanging van juridisch advies</strong>. Voor wettelijk zekere
          conformiteit raden we aan een privacy-jurist of FG (Functionaris Gegevensbescherming)
          te raadplegen.
        </p>
      </div>
    </div>
  );
}

function CountBadge({
  icon: Icon,
  label,
  count,
}: {
  icon: typeof CheckCircle2;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-2.5 py-1.5">
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <div className="min-w-0 leading-tight">
        <div className="font-bold">{count}</div>
        <div className="opacity-80 text-[10px] truncate">{label}</div>
      </div>
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
        active
          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

function StatusIcon({ status }: { status: NlDeepCheck['status'] }) {
  const className = 'w-5 h-5';
  switch (status) {
    case 'ok':
      return <CheckCircle2 className={`${className} text-emerald-600`} />;
    case 'warning':
      return <AlertTriangle className={`${className} text-amber-600`} />;
    case 'missing':
      return <XCircle className={`${className} text-red-600`} />;
    case 'not_applicable':
      return <Minus className={`${className} text-slate-400`} />;
  }
}
