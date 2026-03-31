<svelte:options runes={false} />

<script lang="ts">
  import { browser } from '$app/environment';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { getAuthenticatedHeaders } from '$lib/authenticated-fetch';
  import {
    buildDeterministicSubjectHints,
    resolveSubjectHints
  } from '$lib/ai/subject-hints';
  import { buildFallbackTopicShortlist } from '$lib/ai/topic-shortlist';
  import { extractHintChipLabels } from '$lib/components/dashboard-hints';
  import { formatSavedPlansCount, getRevisionPlansHeader } from '$lib/components/revision-plans';
  import { getRevisionPlanRemovalContent } from '$lib/components/revision-plan-removal';
  import LoadingDots from '$lib/components/LoadingDots.svelte';
  import { renderSimpleMarkdown } from '$lib/markdown';
  import { openDateInputPicker, shouldClosePlannerOnKey } from '$lib/components/revision-planner';
  import {
    appendManualTopic,
    parseManualTopicDraft,
    resolveMatchedManualTopics
  } from '$lib/revision/manual-topics';
  import { deriveRevisionFocusModel, type RevisionFocusTab } from '$lib/revision/focus';
  import { deriveRevisionProgressModel, deriveRevisionTopicHistoryModel } from '$lib/revision/progress';
  import { deriveRevisionWorkspaceMode } from '$lib/revision/workspace';
  import {
    buildPlanTopicSet,
    describePlanStyle,
    formatPlanDailyLabel,
    formatPlanStyleLabel,
    formatPlanTiming,
    inferQuestionCount,
    inferSessionMode,
    pickPlanStartTopic,
    sortRevisionPlans
  } from '$lib/revision/plans';
  import { deriveRevisionHomeModel } from '$lib/revision/ranking';
  import { appState } from '$lib/stores/app-state';
  import type { AppState, RevisionQuestionFeedback, RevisionTopic, SchoolTerm, ShortlistedTopic } from '$lib/types';

  export let state: AppState;

  type RevisionSessionMode = 'quick_fire' | 'deep_revision' | 'shuffle' | 'teacher_mode';
  type RevisionOutlookStatTone = 'teal' | 'yellow' | 'purple' | 'blue' | 'green';

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
  let feedbackDifficulty: RevisionQuestionFeedback['difficulty'] | '' = '';
  let feedbackClarity: RevisionQuestionFeedback['clarity'] | '' = '';
  let feedbackSubmittedForQuestionId = '';
  let plannerSubjectId = '';
  let plannerExamName = '';
  let plannerExamDate = '';
  let plannerMode: 'weak_topics' | 'full_subject' | 'manual' = 'weak_topics';
  let plannerTimeBudgetMinutes = 20;
  let plannerManualTopics = '';
  let plannerSelectedTopics: string[] = [];
  let plannerTopicHintsText = '';
  let plannerTopicHintsLoading = false;
  let plannerTopicHintsError = '';
  let plannerTopicMatches: ShortlistedTopic[] = [];
  let plannerTopicMatchStatus: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
  let plannerTopicMatchError = '';
  let latestPlannerHintRequest = 0;
  let plannerHintSeed = '';
  let lastPlannerAssistSubjectId = '';
  let activeFocusTab: RevisionFocusTab | null = null;
  let cachedHeaders: Record<string, string> | null = null;
  let plannerErrors: { examName?: string; examDate?: string; manualTopics?: string } = {};
  let plannerDateInput: HTMLInputElement | null = null;
  let pendingPlanRemoval: { id: string; name: string } | null = null;

  $: homeModel = deriveRevisionHomeModel(state);
  $: focusModel = deriveRevisionFocusModel(state, homeModel, activeRevisionPlan);
  $: progressModel = deriveRevisionProgressModel(state);
  $: availableSubjects = state.curriculum.subjects;
  $: plannerAvailableSubjects = (state.onboarding.options?.subjects ?? []).filter(
    (s) => state.onboarding.selectedSubjectIds.includes(s.id)
  ).length > 0
    ? (state.onboarding.options?.subjects ?? []).filter((s) => state.onboarding.selectedSubjectIds.includes(s.id))
    : state.curriculum.subjects;
  $: selectedPlannerSubject = plannerAvailableSubjects.find((subject) => subject.id === plannerSubjectId) ?? plannerAvailableSubjects[0];
  $: selectedPlannerCurriculumSubject = selectedPlannerSubject
    ? (state.curriculum.subjects.find((s) => s.name === selectedPlannerSubject!.name) ?? { id: selectedPlannerSubject.id, name: selectedPlannerSubject.name, topics: [] })
    : null;
  $: plannerHintChips = extractHintChipLabels(plannerTopicHintsText).map((label, index) => ({
    id: `${selectedPlannerSubject?.id ?? 'subject'}:${index}:${label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    label
  }));
  const revisionPlansHeader = getRevisionPlansHeader();
  $: planRemovalContent = getRevisionPlanRemovalContent(pendingPlanRemoval?.name);
  $: sortedRevisionPlans = sortRevisionPlans(state.revisionPlans);
  $: activeRevisionPlan =
    state.revisionPlans.find((plan) => plan.id === state.activeRevisionPlanId) ??
    sortedRevisionPlans[0] ??
    null;
  $: selectedTopic =
    state.revisionTopics.find((topic) => topic.lessonSessionId === state.ui.activeLessonSessionId) ??
    homeModel.hero?.topic ??
    homeModel.doToday[0]?.topic ??
    state.revisionTopics[0] ??
    null;
  $: revisionSession =
    state.revisionSession ?? null;
  $: revisionWorkspaceMode = deriveRevisionWorkspaceMode(revisionSession);
  $: currentQuestion = revisionSession?.questions[revisionSession.questionIndex] ?? null;
  $: currentQuestionTopic =
    currentQuestion ? state.revisionTopics.find((topic) => topic.lessonSessionId === currentQuestion.revisionTopicId) ?? null : null;
  $: displayTopic = currentQuestionTopic ?? selectedTopic;
  $: sessionRootTopic =
    (revisionSession
      ? state.revisionTopics.find((topic) => topic.lessonSessionId === revisionSession.revisionTopicId) ?? null
      : null) ?? displayTopic;
  $: topicHistory = displayTopic ? deriveRevisionTopicHistoryModel(state, displayTopic.lessonSessionId) : null;
  $: selectedRecommendation =
    homeModel.hero?.topic.lessonSessionId === displayTopic?.lessonSessionId
      ? homeModel.hero
      : homeModel.doToday.find((item) => item.topic.lessonSessionId === displayTopic?.lessonSessionId) ??
        homeModel.focusWeaknesses.find((item) => item.topic.lessonSessionId === displayTopic?.lessonSessionId) ??
        null;
  $: if (activeFocusTab === null) {
    activeFocusTab = focusModel.defaultTab;
  }
  $: activeFocusPanel = focusModel.panels[activeFocusTab ?? focusModel.defaultTab];
  $: isSessionActive = revisionSession?.status === 'active';
  $: sessionProgressCurrent =
    revisionSession && revisionSession.questions.length > 0
      ? Math.min(revisionSession.questionIndex + 1, revisionSession.questions.length)
      : 0;
  $: sessionProgressTotal = revisionSession?.questions.length ?? 0;
  $: nextRevisionRecommendation = revisionSession
    ? homeModel.doToday.find((item) => !revisionSession.revisionTopicIds.includes(item.topic.lessonSessionId)) ??
      homeModel.focusWeaknesses.find((item) => !revisionSession.revisionTopicIds.includes(item.topic.lessonSessionId)) ??
      null
    : null;
  $: dueTodayCount = state.revisionTopics.filter((topic) => {
    const dueDate = new Date(topic.nextRevisionAt);
    const now = new Date();
    return dueDate.getTime() <= now.getTime();
  }).length;
  $: weakTopicCount = state.revisionTopics.filter((topic) => topic.confidenceScore < 0.55).length;
  $: calibrationGapCount = state.revisionTopics.filter((topic) => Math.abs(topic.calibration.confidenceGap) >= 0.22).length;
  $: fragileTopicCount = state.revisionTopics.filter((topic) => topic.retentionStability <= 0.5 || topic.forgettingVelocity >= 0.58).length;
  $: hasSessionFocus = Boolean(revisionSession);
  $: sessionSubjectSlug = getSubjectSlug(sessionRootTopic?.subject ?? displayTopic?.subject);
  $: upcomingExamInfo = getUpcomingExamInfo();
  $: outlookPlans = sortedRevisionPlans.slice(0, 4);
  $: outlookStats = buildRevisionOutlookStats();

  function seedPlannerFields(): void {
    plannerSubjectId = state.ui.selectedSubjectId || plannerAvailableSubjects[0]?.id || '';
    plannerExamName = '';
    plannerExamDate = state.revisionPlan.examDate ?? '';
    plannerMode = state.revisionPlan.planStyle ?? state.revisionPlan.studyMode ?? 'weak_topics';
    plannerTimeBudgetMinutes = state.revisionPlan.timeBudgetMinutes ?? 20;
    plannerManualTopics =
      (state.revisionPlan.planStyle ?? state.revisionPlan.studyMode) === 'manual'
        ? state.revisionPlan.topics.join(', ')
        : '';
    plannerSelectedTopics =
      (state.revisionPlan.planStyle ?? state.revisionPlan.studyMode) === 'manual'
        ? [...state.revisionPlan.topics]
        : [];
    plannerTopicMatches = [];
    plannerTopicMatchStatus = 'idle';
    plannerTopicHintsError = '';
    plannerTopicMatchError = '';
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

  function formatRevisionLessonLabel(topic: RevisionTopic | null): string | null {
    if (!topic) {
      return null;
    }

    const lessonSession = state.lessonSessions.find((session) => session.id === topic.lessonSessionId);

    if (!lessonSession) {
      return null;
    }

    const lastActive = new Date(lessonSession.lastActiveAt);

    if (Number.isNaN(lastActive.getTime())) {
      return `From your ${lessonSession.subject} lesson`;
    }

    return `From your ${lessonSession.subject} lesson on ${lastActive.toLocaleDateString()}`;
  }

  function formatRecommendationSummary(): string {
    if (!homeModel.hero) {
      return '';
    }

    const reason = homeModel.hero.reason.trim().replace(/\.$/, '');
    const loweredReason = reason.charAt(0).toLowerCase() + reason.slice(1);

    if (/^(you|this)\b/i.test(reason)) {
      return `Doceo recommends this topic next because ${loweredReason}.`;
    }

    return `Doceo recommends this topic next because it is ${loweredReason}.`;
  }

  function getRecommendationContextItems(): string[] {
    if (!homeModel.hero) {
      return [];
    }

    const items: string[] = [];
    const lessonSession = state.lessonSessions.find((session) => session.id === homeModel.hero?.topic.lessonSessionId);

    if (lessonSession?.subject) {
      items.push(`From ${lessonSession.subject}`);
    }

    if (activeRevisionPlan?.examName) {
      items.push(`Linked to ${activeRevisionPlan.examName}`);
      items.push(formatPlanTiming(activeRevisionPlan.examDate));
    }

    return items;
  }

  function getUpcomingExamInfo(): { examName: string; subjectName: string; daysLabel: string } | null {
    if (activeRevisionPlan) {
      const timing = formatPlanTiming(activeRevisionPlan.examDate).replace(/^Exam\s+/i, '');
      return {
        examName: activeRevisionPlan.examName || 'Upcoming exam',
        subjectName: activeRevisionPlan.subjectName,
        daysLabel: timing
      };
    }

    if (homeModel.nearestExam) {
      const subjectName =
        availableSubjects.find((item) => item.id === homeModel.nearestExam?.subjectId)?.name ?? 'Subject';

      return {
        examName: 'Upcoming exam',
        subjectName,
        daysLabel: `${homeModel.nearestExam.daysUntilExam} day${homeModel.nearestExam.daysUntilExam === 1 ? '' : 's'}`
      };
    }

    return null;
  }

  function getUpcomingExamDays(): number | null {
    if (activeRevisionPlan) {
      const examDate = new Date(activeRevisionPlan.examDate);

      if (!Number.isNaN(examDate.getTime())) {
        return Math.max(0, Math.round((examDate.getTime() - Date.now()) / 86400000));
      }
    }

    if (homeModel.nearestExam) {
      return homeModel.nearestExam.daysUntilExam;
    }

    return null;
  }

  function getRevisionOutlookMessage(): string {
    const daysUntilExam = getUpcomingExamDays();

    if (daysUntilExam === null) {
      return 'Set an exam target and Doceo will turn this into a clearer revision runway.';
    }

    if (daysUntilExam <= 7) {
      return 'This one is close now. Keep the plan tight and rescue the weak spots first.';
    }

    if (daysUntilExam <= 21) {
      return 'This exam is moving into focus. Keep the rhythm steady so the pressure stays manageable.';
    }

    return 'There is still runway here. Start early and let the strong recall sessions compound before the pressure hits.';
  }

  function buildRevisionOutlookStats(): Array<{ label: string; value: string; tone: RevisionOutlookStatTone }> {
    const stats: Array<{ label: string; value: string; tone: RevisionOutlookStatTone }> = [];

    if (dueTodayCount > 0) {
      stats.push({ label: 'Ready today', value: String(dueTodayCount), tone: 'yellow' });
    }

    if (weakTopicCount > 0) {
      stats.push({ label: 'Needs rescue', value: String(weakTopicCount), tone: 'teal' });
    }

    if (calibrationGapCount > 0) {
      stats.push({ label: 'Confidence drift', value: String(calibrationGapCount), tone: 'purple' });
    }

    if (fragileTopicCount > 0) {
      stats.push({ label: 'Fragile memory', value: String(fragileTopicCount), tone: 'blue' });
    }

    if (stats.length === 0) {
      stats.push({ label: 'Revision state', value: 'Calm and ready', tone: 'green' });
    }

    return stats;
  }

  function selectFocusTab(tab: RevisionFocusTab): void {
    activeFocusTab = tab;
  }

  function getFocusItemSummary(tab: RevisionFocusTab, item: (typeof activeFocusPanel.items)[number]): string {
    if (tab === 'prepare_exam' && activeRevisionPlan?.examName) {
      return item.matchKind === 'subject_fallback' ? `${activeRevisionPlan.subjectName} fallback` : activeRevisionPlan.examName;
    }

    return item.topic.subject;
  }

  function getFocusItemMeta(tab: RevisionFocusTab, item: (typeof activeFocusPanel.items)[number]): string {
    if (tab === 'focus_weaknesses') {
      return item.recommendation?.suggestedModeReason ?? 'Use a structured revision loop to repair this gap.';
    }

    if (tab === 'prepare_exam') {
      return item.matchKind === 'subject_fallback'
        ? item.recommendation?.reason ?? 'Best available topic from this subject while the plan fills out.'
        : item.recommendation?.reason ?? 'Part of your active exam runway.';
    }

    if (tab === 'choose_topic') {
      return item.recommendation?.reason ?? 'Open this topic directly when you already know what needs work.';
    }

    return item.recommendation?.suggestedModeReason ?? 'Best next revision move right now.';
  }

  function getFocusItemDescription(tab: RevisionFocusTab, item: (typeof activeFocusPanel.items)[number]): string {
    if (tab === 'focus_weaknesses') {
      return item.recommendation?.reason ?? 'This topic is showing a weakness signal worth repairing next.';
    }

    if (tab === 'prepare_exam') {
      return item.matchKind === 'subject_fallback'
        ? item.recommendation?.suggestedModeReason ?? 'Use this as the strongest available bridge into your active plan.'
        : item.recommendation?.suggestedModeReason ?? 'Use this as part of your current exam build-up.';
    }

    if (tab === 'choose_topic') {
      return item.recommendation?.suggestedModeReason ?? 'Start a fresh revision pass whenever you want to target this topic directly.';
    }

    return item.recommendation?.reason ?? 'Ready for another reinforcement pass.';
  }

  function getFocusButtonTone(tab: RevisionFocusTab): string {
    switch (tab) {
      case 'focus_weaknesses':
        return 'weakness';
      case 'prepare_exam':
        return 'exam';
      case 'choose_topic':
        return 'library';
      default:
        return '';
    }
  }

  function openPlanner(): void {
    seedPlannerFields();
    appState.setRevisionPlannerOpen(true);
  }

  function closePlanner(): void {
    plannerErrors = {};
    appState.setRevisionPlannerOpen(false);
  }

  function openPlannerDateField(): void {
    openDateInputPicker(plannerDateInput);
  }

  async function getHeaders(): Promise<Record<string, string>> {
    if (cachedHeaders) return cachedHeaders;
    const headers = await getAuthenticatedHeaders();
    cachedHeaders = headers;
    return headers;
  }

  function buildPlannerTopicOptions(subjectId: string) {
    const subject = state.curriculum.subjects.find((item) => item.id === subjectId) ?? state.curriculum.subjects[0];

    return subject.topics.flatMap((topic) =>
      topic.subtopics.map((subtopic) => {
        const lessonId = subtopic.lessonIds[0];
        const lesson = state.lessons.find((item) => item.id === lessonId) ?? state.lessons[0];
        return {
          topicId: topic.id,
          topicName: topic.name,
          subtopicId: subtopic.id,
          subtopicName: subtopic.name,
          lessonId: lesson.id,
          lessonTitle: lesson.title
        };
      })
    );
  }

  async function loadPlannerTopicHints(forceRefresh = false): Promise<void> {
    if (!state.ui.showRevisionPlanner || plannerMode !== 'manual' || !selectedPlannerSubject || !selectedPlannerCurriculumSubject) {
      return;
    }

    const hintSeed = `${state.profile.curriculumId}:${state.profile.gradeId}:${state.profile.term}:${selectedPlannerSubject.id}`;

    if (!forceRefresh && hintSeed === plannerHintSeed) {
      return;
    }

    plannerHintSeed = hintSeed;
    plannerTopicHintsError = '';
    plannerTopicHintsLoading = true;
    const requestId = ++latestPlannerHintRequest;

    try {
      const headers = await getHeaders();
      const result = await resolveSubjectHints({
        subject: selectedPlannerCurriculumSubject,
        curriculumId: state.profile.curriculumId,
        curriculumName: state.profile.curriculum,
        gradeId: state.profile.gradeId,
        gradeLabel: state.profile.grade,
        term: state.profile.term as SchoolTerm,
        forceRefresh,
        fetcher: browser ? window.fetch.bind(window) : undefined,
        headers
      });

      if (requestId !== latestPlannerHintRequest) return;
      plannerTopicHintsText = result.hints.join('\n');
    } catch {
      if (requestId !== latestPlannerHintRequest) return;
      plannerTopicHintsText = buildDeterministicSubjectHints(selectedPlannerCurriculumSubject, state.profile.term as SchoolTerm).join('\n');
      if (!plannerTopicHintsText) {
        plannerTopicHintsError = "Couldn't load topic suggestions right now.";
      }
    } finally {
      if (requestId === latestPlannerHintRequest) {
        plannerTopicHintsLoading = false;
      }
    }
  }

  $: if (state.ui.showRevisionPlanner && plannerMode === 'manual' && plannerSubjectId) {
    if (plannerSubjectId !== lastPlannerAssistSubjectId) {
      lastPlannerAssistSubjectId = plannerSubjectId;
      plannerHintSeed = '';
      plannerTopicHintsText = '';
      plannerTopicHintsError = '';
      plannerManualTopics = '';
      plannerSelectedTopics = [];
      plannerTopicMatches = [];
      plannerTopicMatchStatus = 'idle';
      plannerTopicMatchError = '';
      plannerErrors = { ...plannerErrors, manualTopics: undefined };
    }

    void loadPlannerTopicHints();
  }

  function syncSelectedTopicsFromDraft(nextDraft: string): void {
    if (nextDraft.trim().length === 0) {
      plannerSelectedTopics = [];
      return;
    }

    const parsed = parseManualTopicDraft(nextDraft);
    const selectedNormalized = plannerSelectedTopics.map((item) => item.trim().toLowerCase());
    const parsedNormalized = parsed.map((item) => item.trim().toLowerCase());
    const stillExactMatch =
      parsed.length === plannerSelectedTopics.length &&
      parsedNormalized.every((item, index) => item === selectedNormalized[index]);

    if (!stillExactMatch) {
      plannerSelectedTopics = [];
    }
  }

  function onPlannerManualInput(event: Event): void {
    plannerManualTopics = (event.currentTarget as HTMLInputElement).value;
    plannerTopicMatchError = '';
    plannerErrors = { ...plannerErrors, manualTopics: undefined };
    syncSelectedTopicsFromDraft(plannerManualTopics);
  }

  function choosePlannerTopic(topicTitle: string): void {
    plannerSelectedTopics = appendManualTopic(plannerSelectedTopics, topicTitle);
    plannerManualTopics = plannerSelectedTopics.join(', ');
    plannerTopicMatchError = '';
    plannerErrors = { ...plannerErrors, manualTopics: undefined };
  }

  function plannerTopicSelected(topicTitle: string): boolean {
    return plannerSelectedTopics.some((item) => item.trim().toLowerCase() === topicTitle.trim().toLowerCase());
  }

  async function shortlistPlannerTopics(query: string): Promise<ShortlistedTopic[]> {
    if (!selectedPlannerSubject || query.trim().length === 0) {
      return [];
    }

    const request = {
      studentId: state.profile.id,
      studentName: state.profile.fullName,
      country: state.profile.country,
      curriculum: state.profile.curriculum,
      grade: state.profile.grade,
      subject: selectedPlannerSubject.name,
      term: state.profile.term,
      year: state.profile.schoolYear,
      studentInput: query.trim(),
      availableTopics: buildPlannerTopicOptions(selectedPlannerCurriculumSubject?.id ?? selectedPlannerSubject.id)
    };

    try {
      const response = await fetch('/api/ai/topic-shortlist', {
        method: 'POST',
        headers: await getHeaders().then((headers) => ({
          ...headers,
          'Content-Type': 'application/json'
        })),
        body: JSON.stringify({ request })
      });

      if (!response.ok) {
        throw new Error('Unable to match topics right now.');
      }

      const payload = (await response.json()) as { response?: { subtopics?: ShortlistedTopic[] } };
      return payload.response?.subtopics ?? [];
    } catch {
      return buildFallbackTopicShortlist(request).subtopics;
    }
  }

  async function matchPlannerDraftTopics(): Promise<string[]> {
    const draftTopics = parseManualTopicDraft(plannerManualTopics);

    if (plannerSelectedTopics.length > 0) {
      return [...plannerSelectedTopics];
    }

    if (draftTopics.length === 0) {
      return [];
    }

    plannerTopicMatchStatus = 'loading';
    plannerTopicMatchError = '';

    const matches = await Promise.all(
      draftTopics.map(async (topic) => {
        const shortlist = await shortlistPlannerTopics(topic);
        return shortlist[0] ?? null;
      })
    );

    const resolvedTopics = resolveMatchedManualTopics({
      selectedTopics: plannerSelectedTopics,
      draft: plannerManualTopics,
      matches
    });

    plannerTopicMatches = matches.filter((item): item is ShortlistedTopic => item !== null);
    plannerTopicMatchStatus = plannerTopicMatches.length > 0 ? 'ready' : 'error';

    if (resolvedTopics.length === 0) {
      plannerTopicMatchError = 'We could not match those topics clearly. Try choosing from the suggestion pills.';
      return [];
    }

    plannerSelectedTopics = resolvedTopics;
    plannerManualTopics = resolvedTopics.join(', ');
    return resolvedTopics;
  }

  function startPlan(planId: string): void {
    const plan = state.revisionPlans.find((item) => item.id === planId);

    if (!plan) {
      return;
    }

    appState.setActiveRevisionPlan(planId);

    const topicSet = buildPlanTopicSet(plan, state.revisionTopics);
    const primaryTopic = topicSet[0] ?? pickPlanStartTopic(plan, state.revisionTopics);

    if (!primaryTopic) {
      return;
    }

    const mode = inferSessionMode(plan);
    const targetQuestionCount = inferQuestionCount(plan.timeBudgetMinutes, topicSet.length);

    appState.runRevisionSession(primaryTopic, {
      mode,
      source: 'exam_plan',
      recommendationReason: plan.examName ? `Start revision for ${plan.examName}` : 'Start this revision plan',
      topicSet: topicSet.length > 1 ? topicSet : undefined,
      targetQuestionCount,
      revisionPlanId: plan.id
    });
    recallDraft = '';
    selfConfidence = 3;
    feedbackDifficulty = '';
    feedbackClarity = '';
    feedbackSubmittedForQuestionId = '';
  }

  function removePlan(planId: string, planName?: string): void {
    pendingPlanRemoval = {
      id: planId,
      name: planName?.trim() || ''
    };
  }

  function cancelPlanRemoval(): void {
    pendingPlanRemoval = null;
  }

  function confirmPlanRemoval(): void {
    if (!pendingPlanRemoval) {
      return;
    }

    appState.removeRevisionPlan(pendingPlanRemoval.id);
    pendingPlanRemoval = null;
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
    console.log('[revision] review() called:', topic.topicTitle, '|', topic.subject, '| mode:', mode);
    const context = getSessionContext(topic);
    appState.runRevisionSession(topic, {
      mode,
      source: context.source,
      recommendationReason: context.reason
    });
    recallDraft = '';
    selfConfidence = 3;
    feedbackDifficulty = '';
    feedbackClarity = '';
    feedbackSubmittedForQuestionId = '';
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

  async function submitPlanner(): Promise<void> {
    plannerErrors = {};
    if (!plannerExamName.trim()) plannerErrors.examName = 'Give your exam a name so you can track it.';
    if (!plannerExamDate) plannerErrors.examDate = 'Pick a date so Doceo can pace the plan.';
    const manualTopics = plannerMode === 'manual'
      ? await matchPlannerDraftTopics()
      : undefined;
    if (plannerMode === 'manual' && (!manualTopics || manualTopics.length === 0)) {
      plannerErrors.manualTopics = 'Add at least one topic for a manual plan.';
    }
    if (plannerErrors.examName || plannerErrors.examDate || plannerErrors.manualTopics || !plannerSubjectId) return;

    appState.createRevisionPlan({
      subjectId: plannerSubjectId,
      subjectName: selectedPlannerSubject?.name,
      examName: plannerExamName.trim(),
      examDate: plannerExamDate,
      mode: plannerMode,
      manualTopics,
      timeBudgetMinutes: plannerTimeBudgetMinutes
    });
    plannerErrors = {};
  }

  function submitRecall(): void {
    if (!selectedTopic || !currentQuestion || recallDraft.trim().length === 0) {
      return;
    }
    const answeredQuestionId = currentQuestion.id;
    appState.submitRevisionAnswer(recallDraft.trim(), selfConfidence);
    recallDraft = '';
    selfConfidence = 3;
    // Reset feedback state for the new turn
    if (feedbackSubmittedForQuestionId !== answeredQuestionId) {
      feedbackDifficulty = '';
      feedbackClarity = '';
      feedbackSubmittedForQuestionId = '';
    }
  }

  function submitQuestionFeedback(questionId: string): void {
    if (!feedbackDifficulty || !feedbackClarity) return;
    appState.submitQuestionFeedback(questionId, {
      difficulty: feedbackDifficulty,
      clarity: feedbackClarity,
      submittedAt: new Date().toISOString()
    });
    feedbackSubmittedForQuestionId = questionId;
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

  function formatSessionModeLabel(mode: RevisionSessionMode | null | undefined): string {
    if (!mode) {
      return 'Revision';
    }

    return revisionModes.find((option) => option.mode === mode)?.label ?? mode.replace(/_/g, ' ');
  }

  function getSessionHeroSummary(): string {
    if (!revisionSession || !sessionRootTopic) {
      return 'Pick a topic and move into a focused revision loop.';
    }

    if (revisionWorkspaceMode === 'summary' && revisionSession.status === 'completed') {
      return `This ${sessionRootTopic.subject} round is complete. Check what improved, what still needs care, and where Doceo wants you to go next.`;
    }

    if (revisionWorkspaceMode === 'summary' && revisionSession.status === 'escalated_to_lesson') {
      return `Revision found a real gap in ${sessionRootTopic.topicTitle}. Step into a focused reteach or come back to the queue when you are ready.`;
    }

    return `Stay with ${sessionRootTopic.topicTitle}. Answer the prompt, rate your confidence, and let Doceo adapt the next move to this ${sessionRootTopic.subject} topic.`;
  }

  function getSessionStatusBadge(): string {
    if (!revisionSession) {
      return '';
    }

    if (revisionSession.status === 'completed') {
      return 'Round complete';
    }

    if (revisionSession.status === 'escalated_to_lesson') {
      return 'Lesson revisit';
    }

    return `Question ${sessionProgressCurrent} of ${sessionProgressTotal}`;
  }

  function getSessionSummaryHeading(): string {
    if (revisionSession?.status === 'escalated_to_lesson') {
      return 'This topic needs a short reteach';
    }

    return 'This revision round has landed';
  }

  function getSessionSummaryBody(): string {
    if (!revisionSession?.lastTurnResult) {
      return 'Doceo has finished this pass and updated the next move for you.';
    }

    if (revisionSession.status === 'escalated_to_lesson') {
      return `${revisionSession.lastTurnResult.diagnosis.summary} Move into lesson mode for a slower rebuild, or return to revision when you want another pass.`;
    }

    return `${revisionSession.lastTurnResult.diagnosis.summary} The next schedule now reflects how this round actually went.`;
  }

  function getSubjectSlug(subject: string | null | undefined): string {
    if (!subject) return 'default';
    return subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function getSessionMetricCards(): Array<{ label: string; value: string; tone: 'green' | 'blue' | 'yellow' | 'pink' }> {
    if (!revisionSession?.lastTurnResult) {
      return [];
    }

    const { scores, topicUpdate } = revisionSession.lastTurnResult;

    return [
      { label: 'Correctness', value: `${Math.round(scores.correctness * 100)}%`, tone: 'green' },
      { label: 'Reasoning', value: `${Math.round(scores.reasoning * 100)}%`, tone: 'blue' },
      { label: 'Confidence match', value: `${Math.round(scores.confidenceAlignment * 100)}%`, tone: 'yellow' },
      { label: 'Next review', value: formatDueLabel(topicUpdate.nextRevisionAt), tone: 'pink' }
    ];
  }
</script>

<section class="workspace" class:session-focus={hasSessionFocus}>
  {#if revisionWorkspaceMode === 'home'}
  {#if upcomingExamInfo}
    <section class="panel revision-outlook-panel">
      <div class="revision-outlook-main">
        <div class="revision-outlook-header">
          <div class="revision-outlook-copy">
            <p class="eyebrow">On The Horizon</p>
            <h2>{upcomingExamInfo.examName}</h2>
            <p class="revision-outlook-subject">{upcomingExamInfo.subjectName} revision path</p>
          </div>
          <div class="revision-outlook-countdown">
            <span>Time left</span>
            <strong>{upcomingExamInfo.daysLabel}</strong>
          </div>
        </div>

        <p class="build-plan-summary revision-outlook-summary">{getRevisionOutlookMessage()}</p>

        <div class="revision-outlook-stats" aria-label="Revision signals">
          {#each outlookStats as stat}
            <article class={`revision-signal-card tone-${stat.tone}`}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </article>
          {/each}
        </div>
      </div>

      {#if outlookPlans.length > 0}
        <div class="revision-outlook-side">
          <div class="revision-outlook-side-header">
            <p class="eyebrow">On Deck</p>
            <small>{outlookPlans.length} target{outlookPlans.length === 1 ? '' : 's'}</small>
          </div>
          <div class="revision-plan-preview-grid" aria-label="Upcoming revision plans">
            {#each outlookPlans as plan, index}
              <article class={`revision-plan-preview tone-${index % 4}`}>
                <div class="revision-plan-preview-topline">
                  <strong>{plan.examName}</strong>
                  {#if activeRevisionPlan?.id === plan.id}
                    <span class="preview-badge">Current</span>
                  {/if}
                </div>
                <span>{plan.subjectName}</span>
                <p>{formatPlanTiming(plan.examDate)}</p>
              </article>
            {/each}
          </div>
        </div>
      {/if}
    </section>
  {/if}

  <section class="panel build-plan-panel build-plan-invite-card">
    <div class="build-plan-invite-icon" aria-hidden="true">🎯</div>
    <div class="build-plan-invite-body">
      <h3>Build your next revision path</h3>
      <p class="build-plan-summary">Choose the exam, and Doceo will organise what to revise next.</p>
      <button type="button" class="action-btn build-plan-cta" onclick={openPlanner}>Build revision</button>
    </div>
  </section>

  <section class="panel plans-panel">
    <div class="panel-header">
      <div>
        <p class="eyebrow">{revisionPlansHeader.eyebrow}</p>
        <h3>{revisionPlansHeader.title}</h3>
        <p class="plans-summary">{revisionPlansHeader.summary}</p>
      </div>
      <small class="plans-count">{formatSavedPlansCount(sortedRevisionPlans.length)}</small>
    </div>

    {#if sortedRevisionPlans.length > 0}
      <div class="plan-grid">
        {#each sortedRevisionPlans as plan, index}
          {@const examMs = new Date(plan.examDate).getTime()}
          {@const daysLeft = Number.isNaN(examMs) ? null : Math.ceil((examMs - Date.now()) / 86400000)}
          <article
            class:active-plan={activeRevisionPlan?.id === plan.id}
            class="plan-card tone-{index % 3}"
          >
            <div class="plan-card-header">
              <div class="plan-card-title-block">
                {#if activeRevisionPlan?.id === plan.id}
                  <span class="plan-active-badge">Active</span>
                {/if}
                <strong class="plan-card-name">{plan.examName ?? 'Revision plan'}</strong>
                <span class="plan-card-subject">{plan.subjectName}</span>
              </div>
              <div class="plan-card-aside">
                <button
                  type="button"
                  class="plan-remove-btn"
                  aria-label={`Remove ${plan.examName ?? 'revision plan'}`}
                  onclick={() => removePlan(plan.id, plan.examName)}
                >
                  Remove
                </button>
                {#if daysLeft !== null}
                  <div class="plan-countdown" class:plan-countdown--urgent={daysLeft <= 7 && daysLeft >= 0}>
                    <strong class="plan-countdown-num">
                      {daysLeft < 0 ? '—' : daysLeft === 0 ? '0' : daysLeft}
                    </strong>
                    <span class="plan-countdown-label">
                      {daysLeft < 0 ? 'Passed' : daysLeft === 0 ? 'Today' : 'Days left'}
                    </span>
                  </div>
                {/if}
              </div>
            </div>

            <div class="plan-chips-row">
              <span class="plan-chip plan-chip--info">{formatPlanStyleLabel(plan.planStyle)}</span>
              <span class="plan-chip">{plan.topics.length} topic{plan.topics.length === 1 ? '' : 's'}</span>
              <span class="plan-chip">{formatPlanDailyLabel(plan.timeBudgetMinutes)}</span>
            </div>

            <button type="button" class="action-btn plan-start-btn" onclick={() => startPlan(plan.id)}>
              Start revision
            </button>
          </article>
        {/each}
      </div>
    {:else}
      <div class="empty-plan-state">
        <div>
          <p class="eyebrow">No Saved Plans</p>
          <h3>Create your first exam plan</h3>
          <p>Build a revision plan and it will appear here as a reusable card with the exam date, plan style, and included topics.</p>
        </div>
        <button type="button" class="action-btn" onclick={openPlanner}>Build my plan</button>
      </div>
    {/if}
  </section>

  {#if homeModel.hero}
    <section class="hero-card revise-now-card">
      <div class="hero-copy recommendation-copy">
        <p class="recommendation-heading">{homeModel.hero.heading}</p>
        <h3 class="recommendation-topic">{homeModel.hero.topic.topicTitle}</h3>
        <p class="hero-support recommendation-summary">{formatRecommendationSummary()}</p>
        {#if getRecommendationContextItems().length > 0}
          <div class="recommendation-context" aria-label="Recommendation context">
            {#each getRecommendationContextItems() as item}
              <span>{item}</span>
            {/each}
          </div>
        {/if}
      </div>

      <div class="hero-side recommendation-side">
        <div class="hero-actions">
          <button
            type="button"
            class="action-btn recommendation-cta"
            onclick={() => review(homeModel.hero!.topic, homeModel.hero!.suggestedMode)}
          >
            {homeModel.hero.ctaLabel}
          </button>
        </div>
      </div>
    </section>

    <div class="content-grid" class:session-focus-grid={hasSessionFocus}>
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

        <section class="panel revision-focus-panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Revision Paths</p>
              <h3>{activeFocusPanel.title}</h3>
            </div>
            <small>{activeFocusPanel.items.length} topics</small>
          </div>

          <div class="focus-tablist" role="tablist" aria-label="Revision paths">
            {#each focusModel.tabs as tab}
              <button
                type="button"
                role="tab"
                class:active={activeFocusTab === tab.id}
                class="focus-tab"
                aria-selected={activeFocusTab === tab.id}
                onclick={() => selectFocusTab(tab.id)}
              >
                <span>{tab.label}</span>
                <strong>{tab.count}</strong>
              </button>
            {/each}
          </div>

          <p class="focus-summary">{activeFocusPanel.summary}</p>

          {#if activeFocusTab === 'prepare_exam' && activeRevisionPlan}
            <div class="focus-context">
              <span class="hero-pill">{activeRevisionPlan.examName ?? 'Active plan'}</span>
              <span class="hero-pill subdued">{formatPlanTiming(activeRevisionPlan.examDate)}</span>
              <span class="hero-pill subdued">{activeRevisionPlan.subjectName}</span>
            </div>
          {/if}

          {#if activeFocusPanel.items.length > 0}
            <div class:compact={activeFocusTab !== 'choose_topic'} class="queue-list focus-queue">
              {#each activeFocusPanel.items as item}
                <button
                  type="button"
                  class:selected={selectedTopic?.lessonSessionId === item.topic.lessonSessionId}
                  class:weakness={getFocusButtonTone(activeFocusTab ?? focusModel.defaultTab) === 'weakness'}
                  class:exam={getFocusButtonTone(activeFocusTab ?? focusModel.defaultTab) === 'exam'}
                  class:library={getFocusButtonTone(activeFocusTab ?? focusModel.defaultTab) === 'library'}
                  class="topic-button"
                  onclick={() => review(item.topic, item.recommendation?.suggestedMode ?? 'deep_revision')}
                >
                  <div class="topic-row">
                    <strong>{item.topic.topicTitle}</strong>
                    <small>{formatDueLabel(item.topic.nextRevisionAt)}</small>
                  </div>
                  <span>{getFocusItemSummary(activeFocusTab ?? focusModel.defaultTab, item)}</span>
                  <span class="topic-meta">{getFocusItemMeta(activeFocusTab ?? focusModel.defaultTab, item)}</span>
                  <p>{getFocusItemDescription(activeFocusTab ?? focusModel.defaultTab, item)}</p>
                </button>
              {/each}
            </div>
          {:else}
            <div class="focus-empty-state">
              <div>
                <p class="eyebrow">{activeFocusPanel.emptyTitle}</p>
                <p>{activeFocusPanel.emptyCopy}</p>
              </div>
              {#if (activeFocusTab ?? focusModel.defaultTab) === 'prepare_exam'}
                <button type="button" class="secondary action-btn" onclick={openPlanner}>
                  Build my plan
                </button>
              {/if}
            </div>
          {/if}
        </section>
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
  {:else}
    <section class={`revision-session-shell status-${revisionSession?.status ?? 'active'} subject-${sessionSubjectSlug}`}>
      <header class="revision-session-topbar">
        <button type="button" class="secondary action-btn session-exit-btn" onclick={() => appState.exitRevisionSession()}>
          Back to revision
        </button>

        <div class="revision-session-topbar-copy">
          <p class="eyebrow">{revisionWorkspaceMode === 'summary' ? 'Revision Summary' : 'Active Revision'}</p>
          <h2 class="session-subject-heading">{sessionRootTopic?.subject ?? displayTopic?.subject ?? 'Revision'}</h2>
        </div>

        {#if revisionSession}
          <div class="revision-session-topbar-meta">
            <span class="hero-pill">{formatSessionModeLabel(revisionSession.mode)}</span>
            <span class="hero-pill subdued">{getSessionStatusBadge()}</span>
          </div>
        {/if}
      </header>

      <section class="revision-session-hero">
        <div class="revision-session-hero-copy">
          <p class="eyebrow session-subject-eyebrow">
            {revisionWorkspaceMode === 'summary'
              ? revisionSession?.status === 'escalated_to_lesson'
                ? 'Needs Rebuild'
                : 'Round Complete'
              : (displayTopic?.subject ?? sessionRootTopic?.subject ?? 'Focused Revision')}
          </p>
          <h2>{displayTopic?.topicTitle ?? revisionSession?.topicTitle ?? 'Revision session'}</h2>
          <p class="revision-session-summary">{getSessionHeroSummary()}</p>

          <div class="revision-session-pill-row">
            {#if displayTopic?.subject}
              <span class="plan-chip plan-chip--subject">{displayTopic.subject}</span>
            {/if}
            {#if revisionSession}
              <span class="plan-chip">{formatSessionModeLabel(revisionSession.mode)}</span>
              <span class="plan-chip">{revisionSession.recommendationReason}</span>
            {/if}
            {#if activeRevisionPlan && displayTopic?.subjectId === activeRevisionPlan.subjectId}
              <span class="plan-chip plan-chip--active">{activeRevisionPlan.examName ?? 'Active plan'}</span>
            {/if}
            {#if displayTopic}
              <span class="plan-chip">{formatDueLabel(displayTopic.nextRevisionAt)}</span>
            {/if}
          </div>
        </div>

        <div class="revision-session-hero-side">
          <article class="session-progress-card">
            <span>{revisionWorkspaceMode === 'summary' ? 'Session state' : 'Current progress'}</span>
            <strong>{getSessionStatusBadge()}</strong>
            {#if revisionWorkspaceMode === 'session' && sessionProgressTotal > 0}
              <p>{sessionProgressTotal} prompt{sessionProgressTotal === 1 ? '' : 's'} in this revision loop.</p>
            {:else if revisionSession?.status === 'escalated_to_lesson'}
              <p>Revision has identified a gap that needs a calmer reteach.</p>
            {:else}
              <p>Use the summary below to decide whether to continue, reteach, or move on.</p>
            {/if}
          </article>
        </div>
      </section>

      <div class="revision-session-layout">
        <section class="revision-session-main">
          {#if revisionWorkspaceMode === 'session' && currentQuestion}
            <article class="question-card session-question-card">
              <div class="revision-session-card-header">
                <div>
                  <p class="question-type">{currentQuestion.questionType.replace('_', ' ')}</p>
                  <h3>{displayTopic?.topicTitle ?? currentQuestion.revisionTopicId}</h3>
                </div>
                <span class="hero-pill subdued">{getSessionStatusBadge()}</span>
              </div>
              {#if currentQuestionTopic?.isSynthetic}
                <p class="synthetic-topic-note">You haven't taken a lesson on this topic yet. Answer from what you already know — Doceo will build from here.</p>
              {/if}
              <p>{currentQuestion.prompt}</p>
            </article>

            <label class="field revision-answer-field">
              <span>Your answer</span>
              <textarea
                bind:value={recallDraft}
                rows="9"
                placeholder={`Answer the ${currentQuestion.questionType.replace('_', ' ')} prompt for ${(displayTopic ?? selectedTopic).topicTitle}`}
              ></textarea>
            </label>

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

            <div class="actions revision-session-actions">
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
            <article class="revision-summary-card">
              <div class="revision-session-card-header">
                <div>
                  <p class="eyebrow">Session Summary</p>
                  <h3>{getSessionSummaryHeading()}</h3>
                </div>
                {#if revisionSession}
                  <span class="hero-pill subdued">{formatSessionModeLabel(revisionSession.mode)}</span>
                {/if}
              </div>

              <p>{getSessionSummaryBody()}</p>

              {#if getSessionMetricCards().length > 0}
                <div class="revision-summary-metrics">
                  {#each getSessionMetricCards() as stat}
                    <article class={`revision-summary-stat tone-${stat.tone}`}>
                      <span>{stat.label}</span>
                      <strong>{stat.value}</strong>
                    </article>
                  {/each}
                </div>
              {/if}

              <div class="starter-actions revision-summary-actions">
                {#if revisionSession?.status === 'escalated_to_lesson'}
                  <button type="button" class="action-btn" onclick={() => appState.startRevisionLessonHandoff()}>
                    Start focused reteach
                  </button>
                  {#if sessionRootTopic}
                    <button type="button" class="secondary action-btn" onclick={() => review(sessionRootTopic, 'deep_revision')}>
                      Try revision again
                    </button>
                  {/if}
                {:else}
                  {#if nextRevisionRecommendation}
                    <button
                      type="button"
                      class="action-btn"
                      onclick={() => review(nextRevisionRecommendation.topic, nextRevisionRecommendation.suggestedMode)}
                    >
                      Next: {nextRevisionRecommendation.topic.topicTitle}
                    </button>
                  {/if}
                  {#if sessionRootTopic}
                    <button type="button" class="secondary action-btn" onclick={() => startRecommendedRevision(sessionRootTopic)}>
                      Revisit this topic
                    </button>
                  {/if}
                {/if}
              </div>
            </article>
          {/if}

          {#if feedbackMarkdown()}
            <article class="feedback-card revision-session-feedback">
              <div class="panel-header">
                <div>
                  <p class="eyebrow">{revisionWorkspaceMode === 'summary' ? 'Round feedback' : 'Live feedback'}</p>
                  <h3>{displayTopic?.topicTitle ?? 'Feedback'}</h3>
                </div>
              </div>
              {@html renderSimpleMarkdown(feedbackMarkdown()!)}
            </article>
          {/if}

          {#if revisionSession?.lastTurnResult}
            {@const lastQuestion = revisionSession.questions[Math.max(0, revisionSession.questionIndex - (revisionSession.status === 'active' ? 1 : 0))]}
            {#if lastQuestion && feedbackSubmittedForQuestionId !== lastQuestion.id}
              <article class="feedback-card student-question-feedback">
                <p class="eyebrow">Rate this question</p>
                <p class="feedback-invite">Your ratings help Doceo improve how it challenges you.</p>
                <div class="feedback-chip-row">
                  <span class="feedback-chip-label">Difficulty</span>
                  {#each [['too_easy', 'Too easy'], ['just_right', 'Just right'], ['too_hard', 'Too hard']] as [val, label]}
                    <button
                      type="button"
                      class="feedback-chip"
                      class:active={feedbackDifficulty === val}
                      onclick={() => { feedbackDifficulty = val as RevisionQuestionFeedback['difficulty']; }}
                    >{label}</button>
                  {/each}
                </div>
                <div class="feedback-chip-row">
                  <span class="feedback-chip-label">Clarity</span>
                  {#each [['clear', 'Clear'], ['confusing', 'Confusing']] as [val, label]}
                    <button
                      type="button"
                      class="feedback-chip"
                      class:active={feedbackClarity === val}
                      onclick={() => { feedbackClarity = val as RevisionQuestionFeedback['clarity']; }}
                    >{label}</button>
                  {/each}
                </div>
                <div class="feedback-actions">
                  <button
                    type="button"
                    class="secondary action-btn feedback-submit-btn"
                    disabled={!feedbackDifficulty || !feedbackClarity}
                    onclick={() => submitQuestionFeedback(lastQuestion.id)}
                  >Submit feedback</button>
                  <button
                    type="button"
                    class="ghost-btn"
                    onclick={() => { feedbackSubmittedForQuestionId = lastQuestion.id; }}
                  >Skip</button>
                </div>
              </article>
            {:else if feedbackSubmittedForQuestionId === lastQuestion?.id}
              <p class="feedback-thanks">Thanks — feedback recorded.</p>
            {/if}
          {/if}
        </section>

        <aside class="revision-session-side">
          {#if displayTopic}
            <article class="feedback-card calibration-card revision-session-context-card">
              <div class="panel-header">
                <div>
                  <p class="eyebrow">Topic Signals</p>
                  <h3>{getCalibrationHeading(displayTopic)}</h3>
                </div>
                <span class="hero-pill subdued">{Math.round(displayTopic.calibration.averageCorrectness * 100)}% accuracy</span>
              </div>
              <p>{getCalibrationSummary(displayTopic)}</p>
              <div class="calibration-grid">
                <article class="mini-stat">
                  <strong>{Math.round(displayTopic.retentionStability * 100)}%</strong>
                  <span>Retention stability</span>
                </article>
                <article class="mini-stat">
                  <strong>{Math.round(displayTopic.forgettingVelocity * 100)}%</strong>
                  <span>Forgetting velocity</span>
                </article>
                <article class="mini-stat">
                  <strong>{displayTopic.calibration.averageSelfConfidence.toFixed(1)}</strong>
                  <span>Avg confidence / 5</span>
                </article>
                <article class="mini-stat">
                  <strong>{displayTopic.calibration.overconfidenceCount + displayTopic.calibration.underconfidenceCount}</strong>
                  <span>Calibration flags</span>
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
            <article class="feedback-card revision-session-context-card">
              <div class="panel-header">
                <div>
                  <p class="eyebrow">Topic History</p>
                  <h3>{topicHistory.topicTitle}</h3>
                </div>
                <span class="hero-pill subdued">{formatTrendLabel(topicHistory.trend)}</span>
              </div>
              <p>Dominant issue: {topicHistory.dominantIssue}.</p>
              <div class="activity-list">
                {#each topicHistory.entries.slice(0, 3) as entry}
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

          {#if nextRevisionRecommendation && revisionWorkspaceMode === 'summary'}
            <article class="feedback-card revision-next-card">
              <div class="panel-header">
                <div>
                  <p class="eyebrow">Next best move</p>
                  <h3>{nextRevisionRecommendation.topic.topicTitle}</h3>
                </div>
                <span class="hero-pill subdued">{nextRevisionRecommendation.topic.subject}</span>
              </div>
              <p>{nextRevisionRecommendation.reason}</p>
              <p class="revision-next-note">Use the main action to continue straight into this topic, or return to the queue from the header.</p>
            </article>
          {/if}
        </aside>
      </div>
    </section>
  {/if}

  {#if state.ui.showRevisionPlanner}
    <div class="planner-shell">
      <button type="button" class="planner-backdrop" aria-label="Close revision plan modal" onclick={closePlanner}></button>
      <div
        class="planner-modal"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(event) => shouldClosePlannerOnKey(event.key) && closePlanner()}
        role="dialog"
        aria-modal="true"
        aria-label="Build a revision plan"
        tabindex="-1"
      >
        <div class="planner-modal-header">
          <div>
            <h2>Build a revision plan</h2>
            <p class="build-plan-summary">Set the next exam and let revision follow it clearly.</p>
          </div>
          <button type="button" class="secondary action-btn planner-close-btn" onclick={closePlanner}>Cancel</button>
        </div>

        <div class="planner-grid">
          <label class="field">
            <span>Subject</span>
            <select bind:value={plannerSubjectId}>
              {#each plannerAvailableSubjects as subject}
                <option value={subject.id}>{subject.name}</option>
              {/each}
            </select>
          </label>

          <label class="field" class:field-error={plannerErrors.examName}>
            <span>Exam name</span>
            <input
              bind:value={plannerExamName}
              placeholder="e.g. Mid-year exam, Term 2 test"
              oninput={() => { if (plannerErrors.examName) plannerErrors = { ...plannerErrors, examName: undefined }; }}
            />
            {#if plannerErrors.examName}
              <span class="field-hint-error" transition:fly={{ y: 6, duration: 160, easing: cubicOut }}>{plannerErrors.examName}</span>
            {/if}
          </label>

          <label class="field planner-date-field" class:field-error={plannerErrors.examDate} for="planner-exam-date">
            <span>Exam date</span>
            <input
              id="planner-exam-date"
              type="date"
              bind:this={plannerDateInput}
              bind:value={plannerExamDate}
              onfocus={openPlannerDateField}
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
            <div class="field field-wide manual-topic-field" class:field-error={plannerErrors.manualTopics}>
              <div class="manual-topic-header">
                <span>Topics</span>
                {#if plannerTopicHintsLoading}
                  <small class="planner-loading-state">
                    <LoadingDots size="sm" label="Loading topic suggestions" />
                    <span>Loading suggestions...</span>
                  </small>
                {/if}
              </div>

              {#if plannerTopicHintsLoading && plannerHintChips.length === 0}
                <div class="planner-pill-loader" aria-hidden="true">
                  <LoadingDots label="Loading topic suggestions" />
                </div>
              {/if}

              {#if plannerHintChips.length > 0}
                <div class="planner-pill-row">
                  {#each plannerHintChips as chip}
                    <button
                      type="button"
                      class:selected={plannerTopicSelected(chip.label)}
                      class="planner-pill"
                      aria-pressed={plannerTopicSelected(chip.label)}
                      onclick={() => choosePlannerTopic(chip.label)}
                    >
                      {chip.label}
                    </button>
                  {/each}
                </div>
              {/if}

              {#if plannerTopicHintsError}
                <span class="field-hint-error" transition:fly={{ y: 6, duration: 160, easing: cubicOut }}>{plannerTopicHintsError}</span>
              {/if}

              <input
                value={plannerManualTopics}
                placeholder="Type one or more topics, for example: Fractions, Area"
                oninput={onPlannerManualInput}
              />

              <p class="manual-topic-help">
                Tap a pill to add it quickly. Doceo will match typed topics to the real curriculum before creating the plan.
              </p>

              {#if plannerTopicMatchStatus === 'ready' && plannerTopicMatches.length > 0}
                <div class="manual-match-block">
                  <small>Matched topics</small>
                  <div class="planner-pill-row">
                    {#each plannerTopicMatches as topic}
                      <button
                        type="button"
                        class:selected={plannerTopicSelected(topic.title)}
                        class="planner-pill planner-pill--matched"
                        aria-pressed={plannerTopicSelected(topic.title)}
                        onclick={() => choosePlannerTopic(topic.title)}
                      >
                        {topic.title}
                      </button>
                    {/each}
                  </div>
                </div>
              {/if}

              {#if plannerErrors.manualTopics}
                <span class="field-hint-error" transition:fly={{ y: 6, duration: 160, easing: cubicOut }}>{plannerErrors.manualTopics}</span>
              {/if}

              {#if plannerTopicMatchError}
                <span class="field-hint-error" transition:fly={{ y: 6, duration: 160, easing: cubicOut }}>{plannerTopicMatchError}</span>
              {/if}
            </div>
          {/if}
        </div>

        <div class="actions">
          <button type="button" class="action-btn" onclick={submitPlanner}>Generate plan</button>
        </div>
      </div>
    </div>
  {/if}

  {#if pendingPlanRemoval}
    <div class="planner-shell">
      <button
        type="button"
        class="planner-backdrop"
        aria-label="Close revision plan removal dialog"
        onclick={cancelPlanRemoval}
      ></button>
      <div
        class="planner-modal plan-removal-modal"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(event) => shouldClosePlannerOnKey(event.key) && cancelPlanRemoval()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-removal-title"
        tabindex="-1"
      >
        <div class="plan-removal-copy">
          <span class="plan-removal-kicker">Remove plan</span>
          <h2 id="plan-removal-title">{planRemovalContent.title}</h2>
          <p>{planRemovalContent.body}</p>
        </div>

        <div class="actions plan-removal-actions">
          <button type="button" class="secondary action-btn" onclick={cancelPlanRemoval}>
            {planRemovalContent.cancelLabel}
          </button>
          <button type="button" class="action-btn plan-remove-confirm-btn" onclick={confirmPlanRemoval}>
            {planRemovalContent.confirmLabel}
          </button>
        </div>
      </div>
    </div>
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

  .workspace > .revision-outlook-panel {
    animation: section-enter 0.35s var(--ease-soft) both;
    animation-delay: 0.02s;
  }
  .workspace > .build-plan-panel {
    animation: section-enter 0.35s var(--ease-soft) both;
    animation-delay: 0.04s;
  }
  .workspace > .plans-panel {
    animation: section-enter 0.35s var(--ease-soft) both;
    animation-delay: 0.07s;
  }
  .workspace > .hero-card {
    animation: section-enter 0.35s var(--ease-soft) both;
    animation-delay: 0.1s;
  }
  .workspace > .content-grid {
    animation: section-enter 0.35s var(--ease-soft) both;
    animation-delay: 0.16s;
  }

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

  .hero-actions,
  .build-plan-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .revision-session-shell,
  .revision-session-main,
  .revision-session-side,
  .revision-session-hero-copy,
  .revision-session-hero-side {
    display: grid;
    gap: 1rem;
  }

  .revision-session-shell {
    min-height: calc(100svh - 9rem);
    align-content: start;
    animation: section-enter 0.28s var(--ease-soft) both;
  }

  .revision-session-topbar,
  .revision-session-card-header,
  .revision-session-topbar-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .revision-session-topbar {
    justify-content: space-between;
    padding: 0.15rem 0.1rem;
  }

  .revision-session-topbar-copy {
    display: grid;
    gap: 0.2rem;
    min-width: 0;
  }

  .session-subject-heading {
    font-size: clamp(1rem, 0.88rem + 0.35vw, 1.25rem);
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.02em;
    color: var(--session-subject-color, var(--text));
    margin: 0;
  }

  /* Subject-specific accent colors applied via CSS custom properties on the shell */
  .subject-mathematics {
    --session-subject-color: #3b82f6;
    --session-hero-a: color-mix(in srgb, #dbeafe 90%, white);
    --session-hero-b: color-mix(in srgb, #ede9fe 88%, white);
    --session-hero-c: color-mix(in srgb, #e0f2fe 86%, white);
  }

  .subject-physical-sciences {
    --session-subject-color: #10b981;
    --session-hero-a: color-mix(in srgb, #d1fae5 90%, white);
    --session-hero-b: color-mix(in srgb, #ccfbf1 88%, white);
    --session-hero-c: color-mix(in srgb, #e0f2fe 86%, white);
  }

  .subject-life-sciences {
    --session-subject-color: #22c55e;
    --session-hero-a: color-mix(in srgb, #dcfce7 90%, white);
    --session-hero-b: color-mix(in srgb, #d1fae5 88%, white);
    --session-hero-c: color-mix(in srgb, #fef9c3 86%, white);
  }

  .subject-history {
    --session-subject-color: #f59e0b;
    --session-hero-a: color-mix(in srgb, #fef3c7 90%, white);
    --session-hero-b: color-mix(in srgb, #fde68a 86%, white);
    --session-hero-c: color-mix(in srgb, #ffe4e6 84%, white);
  }

  .subject-geography {
    --session-subject-color: #14b8a6;
    --session-hero-a: color-mix(in srgb, #ccfbf1 90%, white);
    --session-hero-b: color-mix(in srgb, #d1fae5 88%, white);
    --session-hero-c: color-mix(in srgb, #e0f7fa 86%, white);
  }

  .subject-english,
  .subject-english-home-language,
  .subject-english-first-additional-language {
    --session-subject-color: #8b5cf6;
    --session-hero-a: color-mix(in srgb, #ede9fe 90%, white);
    --session-hero-b: color-mix(in srgb, #fce7f3 88%, white);
    --session-hero-c: color-mix(in srgb, #e0e7ff 86%, white);
  }

  .subject-afrikaans {
    --session-subject-color: #f97316;
    --session-hero-a: color-mix(in srgb, #ffedd5 90%, white);
    --session-hero-b: color-mix(in srgb, #fef3c7 88%, white);
    --session-hero-c: color-mix(in srgb, #ffe4e6 86%, white);
  }

  /* Apply the subject colors to the hero banner when they are set */
  .subject-mathematics .revision-session-hero,
  .subject-physical-sciences .revision-session-hero,
  .subject-life-sciences .revision-session-hero,
  .subject-history .revision-session-hero,
  .subject-geography .revision-session-hero,
  .subject-english .revision-session-hero,
  .subject-english-home-language .revision-session-hero,
  .subject-english-first-additional-language .revision-session-hero,
  .subject-afrikaans .revision-session-hero {
    background:
      radial-gradient(circle at top left, var(--session-hero-a, color-mix(in srgb, var(--color-blue-dim) 92%, white)), transparent 38%),
      radial-gradient(circle at 82% 18%, var(--session-hero-b, color-mix(in srgb, var(--color-purple-dim) 90%, white)), transparent 34%),
      radial-gradient(circle at 72% 80%, var(--session-hero-c, color-mix(in srgb, var(--color-yellow-dim) 88%, white)), transparent 40%),
      linear-gradient(180deg, color-mix(in srgb, var(--surface-callout) 38%, white), var(--surface));
    border-color: color-mix(in srgb, var(--session-subject-color) 22%, var(--border));
  }

  .session-exit-btn {
    justify-self: start;
    white-space: nowrap;
  }

  .revision-session-topbar-meta {
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .revision-session-hero {
    position: relative;
    overflow: hidden;
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(15rem, 0.75fr);
    gap: 1rem;
    padding: 1.35rem;
    border-radius: 1.8rem;
    border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--border));
    background:
      radial-gradient(circle at top left, color-mix(in srgb, var(--color-blue-dim) 92%, white), transparent 38%),
      radial-gradient(circle at 82% 18%, color-mix(in srgb, var(--color-purple-dim) 90%, white), transparent 34%),
      radial-gradient(circle at 72% 80%, color-mix(in srgb, var(--color-yellow-dim) 88%, white), transparent 40%),
      linear-gradient(180deg, color-mix(in srgb, var(--surface-callout) 38%, white), var(--surface));
    box-shadow:
      0 18px 40px rgba(15, 23, 42, 0.10),
      0 32px 72px rgba(15, 23, 42, 0.06);
  }

  .revision-session-hero::after {
    content: '';
    position: absolute;
    inset: auto -12% -42% 42%;
    height: 18rem;
    background: radial-gradient(circle, color-mix(in srgb, var(--accent-dim) 80%, white), transparent 62%);
    pointer-events: none;
    opacity: 0.8;
  }

  .revision-session-hero > * {
    position: relative;
    z-index: 1;
  }

  .revision-session-hero h2 {
    font-size: clamp(1.7rem, 1.28rem + 1.2vw, 2.45rem);
    line-height: 1.04;
    letter-spacing: -0.03em;
    max-width: 14ch;
  }

  .revision-session-summary {
    max-width: 60ch;
    color: var(--text);
    line-height: 1.6;
  }

  .revision-session-pill-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }

  .session-progress-card {
    align-self: stretch;
    display: grid;
    gap: 0.45rem;
    padding: 1rem 1.05rem;
    border-radius: 1.35rem;
    border: 1px solid color-mix(in srgb, var(--color-blue) 14%, var(--border));
    background:
      linear-gradient(180deg, rgba(255,255,255,0.74), rgba(255,255,255,0.58));
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.6),
      0 10px 24px rgba(15, 23, 42, 0.08);
  }

  .session-progress-card span {
    font-size: 0.74rem;
    font-weight: 700;
    color: var(--text-soft);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .session-progress-card strong {
    font-size: clamp(1.3rem, 1.06rem + 0.5vw, 1.7rem);
    line-height: 1.05;
    letter-spacing: -0.03em;
  }

  .session-progress-card p {
    color: var(--text-soft);
    line-height: 1.5;
  }

  .revision-session-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(18rem, 0.78fr);
    gap: 1rem;
    align-items: start;
  }

  .session-question-card,
  .revision-summary-card,
  .revision-session-feedback,
  .revision-session-context-card,
  .revision-next-card {
    border: 1px solid var(--border);
    border-radius: 1.5rem;
    background: var(--surface);
    padding: 1.15rem;
  }

  .session-question-card {
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--color-blue-dim) 34%, white), var(--surface));
    box-shadow:
      0 12px 28px rgba(15, 23, 42, 0.06),
      inset 0 1px 0 rgba(255,255,255,0.72);
  }

  .revision-summary-card {
    background:
      radial-gradient(circle at top right, color-mix(in srgb, var(--color-yellow-dim) 90%, white), transparent 34%),
      linear-gradient(180deg, color-mix(in srgb, var(--green-soft, var(--accent-dim)) 38%, white), var(--surface));
    box-shadow:
      0 14px 30px rgba(15, 23, 42, 0.08),
      inset 0 1px 0 rgba(255,255,255,0.7);
  }

  .revision-summary-metrics {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .revision-summary-stat {
    display: grid;
    gap: 0.25rem;
    padding: 0.85rem 0.9rem;
    border-radius: 1rem;
    border: 1px solid transparent;
  }

  .revision-summary-stat span {
    font-size: 0.76rem;
    color: var(--text-soft);
  }

  .revision-summary-stat strong {
    font-size: 1.15rem;
    line-height: 1.1;
    color: var(--text);
  }

  .revision-summary-stat.tone-green {
    background: color-mix(in srgb, var(--green-soft, var(--accent-dim)) 92%, white);
    border-color: color-mix(in srgb, var(--accent) 22%, var(--border));
  }

  .revision-summary-stat.tone-blue {
    background: color-mix(in srgb, var(--color-blue-dim) 92%, white);
    border-color: color-mix(in srgb, var(--color-blue) 18%, var(--border));
  }

  .revision-summary-stat.tone-yellow {
    background: color-mix(in srgb, var(--color-yellow-dim) 92%, white);
    border-color: color-mix(in srgb, var(--color-yellow) 20%, var(--border));
  }

  .revision-summary-stat.tone-pink {
    background: color-mix(in srgb, var(--color-purple-dim) 88%, white);
    border-color: color-mix(in srgb, var(--color-purple) 20%, var(--border));
  }

  .revision-summary-actions,
  .revision-session-actions {
    align-items: center;
  }

  .revision-answer-field textarea {
    min-height: 13rem;
    resize: vertical;
  }

  .revision-session-feedback {
    background: color-mix(in srgb, var(--surface-callout) 64%, white);
  }

  .student-question-feedback {
    display: grid;
    gap: 0.75rem;
    padding: 1rem 1.05rem;
    border-radius: 1.2rem;
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--surface-soft) 80%, white);
  }

  .feedback-invite {
    font-size: 0.84rem;
    color: var(--text-soft);
    margin: 0;
  }

  .feedback-chip-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
  }

  .feedback-chip-label {
    font-size: 0.74rem;
    font-weight: 700;
    color: var(--text-soft);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    min-width: 4.5rem;
  }

  .feedback-chip {
    padding: 0.3rem 0.75rem;
    border-radius: 2rem;
    border: 1px solid var(--border);
    background: var(--surface);
    font-size: 0.82rem;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
    color: var(--text);
  }

  .feedback-chip.active {
    background: var(--accent-dim);
    border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
    color: var(--accent);
    font-weight: 600;
  }

  .feedback-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .feedback-submit-btn {
    font-size: 0.84rem;
    padding: 0.4rem 1rem;
  }

  .ghost-btn {
    background: none;
    border: none;
    font-size: 0.82rem;
    color: var(--text-soft);
    cursor: pointer;
    padding: 0.3rem 0.5rem;
  }

  .ghost-btn:hover {
    color: var(--text);
  }

  .feedback-thanks {
    font-size: 0.82rem;
    color: var(--text-soft);
    padding: 0.5rem 0;
  }

  .synthetic-topic-note {
    font-size: 0.83rem;
    color: var(--color-yellow, #d97706);
    background: color-mix(in srgb, #fef3c7 80%, transparent);
    border: 1px solid color-mix(in srgb, #fde68a 60%, transparent);
    border-radius: 0.65rem;
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.25rem;
  }

  .revision-session-context-card {
    background: linear-gradient(180deg, color-mix(in srgb, var(--surface-soft) 84%, white), var(--surface));
  }

  .revision-next-card {
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--color-blue-dim) 44%, white), color-mix(in srgb, var(--accent-dim) 38%, white));
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.72),
      0 10px 24px rgba(15, 23, 42, 0.06);
  }

  .revision-next-note {
    color: var(--text-soft);
    line-height: 1.55;
  }

  .content-grid {
    display: grid;
    grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
    gap: 1rem;
  }

  .content-grid.session-focus-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .content-grid.session-focus-grid .queue-stack {
    display: none;
  }

  .content-grid.session-focus-grid .recall-panel {
    min-height: calc(100vh - 12rem);
    border-radius: 1.75rem;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--surface-high) 42%, var(--surface)), var(--surface));
    box-shadow:
      0 24px 48px rgba(0,0,0,0.22),
      inset 0 1px 0 rgba(255,255,255,0.03);
  }

  .panel-header,
  .topic-row {
    justify-content: space-between;
    align-items: start;
  }

  .hero-card {
    display: grid;
    grid-template-columns: minmax(0, 1.55fr) minmax(16rem, 0.9fr);
    justify-content: space-between;
    align-items: stretch;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-xl);
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--accent-dim) 70%, var(--surface-strong)), var(--surface));
    box-shadow: var(--shadow-strong);
    padding: 1.35rem;
  }

  .revision-outlook-panel {
    position: relative;
    overflow: hidden;
    border: 1px solid transparent;
    border-radius: 1.6rem;
    box-shadow:
      0 10px 24px rgba(15, 23, 42, 0.07),
      0 24px 56px rgba(15, 23, 42, 0.04);
    background:
      radial-gradient(circle at top left, color-mix(in srgb, var(--color-blue-dim) 100%, var(--surface-blend-base)), transparent 40%),
      radial-gradient(circle at 85% 20%, color-mix(in srgb, var(--accent-dim) 95%, var(--surface-blend-base)), transparent 34%),
      radial-gradient(circle at bottom right, color-mix(in srgb, var(--color-purple-dim) 82%, var(--surface-blend-base)), transparent 44%),
      linear-gradient(180deg, color-mix(in srgb, var(--color-blue-dim) 28%, var(--surface-strong)), color-mix(in srgb, var(--surface) 94%, var(--surface-blend-base)));
  }

  /* Build plan invite card */
  .panel.build-plan-invite-card {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: start;
    gap: 1rem;
    background: var(--surface-callout);
    border-color: color-mix(in srgb, var(--accent) 22%, var(--border));
    position: relative;
    overflow: hidden;
    transition: background 180ms var(--ease-soft), border-color 180ms var(--ease-soft);
  }

  .panel.build-plan-invite-card:hover {
    background: color-mix(in srgb, var(--surface-callout) 88%, var(--surface-blend-base));
    border-color: color-mix(in srgb, var(--accent) 32%, var(--border));
  }

  .build-plan-invite-icon {
    font-size: 1.6rem;
    line-height: 1;
    padding-top: 0.15rem;
  }

  .build-plan-invite-body {
    display: grid;
    gap: 0.45rem;
  }

  .build-plan-invite-body h3 {
    font-size: 1.12rem;
    font-weight: 700;
    line-height: 1.2;
  }

  .hero-copy,
  .revision-outlook-main,
  .revision-outlook-copy,
  .revision-outlook-side,
  .hero-side,
  .panel,
  .feedback-card,
  .stat-card,
  .plans-panel,
  .build-plan-panel,
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

  .build-plan-shell {
    display: none;
  }

  .revision-outlook-panel {
    display: grid;
    gap: 1rem;
    grid-template-columns: minmax(0, 1.15fr) minmax(18rem, 0.95fr);
    align-items: center;
  }

  .revision-outlook-main {
    gap: 1rem;
    padding: 1.15rem;
    border-radius: 1.3rem;
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--color-blue-dim) 68%, var(--surface-blend-base)), color-mix(in srgb, var(--accent-dim) 72%, var(--surface-blend-base)));
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.55),
      var(--shadow-sm);
  }

  .revision-outlook-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 1rem;
  }

  .revision-outlook-copy {
    display: grid;
    gap: 0.45rem;
    max-width: 28rem;
  }

  .revision-outlook-subject {
    color: var(--text-soft);
    font-size: 1rem;
    font-weight: 600;
  }

  .revision-outlook-countdown {
    display: grid;
    gap: 0.25rem;
    min-width: 9rem;
    padding: 0.95rem 1rem;
    border-radius: 1.2rem;
    background: var(--surface-overlay);
    box-shadow:
      inset 0 1px 0 var(--surface-overlay-border),
      var(--shadow-sm);
  }

  .revision-outlook-countdown span {
    color: var(--text-soft);
    font-size: 0.76rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .revision-outlook-countdown strong {
    font-size: 1.35rem;
    line-height: 1.1;
  }

  .revision-outlook-summary {
    max-width: 36rem;
    font-size: 1rem;
    line-height: 1.55;
  }

  .revision-outlook-stats {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .revision-signal-card {
    display: grid;
    gap: 0.2rem;
    min-width: 8.5rem;
    padding: 0.85rem 1rem;
    border-radius: 1.1rem;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.5),
      var(--shadow-sm);
  }

  .revision-signal-card span {
    color: var(--text-soft);
    font-size: 0.76rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .revision-signal-card strong {
    font-size: 1.15rem;
    line-height: 1.15;
  }

  .revision-signal-card.tone-teal {
    background: color-mix(in srgb, var(--accent-dim) 92%, var(--surface-blend-base));
  }

  .revision-signal-card.tone-yellow {
    background: color-mix(in srgb, var(--color-yellow-dim) 92%, var(--surface-blend-base));
  }

  .revision-signal-card.tone-purple {
    background: color-mix(in srgb, var(--color-purple-dim) 92%, var(--surface-blend-base));
  }

  .revision-signal-card.tone-blue {
    background: color-mix(in srgb, var(--color-blue-dim) 92%, var(--surface-blend-base));
  }

  .revision-signal-card.tone-green {
    background: color-mix(in srgb, var(--color-green-dim) 92%, var(--surface-blend-base));
  }

  .revision-outlook-side {
    gap: 0.8rem;
  }

  .revision-outlook-side-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
  }

  .revision-plan-preview-grid {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .revision-plan-preview {
    display: grid;
    gap: 0.35rem;
    padding: 0.95rem 1rem;
    border-radius: 1.1rem;
    box-shadow: var(--shadow-sm);
    transition:
      transform 150ms var(--ease-soft),
      box-shadow 180ms var(--ease-soft);
  }

  .revision-plan-preview:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .revision-plan-preview strong {
    font-size: 0.98rem;
    line-height: 1.25;
  }

  .revision-plan-preview span,
  .revision-plan-preview p {
    color: var(--text-soft);
    font-size: 0.84rem;
  }

  .revision-plan-preview.tone-0 {
    background: color-mix(in srgb, var(--color-blue-dim) 90%, var(--surface-blend-base));
  }

  .revision-plan-preview.tone-1 {
    background: color-mix(in srgb, var(--color-purple-dim) 90%, var(--surface-blend-base));
  }

  .revision-plan-preview.tone-2 {
    background: color-mix(in srgb, var(--color-yellow-dim) 90%, var(--surface-blend-base));
  }

  .revision-plan-preview.tone-3 {
    background: color-mix(in srgb, var(--accent-dim) 90%, var(--surface-blend-base));
  }

  .revision-plan-preview-topline {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 0.75rem;
  }

  .preview-badge {
    padding: 0.26rem 0.55rem;
    border-radius: 999px;
    background: rgba(255,255,255,0.72);
    color: var(--text-soft);
    font-size: 0.72rem;
    font-weight: 700;
  }

  .build-plan-copy {
    display: grid;
    gap: 0.55rem;
    max-width: 34rem;
  }

  .build-plan-header {
    align-items: end;
  }

  .build-plan-summary {
    color: var(--text-soft);
    font-size: 1.02rem;
    line-height: 1.55;
  }

  .build-plan-panel .build-plan-summary {
    max-width: 36rem;
  }

  .build-plan-actions {
    align-items: center;
    justify-self: end;
  }

  .build-plan-cta {
    min-width: 11rem;
    box-shadow: 0 10px 24px color-mix(in srgb, var(--accent) 18%, transparent);
  }

  .hero-side {
    min-width: min(100%, 21rem);
    align-content: start;
    justify-items: stretch;
  }

  .recommendation-copy {
    gap: 0.75rem;
  }

  .recommendation-heading {
    color: var(--text);
    font-size: 1.12rem;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.01em;
    margin: 0;
  }

  .recommendation-topic {
    font-size: clamp(1rem, 0.96rem + 0.18vw, 1.08rem);
    line-height: 1.26;
    letter-spacing: -0.005em;
    font-weight: 600;
  }

  .hero-stats {
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .stat-card {
    min-width: 6rem;
    padding: 0.85rem 0.95rem;
    border-radius: 1rem;
    border: 1px solid var(--border);
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--surface-high) 70%, transparent), color-mix(in srgb, var(--surface) 88%, transparent));
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.03),
      0 10px 18px rgba(0,0,0,0.12);
  }

  .stat-card strong {
    font-size: 1.35rem;
  }

  .hero-support {
    font-size: 1.05rem;
    line-height: 1.5;
  }

  .recommendation-summary {
    max-width: 40rem;
    font-size: 1rem;
    line-height: 1.6;
  }

  .revision-source-note {
    color: var(--text-soft);
    font-size: 0.88rem;
  }

  .recommendation-context {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem 1rem;
    color: var(--text-soft);
    font-size: 0.92rem;
    line-height: 1.45;
  }

  .recommendation-context span {
    position: relative;
  }

  .recommendation-context span:not(:first-child)::before {
    content: '';
    position: absolute;
    left: -0.55rem;
    top: 50%;
    width: 0.2rem;
    height: 0.2rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--text-soft) 48%, transparent);
    transform: translateY(-50%);
  }

  .recommendation-side {
    display: grid;
    align-content: end;
    justify-items: end;
  }

  .recommendation-cta {
    min-width: 15rem;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.06),
      0 12px 28px color-mix(in srgb, var(--accent) 20%, transparent);
  }

  .recommendation-cta:hover {
    transform: translateY(-2px);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.08),
      0 18px 34px color-mix(in srgb, var(--accent) 24%, transparent);
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

  .plans-panel {
    border: 1px solid var(--border);
    border-radius: 1.5rem;
    background: var(--surface);
    padding: 1.2rem;
  }

  .revise-now-card {
    grid-template-columns: minmax(0, 1.55fr) minmax(16rem, 0.9fr);
    background:
      radial-gradient(circle at top left, color-mix(in srgb, var(--color-blue-dim) 78%, white), transparent 42%),
      radial-gradient(circle at 70% 25%, color-mix(in srgb, var(--accent-dim) 62%, white), transparent 36%),
      linear-gradient(180deg, color-mix(in srgb, var(--surface-callout) 18%, var(--surface-strong)), var(--surface));
  }

  .plan-grid {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }

  .plan-card {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    padding: 1.1rem 1.15rem;
    border-radius: 1.4rem;
    border: 1px solid var(--border);
    background: var(--surface-soft);
    transition:
      transform 150ms var(--ease-soft),
      border-color 150ms var(--ease-soft),
      box-shadow 180ms var(--ease-soft),
      background 180ms var(--ease-soft);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.02),
      0 4px 12px rgba(0,0,0,0.06);
  }

  .plan-card:hover {
    transform: translateY(-3px);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.03),
      0 10px 24px rgba(0,0,0,0.12);
  }

  .plan-card.tone-0 {
    background: color-mix(in srgb, var(--color-blue-dim) 70%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--color-blue) 16%, var(--border));
  }

  .plan-card.tone-1 {
    background: color-mix(in srgb, var(--color-purple-dim) 70%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--color-purple) 16%, var(--border));
  }

  .plan-card.tone-2 {
    background: color-mix(in srgb, var(--color-yellow-dim) 70%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--color-yellow) 16%, var(--border));
  }

  .plan-card.tone-0:hover {
    background: color-mix(in srgb, var(--color-blue-dim) 100%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--color-blue) 28%, var(--border));
  }

  .plan-card.tone-1:hover {
    background: color-mix(in srgb, var(--color-purple-dim) 100%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--color-purple) 28%, var(--border));
  }

  .plan-card.tone-2:hover {
    background: color-mix(in srgb, var(--color-yellow-dim) 100%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--color-yellow) 28%, var(--border));
  }

  .plan-card.active-plan {
    border-color: color-mix(in srgb, var(--accent) 36%, var(--border));
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent),
      0 4px 12px rgba(0,0,0,0.06);
  }

  .plan-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.85rem;
  }

  .plan-card-toprow {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 0.6rem;
  }

  .plan-card-title-block {
    display: grid;
    gap: 0.3rem;
    min-width: 0;
    flex: 1 1 auto;
  }

  .plan-active-badge {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 0.25rem 0.65rem;
    background: var(--accent);
    color: var(--accent-contrast);
    font-size: 0.72rem;
    font-weight: 600;
    width: fit-content;
    margin-bottom: 0.15rem;
  }

  .plan-card-aside {
    display: grid;
    justify-items: end;
    gap: 0.45rem;
    flex-shrink: 0;
  }

  .plan-remove-btn {
    border: 1px solid color-mix(in srgb, var(--color-error) 20%, var(--border));
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-error) 12%, var(--surface));
    color: color-mix(in srgb, var(--color-error) 70%, var(--text));
    padding: 0.32rem 0.72rem;
    font: inherit;
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1;
    cursor: pointer;
    transition:
      color 140ms var(--ease-soft),
      border-color 140ms var(--ease-soft),
      background 140ms var(--ease-soft),
      box-shadow 140ms var(--ease-soft),
      transform 140ms var(--ease-soft);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.3);
  }

  .plan-remove-btn:hover {
    color: var(--color-error);
    border-color: color-mix(in srgb, var(--color-error) 34%, var(--border));
    background: color-mix(in srgb, var(--color-error) 18%, var(--surface));
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.38),
      0 6px 14px color-mix(in srgb, var(--color-error) 10%, transparent);
    transform: translateY(-1px);
  }

  .plan-remove-btn:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--color-error) 16%, transparent),
      inset 0 1px 0 rgba(255,255,255,0.4);
  }

  .plan-countdown {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    padding: 0.45rem 0.75rem;
    border-radius: 1rem;
    background: rgba(0, 0, 0, 0.04);
    border: 1px solid var(--border);
    min-width: 4.5rem;
    text-align: center;
  }

  .plan-countdown--urgent {
    background: var(--color-orange-dim);
    border-color: color-mix(in srgb, var(--color-orange) 25%, var(--border));
  }

  .plan-countdown--urgent .plan-countdown-num {
    color: var(--color-orange);
  }

  .plan-countdown-num {
    font-size: 1.35rem;
    font-weight: 800;
    line-height: 1.1;
    color: var(--text);
  }

  .plan-countdown-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-soft);
    white-space: nowrap;
  }

  .plan-card-name {
    font-size: 1.15rem;
    font-weight: 700;
    line-height: 1.15;
  }

  .plan-card-subject {
    color: var(--text-soft);
    font-size: 1rem;
    line-height: 1.35;
  }

  /* Semantic chips used in plan cards */
  .plan-chips-row {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .plan-chip {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 0.32rem 0.7rem;
    background: var(--surface-soft);
    border: 1px solid var(--border-strong);
    color: var(--text-soft);
    font-size: 0.85rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .plan-chip--active {
    background: var(--accent-dim);
    border-color: color-mix(in srgb, var(--accent) 30%, var(--border));
    color: var(--accent);
  }

  .plan-chip--info {
    background: var(--color-blue-dim);
    border-color: color-mix(in srgb, var(--color-blue) 20%, var(--border));
    color: var(--color-blue);
  }

  .plan-chip--subject {
    background: color-mix(in srgb, var(--session-subject-color, var(--color-blue)) 12%, transparent);
    border-color: color-mix(in srgb, var(--session-subject-color, var(--color-blue)) 28%, var(--border));
    color: var(--session-subject-color, var(--color-blue));
    font-weight: 700;
  }

  .session-subject-eyebrow {
    color: var(--session-subject-color, var(--text-soft));
    font-weight: 800;
    letter-spacing: 0.06em;
  }

  .plan-chip--warn {
    background: var(--color-yellow-dim);
    border-color: color-mix(in srgb, var(--color-yellow) 20%, var(--border));
    color: var(--color-yellow);
  }

  .plan-actions,
  .empty-plan-state {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .plan-start-btn {
    margin-top: auto;
    justify-self: stretch;
    width: 100%;
    min-height: var(--touch-target);
    justify-content: center;
  }

  .empty-plan-state {
    justify-content: space-between;
    align-items: center;
  }

  .plans-panel .panel-header > div {
    display: grid;
    gap: 0.2rem;
  }

  .plans-panel .panel-header h3 {
    font-size: 1.12rem;
    font-weight: 700;
    line-height: 1.2;
  }

  .plans-summary {
    color: var(--text-soft);
    max-width: 36rem;
  }

  .plans-count {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 0.35rem 0.7rem;
    background: color-mix(in srgb, var(--surface-soft) 82%, white);
    border: 1px solid var(--border);
    color: var(--text-soft);
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1;
  }

  .plan-subject {
    color: var(--text-soft);
    font-size: 0.85rem;
    margin-top: 0.2rem;
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

  .manual-topic-field,
  .manual-match-block {
    display: grid;
    gap: 0.55rem;
  }

  .manual-topic-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .planner-loading-state {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
  }

  .manual-topic-header small,
  .manual-match-block small {
    color: var(--text-soft);
    font-size: 0.76rem;
  }

  .manual-topic-help {
    color: var(--muted);
    font-size: 0.76rem;
    line-height: 1.5;
  }

  .planner-pill-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
  }

  .planner-pill-loader {
    display: grid;
    place-items: center;
    min-height: 3rem;
    padding: 0.35rem 0;
  }

  .planner-pill {
    position: relative;
    overflow: hidden;
    transition:
      transform 140ms var(--ease-soft),
      border-color 200ms var(--ease-soft),
      background 200ms var(--ease-soft),
      box-shadow 180ms var(--ease-soft),
      color 200ms var(--ease-soft);
    border: 1px solid var(--border-strong);
    border-radius: 999px;
    background: var(--surface-soft);
    color: var(--text-soft);
    padding: 0.32rem 0.75rem;
    font: inherit;
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1.2;
    cursor: pointer;
  }

  .planner-pill:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--accent) 36%, var(--border-strong));
    background: color-mix(in srgb, var(--accent-dim) 60%, var(--surface-soft));
    color: var(--text);
    box-shadow: 0 3px 8px rgba(0,0,0,0.08);
  }

  .planner-pill:active {
    transform: translateY(0) scale(0.975);
  }

  .planner-pill:focus-visible {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
  }

  .planner-pill.selected {
    border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
    background: var(--accent-dim);
    color: var(--accent);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent);
  }

  .planner-pill--matched {
    border-color: color-mix(in srgb, var(--accent) 28%, var(--border-strong));
    background: color-mix(in srgb, var(--accent-dim) 50%, var(--surface-soft));
  }

  .planner-pill--matched:not(.selected)::after {
    content: 'Matched';
    margin-left: 0.45rem;
    opacity: 0.82;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: color-mix(in srgb, var(--accent) 56%, var(--text-soft));
  }

  .field input,
  .field select {
    transition:
      border-color 150ms var(--ease-soft),
      box-shadow 150ms var(--ease-soft);
  }

  .planner-date-field {
    cursor: pointer;
  }

  .planner-date-field input {
    cursor: pointer;
  }

  .field-error input {
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

  .revision-focus-panel {
    gap: 1rem;
  }

  .focus-tablist,
  .focus-context,
  .focus-empty-state {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .focus-tablist {
    padding: 0.35rem;
    border-radius: 1rem;
    border: 1px solid var(--border);
    background: var(--surface-soft);
  }

  .focus-tab {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.65rem;
    min-width: 0;
    flex: 1 1 10rem;
    padding: 0.72rem 0.9rem;
    border: 1px solid transparent;
    border-radius: 0.9rem;
    background: transparent;
    color: var(--text-soft);
    font: inherit;
    font-weight: 600;
    transition:
      transform 140ms var(--ease-soft),
      background 180ms var(--ease-soft),
      border-color 180ms var(--ease-soft),
      color 180ms var(--ease-soft),
      box-shadow 180ms var(--ease-soft);
    cursor: pointer;
  }

  .focus-tab strong {
    color: inherit;
    font-size: 0.82rem;
  }

  .focus-tab:hover {
    color: var(--text);
    background: color-mix(in srgb, var(--surface-high) 72%, transparent);
  }

  .focus-tab.active {
    color: var(--text);
    border-color: color-mix(in srgb, var(--accent) 28%, var(--border));
    background: color-mix(in srgb, var(--accent) 12%, var(--surface));
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.04),
      0 10px 18px rgba(0,0,0,0.08);
  }

  .focus-summary {
    color: var(--text-soft);
    line-height: 1.5;
  }

  .focus-queue {
    gap: 0.8rem;
  }

  .focus-empty-state {
    justify-content: space-between;
    align-items: center;
    padding: 0.95rem 1rem;
    border-radius: 1rem;
    border: 1px dashed var(--border);
    background: var(--surface-soft);
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
    transition:
      transform 150ms var(--ease-soft),
      border-color 150ms var(--ease-soft),
      background 180ms var(--ease-soft),
      box-shadow 180ms var(--ease-soft);
    cursor: pointer;
  }

  .topic-button:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--accent) 18%, var(--border));
    box-shadow: 0 12px 24px rgba(0,0,0,0.12);
  }

  .topic-button.weakness {
    background: color-mix(in srgb, var(--color-orange-dim) 48%, var(--surface-soft));
  }

  .topic-button.exam {
    background: color-mix(in srgb, var(--color-blue-dim) 42%, var(--surface-soft));
  }

  .topic-button.library {
    background: color-mix(in srgb, var(--color-purple-dim) 34%, var(--surface-soft));
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
    font-weight: 600;
    transition:
      transform 140ms var(--ease-soft),
      box-shadow 180ms var(--ease-soft),
      background 180ms var(--ease-soft),
      border-color 180ms var(--ease-soft);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.05),
      0 10px 22px color-mix(in srgb, var(--accent) 18%, transparent);
    cursor: pointer;
  }

  .action-btn:hover {
    transform: translateY(-1px);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.06),
      0 14px 28px color-mix(in srgb, var(--accent) 22%, transparent);
  }

  .action-btn:active {
    transform: translateY(0) scale(0.985);
  }

  .action-btn:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent),
      0 12px 24px color-mix(in srgb, var(--accent) 20%, transparent);
  }

  .secondary {
    background: var(--surface-soft);
    color: var(--text);
    border: 1px solid var(--border);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.03),
      0 8px 18px rgba(0,0,0,0.08);
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

  /* Planner modal overlay */
  .planner-shell {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
  }

  .planner-backdrop {
    position: absolute;
    inset: 0;
    border: 0;
    margin: 0;
    padding: 0;
    background: rgba(0, 0, 0, 0.42);
    backdrop-filter: blur(2px);
    animation: backdrop-fade 200ms ease both;
    cursor: default;
  }

  @keyframes backdrop-fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .planner-modal {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 600px;
    max-height: calc(100svh - 3rem);
    overflow-y: auto;
    background: var(--surface-strong);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-xl);
    padding: 1.5rem;
    display: grid;
    gap: 1.2rem;
    box-shadow:
      0 24px 56px rgba(0, 0, 0, 0.18),
      0 8px 20px rgba(0, 0, 0, 0.12);
    animation: modal-rise 220ms var(--ease-spring) both;
  }

  .plan-removal-modal {
    max-width: 31rem;
    gap: 1rem;
    background:
      radial-gradient(circle at top right, color-mix(in srgb, var(--color-error) 12%, white), transparent 34%),
      linear-gradient(180deg, color-mix(in srgb, var(--surface-callout) 32%, white), var(--surface));
    border-color: color-mix(in srgb, var(--color-error) 22%, var(--border-strong));
  }

  .plan-removal-copy {
    display: grid;
    gap: 0.55rem;
  }

  .plan-removal-kicker {
    display: inline-flex;
    align-items: center;
    justify-self: start;
    border-radius: 999px;
    padding: 0.35rem 0.7rem;
    background: color-mix(in srgb, var(--color-error) 14%, var(--surface));
    border: 1px solid color-mix(in srgb, var(--color-error) 22%, var(--border));
    color: color-mix(in srgb, var(--color-error) 72%, var(--text));
    font-size: 0.78rem;
    font-weight: 700;
    line-height: 1;
  }

  .plan-removal-copy h2 {
    font-size: clamp(1.25rem, 1.06rem + 0.35vw, 1.5rem);
    line-height: 1.08;
    letter-spacing: -0.02em;
  }

  .plan-removal-copy p {
    color: var(--text-soft);
    line-height: 1.6;
    max-width: 32ch;
  }

  .plan-removal-actions {
    justify-content: flex-end;
  }

  .plan-remove-confirm-btn {
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--color-error) 42%, white), color-mix(in srgb, var(--color-error) 22%, var(--surface)));
    border: 1px solid color-mix(in srgb, var(--color-error) 28%, var(--border));
    color: color-mix(in srgb, var(--color-error) 78%, var(--text));
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.4),
      0 12px 24px color-mix(in srgb, var(--color-error) 14%, transparent);
  }

  .plan-remove-confirm-btn:hover {
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--color-error) 50%, white), color-mix(in srgb, var(--color-error) 28%, var(--surface)));
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.44),
      0 16px 28px color-mix(in srgb, var(--color-error) 18%, transparent);
  }

  @keyframes modal-rise {
    from { opacity: 0; transform: translateY(14px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .planner-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 1rem;
  }

  .planner-modal-header h2 {
    font-size: 1.2rem;
    font-weight: 700;
    line-height: 1.2;
  }

  .planner-close-btn {
    flex-shrink: 0;
    font-size: 0.85rem;
    padding: 0.5rem 1rem;
  }

  .planner-modal .action-btn:hover,
  .planner-modal .action-btn:active,
  .planner-modal .planner-pill:hover,
  .planner-modal .planner-pill:active {
    transform: none;
  }

  @media (max-width: 980px) {
    .content-grid,
    .hero-card,
    .revision-outlook-panel,
    .revision-session-hero,
    .revision-session-layout {
      grid-template-columns: 1fr;
    }

    .planner-modal {
      padding: 1.25rem;
    }

    .revision-plan-preview-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .build-plan-invite-card {
      grid-template-columns: auto 1fr;
    }

    .hero-card {
      display: grid;
    }

    .hero-side {
      justify-items: start;
    }

    .recommendation-side {
      align-content: start;
      justify-items: start;
    }

    .revision-session-topbar {
      flex-wrap: wrap;
      align-items: flex-start;
    }

    .revision-session-topbar-meta {
      justify-content: flex-start;
    }

    .session-progress-card {
      max-width: 100%;
    }

    .hero-stats {
      justify-content: start;
    }
  }

  @media (max-width: 720px) {
    .content-grid {
      grid-template-columns: 1fr;
    }

    .revision-summary-metrics {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 540px) {
    .workspace {
      gap: 0.85rem;
    }

    .hero-meta,
    .actions,
    .hero-actions,
    .build-plan-actions,
    .revision-session-actions,
    .revision-summary-actions {
      flex-direction: column;
      align-items: flex-start;
    }

    .recommendation-context {
      flex-direction: column;
      gap: 0.4rem;
    }

    .recommendation-context span:not(:first-child)::before {
      display: none;
    }

    .planner-grid {
      grid-template-columns: 1fr;
    }

    .focus-tablist,
    .focus-empty-state,
    .revision-outlook-header,
    .revision-outlook-countdown {
      width: 100%;
    }

    .focus-tab {
      flex-basis: calc(50% - 0.4rem);
    }

    .revision-outlook-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .revision-plan-preview-grid {
      grid-template-columns: 1fr;
    }

    .mode-list {
      grid-template-columns: 1fr;
    }

    .plan-card-header,
    .empty-plan-state {
      align-items: flex-start;
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
    .feedback-card,
    .revision-session-hero,
    .session-question-card,
    .revision-summary-card,
    .revision-session-feedback,
    .revision-session-context-card,
    .revision-next-card {
      padding: 1rem;
      border-radius: 1.1rem;
    }

    .revision-session-topbar-copy {
      width: 100%;
    }

    .revision-session-pill-row {
      gap: 0.4rem;
    }

    .queue-list {
      grid-auto-flow: column;
      grid-template-columns: unset;
      grid-auto-columns: min(15rem, 78vw);
      overflow-x: auto;
      scrollbar-width: none;
    }

    .focus-tablist {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .focus-tab {
      min-width: 0;
      flex-basis: auto;
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
