// M5b — Server-side workspace-context helpers.
//
// Voor gebruik in Server Components, Server Actions, Route Handlers.
// Browser-side: gebruik /lib/workspace.ts.
//
// Verschillen met de client-variant:
//   - Cookie wordt gelezen via next/headers (server context)
//   - Schrijven mag alleen vanuit Server Actions of Route Handlers
//     (Next 15+ regel: Server Components kunnen alleen lezen, niet zetten)
//   - Geen reload-trigger: caller bepaalt zelf wat ze doen na de mutation
//     (redirect, revalidate, etc.)
//
// Beide files delen dezelfde Workspace-shape uit /lib/workspace-types.ts
// zodat UI-code workspaces uit beide bronnen zonder cast kan gebruiken.

import 'server-only';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_MAX_AGE,
  type Workspace,
  type WorkspaceRole,
} from '@/lib/workspace-types';

// ---- Workspace ophalen -----------------------------------------------------

/**
 * Alle workspaces waar de huidige user lid van is. RLS filtert automatisch.
 * Returnt leeg array bij uitgelogd of fout.
 */
export async function getUserWorkspaces(): Promise<Workspace[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('workspace_members')
    .select(
      `
      role,
      workspaces (
        id,
        name,
        slug,
        owner_id,
        type,
        created_at
      )
    `
    )
    .eq('user_id', user.id);

  if (error) {
    console.error('getUserWorkspaces:', error);
    return [];
  }

  // Zelfde shape-quirk als in /lib/workspace.ts — zie comment daar.
  type WorkspaceRow = {
    id: string;
    name: string;
    slug: string;
    owner_id: string;
    type: 'personal' | 'team';
    created_at: string;
  };
  type Row = {
    role: WorkspaceRole;
    workspaces: WorkspaceRow | WorkspaceRow[] | null;
  };

  const rows = (data as unknown as Row[] | null) ?? [];
  return rows
    .map((row) => {
      const ws = Array.isArray(row.workspaces) ? row.workspaces[0] : row.workspaces;
      if (!ws) return null;
      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        ownerId: ws.owner_id,
        type: ws.type,
        role: row.role,
        createdAt: ws.created_at,
      } satisfies Workspace;
    })
    .filter((w): w is Workspace => w !== null);
}

/**
 * Actieve workspace voor de huidige sessie. Zelfde resolution-logica als de
 * client-variant: cookie → personal → eerste → null.
 *
 * Cruciaal voor RLS: deze functie zegt alleen WELKE workspace actief is, ze
 * forceert niet dat alle queries erop filteren. Audit-queries die alle
 * workspaces tonen blijven werken — page.tsx kan zelf kiezen of ze filteren
 * per actieve workspace of toont alles.
 */
export async function getCurrentWorkspace(): Promise<Workspace | null> {
  const workspaces = await getUserWorkspaces();
  if (workspaces.length === 0) return null;

  const cookieStore = await cookies();
  const cookieId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;

  if (cookieId) {
    const match = workspaces.find((w) => w.id === cookieId);
    if (match) return match;
    // Cookie verwijst naar een workspace waar user niet (meer) lid van is
    // — laat ouderwetse 'membership-removed'-flow zichzelf opruimen via
    // setActiveWorkspace bij de volgende switch. Geen silent cookie-delete
    // hier (zou state-write in Server Component zijn, illegaal in Next 15+).
  }

  const personal = workspaces.find((w) => w.type === 'personal');
  if (personal) return personal;

  return workspaces[0];
}

/**
 * Zet de actieve workspace via cookie. Alleen aanroepbaar vanuit Server
 * Actions of Route Handlers — Server Components mogen geen cookies muteren.
 *
 * Caller is verantwoordelijk voor revalidatePath/redirect na de switch.
 */
export async function setActiveWorkspace(workspaceId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    maxAge: ACTIVE_WORKSPACE_COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    // httpOnly:false bewust — client-helper leest 'm óók (preference, geen secret)
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
  });
}

// ---- Convenience: rol-checks voor server-side gating ----------------------

/**
 * Haal de rol van de huidige user binnen een specifieke workspace op.
 * Null als user geen lid is. Voor route-handlers die admin-acties uitvoeren
 * (bv. POST /api/workspaces/[id]/invite).
 */
export async function getWorkspaceRole(workspaceId: string): Promise<WorkspaceRole | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data.role as WorkspaceRole;
}

/** Owners + admins mogen invites/members beheren. */
export async function canManageWorkspaceServer(workspaceId: string): Promise<boolean> {
  const role = await getWorkspaceRole(workspaceId);
  return role === 'owner' || role === 'admin';
}
