<script lang="ts">
  import AnimatedStatNumber from '$lib/components/AnimatedStatNumber.svelte';
  import { getCompletionSummary } from '$lib/data/platform';
  import { getStageLabel } from '$lib/lesson-system';
  import { appState } from '$lib/stores/app-state';
  import type { AppState, LessonSession, ShortlistedTopic, Subject } from '$lib/types';

  const { state: viewState }: { state: AppState } = $props();
  let topicInputFocused = $state(false);
  let shouldAutofillTopicInput = $state(true);

  const summary = $derived(getCompletionSummary(viewState));
  const availableSubjects = $derived(viewState.curriculum.subjects);
  const activeLessons = $derived(
    viewState.lessonSessions
      .filter((session) => session.status === 'active')
      .sort((left, right) => Date.parse(right.lastActiveAt) - Date.parse(left.lastActiveAt))
  );
  const currentSession = $derived(activeLessons[0] ?? null);
  const recentLessons = $derived(
    viewState.lessonSessions
      .filter((session) => session.status !== 'archived')
      .sort((left, right) => Date.parse(right.lastActiveAt) - Date.parse(left.lastActiveAt))
      .slice(0, 6)
  );
  const selectedSubject = $derived(
    availableSubjects.find((subject) => subject.id === viewState.topicDiscovery.selectedSubjectId) ?? availableSubjects[0]
  );
  const promptSuggestions = $derived.by(() => buildSubjectSuggestions(selectedSubject));
  const promptSuggestionsText = $derived.by(() => promptSuggestions.join('\n'));
  const showingAutofillHint = $derived(viewState.topicDiscovery.input === promptSuggestionsText);
  const assistantStatus = $derived.by(() => {
    switch (viewState.topicDiscovery.status) {
      case 'loading':
        return 'Finding curriculum matches...';
      case 'ready':
        return viewState.topicDiscovery.shortlist ? 'Pick your topic to begin' : 'Ready to map your idea';
      case 'error':
        return 'Unable to match right now';
      default:
        return currentSession ? 'Teaching in progress' : 'Ready to map your idea';
    }
  });

  $effect(() => {
    if (!selectedSubject || !shouldAutofillTopicInput) {
      return;
    }

    if (viewState.topicDiscovery.input !== promptSuggestionsText) {
      appState.setTopicDiscoveryInput(promptSuggestionsText);
    }
  });

  function buildSubjectSuggestions(subject: Subject | null | undefined): string[] {
    if (!subject) {
      return [
        'Number patterns',
        'Fractions',
        'Algebra basics',
        'Geometry foundations',
        'Word problems',
        'The part I keep getting wrong'
      ];
    }

    const sectionNames = subject.topics.flatMap((topic) =>
      topic.subtopics.length > 0 ? [topic.name, ...topic.subtopics.map((subtopic) => subtopic.name)] : [topic.name]
    );
    const suggestions = Array.from(new Set(sectionNames.map((name) => name.trim()).filter((name) => name.length > 0))).slice(0, 12);

    return suggestions.length > 0 ? suggestions : subject.topics.map((topic) => topic.name).slice(0, 12);
  }

  function onInput(event: Event): void {
    shouldAutofillTopicInput = false;
    appState.setTopicDiscoveryInput((event.currentTarget as HTMLTextAreaElement).value);
  }

  function onTopicFocus(): void {
    if (viewState.topicDiscovery.input === promptSuggestionsText) {
      appState.setTopicDiscoveryInput('');
    }

    shouldAutofillTopicInput = false;
    topicInputFocused = true;
  }

  function onTopicBlur(): void {
    topicInputFocused = false;
  }

  function onSubjectChange(event: Event): void {
    shouldAutofillTopicInput = true;
    appState.selectSubject((event.currentTarget as HTMLSelectElement).value);
  }

  function resetTopicDiscovery(): void {
    shouldAutofillTopicInput = true;
    appState.resetTopicDiscovery();
  }

  function runShortlist(): void {
    if (!selectedSubject || viewState.topicDiscovery.input.trim().length === 0) {
      return;
    }

    void appState.shortlistTopics(selectedSubject.id, viewState.topicDiscovery.input.trim());
  }

  function startTopic(topic: ShortlistedTopic): void {
    void appState.startLessonFromShortlist(topic);
  }

  function startFromBanner(session: LessonSession): void {
    appState.resumeSession(session.id);
  }
</script>

<section class="view">
  <header class="hero card">
    <div class="hero-copy">
      <p class="eyebrow">{currentSession ? 'Continue where you left off' : 'Start new'}</p>
      {#if currentSession}
        <h2>{currentSession.subject}</h2>
        <p class="topic-title">{currentSession.topicTitle}</p>
        <p class="topic-copy">{currentSession.topicDescription}</p>
        <div class="progress-copy">
          <span>Progress</span>
          <strong>
            Stage {Math.min(currentSession.stagesCompleted.length + 1, 5)} of 5 ·
            {getStageLabel(currentSession.currentStage)}
          </strong>
        </div>
        <small>Last opened {new Date(currentSession.lastActiveAt).toLocaleString()}</small>
      {:else}
        <h2>Choose what to learn</h2>
        <p>Tell the assistant what you want to work on and it will match that to your curriculum.</p>
      {/if}
    </div>

    <div class="hero-actions">
      {#if currentSession}
        <button type="button" class="primary wide" onclick={() => startFromBanner(currentSession)}>Resume lesson</button>
        <button type="button" class="link-button" onclick={resetTopicDiscovery}>
          Start something new instead
        </button>
      {:else}
        <button type="button" class="primary wide" onclick={runShortlist}>Find my section</button>
      {/if}
    </div>
  </header>

  <section class="card starter">
    <div class="starter-copy">
      <div>
        <p class="eyebrow">Assistant stage</p>
        <h3>{assistantStatus}</h3>
      </div>
      <p>Describe the topic in your own words, then choose the closest curriculum match.</p>
    </div>

    {#if viewState.ui.showTopicDiscoveryComposer || !currentSession || viewState.topicDiscovery.status !== 'idle' || viewState.topicDiscovery.input.length > 0}
      <div class="starter-form">
        <label>
          <span>Subject</span>
          <select
            value={selectedSubject?.id}
            onchange={onSubjectChange}
          >
            {#each availableSubjects as subject}
              <option value={subject.id}>{subject.name}</option>
            {/each}
          </select>
        </label>

        <label>
          <span>What do you want to work on?</span>
          <div class="topic-input-wrap">
            <textarea
              class:hinted={showingAutofillHint}
              rows="4"
              value={viewState.topicDiscovery.input}
              oninput={onInput}
              onfocus={onTopicFocus}
              onblur={onTopicBlur}
            ></textarea>
          </div>
        </label>

        <div class="starter-actions">
          <button type="button" class="primary" onclick={runShortlist} disabled={viewState.topicDiscovery.status === 'loading'}>
            {viewState.topicDiscovery.status === 'loading' ? 'Finding matches...' : 'Find my section'}
          </button>
          {#if viewState.topicDiscovery.shortlist}
            <button type="button" class="secondary" onclick={resetTopicDiscovery}>
              Search for something else
            </button>
          {/if}
        </div>
      </div>
    {/if}

    {#if viewState.topicDiscovery.error}
      <p class="error">{viewState.topicDiscovery.error}</p>
    {/if}

    {#if viewState.topicDiscovery.shortlist}
      <div class="shortlist">
        <div class="shortlist-header">
          <div>
            <p class="eyebrow">Curriculum matches</p>
            <h3>Found in: {viewState.topicDiscovery.shortlist.matchedSection}</h3>
          </div>
          <p>{viewState.profile.curriculum} · {viewState.profile.grade} · {selectedSubject?.name} · {viewState.profile.term}</p>
        </div>

        <div class="topic-list">
          {#each viewState.topicDiscovery.shortlist.subtopics as topic, index}
            <button type="button" class="topic-card" onclick={() => startTopic(topic)}>
              <span class="topic-index">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <strong>{topic.title}</strong>
                <p>{topic.description}</p>
                <small>{topic.curriculumReference}</small>
              </div>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </section>

  <section class="card recent">
    <div class="section-head">
      <div>
        <p class="eyebrow">Recent lessons</p>
        <h3>Pick up a recent topic</h3>
      </div>
    </div>

    <div class="recent-grid">
      {#each recentLessons as session}
        <article class="recent-card">
          <small>{new Date(session.lastActiveAt).toLocaleDateString()}</small>
          <strong>{session.subject}</strong>
          <h4>{session.topicTitle}</h4>
          <p>Stage completed: {session.stagesCompleted.length} of 5</p>
          <div class="recent-actions">
            <button type="button" class="primary compact" onclick={() => appState.resumeSession(session.id)}>Resume</button>
            <details class="overflow-menu">
              <summary class="secondary compact">More</summary>
              <div class="overflow-panel">
                <button type="button" class="menu-item" onclick={() => appState.resumeSession(session.id)}>View notes</button>
                <button type="button" class="menu-item" onclick={() => appState.restartLessonSession(session.id)}>Restart</button>
                <button type="button" class="menu-item danger" onclick={() => appState.archiveSession(session.id)}>Archive</button>
              </div>
            </details>
          </div>
        </article>
      {/each}
    </div>
  </section>

  <section class="stats">
    <article class="card stat-card">
      <strong><AnimatedStatNumber value={summary.completedLessons} />/{summary.totalLessons}</strong>
      <span>Completed</span>
    </article>
    <article class="card stat-card">
      <strong><AnimatedStatNumber value={summary.averageMastery} suffix="%" /></strong>
      <span>Mastery</span>
    </article>
    <article class="card stat-card">
      <strong><AnimatedStatNumber value={activeLessons.length} /></strong>
      <span>Active</span>
    </article>
  </section>
</section>

<style>
  .view,
  .hero,
  .starter,
  .starter-form,
  .shortlist,
  .topic-list,
  .recent,
  .recent-grid,
  .stats {
    display: grid;
    gap: 1rem;
  }

  .card,
  .recent-card {
    border: 1px solid var(--border);
    border-radius: 1.6rem;
    background: linear-gradient(180deg, var(--surface-strong), var(--surface));
    padding: 1.2rem;
    box-shadow: var(--shadow);
  }

  .hero {
    grid-template-columns: minmax(0, 1fr) minmax(260px, 320px);
    align-items: end;
  }

  .hero-copy,
  .hero-actions,
  .starter-copy,
  .shortlist-header,
  .section-head,
  .recent-card {
    display: grid;
    gap: 0.7rem;
  }

  .hero-actions {
    justify-items: stretch;
  }

  .starter-copy {
    grid-template-columns: minmax(0, 1fr) minmax(220px, 320px);
    align-items: start;
  }

  .starter-actions,
  .recent-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .topic-list {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }

  .topic-card {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1rem;
    align-items: start;
    border: 1px solid var(--border);
    border-left: 4px solid color-mix(in srgb, var(--accent) 40%, var(--border));
    border-radius: 1.2rem;
    background: var(--surface-soft);
    padding: 1rem;
    text-align: left;
    font: inherit;
    cursor: pointer;
  }

  .topic-index {
    color: var(--muted);
    font-size: 0.8rem;
    letter-spacing: 0.08em;
  }

  .topic-card p,
  .topic-card small,
  .starter-copy p,
  .hero-copy p,
  .recent-card p {
    color: var(--text-soft);
  }

  .recent-grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .stat-card {
    align-items: center;
    text-align: center;
  }

  button,
  select,
  textarea {
    font: inherit;
  }

  button {
    cursor: pointer;
  }

  .primary,
  .secondary,
  .link-button {
    border-radius: 999px;
    padding: 0.85rem 1.1rem;
  }

  .primary {
    border: 0;
    background: var(--accent);
    color: var(--accent-contrast);
  }

  .secondary {
    border: 1px solid var(--border);
    background: var(--surface-soft);
    color: var(--text);
  }

  .link-button {
    border: 0;
    background: transparent;
    color: var(--muted);
    text-align: left;
    padding-inline: 0;
  }

  .wide {
    width: 100%;
  }

  .compact {
    padding: 0.7rem 0.95rem;
  }

  .overflow-menu {
    position: relative;
  }

  .overflow-menu summary {
    list-style: none;
  }

  .overflow-menu summary::-webkit-details-marker {
    display: none;
  }

  .overflow-panel {
    position: absolute;
    right: 0;
    top: calc(100% + 0.45rem);
    min-width: 180px;
    display: grid;
    gap: 0.35rem;
    padding: 0.45rem;
    border: 1px solid var(--border);
    border-radius: 1rem;
    background: var(--surface);
    box-shadow: var(--shadow);
    z-index: 5;
  }

  .menu-item {
    border: 0;
    border-radius: 0.8rem;
    background: var(--surface-soft);
    color: var(--text);
    text-align: left;
    padding: 0.75rem 0.85rem;
  }

  .menu-item.danger {
    color: #991b1b;
  }

  select,
  textarea {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 1rem;
    background: var(--surface-soft);
    color: var(--text);
    padding: 0.9rem 1rem;
  }

  .topic-input-wrap {
    position: relative;
  }

  .topic-input-wrap textarea {
    min-height: 11rem;
    resize: vertical;
  }

  .topic-input-wrap textarea.hinted {
    color: color-mix(in srgb, var(--muted) 76%, var(--text-soft) 24%);
  }

  .progress-copy {
    display: flex;
    gap: 0.65rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .eyebrow,
  h2,
  h3,
  h4,
  p,
  small,
  strong,
  span {
    margin: 0;
  }

  .eyebrow {
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.72rem;
  }

  .topic-title {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--text);
  }

  .error {
    color: #b91c1c;
  }

  @media (max-width: 900px) {
    .hero,
    .starter-copy,
    .stats {
      grid-template-columns: 1fr;
    }
  }

</style>
