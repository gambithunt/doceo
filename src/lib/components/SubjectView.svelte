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
          <button type="button" class="remove-button ghost" onclick={() => appState.removeSubjectFromProfile(subjectName)}>
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
          class="btn btn-secondary"
          onclick={addSelectedSubject}
          disabled={addableSubjects.length === 0}
        >
          Add suggested subject
        </button>

        <label>
          <span>Or add your own subject</span>
          <input bind:value={customSubject} placeholder="Type a subject name" />
        </label>
        <button type="button" class="btn btn-secondary" onclick={addCustomSubject}>Add custom subject</button>
      </div>
    {/if}

    <div class="subject-actions">
      <button type="button" class="btn btn-primary" onclick={() => (showAddPanel = !showAddPanel)}>
        {showAddPanel ? 'Close' : 'Add more'}
      </button>
    </div>
  </article>

  <header class="card compact-header">
    <p class="eyebrow">Current subject</p>
    <h2>{subject.name}</h2>
    <p>Follow the topic roadmap in order so each lesson builds on the previous one.</p>
  </header>

  <div class="grid">
    <article class="card">
      <h3 class="column-heading">Topics</h3>
      <div class="stack">
        {#each subject.topics as item}
          <button type="button" class:active={item.id === topic.id} class="menu-button" onclick={() => appState.selectTopic(item.id)}>
            {item.name}
          </button>
        {/each}
      </div>
    </article>

    <article class="card">
      <h3 class="column-heading">Subtopics</h3>
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
      <h3 class="column-heading">Lessons</h3>
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
    align-items: start;
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

  .compact-header {
    gap: 0.55rem;
    padding-block: 1rem;
  }

  .subject-list {
    display: grid;
    gap: 0.6rem;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }

  .subject-pill {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.45rem;
    padding: 0.4rem;
    border-radius: 0.95rem;
    background: color-mix(in srgb, var(--accent) 9%, var(--surface));
    border: 1px solid color-mix(in srgb, var(--accent) 16%, var(--border));
    min-height: 3rem;
  }

  .subject-pill.active {
    background: color-mix(in srgb, var(--accent) 18%, var(--surface));
  }

  .subject-button,
  .remove-button,
  .menu-button {
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
  .menu-button {
    background: var(--surface-soft);
    color: var(--text);
    padding: 0.8rem 1rem;
    text-align: left;
  }

  .subject-button {
    background: transparent;
    border-color: transparent;
    padding: 0.45rem 0.7rem;
    font-weight: 600;
    line-height: 1.2;
    flex: 1;
  }

  .remove-button {
    background: rgba(255, 255, 255, 0.78);
    color: var(--text-soft);
    padding: 0.45rem 0.7rem;
    font-size: 0.78rem;
  }

  .remove-button.ghost {
    border-radius: 999px;
  }

  .subject-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.1rem;
  }

  .menu-button.active {
    border-color: color-mix(in srgb, var(--accent) 48%, transparent);
    background: color-mix(in srgb, var(--accent) 14%, var(--surface));
  }

  .menu-button {
    width: 100%;
    min-height: 3rem;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    border-radius: 0.9rem;
    text-align: left;
    transition:
      transform 170ms var(--ease-spring),
      border-color 220ms var(--ease-soft),
      background-color 220ms var(--ease-soft),
      box-shadow 220ms var(--ease-soft);
  }

  .menu-button:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--accent) 34%, var(--border));
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.09);
  }

  .column-heading {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
  }

  .grid .card {
    align-content: start;
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
