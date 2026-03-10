<script lang="ts">
  import { browser } from '$app/environment';
  import AskQuestionWorkspace from '$lib/components/AskQuestionWorkspace.svelte';
  import LessonWorkspace from '$lib/components/LessonWorkspace.svelte';
  import ModePicker from '$lib/components/ModePicker.svelte';
  import ProgressPanel from '$lib/components/ProgressPanel.svelte';
  import RevisionWorkspace from '$lib/components/RevisionWorkspace.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { createInitialState, getSelectedSubject, getSelectedTopic } from '$lib/data/platform';
  import { appState } from '$lib/stores/app-state';
  import type { AppState } from '$lib/types';

  let state: AppState = $state(createInitialState());

  const unsubscribe = appState.subscribe((value) => {
    state = value;
    if (browser) {
      document.documentElement.dataset.theme = value.ui.theme;
    }
  });

  $effect(() => {
    return () => unsubscribe();
  });

  const subject = $derived(getSelectedSubject(state));
  const topic = $derived(getSelectedTopic(state));
</script>

<svelte:head>
  <title>Doceo</title>
  <meta
    name="description"
    content="Structured AI-assisted learning platform for lessons, revision, and guided questions."
  />
</svelte:head>

{#if state}
  <div class="page-shell">
    <aside class="sidebar">
      <div class="brand">
        <p class="eyebrow">Doceo</p>
        <h1>AI-assisted learning platform</h1>
        <p>Curriculum-aligned teaching with mastery progression, revision, and guided tutoring.</p>
      </div>

      <div class="stack">
        <ThemeToggle theme={state.ui.theme} />
        <button type="button" class="reset" onclick={() => appState.reset()}>Reset Demo State</button>
      </div>

      <section class="nav-panel">
        <p class="eyebrow">Curriculum</p>
        <h2>{subject.name}</h2>
        <p>{state.curriculum.country} · {state.curriculum.name} · {state.profile.grade}</p>

        <label>
          <span>Topic</span>
          <select
            value={state.ui.selectedTopicId}
            onchange={(event) => appState.selectTopic((event.currentTarget as HTMLSelectElement).value)}
          >
            {#each subject.topics as item}
              <option value={item.id}>{item.name}</option>
            {/each}
          </select>
        </label>

        <label>
          <span>Lesson</span>
          <select
            value={state.ui.selectedLessonId}
            onchange={(event) => appState.selectLesson((event.currentTarget as HTMLSelectElement).value)}
          >
            {#each state.lessons.filter((lesson) => lesson.topicId === topic.id) as lesson}
              <option value={lesson.id}>{lesson.title}</option>
            {/each}
          </select>
        </label>
      </section>

      <ProgressPanel {state} />
    </aside>

    <main class="content">
      <section class="hero">
        <div>
          <p class="eyebrow">Structured teacher</p>
          <h2>Learn, revise, and ask targeted questions without dropping into chatbot mode.</h2>
          <p>
            The platform keeps teaching stage, lesson state, mastery, sessions, and analytics in one typed flow.
          </p>
        </div>
      </section>

      <ModePicker value={state.ui.learningMode} />

      {#if state.ui.learningMode === 'learn'}
        <LessonWorkspace {state} />
      {:else if state.ui.learningMode === 'revision'}
        <RevisionWorkspace {state} />
      {:else}
        <AskQuestionWorkspace {state} />
      {/if}
    </main>
  </div>
{/if}

<style>
  :global(body) {
    margin: 0;
  }

  .page-shell {
    min-height: 100vh;
    display: grid;
    grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  }

  .sidebar {
    display: grid;
    align-content: start;
    gap: 1rem;
    padding: 1.5rem;
    border-right: 1px solid var(--border);
    background: var(--surface-soft);
  }

  .content {
    display: grid;
    gap: 1rem;
    padding: 1.5rem;
    align-content: start;
  }

  .hero,
  .nav-panel {
    border: 1px solid var(--border);
    border-radius: 1.75rem;
    background: var(--surface);
    padding: 1.25rem;
    display: grid;
    gap: 0.9rem;
  }

  .brand,
  .stack {
    display: grid;
    gap: 0.9rem;
  }

  .eyebrow {
    margin: 0;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.72rem;
  }

  h1,
  h2,
  p {
    margin: 0;
  }

  label {
    display: grid;
    gap: 0.45rem;
  }

  span {
    color: var(--muted);
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

  .reset {
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
    color: var(--text);
    padding: 0.8rem 1.15rem;
    font: inherit;
    cursor: pointer;
  }

  @media (max-width: 980px) {
    .page-shell {
      grid-template-columns: 1fr;
    }

    .sidebar {
      border-right: 0;
      border-bottom: 1px solid var(--border);
    }
  }
</style>
