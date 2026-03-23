<script lang="ts">
  import { browser } from '$app/environment';
  import { getAuthenticatedHeaders } from '$lib/authenticated-fetch';
  import { deriveDashboardLessonLists } from '$lib/components/dashboard-lessons';
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
  let hintChipsLoading = $state(true);
  let hintChipsRefreshing = $state(false);
  let hintRefreshError = $state('');
  let pendingChipId = $state<string | null>(null);
  let latestHintRequest = 0;
  let lastHintSeed = $state('');

  const summary = $derived(getCompletionSummary(viewState));
  const availableSubjects = $derived(viewState.curriculum.subjects);
  const dashboardLessonLists = $derived(deriveDashboardLessonLists(viewState.lessonSessions));
  const currentSession = $derived(dashboardLessonLists.currentSession);
  const recentLessons = $derived(dashboardLessonLists.recentLessons);
  const firstName = $derived(viewState.profile.fullName.split(' ')[0] || viewState.profile.fullName);

  const selectedSubject = $derived(
    availableSubjects.find((s) => s.id === viewState.topicDiscovery.selectedSubjectId) ?? availableSubjects[0]
  );
  const promptSuggestionChips = $derived(
    extractHintChipLabels(promptSuggestionsText).map((label, index) => ({
      id: `${selectedSubject?.id ?? 'subject'}:${index}:${label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      label
    }))
  );

  async function loadSubjectHints(forceRefresh = false): Promise<void> {
    if (!selectedSubject) return;

    const hintSeed = `${viewState.profile.curriculumId}:${viewState.profile.gradeId}:${viewState.profile.term}:${selectedSubject.id}`;
    if (!forceRefresh && hintSeed === lastHintSeed) return;

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

      if (requestId !== latestHintRequest) return;
      promptSuggestionsText = result.hints.join('\n');
    } catch {
      if (requestId !== latestHintRequest) return;
      if (forceRefresh) hintRefreshError = "Couldn't refresh suggestions right now.";
      else promptSuggestionsText = '';
    } finally {
      if (requestId === latestHintRequest) {
        hintChipsLoading = false;
        hintChipsRefreshing = false;
      }
    }
  }

  $effect(() => {
    if (!selectedSubject) return;
    void loadSubjectHints();
  });

  function onInput(event: Event): void {
    appState.setTopicDiscoveryInput((event.currentTarget as HTMLTextAreaElement).value);
  }

  function onTopicFocus(): void { topicInputFocused = true; }
  function onTopicBlur(): void { topicInputFocused = false; }

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
    if (!selectedSubject || hintChipsLoading || hintChipsRefreshing) return;
    void loadSubjectHints(true);
  }

  function runShortlist(): void {
    if (!selectedSubject || viewState.topicDiscovery.input.trim().length === 0) return;
    void appState.shortlistTopics(selectedSubject.id, viewState.topicDiscovery.input.trim());
  }

  function startTopic(topic: ShortlistedTopic): void {
    void appState.startLessonFromShortlist(topic);
  }

  function startFromSuggestion(chipId: string, hint: string): void {
    if (!selectedSubject || pendingChipId) return;
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

  function missionProgressPercent(session: LessonSession): number {
    return Math.max(6, Math.round((session.stagesCompleted.length / 6) * 100));
  }

  function subjectEmoji(name: string): string {
    const n = (name ?? '').toLowerCase();
    if (n.includes('math')) return '📐';
    if (n.includes('physics')) return '⚡';
    if (n.includes('chemistry')) return '🧪';
    if (n.includes('biology') || n.includes('life science')) return '🧬';
    if (n.includes('english')) return '📖';
    if (n.includes('history') || n.includes('social')) return '🏛️';
    if (n.includes('accounting')) return '📊';
    if (n.includes('economics')) return '📈';
    if (n.includes('afrikaans')) return '🌍';
    if (n.includes('art')) return '🎨';
    if (n.includes('business')) return '💼';
    if (n.includes('geography')) return '🗺️';
    return '📚';
  }

  function greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return `Good morning, ${firstName}!`;
    if (hour < 17) return `Hey ${firstName}!`;
    return `Evening, ${firstName}!`;
  }

  function greetingLine(): string {
    if (currentSession) return `You're in the middle of something. Pick up where you left off.`;
    if (summary.completedLessons > 0) return `${summary.completedLessons} ${summary.completedLessons === 1 ? 'lesson' : 'lessons'} completed. Keep the momentum going.`;
    return `Your learning journey starts here. Pick a topic and let's go.`;
  }
</script>

<section class="view">

  <!-- ── HERO ── -->
  <div class="hero">

    <!-- Greeting -->
    <div class="hero-greeting">
      <h2>{greeting()} <span class="greeting-wave">👋</span></h2>
      <p>{greetingLine()}</p>
    </div>

    <!-- Mission card + stats row -->
    <div class="hero-body">

      {#if currentSession}
        <div class="mission-card">
          <div class="mission-card-inner">
            <p class="mission-kicker">Current Mission</p>
            <h3 class="mission-title">{currentSession.topicTitle}</h3>
            <p class="mission-meta">{currentSession.subject} · {stageProgressLabel(currentSession)}</p>
            <div class="mission-progress-bar">
              <div class="mission-progress-fill" style="width: {missionProgressPercent(currentSession)}%"></div>
            </div>
            <div class="mission-footer">
              <button type="button" class="btn btn-primary" onclick={() => startFromBanner(currentSession)}>
                Resume →
              </button>
              <span class="mission-timestamp">Last opened {new Date(currentSession.lastActiveAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      {:else}
        <div class="mission-card mission-card--empty">
          <div class="mission-card-inner">
            <p class="mission-kicker">Ready to start?</p>
            <h3 class="mission-title">Pick a topic below</h3>
            <p class="mission-meta">Choose a subject and describe what you want to learn. We'll find the perfect lesson.</p>
          </div>
        </div>
      {/if}

      <!-- Stat strip -->
      <div class="stat-strip">
        <div class="stat-pill">
          <span class="stat-pill-icon">⭐</span>
          <div class="stat-pill-text">
            <span class="stat-pill-value" style="color: var(--color-xp);">
              <AnimatedStatNumber value={summary.averageMastery} suffix="%" />
            </span>
            <span class="stat-pill-label">mastery</span>
          </div>
        </div>

        <div class="stat-pill">
          <span class="stat-pill-icon">✅</span>
          <div class="stat-pill-text">
            <span class="stat-pill-value">
              <AnimatedStatNumber value={summary.completedLessons} />
            </span>
            <span class="stat-pill-label">{summary.completedLessons === 1 ? 'lesson' : 'lessons'} done</span>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- ── YOUR PATH ── -->
  <section class="section-block">
    <div class="section-header">
      <div>
        <h3 class="section-title">Your Path</h3>
        <p class="section-desc">
          {viewState.topicDiscovery.shortlist ? 'Pick a topic to begin your lesson' : `Recommended for ${selectedSubject?.name ?? 'your subjects'}`}
        </p>
      </div>
      <div class="subject-switcher">
        {#each availableSubjects.slice(0, 4) as subject}
          <button
            type="button"
            class="subject-pill"
            class:active={subject.id === selectedSubject?.id}
            onclick={() => appState.selectSubject(subject.id)}
          >
            {subjectEmoji(subject.name)} {subject.name}
          </button>
        {/each}
        {#if availableSubjects.length > 4}
          <select class="subject-overflow" value={selectedSubject?.id} onchange={onSubjectChange}>
            {#each availableSubjects as subject}
              <option value={subject.id}>{subject.name}</option>
            {/each}
          </select>
        {/if}
      </div>
    </div>

    <!-- Quick start tiles — always rendered, skeleton until loaded -->
    <div class="path-grid" aria-live="polite">
      {#if hintChipsLoading}
        {#each Array.from({ length: 4 }) as _, i}
          <div class="path-tile path-tile--skeleton" style="--i: {i};"></div>
        {/each}
      {:else if promptSuggestionChips.length > 0}
        {#each promptSuggestionChips as chip, i (chip.id)}
          <button
            type="button"
            class="path-tile"
            class:selected={pendingChipId === chip.id}
            aria-busy={pendingChipId === chip.id}
            aria-disabled={Boolean(pendingChipId) && pendingChipId !== chip.id}
            style="--i: {i};"
            onclick={() => startFromSuggestion(chip.id, chip.label)}
          >
            <span class="path-tile-icon">{subjectEmoji(selectedSubject?.name ?? '')}</span>
            <span class="path-tile-name">{chip.label}</span>
            {#if pendingChipId === chip.id}
              <span class="path-tile-indicator" aria-hidden="true">
                <span class="busy-dot"></span><span class="busy-dot"></span><span class="busy-dot"></span>
              </span>
            {:else}
              <span class="path-tile-arrow" aria-hidden="true">→</span>
            {/if}
          </button>
        {/each}
      {/if}
    </div>

    {#if !hintChipsLoading && promptSuggestionChips.length > 0}
      <div class="refresh-row">
        <button type="button" class="btn btn-ghost refresh-btn" disabled={hintChipsRefreshing} onclick={refreshSubjectHints}>
          {hintChipsRefreshing ? '↻ Refreshing...' : '↻ Different suggestions'}
        </button>
        {#if hintRefreshError}<span class="error-note">{hintRefreshError}</span>{/if}
      </div>
    {/if}

    <!-- Search -->
    <div class="search-launcher" class:focused={topicInputFocused}>
      <textarea
        rows="2"
        class="search-input"
        placeholder="Or describe exactly what you want to learn..."
        value={viewState.topicDiscovery.input}
        oninput={onInput}
        onfocus={onTopicFocus}
        onblur={onTopicBlur}
      ></textarea>
      <div class="search-actions">
        <button
          type="button"
          class="btn btn-primary"
          aria-busy={viewState.topicDiscovery.status === 'loading'}
          disabled={viewState.topicDiscovery.status === 'loading'}
          onclick={runShortlist}
        >
          {viewState.topicDiscovery.status === 'loading' ? 'Finding matches...' : "Let's go →"}
        </button>
        {#if viewState.topicDiscovery.shortlist}
          <button type="button" class="btn btn-secondary" onclick={resetTopicDiscovery}>Start over</button>
        {/if}
      </div>
    </div>

    {#if viewState.topicDiscovery.error}
      <p class="error-note">{viewState.topicDiscovery.error}</p>
    {/if}

    {#if viewState.topicDiscovery.shortlist}
      <div class="shortlist">
        <div class="shortlist-header">
          <h4>Found in: {viewState.topicDiscovery.shortlist.matchedSection}</h4>
          <p>{viewState.profile.curriculum} · {viewState.profile.grade} · {selectedSubject?.name}</p>
        </div>
        <div class="topic-grid">
          {#each viewState.topicDiscovery.shortlist.subtopics as topic, i}
            <button type="button" class="topic-tile" onclick={() => startTopic(topic)}>
              <span class="topic-index">{String(i + 1).padStart(2, '0')}</span>
              <div class="topic-tile-body">
                <strong>{topic.title}</strong>
                <p>{topic.description}</p>
              </div>
              <span class="topic-tile-arrow" aria-hidden="true">→</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </section>

  <!-- ── RECENTS ── -->
  {#if recentLessons.length > 0}
    <section class="section-block">
      <div class="section-header section-header--simple">
        <h3 class="section-title">Pick up where you left off</h3>
      </div>
      <div class="recents-grid">
        {#each recentLessons as session}
          <article class="recent-card">
            <div class="recent-card-top">
              <span class="subject-chip">{session.subject}</span>
              <span class="recent-date">{new Date(session.lastActiveAt).toLocaleDateString()}</span>
            </div>
            <h4 class="recent-title">{session.topicTitle}</h4>
            <p class="recent-stage">{stageProgressLabel(session)}</p>
            <div class="recent-actions">
              <button type="button" class="btn btn-primary btn-compact" onclick={() => appState.resumeSession(session.id)}>
                Resume →
              </button>
              <details class="overflow-menu">
                <summary class="btn btn-secondary btn-compact icon-summary" aria-label="More options">⋯</summary>
                <div class="overflow-panel">
                  <button type="button" class="menu-item" onclick={() => appState.restartLessonSession(session.id)}>Restart</button>
                  <button type="button" class="menu-item danger" onclick={() => appState.archiveSession(session.id)}>Archive</button>
                </div>
              </details>
            </div>
          </article>
        {/each}
      </div>
    </section>
  {/if}

</section>

<style>
  /* ── Root ── */
  .view {
    display: grid;
    gap: 2rem;
    width: 100%;
    align-content: start;
    padding-bottom: 2rem;
  }

  /* ── Hero ── */
  .hero {
    display: grid;
    gap: 1rem;
  }

  .hero-greeting h2 {
    font-size: clamp(1.6rem, 3vw, 2.2rem);
    font-weight: 800;
    letter-spacing: -0.035em;
    line-height: 1.1;
    color: var(--text);
  }

  .greeting-wave {
    display: inline-block;
    animation: wave 2s ease-in-out infinite;
    transform-origin: 70% 70%;
  }

  @keyframes wave {
    0%, 100% { transform: rotate(0deg); }
    20% { transform: rotate(14deg); }
    40% { transform: rotate(-8deg); }
    60% { transform: rotate(14deg); }
    80% { transform: rotate(-4deg); }
  }

  .hero-greeting p {
    font-size: 0.95rem;
    color: var(--text-soft);
    margin-top: 0.3rem;
  }

  .hero-body {
    display: grid;
    gap: 0.85rem;
  }

  /* Mission card */
  .mission-card {
    background:
      linear-gradient(135deg,
        color-mix(in srgb, var(--accent) 14%, var(--surface-strong)),
        color-mix(in srgb, var(--accent) 4%, var(--surface-strong))
      );
    border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border-strong));
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow), 0 0 0 1px color-mix(in srgb, var(--accent) 8%, transparent);
    overflow: hidden;
  }

  .mission-card--empty {
    background: var(--surface-strong);
    border-color: var(--border-strong);
    box-shadow: var(--shadow);
    opacity: 0.8;
  }

  .mission-card-inner {
    padding: 1.4rem 1.6rem;
    display: grid;
    gap: 0.55rem;
  }

  .mission-kicker {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .mission-title {
    font-size: 1.4rem;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.025em;
    color: var(--text);
  }

  .mission-meta {
    font-size: 0.88rem;
    color: var(--text-soft);
  }

  .mission-progress-bar {
    height: 5px;
    background: color-mix(in srgb, var(--accent) 16%, var(--border-strong));
    border-radius: var(--radius-pill);
    overflow: hidden;
    margin: 0.2rem 0;
  }

  .mission-progress-fill {
    height: 100%;
    border-radius: var(--radius-pill);
    background: linear-gradient(90deg, var(--color-blue), var(--accent));
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .mission-footer {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 0.3rem;
    flex-wrap: wrap;
  }

  .mission-timestamp {
    font-size: 0.78rem;
    color: var(--muted);
  }

  /* Stat strip */
  .stat-strip {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .stat-pill {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    background: var(--surface-strong);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    padding: 0.8rem 1.1rem;
    box-shadow: var(--shadow);
    flex: 1;
    min-width: 120px;
  }

  .stat-pill-icon {
    font-size: 1.5rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .stat-pill-text {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .stat-pill-value {
    font-size: 1.5rem;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.04em;
    color: var(--text);
  }

  .stat-pill-label {
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--text-soft);
    margin-top: 0.1rem;
  }

  /* ── Section blocks ── */
  .section-block {
    display: grid;
    gap: 1rem;
  }

  .section-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .section-header--simple {
    display: block;
  }

  .section-title {
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: -0.025em;
    color: var(--text);
  }

  .section-desc {
    font-size: 0.88rem;
    color: var(--text-soft);
    margin-top: 0.2rem;
  }

  /* Subject switcher — pill buttons, not a select */
  .subject-switcher {
    display: flex;
    gap: 0.45rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .subject-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    background: var(--surface-strong);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-pill);
    padding: 0.45rem 0.85rem;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--text-soft);
    cursor: pointer;
    white-space: nowrap;
    transition:
      background var(--motion-fast) var(--ease-soft),
      border-color var(--motion-fast) var(--ease-soft),
      color var(--motion-fast) var(--ease-soft);
  }

  .subject-pill:hover {
    background: var(--surface-soft);
    color: var(--text);
    transform: none;
  }

  .subject-pill.active {
    background: var(--accent-dim);
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
    color: var(--accent);
    font-weight: 600;
  }

  .subject-overflow {
    background: var(--surface-strong);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-pill);
    color: var(--text);
    padding: 0.45rem 0.85rem;
    font: inherit;
    font-size: 0.82rem;
    cursor: pointer;
  }

  /* ── Path grid ── */
  .path-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.75rem;
    min-height: 4.5rem;
  }

  .path-tile {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.75rem;
    min-height: 4.5rem;
    padding: 0.9rem 1rem;
    background: var(--surface-strong);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    color: var(--text);
    text-align: left;
    font: inherit;
    cursor: pointer;
    box-shadow: var(--shadow);
    transition:
      transform var(--motion-fast) var(--ease-spring),
      border-color var(--motion-med) var(--ease-soft),
      box-shadow var(--motion-med) var(--ease-soft);
  }

  .path-tile:hover:not(:disabled):not([aria-disabled='true']) {
    transform: translateY(-3px);
    border-color: color-mix(in srgb, var(--accent) 45%, var(--border-strong));
    box-shadow: var(--shadow-strong);
  }

  .path-tile:active:not(:disabled) {
    transform: translateY(0) scale(0.985);
  }

  .path-tile.selected {
    background: color-mix(in srgb, var(--accent-dim) 80%, var(--surface-strong));
    border-color: color-mix(in srgb, var(--accent) 50%, transparent);
  }

  .path-tile[aria-disabled='true'] {
    pointer-events: none;
    opacity: 0.45;
  }

  .path-tile--skeleton {
    background: var(--surface-soft);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    animation: skeleton-pulse 1.5s ease-in-out infinite;
    animation-delay: calc(var(--i, 0) * 0.12s);
  }

  @keyframes skeleton-pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }

  .path-tile-icon {
    font-size: 1.5rem;
    line-height: 1;
  }

  .path-tile-name {
    font-size: 0.9rem;
    font-weight: 500;
    line-height: 1.3;
    text-wrap: pretty;
  }

  .path-tile-arrow {
    width: 1.8rem;
    height: 1.8rem;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--surface-tint);
    border: 1px solid var(--border-strong);
    font-size: 0.9rem;
    color: var(--text-soft);
    flex-shrink: 0;
    transition:
      background var(--motion-fast) var(--ease-soft),
      color var(--motion-fast) var(--ease-soft),
      border-color var(--motion-fast) var(--ease-soft);
  }

  .path-tile:hover:not(:disabled) .path-tile-arrow {
    background: var(--accent);
    color: var(--accent-contrast);
    border-color: transparent;
  }

  .path-tile-indicator {
    display: flex;
    gap: 0.22rem;
    align-items: center;
  }

  .busy-dot {
    width: 0.32rem;
    height: 0.32rem;
    border-radius: 50%;
    background: var(--accent);
    opacity: 0.4;
    animation: busy-pulse 1.1s ease-in-out infinite;
  }

  .busy-dot:nth-child(2) { animation-delay: 0.18s; }
  .busy-dot:nth-child(3) { animation-delay: 0.36s; }

  @keyframes busy-pulse {
    0%, 100% { opacity: 0.25; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1); }
  }

  .refresh-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: -0.25rem;
  }

  .refresh-btn {
    font-size: 0.82rem;
    padding: 0.35rem 0.6rem;
    min-height: unset;
  }

  /* ── Search ── */
  .search-launcher {
    display: grid;
    gap: 0.75rem;
    background: var(--surface-strong);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    padding: 1rem 1.1rem;
    box-shadow: var(--shadow);
    transition: border-color var(--motion-med) var(--ease-soft), box-shadow var(--motion-med) var(--ease-soft);
  }

  .search-launcher.focused {
    border-color: color-mix(in srgb, var(--accent) 50%, var(--border-strong));
    box-shadow: var(--shadow), 0 0 0 3px var(--accent-glow);
  }

  .search-input {
    width: 100%;
    background: transparent;
    border: none;
    color: var(--text);
    font: inherit;
    font-size: 0.95rem;
    resize: none;
    min-height: 3rem;
    line-height: 1.5;
  }

  .search-input::placeholder {
    color: var(--muted);
  }

  .search-actions {
    display: flex;
    gap: 0.65rem;
    flex-wrap: wrap;
  }

  /* ── Shortlist ── */
  .shortlist {
    display: grid;
    gap: 0.85rem;
  }

  .shortlist-header {
    display: grid;
    gap: 0.2rem;
  }

  .shortlist-header h4 {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text);
  }

  .shortlist-header p {
    font-size: 0.84rem;
    color: var(--text-soft);
  }

  .topic-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 0.65rem;
  }

  .topic-tile {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.9rem;
    align-items: center;
    background: var(--surface-strong);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    padding: 0.9rem 1rem;
    text-align: left;
    font: inherit;
    cursor: pointer;
    box-shadow: var(--shadow);
    transition:
      transform var(--motion-fast) var(--ease-spring),
      border-color var(--motion-med) var(--ease-soft);
  }

  .topic-tile:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--accent) 35%, var(--border-strong));
  }

  .topic-index {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--muted);
    letter-spacing: 0.04em;
    min-width: 1.5rem;
  }

  .topic-tile-body strong {
    font-size: 0.94rem;
    font-weight: 600;
    color: var(--text);
    display: block;
    line-height: 1.3;
  }

  .topic-tile-body p {
    font-size: 0.82rem;
    color: var(--text-soft);
    margin-top: 0.2rem;
    line-height: 1.4;
  }

  .topic-tile-arrow {
    color: var(--muted);
    transition: color var(--motion-fast) var(--ease-soft);
  }

  .topic-tile:hover .topic-tile-arrow {
    color: var(--accent);
  }

  /* ── Recents ── */
  .recents-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 0.85rem;
  }

  .recent-card {
    background: var(--surface-strong);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    padding: 1.1rem 1.2rem;
    box-shadow: var(--shadow);
    display: grid;
    gap: 0.5rem;
    transition:
      transform var(--motion-fast) var(--ease-spring),
      box-shadow var(--motion-med) var(--ease-soft);
  }

  .recent-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-strong);
  }

  .recent-card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .subject-chip {
    display: inline-flex;
    align-items: center;
    background: var(--accent-dim);
    border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
    border-radius: var(--radius-pill);
    padding: 0.18rem 0.6rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--accent);
    white-space: nowrap;
  }

  .recent-date {
    font-size: 0.75rem;
    color: var(--muted);
    flex-shrink: 0;
  }

  .recent-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text);
    line-height: 1.3;
    letter-spacing: -0.01em;
  }

  .recent-stage {
    font-size: 0.83rem;
    color: var(--text-soft);
  }

  .recent-actions {
    display: flex;
    gap: 0.55rem;
    align-items: center;
    margin-top: 0.1rem;
  }

  /* ── Overflow menu ── */
  .icon-summary {
    min-width: 2.4rem;
    padding-inline: 0.7rem;
  }

  .overflow-menu {
    position: relative;
  }

  .overflow-menu summary { list-style: none; }
  .overflow-menu summary::-webkit-details-marker { display: none; }

  .overflow-panel {
    position: absolute;
    left: 0;
    top: calc(100% + 0.4rem);
    min-width: 140px;
    display: grid;
    gap: 0.25rem;
    padding: 0.35rem;
    background: var(--surface-strong);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-strong);
    z-index: 10;
  }

  .menu-item {
    border: 1px solid transparent;
    border-radius: calc(var(--radius-md) - 0.2rem);
    background: transparent;
    color: var(--text);
    text-align: left;
    padding: 0.6rem 0.75rem;
    font: inherit;
    font-size: 0.86rem;
    cursor: pointer;
  }

  .menu-item:hover {
    background: var(--surface-soft);
    transform: none;
    box-shadow: none;
  }

  .menu-item.danger { color: var(--color-error); }

  /* ── Utilities ── */
  .error-note {
    font-size: 0.84rem;
    color: var(--color-error);
  }

  @media (max-width: 700px) {
    .section-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .stat-strip {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    }
  }
</style>
