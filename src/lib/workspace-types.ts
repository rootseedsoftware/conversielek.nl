// M5b — Gedeelde types voor workspace-context.
//
// Houdt de domein-types op één plek zodat client- en server-helpers
// dezelfde shape teruggeven. Bewust geen Supabase-row types geëxporteerd:
// die laten implementatiedetails (snake_case kolommen, RLS-vorm) lekken
// naar callers. UI werkt met deze camelCase Workspace.

export type WorkspaceRole = 'owner' | 'admin' | 'member';
export type WorkspaceType = 'personal' | 'team';

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  type: WorkspaceType;
  /** Rol van de huidige user binnen deze workspace. */
  role: WorkspaceRole;
  createdAt: string;
};

/** Cookie-key waarin de actieve workspace-id wordt onthouden. */
export const ACTIVE_WORKSPACE_COOKIE = 'cl_active_workspace_id';

/** Cookie-levensduur: 1 jaar — gebruiker hoeft niet elke sessie te kiezen. */
export const ACTIVE_WORKSPACE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
