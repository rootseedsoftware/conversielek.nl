// /billing/return  —  landing page na Mollie checkout.
//
// Mollie redirect user hier ongeacht success/failure (status is via
// webhook bekend). We tonen een vriendelijke "we verwerken je betaling"-
// melding en linken naar /account waar status zichtbaar wordt.

import Link from 'next/link';
import { ShoppingCart, CheckCircle2, Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Bedankt — Conversielek',
};

export default function BillingReturnPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30 flex flex-col">
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900">Conversielek</span>
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 rounded-full mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Bedankt!</h1>
          <p className="text-slate-600 mb-8 leading-relaxed">
            We verwerken je betaling nu. Zodra Mollie de bevestiging stuurt
            staat je nieuwe pakket actief in je account.
          </p>
          <div className="flex flex-col gap-2 text-sm text-slate-500 mb-8">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Activatie kan tot 1 minuut duren</span>
            </div>
          </div>
          <Link
            href="/account"
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-medium transition"
          >
            <ShoppingCart className="w-4 h-4" />
            Naar mijn account
          </Link>
          <p className="text-xs text-slate-400 mt-6">
            Geen activatie binnen 10 minuten?{' '}
            <a
              href="mailto:rootseedsoftware@gmail.com?subject=Activatie+lukt+niet"
              className="underline hover:text-slate-600"
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
