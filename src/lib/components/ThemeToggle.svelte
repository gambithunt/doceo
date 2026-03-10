<script lang="ts">
  import { appState } from '$lib/stores/app-state';
  import type { ThemeMode } from '$lib/types';

  export let theme: ThemeMode;

  function setTheme(nextTheme: ThemeMode): void {
    appState.setTheme(nextTheme);
  }
</script>

<div class="toggle">
  <button
    type="button"
    class:active={theme === 'light'}
    onclick={() => setTheme('light')}
  >
    Light
  </button>
  <button
    type="button"
    class:active={theme === 'dark'}
    onclick={() => setTheme('dark')}
  >
    Dark
  </button>
</div>

<style>
  .toggle {
    display: inline-flex;
    gap: 0.35rem;
    padding: 0.35rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface-soft);
  }

  button {
    border: 0;
    background: transparent;
    color: var(--muted);
    padding: 0.5rem 0.9rem;
    border-radius: 999px;
    cursor: pointer;
    font: inherit;
  }

  .active {
    background: var(--accent);
    color: var(--accent-contrast);
  }
</style>
