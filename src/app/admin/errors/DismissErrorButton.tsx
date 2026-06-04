'use client';

// M8 — Dismiss-knop voor errors. Client-component zodat we de Server
// Action via useTransition kunnen aanroepen + visuele feedback geven.

import { useState, useTransition } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { dismissErrorLog } from '@/lib/admin-actions';

export default function DismissErrorButton({ errorId }: { errorId: string }) {
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handle = () => {
    startTransition(async () => {
      const r = await dismissErrorLog(errorId);
      if (r.ok) setDone(true);
    });
  };

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Afgehandeld
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition disabled:opacity-50"
    >
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <CheckCircle2 className="w-3.5 h-3.5" />
      )}
      Markeer als afgehandeld
    </button>
  );
}
