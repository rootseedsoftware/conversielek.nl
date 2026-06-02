// Signup-pagina. Server component, zelfde patroon als /login.

import Link from 'next/link';
import { ShoppingCart, AlertCircle } from 'lucide-react';
import { signUp } from '@/app/auth/actions';

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SignupPage({ searchParams }: Props) {
  const { error } = await searchParams;

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
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Account aanmaken</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Al een account?{' '}
              <Link href="/login" className="text-orange-600 hover:text-orange-700 font-medium">
                Log hier in
              </Link>
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form action={signUp} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  E-mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="jouw@email.nl"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Wachtwoord <span className="text-slate-400 dark:text-slate-500 font-normal">(min. 8 tekens)</span>
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

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition shadow-lg shadow-slate-900/10"
              >
                Account aanmaken
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
            Je gegevens worden veilig opgeslagen in een EU-database (Frankfurt).
            <br />
            Wij verkopen ze nooit.
          </p>
        </div>
      </div>
    </div>
  );
}
