<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { appState } from '$lib/stores/app-state';
  import {
    dashboardPath,
    progressPath,
    revisionPath,
    settingsPath,
    subjectPath
  } from '$lib/routing';
  import type { AppState } from '$lib/types';

  const { state }: { state: AppState } = $props();

  const links = $derived([
    { id: 'dashboard', label: 'Dashboard', caption: 'Home, start new, resume active lesson', path: dashboardPath() },
    { id: 'subject', label: 'Subjects', caption: 'Curriculum roadmap and topic browser', path: subjectPath(state.ui.selectedSubjectId) },
    { id: 'revision', label: 'Revision', caption: 'Exam practice and spaced repetition', path: revisionPath() },
    { id: 'progress', label: 'Progress', caption: 'Mastery, sessions, and learning style', path: progressPath() },
    { id: 'settings', label: 'Settings', caption: 'Academic profile and preferences', path: settingsPath() }
  ]);

  function isActive(linkId: string): boolean {
    const pathname = $page.url.pathname;

    if (linkId === 'subject') {
      return pathname.startsWith('/subjects');
    }

    return pathname === links.find((link) => link.id === linkId)?.path;
  }
</script>

<aside class="sidebar">
  <header class="brand card">
    <div class="brand-top">
      <p class="eyebrow">Doceo</p>
      <ThemeToggle theme={state.ui.theme} />
    </div>
    <div class="brand-copy">
      <h1>{state.profile.fullName}</h1>
      <p>{state.profile.grade} · {state.profile.curriculum} · {state.profile.country}</p>
    </div>
  </header>

  <nav class="nav card" aria-label="Primary">
    {#each links as link}
      <button
        type="button"
        class:active={isActive(link.id)}
        aria-current={isActive(link.id) ? 'page' : undefined}
        onclick={() => goto(link.id === 'subject' ? subjectPath(state.ui.selectedSubjectId) : link.path)}
      >
        <strong>{link.label}</strong>
        <span>{link.caption}</span>
      </button>
    {/each}
  </nav>

  <section class="card info-card">
    <p class="eyebrow">Learning profile</p>
    <div class="stat-row">
      <span>School context</span>
      <strong>{state.profile.schoolYear} · {state.profile.term}</strong>
    </div>
    <div class="stat-row">
      <span>Recommended start</span>
      <strong>{state.profile.recommendedStartSubjectName ?? 'Not set yet'}</strong>
    </div>
    <div class="stat-row">
      <span>Subjects</span>
      <strong>{state.onboarding.selectedSubjectNames.length + state.onboarding.customSubjects.length}</strong>
    </div>
    <div class="subjects">
      {#each state.onboarding.selectedSubjectNames.slice(0, 4) as subject}
        <span class="pill">{subject}</span>
      {/each}
      {#if state.onboarding.customSubjects.length > 0}
        {#each state.onboarding.customSubjects.slice(0, 2) as subject}
          <span class="pill soft">{subject}</span>
        {/each}
      {/if}
    </div>
  </section>

  <button type="button" class="btn btn-secondary signout" onclick={() => appState.signOut()}>Sign out</button>
</aside>

<style>
  .sidebar,
  .brand,
  .brand-copy,
  .nav,
  .info-card {
    display: grid;
    gap: 1rem;
  }

  .sidebar {
    --sans: 'IBM Plex Sans', 'Helvetica Neue', sans-serif;
    --mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    align-content: start;
    min-height: 0;
    overflow-y: auto;
    padding-right: 0.15rem;
    font-family: var(--sans);
  }

  .card {
    border: 1px solid color-mix(in srgb, var(--border-strong) 72%, transparent);
    border-radius: var(--radius-xl);
    background: linear-gradient(180deg, color-mix(in srgb, var(--surface-strong) 92%, transparent), var(--surface));
    padding: 1.15rem;
    box-shadow: var(--shadow-strong);
    backdrop-filter: blur(26px);
  }

  .brand-top,
  .stat-row {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    align-items: center;
  }

  .brand {
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 8%, var(--surface)),
      color-mix(in srgb, var(--surface-strong) 90%, transparent)
    );
  }

  .brand-copy h1 {
    font-size: 1.4rem;
    line-height: 1;
    letter-spacing: -0.03em;
  }

  .brand-copy p,
  .stat-row span {
    color: var(--muted);
  }

  .nav button {
    display: grid;
    gap: 0.3rem;
    border: 1px solid color-mix(in srgb, var(--border-strong) 72%, transparent);
    border-radius: 1.2rem;
    background: color-mix(in srgb, var(--surface-soft) 72%, transparent);
    color: var(--text);
    padding: 0.82rem 0.92rem;
    text-align: left;
    font: inherit;
    cursor: pointer;
    box-shadow: none;
  }

  .nav button strong {
    font-size: 0.96rem;
    font-weight: 600;
  }

  .nav button span {
    font-size: 0.77rem;
    letter-spacing: 0;
    text-transform: none;
    color: var(--muted);
  }

  .nav button.active {
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 12%, var(--surface)),
      color-mix(in srgb, var(--accent) 6%, var(--surface-soft))
    );
    border-color: color-mix(in srgb, var(--accent) 44%, transparent);
    box-shadow: inset 0 1px 0 color-mix(in srgb, white 18%, transparent);
  }

  .subjects {
    display: flex;
    gap: 0.55rem;
    flex-wrap: wrap;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    min-height: 2rem;
    padding: 0.55rem 0.8rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-tint) 90%, transparent);
    border: 1px solid color-mix(in srgb, var(--border-strong) 82%, transparent);
    line-height: 1.1;
    max-width: 100%;
    font-size: 0.95rem;
    font-weight: 500;
  }

  .pill.soft {
    background: color-mix(in srgb, var(--accent) 10%, var(--surface-tint));
    border-color: color-mix(in srgb, var(--accent) 24%, transparent);
  }

  .signout {
    width: 100%;
    font: inherit;
  }

  .eyebrow,
  h1,
  p,
  span,
  strong {
    margin: 0;
  }

  .eyebrow {
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.72rem;
    font-family: var(--mono);
  }
</style>
