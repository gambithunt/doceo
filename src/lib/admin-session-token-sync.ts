import { syncAdminSessionCookie, type AdminCookieTarget, type AdminSessionLike } from '$lib/admin-auth';

type SessionLike = (AdminSessionLike & { user?: unknown }) | null;

type AuthSubscription = {
  unsubscribe: () => void;
};

type AuthChangePayload = {
  data: {
    subscription: AuthSubscription;
  };
};

type SessionPayload = {
  data: {
    session: SessionLike;
  };
};

export interface AdminSessionAuthLike {
  getSession: () => Promise<SessionPayload>;
  onAuthStateChange: (
    callback: (event: string, session: SessionLike) => void
  ) => AuthChangePayload;
}

export function createAdminSessionTokenSync(
  target: AdminCookieTarget,
  protocol: string
) {
  const sync = (session: SessionLike | undefined) => {
    syncAdminSessionCookie(target, session, {
      secure: protocol === 'https:'
    });
  };

  return {
    sync,
    async initialize(auth: AdminSessionAuthLike, onSignedIn?: () => void): Promise<() => void> {
      const { data: { session } } = await auth.getSession();
      sync(session);

      const { data: { subscription } } = auth.onAuthStateChange((event, updated) => {
        sync(updated);
        if (event === 'SIGNED_IN' && updated?.user) {
          onSignedIn?.();
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  };
}
