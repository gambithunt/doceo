<script lang="ts">
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { renderSimpleMarkdown } from '$lib/markdown';
  import { deriveRevisionProgressModel, deriveRevisionTopicHistoryModel } from '$lib/revision/progress';
  import { deriveRevisionHomeModel } from '$lib/revision/ranking';
  import { appState } from '$lib/stores/app-state';
  import type { AppState, RevisionTopic } from '$lib/types';

  export let state: AppState;

  type RevisionSessionMode = 'quick_fire' | 'deep_revision' | 'shuffle' | 'teacher_mode';

  const revisionModes: Array<{
    mode: RevisionSessionMode;
    label: string;
    description: string;
  }> = [
    { mode: 'deep_revision', label: 'Deep revision', description: 'Best for finding the next gap and fixing it properly.' },
    { mode: 'quick_fire', label: 'Quick-fire', description: 'One short recall check when you only have a few minutes.' },
    { mode: 'shuffle', label: 'Shuffle', description: 'Mix recall, application, and transfer for stronger retention.' },
    { mode: 'teacher_mode', label: 'Teacher mode', description: 'Explain it back like you are teaching someone else.' }
  ];

  let recallDraft = '';
  let selfConfidence = 3;
  let plannerSubjectId = '';
  let plannerExamName = '';
  let plannerExamDate = '';
  let plannerMode: 'weak_topics' | 'full_subject' | 'manual' = 'weak_topics';
  let plannerTimeBudgetMinutes = 20;
  let plannerManualTopics = '';
  let plannerErrors: { examName?: string; examDate?: string } = {};

  $: homeModel = deriveRevisionHomeModel(state);
  $: progressModel = deriveRevisionProgressModel(state);
  $: availableSubjects = state.curriculum.subjects;
  $: selectedTopic =
    state.revisionTopics.find((topic) => topic.lessonSessionId === state.ui.activeLessonSessionId) ??
    homeModel.hero?.topic ??
    homeModel.doToday[0]?.topic ??
    state.revisionTopics[0] ??
    null;
  $: revisionSession =
    state.revisionSession ?? null;
  $: currentQuestion = revisionSession?.questions[revisionSession.questionIndex] ?? null;
  $: currentQuestionTopic =
    currentQuestion ? state.revisionTopics.find((topic) => topic.lessonSessionId === currentQuestion.revisionTopicId) ?? null : null;
  $: displayTopic = currentQuestionTopic ?? selectedTopic;
  $: topicHistory = displayTopic ? deriveRevisionTopicHistoryModel(state, displayTopic.lessonSessionId) : null;
  $: selectedRecommendation =
    homeModel.hero?.topic.lessonSessionId === displayTopic?.lessonSessionId
      ? homeModel.hero
      : homeModel.doToday.find((item) => item.topic.lessonSessionId === displayTopic?.lessonSessionId) ??
        homeModel.focusWeaknesses.find((item) => item.topic.lessonSessionId === displayTopic?.lessonSessionId) ??
        null;
  $: isSessionActive = revisionSession?.status === 'active';
  $: dueTodayCount = state.revisionTopics.filter((topic) => {
    const dueDate = new Date(topic.nextRevisionAt);
    const now = new Date();
    return dueDate.getTime() <= now.getTime();
  }).length;
  $: weakTopicCount = state.revisionTopics.filter((topic) => topic.confidenceScore < 0.55).length;
  $: calibrationGapCount = state.revisionTopics.filter((topic) => Math.abs(topic.calibration.confidenceGap) >= 0.22).length;
  $: fragileTopicCount = state.revisionTopics.filter((topic) => topic.retentionStability <= 0.5 || topic.forgettingVelocity >= 0.58).length;

  function seedPlannerFields(): void {
    plannerSubjectId = state.revisionPlan.subjectId || state.ui.selectedSubjectId || state.curriculum.subjects[0]?.id || '';
    plannerExamName = state.revisionPlan.examName ?? '';
    plannerExamDate = state.revisionPlan.examDate ?? '';
    plannerMode = state.revisionPlan.studyMode ?? 'weak_topics';
    plannerTimeBudgetMinutes = state.revisionPlan.timeBudgetMinutes ?? 20;
    plannerManualTopics = state.revisionPlan.studyMode === 'manual' ? state.revisionPlan.topics.join(', ') : '';
  }

  function formatDueLabel(dateValue: string): string {
    const dueDate = new Date(dateValue);
    const now = new Date();
    const dayMs = 86400000;
    const diff = Math.ceil((dueDate.getTime() - now.getTime()) / dayMs);

    if (diff <= 0) {
      return diff < 0 ? `Overdue by ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'}` : 'Due today';
    }

    if (diff === 1) {
      return 'Due tomorrow';
    }

    return `Due in ${diff} days`;
  }

  function openPlanner(): void {
    seedPlannerFields();
    appState.setRevisionPlannerOpen(true);
  }

  function closePlanner(): void {
    plannerErrors = {};
    appState.setRevisionPlannerOpen(false);
  }

  function getSessionContext(topic: RevisionTopic): {
    reason: string;
    source: 'do_today' | 'weakness' | 'exam_plan' | 'manual';
  } {
    const heroMatch = homeModel.hero?.topic.lessonSessionId === topic.lessonSessionId ? homeModel.hero : null;
    const weaknessMatch = homeModel.focusWeaknesses.find((item) => item.topic.lessonSessionId === topic.lessonSessionId) ?? null;
    const doTodayMatch = homeModel.doToday.find((item) => item.topic.lessonSessionId === topic.lessonSessionId) ?? null;

    if (heroMatch) {
      return {
        reason: heroMatch.reason,
        source: homeModel.nearestExam?.subjectId === topic.subjectId ? 'exam_plan' : 'do_today'
      };
    }

    if (weaknessMatch) {
      return {
        reason: weaknessMatch.reason,
        source: 'weakness'
      };
    }

    if (doTodayMatch) {
      return {
        reason: doTodayMatch.reason,
        source: homeModel.nearestExam?.subjectId === topic.subjectId ? 'exam_plan' : 'do_today'
      };
    }

    return {
      reason: 'Manual revision session',
      source: 'manual'
    };
  }

  function review(topic: RevisionTopic, mode: RevisionSessionMode = 'deep_revision'): void {
    const context = getSessionContext(topic);
    appState.runRevisionSession(topic, {
      mode,
      source: context.source,
      recommendationReason: context.reason
    });
    recallDraft = '';
    selfConfidence = 3;
  }

  function startRecommendedRevision(topic: RevisionTopic): void {
    review(topic, selectedRecommendation?.suggestedMode ?? 'deep_revision');
  }

  function startMixedSession(): void {
    const topicSet = homeModel.doToday.slice(0, 3).map((item) => item.topic);

    if (topicSet.length === 0) {
      return;
    }

    appState.runRevisionSession(topicSet[0]!, {
      mode: 'shuffle',
      source: homeModel.nearestExam ? 'exam_plan' : 'do_today',
      recommendationReason: 'Mixed shuffle across the top topics you should revise today.',
      topicSet
    });
    recallDraft = '';
    selfConfidence = 3;
  }

  function submitPlanner(): void {
    plannerErrors = {};
    if (!plannerExamName.trim()) plannerErrors.examName = 'Give your exam a name so you can track it.';
    if (!plannerExamDate) plannerErrors.examDate = 'Pick a date so Doceo can pace the plan.';
    if (plannerErrors.examName || plannerErrors.examDate || !plannerSubjectId) return;

    const manualTopics = plannerMode === 'manual'
      ? plannerManualTopics
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      : undefined;

    appState.createRevisionPlan({
      subjectId: plannerSubjectId,
      examName: plannerExamName.trim(),
      examDate: plannerExamDate,
      mode: plannerMode,
      manualTopics,
      timeBudgetMinutes: plannerTimeBudgetMinutes
    });
  }

  function submitRecall(): void {
    if (!selectedTopic || !currentQuestion || recallDraft.trim().length === 0) {
      return;
    }
    appState.submitRevisionAnswer(recallDraft.trim(), selfConfidence);
    recallDraft = '';
    selfConfidence = 3;
  }

  function feedbackMarkdown(): string | null {
    if (revisionSession?.currentHelp) {
      return [`**${revisionSession.currentHelp.type === 'nudge' ? 'Nudge' : 'Help'}**`, revisionSession.currentHelp.content].join('\n\n');
    }

    if (!revisionSession?.lastTurnResult) {
      return null;
    }

    const { diagnosis, intervention, sessionDecision, topicUpdate, nextQuestion, scores } = revisionSession.lastTurnResult;
    const calibrationNote =
      scores.calibrationGap >= 0.2
        ? 'You felt more sure than the answer showed. Slow down and test the explanation, not just the feeling.'
        : scores.calibrationGap <= -0.2
          ? 'The answer was stronger than your confidence suggested. Trust the structure you do know.'
          : 'Your confidence and answer quality were fairly well aligned here.';

    return [
      `**Diagnosis**`,
      diagnosis.summary,
      '',
      `**Calibration**`,
      calibrationNote,
      '',
      `**Next move**`,
      intervention.content || 'Keep going with the next question.',
      '',
      nextQuestion ? `**Up next**\n${nextQuestion.prompt}` : `**Session status**\n${sessionDecision === 'complete' ? 'This round is complete.' : 'This topic needs another pass soon.'}`,
      '',
      `**Next review**\n${new Date(topicUpdate.nextRevisionAt).toLocaleDateString()}`
    ].join('\n');
  }

  function getCalibrationTone(topic: RevisionTopic): 'overconfident' | 'underconfident' | 'aligned' {
    if (topic.calibration.confidenceGap >= 0.22 || topic.calibration.overconfidenceCount > topic.calibration.underconfidenceCount) {
      return 'overconfident';
    }

    if (topic.calibration.confidenceGap <= -0.22 || topic.calibration.underconfidenceCount > topic.calibration.overconfidenceCount) {
      return 'underconfident';
    }

    return 'aligned';
  }

  function getCalibrationHeading(topic: RevisionTopic): string {
    const tone = getCalibrationTone(topic);

    if (tone === 'overconfident') {
      return 'Confidence is running ahead of the answer';
    }

    if (tone === 'underconfident') {
      return 'You know more here than you think';
    }

    return 'Confidence is tracking reasonably well';
  }

  function getCalibrationSummary(topic: RevisionTopic): string {
    const tone = getCalibrationTone(topic);

    if (tone === 'overconfident') {
      return 'Use explanation and error-spotting questions here. This topic needs proof, not just recognition.';
    }

    if (tone === 'underconfident') {
      return 'Keep retrieving this topic. The answers are stronger than the self-rating suggests, so build confidence through repetition.';
    }

    return 'Keep the rhythm steady. This topic is not showing a major calibration mismatch right now.';
  }

  function getStrongestMisconceptionLabel(topic: RevisionTopic): string | null {
    const signal = topic.misconceptionSignals
      .slice()
      .sort((left, right) => right.count - left.count)[0];

    if (!signal || signal.count < 2) {
      return null;
    }

    return signal.tag.replace(/-/g, ' ');
  }

  function formatTrendLabel(trend: NonNullable<typeof topicHistory>['trend']): string {
    switch (trend) {
      case 'improving':
        return 'Improving';
      case 'slipping':
        return 'Slipping';
      case 'mixed':
        return 'Mixed';
      default:
        return 'Limited history';
    }
  }
</script>

<section class="workspace">
  <header class="section-header">
    <div>
      <p class="eyebrow">Revision</p>
      <h2>Recall first, then tighten the gaps</h2>
      <p>Do the most important work first, then let Doceo narrow the next gap.</p>
    </div>
    <div class="header-actions">
      <button type="button" class="secondary action-btn" onclick={openPlanner}>Build my plan</button>
      <button type="button" class="secondary action-btn" onclick={() => appState.generateRevisionPlan()}>
        Refresh plan
      </button>
    </div>
  </header>

  {#if state.ui.showRevisionPlanner}
    <section class="panel planner-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Build My Plan</p>
          <h3>Set the next exam and let Doceo shape the revision load</h3>
        </div>
        <button type="button" class="secondary action-btn" onclick={closePlanner}>Cancel</button>
      </div>

      <div class="planner-grid">
        <label class="field">
          <span>Subject</span>
          <select bind:value={plannerSubjectId}>
            {#each availableSubjects as subject}
              <option value={subject.id}>{subject.name}</option>
            {/each}
          </select>
        </label>

        <label class="field" class:field-error={plannerErrors.examName}>
          <span>Exam name</span>
          <input
            bind:value={plannerExamName}
            placeholder="Mid-term test"
            oninput={() => { if (plannerErrors.examName) plannerErrors = { ...plannerErrors, examName: undefined }; }}
          />
          {#if plannerErrors.examName}
            <span class="field-hint-error" transition:fly={{ y: 6, duration: 160, easing: cubicOut }}>{plannerErrors.examName}</span>
          {/if}
        </label>

        <label class="field" class:field-error={plannerErrors.examDate}>
          <span>Exam date</span>
          <input
            type="date"
            bind:value={plannerExamDate}
            oninput={() => { if (plannerErrors.examDate) plannerErrors = { ...plannerErrors, examDate: undefined }; }}
          />
          {#if plannerErrors.examDate}
            <span class="field-hint-error" transition:fly={{ y: 6, duration: 160, easing: cubicOut }}>{plannerErrors.examDate}</span>
          {/if}
        </label>

        <label class="field">
          <span>Plan style</span>
          <select bind:value={plannerMode}>
            <option value="weak_topics">Use my weak topics</option>
            <option value="full_subject">Use the full subject scope</option>
            <option value="manual">Choose topics myself</option>
          </select>
        </label>

        <label class="field">
          <span>Daily time</span>
          <select bind:value={plannerTimeBudgetMinutes}>
            <option value={10}>10 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={20}>20 minutes</option>
            <option value={30}>30 minutes</option>
          </select>
        </label>

        {#if plannerMode === 'manual'}
          <label class="field field-wide">
            <span>Topics</span>
            <input bind:value={plannerManualTopics} placeholder="Fractions, Area, Number patterns" />
          </label>
        {/if}
      </div>

      <div class="actions">
        <button type="button" class="action-btn" onclick={submitPlanner}>Generate plan</button>
      </div>
    </section>
  {/if}

  {#if homeModel.hero}
    <section class="hero-card">
      <div class="hero-copy">
        <p class="eyebrow">Revise This Now</p>
        <h3>{homeModel.hero.topic.topicTitle}</h3>
        <p>{homeModel.hero.summary}</p>
        <div class="hero-meta">
          <span class="hero-pill">{homeModel.hero.reason}</span>
          <span class="hero-pill subdued">{formatDueLabel(homeModel.hero.topic.nextRevisionAt)}</span>
          {#if homeModel.nearestExam}
            <span class="hero-pill subdued">
              Exam in {homeModel.nearestExam.daysUntilExam} day{homeModel.nearestExam.daysUntilExam === 1 ? '' : 's'}
            </span>
          {/if}
        </div>
      </div>

        <div class="hero-side">
          <div class="hero-stats">
          <article class="stat-card">
            <strong>{dueTodayCount}</strong>
            <span>Due now</span>
          </article>
          <article class="stat-card">
            <strong>{weakTopicCount}</strong>
            <span>Weak topics</span>
          </article>
          <article class="stat-card">
            <strong>{calibrationGapCount}</strong>
            <span>Calibration gaps</span>
          </article>
          <article class="stat-card">
            <strong>{fragileTopicCount}</strong>
            <span>Fragile topics</span>
          </article>
        </div>
        <div class="hero-actions">
          <button
            type="button"
            class="action-btn"
            onclick={() => review(homeModel.hero!.topic, homeModel.hero!.suggestedMode)}
          >
            {homeModel.hero.ctaLabel}
          </button>
          {#if homeModel.doToday.length > 1}
            <button type="button" class="secondary action-btn" onclick={startMixedSession}>
              Shuffle top topics
            </button>
          {/if}
          <button type="button" class="secondary action-btn" onclick={openPlanner}>Build my plan</button>
        </div>
      </div>
    </section>

    <div class="content-grid">
      <aside class="queue-stack">
        <section class="panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Memory Strength</p>
              <h3>Consistency is building recall</h3>
            </div>
            <small>{progressModel.memoryStrength}%</small>
          </div>
          <div class="strength-meter" aria-hidden="true">
            <div class="strength-fill" style={`width: ${progressModel.memoryStrength}%`}></div>
          </div>
          <p>Showing up matters here. This score blends topic confidence with recent revision consistency and coverage.</p>
          <div class="calibration-grid">
            <article class="mini-stat">
              <strong>{progressModel.consistencyDays}</strong>
              <span>Active days this week</span>
            </article>
            <article class="mini-stat">
              <strong>{progressModel.coveredTopicsCount}</strong>
              <span>Topics reviewed recently</span>
            </article>
          </div>
        </section>

        {#if progressModel.insights.length > 0}
          <section class="panel">
            <div class="panel-header">
              <div>
                <p class="eyebrow">Revision Signals</p>
                <h3>Patterns Doceo is watching</h3>
              </div>
              <small>{progressModel.insights.length} signals</small>
            </div>

            <div class="activity-list">
              {#each progressModel.insights as item}
                <article class:recovery={item.tone === 'recovery'} class="activity-item insight-item">
                  <div class="topic-row">
                    <strong>{item.title}</strong>
                    <span class="hero-pill subdued">{item.tone}</span>
                  </div>
                  <p>{item.summary}</p>
                </article>
              {/each}
            </div>
          </section>
        {/if}

        <section class="panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Weekly Activity</p>
              <h3>Revision across the last 7 days</h3>
            </div>
            <small>{progressModel.consistencyDays} active days</small>
          </div>

          <div class="weekly-strip" aria-hidden="true">
            {#each progressModel.weeklyActivity as day}
              <article class="day-column">
                <div class="day-bar-wrap">
                  <div
                    class:active={day.count > 0}
                    class="day-bar"
                    style={`height: ${Math.max(0.35, Math.min(1, day.count / 3)) * 4.2}rem`}
                  ></div>
                </div>
                <strong>{day.count}</strong>
                <span>{day.label}</span>
              </article>
            {/each}
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Revision Plan</p>
              <h3>{state.revisionPlan.examName ?? 'Current plan'}</h3>
            </div>
            <small>{state.revisionPlan.timeBudgetMinutes ?? 20} min/day</small>
          </div>
          <p>{state.revisionPlan.quickSummary}</p>
          <div class="hero-meta">
            <span class="hero-pill subdued">
              Exam {new Date(state.revisionPlan.examDate).toLocaleDateString()}
            </span>
            <span class="hero-pill subdued">
              {state.revisionPlan.topics.length} topics
            </span>
          </div>
        </section>

        {#if progressModel.recentActivity.length > 0}
          <section class="panel">
            <div class="panel-header">
              <div>
                <p class="eyebrow">Recent Activity</p>
                <h3>What changed most recently</h3>
              </div>
              <small>{progressModel.recentActivity.length} turns</small>
            </div>

            <div class="activity-list">
              {#each progressModel.recentActivity as item}
                <article class="activity-item">
                  <div class="topic-row">
                    <strong>{item.topicTitle}</strong>
                    <small>{new Date(item.createdAt).toLocaleDateString()}</small>
                  </div>
                  <span class="hero-pill subdued">{item.label}</span>
                  <p>{item.summary}</p>
                </article>
              {/each}
            </div>
          </section>
        {/if}

        <section class="panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Do Today</p>
              <h3>Best next revision moves</h3>
            </div>
            <small>{homeModel.doToday.length} topics</small>
          </div>

          <div class="queue-list">
            {#each homeModel.doToday as recommendation}
              <button
                type="button"
                class:selected={selectedTopic?.lessonSessionId === recommendation.topic.lessonSessionId}
                class="topic-button"
                onclick={() => review(recommendation.topic)}
              >
                <div class="topic-row">
                  <strong>{recommendation.topic.topicTitle}</strong>
                  <small>{formatDueLabel(recommendation.topic.nextRevisionAt)}</small>
                </div>
                <span>{recommendation.topic.subject}</span>
                <span class="topic-meta">{recommendation.suggestedModeReason}</span>
                <p>{recommendation.reason}</p>
              </button>
            {/each}
          </div>
        </section>

        {#if homeModel.focusWeaknesses.length > 0}
          <section class="panel">
            <div class="panel-header">
              <div>
                <p class="eyebrow">Focus Weaknesses</p>
                <h3>Topics that still feel unstable</h3>
              </div>
              <small>{homeModel.focusWeaknesses.length} topics</small>
            </div>

            <div class="queue-list compact">
              {#each homeModel.focusWeaknesses as recommendation}
                <button
                  type="button"
                  class:selected={selectedTopic?.lessonSessionId === recommendation.topic.lessonSessionId}
                  class="topic-button weakness"
                  onclick={() => review(recommendation.topic)}
                >
                  <div class="topic-row">
                    <strong>{recommendation.topic.topicTitle}</strong>
                    <small>{Math.round(recommendation.topic.confidenceScore * 100)}%</small>
                  </div>
                  <span class="topic-meta">{recommendation.suggestedModeReason}</span>
                  <p>{recommendation.reason}</p>
                </button>
              {/each}
            </div>
          </section>
        {/if}
      </aside>

      <section class="panel recall-panel">
        {#if selectedTopic}
          <div class="panel-header">
            <div>
              <p class="eyebrow">{revisionSession ? 'Revision Session' : 'Recall Prompt'}</p>
              <h3>{displayTopic?.topicTitle ?? selectedTopic.topicTitle}</h3>
              {#if currentQuestionTopic && selectedTopic && currentQuestionTopic.lessonSessionId !== selectedTopic.lessonSessionId}
                <p class="session-topic-note">Current question from {currentQuestionTopic.topicTitle}</p>
              {/if}
              {#if selectedRecommendation}
                <p class="session-topic-note">Best mode: {selectedRecommendation.suggestedMode.replace('_', ' ')}. {selectedRecommendation.suggestedModeReason}</p>
              {/if}
            </div>
            <small>{formatDueLabel((displayTopic ?? selectedTopic).nextRevisionAt)}</small>
          </div>

          {#if revisionSession}
            <div class="session-meta">
              <span class="hero-pill">{revisionSession.mode.replace('_', ' ')}</span>
              <span class="hero-pill subdued">{revisionSession.recommendationReason}</span>
              {#if revisionSession.mode === 'shuffle' && revisionSession.revisionTopicIds.length > 1}
                <span class="hero-pill subdued">{revisionSession.revisionTopicIds.length} topics mixed</span>
              {/if}
              {#if revisionSession.status === 'completed'}
                <span class="hero-pill subdued">Round complete</span>
              {:else if revisionSession.status === 'escalated_to_lesson'}
                <span class="hero-pill subdued">Lesson handoff</span>
              {/if}
            </div>
          {/if}

          {#if isSessionActive && currentQuestion}
            <div class="question-card">
              <p class="question-type">{currentQuestion.questionType.replace('_', ' ')}</p>
              <p>{currentQuestion.prompt}</p>
            </div>
            <textarea
              bind:value={recallDraft}
              rows="8"
              placeholder={`Answer the ${currentQuestion.questionType.replace('_', ' ')} prompt for ${(displayTopic ?? selectedTopic).topicTitle}`}
            ></textarea>
            <label class="field">
              <span>How confident do you feel?</span>
              <select bind:value={selfConfidence}>
                <option value={1}>1 · Not at all</option>
                <option value={2}>2 · A bit shaky</option>
                <option value={3}>3 · Mixed</option>
                <option value={4}>4 · Mostly sure</option>
                <option value={5}>5 · Very sure</option>
              </select>
            </label>
            <div class="actions">
              <button type="button" class="action-btn" onclick={submitRecall}>Check answer</button>
              <button type="button" class="secondary action-btn" onclick={() => appState.requestRevisionNudge()}>
                Nudge
              </button>
              <button type="button" class="secondary action-btn" onclick={() => appState.requestRevisionHint()}>
                Hint
              </button>
              <button type="button" class="secondary action-btn" onclick={() => appState.markRevisionStuck()}>
                I'm stuck
              </button>
            </div>
          {:else}
            <div class="starter-card">
              <p>
                {#if revisionSession?.status === 'completed'}
                  This round is complete. Start another pass or switch mode to challenge the topic differently.
                {:else if revisionSession?.status === 'escalated_to_lesson'}
                  Revision has found a real gap here. Step back into lesson mode for a short reteach, then come back.
                {:else}
                  Start a structured revision loop for this topic. Deep revision is the default; the other modes are lighter or more demanding.
                {/if}
              </p>

              <div class="starter-actions">
                {#if revisionSession?.status === 'escalated_to_lesson'}
                  <button
                    type="button"
                    class="action-btn"
                    onclick={() => appState.startRevisionLessonHandoff()}
                  >
                    Start focused reteach
                  </button>
                  <button type="button" class="secondary action-btn" onclick={() => review(selectedTopic, 'deep_revision')}>
                    Try revision again
                  </button>
                {:else}
                  <button type="button" class="action-btn" onclick={() => startRecommendedRevision(selectedTopic)}>
                    {selectedRecommendation?.suggestedMode === 'teacher_mode'
                      ? 'Start teacher mode'
                      : selectedRecommendation?.suggestedMode === 'quick_fire'
                        ? 'Start quick-fire'
                        : 'Start deep revision'}
                  </button>
                  <button type="button" class="secondary action-btn" onclick={() => review(selectedTopic, 'quick_fire')}>
                    Quick-fire
                  </button>
                  <button type="button" class="secondary action-btn" onclick={() => review(selectedTopic, 'shuffle')}>
                    Shuffle
                  </button>
                  <button type="button" class="secondary action-btn" onclick={() => review(selectedTopic, 'teacher_mode')}>
                    Teacher mode
                  </button>
                {/if}
              </div>

              <div class="mode-list">
                {#each revisionModes as option}
                  <article class="mode-card">
                    <strong>{option.label}</strong>
                    <p>{option.description}</p>
                  </article>
                {/each}
              </div>
            </div>
          {/if}

          {#if feedbackMarkdown()}
            <article class="feedback-card">
              {@html renderSimpleMarkdown(feedbackMarkdown()!)}
            </article>
          {/if}

          {#if displayTopic}
            <article class="feedback-card calibration-card">
              <div class="panel-header">
                <div>
                  <p class="eyebrow">Calibration</p>
                  <h3>{getCalibrationHeading(displayTopic)}</h3>
                </div>
                <span class="hero-pill subdued">{Math.round(displayTopic.calibration.averageCorrectness * 100)}% accuracy</span>
              </div>
              <p>{getCalibrationSummary(displayTopic)}</p>
              <div class="calibration-grid">
                <article class="mini-stat">
                  <strong>{displayTopic.calibration.averageSelfConfidence.toFixed(1)}</strong>
                  <span>Avg confidence / 5</span>
                </article>
                <article class="mini-stat">
                  <strong>{Math.round(displayTopic.calibration.averageCorrectness * 100)}%</strong>
                  <span>Avg performance</span>
                </article>
                <article class="mini-stat">
                  <strong>{displayTopic.calibration.overconfidenceCount}</strong>
                  <span>Overconfident turns</span>
                </article>
                <article class="mini-stat">
                  <strong>{displayTopic.calibration.underconfidenceCount}</strong>
                  <span>Underconfident turns</span>
                </article>
                <article class="mini-stat">
                  <strong>{Math.round(displayTopic.retentionStability * 100)}%</strong>
                  <span>Retention stability</span>
                </article>
                <article class="mini-stat">
                  <strong>{Math.round(displayTopic.forgettingVelocity * 100)}%</strong>
                  <span>Forgetting velocity</span>
                </article>
                {#if getStrongestMisconceptionLabel(displayTopic)}
                  <article class="mini-stat wide-stat">
                    <strong>{getStrongestMisconceptionLabel(displayTopic)}</strong>
                    <span>Strongest repeated gap</span>
                  </article>
                {/if}
              </div>
            </article>
          {/if}

          {#if topicHistory}
            <article class="feedback-card">
              <div class="panel-header">
                <div>
                  <p class="eyebrow">Topic History</p>
                  <h3>{topicHistory.topicTitle}</h3>
                </div>
                <span class="hero-pill subdued">{formatTrendLabel(topicHistory.trend)}</span>
              </div>
              <p>Dominant issue: {topicHistory.dominantIssue}.</p>
              <div class="activity-list">
                {#each topicHistory.entries as entry}
                  <article class="activity-item">
                    <div class="topic-row">
                      <strong>{entry.label}</strong>
                      <small>{new Date(entry.createdAt).toLocaleDateString()}</small>
                    </div>
                    <div class="hero-meta">
                      <span class="hero-pill subdued">{Math.round(entry.correctness * 100)}% correct</span>
                      <span class="hero-pill subdued">Confidence {entry.selfConfidence}/5</span>
                    </div>
                    <p>{entry.summary}</p>
                  </article>
                {/each}
              </div>
            </article>
          {/if}
        {:else}
          <div class="empty-state">
            <p class="eyebrow">No Revision Topics Yet</p>
            <h3>Complete a lesson to start your revision queue</h3>
            <p>Once you finish a lesson, Doceo can rank what needs another pass and bring it back at the right time.</p>
            <button type="button" class="action-btn" onclick={() => appState.generateRevisionPlan()}>
              Refresh this plan
            </button>
          </div>
        {/if}
      </section>
    </div>
  {:else}
    <section class="panel empty-state">
      <p class="eyebrow">Revision</p>
      <h3>Your queue is still empty</h3>
      <p>Complete a lesson first, then come back here for ranked revision recommendations and recall practice.</p>
      <button type="button" class="action-btn" onclick={openPlanner}>
        Build my plan
      </button>
    </section>
  {/if}
</section>

<style>
  .workspace,
  .queue-stack,
  .queue-list,
  .recall-panel,
  .empty-state {
    display: grid;
    gap: 1rem;
  }

  @keyframes section-enter {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .workspace > .section-header {
    animation: section-enter 0.35s var(--ease-soft) both;
  }
  .workspace > .hero-card {
    animation: section-enter 0.35s var(--ease-soft) both;
    animation-delay: 0.06s;
  }
  .workspace > .content-grid {
    animation: section-enter 0.35s var(--ease-soft) both;
    animation-delay: 0.12s;
  }

  .section-header,
  .hero-card,
  .panel-header,
  .topic-row,
  .hero-meta,
  .hero-stats,
  .actions,
  .session-meta,
  .starter-actions {
    display: flex;
    gap: 0.75rem;
  }

  .header-actions,
  .hero-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .content-grid {
    display: grid;
    grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
    gap: 1rem;
  }

  .section-header,
  .panel-header,
  .topic-row {
    justify-content: space-between;
    align-items: start;
  }

  .hero-card {
    justify-content: space-between;
    align-items: stretch;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-xl);
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--accent-dim) 70%, var(--surface-strong)), var(--surface));
    box-shadow: var(--shadow-strong);
    padding: 1.35rem;
  }

  .hero-copy,
  .hero-side,
  .panel,
  .feedback-card,
  .stat-card,
  .planner-panel,
  .starter-card,
  .mode-list,
  .calibration-grid,
  .activity-list,
  .weekly-strip {
    display: grid;
    gap: 0.8rem;
  }

  .hero-copy {
    max-width: 42rem;
  }

  .hero-side {
    min-width: 13rem;
    align-content: space-between;
    justify-items: end;
  }

  .hero-stats {
    flex-wrap: wrap;
    justify-content: end;
  }

  .stat-card {
    min-width: 6.2rem;
    padding: 0.85rem 1rem;
    border-radius: 1rem;
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--surface-strong) 78%, transparent);
  }

  .stat-card strong {
    font-size: 1.35rem;
  }

  .hero-pill {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 0.42rem 0.75rem;
    background: color-mix(in srgb, var(--accent) 16%, var(--surface));
    color: var(--text);
    border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--border));
    font-size: 0.8rem;
  }

  .hero-pill.subdued {
    background: var(--surface-soft);
    border-color: var(--border);
    color: var(--text-soft);
  }

  .panel,
  .feedback-card {
    border: 1px solid var(--border);
    border-radius: 1.5rem;
    background: var(--surface);
    padding: 1.2rem;
  }

  .question-card {
    display: grid;
    gap: 0.45rem;
    padding: 0.95rem 1rem;
    border-radius: 1rem;
    border: 1px solid var(--border);
    background: var(--surface-soft);
  }

  .question-type {
    font-size: 0.76rem;
    letter-spacing: 0.04em;
    color: var(--muted);
  }

  .planner-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.9rem;
  }

  .session-meta,
  .starter-actions {
    flex-wrap: wrap;
  }

  .strength-meter {
    overflow: hidden;
    height: 0.7rem;
    border-radius: 999px;
    background: var(--surface-soft);
    border: 1px solid var(--border);
  }

  .strength-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 62%, white));
  }

  .mode-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mode-card {
    display: grid;
    gap: 0.35rem;
    padding: 0.85rem 0.95rem;
    border-radius: 1rem;
    border: 1px solid var(--border);
    background: var(--surface-soft);
  }

  .mode-card p {
    color: var(--text-soft);
  }

  .calibration-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mini-stat {
    display: grid;
    gap: 0.3rem;
    padding: 0.8rem 0.9rem;
    border-radius: 1rem;
    border: 1px solid var(--border);
    background: var(--surface-soft);
  }

  .mini-stat span {
    color: var(--text-soft);
    font-size: 0.8rem;
  }

  .wide-stat {
    grid-column: 1 / -1;
  }

  .activity-item {
    display: grid;
    gap: 0.45rem;
    padding: 0.85rem 0.95rem;
    border-radius: 1rem;
    border: 1px solid var(--border);
    background: var(--surface-soft);
  }

  .insight-item.recovery {
    background: color-mix(in srgb, var(--accent) 10%, var(--surface-soft));
  }

  .weekly-strip {
    grid-template-columns: repeat(7, minmax(0, 1fr));
    align-items: end;
  }

  .day-column {
    display: grid;
    gap: 0.45rem;
    justify-items: center;
  }

  .day-bar-wrap {
    display: flex;
    align-items: end;
    justify-content: center;
    width: 100%;
    min-height: 4.6rem;
    padding: 0.35rem 0;
    border-radius: 1rem;
    background: var(--surface-soft);
    border: 1px solid var(--border);
  }

  .day-bar {
    width: 0.95rem;
    min-height: 1rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-strong) 75%, var(--surface));
  }

  .day-bar.active {
    background: linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 65%, white));
  }

  .field {
    display: grid;
    gap: 0.4rem;
  }

  .field-wide {
    grid-column: 1 / -1;
  }

  .field span {
    font-size: 0.8rem;
    color: var(--text-soft);
  }

  .field input,
  .field select {
    transition:
      border-color 150ms var(--ease-soft),
      box-shadow 150ms var(--ease-soft);
  }

  .field-error input,
  .field-error select {
    border-color: var(--color-red, #f87171);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-red, #f87171) 18%, transparent);
    animation: field-shake 0.3s var(--ease-soft) both;
  }

  @keyframes field-shake {
    0%   { transform: translateX(0); }
    20%  { transform: translateX(-5px); }
    45%  { transform: translateX(4px); }
    65%  { transform: translateX(-3px); }
    80%  { transform: translateX(2px); }
    100% { transform: translateX(0); }
  }

  .field-hint-error {
    display: block;
    font-size: 0.76rem;
    color: var(--color-red, #f87171);
    margin-top: -0.1rem;
  }

  .session-topic-note {
    color: var(--text-soft);
    font-size: 0.82rem;
  }

  .field input,
  .field select {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 0.95rem;
    background: var(--surface-soft);
    color: var(--text);
    padding: 0.85rem 0.95rem;
    font: inherit;
  }

  .queue-list.compact {
    gap: 0.7rem;
  }

  .topic-button {
    display: grid;
    gap: 0.45rem;
    border: 1px solid var(--border);
    border-radius: 1rem;
    background: var(--surface-soft);
    padding: 0.95rem 1rem;
    text-align: left;
    font: inherit;
    cursor: pointer;
  }

  .topic-button.weakness {
    background: color-mix(in srgb, var(--color-orange-dim) 48%, var(--surface-soft));
  }

  .topic-button.selected {
    border-color: color-mix(in srgb, var(--accent) 48%, transparent);
    background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  }

  .topic-button p,
  .empty-state p {
    color: var(--text-soft);
  }

  .topic-meta {
    color: var(--text-soft);
    font-size: 0.8rem;
  }

  textarea {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 1rem;
    background: var(--surface-soft);
    color: var(--text);
    padding: 0.9rem 1rem;
    font: inherit;
  }

  .action-btn {
    justify-self: start;
    border: 0;
    border-radius: 999px;
    background: var(--accent);
    color: var(--accent-contrast);
    padding: 0.8rem 1.15rem;
    font: inherit;
    cursor: pointer;
  }

  .secondary {
    background: var(--surface-soft);
    color: var(--text);
    border: 1px solid var(--border);
  }

  .feedback-card :global(p),
  .feedback-card :global(ul),
  .feedback-card :global(li) {
    margin: 0;
  }

  .feedback-card :global(ul) {
    padding-left: 1.1rem;
  }

  h2,
  h3,
  p,
  strong,
  span,
  small {
    margin: 0;
  }

  .eyebrow {
    color: var(--muted);
    letter-spacing: 0.04em;
    font-size: 0.72rem;
  }

  @media (max-width: 980px) {
    .content-grid,
    .hero-card {
      grid-template-columns: 1fr;
    }

    .hero-card {
      display: grid;
    }

    .hero-side {
      justify-items: start;
    }

    .hero-stats {
      justify-content: start;
    }
  }

  @media (max-width: 720px) {
    .content-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 540px) {
    .workspace {
      gap: 0.85rem;
    }

    .section-header,
    .hero-meta,
    .actions,
    .header-actions,
    .hero-actions {
      flex-direction: column;
      align-items: flex-start;
    }

    .planner-grid {
      grid-template-columns: 1fr;
    }

    .mode-list {
      grid-template-columns: 1fr;
    }

    .calibration-grid {
      grid-template-columns: 1fr;
    }

    .wide-stat {
      grid-column: auto;
    }

    .weekly-strip {
      grid-template-columns: repeat(7, minmax(2.25rem, 1fr));
      overflow-x: auto;
    }

    .hero-card,
    .panel,
    .feedback-card {
      padding: 1rem;
      border-radius: 1.1rem;
    }

    .queue-list {
      grid-auto-flow: column;
      grid-template-columns: unset;
      grid-auto-columns: min(15rem, 78vw);
      overflow-x: auto;
      scrollbar-width: none;
    }

    .queue-list::-webkit-scrollbar {
      display: none;
    }

    textarea {
      font-size: 16px;
    }

    .action-btn {
      min-height: var(--touch-target);
    }
  }
</style>
