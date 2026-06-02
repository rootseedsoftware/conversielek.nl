// Globale auth-strip bovenaan elke pagina. Server component — auth-state
// wordt server-side bepaald (geen flash-of-wrong-state bij hydration).
//
// Ingelogd  → UserMenu (avatar + dropdown met Account/Uitloggen)
// Uitgelogd → "Inloggen · Account aanmaken" links

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin-auth';
import UserMenu from './UserMenu';
import ThemeToggle from './ThemeToggle';

export default async function AuthBar() {
  // Defensive: als Supabase env vars ontbreken, render alleen de "uit"-state
  // zonder Supabase aan te roepen. Voorkomt 500 op de hele pagina als
  // env vars (nog) niet in Vercel staan.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Admin-flag server-side bepalen — niet onthullen aan client als false
  const showAdminLink = user?.email ? await isAdmin() : false;

  return (
    <div className="border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur transition-colors">
      <div className="max-w-6xl mx-auto px-6 h-11 flex items-center justify-end gap-3">
        <ThemeToggle size="sm" />
        {user?.email ? (
          <UserMenu email={user.email} showAdminLink={showAdminLink} />
        ) : (
          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
            <Link
              href="/login"
              className="hover:text-slate-900 dark:hover:text-slate-100 transition font-medium"
            >
              Inloggen
            </Link>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <Link
              href="/signup"
              className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 font-semibold transition"
            >
              Account aanmaken
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
