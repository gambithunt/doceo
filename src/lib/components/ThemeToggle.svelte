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
    ☀️ Light
  </button>
  <button
    type="button"
    class:active={theme === 'dark'}
    onclick={() => setTheme('dark')}
  >
    🌙 Dark
  </button>
</div>

<style>
  .toggle {
    display: inline-flex;
    gap: 0.18rem;
    padding: 0.18rem;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-pill);
    background: var(--surface-soft);
    width: 100%;
  }

  button {
    flex: 1;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-soft);
    padding: 0.42rem 0.6rem;
    border-radius: var(--radius-pill);
    cursor: pointer;
    font: inherit;
    font-size: 0.8rem;
    font-weight: 500;
    transition:
      background 150ms ease,
      color 150ms ease,
      border-color 150ms ease,
      box-shadow 150ms ease;
  }

  button:hover:not(.active) {
    color: var(--text);
    background: var(--surface-tint);
    transform: none;
    box-shadow: none;
  }

  .active {
    background: var(--surface-strong);
    color: var(--text);
    border-color: var(--border-strong);
    box-shadow: var(--shadow);
  }
</style>
