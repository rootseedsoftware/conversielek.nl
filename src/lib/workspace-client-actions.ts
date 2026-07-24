// M5c — Server Actions callable vanuit Client Components.
//
// workspace-server.ts is 'server-only' (import 'server-only') en niet
// bedoeld om vanuit een client-component te worden aangeroepen. Deze
// file is een dunne 'use server' wrapper waarin alleen actions staan
// die de switcher/UI nodig heeft.

'use server';

import { setActiveWorkspace } from '@/lib/workspace-server';

/**
 * Zet de actieve workspace in de cookie. Aangeroepen vanuit de
 * WorkspaceSwitcher dropdown. Caller doet zelf router.refresh().
 */
export async function setActiveWorkspaceAction(workspaceId: string): Promise<void> {
  await setActiveWorkspace(workspaceId);
}
