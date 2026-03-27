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
  let showAllTiles = $state(false);
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

  const totalChips = $derived(groupedHintChips.reduce((sum, g) => sum + g.chips.length, 0));
  const hasMoreTiles = $derived(!showAllTiles && totalChips > 6);

  const displayedHintChips = $derived.by(() => {
    if (showAllTiles) return groupedHintChips;
    let count = 0;
    return groupedHintChips
      .map((group) => ({ ...group, chips: group.chips.filter(() => count++ < 6) }))
      .filter((group) => group.chips.length > 0);
  });

  const greeting = $derived.by(() => {
    const hour = new Date().getHours();
    if (hour < 12) return `Good morning, ${firstName}!`;
    if (hour < 17) return `Hey ${firstName}!`;
    return `Evening, ${firstName}!`;
  });

  const greetingLine = $derived.by(() => {
    if (currentSession) {
      const stage = Math.min(currentSession.stagesCompleted.length + 1, 6);
      return `You're ${stage} stage${stage === 1 ? '' : 's'} into ${toSentenceCase(currentSession.topicTitle)}. Let's keep going.`;
    }
    if (summary.completedLessons > 0) {
      return `${summary.completedLessons} ${summary.completedLessons === 1 ? 'lesson' : 'lessons'} completed. Keep the momentum going.`;
    }
    return `Your learning journey starts here. Pick a topic and let's go.`;
  });

  const currentSessionProgress = $derived(
    currentSession ? Math.min(100, Math.max(6, Math.round((currentSession.stagesCompleted.length / 6) * 100))) : 0
  );
  const currentSessionStageLabel = $derived(
    currentSession
      ? `Stage ${Math.min(currentSession.stagesCompleted.length + 1, 6)} of 6 · ${getStageLabel(currentSession.currentStage)}`
      : ''
  );
  const currentSessionDate = $derived(
    currentSession ? relativeTime(currentSession.lastActiveAt) : ''
  );

  // Pre-compute emoji + color maps — avoid repeated string comparisons per tile render
  const subjectEmojiMap = $derived(
    Object.fromEntries(availableSubjects.map((s) => [s.id, subjectEmoji(s.name)]))
  );
  const subjectColorMap = $derived(
    Object.fromEntries(availableSubjects.map((s) => [s.id, subjectColorClass(s.name)]))
  );
  const selectedSubjectEmoji = $derived(subjectEmojiMap[selectedSubject?.id ?? ''] ?? '📚');
  const selectedSubjectColor = $derived(subjectColorMap[selectedSubject?.id ?? ''] ?? 'blue');

  function toSentenceCase(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  function relativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks === 1) return 'last week';
    return `${diffWeeks} weeks ago`;
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

  function subjectColorClass(name: string): string {
    const n = (name ?? '').toLowerCase();
    if (n.includes('math')) return 'blue';
    if (n.includes('physics')) return 'yellow';
    if (n.includes('chemistry')) return 'orange';
    if (n.includes('biology') || n.includes('life')) return 'green';
    if (n.includes('english')) return 'purple';
    if (n.includes('history') || n.includes('social')) return 'orange';
    if (n.includes('accounting')) return 'blue';
    if (n.includes('economics')) return 'green';
    if (n.includes('afrikaans')) return 'red';
    if (n.includes('art')) return 'purple';
    if (n.includes('business')) return 'orange';
    if (n.includes('geography')) return 'green';
    return 'blue';
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

  function selectSubject(subjectId: string): void {
    lastHintSeed = '';
    promptSuggestionsText = '';
    hintRefreshError = '';
    hintChipsRefreshing = false;
    pendingChipId = null;
    showAllTiles = false;
    appState.setTopicDiscoveryInput('');
    appState.selectSubject(subjectId);
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

  function recentStageLabel(session: LessonSession): string {
    return `Stage ${Math.min(session.stagesCompleted.length + 1, 6)} of 6 · ${getStageLabel(session.currentStage)}`;
  }

  let pathSectionEl = $state<HTMLElement | null>(null);

  function jumpToSubject(subjectId: string): void {
    selectSubject(subjectId);
    setTimeout(() => {
      pathSectionEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
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
            <h3 class="mission-title">{toSentenceCase(currentSession.topicTitle)}</h3>
            <p class="mission-meta">{currentSession.subject} · {currentSessionStageLabel}</p>
            <div class="mission-progress-bar">
              <div class="mission-progress-fill" style="--progress: {currentSessionProgress / 100};"></div>
            </div>
            <div class="mission-footer">
              <button type="button" class="btn btn-primary resume-btn" onclick={() => startFromBanner(currentSession)}>
                Resume <span class="resume-arrow">→</span>
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
    </div>
  </div>

  <!-- ── YOUR SUBJECTS ── -->
  {#if availableSubjects.length > 0}
    <section class="section-block subjects-section">
      <div class="section-header section-header--simple">
        <h3 class="section-title">Your Subjects <span class="subject-count">{availableSubjects.length}</span></h3>
      </div>
      <div class="subjects-row" role="list">
        {#each availableSubjects as subject, i (subject.id)}
          <button
            type="button"
            class="subject-card"
            class:active={subject.id === selectedSubject?.id}
            style="--i: {i};"
            onclick={() => jumpToSubject(subject.id)}
            aria-pressed={subject.id === selectedSubject?.id}
          >
            <div class="subject-card-icon icon-block icon-block--{subjectColorMap[subject.id] ?? 'blue'}" aria-hidden="true">
              {subjectEmojiMap[subject.id] ?? '📚'}
            </div>
            <span class="subject-card-name">{subject.name}</span>
            <span class="subject-card-arrow" aria-hidden="true">→</span>
          </button>
        {/each}
      </div>
    </section>
  {/if}

  <!-- ── YOUR PATH ── -->
  <section class="section-block" bind:this={pathSectionEl}>
    <div class="section-header section-header--simple">
      <h3 class="section-title">Your Path</h3>
      <p class="section-desc">
        {viewState.topicDiscovery.shortlist ? 'Pick a topic to begin your lesson' : `Recommended for ${selectedSubject?.name ?? 'your subjects'}`}
      </p>
    </div>

    {#key selectedSubject?.id}
      <div class="path-grid" aria-live="polite">
        {#if hintChipsLoading}
          {#each Array.from({ length: 6 }) as _, i}
            <div class="path-tile path-tile--skeleton" style="--i: {i};"></div>
          {/each}
        {:else if displayedHintChips.length > 0}
          {#each displayedHintChips as group, gi}
            {#if displayedHintChips.length > 1 && group.groupLabel}
              <p class="chip-group-label">{group.groupLabel}</p>
            {/if}
            {#each group.chips as chip, i (chip.id)}
              {@const isFirst = gi === 0 && i === 0}
              <button
                type="button"
                class="path-tile"
                class:selected={pendingChipId === chip.id}
                class:path-tile--recommended={isFirst}
                aria-busy={pendingChipId === chip.id}
                aria-disabled={Boolean(pendingChipId) && pendingChipId !== chip.id}
                style="--i: {gi * 10 + i};"
                onclick={() => startFromSuggestion(chip.id, chip.label)}
              >
                <div class="path-tile-icon icon-block icon-block--{selectedSubjectColor}" aria-hidden="true">
                  {selectedSubjectEmoji}
                </div>
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
    {/key}

    {#if hasMoreTiles}
      <button type="button" class="btn btn-ghost see-all-btn" onclick={() => (showAllTiles = true)}>
        See {totalChips - 6} more topics ↓
      </button>
    {/if}

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
                <strong>{toSentenceCase(topic.title)}</strong>
                <p>{topic.description}</p>
              </div>
              <span class="topic-tile-arrow" aria-hidden="true">→</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </section>

  <!-- ── OTHER SESSIONS ── -->
  {#if recentLessons.length > 0}
    <section class="section-block">
      <div class="section-header section-header--simple">
        <h3 class="section-title">Other sessions</h3>
      </div>
      <div class="recents-grid">
        {#each recentLessons as session (session.id)}
          <article class="recent-card">
            <div class="recent-card-top">
              <span class="subject-chip">{session.subject}</span>
              <span class="recent-date">{relativeTime(session.lastActiveAt)}</span>
            </div>
            <h4 class="recent-title">{toSentenceCase(session.topicTitle)}</h4>
            <p class="recent-stage">{recentStageLabel(session)}</p>
            <div class="recent-actions">
              <button type="button" class="btn btn-primary btn-compact" onclick={() => appState.resumeSession(session.id)}>
                Resume →
              </button>
              <button type="button" class="btn btn-ghost btn-compact" onclick={() => appState.restartLessonSession(session.id)}>
                Restart
              </button>
              <button type="button" class="btn btn-ghost btn-compact danger-ghost" onclick={() => appState.archiveSession(session.id)}>
                Archive
              </button>
            </div>
          </article>
        {/each}
      </div>
    </section>
  {/if}

  <!-- ── STATS FOOTER ── -->
  {#if summary.completedLessons > 0 || summary.averageMastery > 0}
    <div class="stats-footer">
      <div class="stat-pill">
        <span class="stat-pill-icon" aria-hidden="true">⭐</span>
        <div class="stat-pill-text">
          <span class="stat-pill-value" style="color: var(--color-xp);">{summary.averageMastery}%</span>
          <span class="stat-pill-label">mastery · {selectedSubject?.name ?? 'overall'}</span>
        </div>
      </div>
      {#if summary.completedLessons > 0}
        <div class="stat-pill">
          <span class="stat-pill-icon" aria-hidden="true">✅</span>
          <div class="stat-pill-text">
            <span class="stat-pill-value">{summary.completedLessons}</span>
            <span class="stat-pill-label">{summary.completedLessons === 1 ? 'lesson' : 'lessons'} done</span>
          </div>
        </div>
      {/if}
    </div>
  {/if}

</section>

<style>
  /* ── Root ── */
  .view {
    display: grid;
    gap: 1.75rem;
    width: 100%;
    align-content: start;
    padding-bottom: 2.5rem;
  }

  /* ── Hero ── */
  .hero {
    display: grid;
    gap: 0.85rem;
    animation: section-enter 0.35s var(--ease-soft) both;
  }

  @keyframes section-enter {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .hero-greeting h2 {
    font-size: clamp(1.5rem, 2.8vw, 2rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.1;
    color: var(--text);
  }

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
    position: relative;
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--glass-border));
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow), inset 0 1px 0 rgba(255, 255, 255, 0.13);
    overflow: hidden;
  }

  /* Lensing: soft radial light glint, hero card only */
  .mission-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: radial-gradient(
      ellipse 80% 60% at 30% 20%,
      rgba(255, 255, 255, 0.05) 0%,
      transparent 70%
    );
    pointer-events: none;
  }

  .mission-card--empty {
    border-color: var(--border-strong);
    opacity: 0.8;
  }

  .mission-card-inner {
    padding: 1.6rem 1.8rem;
    display: grid;
    gap: 0.55rem;
  }

  .mission-kicker {
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: var(--accent);
  }

  .mission-title {
    font-size: 1.55rem;
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.025em;
    color: var(--text);
  }

  .mission-meta {
    font-size: 0.85rem;
    color: var(--text-soft);
  }

  /* Progress bar: animate fill on load */
  .mission-progress-bar {
    height: 5px;
    background: var(--border-strong);
    border-radius: var(--radius-pill);
    overflow: hidden;
    margin: 0.35rem 0;
  }

  .mission-progress-fill {
    height: 100%;
    width: 100%;
    border-radius: var(--radius-pill);
    background: linear-gradient(90deg, var(--color-blue), var(--accent));
    transform-origin: left;
    transform: scaleX(0);
    animation: progress-fill 0.7s 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  @keyframes progress-fill {
    to { transform: scaleX(var(--progress, 1)); }
  }

  .mission-footer {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 0.4rem;
    flex-wrap: wrap;
  }

  .mission-timestamp {
    font-size: 0.78rem;
    color: var(--muted);
  }

  /* Resume button arrow nudge on hover */
  .resume-btn .resume-arrow {
    display: inline-block;
    transition: transform var(--motion-fast) var(--ease-spring);
  }

  .resume-btn:hover .resume-arrow {
    transform: translateX(3px);
  }

  /* ── Section blocks ── */
  .section-block {
    display: grid;
    gap: 0.85rem;
    animation: section-enter 0.35s var(--ease-soft) both;
    animation-delay: 0.08s;
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

  /* Subject switcher — horizontal scroll, no wrap */
  .subject-switcher-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    max-width: 100%;
  }

  .subject-switcher-wrap::-webkit-scrollbar {
    display: none;
  }

  .subject-switcher {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    white-space: nowrap;
    padding-bottom: 2px;
  }

  .subject-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    background: var(--glass-bg-tile);
    backdrop-filter: var(--glass-blur-tile);
    -webkit-backdrop-filter: var(--glass-blur-tile);
    border: 1px solid var(--border-strong);
    box-shadow: var(--glass-inset-tile);
    border-radius: var(--radius-pill);
    padding: 0.4rem 0.85rem;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-soft);
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: border-color var(--motion-fast) var(--ease-soft), color var(--motion-fast) var(--ease-soft);
  }

  .subject-pill:hover {
    color: var(--text);
    border-color: var(--border-strong);
    transform: none;
  }

  .subject-pill.active {
    background: var(--accent-dim);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    border-color: var(--accent);
    color: var(--accent);
    font-weight: 700;
    box-shadow: none;
  }

  .subject-overflow {
    background: var(--glass-bg-tile);
    backdrop-filter: var(--glass-blur-tile);
    -webkit-backdrop-filter: var(--glass-blur-tile);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-pill);
    color: var(--text);
    padding: 0.4rem 0.8rem;
    font: inherit;
    font-size: 0.82rem;
    cursor: pointer;
    flex-shrink: 0;
  }

  /* ── Your Subjects strip ── */
  .subjects-section {
    animation-delay: 0.04s;
  }

  .subject-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.4rem;
    height: 1.4rem;
    padding: 0 0.35rem;
    background: var(--accent-dim);
    border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
    border-radius: var(--radius-pill);
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--accent);
    vertical-align: middle;
    margin-left: 0.4rem;
  }

  .subjects-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .subject-card {
    display: inline-flex;
    align-items: center;
    gap: 0.65rem;
    flex-shrink: 0;
    background: var(--glass-bg-tile);
    backdrop-filter: var(--glass-blur-tile);
    -webkit-backdrop-filter: var(--glass-blur-tile);
    border: 1px solid var(--border-strong);
    box-shadow: var(--glass-inset-tile);
    border-radius: var(--radius-lg);
    padding: 0.65rem 0.9rem 0.65rem 0.75rem;
    font: inherit;
    cursor: pointer;
    color: var(--text);
    text-align: left;
    animation: chip-enter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    animation-delay: calc(var(--i, 0) * 0.05s);
    transition:
      transform var(--motion-fast) var(--ease-spring),
      border-color var(--motion-fast) var(--ease-soft),
      background var(--motion-fast) var(--ease-soft);
  }

  .subject-card.active {
    background: var(--accent-dim);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent);
  }

  .subject-card:hover:not(.active) {
    transform: translateY(-2px);
    border-color: var(--accent);
  }

  .subject-card:active {
    transform: translateY(0) scale(0.97);
    transition-duration: 80ms;
  }

  .subject-card-icon {
    width: 2.2rem;
    height: 2.2rem;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  .subject-card-name {
    font-size: 0.88rem;
    font-weight: 600;
    line-height: 1.2;
    white-space: nowrap;
    color: var(--text);
  }

  .subject-card-arrow {
    font-size: 0.85rem;
    color: var(--accent);
    opacity: 0;
    transform: translateX(-5px);
    transition: opacity var(--motion-fast) var(--ease-soft), transform var(--motion-fast) var(--ease-soft);
    margin-left: 0.1rem;
  }

  .subject-card:hover .subject-card-arrow,
  .subject-card.active .subject-card-arrow {
    opacity: 1;
    transform: translateX(0);
  }

  /* ── Path grid ── */
  .path-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.65rem;
    min-height: 4rem;
    animation: section-enter 0.3s var(--ease-soft) both;
  }

  .path-tile {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    justify-self: stretch;
    gap: 0.7rem;
    width: 100%;
    min-height: 7rem;
    padding: 0.85rem 0.95rem;
    background: var(--glass-bg-tile);
    backdrop-filter: var(--glass-blur-tile);
    -webkit-backdrop-filter: var(--glass-blur-tile);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    color: var(--text);
    text-align: left;
    font: inherit;
    cursor: pointer;
    box-shadow: var(--glass-inset-tile);
    transition: transform var(--motion-fast) var(--ease-spring), border-color var(--motion-fast) var(--ease-soft);
  }

  .path-tile--recommended {
    border-color: color-mix(in srgb, var(--accent) 40%, var(--border-strong));
  }

  .path-tile--recommended::after {
    content: 'Next up';
    position: absolute;
    top: 0.55rem;
    right: 0.7rem;
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--accent);
    letter-spacing: 0.02em;
  }

  /* need position: relative for ::after */
  .path-tile--recommended {
    position: relative;
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
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    border-color: var(--accent);
    box-shadow: none;
  }

  .path-tile[aria-disabled='true'] {
    pointer-events: none;
    opacity: 0.45;
  }

  /* Skeleton */
  .path-tile--skeleton {
    width: 100%;
    min-height: 7rem;
    background: var(--surface-soft);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    animation: skeleton-pulse 1.2s ease-in-out infinite;
  }

  @keyframes skeleton-pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.9; }
  }

  /* Icon block inside tile — per design system */
  .path-tile-icon {
    width: 2.4rem;
    height: 2.4rem;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    flex-shrink: 0;
  }

  .icon-block--blue   { background: var(--color-blue-dim); }
  .icon-block--green  { background: var(--color-green-dim); }
  .icon-block--purple { background: var(--color-purple-dim); }
  .icon-block--orange { background: var(--color-orange-dim); }
  .icon-block--red    { background: var(--color-red-dim); }
  .icon-block--yellow { background: var(--color-yellow-dim); }

  .path-tile-name {
    min-width: 0;
    font-size: 0.88rem;
    font-weight: 600;
    line-height: 1.3;
  }

  /* Arrow — visible only on hover */
  .path-tile-arrow {
    font-size: 0.9rem;
    color: var(--accent);
    opacity: 0;
    transform: translateX(-4px);
    transition: opacity var(--motion-fast) var(--ease-soft), transform var(--motion-fast) var(--ease-soft);
  }

  .path-tile:hover:not(:disabled) .path-tile-arrow {
    opacity: 1;
    transform: translateX(0);
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

  .see-all-btn {
    justify-self: start;
    font-size: 0.84rem;
    color: var(--text-soft);
    padding-inline: 0.5rem;
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
    box-shadow: 0 0 0 3px var(--accent-glow), var(--glass-inset);
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
    background: var(--glass-bg-tile);
    backdrop-filter: var(--glass-blur-tile);
    -webkit-backdrop-filter: var(--glass-blur-tile);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    padding: 0.85rem 0.95rem;
    text-align: left;
    font: inherit;
    cursor: pointer;
    box-shadow: var(--glass-inset-tile);
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
    opacity: 0;
    transform: translateX(-4px);
    transition: opacity var(--motion-fast) var(--ease-soft), transform var(--motion-fast) var(--ease-soft), color var(--motion-fast) var(--ease-soft);
  }

  .topic-tile:hover .topic-tile-arrow {
    opacity: 1;
    transform: translateX(0);
    color: var(--accent);
  }

  /* ── Other sessions ── */
  .recents-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 0.75rem;
  }

  .recent-card {
    background: var(--glass-bg-tile);
    backdrop-filter: var(--glass-blur-tile);
    -webkit-backdrop-filter: var(--glass-blur-tile);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    padding: 1rem 1.1rem;
    box-shadow: var(--glass-inset-tile);
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
    flex-wrap: wrap;
  }

  .danger-ghost {
    color: var(--color-error) !important;
  }

  /* ── Stats footer ── */
  .stats-footer {
    display: flex;
    gap: 0.65rem;
    flex-wrap: wrap;
    padding-top: 0.25rem;
    border-top: 1px solid var(--border);
    animation: section-enter 0.35s var(--ease-soft) both;
    animation-delay: 0.16s;
  }

  .stat-pill {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: var(--glass-bg-tile);
    backdrop-filter: var(--glass-blur-tile);
    -webkit-backdrop-filter: var(--glass-blur-tile);
    border: 1px solid var(--border-strong);
    box-shadow: var(--glass-inset-tile);
    border-radius: var(--radius-lg);
    padding: 0.6rem 0.9rem;
    flex: 1;
    min-width: 110px;
  }

  .stat-pill-icon {
    font-size: 1.1rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .stat-pill-text {
    display: flex;
    flex-direction: column;
  }

  .stat-pill-value {
    font-size: 1.2rem;
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

  /* ── Overflow menu (removed, replaced with inline actions) ── */

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

  /* ── Tablet (768px) ── */
  @media (max-width: 768px) {
    .view {
      gap: 1.25rem;
      padding-bottom: 1.75rem;
    }
  }

  /* ── Phone (540px) ── */
  @media (max-width: 540px) {
    .view {
      gap: 1rem;
      padding-bottom: 1.25rem;
    }

    .hero {
      gap: 0.65rem;
    }

    .hero-greeting h2 {
      font-size: clamp(1.3rem, 7vw, 1.65rem);
    }

    .mission-card-inner {
      padding: 1.1rem 1.2rem;
    }

    .mission-title {
      font-size: 1.25rem;
    }

    .section-block {
      padding: 1rem 1.05rem;
      border-radius: var(--radius-lg);
    }

    .section-header h3 {
      font-size: 1rem;
    }

    /* Subject pills: smaller text to fit more on screen */
    .subject-pill {
      font-size: 0.8rem;
      padding: 0.45rem 0.8rem;
    }

    /* Tiles: single column, tighter */
    .path-grid {
      grid-template-columns: 1fr;
      gap: 0.55rem;
    }

    /* Recent card actions: stack on very small screens */
    .recent-actions {
      flex-direction: column;
      gap: 0.4rem;
    }

    .recent-actions .btn {
      width: 100%;
      justify-content: center;
    }

    /* Stats footer: single column */
    .stats-footer {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }
</style>
