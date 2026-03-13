<script lang="ts">
  import { appState } from '$lib/stores/app-state';
  import { getLessonsForSelectedTopic, getSelectedSubject, getSelectedTopic } from '$lib/data/platform';
  import type { AppState } from '$lib/types';

  const { state: viewState }: { state: AppState } = $props();

  const subject = $derived(getSelectedSubject(viewState));
  const topic = $derived(getSelectedTopic(viewState));
  const lessons = $derived(getLessonsForSelectedTopic(viewState));
  const chosenSubjects = $derived([
    ...viewState.onboarding.selectedSubjectNames,
    ...viewState.onboarding.customSubjects
  ]);
  const addableSubjects = $derived(
    viewState.onboarding.options.subjects.filter(
      (subjectOption) => !viewState.onboarding.selectedSubjectNames.includes(subjectOption.name)
    )
  );
  let showAddPanel = $state(false);
  let selectedAdditionalSubject = $state('');
  let customSubject = $state('');

  $effect(() => {
    if (!selectedAdditionalSubject && addableSubjects.length > 0) {
      selectedAdditionalSubject = addableSubjects[0].name;
    }
  });

  async function addSelectedSubject(): Promise<void> {
    if (selectedAdditionalSubject.length === 0) {
      return;
    }

    await appState.addSubjectToProfile(selectedAdditionalSubject);
    showAddPanel = false;
  }

  async function addCustomSubject(): Promise<void> {
    if (customSubject.trim().length === 0) {
      return;
    }

    await appState.addSubjectToProfile(customSubject.trim());
    customSubject = '';
    showAddPanel = false;
  }
</script>

<section class="view">
  <header class="card hero">
    <div>
      <p class="eyebrow">Subjects</p>
      <h2>Your chosen subjects</h2>
      <p>Keep your active study subjects current. Suggested subjects come first, then you can add a custom one if needed.</p>
    </div>
    <button type="button" class="primary" onclick={() => (showAddPanel = !showAddPanel)}>
      {showAddPanel ? 'Close' : 'Add more'}
    </button>
  </header>

  <article class="card">
    <div class="subject-list">
      {#each chosenSubjects as subjectName}
        <div class:active={subject.name === subjectName} class="subject-pill">
          <button
            type="button"
            class="subject-button"
            onclick={() => appState.selectSubject(viewState.curriculum.subjects.find((item) => item.name === subjectName)?.id ?? viewState.ui.selectedSubjectId)}
          >
            {subjectName}
          </button>
          <button type="button" class="remove-button" onclick={() => appState.removeSubjectFromProfile(subjectName)}>
            Remove
          </button>
        </div>
      {/each}
    </div>

    {#if showAddPanel}
      <div class="add-panel">
        <label>
          <span>Suggested subjects</span>
          <select bind:value={selectedAdditionalSubject}>
            {#each addableSubjects as subjectOption}
              <option value={subjectOption.name}>{subjectOption.name}</option>
            {/each}
          </select>
        </label>
        <button
          type="button"
          class="secondary"
          onclick={addSelectedSubject}
          disabled={addableSubjects.length === 0}
        >
          Add suggested subject
        </button>

        <label>
          <span>Or add your own subject</span>
          <input bind:value={customSubject} placeholder="Type a subject name" />
        </label>
        <button type="button" class="secondary" onclick={addCustomSubject}>Add custom subject</button>
      </div>
    {/if}
  </article>

  <header class="card">
    <p class="eyebrow">Current subject</p>
    <h2>{subject.name}</h2>
    <p>Follow the topic roadmap in order so each lesson builds on the previous one.</p>
  </header>

  <div class="grid">
    <article class="card">
      <h3>Topics</h3>
      <div class="stack">
        {#each subject.topics as item}
          <button type="button" class:active={item.id === topic.id} class="menu-button" onclick={() => appState.selectTopic(item.id)}>
            {item.name}
          </button>
        {/each}
      </div>
    </article>

    <article class="card">
      <h3>Subtopics</h3>
      <div class="stack">
        {#each topic.subtopics as subtopic}
          <button
            type="button"
            class:active={subtopic.id === viewState.ui.selectedSubtopicId}
            class="menu-button"
            onclick={() => appState.selectSubtopic(subtopic.id)}
          >
            {subtopic.name}
          </button>
        {/each}
      </div>
    </article>

    <article class="card">
      <h3>Lessons</h3>
      <div class="stack">
        {#each lessons as lesson}
          <button
            type="button"
            class:active={lesson.id === viewState.ui.selectedLessonId}
            class="menu-button"
            onclick={() => appState.selectLesson(lesson.id)}
          >
            {lesson.title}
          </button>
        {/each}
      </div>
    </article>
  </div>
</section>

<style>
  .view,
  .grid,
  .stack,
  .hero,
  .add-panel {
    display: grid;
    gap: 1rem;
  }

  .hero {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
  }

  .grid {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }

  .card {
    display: grid;
    gap: 0.9rem;
    border: 1px solid var(--border);
    border-radius: 1.6rem;
    background: linear-gradient(180deg, var(--surface-strong), var(--surface));
    padding: 1.2rem;
    box-shadow: var(--shadow);
    backdrop-filter: blur(24px);
  }

  .subject-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .subject-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem;
    border-radius: 1.1rem;
    background: color-mix(in srgb, var(--accent) 12%, var(--surface));
    border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--border));
  }

  .subject-pill.active {
    background: color-mix(in srgb, var(--accent) 18%, var(--surface));
  }

  .subject-button,
  .remove-button,
  .menu-button,
  .primary,
  .secondary {
    font: inherit;
    cursor: pointer;
    border: 1px solid var(--border);
    border-radius: 1rem;
    transition:
      transform 120ms ease,
      background 120ms ease,
      border-color 120ms ease;
  }

  .subject-button,
  .menu-button,
  .secondary {
    background: var(--surface-soft);
    color: var(--text);
    padding: 0.8rem 1rem;
    text-align: left;
  }

  .subject-button {
    background: transparent;
    border-color: transparent;
    padding: 0.65rem 0.8rem;
  }

  .remove-button {
    background: rgba(255, 255, 255, 0.78);
    color: var(--text-soft);
    padding: 0.58rem 0.75rem;
  }

  .primary {
    background: var(--accent);
    color: var(--accent-contrast);
    border-color: transparent;
    padding: 0.85rem 1.1rem;
  }

  .menu-button.active {
    border-color: color-mix(in srgb, var(--accent) 48%, transparent);
    background: color-mix(in srgb, var(--accent) 14%, var(--surface));
  }

  button:hover {
    transform: translateY(-1px);
  }

  label {
    display: grid;
    gap: 0.45rem;
  }

  select,
  input {
    width: 100%;
    border: 1px solid var(--border-strong);
    border-radius: 1rem;
    background: var(--surface-tint);
    color: var(--text);
    padding: 0.85rem 1rem;
    font: inherit;
  }

  p,
  h2,
  h3,
  .eyebrow {
    margin: 0;
  }

  .eyebrow,
  label span {
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.72rem;
  }

  @media (max-width: 840px) {
    .hero {
      grid-template-columns: 1fr;
    }
  }
</style>
