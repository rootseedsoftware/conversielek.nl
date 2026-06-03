'use client';

// Sprint 3 — Per-issue "Stuur door"-knop. Opent IssueExportModal.
//
// Twee varianten:
//   - "inline" : klein, voor in issue-card naast severity-badge
//   - "ghost"  : grijs/subtiel voor minder-prominente plekken

import { useState } from 'react';
import { Send } from 'lucide-react';
import type { AuditIssue } from '@/lib/claude';
import type { ExportContext } from '@/lib/issue-export';
import IssueExportModal from './IssueExportModal';

export default function IssueExportButton({
  issue,
  ctx,
  variant = 'inline',
}: {
  issue: AuditIssue;
  ctx: ExportContext;
  variant?: 'inline' | 'ghost';
}) {
  const [open, setOpen] = useState(false);

  const baseClass =
    'inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg transition focus:outline-none focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-500/30';
  const variantClass =
    variant === 'inline'
      ? 'px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900'
      : 'px-2.5 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${baseClass} ${variantClass}`}
        title="Stuur deze actie door naar developer, ontwerper of collega"
      >
        <Send className="w-3 h-3" />
        Stuur door
      </button>
      {open && (
        <IssueExportModal
          mode="single"
          issue={issue}
          ctx={ctx}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
