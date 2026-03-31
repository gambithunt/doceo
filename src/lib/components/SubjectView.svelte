<script lang="ts">
  import { goto } from '$app/navigation';
  import { appState } from '$lib/stores/app-state';
  import { getLessonsForSelectedTopic, getSelectedSubject, getSelectedTopic } from '$lib/data/platform';
  import { subjectPath } from '$lib/routing';
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

  function openSubject(subjectId: string): void {
    appState.selectSubject(subjectId);
    void goto(subjectPath(subjectId));
  }

  function openLesson(lessonId: string): void {
    appState.launchLesson(lessonId);
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
            onclick={() => openSubject(viewState.curriculum.subjects.find((item) => item.name === subjectName)?.id ?? viewState.ui.selectedSubjectId)}
          >
            {subjectName}
          </button>
          <div class="pill-footer">
            <button
              type="button"
              class="remove-button"
              onclick={() => appState.removeSubjectFromProfile(subjectName)}
              aria-label="Remove {subjectName}"
            >
              Remove
            </button>
          </div>
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
            onclick={() => openLesson(lesson.id)}
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

  @keyframes section-enter {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .view > * {
    animation: section-enter 0.35s var(--ease-soft) both;
  }
  .view > *:nth-child(2) { animation-delay: 0.06s; }
  .view > *:nth-child(3) { animation-delay: 0.12s; }
  .view > *:nth-child(4) { animation-delay: 0.18s; }

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
    gap: 0.65rem;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    grid-auto-rows: 1fr;
  }

  /* Pill: column layout so name gets all vertical space, remove anchors to bottom */
  .subject-pill {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem 0.85rem 0.6rem;
    border-radius: 1rem;
    background: color-mix(in srgb, var(--accent) 8%, var(--surface));
    border: 1px solid color-mix(in srgb, var(--accent) 14%, var(--border));
    transition: background 160ms, border-color 160ms, box-shadow 200ms var(--ease-soft);
    cursor: default;
  }

  .subject-pill:hover {
    background: color-mix(in srgb, var(--accent) 13%, var(--surface));
    border-color: color-mix(in srgb, var(--accent) 28%, var(--border));
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }

  .subject-pill.active {
    background: color-mix(in srgb, var(--accent) 18%, var(--surface));
    border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent);
  }

  .subject-button {
    font: inherit;
    background: transparent;
    border: none;
    color: var(--text);
    padding: 0;
    font-weight: 600;
    font-size: 0.95rem;
    line-height: 1.3;
    text-align: left;
    cursor: pointer;
    flex: 1;
    transition: color 150ms;
  }

  .subject-button:hover { color: var(--accent); transform: none; }

  /* Footer row: pushes remove button to the right */
  .pill-footer {
    display: flex;
    justify-content: flex-end;
  }

  .remove-button {
    font: inherit;
    font-size: 0.72rem;
    font-weight: 600;
    background: var(--color-red-dim);
    color: var(--color-error);
    border: 1px solid color-mix(in srgb, var(--color-error) 22%, transparent);
    border-radius: 999px;
    padding: 0.25rem 0.65rem;
    cursor: pointer;
    transition: background 150ms, border-color 150ms, transform 120ms;
  }

  .remove-button:hover {
    background: color-mix(in srgb, var(--color-error) 22%, transparent);
    border-color: color-mix(in srgb, var(--color-error) 40%, transparent);
    transform: none;
  }

  .subject-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.25rem;
  }

  .menu-button {
    font: inherit;
    cursor: pointer;
    width: 100%;
    min-height: 3rem;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    border: 1px solid var(--border);
    border-radius: 0.9rem;
    background: var(--surface-soft);
    color: var(--text);
    padding: 0.8rem 1rem;
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
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  }

  .menu-button.active {
    border-color: color-mix(in srgb, var(--accent) 48%, transparent);
    background: color-mix(in srgb, var(--accent) 14%, var(--surface));
    font-weight: 600;
  }

  .column-heading {
    font-size: 0.8rem;
    letter-spacing: 0.04em;
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
    letter-spacing: 0.04em;
    font-size: 0.72rem;
  }

  @media (max-width: 840px) {
    .hero {
      grid-template-columns: 1fr;
    }
  }

  /* ── Phone ── */
  @media (max-width: 540px) {
    .hero {
      padding: 1rem;
      border-radius: var(--radius-lg);
      gap: 0.65rem;
    }

    .hero h2 {
      font-size: clamp(1.2rem, 6vw, 1.5rem);
    }

    select,
    input {
      font-size: 16px;
    }
  }
</style>
