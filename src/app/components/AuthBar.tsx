// Dunne auth-strip bovenaan elke pagina. Server component — auth-state
// wordt server-side bepaald, dus geen flash-of-wrong-state bij hydration.
//
// - Uitgelogd: links naar /login en /signup
// - Ingelogd: email + uitlog-button (form action naar signOut server action)

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/auth/actions';

export default async function AuthBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="border-b border-slate-100 bg-slate-50/60 text-xs">
      <div className="max-w-6xl mx-auto px-6 py-2 flex items-center justify-end gap-3 text-slate-600">
        {user ? (
          <>
            <span>
              Ingelogd als{' '}
              <span className="font-medium text-slate-900">{user.email}</span>
            </span>
            <span className="text-slate-300">·</span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-slate-600 hover:text-slate-900 transition"
              >
                Uitloggen
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className="hover:text-slate-900 transition">
              Inloggen
            </Link>
            <span className="text-slate-300">·</span>
            <Link
              href="/signup"
              className="text-orange-600 hover:text-orange-700 font-medium transition"
            >
              Account aanmaken
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
