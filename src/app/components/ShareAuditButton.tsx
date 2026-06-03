'use client';

// Sprint 8 — "Deel met klant"-knop in audit-rapport-view.
//
// Klik → modal opent met form (optionele klant-naam + note) → Server
// Action createAuditShare maakt token → modal toont URL met copy-knop.
//
// Auth-vereist: knop verschijnt alleen voor ingelogde users (audits
// zonder account hebben geen Supabase-id en kunnen niet gedeeld worden).
// Logged-out users zien een hint "Log in om te delen".

import { useState, useTransition } from 'react';
import {
  Share2, Copy, CheckCircle2, X, Send, Loader2, AlertCircle, ExternalLink,
} from 'lucide-react';
import { createAuditShare } from '@/lib/audit-shares';

type Result =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; token: string; url: string }
  | { status: 'error'; message: string };

export default function ShareAuditButton({
  auditId,
  variant = 'inline',
}: {
  /** Supabase audit-id. Null/undefined = audit is van vóór login (localStorage). */
  auditId: string | null | undefined;
  variant?: 'inline' | 'prominent';
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<Result>({ status: 'idle' });
  const [recipientName, setRecipientName] = useState('');
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);

  // Audit niet in cloud → kan niet gedeeld worden
  if (!auditId || auditId === 'demo') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 ${
          variant === 'prominent' ? 'px-3 py-2' : ''
        }`}
        title="Alleen audits in een ingelogd account kunnen gedeeld worden"
      >
        <AlertCircle className="w-3.5 h-3.5" />
        Log in om te delen
      </span>
    );
  }

  const handleCreate = () => {
    setResult({ status: 'loading' });
    startTransition(async () => {
      const r = await createAuditShare({
        auditId,
        recipientName: recipientName.trim() || undefined,
        note: note.trim() || undefined,
      });
      if ('error' in r) {
        setResult({ status: 'error', message: r.error });
      } else {
        setResult({ status: 'success', token: r.token, url: r.url });
      }
    });
  };

  const handleCopy = async () => {
    if (result.status !== 'success') return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback could be added later */
    }
  };

  const close = () => {
    setOpen(false);
    // Reset na korte vertraging zodat modal-fade-out niet flicker
    setTimeout(() => {
      setResult({ status: 'idle' });
      setRecipientName('');
      setNote('');
      setCopied(false);
    }, 200);
  };

  const triggerClass =
    variant === 'prominent'
      ? 'inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition'
      : 'inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold rounded-lg transition';

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClass}>
        <Share2 className={variant === 'prominent' ? 'w-4 h-4' : 'w-3 h-3'} />
        {variant === 'prominent' ? 'Deel met klant' : 'Deel'}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Deel dit rapport
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Geef je klant een directe link — geen account nodig.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Sluit"
                className="flex-shrink-0 p-1 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto">
              {result.status === 'success' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-semibold text-sm">Link aangemaakt</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={result.url}
                      className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-500/30"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-lg text-xs font-semibold transition"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Ok
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Kopie
                        </>
                      )}
                    </button>
                  </div>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Voorbeeld in nieuwe tab
                  </a>
                  <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                    De link blijft geldig totdat je &apos;m intrekt. Je ziet in je account
                    hoeveel keer de klant heeft gekeken.
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Naam van de ontvanger{' '}
                      <span className="text-slate-400 font-normal">(optioneel)</span>
                    </label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="bv. Jan van der Berg"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-500/30"
                    />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      Verschijnt bovenaan het rapport voor een persoonlijke ontvangst.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Bericht{' '}
                      <span className="text-slate-400 font-normal">(optioneel)</span>
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="bv. Hierbij de eerste audit van jullie productpagina — laten we volgende week de top 3 issues bespreken."
                      rows={3}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-500/30 resize-none"
                    />
                  </div>
                  {result.status === 'error' && (
                    <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg text-xs text-red-700 dark:text-red-400">
                      {result.message}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={isPending}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-lg font-semibold text-sm transition"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Aanmaken...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Genereer share-link
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
