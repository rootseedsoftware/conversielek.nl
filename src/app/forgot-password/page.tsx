// /forgot-password — vraag een wachtwoord-reset link aan.
//
// Geeft altijd dezelfde success-melding terug, of het e-mailadres nu wel
// of niet bestaat. Voorkomt account-enumeration via dit endpoint.

import Link from 'next/link';
import { ShoppingCart, AlertCircle, CheckCircle2 } from 'lucide-react';
import { forgotPassword } from '@/app/auth/actions';

type Props = {
  searchParams: Promise<{ error?: string; sent?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { error, sent } = await searchParams;

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
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Wachtwoord vergeten
            </h1>
            <p className="text-slate-600 text-sm">
              We sturen een herstel-link naar je e-mail.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {sent ? (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-50 rounded-full mb-4">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 mb-2">
                  Check je inbox
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Als het e-mailadres bekend is, sturen we een link om je
                  wachtwoord opnieuw in te stellen. De link is een uur geldig.
                </p>
                <p className="text-xs text-slate-500 mt-4">
                  Niets gekregen na 5 min? Check je spam-map.
                </p>
                <Link
                  href="/login"
                  className="inline-block mt-6 text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  ← Terug naar inloggen
                </Link>
              </div>
            ) : (
              <form action={forgotPassword} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                    E-mail
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="jouw@email.nl"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition shadow-lg shadow-slate-900/10"
                >
                  Stuur herstel-link
                </button>

                <p className="text-center text-xs text-slate-500 pt-2">
                  <Link href="/login" className="hover:text-slate-900">
                    ← Terug naar inloggen
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
