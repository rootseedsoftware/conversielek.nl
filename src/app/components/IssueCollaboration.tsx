'use client';

// Sprint 9 — IssueCollaboration per issue:
//   - Status-dropdown (todo / in_progress / done)
//   - Assignee-selector (Sprint 9 v2 — workspace-members)
//   - Collapsible comments-thread met "Plaats reactie"-input
//
// Toont een compacte balk altijd zichtbaar (status-pill + assignee-pill +
// comment-count). Expander opent threads + textarea. Geen polling —
// comments updaten optimistisch in lokale state.
//
// Assignee-selector verschijnt alleen als er >1 assignable member is
// (= workspace met team). Voor personal audits: verborgen.

import { useState, useTransition, useRef, useEffect } from 'react';
import {
  MessageSquare, ChevronDown, ChevronUp, Send, Loader2, Trash2, UserCircle, Check,
} from 'lucide-react';
import {
  setIssueStatus,
  addIssueComment,
  deleteIssueComment,
  assignIssue,
  type IssueStatus,
  type IssueComment,
  type AssignableMember,
} from '@/lib/issue-collaboration';

type Props = {
  auditId: string;
  issueIndex: number;
  /** Initial state vanuit parent — gevuld via listAuditCollaboration */
  initialStatus?: IssueStatus;
  initialAssignee?: string | null;
  initialComments?: IssueComment[];
  /** Of de huidige user de auteur kan zien (= ingelogd) */
  currentUserId?: string;
  /** Workspace-members die assignee kunnen worden. <2 → selector verbergen. */
  assignableMembers?: AssignableMember[];
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
  initialAssignee = null,
  initialComments = [],
  currentUserId,
  assignableMembers = [],
}: Props) {
  const [status, setStatus] = useState<IssueStatus>(initialStatus);
  const [assignee, setAssignee] = useState<string | null>(initialAssignee);
  const [comments, setComments] = useState<IssueComment[]>(initialComments);
  const [expanded, setExpanded] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [newText, setNewText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const assigneeRef = useRef<HTMLDivElement | null>(null);

  // Click-buiten om assignee-dropdown te sluiten
  useEffect(() => {
    if (!assigneeOpen) return;
    function onDown(e: MouseEvent) {
      if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) {
        setAssigneeOpen(false);
      }
    }
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [assigneeOpen]);

  const showAssigneeSelector = assignableMembers.length >= 2;
  const assigneeMember = assignee
    ? assignableMembers.find((m) => m.userId === assignee)
    : null;
  const assigneeLabel = assigneeMember
    ? assigneeMember.userId === currentUserId
      ? 'jezelf'
      : assigneeMember.email
    : 'niet toegewezen';

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

  const handleAssign = (newAssigneeId: string | null) => {
    const previous = assignee;
    setAssignee(newAssigneeId); // optimistic
    setAssigneeOpen(false);
    startTransition(async () => {
      const r = await assignIssue(auditId, issueIndex, newAssigneeId);
      if (!r.ok) {
        setAssignee(previous); // rollback
        setError(r.error ?? 'Kon assignee niet opslaan.');
      } else {
        setError(null);
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

        {/* Assignee-selector (alleen bij team-workspace met ≥2 members) */}
        {showAssigneeSelector && (
          <div ref={assigneeRef} className="relative">
            <button
              type="button"
              onClick={() => setAssigneeOpen((v) => !v)}
              disabled={isPending}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                assignee
                  ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                  : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
              title={assignee ? `Toegewezen aan ${assigneeLabel}` : 'Wijs toe'}
            >
              <UserCircle className="w-3.5 h-3.5" />
              <span className="max-w-[100px] truncate">{assigneeLabel}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {assigneeOpen && (
              <div className="absolute left-0 top-full mt-1 min-w-[220px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden z-20">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  Wijs toe aan
                </div>
                <ul className="max-h-64 overflow-y-auto">
                  <li>
                    <button
                      type="button"
                      onClick={() => handleAssign(null)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                        !assignee ? 'bg-slate-50 dark:bg-slate-800' : ''
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full border border-dashed border-slate-300 dark:border-slate-600 flex-shrink-0" />
                      <span className="text-slate-500 dark:text-slate-400 italic flex-1">Niet toegewezen</span>
                      {!assignee && <Check className="w-3.5 h-3.5 text-orange-500" />}
                    </button>
                  </li>
                  {assignableMembers.map((m) => {
                    const isSelf = m.userId === currentUserId;
                    const isCurrent = m.userId === assignee;
                    return (
                      <li key={m.userId}>
                        <button
                          type="button"
                          onClick={() => handleAssign(m.userId)}
                          className={`w-full text-left px-3 py-2 flex items-center gap-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                            isCurrent ? 'bg-orange-50 dark:bg-orange-500/10' : ''
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[8px] font-bold uppercase text-slate-500 dark:text-slate-400 flex-shrink-0">
                            {m.email.slice(0, 1)}
                          </span>
                          <span className="text-slate-900 dark:text-slate-100 truncate flex-1">
                            {m.email}
                            {isSelf && <span className="text-slate-400 ml-1">(jij)</span>}
                          </span>
                          {isCurrent && <Check className="w-3.5 h-3.5 text-orange-500" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

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
