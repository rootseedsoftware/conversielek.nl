// M5c — Invite-acceptance page voor /invite/[token].
//
// Publieke pagina — email-link kan door iedereen worden geopend. We
// checken hier de invite-geldigheid en tonen 4 mogelijke states:
//   1. Invite bestaat niet / verlopen → error-card
//   2. Uitgelogd → login/signup CTA met next=<huidige-url> zodat user
//      terugkeert op deze page na login
//   3. Ingelogd maar email mismatch → error-card met juiste email
//   4. Ingelogd + email match → "Accepteren" knop → server action
//
// Admin-client leest de invite (RLS beperkt select tot admins van de
// workspace, invitee is nog geen lid dus zou 'm niet mogen zien).

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ShoppingCart, MailCheck, MailX, LogIn } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import AcceptInviteButton from './AcceptInviteButton';

export const metadata = {
  title: 'Invite accepteren',
};

type PageProps = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;

  // 1. Invite ophalen via admin (invitee is geen ws-lid, RLS zou 'm blokken)
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from('workspace_invites')
    .select('email, role, expires_at, workspace_id, workspaces(name)')
    .eq('token', token)
    .maybeSingle();

  // 2. Ingelogde user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = Date.now();
  const inviteExpired =
    invite && new Date(invite.expires_at as string).getTime() < now;
  const wsName = ((invite?.workspaces as unknown) as { name: string } | null)?.name ?? 'workspace';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <nav className="border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">Conversielek</span>
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
          {/* State 1: invite niet gevonden */}
          {!invite && (
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                <MailX className="w-7 h-7 text-red-500" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Invite niet gevonden
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Deze invite-link is ongeldig, al gebruikt, of ingetrokken door de eigenaar.
                Vraag om een nieuwe.
              </p>
              <Link
                href="/"
                className="inline-block bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 transition"
              >
                Terug naar home
              </Link>
            </div>
          )}

          {/* State 1b: verlopen */}
          {invite && inviteExpired && (
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                <MailX className="w-7 h-7 text-amber-500" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Invite verlopen
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Deze invite is meer dan 14 dagen oud. Vraag de eigenaar om een nieuwe te
                sturen.
              </p>
              <Link
                href="/"
                className="inline-block bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 transition"
              >
                Terug naar home
              </Link>
            </div>
          )}

          {/* State 2: uitgelogd */}
          {invite && !inviteExpired && !user && (
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                <MailCheck className="w-7 h-7 text-orange-500" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Je bent uitgenodigd voor {wsName}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Log in of maak een account aan met <strong>{invite.email as string}</strong> om
                de invite te accepteren.
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  href={`/login?next=/invite/${token}`}
                  className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 transition"
                >
                  <LogIn className="w-4 h-4" />
                  Inloggen
                </Link>
                <Link
                  href={`/signup?next=/invite/${token}&email=${encodeURIComponent(invite.email as string)}`}
                  className="w-full inline-block bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-95 transition"
                >
                  Account aanmaken
                </Link>
              </div>
            </div>
          )}

          {/* State 3: ingelogd maar email mismatch */}
          {invite &&
            !inviteExpired &&
            user &&
            user.email?.toLowerCase() !== (invite.email as string).toLowerCase() && (
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                  <MailX className="w-7 h-7 text-red-500" />
                </div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  Verkeerd account
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  Je bent ingelogd als <strong>{user.email}</strong>, maar deze invite is
                  bedoeld voor <strong>{invite.email as string}</strong>. Log uit en probeer
                  opnieuw.
                </p>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="inline-block bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 transition"
                  >
                    Uitloggen
                  </button>
                </form>
              </div>
            )}

          {/* State 4: klaar om te accepteren */}
          {invite &&
            !inviteExpired &&
            user &&
            user.email?.toLowerCase() === (invite.email as string).toLowerCase() && (
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                  <MailCheck className="w-7 h-7 text-emerald-500" />
                </div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  Uitgenodigd voor {wsName}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  Je krijgt de rol <strong>{invite.role as string}</strong>. Na accepteren zie
                  je alle audits van deze workspace in je account.
                </p>
                <AcceptInviteButton token={token} />
              </div>
            )}
        </div>
      </main>
    </div>
  );
}

// Server action voor uitloggen — inline zodat we geen aparte file nodig hebben
async function signOutAction() {
  'use server';
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
