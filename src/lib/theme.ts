import { browser } from '$app/environment';
import type { ThemeMode } from '$lib/types';

export const APP_STATE_STORAGE_KEY = 'doceo-app-state';
export const THEME_STORAGE_KEY = 'doceo-theme';

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

function readThemeFromSnapshot(storage: Pick<Storage, 'getItem'>): ThemeMode | null {
  const stored = storage.getItem(APP_STATE_STORAGE_KEY);

  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as { ui?: { theme?: unknown } };
    return isThemeMode(parsed.ui?.theme) ? parsed.ui.theme : null;
  } catch {
    return null;
  }
}

export function readThemePreference(
  storage: Pick<Storage, 'getItem'> | undefined = browser ? localStorage : undefined
): ThemeMode | null {
  if (!storage) {
    return null;
  }

  const storedTheme = storage.getItem(THEME_STORAGE_KEY);
  if (isThemeMode(storedTheme)) {
    return storedTheme;
  }

  return readThemeFromSnapshot(storage);
}

export function writeThemePreference(
  theme: ThemeMode,
  storage: Pick<Storage, 'setItem'> | undefined = browser ? localStorage : undefined
): void {
  storage?.setItem(THEME_STORAGE_KEY, theme);
}

export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var theme=localStorage.getItem('${THEME_STORAGE_KEY}');if(theme!=='light'&&theme!=='dark'){var raw=localStorage.getItem('${APP_STATE_STORAGE_KEY}');if(raw){var parsed=JSON.parse(raw);theme=parsed&&parsed.ui&&parsed.ui.theme;}}if(theme==='light'||theme==='dark'){document.documentElement.dataset.theme=theme;}}catch(_error){}})();`;
