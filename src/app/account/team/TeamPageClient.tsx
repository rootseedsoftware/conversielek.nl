'use client';

// M5c — Interactieve delen van de team-pagina.
//
// Twee modes:
//   - 'create-team' — alleen create-workspace form (Agency-tier + personal-ws context)
//   - 'manage-team' — leden-lijst + invite-form + pending invites (team-ws context)

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Trash2, Mail, Clock, ShieldCheck, Copy, Check } from 'lucide-react';
import {
  createTeamWorkspace,
  createInvite,
  revokeInvite,
  removeMember,
  changeMemberRole,
  type WorkspaceMember,
  type PendingInvite,
} from '@/lib/workspace-actions';

type Props =
  | {
      mode: 'create-team';
      workspaceId: null;
      members: WorkspaceMember[];
      invites: PendingInvite[];
      canManage: false;
      currentUserId: string;
    }
  | {
      mode: 'manage-team';
      workspaceId: string;
      members: WorkspaceMember[];
      invites: PendingInvite[];
      canManage: boolean;
      currentUserId: string;
    };

export default function TeamPageClient(props: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // ── Create-team form ────────────────────────────────────────────────────
  const [newWsName, setNewWsName] = useState('');
  const handleCreateWs = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const r = await createTeamWorkspace({ name: newWsName });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setNotice('Team-workspace aangemaakt. Wissel via de switcher rechtsboven.');
      setNewWsName('');
      router.refresh();
    });
  };

  // ── Invite form ─────────────────────────────────────────────────────────
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!props.workspaceId) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const r = await createInvite({
        workspaceId: props.workspaceId!,
        email: inviteEmail,
        role: inviteRole,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setNotice(`Invite verstuurd naar ${inviteEmail}.`);
      setInviteEmail('');
      router.refresh();
    });
  };

  // ── Mutations ───────────────────────────────────────────────────────────
  const handleRevoke = (inviteId: string) => {
    startTransition(async () => {
      const r = await revokeInvite(inviteId);
      if (!r.ok) setError(r.error ?? 'Kon invite niet intrekken.');
      else router.refresh();
    });
  };

  const handleRemove = (userId: string) => {
    if (!props.workspaceId) return;
    if (!confirm('Weet je zeker dat je dit lid wilt verwijderen?')) return;
    startTransition(async () => {
      const r = await removeMember({ workspaceId: props.workspaceId!, userId });
      if (!r.ok) setError(r.error ?? 'Kon lid niet verwijderen.');
      else router.refresh();
    });
  };

  const handleRoleChange = (userId: string, newRole: 'admin' | 'member') => {
    if (!props.workspaceId) return;
    startTransition(async () => {
      const r = await changeMemberRole({
        workspaceId: props.workspaceId!,
        userId,
        newRole,
      });
      if (!r.ok) setError(r.error ?? 'Kon rol niet wijzigen.');
      else router.refresh();
    });
  };

  // ── Copy invite-link ────────────────────────────────────────────────────
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const copyInviteLink = async (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      /* clipboard geweigerd */
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // RENDER — CREATE TEAM MODE
  // ─────────────────────────────────────────────────────────────────────
  if (props.mode === 'create-team') {
    return (
      <form onSubmit={handleCreateWs} className="space-y-3">
        <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
          Naam van de nieuwe workspace
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newWsName}
            onChange={(e) => setNewWsName(e.target.value)}
            placeholder="bijv. Klant X of Marketing-team"
            required
            minLength={2}
            maxLength={60}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-500/30 focus:border-orange-500"
          />
          <button
            type="submit"
            disabled={isPending || newWsName.trim().length < 2}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Aanmaken…' : 'Workspace aanmaken'}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {notice && <p className="text-sm text-emerald-600 dark:text-emerald-400">{notice}</p>}
      </form>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // RENDER — MANAGE TEAM MODE
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Leden */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Leden ({props.members.length})
          </h2>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {props.members.map((m) => {
            const isSelf = m.userId === props.currentUserId;
            const isOwnerRow = m.role === 'owner';
            return (
              <li
                key={m.userId}
                className="py-3 flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">
                    {m.email.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {m.email} {isSelf && <span className="text-xs text-slate-400">(jij)</span>}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Lid sinds {new Date(m.joinedAt).toLocaleDateString('nl-NL')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {props.canManage && !isOwnerRow && !isSelf ? (
                    <>
                      <select
                        value={m.role}
                        onChange={(e) =>
                          handleRoleChange(m.userId, e.target.value as 'admin' | 'member')
                        }
                        disabled={isPending}
                        className="text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded px-2 py-1 text-slate-700 dark:text-slate-300"
                      >
                        <option value="member">member</option>
                        <option value="admin">admin</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemove(m.userId)}
                        disabled={isPending}
                        className="text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded p-1.5"
                        title="Verwijderen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        isOwnerRow
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {m.role}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Invite-form (alleen owners/admins) */}
      {props.canManage && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-orange-500" />
            Nodig iemand uit
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Stuur een uitnodiging per e-mail. Geldig 14 dagen.
          </p>
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="collega@bedrijf.nl"
              required
              disabled={isPending}
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-500/30 focus:border-orange-500"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
              disabled={isPending}
              className="px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={isPending || !inviteEmail}
              className="px-5 py-2.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {isPending ? 'Versturen…' : 'Uitnodigen'}
            </button>
          </form>
          {error && <p className="text-sm text-red-600 dark:text-red-400 mt-3">{error}</p>}
          {notice && <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-3">{notice}</p>}
        </section>
      )}

      {/* Pending invites (alleen owners/admins) */}
      {props.canManage && props.invites.length > 0 && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-500" />
            Openstaande invites ({props.invites.length})
          </h2>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {props.invites.map((i) => (
              <li
                key={i.id}
                className="py-3 flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {i.email}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase">
                      {i.role}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Verloopt {new Date(i.expiresAt).toLocaleDateString('nl-NL')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyInviteLink(i.token)}
                    className="text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded p-1.5 flex items-center gap-1"
                    title="Kopieer invite-link"
                  >
                    {copiedToken === i.token ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600">gekopieerd</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>link</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRevoke(i.id)}
                    disabled={isPending}
                    className="text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded p-1.5"
                    title="Invite intrekken"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!props.canManage && (
        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          Je bent lid van deze workspace. Alleen owners/admins kunnen leden toevoegen of
          rollen wijzigen.
        </div>
      )}
    </div>
  );
}
