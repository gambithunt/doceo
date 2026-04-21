import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSession, applyAction, deserialize, invalidateAll } = vi.hoisted(() => ({
  getSession: vi.fn(),
  applyAction: vi.fn(),
  deserialize: vi.fn(),
  invalidateAll: vi.fn()
}));

vi.mock('$lib/supabase', () => ({
  supabase: {
    auth: {
      getSession
    }
  }
}));

vi.mock('$app/forms', () => ({
  applyAction,
  deserialize
}));

vi.mock('$app/navigation', () => ({
  invalidateAll
}));

import { createAdminFormEnhance } from './admin-form-enhance';

describe('createAdminFormEnhance', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
    history.replaceState({}, '', '/admin/settings');
    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'admin-token-123'
        }
      }
    });
    deserialize.mockReturnValue({
      type: 'success',
      status: 200,
      data: undefined
    });
    invalidateAll.mockResolvedValue(undefined);
    applyAction.mockResolvedValue(undefined);
    fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ type: 'success', status: 200 }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  it('submits enhanced admin forms with bearer auth and applies the action result', async () => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'http://localhost/admin/settings?/saveTtsConfig';

    const cancel = vi.fn();
    const submit = createAdminFormEnhance();

    await submit({
      action: new URL(form.action),
      cancel,
      controller: new AbortController(),
      formData: new FormData(form),
      formElement: form,
      submitter: null
    });

    expect(cancel).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, options] = fetchMock.mock.calls[0];
    const headers = options?.headers as Headers;

    expect(headers.get('Authorization')).toBe('Bearer admin-token-123');
    expect(headers.get('x-sveltekit-action')).toBe('true');
    expect(headers.get('Content-Type')).toBe('application/x-www-form-urlencoded');
    expect(deserialize).toHaveBeenCalledTimes(1);
    expect(invalidateAll).toHaveBeenCalledTimes(1);
  });
});
