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
    pendingChipId = null;
    appState.setTopicDiscoveryInput('');
    appState.selectSubject((event.currentTarget as HTMLSelectElement).value);
  }

  function resetTopicDiscovery(): void {
    lastHintSeed = '';
    pendingChipId = null;
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
    return `Stage ${Math.min(session.stagesCompleted.length + 1, 5)} of 5 · ${getStageLabel(session.currentStage)}`;
  }
</script>

<section class="view">
  <header class="hero card">
    <div class="hero-copy">
      <p class="eyebrow">Start new</p>
      <h2>Choose what to learn</h2>
      <p>Describe the topic in your own words and the assistant will match it to the right section.</p>
    </div>

    {#if currentSession}
      <div class="resume-strip">
        <div class="resume-copy">
          <p class="eyebrow">Resume lesson</p>
          <strong>{currentSession.topicTitle}</strong>
          <p>{currentSession.subject} · {stageProgressLabel(currentSession)}</p>
          <small>Last opened {new Date(currentSession.lastActiveAt).toLocaleString()}</small>
        </div>
        <button type="button" class="btn btn-secondary" onclick={() => startFromBanner(currentSession)}>Resume</button>
      </div>
    {/if}
  </header>

  <section class="card starter">
    <div class="starter-copy">
      <div>
        <p class="eyebrow">Topic matcher</p>
        <h3>{assistantStatus}</h3>
      </div>
      <p>Pick the subject, describe the section, and continue into the closest match.</p>
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
                    <span>{chip.label}</span>
                  </button>
                {/each}
              {/if}
            </div>
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
        <h3>{recentLessons.length > 0 ? 'Pick up a recent topic' : 'Your recent work will appear here'}</h3>
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
            <h4>{session.topicTitle}</h4>
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
      <div class="recent-empty">
        <strong>No recent lessons yet</strong>
        <p>Start with the topic matcher above and your recent lessons will appear here with title and progress.</p>
      </div>
    {/if}
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

  .view {
    --sans: 'IBM Plex Sans', 'Helvetica Neue', sans-serif;
    --mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    font-family: var(--sans);
  }

  .card,
  .recent-card {
    border: 1px solid color-mix(in srgb, var(--border-strong) 72%, transparent);
    border-radius: var(--radius-xl);
    background: linear-gradient(180deg, color-mix(in srgb, var(--surface-strong) 92%, transparent), var(--surface));
    padding: 1.2rem;
    box-shadow: var(--shadow-strong);
    backdrop-filter: blur(26px);
  }

  .hero {
    gap: 1.1rem;
    padding: 1.3rem 1.45rem;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 8%, var(--surface)),
      color-mix(in srgb, var(--surface-strong) 90%, transparent)
    );
  }

  .hero-copy,
  .resume-strip,
  .resume-copy,
  .starter-copy,
  .shortlist-header,
  .section-head,
  .recent-card {
    display: grid;
    gap: 0.6rem;
  }

  .hero-copy {
    max-width: 34rem;
  }

  .hero-copy h2 {
    font-size: clamp(1.85rem, 3.7vw, 3rem);
    line-height: 1;
    letter-spacing: -0.045em;
    font-weight: 700;
  }

  .hero-copy p:last-child {
    max-width: 30rem;
    color: var(--text-soft);
    line-height: 1.5;
  }

  .resume-strip {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.9rem;
    padding: 0.82rem 0.95rem;
    border-radius: 1.2rem;
    border: 1px solid color-mix(in srgb, var(--border-strong) 64%, transparent);
    background: color-mix(in srgb, var(--surface-soft) 76%, transparent);
  }

  .resume-copy p,
  .resume-copy small {
    color: var(--text-soft);
  }

  .resume-copy strong {
    font-size: 1.02rem;
    font-weight: 600;
  }

  .starter-copy {
    grid-template-columns: minmax(0, 1fr) minmax(220px, 280px);
    align-items: baseline;
  }

  .starter {
    gap: 1.05rem;
    padding: 1.3rem 1.35rem;
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
    padding: 0.9rem 0.95rem 1rem;
    border: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
    border-radius: 1.2rem;
    background: color-mix(in srgb, var(--surface-soft) 62%, transparent);
  }

  .hint-panel-copy {
    grid-template-columns: minmax(0, 160px) minmax(0, 1fr);
    align-items: center;
  }

  .hint-panel-title {
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
    font-family: var(--mono);
  }

  .hint-panel-copy p {
    color: var(--text-soft);
  }

  .hint-chip-list {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.7rem;
    align-items: stretch;
  }

  .hint-chip {
    display: grid;
    place-content: center start;
    justify-items: start;
    min-height: 5.35rem;
    height: 5.35rem;
    padding: 0.9rem 0.95rem;
    border: 1px solid color-mix(in srgb, var(--border-strong) 72%, transparent);
    border-radius: 1.2rem;
    background: color-mix(in srgb, var(--surface-soft) 72%, transparent);
    color: var(--text);
    text-align: left;
    box-shadow: none;
  }

  .hint-chip:hover:not(:disabled) {
    background: color-mix(in srgb, var(--surface-strong) 84%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--accent) 18%, var(--border));
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
    background: color-mix(in srgb, var(--accent) 8%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--accent) 18%, var(--border));
  }

  .hint-chip span {
    font-weight: 700;
    line-height: 1.15;
    max-width: 15ch;
    text-wrap: balance;
  }

  .hint-chip-skeleton {
    min-height: 5.35rem;
    height: 5.35rem;
    border-style: dashed;
    background: color-mix(in srgb, var(--surface-soft) 62%, transparent);
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
    border: 1px solid color-mix(in srgb, var(--border-strong) 72%, transparent);
    border-radius: 1.2rem;
    background: color-mix(in srgb, var(--surface-soft) 72%, transparent);
    padding: 0.92rem 0.95rem;
    text-align: left;
    font: inherit;
    cursor: pointer;
    box-shadow: none;
  }

  .topic-card:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--accent) 18%, var(--border));
    background: color-mix(in srgb, var(--surface-strong) 84%, var(--surface-soft));
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
  .hero-copy p,
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

  .recent-empty {
    display: grid;
    gap: 0.45rem;
    padding: 0.9rem 0.95rem;
    border-radius: 1.15rem;
    border: 1px dashed color-mix(in srgb, var(--border-strong) 82%, transparent);
    background: color-mix(in srgb, var(--surface-soft) 62%, transparent);
    min-height: 8.5rem;
    align-content: center;
  }

  .stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.7rem;
  }

  .stat-card {
    align-items: center;
    text-align: center;
    min-height: 5.6rem;
    gap: 0.35rem;
    padding: 0.85rem 0.95rem;
    background: color-mix(in srgb, var(--surface-soft) 68%, transparent);
    border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
    box-shadow: var(--shadow);
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
    border: 1px solid color-mix(in srgb, var(--border-strong) 78%, transparent);
    border-radius: 1rem;
    background: color-mix(in srgb, var(--surface-strong) 90%, transparent);
    box-shadow: 0 18px 40px color-mix(in srgb, var(--shadow) 42%, transparent);
    backdrop-filter: blur(22px);
    z-index: 5;
  }

  .menu-item {
    border: 1px solid transparent;
    border-radius: 0.95rem;
    background: color-mix(in srgb, var(--surface-soft) 72%, transparent);
    color: var(--text);
    text-align: left;
    padding: 0.75rem 0.85rem;
  }

  .menu-item:hover {
    transform: translateY(-1px);
    background: color-mix(in srgb, var(--surface-strong) 84%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--accent) 18%, var(--border));
  }

  .menu-item.danger {
    color: #991b1b;
  }

  select,
  textarea {
    width: 100%;
    border: 1px solid color-mix(in srgb, var(--border-strong) 86%, transparent);
    border-radius: 1.1rem;
    background: color-mix(in srgb, var(--surface-tint) 92%, transparent);
    color: var(--text);
    padding: 0.96rem 1rem;
  }

  .topic-input-wrap {
    position: relative;
  }

  .topic-detail-field {
    display: grid;
    gap: 0.65rem;
  }

  .topic-input-wrap textarea {
    min-height: 5.9rem;
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

  .hero-copy h2,
  .section-head h3,
  .starter-copy h3 {
    letter-spacing: -0.02em;
  }

  .section-head h3,
  .starter-copy h3,
  .recent-card h4 {
    font-size: 1.02rem;
    font-weight: 600;
  }

  .starter-actions .btn-primary {
    box-shadow: 0 8px 16px color-mix(in srgb, var(--accent) 18%, transparent);
  }

  .recent {
    padding: 1.2rem 1.35rem;
  }

  .error {
    color: #b91c1c;
  }

  .recent-card {
    background: color-mix(in srgb, var(--surface-soft) 68%, transparent);
    border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
  }

  .recent-card:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--accent) 18%, var(--border));
    background: color-mix(in srgb, var(--surface-strong) 84%, var(--surface-soft));
  }

  @media (max-width: 900px) {
    .resume-strip,
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
