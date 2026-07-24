// M5c — Server actions voor workspace-management (invites + members).
//
// Team-workspaces zijn Agency-tier only: createTeamWorkspace + createInvite
// gate op plan.slug === 'agency'. Personal workspaces krijgt iedereen
// automatisch via de auth-trigger (zie migration 003).
//
// Invites: token-based (24 random bytes hex), 14-dagen levensduur, unique
// per (workspace_id, lower(email)) — dubbele invite voor hetzelfde adres
// gooit een duidelijke fout ipv silent constraint-violation. Accept-flow
// checkt of ingelogde user email matcht met invite-email (case-insensitive).

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentPlan } from '@/lib/billing';
import { resendClient } from '@/lib/resend';
import { getResolvedBrandingForUser } from '@/lib/branding';
import { company } from '@/lib/data/company';
import type { WorkspaceRole } from '@/lib/workspace-types';

// ─────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────

export type WorkspaceMember = {
  userId: string;
  email: string;
  role: WorkspaceRole;
  joinedAt: string;
};

export type PendingInvite = {
  id: string;
  email: string;
  role: 'admin' | 'member';
  invitedAt: string;
  expiresAt: string;
  token: string;
};

// ─────────────────────────────────────────────────────────────────────────
// TEAM-WORKSPACE AANMAKEN (Agency-tier only)
// ─────────────────────────────────────────────────────────────────────────

export async function createTeamWorkspace(input: {
  name: string;
}): Promise<{ ok: true; workspaceId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Niet ingelogd.' };

  const { plan } = await getCurrentPlan(user.id);
  if (plan.slug !== 'agency') {
    return {
      ok: false,
      error: 'Team-workspaces zijn een Agency-feature. Upgrade om deze te gebruiken.',
    };
  }

  const name = input.name.trim();
  if (name.length < 2 || name.length > 60) {
    return { ok: false, error: 'Naam moet 2-60 karakters zijn.' };
  }

  // Slug: kebab-case + user-id-prefix voor uniciteit
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const slug = `${baseSlug}-${user.id.slice(0, 8)}`;

  const { data, error } = await supabase
    .from('workspaces')
    .insert({
      name,
      slug,
      owner_id: user.id,
      type: 'team',
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[createTeamWorkspace]', error);
    return { ok: false, error: 'Kon workspace niet aanmaken.' };
  }

  // Owner-lidmaatschap toevoegen
  const { error: memberErr } = await supabase.from('workspace_members').insert({
    workspace_id: data.id,
    user_id: user.id,
    role: 'owner',
  });
  if (memberErr) {
    console.error('[createTeamWorkspace] member insert', memberErr);
    // Rollback workspace zodat we geen weeskindje krijgen
    await supabase.from('workspaces').delete().eq('id', data.id);
    return { ok: false, error: 'Kon eigenaar-lidmaatschap niet instellen.' };
  }

  revalidatePath('/account/team');
  return { ok: true, workspaceId: data.id };
}

// ─────────────────────────────────────────────────────────────────────────
// LEDEN + INVITES OPHALEN
// ─────────────────────────────────────────────────────────────────────────

export async function listWorkspaceMembers(
  workspaceId: string
): Promise<WorkspaceMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('workspace_members')
    .select('user_id, role, joined_at')
    .eq('workspace_id', workspaceId);
  if (error || !data) return [];

  // Email ophalen via admin-client — auth.users is niet direct queryable
  // vanuit reguliere client (Supabase RLS-limitatie).
  const admin = createAdminClient();
  const userIds = data.map((m) => m.user_id as string);
  if (userIds.length === 0) return [];

  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map(
    (users?.users ?? []).map((u) => [u.id, u.email ?? '(onbekend)'])
  );

  return data.map((m) => ({
    userId: m.user_id as string,
    email: emailMap.get(m.user_id as string) ?? '(onbekend)',
    role: m.role as WorkspaceRole,
    joinedAt: m.joined_at as string,
  }));
}

export async function listPendingInvites(
  workspaceId: string
): Promise<PendingInvite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('workspace_invites')
    .select('id, email, role, invited_at, expires_at, token')
    .eq('workspace_id', workspaceId)
    .gt('expires_at', new Date().toISOString())
    .order('invited_at', { ascending: false });
  if (error || !data) return [];

  return data.map((i) => ({
    id: i.id as string,
    email: i.email as string,
    role: i.role as 'admin' | 'member',
    invitedAt: i.invited_at as string,
    expiresAt: i.expires_at as string,
    token: i.token as string,
  }));
}

// ─────────────────────────────────────────────────────────────────────────
// INVITE AANMAKEN + EMAIL VERSTUREN
// ─────────────────────────────────────────────────────────────────────────

export async function createInvite(input: {
  workspaceId: string;
  email: string;
  role: 'admin' | 'member';
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Niet ingelogd.' };

  const email = input.email.trim().toLowerCase();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) return { ok: false, error: 'Ongeldig e-mailadres.' };

  // Workspace ophalen voor naam (in email) + gate check dat het team-ws is
  const { data: ws } = await supabase
    .from('workspaces')
    .select('name, type')
    .eq('id', input.workspaceId)
    .maybeSingle();
  if (!ws) return { ok: false, error: 'Workspace niet gevonden of geen toegang.' };
  if (ws.type !== 'team') {
    return {
      ok: false,
      error: 'Alleen team-workspaces ondersteunen invites.',
    };
  }

  // Insert — RLS gate + unique-constraint gate
  const { data: invite, error } = await supabase
    .from('workspace_invites')
    .insert({
      workspace_id: input.workspaceId,
      email,
      role: input.role,
      invited_by: user.id,
    })
    .select('token')
    .single();

  if (error || !invite) {
    if (error?.code === '23505') {
      return {
        ok: false,
        error: 'Er staat al een openstaande invite voor dit e-mailadres.',
      };
    }
    console.error('[createInvite]', error);
    return { ok: false, error: 'Kon invite niet aanmaken.' };
  }

  // Email versturen — fail-silent (invite blijft geldig, admin ziet 'm in de
  // lijst en kan link handmatig kopiëren via revoke+opnieuw of andere UI).
  try {
    await sendInviteEmail({
      to: email,
      inviterUserId: user.id,
      inviterEmail: user.email ?? '',
      workspaceName: ws.name as string,
      token: invite.token as string,
      role: input.role,
    });
  } catch (e) {
    console.error('[createInvite] email failed:', e);
  }

  revalidatePath('/account/team');
  return { ok: true };
}

export async function revokeInvite(
  inviteId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('workspace_invites')
    .delete()
    .eq('id', inviteId);
  if (error) {
    console.error('[revokeInvite]', error);
    return { ok: false, error: 'Kon invite niet intrekken.' };
  }
  revalidatePath('/account/team');
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────
// MEMBER-MUTATIES
// ─────────────────────────────────────────────────────────────────────────

export async function removeMember(input: {
  workspaceId: string;
  userId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Niet ingelogd.' };

  // Owner mag niet zichzelf verwijderen — voorkomt orphan workspace
  const { data: ws } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', input.workspaceId)
    .maybeSingle();
  if (ws?.owner_id === input.userId) {
    return { ok: false, error: 'Owner kan niet worden verwijderd.' };
  }

  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', input.workspaceId)
    .eq('user_id', input.userId);

  if (error) {
    console.error('[removeMember]', error);
    return { ok: false, error: 'Kon lid niet verwijderen.' };
  }
  revalidatePath('/account/team');
  return { ok: true };
}

export async function changeMemberRole(input: {
  workspaceId: string;
  userId: string;
  newRole: 'admin' | 'member';
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  // Owner-rol mag niet worden gemuteerd via deze functie (owner-transfer
  // is een aparte, meer gevoelige actie — buiten scope MVP).
  const { data: ws } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', input.workspaceId)
    .maybeSingle();
  if (ws?.owner_id === input.userId) {
    return { ok: false, error: 'Owner-rol wijzig je niet hier.' };
  }

  const { error } = await supabase
    .from('workspace_members')
    .update({ role: input.newRole })
    .eq('workspace_id', input.workspaceId)
    .eq('user_id', input.userId);

  if (error) {
    console.error('[changeMemberRole]', error);
    return { ok: false, error: 'Kon rol niet wijzigen.' };
  }
  revalidatePath('/account/team');
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────
// INVITE ACCEPTEREN (vanuit /invite/[token] page)
// ─────────────────────────────────────────────────────────────────────────

export async function acceptInvite(
  token: string
): Promise<{ ok: true; workspaceId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: 'Log in om deze invite te accepteren.' };

  // Admin-client omdat de invite-select RLS-gated is naar admins-van-die-ws
  // — de invitee is nog geen lid, dus zou 'm niet mogen zien. Wij checken
  // zelf de email-match hieronder.
  const admin = createAdminClient();
  const { data: invite, error: inviteErr } = await admin
    .from('workspace_invites')
    .select('workspace_id, email, role, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (inviteErr || !invite) return { ok: false, error: 'Invite niet gevonden.' };

  if (new Date(invite.expires_at as string).getTime() < Date.now()) {
    return { ok: false, error: 'Deze invite is verlopen. Vraag de eigenaar om een nieuwe.' };
  }

  // Email-match check (case-insensitive)
  if ((invite.email as string).toLowerCase() !== user.email.toLowerCase()) {
    return {
      ok: false,
      error: `Deze invite is bedoeld voor ${invite.email}. Log in met dat account om te accepteren.`,
    };
  }

  // Member-row aanmaken (idempotent: on conflict do nothing)
  const { error: memberErr } = await admin.from('workspace_members').upsert(
    {
      workspace_id: invite.workspace_id,
      user_id: user.id,
      role: invite.role as WorkspaceRole,
    },
    { onConflict: 'workspace_id,user_id', ignoreDuplicates: false }
  );
  if (memberErr) {
    console.error('[acceptInvite]', memberErr);
    return { ok: false, error: 'Kon lidmaatschap niet aanmaken.' };
  }

  // Invite is nu geconsumeerd — verwijderen
  await admin.from('workspace_invites').delete().eq('token', token);

  revalidatePath('/account/team');
  return { ok: true, workspaceId: invite.workspace_id as string };
}

// ─────────────────────────────────────────────────────────────────────────
// INVITE-EMAIL (interne helper, geen server-action-export)
// ─────────────────────────────────────────────────────────────────────────

async function sendInviteEmail(input: {
  to: string;
  inviterUserId: string;
  inviterEmail: string;
  workspaceName: string;
  token: string;
  role: 'admin' | 'member';
}): Promise<void> {
  const resend = resendClient();

  // White-label branding van de uitnodiger — inviter kan een agency zijn
  // die z'n klant uitnodigt, dan hoort de email in agency-huisstijl te
  // komen.
  let branding;
  try {
    branding = await getResolvedBrandingForUser(input.inviterUserId);
  } catch {
    branding = null;
  }
  const brandName = branding?.brandName ?? company.tradeName;
  const primary = branding?.primaryHex ?? '#f97316';
  const secondary = branding?.secondaryHex ?? '#dc2626';
  const logoUrl = branding?.logoUrl ?? null;
  const isWhiteLabel = branding?.isWhiteLabel ?? false;

  const acceptUrl = `${company.url}/invite/${input.token}`;
  const roleLabel = input.role === 'admin' ? 'admin' : 'lid';

  const subject = `${input.inviterEmail} nodigt je uit voor ${input.workspaceName}`;

  const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;background:#f8fafc;">
<div style="background:white;border-radius:16px;padding:32px;box-shadow:0 4px 14px rgba(15,23,42,0.08);">
  <div style="text-align:center;margin-bottom:24px;">
    ${
      logoUrl
        ? `<img src="${escape(logoUrl)}" alt="${escape(brandName)}" style="max-height:40px;max-width:160px;margin:0 auto 12px;display:block;" />`
        : ''
    }
    <div style="display:inline-block;padding:8px 16px;background:${primary}15;color:${primary};border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
      Team-invite
    </div>
  </div>
  <h1 style="font-size:26px;font-weight:800;margin:0 0 12px 0;line-height:1.2;text-align:center;">
    Je bent uitgenodigd voor<br>${escape(input.workspaceName)}
  </h1>
  <p style="text-align:center;color:#475569;line-height:1.6;margin:0 0 24px 0;">
    <strong>${escape(input.inviterEmail)}</strong> heeft je uitgenodigd om als
    <strong>${roleLabel}</strong> mee te werken in de workspace
    <strong>${escape(input.workspaceName)}</strong>.
  </p>
  <div style="text-align:center;margin:32px 0;">
    <a href="${acceptUrl}" style="display:inline-block;background:linear-gradient(135deg,${primary},${secondary});color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;">
      Invite accepteren →
    </a>
  </div>
  <div style="border-top:1px solid #f1f5f9;padding-top:20px;margin-top:32px;">
    <p style="font-size:12px;color:#64748b;line-height:1.6;margin:0;">
      Nog geen account op ${brandName}? Geen probleem — je kunt er een aanmaken en de
      invite in één stap accepteren.<br>
      Deze invite verloopt over 14 dagen.
    </p>
  </div>
</div>
<div style="text-align:center;margin-top:24px;font-size:11px;color:#94a3b8;line-height:1.6;">
  ${
    isWhiteLabel
      ? `Powered by <a href="${company.url}" style="color:#94a3b8;">${escape(company.tradeName)}</a>`
      : `<a href="${company.url}" style="color:${primary};">${escape(company.tradeName)}</a>`
  }
</div>
</body></html>`;

  await resend.emails.send({
    from: `${brandName} <noreply@${company.domain}>`,
    to: input.to,
    subject,
    html,
  });
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
