'use client';

// Sprint 3 — Export-modal voor een enkele issue (of een lijstje voor bulk).
//
// Vier tabs: email / Slack-Teams (markdown) / Jira / plain.
// Per tab: voorbeeld in <textarea>, "Kopieer"-knop. Voor email ook
// "Open in mail-client" (mailto-URI).
//
// Modal-pattern:
//   - klik buiten = sluit
//   - Escape    = sluit
//   - aria-modal/labelledby voor screen-readers

import { useEffect, useRef, useState } from 'react';
import { X, Copy, CheckCircle2, Mail, MessageSquare, FileText, Bug } from 'lucide-react';
import type { AuditIssue } from '@/lib/claude';
import {
  issueToPlainText,
  issueToMarkdown,
  issueToMailto,
  issueToJira,
  issuesToBulkPlainText,
  issuesToBulkMarkdown,
  issuesToBulkMailto,
  type ExportContext,
} from '@/lib/issue-export';

type Tab = 'email' | 'markdown' | 'jira' | 'plain';

const tabs: { id: Tab; label: string; icon: typeof Mail; description: string }[] = [
  { id: 'email', label: 'Email', icon: Mail, description: 'Mailto-link opent je email-client direct' },
  { id: 'markdown', label: 'Slack / Teams', icon: MessageSquare, description: 'Markdown — werkt ook in Discord, Linear, Notion' },
  { id: 'jira', label: 'Jira', icon: Bug, description: 'Jira / Confluence wiki-markup' },
  { id: 'plain', label: 'Platte tekst', icon: FileText, description: 'Universeel — voor Outlook, Word, etc.' },
];

type Props =
  | {
      mode: 'single';
      issue: AuditIssue;
      ctx: ExportContext;
      onClose: () => void;
    }
  | {
      mode: 'bulk';
      issues: AuditIssue[];
      ctx: ExportContext;
      onClose: () => void;
      bulkTitle?: string;
    };

export default function IssueExportModal(props: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('email');
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Generate content per tab
  const content: Record<Tab, string> = (() => {
    if (props.mode === 'single') {
      return {
        email: issueToPlainText(props.issue, props.ctx),
        markdown: issueToMarkdown(props.issue, props.ctx),
        jira: issueToJira(props.issue, props.ctx),
        plain: issueToPlainText(props.issue, props.ctx),
      };
    }
    return {
      email: issuesToBulkPlainText(props.issues, props.ctx),
      markdown: issuesToBulkMarkdown(props.issues, props.ctx),
      jira: issuesToBulkPlainText(props.issues, props.ctx), // bulk-Jira is hetzelfde als plain voor MVP
      plain: issuesToBulkPlainText(props.issues, props.ctx),
    };
  })();

  const mailtoUrl =
    props.mode === 'single'
      ? issueToMailto(props.issue, props.ctx)
      : issuesToBulkMailto(props.issues, props.ctx);

  // Escape + click-outside
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') props.onClose();
    }
    function handleClick(e: MouseEvent) {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        props.onClose();
      }
    }
    document.addEventListener('keydown', handleKey);
    // Geef de modal even tijd om te mounten voordat we click-outside aanzetten
    const t = setTimeout(() => document.addEventListener('mousedown', handleClick), 50);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
      clearTimeout(t);
    };
  }, [props]);

  // Tab-switch reset doe ik in de onClick zelf — voorkomt set-state-in-effect
  // lint-rule en is conceptueel correcter (geen sync-effect met externe state).
  const switchTab = (id: Tab) => {
    setActiveTab(id);
    setCopied(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content[activeTab]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select + execCommand (deprecated maar werkt op oudere browsers)
      const ta = document.createElement('textarea');
      ta.value = content[activeTab];
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* niets te doen — user moet handmatig kopiëren */
      }
      document.body.removeChild(ta);
    }
  };

  const headline =
    props.mode === 'single'
      ? `Stuur "${props.issue.title}" door`
      : (props.bulkTitle ?? `Stuur ${props.issues.length} acties door`);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div
        ref={dialogRef}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0">
            <h2
              id="export-modal-title"
              className="text-base font-bold text-slate-900 dark:text-slate-100 truncate"
            >
              {headline}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kies een format en kopieer naar je email, Slack, Jira of waar dan ook.
            </p>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            aria-label="Sluit"
            className="flex-shrink-0 p-1 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-2 overflow-x-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => switchTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition ${
                  active
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Active tab hint */}
        <div className="px-5 py-2 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-600 dark:text-slate-400">
          {tabs.find((t) => t.id === activeTab)?.description}
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto p-5">
          <textarea
            value={content[activeTab]}
            readOnly
            className="w-full h-80 p-3 font-mono text-xs leading-relaxed bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-500/30"
            aria-label={`${activeTab} versie — schrijfbeveiligd`}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-lg font-medium text-sm transition"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Gekopieerd!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Kopieer naar klembord
              </>
            )}
          </button>
          {activeTab === 'email' && (
            <a
              href={mailtoUrl}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium text-sm transition"
            >
              <Mail className="w-4 h-4" />
              Open in email-client
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
