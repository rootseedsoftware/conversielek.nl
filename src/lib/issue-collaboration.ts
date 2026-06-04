// Sprint 9 — Server actions voor team-collab op issues.
//
// MVP-scope: alleen audit-owner kan lezen/schrijven (RLS-gated).
// Workspace-team-uitbreiding volgt zodra M5c klaar is.
//
// API-vorm:
//   - listAuditStatesAndComments(auditId): één call die alles ophaalt
//     voor de hele audit (efficiënter dan per-issue)
//   - setIssueStatus(auditId, issueIndex, status): upsert
//   - addIssueComment(auditId, issueIndex, text): insert
//   - deleteIssueComment(commentId): cleanup eigen comments

'use server';

import { createClient } from '@/lib/supabase/server';

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

  // Email-lookup voor comment-auteurs. Voor MVP alleen owner = caller,
  // dus we kunnen gewoon caller's email gebruiken (geen workspace-mates yet).
  const ownEmail = user.email ?? '(jij)';
  const comments: IssueComment[] = (
    (commentsRes.data ?? []) as Array<{
      id: string;
      issue_index: number;
      user_id: string;
      text: string;
      created_at: string;
    }>
  ).map((r) => ({
    id: r.id,
    issueIndex: r.issue_index,
    userId: r.user_id,
    userEmail: r.user_id === user.id ? ownEmail : '(onbekend)',
    text: r.text,
    createdAt: r.created_at,
  }));

  return { states, comments };
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
