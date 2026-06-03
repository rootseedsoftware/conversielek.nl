// /account — account-instellingen.
//
// Server component: auth-check via createClient + redirect naar /login als
// niet ingelogd. Formulieren posten naar server actions (changePassword,
// signOut). MigrateLocalButton is client-only omdat localStorage alleen
// browser-side bestaat.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ShoppingCart, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { changePassword, signOut } from '@/app/auth/actions';
import { cancelSubscription } from '@/lib/billing-actions';
import { getCurrentPlan } from '@/lib/billing';
import MigrateLocalButton from './MigrateLocalButton';

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

type Props = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function AccountPage({ searchParams }: Props) {
  const { error, success } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?error=' + encodeURIComponent('Log eerst in om je account te bekijken.'));
  }

  // Huidig plan + subscription status
  const { plan, status, current_period_end, cancel_at_period_end } =
    await getCurrentPlan(user.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30 flex flex-col">
      <nav className="border-b border-slate-100 dark:border-slate-800 bg-white/80 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">Conversielek</span>
          </Link>
        </div>
      </nav>

      <div className="flex-1 px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Account</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8 text-sm">
            Beheer je inloggegevens en lokale data.
          </p>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Email-kaart */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Ingelogd als
            </h2>
            <p className="text-slate-900 dark:text-slate-100 font-medium">{user.email}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Account aangemaakt op{' '}
              {new Date(user.created_at).toLocaleDateString('nl-NL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Huidig pakket */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Huidig pakket
            </h2>
            <div className="flex items-baseline gap-3 flex-wrap mb-1">
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{plan.name}</p>
              {status === 'active' && !cancel_at_period_end && plan.slug !== 'free' && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                  Actief
                </span>
              )}
              {status === 'active' && cancel_at_period_end && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                  Eindigt op {formatDate(current_period_end)}
                </span>
              )}
              {status === 'past_due' && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                  Betaling mislukt
                </span>
              )}
              {status === 'free' && (
                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">
                  Gratis
                </span>
              )}
            </div>

            {plan.slug === 'free' ? (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Je doet maximaal {plan.audit_quota_per_month} audits per maand.{' '}
                <Link href="/" className="text-orange-600 hover:underline">
                  Upgrade naar Webshop
                </Link>{' '}
                voor onbeperkt audits.
              </p>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                €{(plan.price_cents / 100).toFixed(2).replace('.', ',')} per maand
                <span className="text-slate-400 dark:text-slate-500"> (excl. BTW)</span>
                {status === 'active' && !cancel_at_period_end && current_period_end && (
                  <>
                    {' · '}volgende betaling rond{' '}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {formatDate(current_period_end)}
                    </span>
                  </>
                )}
              </p>
            )}

            {/* Cancel-knop alleen voor actieve betaalde subs die nog niet opgezegd zijn */}
            {status === 'active' && !cancel_at_period_end && plan.slug !== 'free' && (
              <form action={cancelSubscription} className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  className="text-sm text-red-600 hover:text-red-700 underline"
                >
                  Abonnement opzeggen
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Je houdt toegang tot het einde van de huidige betaalperiode.
                </p>
              </form>
            )}

            {cancel_at_period_end && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 italic">
                Opgezegd — wordt niet automatisch verlengd.
              </p>
            )}
          </div>

          {/* Migrate localStorage → Supabase (alleen zichtbaar als er local audits zijn) */}
          <div className="mb-6">
            <MigrateLocalButton />
          </div>

          {/* M6 white-label branding */}
          <Link
            href="/account/branding"
            className="block bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6 hover:border-orange-300 dark:hover:border-orange-500/50 transition group"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  White-label branding
                </h2>
                <p className="text-slate-900 dark:text-slate-100 font-semibold mb-1">
                  Eigen logo + kleuren in PDF-rapport
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Stuur klanten een rapport met jouw branding. Conversielek treedt op de achtergrond.
                </p>
              </div>
              <div className="text-orange-500 group-hover:translate-x-1 transition-transform">→</div>
            </div>
          </Link>

          {/* Sprint 10 — audit-reminders */}
          <Link
            href="/account/schedules"
            className="block bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6 hover:border-orange-300 dark:hover:border-orange-500/50 transition group"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Audit-reminders
                </h2>
                <p className="text-slate-900 dark:text-slate-100 font-semibold mb-1">
                  Periodieke herinnering + regressie-alerts
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Krijg een email om opnieuw te auditen, en automatische waarschuwingen wanneer je
                  score zakt.
                </p>
              </div>
              <div className="text-orange-500 group-hover:translate-x-1 transition-transform">→</div>
            </div>
          </Link>

          {/* Change password */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Wachtwoord wijzigen
            </h2>
            <form action={changePassword} className="space-y-3">
              <div>
                <label htmlFor="password" className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">
                  Nieuw wachtwoord <span className="text-slate-400 dark:text-slate-500">(min. 8 tekens)</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">
                  Bevestig nieuw wachtwoord
                </label>
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
                />
              </div>
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-lg transition text-sm"
              >
                Wachtwoord wijzigen
              </button>
            </form>
          </div>

          {/* Sign out */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Sessie
            </h2>
            <form action={signOut}>
              <button
                type="submit"
                className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium px-4 py-2 rounded-lg transition text-sm"
              >
                Uitloggen
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
