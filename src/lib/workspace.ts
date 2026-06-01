// M5b — Client-side workspace-context helpers.
//
// Voor gebruik in 'use client' componenten (page.tsx, UserMenu, etc).
// Server Components / Route Handlers gebruiken /lib/workspace-server.ts
// — die heeft de cookie-mutation API en kan tijdens SSR werken.
//
// Active-workspace state:
//   - Bron-van-waarheid is de cookie ACTIVE_WORKSPACE_COOKIE.
//   - Client kan 'm lezen via document.cookie (geen httpOnly nodig — het is
//     puur een preference, niet security-gevoelig: RLS valideert sowieso of
//     de user lid is van de workspace).
//   - Schrijven via setActiveWorkspaceClient → document.cookie. Daarna
//     window.location.reload() om server-componenten te laten herrenderen
//     met de nieuwe context.
//
// Geen self-update circuit: deze helpers zijn read-mostly. UI doet één
// switch-action → cookie set → hard reload. Past binnen huidige page.tsx-
// patroon dat al window.location.href gebruikt voor view-switches.

import { createClient } from '@/lib/supabase/client';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_MAX_AGE,
  type Workspace,
  type WorkspaceRole,
} from '@/lib/workspace-types';

// ---- Cookie helpers (browser-only) ----------------------------------------

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&') + '=([^;]*)')
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeSec: number) {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie =
    `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSec}; Path=/; SameSite=Lax${secure}`;
}

// ---- Workspace ophalen -----------------------------------------------------

/**
 * Alle workspaces waar de huidige user lid van is. RLS filtert al automatisch
 * — we hoeven hier geen user_id where-clause toe te voegen.
 *
 * Returnt leeg array bij uitgelogd of fout. Logged-out users hebben in dit
 * model sowieso geen workspaces (signup-trigger maakt de personal aan).
 */
export async function getUserWorkspacesClient(): Promise<Workspace[]> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Eén join-query: workspaces + members.role voor deze user. Bewust niet
  // twee aparte queries (zou meer roundtrips kosten en RLS-recursion-risico
  // verhogen tijdens de migratie-periode na 005).
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
    console.error('getUserWorkspacesClient:', error);
    return [];
  }

  // Supabase' type-inferentie geeft FK-joins terug als array (het kent de
  // cardinaliteit niet uit het schema). Wij weten dat workspace_members →
  // workspaces many-to-one is, dus we pakken altijd [0]. Cast via unknown
  // omdat TS de twee shapes anders incompatibel ziet.
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
 * De actieve workspace voor de huidige sessie. Logica:
 *   1. Lees cookie → als die een id heeft die in user's workspaces zit, gebruik die.
 *   2. Anders: pak de personal workspace (type='personal' en owner=user).
 *   3. Anders: eerste workspace uit lijst.
 *   4. null als user geen enkele workspace heeft (alleen mogelijk bij data-rot).
 */
export async function getCurrentWorkspaceClient(): Promise<Workspace | null> {
  const workspaces = await getUserWorkspacesClient();
  if (workspaces.length === 0) return null;

  const cookieId = readCookie(ACTIVE_WORKSPACE_COOKIE);
  if (cookieId) {
    const match = workspaces.find((w) => w.id === cookieId);
    if (match) return match;
  }

  const personal = workspaces.find((w) => w.type === 'personal');
  if (personal) return personal;

  return workspaces[0];
}

/**
 * Zet de actieve workspace via cookie + hard reload. Hard reload is bewust:
 * server-components moeten herrenderen met nieuwe RLS-context. Soft-nav
 * (router.refresh) is onbetrouwbaar omdat caches per component verschillen.
 */
export function setActiveWorkspaceClient(workspaceId: string, opts?: { reload?: boolean }) {
  writeCookie(ACTIVE_WORKSPACE_COOKIE, workspaceId, ACTIVE_WORKSPACE_COOKIE_MAX_AGE);
  if (opts?.reload !== false && typeof window !== 'undefined') {
    window.location.reload();
  }
}

// ---- Convenience checks ----------------------------------------------------

/** True als user owner of admin is van de workspace. Voor UI-gating (invite-knop tonen, etc). */
export function canManageWorkspace(workspace: Workspace | null): boolean {
  if (!workspace) return false;
  return workspace.role === 'owner' || workspace.role === 'admin';
}

/** True als user owner is. Alleen owners kunnen workspace verwijderen / overdragen. */
export function isWorkspaceOwner(workspace: Workspace | null): boolean {
  return workspace?.role === 'owner';
}
