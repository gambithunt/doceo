import { describe, expect, it, vi } from 'vitest';
import { createAdminCompFormEnhance } from './comp-action-enhance';

describe('createAdminCompFormEnhance', () => {
  it('updates the current page and invalidates the users route after a successful action', async () => {
    const invalidateUsers = vi.fn().mockResolvedValue(undefined);
    const update = vi.fn().mockResolvedValue(undefined);
    const enhance = createAdminCompFormEnhance(invalidateUsers);

    await enhance()({
      result: { type: 'success', status: 200, data: { success: true } },
      update
    });

    expect(update).toHaveBeenCalledWith({ reset: false });
    expect(invalidateUsers).toHaveBeenCalledTimes(1);
  });

  it('updates the current page without invalidating the users route when the action fails', async () => {
    const invalidateUsers = vi.fn().mockResolvedValue(undefined);
    const update = vi.fn().mockResolvedValue(undefined);
    const enhance = createAdminCompFormEnhance(invalidateUsers);

    await enhance()({
      result: { type: 'failure', status: 400, data: { error: 'Invalid values' } },
      update
    });

    expect(update).toHaveBeenCalledWith({ reset: false });
    expect(invalidateUsers).not.toHaveBeenCalled();
  });
});
