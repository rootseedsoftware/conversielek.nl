'use client';

// Global error-boundary — verschijnt wanneer een unhandled error tijdens
// het renderen optreedt. Per Next.js App Router moet dit een client-
// component zijn met een reset-knop.
//
// M8: errors gaan naar /api/log-error → Supabase error_logs tabel.
// Fingerprint-grouping voorkomt log-spam (zelfde error meerdere keer =
// occurrences++ ipv N nieuwe rijen).

import { useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart, RefreshCw, ArrowLeft } from 'lucide-react';
import { logError } from '@/lib/error-logger';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    queueMicrotask(() => {
      console.error('App-level error:', error);
      void logError({
        message: error.message || 'Unknown error',
        stack: error.stack,
        level: 'error',
        context: { digest: error.digest, name: error.name },
      });
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <nav className="border-b border-slate-100 dark:border-slate-800 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">Conversielek</span>
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-24 text-center">
        <p className="text-6xl font-bold text-orange-500 mb-3">Oeps</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">Er ging iets mis</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-2">
          We konden deze pagina niet laden. Probeer het opnieuw — als het blijft gebeuren, mail ons
          en vermeld de foutcode hieronder.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mb-8">Foutcode: {error.digest}</p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-medium transition"
          >
            <RefreshCw className="w-4 h-4" />
            Probeer opnieuw
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 px-5 py-2.5 rounded-lg font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Terug naar home
          </Link>
        </div>
      </main>
    </div>
  );
}
