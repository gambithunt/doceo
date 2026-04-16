import type { ActionResult } from '@sveltejs/kit';

type UpdateFn = (options?: { reset?: boolean; invalidateAll?: boolean }) => Promise<void>;

export function createAdminCompFormEnhance(invalidateUsers: () => Promise<void>) {
  return () => {
    return async ({ result, update }: { result: ActionResult; update: UpdateFn }) => {
      await update({ reset: false });

      if (result.type === 'success') {
        await invalidateUsers();
      }
    };
  };
}
