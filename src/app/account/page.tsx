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
import MigrateLocalButton from './MigrateLocalButton';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30 flex flex-col">
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900">Conversielek</span>
          </Link>
        </div>
      </nav>

      <div className="flex-1 px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Account</h1>
          <p className="text-slate-600 mb-8 text-sm">
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
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Ingelogd als
            </h2>
            <p className="text-slate-900 font-medium">{user.email}</p>
            <p className="text-xs text-slate-500 mt-1">
              Account aangemaakt op{' '}
              {new Date(user.created_at).toLocaleDateString('nl-NL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Migrate localStorage → Supabase (alleen zichtbaar als er local audits zijn) */}
          <div className="mb-6">
            <MigrateLocalButton />
          </div>

          {/* Change password */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Wachtwoord wijzigen
            </h2>
            <form action={changePassword} className="space-y-3">
              <div>
                <label htmlFor="password" className="block text-xs text-slate-600 mb-1.5">
                  Nieuw wachtwoord <span className="text-slate-400">(min. 8 tekens)</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="block text-xs text-slate-600 mb-1.5">
                  Bevestig nieuw wachtwoord
                </label>
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
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
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Sessie
            </h2>
            <form action={signOut}>
              <button
                type="submit"
                className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium px-4 py-2 rounded-lg transition text-sm"
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
