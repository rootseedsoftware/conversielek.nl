// M5c — Team- & workspace-management pagina.
//
// Toont de leden + openstaande invites van de ACTIEF gemaakte workspace.
// Wisselen tussen workspaces gebeurt via de WorkspaceSwitcher in de header
// (of de dropdown die vanaf deze pagina naar de switcher verwijst).
//
// Zichtbaarheidsregels:
//   - Personal workspace: geen team-features. Toon "Maak een team-workspace"
//     CTA — alleen actief voor Agency-tier.
//   - Team workspace als owner/admin: full CRUD (invites + role-changes)
//   - Team workspace als member: read-only members-lijst
//
// Server component — auth + data server-side, geen state-flash.

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCart, Users, ArrowLeft, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentPlan } from '@/lib/billing';
import {
  getCurrentWorkspace,
  getUserWorkspaces,
} from '@/lib/workspace-server';
import {
  listWorkspaceMembers,
  listPendingInvites,
} from '@/lib/workspace-actions';
import TeamPageClient from './TeamPageClient';

export const metadata = {
  title: 'Team & workspaces',
};

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/account/team');

  const [current, workspaces, planInfo] = await Promise.all([
    getCurrentWorkspace(),
    getUserWorkspaces(),
    getCurrentPlan(user.id),
  ]);

  const isAgency = planInfo.plan.slug === 'agency';

  // Als geen actieve workspace (rare edge — trigger zou 'm sowieso hebben
  // gemaakt), stuur terug naar /account.
  if (!current) redirect('/account');

  const isTeamWs = current.type === 'team';
  const canManage = isTeamWs && (current.role === 'owner' || current.role === 'admin');

  const [members, invites] = isTeamWs
    ? await Promise.all([
        listWorkspaceMembers(current.id),
        canManage ? listPendingInvites(current.id) : Promise.resolve([]),
      ])
    : [[], []];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <nav className="border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">Conversielek</span>
          </Link>
          <Link
            href="/account"
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Terug naar account
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-6 h-6 text-orange-500" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Team & workspaces</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Beheer team-workspaces, nodig collega&apos;s uit en scheid audits per klant.
          </p>
        </header>

        {/* Actieve workspace-header */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Actieve workspace
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {current.name}
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    current.type === 'team'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {current.type === 'team' ? 'Team' : 'Persoonlijk'}
                </span>
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Je rol: <strong className="text-slate-700 dark:text-slate-300">{current.role}</strong>
              </div>
            </div>
            {workspaces.length > 1 && (
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Wissel via de workspace-selector rechtsboven.
              </div>
            )}
          </div>
        </div>

        {/* Personal ws: create-team CTA of upgrade-notice */}
        {!isTeamWs && (
          <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-500/10 dark:to-red-500/10 border border-orange-200 dark:border-orange-500/30 rounded-2xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <Sparkles className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                  Maak een team-workspace
                </h2>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Nodig teamgenoten of klanten uit, scheid audits per project of klant, deel
                  bevindingen zonder je persoonlijke audits te tonen.
                </p>
              </div>
            </div>

            {isAgency ? (
              <TeamPageClient
                mode="create-team"
                workspaceId={null}
                members={[]}
                invites={[]}
                canManage={false}
                currentUserId={user.id}
              />
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-500/30 rounded-xl p-4">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Alleen beschikbaar op Agency-tier
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Team-workspaces zijn onderdeel van het Agency-pakket. Upgrade om onbeperkt
                  workspaces + team-invites te unlocken.
                </p>
                <Link
                  href="/#pricing"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-95 transition"
                >
                  Bekijk Agency-tier
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Team ws: leden + invites */}
        {isTeamWs && (
          <TeamPageClient
            mode="manage-team"
            workspaceId={current.id}
            members={members}
            invites={invites}
            canManage={canManage}
            currentUserId={user.id}
          />
        )}
      </main>
    </div>
  );
}
