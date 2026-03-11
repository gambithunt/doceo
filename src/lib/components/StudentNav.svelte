<script lang="ts">
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { appState } from '$lib/stores/app-state';
  import type { AppScreen, AppState } from '$lib/types';

  export let state: AppState;

  const links: Array<{ id: AppScreen; label: string }> = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'subject', label: 'Subject' },
    { id: 'lesson', label: 'Lesson' },
    { id: 'revision', label: 'Revision' },
    { id: 'ask', label: 'Ask Question' },
    { id: 'progress', label: 'Progress' }
  ];
</script>

<aside class="sidebar">
  <div class="brand">
    <p class="eyebrow">Doceo</p>
    <h1>{state.profile.fullName}</h1>
    <p>{state.profile.grade} · {state.profile.curriculum} · {state.profile.country}</p>
  </div>

  <ThemeToggle theme={state.ui.theme} />

  <nav class="nav">
    {#each links as link}
      <button
        type="button"
        class:active={state.ui.currentScreen === link.id}
        onclick={() => appState.setScreen(link.id)}
      >
        {link.label}
      </button>
    {/each}
  </nav>

  <section class="card">
    <p class="eyebrow">Current subject</p>
    <h2>{state.curriculum.subjects.find((item) => item.id === state.ui.selectedSubjectId)?.name}</h2>
    <label>
      <span>Subject</span>
      <select bind:value={state.ui.selectedSubjectId} onchange={(event) => appState.selectSubject((event.currentTarget as HTMLSelectElement).value)}>
        {#each state.curriculum.subjects as subject}
          <option value={subject.id}>{subject.name}</option>
        {/each}
      </select>
    </label>
  </section>

  <button type="button" class="signout" onclick={() => appState.signOut()}>Sign out</button>
</aside>

<style>
  .sidebar {
    display: grid;
    gap: 1rem;
    align-content: start;
  }

  .brand,
  .nav {
    display: grid;
    gap: 0.75rem;
  }

  .nav button,
  .signout {
    border: 1px solid var(--border);
    border-radius: 1rem;
    background: var(--surface);
    color: var(--text);
    padding: 0.85rem 1rem;
    text-align: left;
    font: inherit;
    cursor: pointer;
  }

  .nav button.active {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 14%, var(--surface));
  }

  .card {
    display: grid;
    gap: 0.8rem;
    border: 1px solid var(--border);
    border-radius: 1.5rem;
    background: var(--surface);
    padding: 1rem;
  }

  label {
    display: grid;
    gap: 0.45rem;
  }

  select {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 1rem;
    background: var(--surface-soft);
    color: var(--text);
    padding: 0.85rem 1rem;
    font: inherit;
  }

  .eyebrow,
  h1,
  h2,
  p,
  span {
    margin: 0;
  }

  .eyebrow,
  span {
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.72rem;
  }
</style>
