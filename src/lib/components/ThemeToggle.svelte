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
    background: linear-gradient(180deg, var(--surface-tint), var(--surface-soft));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
  }

  button {
    border: 0;
    background: transparent;
    color: var(--muted);
    padding: 0.55rem 0.95rem;
    border-radius: 999px;
    cursor: pointer;
    font: inherit;
  }

  .active {
    background: var(--accent);
    color: var(--accent-contrast);
    box-shadow: 0 10px 25px color-mix(in srgb, var(--accent) 24%, transparent);
  }
</style>
