'use client';

// Sprint 11 — Concurrentie-benchmark view.
//
// Drie secties op één scrollbare pagina:
//   1. Header met geselecteerde shops + ranking-cards (hoogste score eerst)
//   2. Check-matrix tabel: NL- + AVG-checks side-by-side
//   3. "Hier liggen jouw kansen" — issues waar concurrent OK is, jij niet
//
// "Jij" is de eerste-geselecteerde shop. Op visuele markering: orange-ring
// + "Jij"-badge. Voor agencies die meerdere klanten benchmarken kan de
// "jij"-shop later veranderbaar worden via swap-knop.

import {
  ArrowLeft, Trophy, CheckCircle2, AlertTriangle, XCircle, Minus,
  TrendingUp, Lightbulb, Globe,
} from 'lucide-react';
import type { HistoryItem } from '@/lib/audit-store';
import { rankShops, buildCheckMatrix, findOpportunities } from '@/lib/benchmark';
import { flowTypes } from '@/lib/data/flow-types';
import { nlCheckCatalog } from '@/lib/data/nl-checks';
import { avgCheckCatalog } from '@/lib/data/avg-checks';

type Props = {
  /** Shops in de volgorde waarin user ze koos. Eerste = "jij" by convention. */
  items: HistoryItem[];
  onBack: () => void;
};

const scoreColors = (score: number) => {
  if (score >= 8) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 6) return 'text-amber-600 dark:text-amber-400';
  if (score >= 4) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
};

const scoreBg = (score: number) => {
  if (score >= 8) return 'from-emerald-500 to-emerald-600';
  if (score >= 6) return 'from-amber-500 to-amber-600';
  if (score >= 4) return 'from-orange-500 to-red-500';
  return 'from-red-500 to-red-700';
};

const statusIcon = (
  status: 'ok' | 'warning' | 'missing' | 'not_applicable' | undefined
) => {
  if (status === 'ok')
    return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
  if (status === 'warning')
    return <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
  if (status === 'missing')
    return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
  if (status === 'not_applicable')
    return <Minus className="w-4 h-4 text-slate-400 dark:text-slate-500" />;
  return <span className="text-xs text-slate-400 dark:text-slate-500">—</span>;
};

export default function BenchmarkView({ items, onBack }: Props) {
  // "Jij" = eerst-geselecteerde item
  const yourKey = items[0]?.key;
  const ranked = rankShops(items, yourKey);
  const matrix = buildCheckMatrix(items);
  const opportunities = yourKey ? findOpportunities(items, yourKey) : [];

  const flow = flowTypes.find((f) => f.value === items[0]?.flowType);

  const nlCatalog = new Map(nlCheckCatalog.map((m) => [m.id, m]));
  const avgCatalog = new Map(avgCheckCatalog.map((m) => [m.id, m]));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sticky header */}
      <nav className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Terug naar audits
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            Concurrentie-benchmark
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Benchmark op {flow?.label.toLowerCase() ?? 'flow'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {items.length} shops vergeleken. <span className="font-semibold">{items[0]?.webshopName ?? 'Jij'}</span> wordt
            als referentie gebruikt — waar concurrenten beter scoren, liggen je groei-kansen.
          </p>
        </header>

        {/* SECTIE 1 — Ranking-cards */}
        <section className="mb-10">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
            <Trophy className="w-5 h-5 text-amber-500" />
            Ranking
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {ranked.map((shop, i) => (
              <div
                key={shop.key}
                className={`relative bg-white dark:bg-slate-900 rounded-2xl border-2 ${
                  shop.isYou
                    ? 'border-orange-500 shadow-lg shadow-orange-100 dark:shadow-orange-500/10'
                    : 'border-slate-200 dark:border-slate-700'
                } p-5`}
              >
                {shop.isYou && (
                  <div className="absolute -top-2 left-4 bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                    Jij
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white bg-gradient-to-br ${scoreBg(shop.score)}`}
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {shop.displayName}
                    </div>
                    {shop.url && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        <Globe className="w-2.5 h-2.5" />
                        {shop.url}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-bold ${scoreColors(shop.score)}`}>
                    {shop.score.toFixed(1)}
                  </span>
                  <span className="text-sm text-slate-400 dark:text-slate-500">/10</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTIE 2 — Check-matrix */}
        <section className="mb-10">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
            🇳🇱 NL-checks & ⚖ AVG side-by-side
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            ✓ groen = geslaagd · ⚠ amber = verbeterpunt · ✗ rood = ontbreekt · — n.v.t.
          </p>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 min-w-[280px]">
                      Check
                    </th>
                    {items.map((it, idx) => (
                      <th
                        key={it.key}
                        className={`text-center px-3 py-3 font-semibold min-w-[120px] ${
                          idx === 0
                            ? 'bg-orange-50 dark:bg-orange-500/10'
                            : ''
                        }`}
                      >
                        <div className="text-xs text-slate-900 dark:text-slate-100 font-bold truncate max-w-[120px] mx-auto">
                          {it.webshopName || 'Shop'}
                        </div>
                        {idx === 0 && (
                          <div className="text-[9px] text-orange-600 dark:text-orange-400 uppercase tracking-wider font-bold mt-0.5">
                            Jij
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {/* NL-checks groep */}
                  <tr className="bg-slate-50/60 dark:bg-slate-800/50">
                    <td
                      colSpan={items.length + 1}
                      className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                    >
                      Nederlandse webshop-checks
                    </td>
                  </tr>
                  {matrix
                    .filter((r) => r.category === 'nl')
                    .map((row) => {
                      const meta = nlCatalog.get(row.id);
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-2.5 text-slate-900 dark:text-slate-100">
                            {meta?.label ?? row.label}
                          </td>
                          {row.statuses.map((s, idx) => (
                            <td
                              key={idx}
                              className={`text-center px-3 py-2.5 ${
                                idx === 0 ? 'bg-orange-50/30 dark:bg-orange-500/5' : ''
                              }`}
                            >
                              {statusIcon(s)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}

                  {/* AVG-checks groep */}
                  <tr className="bg-slate-50/60 dark:bg-slate-800/50">
                    <td
                      colSpan={items.length + 1}
                      className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700"
                    >
                      AVG-conformiteit
                    </td>
                  </tr>
                  {matrix
                    .filter((r) => r.category === 'avg')
                    .map((row) => {
                      const meta = avgCatalog.get(row.id);
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-2.5 text-slate-900 dark:text-slate-100">
                            {meta?.label ?? row.label}
                          </td>
                          {row.statuses.map((s, idx) => (
                            <td
                              key={idx}
                              className={`text-center px-3 py-2.5 ${
                                idx === 0 ? 'bg-orange-50/30 dark:bg-orange-500/5' : ''
                              }`}
                            >
                              {statusIcon(s)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECTIE 3 — Kansen */}
        <section>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Hier liggen jouw kansen
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Checks waar minstens één concurrent het wél goed doet, maar jij niet. Direct kopieerbare
            verbeterpunten.
          </p>

          {opportunities.length === 0 ? (
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-6 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                Niks waar concurrenten beter scoren dan jij. Je bent goed bezig!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {opportunities.map((opp) => (
                <div
                  key={`${opp.category}-${opp.checkId}`}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {opp.checkLabel}
                    </h3>
                    <span
                      className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        opp.ownStatus === 'missing'
                          ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                          : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      Jouw status: {opp.ownStatus === 'missing' ? 'Ontbreekt' : 'Verbeterpunt'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
                    {opp.ownFinding}
                  </p>

                  <div className="flex items-start gap-2 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed">
                      <span className="font-bold">
                        {opp.betterShops.length} {opp.betterShops.length === 1 ? 'concurrent doet' : 'concurrenten doen'} dit wél goed:
                      </span>{' '}
                      {opp.betterShops.join(', ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
