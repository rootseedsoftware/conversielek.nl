'use client';

// Client-component voor /billing/return.
//
// Flow bij mount:
//   1. Wacht 3 seconden — geeft Mollie webhook even kans om binnen te komen
//   2. Trigger syncMyPendingSubscription() — checkt direct bij Mollie of
//      er een paid payment is en activeert de subscription
//   3. Toon resultaat:
//      - Geactiveerd → success-state + auto-redirect naar /account na 2s
//      - Nog niet bevestigd → friendly wait-message met handmatige refresh-knop
//
// Stages worden visueel weergegeven zodat user weet wat er gebeurt en
// zich niet afvraagt of de site stuk is.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { syncMyPendingSubscription } from '@/lib/billing-actions';

type Stage =
  | 'waiting' // initial 3-sec wait
  | 'syncing' // calling Mollie via server action
  | 'activated' // sub now active
  | 'pending' // sync ran maar Mollie zegt nog niet paid
  | 'error';

export default function BillingReturnClient() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('waiting');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // Geef webhook 3 seconden — meestal komt 'ie binnen die tijd binnen
      await new Promise((r) => setTimeout(r, 3000));
      if (cancelled) return;

      setStage('syncing');
      try {
        const result = await syncMyPendingSubscription();
        if (cancelled) return;

        if (result.activated > 0) {
          setStage('activated');
          setMessage(result.message);
          // Auto-redirect naar /account na 2 seconden
          setTimeout(() => {
            if (!cancelled) router.push('/account');
          }, 2000);
        } else {
          setStage('pending');
          setMessage(result.message);
        }
      } catch (e) {
        if (cancelled) return;
        setStage('error');
        setMessage(e instanceof Error ? e.message : 'Onbekende fout');
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30 flex flex-col">
      <nav className="border-b border-slate-100 dark:border-slate-800 bg-white/80 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">Conversielek</span>
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="text-center max-w-md">
          {/* Icon + heading per stage */}
          {(stage === 'waiting' || stage === 'syncing') && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-50 rounded-full mb-6">
                <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                Bedankt — we controleren je betaling
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                {stage === 'waiting'
                  ? 'We wachten even op de bevestiging van Mollie...'
                  : 'Even kijken bij Mollie of alles binnen is...'}
              </p>
            </>
          )}

          {stage === 'activated' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 rounded-full mb-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">Gelukt!</h1>
              <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Je abonnement is geactiveerd. We sturen je nu door naar je account...
              </p>
              <Link
                href="/account"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-medium transition"
              >
                <ShoppingCart className="w-4 h-4" />
                Nu naar mijn account
              </Link>
            </>
          )}

          {stage === 'pending' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 rounded-full mb-6">
                <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                Mollie verwerkt nog
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                Je betaling is gestart maar Mollie heeft &apos;m nog niet als
                afgerond bevestigd. Dat kan tot een minuut duren — probeer het zo opnieuw.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-medium transition"
                >
                  Opnieuw controleren
                </button>
                <Link
                  href="/account"
                  className="inline-flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 px-5 py-2.5 rounded-lg font-medium transition"
                >
                  Naar mijn account
                </Link>
              </div>
            </>
          )}

          {stage === 'error' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mb-6">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                Activatie hapert
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                We konden de status niet ophalen. Probeer opnieuw of mail ons.
              </p>
              <p className="text-xs text-red-700 font-mono bg-red-50 p-3 rounded-lg mb-6 break-words">
                {message}
              </p>
              <Link
                href="/account"
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-medium transition"
              >
                Naar mijn account
              </Link>
            </>
          )}

          <p className="text-xs text-slate-400 dark:text-slate-500 mt-8">
            Nog problemen?{' '}
            <a
              href="mailto:rootseedsoftware@gmail.com?subject=Activatie+lukt+niet"
              className="underline hover:text-slate-600 dark:hover:text-slate-400"
            >
              Stuur ons een mail
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
