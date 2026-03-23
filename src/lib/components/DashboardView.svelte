<script lang="ts">
  import { browser } from '$app/environment';
  import { getAuthenticatedHeaders } from '$lib/authenticated-fetch';
  import { deriveDashboardLessonLists } from '$lib/components/dashboard-lessons';
  import { extractHintChipLabels, groupHintChips } from '$lib/components/dashboard-hints';
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
  // Cache auth headers so we don't re-call supabase.auth.getSession() on every hint load
  let cachedHeaders = $state<Record<string, string> | null>(null);

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

  const groupedHintChips = $derived(groupHintChips(promptSuggestionChips, selectedSubject));

  // Pre-derive values that were plain function calls in the template
  const greeting = $derived.by(() => {
    const hour = new Date().getHours();
    if (hour < 12) return `Good morning, ${firstName}!`;
    if (hour < 17) return `Hey ${firstName}!`;
    return `Evening, ${firstName}!`;
  });

  const greetingLine = $derived(
    currentSession
      ? `You're in the middle of something. Pick up where you left off.`
      : summary.completedLessons > 0
        ? `${summary.completedLessons} ${summary.completedLessons === 1 ? 'lesson' : 'lessons'} completed. Keep the momentum going.`
        : `Your learning journey starts here. Pick a topic and let's go.`
  );

  const currentSessionProgress = $derived(
    currentSession ? Math.max(6, Math.round((currentSession.stagesCompleted.length / 6) * 100)) : 0
  );
  const currentSessionStageLabel = $derived(
    currentSession
      ? `Stage ${Math.min(currentSession.stagesCompleted.length + 1, 6)} of 6 · ${getStageLabel(currentSession.currentStage)}`
      : ''
  );
  const currentSessionDate = $derived(
    currentSession ? new Date(currentSession.lastActiveAt).toLocaleDateString() : ''
  );

  // Pre-compute emoji map — avoid repeated string comparisons per tile render
  const subjectEmojiMap = $derived(
    Object.fromEntries(availableSubjects.map((s) => [s.id, subjectEmoji(s.name)]))
  );
  const selectedSubjectEmoji = $derived(subjectEmojiMap[selectedSubject?.id ?? ''] ?? '📚');

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

  async function getHeaders(): Promise<Record<string, string>> {
    if (cachedHeaders) return cachedHeaders;
    const h = await getAuthenticatedHeaders();
    cachedHeaders = h;
    return h;
  }

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
      const headers = await getHeaders();
      const result = await resolveSubjectHints({
        subject: selectedSubject,
        curriculumId: viewState.profile.curriculumId,
        curriculumName: viewState.profile.curriculum,
        gradeId: viewState.profile.gradeId,
        gradeLabel: viewState.profile.grade,
        term: viewState.profile.term,
        forceRefresh,
        fetcher: browser ? window.fetch.bind(window) : undefined,
        headers
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

  function recentDate(session: LessonSession): string {
    return new Date(session.lastActiveAt).toLocaleDateString();
  }

  function recentStageLabel(session: LessonSession): string {
    return `Stage ${Math.min(session.stagesCompleted.length + 1, 6)} of 6 · ${getStageLabel(session.currentStage)}`;
  }
</script>

<section class="view">

  <!-- ── HERO ── -->
  <div class="hero">
    <div class="hero-greeting">
      <h2>{greeting} <span class="greeting-wave" aria-hidden="true">👋</span></h2>
      <p>{greetingLine}</p>
    </div>

    <div class="hero-body">
      {#if currentSession}
        <div class="mission-card">
          <div class="mission-card-inner">
            <p class="mission-kicker">Current Mission</p>
            <h3 class="mission-title">{currentSession.topicTitle}</h3>
            <p class="mission-meta">{currentSession.subject} · {currentSessionStageLabel}</p>
            <div class="mission-progress-bar">
              <div class="mission-progress-fill" style="transform: scaleX({currentSessionProgress / 100});"></div>
            </div>
            <div class="mission-footer">
              <button type="button" class="btn btn-primary" onclick={() => startFromBanner(currentSession)}>
                Resume →
              </button>
              <span class="mission-timestamp">Last opened {currentSessionDate}</span>
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

      <div class="stat-strip">
        <div class="stat-pill">
          <span class="stat-pill-icon" aria-hidden="true">⭐</span>
          <div class="stat-pill-text">
            <span class="stat-pill-value" style="color: var(--color-xp);">{summary.averageMastery}%</span>
            <span class="stat-pill-label">mastery</span>
          </div>
        </div>
        <div class="stat-pill">
          <span class="stat-pill-icon" aria-hidden="true">✅</span>
          <div class="stat-pill-text">
            <span class="stat-pill-value">{summary.completedLessons}</span>
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
        {#each availableSubjects.slice(0, 4) as subject (subject.id)}
          <button
            type="button"
            class="subject-pill"
            class:active={subject.id === selectedSubject?.id}
            onclick={() => appState.selectSubject(subject.id)}
          >
            {subjectEmojiMap[subject.id] ?? '📚'} {subject.name}
          </button>
        {/each}
        {#if availableSubjects.length > 4}
          <select class="subject-overflow" value={selectedSubject?.id} onchange={onSubjectChange}>
            {#each availableSubjects as subject (subject.id)}
              <option value={subject.id}>{subject.name}</option>
            {/each}
          </select>
        {/if}
      </div>
    </div>

    <div class="path-grid" aria-live="polite">
      {#if hintChipsLoading}
        {#each Array.from({ length: 6 }) as _, i}
          <div class="path-tile path-tile--skeleton" style="--i: {i};"></div>
        {/each}
      {:else if groupedHintChips.length > 0}
        {#each groupedHintChips as group, gi}
          {#if groupedHintChips.length > 1 && group.groupLabel}
            <p class="chip-group-label">{group.groupLabel}</p>
          {/if}
          {#each group.chips as chip, i (chip.id)}
            <button
              type="button"
              class="path-tile"
              class:selected={pendingChipId === chip.id}
              aria-busy={pendingChipId === chip.id}
              aria-disabled={Boolean(pendingChipId) && pendingChipId !== chip.id}
              style="--i: {gi * 10 + i};"
              onclick={() => startFromSuggestion(chip.id, chip.label)}
            >
              <span class="path-tile-icon" aria-hidden="true">{selectedSubjectEmoji}</span>
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
        {/each}
      {/if}
    </div>

    {#if !hintChipsLoading && groupedHintChips.length > 0}
      <div class="refresh-row">
        <button type="button" class="btn btn-secondary shuffle-btn" disabled={hintChipsRefreshing} onclick={refreshSubjectHints}>
          {hintChipsRefreshing ? '↻ Shuffling...' : '⇄ Shuffle topics'}
        </button>
        {#if hintRefreshError}<span class="error-note">{hintRefreshError}</span>{/if}
      </div>
    {/if}

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
          disabled={viewState.topicDiscovery.status === 'loading' || Boolean(pendingChipId)}
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
        {#each recentLessons as session (session.id)}
          <article class="recent-card">
            <div class="recent-card-top">
              <span class="subject-chip">{session.subject}</span>
              <span class="recent-date">{recentDate(session)}</span>
            </div>
            <h4 class="recent-title">{session.topicTitle}</h4>
            <p class="recent-stage">{recentStageLabel(session)}</p>
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
    gap: 1.75rem;
    width: 100%;
    align-content: start;
    padding-bottom: 2rem;
  }

  /* ── Hero ── */
  .hero {
    display: grid;
    gap: 0.85rem;
  }

  .hero-greeting h2 {
    font-size: clamp(1.5rem, 2.8vw, 2rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.1;
    color: var(--text);
  }

  /* Wave plays once on load, not forever */
  .greeting-wave {
    display: inline-block;
    animation: wave 1s ease-in-out 1;
    transform-origin: 70% 70%;
  }

  @keyframes wave {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(14deg); }
    75% { transform: rotate(-8deg); }
  }

  .hero-greeting p {
    font-size: 0.92rem;
    color: var(--text-soft);
    margin-top: 0.25rem;
  }

  .hero-body {
    display: grid;
    gap: 0.75rem;
  }

  /* Mission card — glass surface */
  .mission-card {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--glass-border));
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow), var(--glass-inset);
    overflow: hidden;
  }

  .mission-card--empty {
    border-color: var(--border-strong);
    opacity: 0.8;
  }

  .mission-card-inner {
    padding: 1.2rem 1.4rem;
    display: grid;
    gap: 0.5rem;
  }

  .mission-kicker {
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: var(--accent);
  }

  .mission-title {
    font-size: 1.3rem;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.02em;
    color: var(--text);
  }

  .mission-meta {
    font-size: 0.85rem;
    color: var(--text-soft);
  }

  /* Progress bar: transform:scaleX avoids layout reflow */
  .mission-progress-bar {
    height: 5px;
    background: var(--border-strong);
    border-radius: var(--radius-pill);
    overflow: hidden;
    margin: 0.2rem 0;
  }

  .mission-progress-fill {
    height: 100%;
    width: 100%;
    border-radius: var(--radius-pill);
    background: linear-gradient(90deg, var(--color-blue), var(--accent));
    transform-origin: left;
    transition: transform 0.5s var(--ease-soft);
  }

  .mission-footer {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 0.25rem;
    flex-wrap: wrap;
  }

  .mission-timestamp {
    font-size: 0.78rem;
    color: var(--muted);
  }

  /* Stat strip */
  .stat-strip {
    display: flex;
    gap: 0.65rem;
    flex-wrap: wrap;
  }

  .stat-pill {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-inset);
    border-radius: var(--radius-lg);
    padding: 0.7rem 1rem;
    flex: 1;
    min-width: 110px;
  }

  .stat-pill-icon {
    font-size: 1.3rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .stat-pill-text {
    display: flex;
    flex-direction: column;
  }

  .stat-pill-value {
    font-size: 1.4rem;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.04em;
    color: var(--text);
  }

  .stat-pill-label {
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--text-soft);
    margin-top: 0.1rem;
  }

  /* ── Section blocks ── */
  .section-block {
    display: grid;
    gap: 0.85rem;
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
    font-size: 1.2rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text);
  }

  .section-desc {
    font-size: 0.85rem;
    color: var(--text-soft);
    margin-top: 0.15rem;
  }

  /* Subject switcher */
  .subject-switcher {
    display: flex;
    gap: 0.4rem;
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
    padding: 0.4rem 0.8rem;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--text-soft);
    cursor: pointer;
    white-space: nowrap;
    transition: background var(--motion-fast) var(--ease-soft), color var(--motion-fast) var(--ease-soft);
  }

  .subject-pill:hover {
    background: var(--surface-soft);
    color: var(--text);
    transform: none;
  }

  .subject-pill.active {
    background: var(--accent-dim);
    border-color: var(--accent);
    color: var(--accent);
    font-weight: 600;
  }

  .subject-overflow {
    background: var(--surface-strong);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-pill);
    color: var(--text);
    padding: 0.4rem 0.8rem;
    font: inherit;
    font-size: 0.82rem;
    cursor: pointer;
  }

  /* ── Path grid ── */
  .path-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.65rem;
    min-height: 4rem;
  }

  .path-tile {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.7rem;
    min-height: 4rem;
    padding: 0.85rem 0.95rem;
    background: var(--surface-strong);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    color: var(--text);
    text-align: left;
    font: inherit;
    cursor: pointer;
    /* Single shadow, no compound layers */
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
    transition: transform var(--motion-fast) var(--ease-spring), border-color var(--motion-fast) var(--ease-soft);
  }

  @keyframes chip-enter {
    from { opacity: 0; transform: translateY(10px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
  }

  .path-tile:not(.path-tile--skeleton) {
    animation: chip-enter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    animation-delay: calc(var(--i, 0) * 0.04s);
  }

  .path-tile:hover:not(:disabled):not([aria-disabled='true']) {
    transform: translateY(-2px);
    border-color: var(--accent);
  }

  .path-tile:active:not(:disabled) {
    transform: translateY(0) scale(0.985);
  }

  .path-tile.selected {
    background: var(--accent-dim);
    border-color: var(--accent);
  }

  .path-tile[aria-disabled='true'] {
    pointer-events: none;
    opacity: 0.45;
  }

  /* Skeleton: single animation, no stagger overhead */
  .path-tile--skeleton {
    background: var(--surface-soft);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    animation: skeleton-pulse 1.2s ease-in-out infinite;
  }

  @keyframes skeleton-pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.9; }
  }

  .path-tile-icon {
    font-size: 1.4rem;
    line-height: 1;
  }

  .path-tile-name {
    font-size: 0.88rem;
    font-weight: 500;
    line-height: 1.3;
  }

  .path-tile-arrow {
    font-size: 0.9rem;
    color: var(--text-soft);
    transition: color var(--motion-fast) var(--ease-soft);
  }

  .path-tile:hover:not(:disabled) .path-tile-arrow {
    color: var(--accent);
  }

  .path-tile-indicator {
    display: flex;
    gap: 0.2rem;
    align-items: center;
  }

  .busy-dot {
    width: 0.3rem;
    height: 0.3rem;
    border-radius: 50%;
    background: var(--accent);
    opacity: 0.4;
    animation: busy-pulse 1s ease-in-out infinite;
  }

  .busy-dot:nth-child(2) { animation-delay: 0.15s; }
  .busy-dot:nth-child(3) { animation-delay: 0.3s; }

  @keyframes busy-pulse {
    0%, 100% { opacity: 0.25; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1); }
  }

  /* ── Chip groups ── */
  .chip-group-label {
    grid-column: 1 / -1;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-soft);
    padding-top: 0.5rem;
    letter-spacing: 0.01em;
  }

  .chip-group-label:first-child {
    padding-top: 0;
  }

  .refresh-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: -0.2rem;
  }

  .shuffle-btn {
    font-size: 0.84rem;
    letter-spacing: 0.01em;
  }

  /* ── Search ── */
  .search-launcher {
    display: grid;
    gap: 0.65rem;
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-inset);
    border-radius: var(--radius-lg);
    padding: 0.9rem 1rem;
    transition: border-color var(--motion-fast) var(--ease-soft), box-shadow var(--motion-fast) var(--ease-soft);
  }

  .search-launcher.focused {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
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
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  /* ── Shortlist ── */
  .shortlist {
    display: grid;
    gap: 0.75rem;
  }

  .shortlist-header {
    display: grid;
    gap: 0.2rem;
  }

  .shortlist-header h4 {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text);
  }

  .shortlist-header p {
    font-size: 0.82rem;
    color: var(--text-soft);
  }

  .topic-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 0.6rem;
  }

  .topic-tile {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.85rem;
    align-items: center;
    background: var(--surface-strong);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    padding: 0.85rem 0.95rem;
    text-align: left;
    font: inherit;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
    transition: transform var(--motion-fast) var(--ease-spring), border-color var(--motion-fast) var(--ease-soft);
  }

  .topic-tile:hover {
    transform: translateY(-2px);
    border-color: var(--accent);
  }

  .topic-index {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--muted);
    letter-spacing: 0.04em;
    min-width: 1.5rem;
  }

  .topic-tile-body strong {
    font-size: 0.92rem;
    font-weight: 600;
    color: var(--text);
    display: block;
    line-height: 1.3;
  }

  .topic-tile-body p {
    font-size: 0.8rem;
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
    gap: 0.75rem;
  }

  .recent-card {
    background: var(--surface-strong);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    padding: 1rem 1.1rem;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
    display: grid;
    gap: 0.45rem;
    transition: transform var(--motion-fast) var(--ease-spring), border-color var(--motion-fast) var(--ease-soft);
  }

  .recent-card:hover {
    transform: translateY(-2px);
    border-color: var(--accent);
  }

  .recent-card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    overflow: hidden;
  }

  .subject-chip {
    display: inline-flex;
    align-items: center;
    background: var(--accent-dim);
    border-radius: var(--radius-pill);
    padding: 0.18rem 0.6rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--accent);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    max-width: 100%;
  }

  .recent-date {
    font-size: 0.75rem;
    color: var(--muted);
    flex-shrink: 0;
  }

  .recent-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text);
    line-height: 1.3;
    letter-spacing: -0.01em;
  }

  .recent-stage {
    font-size: 0.82rem;
    color: var(--text-soft);
  }

  .recent-actions {
    display: flex;
    gap: 0.5rem;
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
    padding: 0.55rem 0.7rem;
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
  }
</style>
