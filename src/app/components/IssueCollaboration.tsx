'use client';

// Sprint 9 — IssueCollaboration per issue:
//   - Status-dropdown (todo / in_progress / done)
//   - Collapsible comments-thread met "Plaats reactie"-input
//
// Toont een compacte balk altijd zichtbaar (status-pill + comment-count).
// Expander opent threads + textarea. Geen polling — comments updaten
// optimistisch in lokale state.

import { useState, useTransition } from 'react';
import {
  MessageSquare, ChevronDown, ChevronUp, Send, Loader2, Trash2,
} from 'lucide-react';
import {
  setIssueStatus,
  addIssueComment,
  deleteIssueComment,
  type IssueStatus,
  type IssueComment,
} from '@/lib/issue-collaboration';

type Props = {
  auditId: string;
  issueIndex: number;
  /** Initial state vanuit parent — gevuld via listAuditCollaboration */
  initialStatus?: IssueStatus;
  initialComments?: IssueComment[];
  /** Of de huidige user de auteur kan zien (= ingelogd) */
  currentUserId?: string;
};

const statusOptions: { value: IssueStatus; label: string; color: string }[] = [
  { value: 'todo', label: 'Te doen', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
  { value: 'in_progress', label: 'Bezig', color: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' },
  { value: 'done', label: 'Afgerond', color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' },
];

export default function IssueCollaboration({
  auditId,
  issueIndex,
  initialStatus = 'todo',
  initialComments = [],
  currentUserId,
}: Props) {
  const [status, setStatus] = useState<IssueStatus>(initialStatus);
  const [comments, setComments] = useState<IssueComment[]>(initialComments);
  const [expanded, setExpanded] = useState(false);
  const [newText, setNewText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (next: IssueStatus) => {
    const previous = status;
    setStatus(next); // optimistic
    startTransition(async () => {
      const r = await setIssueStatus(auditId, issueIndex, next);
      if (!r.ok) {
        setStatus(previous); // rollback
        setError(r.error ?? 'Kon status niet opslaan.');
      } else {
        setError(null);
      }
    });
  };

  const handleAddComment = () => {
    if (!newText.trim()) return;
    const draftText = newText.trim();
    setNewText('');
    setError(null);
    startTransition(async () => {
      const r = await addIssueComment(auditId, issueIndex, draftText);
      if (r.ok) {
        setComments((cs) => [...cs, r.comment]);
      } else {
        setNewText(draftText); // restore
        setError(r.error);
      }
    });
  };

  const handleDeleteComment = (id: string) => {
    if (!confirm('Verwijder deze reactie?')) return;
    const snapshot = comments;
    setComments((cs) => cs.filter((c) => c.id !== id)); // optimistic
    startTransition(async () => {
      const r = await deleteIssueComment(id);
      if (!r.ok) {
        setComments(snapshot); // rollback
        setError(r.error ?? 'Kon niet verwijderen.');
      }
    });
  };

  const statusCfg = statusOptions.find((o) => o.value === status) ?? statusOptions[0];

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
      {/* Compact balk altijd zichtbaar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status-dropdown via knop-cluster (geen native select voor consistency) */}
        <div className="inline-flex items-center gap-1 p-0.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleStatusChange(opt.value)}
              disabled={isPending}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                status === opt.value
                  ? opt.color + ' shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Comments-toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-md transition"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {comments.length} {comments.length === 1 ? 'reactie' : 'reacties'}
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Expanded thread + input */}
      {expanded && (
        <div className="mt-3 space-y-2">
          {comments.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic px-2 py-1">
              Nog geen reacties — plaats de eerste hieronder.
            </p>
          ) : (
            <div className="space-y-2">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {c.userEmail}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {new Date(c.createdAt).toLocaleString('nl-NL', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {currentUserId === c.userId && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(c.id)}
                          aria-label="Verwijder reactie"
                          className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {c.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* New comment input */}
          <div className="flex items-start gap-2">
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Schrijf een reactie..."
              rows={2}
              maxLength={2000}
              className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-500/30 resize-none"
              onKeyDown={(e) => {
                // Cmd/Ctrl+Enter verstuurt
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddComment}
              disabled={isPending || !newText.trim()}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-slate-900 rounded-lg text-xs font-semibold transition"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Plaats
            </button>
          </div>

          {error && (
            <div className="text-xs text-red-700 dark:text-red-400 mt-1">{error}</div>
          )}

          <p className="text-[10px] text-slate-400 dark:text-slate-500 text-right">
            Cmd/Ctrl + Enter om snel te plaatsen. Status: {statusCfg.label}.
          </p>
        </div>
      )}
    </div>
  );
}
