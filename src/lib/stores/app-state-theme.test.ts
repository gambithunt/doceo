import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { createInitialState } from '$lib/data/platform';
import { APP_STATE_STORAGE_KEY, THEME_STORAGE_KEY } from '$lib/theme';
import { createAppStore } from './app-state';

describe('app theme persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('uses the dedicated theme preference when rebuilding state from local storage', () => {
    const initialState = createInitialState();

    localStorage.setItem(
      APP_STATE_STORAGE_KEY,
      JSON.stringify({
        ...initialState,
        ui: {
          ...initialState.ui,
          theme: 'light'
        }
      })
    );
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    const store = createAppStore();

    expect(get(store).ui.theme).toBe('dark');
  });

  it('preserves the saved theme when signing out', async () => {
    const initialState = {
      ...createInitialState(),
      ui: {
        ...createInitialState().ui,
        theme: 'dark' as const
      }
    };

    localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(initialState));
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    const store = createAppStore(initialState);
    await store.signOut();

    expect(get(store).ui.theme).toBe('dark');
    expect(localStorage.getItem(APP_STATE_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });
});
