<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { appState } from '$lib/stores/app-state';
  import {
    dashboardPath,
    notesPath,
    progressPath,
    revisionPath,
    settingsPath,
    subjectPath
  } from '$lib/routing';
  import type { AppScreen, AppState } from '$lib/types';

  const { state }: { state: AppState } = $props();

  const tabs = $derived([
    { id: 'dashboard', label: 'Home',       icon: '◈', path: dashboardPath() },
    { id: 'subject',   label: 'Learn',      icon: '◎', path: subjectPath(state.ui.selectedSubjectId) },
    { id: 'revision',  label: 'Revision',   icon: '↺', path: revisionPath() },
    { id: 'progress',  label: 'Progress',   icon: '↗', path: progressPath() },
    { id: 'notes',     label: 'Notes',      icon: '✎', path: notesPath() },
    { id: 'settings',  label: 'Settings',   icon: '◐', path: settingsPath() }
  ]);

  function isActive(tabId: string): boolean {
    const pathname = $page.url.pathname;
    if (tabId === 'subject') return pathname.startsWith('/subjects');
    return pathname === tabs.find((t) => t.id === tabId)?.path;
  }

  function navigate(tabId: string, tabPath: string): void {
    appState.setScreen(tabId as AppScreen);
    void goto(tabId === 'subject' ? subjectPath(state.ui.selectedSubjectId) : tabPath);
  }
</script>

<nav class="mobile-nav" aria-label="Main navigation">
  {#each tabs as tab}
    <button
      type="button"
      class="tab"
      class:active={isActive(tab.id)}
      aria-current={isActive(tab.id) ? 'page' : undefined}
      onclick={() => navigate(tab.id, tab.path)}
    >
      <span class="tab-icon" aria-hidden="true">{tab.icon}</span>
      <span class="tab-label">{tab.label}</span>
    </button>
  {/each}
</nav>

<style>
  .mobile-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    display: flex;
    align-items: stretch;
    background: var(--glass-bg-tile);
    backdrop-filter: var(--glass-blur-tile);
    border-top: 1px solid var(--border-strong);
    box-shadow: 0 -4px 24px rgba(15, 23, 42, 0.1);
    /* Safe area for home indicator on iPhones */
    padding-bottom: var(--safe-bottom);
    height: calc(var(--mobile-nav-height) + var(--safe-bottom));
  }

  :global(:root[data-theme='dark']) .mobile-nav {
    box-shadow: 0 -4px 24px rgba(2, 6, 23, 0.4);
  }

  .tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.2rem;
    padding: 0.5rem 0.25rem 0.3rem;
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font: inherit;
    min-height: var(--touch-target);
    transition:
      color var(--motion-fast) var(--ease-soft),
      background var(--motion-fast) var(--ease-soft);
    /* Remove global button hover translateY on mobile */
    transform: none !important;
  }

  .tab:hover:not(:disabled) {
    color: var(--text-soft);
    background: color-mix(in srgb, var(--accent) 5%, transparent);
    transform: none !important;
    box-shadow: none;
  }

  .tab:active:not(:disabled) {
    transform: scale(0.94) !important;
    background: color-mix(in srgb, var(--accent) 8%, transparent);
  }

  .tab.active {
    color: var(--accent);
  }

  .tab-icon {
    font-size: 1.15rem;
    line-height: 1;
    transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .tab.active .tab-icon {
    transform: scale(1.1);
  }

  .tab-label {
    font-size: 0.67rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    line-height: 1;
  }
</style>
