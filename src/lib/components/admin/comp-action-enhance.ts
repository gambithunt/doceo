import { createAdminFormEnhance } from '$lib/admin-form-enhance';

export function createAdminCompFormEnhance(invalidateUsers: () => Promise<void>) {
  return createAdminFormEnhance({
    onResult: async ({ result, update }) => {
      await update({ reset: false });

      if (result.type === 'success') {
        await invalidateUsers();
      }
    }
  });
}
