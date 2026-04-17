<script lang="ts">
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { browser } from '$app/environment';
  import { getAuthenticatedHeaders } from '$lib/authenticated-fetch';
  import { launchCheckout } from '$lib/payments/checkout';
  import QuotaBadge from '$lib/components/quota/QuotaBadge.svelte';
  import { deriveDashboardLessonLists } from '$lib/components/dashboard-lessons';
  import { extractHintChipLabels } from '$lib/components/dashboard-hints';
  import TopicLaunchBriefingCard from '$lib/components/topic-discovery/TopicLaunchBriefingCard.svelte';
  import TopicSuggestionRail from '$lib/components/topic-discovery/TopicSuggestionRail.svelte';
  import { selectTopicLoadingCopy } from '$lib/components/topic-discovery/topic-loading-copy';
  import { resolveSubjectHints } from '$lib/ai/subject-hints';
  import { getCompletionSummary } from '$lib/data/platform';
  import { getStageLabel } from '$lib/lesson-system';
  import { appState } from '$lib/stores/app-state';
  import { countIn } from '$lib/utils/countIn';
  import type { AppState, LessonSession, ShortlistedTopic, UserSubscription } from '$lib/types';

  const { state: viewState }: { state: AppState } = $props();
  const LAUNCH_BRIEFING_DELAY_MS = 900;

  interface PendingDashboardLaunch {
    kind: 'discovery' | 'shortlist';
    topicTitle: string;
    subjectName: string;
    discoverySignature?: string;
    shortlistId?: string;
  }

  let topicInputFocused = $state(false);
  let pendingDashboardLaunch = $state<PendingDashboardLaunch | null>(null);
  let launchBriefingVisible = $state(false);
  let hasRequestedInitialDiscovery = $state(false);
  let launchBriefingTimer: ReturnType<typeof setTimeout> | null = null;
  let latestHintRequest = 0;
  let hintAbortController: AbortController | undefined;
  let lastHintSeed = $state('');
  let cachedHeaders = $state<Record<string, string> | null>(null);
  let quotaStatus = $state<{
    budgetUsd: number;
    spentUsd: number;
    remainingUsd: number;
    tier: UserSubscription['tier'];
    warningThreshold: boolean;
    exceeded: boolean;
  } | null>(null);
  let quotaStatusRequested = $state(false);
  let checkoutError = $state('');

  const summary = $derived(getCompletionSummary(viewState));
  const availableSubjects = $derived(viewState.curriculum.subjects);
  const dashboardLessonLists = $derived(deriveDashboardLessonLists(viewState.lessonSessions));
  const currentSession = $derived(dashboardLessonLists.currentSession);
  const recentLessons = $derived(dashboardLessonLists.recentLessons);
  const firstName = $derived(viewState.profile.fullName.split(' ')[0] || viewState.profile.fullName);

  const selectedSubject = $derived(
    availableSubjects.find((s) => s.id === viewState.topicDiscovery.selectedSubjectId) ?? availableSubjects[0]
  );
  const discoveryState = $derived(viewState.topicDiscovery.discovery);
  const discoveryTopics = $derived(discoveryState.topics);

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
  const pendingDiscoverySignature = $derived(pendingDashboardLaunch?.discoverySignature ?? null);
  const hasPendingDashboardLaunch = $derived(Boolean(pendingDashboardLaunch));
  const pendingLaunchCopy = $derived(
    pendingDashboardLaunch
      ? selectTopicLoadingCopy({
          subjectName: pendingDashboardLaunch.subjectName,
          topicTitle: pendingDashboardLaunch.topicTitle
        })
      : null
  );

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

    hintAbortController?.abort();
    hintAbortController = new AbortController();
    const { signal } = hintAbortController;

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
        headers,
        signal
      });

      if (requestId !== latestHintRequest || signal.aborted) return;
      const labels = extractHintChipLabels(result.hints.join('\n'));
      if (labels.length > 0) {
        appState.injectHintSuggestions(selectedSubject.id, labels);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (requestId !== latestHintRequest) return;
      // Hint injection is additive — silently ignore errors
    }
  }

  async function loadQuotaStatus(): Promise<void> {
    try {
      const headers = await getHeaders();
      const response = await fetch('/api/payments/quota-status', { headers });
      if (!response.ok) return;
      quotaStatus = await response.json();
    } catch {
      // Additive dashboard status only — keep the dashboard usable if this fails.
    }
  }

  // Derived hint trigger — changes whenever subject or profile fields change.
  // The $effect below tracks this directly, so any change reliably fires a reload.
  const hintTrigger = $derived(
    `${viewState.topicDiscovery.selectedSubjectId}:${viewState.profile.curriculumId}:${viewState.profile.gradeId}:${viewState.profile.term}`
  );

  $effect(() => {
    if (!browser) return;
    const trigger = hintTrigger;
    const { curriculumId, curriculum, gradeId, grade } = viewState.profile;
    if (!trigger || !selectedSubject || !curriculumId || !curriculum || !gradeId || !grade) return;
    void loadSubjectHints();
  });

  $effect(() => {
    if (!browser || !selectedSubject || hasRequestedInitialDiscovery) return;
    if (discoveryState.status !== 'idle' || discoveryTopics.length > 0) return;
    hasRequestedInitialDiscovery = true;
    void appState.loadTopicDiscovery(selectedSubject.id);
  });

  $effect(() => {
    if (!browser || quotaStatusRequested) return;
    quotaStatusRequested = true;
    void loadQuotaStatus();
  });

  function clearLaunchBriefingTimer(): void {
    if (launchBriefingTimer) {
      clearTimeout(launchBriefingTimer);
      launchBriefingTimer = null;
    }
  }

  $effect(() => {
    const currentPendingLaunch = pendingDashboardLaunch;
    clearLaunchBriefingTimer();

    if (!currentPendingLaunch) {
      launchBriefingVisible = false;
      return;
    }

    launchBriefingVisible = false;
    launchBriefingTimer = setTimeout(() => {
      if (pendingDashboardLaunch === currentPendingLaunch) {
        launchBriefingVisible = true;
      }
    }, LAUNCH_BRIEFING_DELAY_MS);

    return () => {
      clearLaunchBriefingTimer();
    };
  });

  function onInput(event: Event): void {
    appState.setTopicDiscoveryInput((event.currentTarget as HTMLTextAreaElement).value);
  }

  function onTopicFocus(): void { topicInputFocused = true; }
  function onTopicBlur(): void { topicInputFocused = false; }

  function selectSubject(subjectId: string): void {
    if (hasPendingDashboardLaunch) return;
    lastHintSeed = '';
    appState.setTopicDiscoveryInput('');
    appState.selectSubject(subjectId);
  }

  function resetTopicDiscovery(): void {
    if (hasPendingDashboardLaunch) return;
    lastHintSeed = '';
    appState.resetTopicDiscovery();
  }


  function runShortlist(): void {
    if (hasPendingDashboardLaunch) return;
    if (!selectedSubject || viewState.topicDiscovery.input.trim().length === 0) return;
    void appState.shortlistTopics(selectedSubject.id, viewState.topicDiscovery.input.trim());
  }

  async function handleUpgradeCheckout(): Promise<void> {
    checkoutError = '';

    try {
      await launchCheckout('basic');
    } catch (error) {
      checkoutError = error instanceof Error ? error.message : 'Unable to start checkout.';
    }
  }

  function refreshTopicDiscovery(): void {
    if (hasPendingDashboardLaunch) return;
    if (!selectedSubject) return;
    if (discoveryState.status === 'loading' || discoveryState.status === 'refreshing') return;
    void appState.refreshTopicDiscovery(selectedSubject.id);
  }

  function startTopic(topic: ShortlistedTopic): void {
    if (hasPendingDashboardLaunch || !selectedSubject) return;
    pendingDashboardLaunch = {
      kind: 'shortlist',
      topicTitle: topic.title,
      subjectName: selectedSubject.name,
      shortlistId: topic.id
    };
    void (async () => {
      try {
        await appState.startLessonFromShortlist(topic);
      } finally {
        pendingDashboardLaunch = null;
      }
    })();
  }

  function startDiscoveredTopic(topic: AppState['topicDiscovery']['discovery']['topics'][number]): void {
    if (hasPendingDashboardLaunch || !selectedSubject) return;
    pendingDashboardLaunch = {
      kind: 'discovery',
      topicTitle: topic.topicLabel,
      subjectName: selectedSubject.name,
      discoverySignature: topic.topicSignature
    };
    void (async () => {
      try {
        await appState.startLessonFromTopicDiscovery(topic.topicSignature);
      } finally {
        pendingDashboardLaunch = null;
      }
    })();
  }

  function sendDiscoveryFeedback(topicSignature: string, feedback: 'up' | 'down'): void {
    void appState.recordTopicFeedback(topicSignature, feedback);
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

      {#if quotaStatus}
        <div class="hero-quota">
          <QuotaBadge
            budgetUsd={quotaStatus.budgetUsd}
            spentUsd={quotaStatus.spentUsd}
            remainingUsd={quotaStatus.remainingUsd}
            tier={quotaStatus.tier}
          />
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
            disabled={hasPendingDashboardLaunch}
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
        {viewState.topicDiscovery.shortlist.shortlist
          ? 'Pick a topic to begin your lesson'
          : discoveryTopics.length > 0
            ? 'Start with a suggested topic or describe your own'
            : 'Or describe exactly what you want to learn'}
      </p>
    </div>

    <TopicSuggestionRail
      title="Suggested topics"
      subtitle={`More ideas for ${selectedSubject?.name ?? 'this subject'}`}
      subjectName={selectedSubject?.name ?? 'this subject'}
      status={discoveryState.status}
      suggestions={discoveryTopics}
      refreshed={discoveryState.refreshed}
      error={discoveryState.error}
      launchingSignature={pendingDiscoverySignature}
      launchLocked={hasPendingDashboardLaunch}
      onRefresh={refreshTopicDiscovery}
      onLaunch={(topicSignature) => {
        const topic = discoveryTopics.find((item) => item.topicSignature === topicSignature);
        if (topic) {
          startDiscoveredTopic(topic);
        }
      }}
      onFeedback={sendDiscoveryFeedback}
    />

    <div class="search-launcher" class:focused={topicInputFocused}>
      <textarea
        rows="2"
        class="search-input"
        placeholder="Or describe exactly what you want to learn..."
        value={viewState.topicDiscovery.input}
        disabled={hasPendingDashboardLaunch}
        oninput={onInput}
        onfocus={onTopicFocus}
        onblur={onTopicBlur}
      ></textarea>
      <div class="search-actions">
        <button
          type="button"
          class="btn btn-primary"
          aria-busy={viewState.topicDiscovery.shortlist.status === 'loading'}
          disabled={viewState.topicDiscovery.shortlist.status === 'loading' || hasPendingDashboardLaunch}
          onclick={runShortlist}
        >
          {viewState.topicDiscovery.shortlist.status === 'loading' ? 'Finding matches...' : "Let's go →"}
        </button>
        {#if viewState.topicDiscovery.shortlist.shortlist}
          <button type="button" class="btn btn-secondary" disabled={hasPendingDashboardLaunch} onclick={resetTopicDiscovery}>Start over</button>
        {/if}
      </div>
    </div>

    {#if viewState.topicDiscovery.shortlist.error}
      <p class="error-note" transition:fly={{ y: 6, duration: 160, easing: cubicOut }}>{viewState.topicDiscovery.shortlist.error}</p>
    {/if}

    {#if viewState.ui.lessonLaunchQuotaExceeded && viewState.backend.lastSyncError}
      <div class="error-note" transition:fly={{ y: 6, duration: 160, easing: cubicOut }}>
        <span>{viewState.backend.lastSyncError}</span>
        <button type="button" class="btn btn-secondary btn-compact" onclick={handleUpgradeCheckout}>
          Upgrade to continue
        </button>
        {#if checkoutError}
          <span>{checkoutError}</span>
        {/if}
      </div>
    {/if}

    {#if viewState.topicDiscovery.shortlist.shortlist}
      <div class="shortlist">
        <div class="shortlist-header">
          <h4>Found in: {viewState.topicDiscovery.shortlist.shortlist.matchedSection}</h4>
          <p>{viewState.profile.curriculum} · {viewState.profile.grade} · {selectedSubject?.name}</p>
        </div>
        <div class="topic-grid">
          {#each viewState.topicDiscovery.shortlist.shortlist.subtopics as topic, i}
            <button
              type="button"
              class="topic-tile"
              class:launching={pendingDashboardLaunch?.shortlistId === topic.id}
              disabled={hasPendingDashboardLaunch}
              aria-busy={pendingDashboardLaunch?.shortlistId === topic.id}
              onclick={() => startTopic(topic)}
            >
              <span class="topic-index">{String(i + 1).padStart(2, '0')}</span>
              <div class="topic-tile-body">
                <strong>{toSentenceCase(topic.title)}</strong>
                <p>
                  {pendingDashboardLaunch?.shortlistId === topic.id && pendingLaunchCopy
                    ? pendingLaunchCopy.headline
                    : topic.description}
                </p>
              </div>
              <span class="topic-tile-arrow" aria-hidden="true">
                {#if pendingDashboardLaunch?.shortlistId === topic.id}
                  <span class="path-tile-indicator">
                    <span class="busy-dot"></span>
                    <span class="busy-dot"></span>
                    <span class="busy-dot"></span>
                  </span>
                {:else}
                  →
                {/if}
              </span>
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
          <span class="stat-pill-value count-in" style="color: var(--color-xp);"
            use:countIn={{ value: summary.averageMastery, format: (n) => `${Math.round(n)}%` }}
          >{summary.averageMastery}%</span>
          <span class="stat-pill-label">mastery · {selectedSubject?.name ?? 'overall'}</span>
        </div>
      </div>
      {#if summary.completedLessons > 0}
        <div class="stat-pill">
          <span class="stat-pill-icon" aria-hidden="true">✅</span>
          <div class="stat-pill-text">
            <span class="stat-pill-value count-in"
              use:countIn={{ value: summary.completedLessons }}
            >{summary.completedLessons}</span>
            <span class="stat-pill-label">{summary.completedLessons === 1 ? 'lesson' : 'lessons'} done</span>
          </div>
        </div>
      {/if}
    </div>
  {/if}

</section>

{#if launchBriefingVisible && pendingDashboardLaunch && pendingLaunchCopy}
  <TopicLaunchBriefingCard
    family={pendingLaunchCopy.family}
    headline={pendingLaunchCopy.headline}
    topicTitle={toSentenceCase(pendingDashboardLaunch.topicTitle)}
    supportingLine={pendingLaunchCopy.supportingLine}
  />
{/if}

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

  .hero-quota {
    display: flex;
    justify-content: flex-start;
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

  .subject-card:disabled {
    cursor: wait;
    opacity: 0.62;
  }

  .subject-card:active {
    transform: translateY(0) scale(0.97);
    transition-duration: 80ms;
  }

  .subject-card:disabled:active {
    transform: none;
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

  @keyframes chip-enter {
    from { opacity: 0; transform: translateY(10px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
  }

  @keyframes skeleton-pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.9; }
  }

  .icon-block--blue   { background: var(--color-blue-dim); }
  .icon-block--green  { background: var(--color-green-dim); }
  .icon-block--purple { background: var(--color-purple-dim); }
  .icon-block--orange { background: var(--color-orange-dim); }
  .icon-block--red    { background: var(--color-red-dim); }
  .icon-block--yellow { background: var(--color-yellow-dim); }

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

  .search-input:disabled {
    cursor: wait;
    opacity: 0.72;
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
    box-shadow: var(--shadow-sm);
    transition:
      transform 200ms var(--ease-spring),
      box-shadow 200ms var(--ease-soft),
      border-color var(--motion-fast) var(--ease-soft);
  }

  .topic-tile:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
    border-color: var(--accent);
  }

  .topic-tile:disabled {
    cursor: wait;
  }

  .topic-tile:disabled:not(.launching) {
    opacity: 0.62;
    transform: none;
    box-shadow: var(--shadow-sm);
  }

  .topic-tile.launching {
    border-color: color-mix(in srgb, var(--accent) 48%, var(--border-strong));
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent), var(--shadow-md);
  }

  .topic-tile:active {
    transform: translateY(-1px) scale(0.99);
    box-shadow: var(--shadow-sm);
    transition: transform 80ms ease-in, box-shadow 80ms ease-in;
  }

  .topic-tile:disabled:active {
    transform: none;
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

  .topic-tile.launching .topic-tile-arrow {
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
    box-shadow: var(--shadow-sm);
    display: grid;
    gap: 0.45rem;
    transition:
      transform 200ms var(--ease-spring),
      box-shadow 200ms var(--ease-soft),
      border-color var(--motion-fast) var(--ease-soft);
  }

  .recent-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
    border-color: var(--accent);
  }

  .recent-card:active {
    transform: translateY(-1px) scale(0.99);
    box-shadow: var(--shadow-sm);
    transition: transform 80ms ease-in, box-shadow 80ms ease-in;
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
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
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
