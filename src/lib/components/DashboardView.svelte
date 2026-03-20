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
  let hintChipsRefreshing = $state(false);
  let hintRefreshError = $state('');
  let pendingChipId = $state<string | null>(null);
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
      .filter((session) => session.id !== currentSession?.id)
      .slice(0, 4)
  );
  const selectedSubject = $derived(
    availableSubjects.find((subject) => subject.id === viewState.topicDiscovery.selectedSubjectId) ?? availableSubjects[0]
  );
  const promptSuggestionChips = $derived(
    extractHintChipLabels(promptSuggestionsText).map((label, index) => ({
      id: `${selectedSubject?.id ?? 'subject'}:${index}:${label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      label
    }))
  );
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

  async function loadSubjectHints(forceRefresh = false): Promise<void> {
    if (!selectedSubject) {
      return;
    }

    const hintSeed = `${viewState.profile.curriculumId}:${viewState.profile.gradeId}:${viewState.profile.term}:${selectedSubject.id}`;
    if (!forceRefresh && hintSeed === lastHintSeed) {
      return;
    }

    lastHintSeed = hintSeed;
    hintRefreshError = '';

    if (forceRefresh) {
      hintChipsRefreshing = true;
    } else {
      promptSuggestionsText = '';
      hintChipsLoading = true;
    }

    const requestId = ++latestHintRequest;

    try {
      const result = await resolveSubjectHints({
        subject: selectedSubject,
        curriculumId: viewState.profile.curriculumId,
        curriculumName: viewState.profile.curriculum,
        gradeId: viewState.profile.gradeId,
        gradeLabel: viewState.profile.grade,
        term: viewState.profile.term,
        forceRefresh,
        fetcher: browser ? window.fetch.bind(window) : undefined,
        headers: await getAuthenticatedHeaders()
      });

      if (requestId !== latestHintRequest) {
        return;
      }

      promptSuggestionsText = result.hints.join('\n');
      hintChipsLoading = false;
      hintChipsRefreshing = false;
    } catch {
      if (requestId !== latestHintRequest) {
        return;
      }

      if (!forceRefresh) {
        promptSuggestionsText = '';
      } else {
        hintRefreshError = "Couldn't refresh suggestions right now.";
      }

      hintChipsLoading = false;
      hintChipsRefreshing = false;
    }
  }

  $effect(() => {
    if (!selectedSubject) {
      return;
    }

    void loadSubjectHints();
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
    hintRefreshError = '';
    hintChipsRefreshing = false;
    pendingChipId = null;
    appState.setTopicDiscoveryInput('');
    appState.selectSubject((event.currentTarget as HTMLSelectElement).value);
  }

  function resetTopicDiscovery(): void {
    lastHintSeed = '';
    pendingChipId = null;
    hintRefreshError = '';
    appState.resetTopicDiscovery();
  }

  function refreshSubjectHints(): void {
    if (!selectedSubject || hintChipsLoading || hintChipsRefreshing) {
      return;
    }

    void loadSubjectHints(true);
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

  function startFromSuggestion(chipId: string, hint: string): void {
    if (!selectedSubject || pendingChipId) {
      return;
    }

    pendingChipId = chipId;
    appState.setTopicDiscoveryInput(hint);

    void (async () => {
      try {
        await appState.startLessonFromSelection(selectedSubject.id, hint);
      } finally {
        pendingChipId = null;
      }
    })();
  }

  function startFromBanner(session: LessonSession): void {
    appState.resumeSession(session.id);
  }

  function stageProgressLabel(session: LessonSession): string {
    return `Stage ${Math.min(session.stagesCompleted.length + 1, 6)} of 6 · ${getStageLabel(session.currentStage)}`;
  }
</script>

<section class="view">
  <header class="dashboard-head">
    <div class="dashboard-top">
      <div class="dashboard-title">
        <h2>Choose what to learn</h2>
        <p>Describe a topic to find the closest section.</p>
      </div>

      <dl class="dashboard-summary" aria-label="Learning summary">
        <div class="summary-item">
          <dt>Completed</dt>
          <dd><AnimatedStatNumber value={summary.completedLessons} />/{summary.totalLessons}</dd>
        </div>
        <div class="summary-item">
          <dt>Mastery</dt>
          <dd><AnimatedStatNumber value={summary.averageMastery} suffix="%" /></dd>
        </div>
        <div class="summary-item">
          <dt>Active</dt>
          <dd><AnimatedStatNumber value={activeLessons.length} /></dd>
        </div>
      </dl>
    </div>

    {#if currentSession}
      <div class="resume-strip">
        <div class="resume-copy">
          <p class="eyebrow">Resume lesson</p>
          <strong>{currentSession.subject} - {currentSession.topicTitle}</strong>
          <p>{stageProgressLabel(currentSession)}</p>
          <small>Last opened {new Date(currentSession.lastActiveAt).toLocaleString()}</small>
        </div>
        <button type="button" class="btn btn-secondary btn-compact compact" onclick={() => startFromBanner(currentSession)}>
          Resume
        </button>
      </div>
    {/if}
  </header>

  <section class="card starter">
    <div class="starter-copy">
      <div>
        <p class="eyebrow">Topic matcher</p>
        <h3>{viewState.topicDiscovery.shortlist ? 'Pick your topic to begin' : 'Find the right section'}</h3>
      </div>
    </div>

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
            <div class="hint-panel-head">
              <span class="hint-panel-title">Quick starts</span>
              <button
                type="button"
                class="btn btn-secondary btn-compact refresh-hints"
                aria-busy={hintChipsRefreshing}
                disabled={hintChipsLoading || hintChipsRefreshing}
                onclick={refreshSubjectHints}
              >
                {hintChipsRefreshing ? 'Refreshing...' : 'Refresh suggestions'}
              </button>
            </div>
            <p>Start with a suggested lesson.</p>
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
              {#each promptSuggestionChips as chip, index (chip.id)}
                <button
                  type="button"
                  id={`quick-start-${chip.id}`}
                  data-chip-id={chip.id}
                  aria-busy={pendingChipId === chip.id}
                  aria-disabled={Boolean(pendingChipId) && pendingChipId !== chip.id}
                  class:selected={pendingChipId === chip.id}
                  class:loading={pendingChipId === chip.id}
                  class="hint-chip"
                  style={`--chip-index: ${index};`}
                  onclick={() => startFromSuggestion(chip.id, chip.label)}
                >
                  <span class="hint-chip-name">{chip.label}</span>
                  {#if pendingChipId === chip.id}
                    <span class="hint-chip-loading" aria-hidden="true">
                      <span class="busy-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </span>
                    </span>
                  {:else}
                    <span class="hint-chip-action" aria-hidden="true">></span>
                  {/if}
                </button>
              {/each}
            {/if}
          </div>

          {#if hintRefreshError}
            <p class="hint-refresh-error">{hintRefreshError}</p>
          {/if}
        </div>
      {/if}

      <label class="topic-detail-field">
        <span>What do you want to work on?</span>
        <div class="topic-input-wrap">
          <textarea
            rows="3"
            value={viewState.topicDiscovery.input}
            oninput={onInput}
            onfocus={onTopicFocus}
            onblur={onTopicBlur}
          ></textarea>
        </div>
      </label>

      <div class="starter-actions">
        <button
          type="button"
          class="btn btn-primary"
          aria-busy={viewState.topicDiscovery.status === 'loading'}
          onclick={runShortlist}
          disabled={viewState.topicDiscovery.status === 'loading'}
        >
          {viewState.topicDiscovery.status === 'loading' ? 'Finding matches...' : 'Find my section'}
        </button>
        {#if viewState.topicDiscovery.shortlist}
          <button type="button" class="btn btn-secondary" onclick={resetTopicDiscovery}>
            Search for something else
          </button>
        {/if}
      </div>
    </div>

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

  <section class="card recent" class:empty-state={recentLessons.length === 0}>
    <div class="section-head">
      <div>
        <p class="eyebrow">Recent lessons</p>
        <h3>{recentLessons.length > 0 ? 'Pick up where you left off' : 'Recent lessons'}</h3>
      </div>
    </div>

    {#if recentLessons.length > 0}
      <div class="recent-grid">
        {#each recentLessons as session}
          <article class="recent-card">
            <div class="recent-meta">
              <small>{session.subject}</small>
              <small>{new Date(session.lastActiveAt).toLocaleDateString()}</small>
            </div>
            <h4>{session.subject} - {session.topicTitle}</h4>
            <p>{stageProgressLabel(session)}</p>
            <div class="recent-actions">
              <button type="button" class="btn btn-secondary btn-compact compact" onclick={() => appState.resumeSession(session.id)}>Resume</button>
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
    {:else}
      <p class="recent-note">Recent lessons will appear here.</p>
    {/if}
  </section>
</section>

<style>
  .view,
  .dashboard-head,
  .dashboard-top,
  .dashboard-title,
  .dashboard-summary,
  .starter,
  .starter-form,
  .shortlist,
  .topic-list,
  .recent,
  .recent-grid {
    display: grid;
    gap: 1rem;
  }

  .view {
    --sans: 'IBM Plex Sans', 'Helvetica Neue', sans-serif;
    --mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    --dashboard-card-surface: linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface-strong) 96%, transparent),
      color-mix(in srgb, var(--surface) 100%, transparent)
    );
    --dashboard-card-border: color-mix(in srgb, var(--border-strong) 82%, transparent);
    --dashboard-card-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
    --dashboard-soft-surface: color-mix(in srgb, var(--surface-soft) 82%, transparent);
    --dashboard-strong-surface: color-mix(in srgb, var(--surface-strong) 96%, transparent);
    --dashboard-input-surface: color-mix(in srgb, var(--surface-tint) 92%, transparent);
    --dashboard-overlay-blur: blur(12px);
    font-family: var(--sans);
    gap: 0.75rem;
    width: 100%;
    align-content: start;
  }

  :global(:root[data-theme='dark']) .view {
    --dashboard-card-surface: linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface-strong) 98%, transparent),
      color-mix(in srgb, var(--surface) 100%, transparent)
    );
    --dashboard-card-border: color-mix(in srgb, var(--border-strong) 92%, transparent);
    --dashboard-card-shadow: var(--shadow-strong);
    --dashboard-soft-surface: color-mix(in srgb, var(--surface-soft) 88%, transparent);
    --dashboard-strong-surface: color-mix(in srgb, var(--surface-strong) 98%, transparent);
    --dashboard-input-surface: color-mix(in srgb, var(--surface-tint) 96%, transparent);
    --dashboard-overlay-blur: blur(20px);
  }

  .card,
  .recent-card {
    border: 1px solid var(--dashboard-card-border);
    border-radius: var(--radius-xl);
    background: var(--dashboard-card-surface);
    padding: 1.2rem;
    box-shadow: var(--dashboard-card-shadow);
    backdrop-filter: var(--dashboard-overlay-blur);
  }

  .dashboard-head {
    gap: 0.5rem;
  }

  .dashboard-top {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: baseline;
    gap: 0.8rem;
  }

  .dashboard-title,
  .resume-strip,
  .resume-copy,
  .starter-copy,
  .shortlist-header,
  .section-head,
  .recent-card {
    display: grid;
    gap: 0.6rem;
  }

  .dashboard-title {
    max-width: 31rem;
    gap: 0.2rem;
  }

  .dashboard-title h2 {
    font-size: clamp(1.42rem, 2.7vw, 2.2rem);
    line-height: 1;
    letter-spacing: -0.045em;
    font-weight: 700;
  }

  .dashboard-title p:last-child {
    max-width: 23rem;
    font-size: 0.95rem;
    color: var(--text-soft);
    line-height: 1.42;
  }

  .dashboard-summary {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 0.55rem 0.85rem;
    max-width: none;
    margin: 0;
  }

  .summary-item {
    display: inline-flex;
    align-items: baseline;
    gap: 0.28rem;
    padding: 0;
    border: 0;
    background: transparent;
  }

  .summary-item dt,
  .summary-item dd {
    margin: 0;
  }

  .summary-item dt {
    color: var(--muted);
    order: 2;
    font-size: 0.66rem;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    font-family: var(--mono);
  }

  .summary-item dd {
    order: 1;
    font-size: 1rem;
    font-weight: 700;
    line-height: 1;
  }

  .resume-strip {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.85rem;
    padding: 0.62rem 0.76rem;
    border-radius: 1rem;
    border: 1px solid color-mix(in srgb, var(--border-strong) 74%, transparent);
    background: var(--dashboard-soft-surface);
    max-width: 34rem;
  }

  .resume-copy p,
  .resume-copy small {
    color: var(--text-soft);
  }

  .resume-copy strong {
    font-size: 0.98rem;
    font-weight: 600;
  }

  .resume-copy p {
    font-size: 0.95rem;
  }

  .resume-copy small {
    font-size: 0.82rem;
  }

  .starter-copy {
    gap: 0.35rem;
  }

  .starter {
    gap: 0.7rem;
    padding: 0.92rem 1rem;
  }

  .starter-form {
    gap: 0.8rem;
  }

  .starter-actions,
  .recent-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .starter-actions {
    margin-top: -0.1rem;
  }

  .hint-panel,
  .hint-panel-copy,
  .hint-chip-list {
    display: grid;
  }

  .hint-panel {
    gap: 0.55rem;
  }

  .hint-panel-copy {
    grid-template-columns: 1fr;
    align-items: start;
    gap: 0.2rem;
  }

  .hint-panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .hint-panel-title {
    font-size: 0.86rem;
    font-weight: 600;
    color: var(--text-soft);
  }

  .hint-panel-copy p {
    color: var(--text-soft);
    font-size: 0.95rem;
    line-height: 1.45;
  }

  .refresh-hints {
    font-size: 0.78rem;
    min-height: 2rem;
    padding: 0.5rem 0.82rem;
  }

  .hint-chip-list {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.75rem;
    align-items: stretch;
  }

  .hint-chip {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.9rem;
    min-height: 4rem;
    padding: 1rem 1.05rem;
    border: 1px solid color-mix(in srgb, var(--border-strong) 78%, transparent);
    border-radius: 1.2rem;
    background: var(--dashboard-soft-surface);
    color: var(--text);
    text-align: left;
    box-shadow: none;
  }

  .hint-chip:hover:not(:disabled) {
    background: var(--dashboard-strong-surface);
    border-color: color-mix(in srgb, var(--accent) 36%, var(--border));
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, white 10%, transparent),
      0 0 0 1px color-mix(in srgb, var(--accent) 14%, transparent),
      0 0 20px color-mix(in srgb, var(--accent) 10%, transparent);
  }

  .hint-chip:active:not(:disabled) {
    transform: translateY(0) scale(0.99);
  }

  .hint-chip:disabled {
    cursor: default;
  }

  .hint-chip[aria-disabled='true'] {
    pointer-events: none;
  }

  .hint-chip.selected {
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 18%, var(--surface)),
      color-mix(in srgb, var(--accent) 9%, var(--surface-soft))
    );
    border-color: color-mix(in srgb, var(--accent) 56%, transparent);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, white 14%, transparent),
      0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent);
  }

  .hint-chip.loading {
    background: color-mix(in srgb, var(--accent) 8%, var(--dashboard-soft-surface));
    border-color: color-mix(in srgb, var(--accent) 18%, var(--border));
  }

  .hint-chip-name {
    font-size: 0.95rem;
    line-height: 1.28;
    font-weight: 500;
    text-wrap: pretty;
  }

  .hint-chip-action {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 999px;
    display: grid;
    place-items: center;
    border: 1px solid color-mix(in srgb, var(--border-strong) 80%, transparent);
    background: transparent;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 0.82rem;
    line-height: 1;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--surface-strong) 26%, transparent);
  }

  .hint-chip:hover:not(:disabled) .hint-chip-action {
    border-color: color-mix(in srgb, var(--accent) 34%, transparent);
    color: var(--text);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--surface-strong) 20%, transparent),
      0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent);
  }

  .hint-chip.selected .hint-chip-action,
  .hint-chip.loading .hint-chip-action {
    background: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 50%, transparent);
    color: var(--accent-contrast);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 16%, transparent);
  }

  .hint-chip-loading {
    display: inline-flex;
    align-items: center;
    justify-self: end;
    color: var(--text);
  }

  .busy-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.26rem;
  }

  .busy-indicator span {
    width: 0.38rem;
    height: 0.38rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 72%, white 28%);
    opacity: 0.34;
    animation: verify-dot-breathe 1.15s ease-in-out infinite;
  }

  .busy-indicator span:last-child {
    animation-delay: 0.36s;
  }

  .busy-indicator span:nth-child(2) {
    animation-delay: 0.18s;
  }

  .hint-chip-skeleton {
    min-height: 4rem;
    border-style: dashed;
    background: color-mix(in srgb, var(--dashboard-soft-surface) 84%, transparent);
  }

  .hint-refresh-error {
    color: #b91c1c;
    font-size: 0.84rem;
  }

  .topic-list {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 0.7rem;
  }

  .topic-card {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1rem;
    align-items: start;
    border: 1px solid color-mix(in srgb, var(--border-strong) 78%, transparent);
    border-radius: 1.2rem;
    background: var(--dashboard-soft-surface);
    padding: 0.92rem 0.95rem;
    text-align: left;
    font: inherit;
    cursor: pointer;
    box-shadow: none;
  }

  .topic-card:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--accent) 18%, var(--border));
    background: var(--dashboard-strong-surface);
  }

  .topic-card:active {
    transform: translateY(0) scale(0.99);
  }

  .topic-index {
    color: var(--muted);
    font-size: 0.82rem;
    letter-spacing: 0.08em;
    font-family: var(--mono);
  }

  .topic-card p,
  .topic-card small,
  .starter-copy p,
  .dashboard-title p,
  .recent-card p {
    color: var(--text-soft);
  }

  .recent-grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.7rem;
  }

  .recent-meta {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    align-items: center;
  }

  button,
  select,
  textarea {
    font: inherit;
  }

  button {
    cursor: pointer;
  }

  .compact {
    padding: 0.66rem 0.9rem;
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
    border: 1px solid color-mix(in srgb, var(--border-strong) 86%, transparent);
    border-radius: 1rem;
    background: var(--dashboard-card-surface);
    box-shadow: 0 18px 40px color-mix(in srgb, var(--shadow) 42%, transparent);
    backdrop-filter: var(--dashboard-overlay-blur);
    z-index: 5;
  }

  .menu-item {
    border: 1px solid transparent;
    border-radius: 0.95rem;
    background: var(--dashboard-soft-surface);
    color: var(--text);
    text-align: left;
    padding: 0.75rem 0.85rem;
  }

  .menu-item:hover {
    transform: translateY(-1px);
    background: var(--dashboard-strong-surface);
    border-color: color-mix(in srgb, var(--accent) 18%, var(--border));
  }

  .menu-item.danger {
    color: #991b1b;
  }

  select,
  textarea {
    width: 100%;
    border: 1px solid color-mix(in srgb, var(--border-strong) 88%, transparent);
    border-radius: 1.1rem;
    background: var(--dashboard-input-surface);
    color: var(--text);
    padding: 0.96rem 1rem;
  }

  .topic-input-wrap {
    position: relative;
  }

  .topic-detail-field {
    display: grid;
    gap: 0.42rem;
  }

  .topic-detail-field > span {
    font-size: 0.83rem;
    font-weight: 500;
    color: var(--text-soft);
  }

  .topic-input-wrap textarea {
    min-height: 3.35rem;
    resize: vertical;
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
    font-family: var(--mono);
  }

  .dashboard-title h2,
  .section-head h3,
  .starter-copy h3 {
    letter-spacing: -0.02em;
  }

  .section-head h3,
  .recent-card h4 {
    font-size: 0.98rem;
    font-weight: 600;
  }

  .starter-copy h3 {
    font-size: 1.12rem;
    font-weight: 650;
  }

  .section-head h3 {
    font-size: 1.02rem;
    font-weight: 650;
  }

  .starter-actions .btn-primary {
    box-shadow: 0 8px 16px color-mix(in srgb, var(--accent) 18%, transparent);
  }

  .recent {
    padding: 0.92rem 1rem;
    gap: 0.55rem;
  }

  .recent.empty-state {
    padding-bottom: 0.85rem;
  }

  .error {
    color: #b91c1c;
  }

  .recent-card {
    background: var(--dashboard-soft-surface);
    border: 1px solid color-mix(in srgb, var(--border-strong) 84%, transparent);
  }

  .recent-card:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--accent) 18%, var(--border));
    background: var(--dashboard-strong-surface);
  }

  .recent-note {
    color: var(--text-soft);
    font-size: 0.93rem;
    padding: 0.15rem 0 0;
  }

  @media (max-width: 900px) {
    .dashboard-top,
    .dashboard-summary,
    .resume-strip {
      grid-template-columns: 1fr;
    }

    .dashboard-summary {
      justify-content: flex-start;
    }

    .hint-panel-copy {
      grid-template-columns: 1fr;
    }

    .hint-chip-list {
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }
  }

  @keyframes verify-dot-breathe {
    0%,
    100% {
      opacity: 0.34;
      transform: scale(0.9);
    }

    50% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .busy-indicator span {
      animation: none;
      opacity: 0.72;
      transform: none;
    }
  }

</style>
