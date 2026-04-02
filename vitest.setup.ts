import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('$app/navigation', async () => {
  const actual = await vi.importActual<typeof import('$app/navigation')>('$app/navigation');

  return {
    ...actual,
    goto: vi.fn().mockResolvedValue(undefined)
  };
});

if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.getItem !== 'function') {
  const store = new Map<string, string>();

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      }
    }
  });
}
