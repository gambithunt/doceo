import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createAdminFormEnhance } = vi.hoisted(() => ({
  createAdminFormEnhance: vi.fn()
}));

vi.mock('$lib/admin-form-enhance', () => ({
  createAdminFormEnhance
}));

import { createAdminCompFormEnhance } from './comp-action-enhance';

describe('createAdminCompFormEnhance', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createAdminFormEnhance.mockImplementation((options) => options);
  });

  it('updates the current page and invalidates the users route after a successful action', async () => {
    const invalidateUsers = vi.fn().mockResolvedValue(undefined);
    const update = vi.fn().mockResolvedValue(undefined);

    const enhanceOptions = createAdminCompFormEnhance(invalidateUsers) as {
      onResult: (input: {
        result: { type: string };
        update: typeof update;
      }) => Promise<void>;
    };

    await enhanceOptions.onResult({
      result: { type: 'success' },
      update
    });

    expect(update).toHaveBeenCalledWith({ reset: false });
    expect(invalidateUsers).toHaveBeenCalledTimes(1);
  });

  it('updates the current page without invalidating the users route when the action fails', async () => {
    const invalidateUsers = vi.fn().mockResolvedValue(undefined);
    const update = vi.fn().mockResolvedValue(undefined);

    const enhanceOptions = createAdminCompFormEnhance(invalidateUsers) as {
      onResult: (input: {
        result: { type: string };
        update: typeof update;
      }) => Promise<void>;
    };

    await enhanceOptions.onResult({
      result: { type: 'failure' },
      update
    });

    expect(update).toHaveBeenCalledWith({ reset: false });
    expect(invalidateUsers).not.toHaveBeenCalled();
  });
});
