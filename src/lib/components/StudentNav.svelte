<script lang="ts">
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { appState } from '$lib/stores/app-state';
  import type { AppScreen, AppState } from '$lib/types';

  const { state }: { state: AppState } = $props();

  const links: Array<{ id: AppScreen; label: string; caption: string }> = [
    { id: 'dashboard', label: 'Dashboard', caption: 'Next steps and focus areas' },
    { id: 'subject', label: 'Subjects', caption: 'Roadmap and active topics' },
    { id: 'lesson', label: 'Lesson', caption: 'Learn in sequence' },
    { id: 'revision', label: 'Revision', caption: 'Exam-focused practice' },
    { id: 'ask', label: 'Ask Question', caption: 'Targeted help only' },
    { id: 'progress', label: 'Progress', caption: 'Mastery and sessions' },
    { id: 'settings', label: 'Settings', caption: 'Academic profile' }
  ];

  const activeSubject = $derived(
    state.curriculum.subjects.find((item) => item.id === state.ui.selectedSubjectId) ?? state.curriculum.subjects[0]
  );
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

  <nav class="nav card">
    {#each links as link}
      <button
        type="button"
        class:active={state.ui.currentScreen === link.id}
        onclick={() => appState.setScreen(link.id)}
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

  <section class="card info-card">
    <p class="eyebrow">Current subject</p>
    <h2>{activeSubject.name}</h2>
    <label>
      <span>Switch subject</span>
      <select
        value={state.ui.selectedSubjectId}
        onchange={(event) => appState.selectSubject((event.currentTarget as HTMLSelectElement).value)}
      >
        {#each state.curriculum.subjects as subject}
          <option value={subject.id}>{subject.name}</option>
        {/each}
      </select>
    </label>
  </section>

  <button type="button" class="signout" onclick={() => appState.signOut()}>Sign out</button>
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
    align-content: start;
  }

  .card {
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    background: linear-gradient(180deg, var(--surface-strong), var(--surface));
    padding: 1.15rem;
    box-shadow: var(--shadow);
    backdrop-filter: blur(24px);
  }

  .brand-top,
  .stat-row {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    align-items: center;
  }

  .brand-copy h1 {
    font-size: 1.4rem;
  }

  .brand-copy p,
  .stat-row span,
  label span {
    color: var(--muted);
  }

  .nav button {
    display: grid;
    gap: 0.25rem;
    border: 1px solid var(--border);
    border-radius: 1.1rem;
    background: var(--surface-soft);
    color: var(--text);
    padding: 0.95rem 1rem;
    text-align: left;
    font: inherit;
    cursor: pointer;
    transition:
      border-color 120ms ease,
      transform 120ms ease,
      background 120ms ease;
  }

  .nav button span {
    font-size: 0.8rem;
    letter-spacing: 0;
    text-transform: none;
    color: var(--muted);
  }

  .nav button.active {
    border-color: color-mix(in srgb, var(--accent) 48%, transparent);
    background: color-mix(in srgb, var(--accent) 16%, var(--surface));
    transform: translateY(-1px);
  }

  .subjects {
    display: flex;
    gap: 0.55rem;
    flex-wrap: wrap;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    padding: 0.45rem 0.7rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 18%, var(--surface));
    border: 1px solid color-mix(in srgb, var(--accent) 20%, var(--border));
  }

  .pill.soft {
    background: var(--surface-soft);
  }

  label {
    display: grid;
    gap: 0.45rem;
  }

  select {
    width: 100%;
    border: 1px solid var(--border-strong);
    border-radius: 1rem;
    background: var(--surface-tint);
    color: var(--text);
    padding: 0.85rem 1rem;
    font: inherit;
  }

  .signout {
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
    color: var(--text);
    padding: 0.9rem 1rem;
    font: inherit;
    cursor: pointer;
  }

  .eyebrow,
  h1,
  h2,
  p,
  span,
  strong {
    margin: 0;
  }

  .eyebrow,
  label span {
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.72rem;
  }
</style>
