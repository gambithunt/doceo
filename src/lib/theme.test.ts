import { beforeEach, describe, expect, it } from 'vitest';
import { APP_STATE_STORAGE_KEY, THEME_BOOTSTRAP_SCRIPT, THEME_STORAGE_KEY, readThemePreference } from './theme';

describe('theme preference storage', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('prefers the dedicated theme storage key over the app snapshot theme', () => {
    localStorage.setItem(
      APP_STATE_STORAGE_KEY,
      JSON.stringify({
        ui: {
          theme: 'light'
        }
      })
    );
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    expect(readThemePreference(localStorage)).toBe('dark');
  });

  it('falls back to the app snapshot theme when the dedicated key is missing', () => {
    localStorage.setItem(
      APP_STATE_STORAGE_KEY,
      JSON.stringify({
        ui: {
          theme: 'dark'
        }
      })
    );

    expect(readThemePreference(localStorage)).toBe('dark');
  });

  it('applies the stored theme before hydration when the bootstrap script runs', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    new Function(THEME_BOOTSTRAP_SCRIPT)();

    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
