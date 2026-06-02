// Severity-summary — toont mini-pills met aantal issues per severity-niveau.
// Verschijnt op de audit-resultaat-card onder de score zodat de user direct
// ziet: "OK 0 kritiek, 3 hoog, 5 middel, 2 laag = 10 totaal".
//
// Klikbaar om de filter op de issue-lijst te zetten (callback aan parent).
// Toont alleen niveaus die voorkomen — geen lege "0 kritiek"-pills.

'use client';

import type { AuditIssue } from '@/lib/claude';
import { severityConfig } from '@/lib/data/severity';

type SeverityKey = AuditIssue['severity'];

const ORDER: SeverityKey[] = ['critical', 'high', 'medium', 'low'];

type Props = {
  issues: AuditIssue[];
  onFilter?: (severity: SeverityKey | 'all') => void;
  activeFilter?: SeverityKey | 'all';
};

export default function SeveritySummary({ issues, onFilter, activeFilter = 'all' }: Props) {
  // Tel per severity
  const counts: Record<SeverityKey, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const issue of issues) {
    if (issue.severity in counts) counts[issue.severity]++;
  }

  const total = issues.length;
  const present = ORDER.filter((s) => counts[s] > 0);

  if (total === 0) {
    return (
      <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 inline-flex items-center gap-2">
        <span className="w-2 h-2 bg-emerald-500 rounded-full" />
        Geen issues gevonden — top score!
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* "Alle" pill */}
      {onFilter && (
        <button
          type="button"
          onClick={() => onFilter('all')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition ${
            activeFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          Alle <span className="font-mono opacity-70">{total}</span>
        </button>
      )}
      {present.map((sev) => {
        const cfg = severityConfig[sev];
        const Icon = cfg.icon;
        const isActive = activeFilter === sev;
        const pillBase = `inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition`;

        const inactiveStyle = `${cfg.bg} ${cfg.text} ${cfg.border} hover:opacity-80`;
        const activeStyle = `${cfg.badge} text-white border-transparent`;

        const className = `${pillBase} ${isActive ? activeStyle : inactiveStyle}`;

        if (onFilter) {
          return (
            <button key={sev} type="button" onClick={() => onFilter(sev)} className={className}>
              <Icon className="w-3 h-3" />
              {cfg.label} <span className="font-mono opacity-70">{counts[sev]}</span>
            </button>
          );
        }
        return (
          <span key={sev} className={className}>
            <Icon className="w-3 h-3" />
            {cfg.label} <span className="font-mono opacity-70">{counts[sev]}</span>
          </span>
        );
      })}
    </div>
  );
}
