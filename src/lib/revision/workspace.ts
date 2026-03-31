import type { ActiveRevisionSession } from '$lib/types';

export type RevisionWorkspaceMode = 'home' | 'session' | 'summary';

export function deriveRevisionWorkspaceMode(
  session: ActiveRevisionSession | null | undefined
): RevisionWorkspaceMode {
  if (!session) {
    return 'home';
  }

  return session.status === 'active' ? 'session' : 'summary';
}
