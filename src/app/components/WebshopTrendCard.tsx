'use client';

// Sprint 7 — Card per webshop met huidige score + delta + sparkline + audit-lijst.
//
// Voor de "Per webshop"-modus in de history-view. Klik op een audit
// binnen de card → bestaande report-view opent (geen nieuwe route).
//
// Layout:
//   - Header: webshop-naam + URL (klein) + huidige score (groot, kleur-coded)
//   - Delta-badge naast score: +1.2 (groen) / −0.4 (rood) / 0.0 (grijs)
//   - Sparkline rechtsonder de header (alleen bij ≥2 audits)
//   - Stats-rij: aantal audits + datum-range
//   - Lijst van laatste N audits (default 3) — klikbaar
//   - "Toon alle X audits" button als er meer zijn

import { useState } from 'react';
import {
  ChevronRight, TrendingUp, TrendingDown, Minus, ExternalLink, ListPlus,
} from 'lucide-react';
import type { WebshopGroup } from '@/lib/audit-grouping';
import { formatDelta } from '@/lib/audit-grouping';
import ScoreSparkline from './ScoreSparkline';
import type { HistoryItem } from '@/lib/audit-store';

const scoreColors = (score: number) => {
  if (score >= 8) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 6) return 'text-amber-600 dark:text-amber-400';
  if (score >= 4) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
};

const deltaColors: Record<string, string> = {
  emerald:
    'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
  red: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',
  slate:
    'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
};

const sparklineColors = (delta: number | null) => {
  if (delta === null) return 'currentColor';
  if (delta > 0.05) return '#059669'; // emerald
  if (delta < -0.05) return '#dc2626'; // red
  return '#64748b'; // slate
};

const INITIAL_LIMIT = 3;

export default function WebshopTrendCard({
  group,
  onSelectAudit,
}: {
  group: WebshopGroup;
  /** Callback wanneer user op een audit klikt — page.tsx zet rapport-view */
  onSelectAudit: (item: HistoryItem) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const delta = formatDelta(group.delta);
  const TrendIcon =
    delta?.trend === 'up' ? TrendingUp : delta?.trend === 'down' ? TrendingDown : Minus;
  const visible = showAll ? group.audits : group.audits.slice(0, INITIAL_LIMIT);
  const hasMore = group.audits.length > INITIAL_LIMIT;

  const firstDate = new Date(group.scoreSeries[0].timestamp);
  const lastDate = new Date(
    group.scoreSeries[group.scoreSeries.length - 1].timestamp
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg leading-tight mb-1 truncate">
              {group.displayName}
            </h3>
            {group.displayUrl && (
              <a
                href={`https://${group.displayUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline"
              >
                {group.displayUrl}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <div className={`text-3xl font-bold leading-none ${scoreColors(group.currentScore)}`}>
                {group.currentScore.toFixed(1)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                Score
              </div>
            </div>
            {delta && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-bold ${deltaColors[delta.color]}`}
                title={
                  group.previousScore !== null
                    ? `Vorige audit: ${group.previousScore.toFixed(1)}`
                    : undefined
                }
              >
                <TrendIcon className="w-3 h-3" />
                {delta.label}
              </span>
            )}
          </div>
        </div>

        {/* Stats + sparkline */}
        <div className="flex items-center justify-between gap-3 mt-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {group.audits.length}
            </span>{' '}
            {group.audits.length === 1 ? 'audit' : 'audits'} ·{' '}
            {firstDate.toLocaleDateString('nl-NL', {
              day: 'numeric',
              month: 'short',
            })}
            {group.audits.length > 1 &&
              ` → ${lastDate.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}`}
          </div>
          {group.scoreSeries.length >= 2 && (
            <div style={{ color: sparklineColors(group.delta) }}>
              <ScoreSparkline series={group.scoreSeries} width={100} height={32} />
            </div>
          )}
        </div>
      </div>

      {/* Audits-lijst */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {visible.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelectAudit(item)}
            className="w-full flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`text-base font-bold tabular-nums w-10 text-right ${scoreColors(item.audit.overall_score)}`}
              >
                {item.audit.overall_score.toFixed(1)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {item.flowType.charAt(0).toUpperCase() + item.flowType.slice(1)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(item.timestamp).toLocaleDateString('nl-NL', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
          </button>
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="w-full flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 transition"
        >
          <ListPlus className="w-3.5 h-3.5" />
          {showAll
            ? 'Toon minder'
            : `Toon alle ${group.audits.length} audits`}
        </button>
      )}
    </div>
  );
}
