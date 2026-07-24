// Sprint 9 — Server actions voor team-collab op issues.
//
// Sprint 9 v2 (M5c-vervolg): workspace-members kunnen nu ook status
// wijzigen, comments plaatsen én toegewezen worden aan issues. RLS is
// bijgewerkt in migration 015; email-lookup gebeurt via admin-client
// omdat auth.users niet direct queryable is vanuit RLS-context.
//
// API-vorm:
//   - listAuditCollaboration(auditId): één call die alles ophaalt
//     voor de hele audit (efficiënter dan per-issue)
//   - listAssignableMembers(auditId): workspace-members die als
//     assignee kunnen worden geselecteerd
//   - setIssueStatus(auditId, issueIndex, status): upsert
//   - assignIssue(auditId, issueIndex, userId | null): upsert assignee
//   - addIssueComment(auditId, issueIndex, text): insert
//   - deleteIssueComment(commentId): cleanup eigen comments

'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type IssueStatus = 'todo' | 'in_progress' | 'done';

export type IssueState = {
  issueIndex: number;
  status: IssueStatus;
  assignedTo: string | null;
  updatedAt: string;
};

export type IssueComment = {
  id: string;
  issueIndex: number;
  userId: string;
  userEmail: string;
  text: string;
  createdAt: string;
};

export type AssignableMember = {
  userId: string;
  email: string;
};

export type CollaborationSnapshot = {
  states: IssueState[];
  comments: IssueComment[];
};

// ─────────────────────────────────────────────────────────────────────────
// READ — alles in één call voor de audit-view
// ─────────────────────────────────────────────────────────────────────────

export async function listAuditCollaboration(
  auditId: string
): Promise<CollaborationSnapshot> {
  if (!auditId || auditId === 'demo') return { states: [], comments: [] };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { states: [], comments: [] };

  // States + comments parallel
  const [statesRes, commentsRes] = await Promise.all([
    supabase
      .from('issue_states')
      .select('issue_index, status, assigned_to, updated_at')
      .eq('audit_id', auditId),
    supabase
      .from('issue_comments')
      .select('id, issue_index, user_id, text, created_at')
      .eq('audit_id', auditId)
      .order('created_at', { ascending: true }),
  ]);

  const states: IssueState[] = (
    (statesRes.data ?? []) as Array<{
      issue_index: number;
      status: IssueStatus;
      assigned_to: string | null;
      updated_at: string;
    }>
  ).map((r) => ({
    issueIndex: r.issue_index,
    status: r.status,
    assignedTo: r.assigned_to,
    updatedAt: r.updated_at,
  }));

  // Email-lookup voor comment-auteurs (sprint 9 v2: workspace-teamgenoten
  // kunnen nu ook commenten). auth.users is niet direct queryable vanuit
  // reguliere client → admin-client. Fail-open: bij fout tonen we
  // '(onbekend)' zodat de comment nog steeds leesbaar is.
  const rawComments = (commentsRes.data ?? []) as Array<{
    id: string;
    issue_index: number;
    user_id: string;
    text: string;
    created_at: string;
  }>;
  const uniqueAuthorIds = Array.from(new Set(rawComments.map((r) => r.user_id)));
  const emailMap = await resolveUserEmails(uniqueAuthorIds, user.email);

  const comments: IssueComment[] = rawComments.map((r) => ({
    id: r.id,
    issueIndex: r.issue_index,
    userId: r.user_id,
    userEmail: emailMap.get(r.user_id) ?? '(onbekend)',
    text: r.text,
    createdAt: r.created_at,
  }));

  return { states, comments };
}

/**
 * Batch-lookup emails voor een lijst user-ids via admin-client. Caller's
 * eigen email komt uit de session zodat we die niet via admin hoeven te
 * halen (en niet failen als admin-key ontbreekt in dev).
 */
async function resolveUserEmails(
  userIds: string[],
  callerEmail: string | undefined
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (userIds.length === 0) return map;

  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of data?.users ?? []) {
      if (userIds.includes(u.id) && u.email) map.set(u.id, u.email);
    }
  } catch (e) {
    console.warn('[resolveUserEmails] admin lookup failed:', e);
  }

  // Caller's eigen email is altijd bekend uit sessie
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && callerEmail) map.set(user.id, callerEmail);

  return map;
}

// ─────────────────────────────────────────────────────────────────────────
// ASSIGNABLE MEMBERS — voor de assignee-dropdown per issue
// ─────────────────────────────────────────────────────────────────────────

/**
 * Members van de workspace waar deze audit in zit. Voor personal-audits
 * (workspace_id is null of type=personal met alleen owner) returnt dit
 * een lijst van 1 (de owner zelf). UI kan op deze lengte gate: <2 →
 * assignee-selector verbergen.
 *
 * Retourneert lege array bij niet-ingelogd of geen toegang.
 */
export async function listAssignableMembers(
  auditId: string
): Promise<AssignableMember[]> {
  if (!auditId || auditId === 'demo') return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // 1. Audit ophalen om workspace_id + owner_id te weten
  const { data: audit } = await supabase
    .from('audits')
    .select('workspace_id, user_id')
    .eq('id', auditId)
    .maybeSingle();
  if (!audit) return [];

  // 2. Als geen workspace: alleen de owner zelf (huidige user of audit-owner)
  if (!audit.workspace_id) {
    if (audit.user_id === user.id && user.email) {
      return [{ userId: user.id, email: user.email }];
    }
    return [];
  }

  // 3. Workspace-members ophalen (RLS gate: caller moet lid zijn)
  const { data: members } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', audit.workspace_id);
  if (!members || members.length === 0) return [];

  const memberIds = members.map((m) => m.user_id as string);
  const emailMap = await resolveUserEmails(memberIds, user.email);

  return memberIds
    .map((id) => ({
      userId: id,
      email: emailMap.get(id) ?? '(onbekend)',
    }))
    .filter((m) => m.email !== '(onbekend)')
    .sort((a, b) => a.email.localeCompare(b.email));
}

// ─────────────────────────────────────────────────────────────────────────
// WRITE — status + comments
// ─────────────────────────────────────────────────────────────────────────

export async function setIssueStatus(
  auditId: string,
  issueIndex: number,
  status: IssueStatus
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Niet ingelogd.' };

  const { error } = await supabase.from('issue_states').upsert(
    {
      audit_id: auditId,
      issue_index: issueIndex,
      status,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    },
    { onConflict: 'audit_id,issue_index' }
  );
  if (error) {
    console.error('[setIssueStatus] upsert failed:', error);
    return { ok: false, error: 'Kon status niet opslaan.' };
  }
  return { ok: true };
}

export async function addIssueComment(
  auditId: string,
  issueIndex: number,
  text: string
): Promise<
  | { ok: true; comment: IssueComment }
  | { ok: false; error: string }
> {
  const trimmed = text.trim();
  if (trimmed.length < 1) return { ok: false, error: 'Comment is leeg.' };
  if (trimmed.length > 2000)
    return { ok: false, error: 'Comment is te lang (max 2000 tekens).' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Niet ingelogd.' };

  const { data, error } = await supabase
    .from('issue_comments')
    .insert({
      audit_id: auditId,
      issue_index: issueIndex,
      user_id: user.id,
      text: trimmed,
    })
    .select('id, issue_index, user_id, text, created_at')
    .single();

  if (error || !data) {
    console.error('[addIssueComment] insert failed:', error);
    return { ok: false, error: 'Kon comment niet plaatsen.' };
  }

  return {
    ok: true,
    comment: {
      id: data.id as string,
      issueIndex: data.issue_index as number,
      userId: data.user_id as string,
      userEmail: user.email ?? '(jij)',
      text: data.text as string,
      createdAt: data.created_at as string,
    },
  };
}

export async function deleteIssueComment(
  commentId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('issue_comments').delete().eq('id', commentId);
  if (error) {
    console.error('[deleteIssueComment] delete failed:', error);
    return { ok: false, error: 'Kon comment niet verwijderen.' };
  }
  return { ok: true };
}

/**
 * Assign of un-assign een issue. `assigneeId=null` haalt de assignee weg
 * (blijft één rij in issue_states voor status-history). Application-level
 * check: assignee moet lid zijn van de workspace (voorkomt dat je een
 * random user id kan toewijzen — RLS beperkt wel de write maar niet
 * welke waarde in assigned_to komt).
 */
export async function assignIssue(
  auditId: string,
  issueIndex: number,
  assigneeId: string | null
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Niet ingelogd.' };

  // Als er een assignee wordt toegewezen: validate dat die persoon lid is
  // van de workspace waar de audit in zit (of de owner is).
  if (assigneeId !== null) {
    const { data: audit } = await supabase
      .from('audits')
      .select('workspace_id, user_id')
      .eq('id', auditId)
      .maybeSingle();
    if (!audit) return { ok: false, error: 'Audit niet gevonden.' };

    if (audit.workspace_id) {
      const { data: memberRow } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', audit.workspace_id)
        .eq('user_id', assigneeId)
        .maybeSingle();
      if (!memberRow) {
        return { ok: false, error: 'Assignee is geen lid van deze workspace.' };
      }
    } else if (assigneeId !== audit.user_id) {
      return {
        ok: false,
        error: 'Voor persoonlijke audits kan alleen de eigenaar assignee zijn.',
      };
    }
  }

  // Upsert: bewaar bestaande status als de rij al bestaat (assign wijzigt
  // alleen assigned_to). Postgres onConflict + partial update pattern.
  const { error } = await supabase.from('issue_states').upsert(
    {
      audit_id: auditId,
      issue_index: issueIndex,
      assigned_to: assigneeId,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    },
    { onConflict: 'audit_id,issue_index' }
  );
  if (error) {
    console.error('[assignIssue] upsert failed:', error);
    return { ok: false, error: 'Kon assignee niet opslaan.' };
  }
  return { ok: true };
}
