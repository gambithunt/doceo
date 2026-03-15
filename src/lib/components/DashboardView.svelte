<script lang="ts">
  import { browser } from '$app/environment';
  import { getAuthenticatedHeaders } from '$lib/authenticated-fetch';
  import AnimatedStatNumber from '$lib/components/AnimatedStatNumber.svelte';
  import { extractHintChipLabels } from '$lib/components/dashboard-hints';
  import { resolveSubjectHints } from '$lib/ai/subject-hints';
  import { getCompletionSummary } from '$lib/data/platform';
  import { getStageLabel } from '$lib/lesson-system';
  import { appState } from '$lib/stores/app-state';
  import type { AppState, LessonSession, ShortlistedTopic } from '$lib/types';

  const { state: viewState }: { state: AppState } = $props();
  let topicInputFocused = $state(false);
  let promptSuggestionsText = $state('');
  let hintChipsLoading = $state(false);
  let pendingChipLabel = $state<string | null>(null);
  let latestHintRequest = 0;
  let lastHintSeed = $state('');

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
  const promptSuggestionChips = $derived(extractHintChipLabels(promptSuggestionsText));
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
    if (!selectedSubject) {
      return;
    }

    const hintSeed = `${viewState.profile.curriculumId}:${viewState.profile.gradeId}:${viewState.profile.term}:${selectedSubject.id}`;
    if (hintSeed === lastHintSeed) {
      return;
    }
    lastHintSeed = hintSeed;

    promptSuggestionsText = '';
    hintChipsLoading = true;

    const requestId = ++latestHintRequest;
    void (async () => {
      try {
        const result = await resolveSubjectHints({
          subject: selectedSubject,
          curriculumId: viewState.profile.curriculumId,
          curriculumName: viewState.profile.curriculum,
          gradeId: viewState.profile.gradeId,
          gradeLabel: viewState.profile.grade,
          term: viewState.profile.term,
          fetcher: browser ? window.fetch.bind(window) : undefined,
          headers: await getAuthenticatedHeaders()
        });

        if (requestId !== latestHintRequest) {
          return;
        }

        promptSuggestionsText = result.hints.join('\n');
        hintChipsLoading = false;
      } catch {
        if (requestId !== latestHintRequest) {
          return;
        }

        promptSuggestionsText = '';
        hintChipsLoading = false;
      }
    })();
  });

  function onInput(event: Event): void {
    appState.setTopicDiscoveryInput((event.currentTarget as HTMLTextAreaElement).value);
  }

  function onTopicFocus(): void {
    topicInputFocused = true;
  }

  function onTopicBlur(): void {
    topicInputFocused = false;
  }

  function onSubjectChange(event: Event): void {
    lastHintSeed = '';
    promptSuggestionsText = '';
    pendingChipLabel = null;
    appState.setTopicDiscoveryInput('');
    appState.selectSubject((event.currentTarget as HTMLSelectElement).value);
  }

  function resetTopicDiscovery(): void {
    lastHintSeed = '';
    pendingChipLabel = null;
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

  function startFromSuggestion(hint: string): void {
    if (!selectedSubject || pendingChipLabel) {
      return;
    }

    pendingChipLabel = hint;
    appState.setTopicDiscoveryInput(hint);

    void (async () => {
      try {
        await appState.startLessonFromSelection(selectedSubject.id, hint);
      } finally {
        pendingChipLabel = null;
      }
    })();
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
        <button type="button" class="btn btn-primary wide" onclick={() => startFromBanner(currentSession)}>Resume lesson</button>
        <button type="button" class="btn btn-ghost link-button" onclick={resetTopicDiscovery}>
          Start something new instead
        </button>
      {:else}
        <button type="button" class="btn btn-primary wide" onclick={runShortlist}>Find my section</button>
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

        {#if hintChipsLoading || promptSuggestionChips.length > 0}
          <div class="hint-panel" aria-live="polite">
            <div class="hint-panel-copy">
              <span class="hint-panel-title">Quick starts</span>
              <p>Tap a suggestion to jump straight into a lesson around that theme.</p>
            </div>

            <div class="hint-chip-list">
              {#if hintChipsLoading}
                {#each Array.from({ length: 5 }) as _, index}
                  <span
                    class="hint-chip hint-chip-skeleton"
                    aria-hidden="true"
                    style={`--chip-index: ${index};`}
                  ></span>
                {/each}
              {:else}
                {#each promptSuggestionChips as hint, index}
                  <button
                    type="button"
                    class:selected={pendingChipLabel === hint}
                    class="hint-chip"
                    style={`--chip-index: ${index};`}
                    onclick={() => startFromSuggestion(hint)}
                    disabled={Boolean(pendingChipLabel)}
                  >
                    <span>{hint}</span>
                    <small>{pendingChipLabel === hint ? 'Starting...' : 'Quick start'}</small>
                  </button>
                {/each}
              {/if}
            </div>
          </div>
        {/if}

        <label>
          <span>Something more specific that you would like to work on</span>
          <div class="topic-input-wrap">
            <textarea
              rows="4"
              value={viewState.topicDiscovery.input}
              oninput={onInput}
              onfocus={onTopicFocus}
              onblur={onTopicBlur}
            ></textarea>
          </div>
        </label>

        <div class="starter-actions">
          <button type="button" class="btn btn-primary" onclick={runShortlist} disabled={viewState.topicDiscovery.status === 'loading'}>
            {viewState.topicDiscovery.status === 'loading' ? 'Finding matches...' : 'Find my section'}
          </button>
          {#if viewState.topicDiscovery.shortlist}
            <button type="button" class="btn btn-secondary" onclick={resetTopicDiscovery}>
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
            <button type="button" class="btn btn-primary btn-compact compact" onclick={() => appState.resumeSession(session.id)}>Resume</button>
            <details class="overflow-menu">
              <summary class="btn btn-secondary btn-compact compact">More</summary>
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

  .hint-panel,
  .hint-panel-copy,
  .hint-chip-list {
    display: grid;
    gap: 0.8rem;
  }

  .hint-panel {
    padding: 1rem 1.05rem 1.1rem;
    border: 1px solid color-mix(in srgb, var(--accent) 18%, var(--border));
    border-radius: 1.35rem;
    background:
      radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 14%, transparent), transparent 42%),
      linear-gradient(180deg, color-mix(in srgb, white 7%, var(--surface-soft)), color-mix(in srgb, var(--surface-soft) 88%, transparent));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.16),
      0 18px 34px rgba(8, 15, 30, 0.18);
    backdrop-filter: blur(18px);
  }

  .hint-panel-copy {
    grid-template-columns: minmax(0, 160px) minmax(0, 1fr);
    align-items: center;
  }

  .hint-panel-title {
    font-size: 0.78rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--accent) 60%, var(--text));
  }

  .hint-panel-copy p {
    color: var(--text-soft);
  }

  .hint-chip-list {
    grid-template-columns: repeat(auto-fit, minmax(180px, max-content));
    gap: 0.8rem;
    align-items: start;
  }

  .hint-chip {
    --chip-delay: calc(var(--chip-index, 0) * 48ms);
    position: relative;
    overflow: hidden;
    display: grid;
    gap: 0.28rem;
    justify-items: start;
    min-height: 4rem;
    padding: 0.88rem 1rem;
    border: 1px solid color-mix(in srgb, var(--accent) 26%, rgba(255, 255, 255, 0.16));
    border-radius: 1.1rem;
    background:
      linear-gradient(145deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.04)),
      color-mix(in srgb, var(--surface) 88%, rgba(255, 255, 255, 0.06));
    color: var(--text);
    text-align: left;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.18),
      0 16px 32px rgba(8, 15, 30, 0.16);
    backdrop-filter: blur(18px);
    transition:
      transform 180ms var(--ease-spring),
      border-color 220ms var(--ease-soft),
      box-shadow 220ms var(--ease-soft),
      background-color 220ms var(--ease-soft);
    animation: hint-chip-pop 620ms var(--chip-delay) var(--ease-spring) both;
  }

  .hint-chip::before {
    content: '';
    position: absolute;
    inset: 1px;
    border-radius: inherit;
    background: linear-gradient(120deg, rgba(255, 255, 255, 0.22), transparent 38%, transparent 62%, rgba(255, 255, 255, 0.1));
    opacity: 0.55;
    pointer-events: none;
  }

  .hint-chip:hover:not(:disabled) {
    transform: translateY(-3px) scale(1.01);
    border-color: color-mix(in srgb, var(--accent) 48%, rgba(255, 255, 255, 0.26));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.22),
      0 18px 36px rgba(8, 15, 30, 0.22);
  }

  .hint-chip:active:not(:disabled) {
    transform: translateY(0) scale(0.985);
  }

  .hint-chip:disabled {
    cursor: default;
  }

  .hint-chip.selected {
    border-color: color-mix(in srgb, var(--accent) 72%, white 12%);
    background:
      linear-gradient(145deg, color-mix(in srgb, white 20%, transparent), color-mix(in srgb, var(--accent) 10%, transparent)),
      color-mix(in srgb, var(--accent) 18%, var(--surface));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.22),
      0 20px 40px rgba(8, 15, 30, 0.26);
  }

  .hint-chip span,
  .hint-chip small {
    position: relative;
    z-index: 1;
  }

  .hint-chip span {
    font-weight: 700;
    line-height: 1.15;
  }

  .hint-chip small {
    color: color-mix(in srgb, var(--accent) 62%, var(--text-soft));
  }

  .hint-chip-skeleton {
    min-height: 4rem;
    border-style: dashed;
    background:
      linear-gradient(110deg, rgba(255, 255, 255, 0.05) 20%, rgba(255, 255, 255, 0.14) 36%, rgba(255, 255, 255, 0.05) 54%),
      color-mix(in srgb, var(--surface-soft) 94%, white 6%);
    background-size: 200% 100%;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
    animation:
      hint-chip-pop 620ms var(--chip-delay) var(--ease-spring) both,
      hint-chip-shimmer 1.6s linear infinite;
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
    transition:
      transform 170ms var(--ease-spring),
      border-color 220ms var(--ease-soft),
      background-color 220ms var(--ease-soft),
      box-shadow 220ms var(--ease-soft);
  }

  .topic-card:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
    background: color-mix(in srgb, var(--accent) 10%, var(--surface-soft));
    box-shadow: 0 16px 30px rgba(15, 23, 42, 0.1);
  }

  .topic-card:active {
    transform: translateY(0) scale(0.99);
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

  .link-button {
    text-align: left;
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
    transition:
      transform 150ms var(--ease-spring),
      background-color 180ms var(--ease-soft);
  }

  .menu-item:hover {
    transform: translateY(-1px);
    background: color-mix(in srgb, var(--accent) 12%, var(--surface-soft));
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
    min-height: 9.5rem;
    resize: vertical;
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

  .recent-card {
    transition:
      transform 180ms var(--ease-spring),
      border-color 220ms var(--ease-soft),
      box-shadow 220ms var(--ease-soft);
  }

  .recent-card:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--accent) 34%, var(--border));
    box-shadow: 0 16px 34px rgba(15, 23, 42, 0.12);
  }

  @keyframes hint-chip-pop {
    0% {
      opacity: 0;
      transform: translateY(16px) scale(0.92);
      filter: blur(6px);
    }

    55% {
      opacity: 1;
      transform: translateY(-3px) scale(1.03);
      filter: blur(0);
    }

    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
      filter: blur(0);
    }
  }

  @keyframes hint-chip-shimmer {
    from {
      background-position: 200% 0;
    }

    to {
      background-position: -20% 0;
    }
  }

  @media (max-width: 900px) {
    .hero,
    .starter-copy,
    .stats {
      grid-template-columns: 1fr;
    }

    .hint-panel-copy {
      grid-template-columns: 1fr;
    }

    .hint-chip-list {
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }
  }

</style>
