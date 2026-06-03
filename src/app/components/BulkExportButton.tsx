'use client';

// Sprint 3 — Bulk-export voor de top-N quick wins.
//
// Verschijnt bovenaan het rapport als er ≥3 issues met confidence='high'
// + ICE-score ≥70 zijn (= echte quick wins). Klik opent een modal met
// alle issues in één bericht — perfect om in één keer naar developer
// te sturen.
//
// Auto-selectie van issues:
//   1. Filter op confidence='high' (alleen veilig-doorvoeren acties)
//   2. Filter op ICE-score ≥70 (alleen quick wins)
//   3. Sorteer op ICE-score (hoog → laag)
//   4. Neem top-N (default 3)
//
// Als er minder dan N quick wins zijn: knop verbergt zichzelf — geen
// "stuur 0 issues" UX.

import { useMemo, useState } from 'react';
import { Send, Zap } from 'lucide-react';
import type { AuditIssue } from '@/lib/claude';
import type { ExportContext } from '@/lib/issue-export';
import { calculateIceScore } from '@/lib/data/confidence';
import IssueExportModal from './IssueExportModal';

export default function BulkExportButton({
  issues,
  ctx,
  topN = 3,
}: {
  issues: AuditIssue[];
  ctx: ExportContext;
  topN?: number;
}) {
  const [open, setOpen] = useState(false);

  const quickWins = useMemo(() => {
    return issues
      .filter((i) => i.confidence === 'high')
      .filter((i) => calculateIceScore(i.ice) >= 70)
      .sort((a, b) => calculateIceScore(b.ice) - calculateIceScore(a.ice))
      .slice(0, topN);
  }, [issues, topN]);

  // Verberg helemaal als er <2 quick wins zijn — anders is bulk-knop
  // misleidend ("Stuur top 1" voelt zoals één issue, dan beter de
  // gewone per-issue knop gebruiken).
  if (quickWins.length < 2) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-500/10 dark:to-amber-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-4 sm:p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-amber-500 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              {quickWins.length} quick wins gevonden
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Hoge zekerheid + hoge impact + makkelijk te implementeren. Stuur ze
              in één keer door naar je developer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-lg font-semibold text-xs transition"
          >
            <Send className="w-3.5 h-3.5" />
            Stuur top {quickWins.length}
          </button>
        </div>
      </div>
      {open && (
        <IssueExportModal
          mode="bulk"
          issues={quickWins}
          ctx={ctx}
          onClose={() => setOpen(false)}
          bulkTitle={`Stuur ${quickWins.length} quick wins door`}
        />
      )}
    </>
  );
}
