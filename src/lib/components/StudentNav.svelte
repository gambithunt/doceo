<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { appState } from '$lib/stores/app-state';
  import {
    dashboardPath,
    progressPath,
    revisionPath,
    settingsPath,
    subjectPath
  } from '$lib/routing';
  import type { AppScreen, AppState } from '$lib/types';

  const { state }: { state: AppState } = $props();

  const links = $derived([
    { id: 'dashboard',  label: 'Dashboard',   icon: '◈',  path: dashboardPath() },
    { id: 'subject',    label: 'Curriculum',   icon: '◎',  path: subjectPath(state.ui.selectedSubjectId) },
    { id: 'revision',   label: 'Revision',     icon: '↺',  path: revisionPath() },
    { id: 'progress',   label: 'Progress',     icon: '↗',  path: progressPath() },
    { id: 'settings',   label: 'Settings',     icon: '◐',  path: settingsPath() }
  ]);

  function isActive(linkId: string): boolean {
    const pathname = $page.url.pathname;
    if (linkId === 'subject') return pathname.startsWith('/subjects');
    return pathname === links.find((link) => link.id === linkId)?.path;
  }

  function navigateToLink(linkId: string, linkPath: string): void {
    appState.setScreen(linkId as AppScreen);
    void goto(linkPath);
  }

  function toggleTheme(): void {
    appState.setTheme(state.ui.theme === 'dark' ? 'light' : 'dark');
  }
</script>

<aside class="sidebar">

  <div class="brand">
    <div class="brand-mark">D</div>
    <div class="brand-copy">
      <h1>Doceo</h1>
      <p>{state.profile.grade} · {state.profile.curriculum}</p>
    </div>
  </div>

  <nav aria-label="Primary">
    {#each links as link}
      <button
        type="button"
        class="nav-item"
        class:active={isActive(link.id)}
        aria-current={isActive(link.id) ? 'page' : undefined}
        onclick={() => navigateToLink(link.id, link.id === 'subject' ? subjectPath(state.ui.selectedSubjectId) : link.path)}
      >
        <span class="nav-icon" aria-hidden="true">{link.icon}</span>
        <span class="nav-label">{link.label}</span>
      </button>
    {/each}
  </nav>

  <div class="sidebar-footer">
    <div class="footer-row">
      <button type="button" class="btn btn-secondary signout" onclick={() => appState.signOut()}>
        Sign out
      </button>
      <button
        type="button"
        class="theme-btn"
        onclick={toggleTheme}
        aria-label={state.ui.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={state.ui.theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {state.ui.theme === 'dark' ? '☀︎' : '☽'}
      </button>
    </div>
  </div>

</aside>

<style>
  .sidebar {
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 0.75rem;
    min-height: 0;
    min-width: 0;
    overflow-x: hidden;
    overflow-y: auto;
  }

  /* ── Brand ── */
  .brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: var(--surface-strong);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    padding: 0.9rem 1rem;
    box-shadow: var(--shadow);
  }

  .brand-mark {
    width: 2.4rem;
    height: 2.4rem;
    border-radius: var(--radius-md);
    background: var(--accent);
    color: var(--accent-contrast);
    font-size: 1.1rem;
    font-weight: 800;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .brand-copy {
    min-width: 0;
  }

  .brand-copy h1 {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.02em;
  }

  .brand-copy p {
    font-size: 0.75rem;
    color: var(--text-soft);
    margin-top: 0.1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── Nav ── */
  nav {
    display: grid;
    gap: 0.35rem;
    background: var(--surface-strong);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    padding: 0.6rem;
    box-shadow: var(--shadow);
    align-content: start;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    border: 1px solid transparent;
    border-radius: calc(var(--radius-lg) - 0.4rem);
    background: transparent;
    color: var(--text-soft);
    padding: 0.7rem 0.85rem;
    text-align: left;
    font: inherit;
    font-size: 0.92rem;
    font-weight: 500;
    cursor: pointer;
    transition:
      background var(--motion-fast) var(--ease-soft),
      color var(--motion-fast) var(--ease-soft),
      border-color var(--motion-fast) var(--ease-soft);
  }

  .nav-item:hover {
    background: var(--surface-soft);
    color: var(--text);
    transform: none;
    box-shadow: none;
  }

  .nav-item.active {
    background: var(--accent-dim);
    border-color: color-mix(in srgb, var(--accent) 30%, transparent);
    color: var(--text);
    font-weight: 700;
  }

  .nav-icon {
    font-size: 1rem;
    line-height: 1;
    flex-shrink: 0;
    font-style: normal;
  }

  .nav-label {
    flex: 1;
  }

  /* ── Footer ── */
  .sidebar-footer {
    display: grid;
    gap: 0.6rem;
  }

  .footer-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .signout {
    flex: 1;
    font: inherit;
    font-size: 0.88rem;
  }

  .theme-btn {
    width: 2.4rem;
    height: 2.4rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-strong);
    background: var(--surface-strong);
    color: var(--text-soft);
    font-size: 1rem;
    display: grid;
    place-items: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: color var(--motion-fast) var(--ease-soft), background var(--motion-fast) var(--ease-soft);
  }

  .theme-btn:hover {
    color: var(--text);
    background: var(--surface-soft);
    transform: none;
    box-shadow: none;
  }

  h1, p, span {
    margin: 0;
  }

  /* Hidden on mobile — MobileNav takes over */
  @media (max-width: 767px) {
    .sidebar {
      display: none;
    }
  }
</style>
