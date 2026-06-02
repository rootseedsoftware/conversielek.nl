'use client';

// Client-component voor de Mollie-sync knop. Pure UI-laag — alle logica
// zit in de Server Action syncSubscriptionFromMollie. Toont resultaat
// (success/error) inline in dezelfde knop-cell zodat user direct ziet
// of het lukte.

import { useState, useTransition } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { syncSubscriptionFromMollie, type SyncResult } from '@/lib/admin-actions';

export default function SyncButton({
  subscriptionId,
  disabled,
}: {
  subscriptionId: string;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SyncResult | null>(null);

  const handleClick = () => {
    setResult(null);
    startTransition(async () => {
      const r = await syncSubscriptionFromMollie(subscriptionId);
      setResult(r);
    });
  };

  if (disabled) {
    return <span className="text-xs text-slate-400 dark:text-slate-500 italic">al active</span>;
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition disabled:opacity-50 disabled:cursor-wait"
      >
        <RefreshCw className={`w-3 h-3 ${isPending ? 'animate-spin' : ''}`} />
        {isPending ? 'Bezig...' : 'Sync Mollie'}
      </button>
      {result && (
        <div
          className={`flex items-start gap-1 text-xs ${
            result.ok ? 'text-emerald-700' : 'text-red-700'
          }`}
        >
          {result.ok ? (
            <CheckCircle2 className="w-3 h-3 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
          )}
          <span className="break-words">{result.message}</span>
        </div>
      )}
    </div>
  );
}
