import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { createInitialState } from '$lib/data/platform';
import { buildRevisionSession } from '$lib/revision/engine';
import type {
  DashboardTopicDiscoverySuggestion,
  LessonSession,
  RevisionPackRequest,
  RevisionPackResponse,
  RevisionQuestion,
  RevisionTopic
} from '$lib/types';
import { appState, createAppStore, lessonSessionStore, profileStore, uiStore, revisionStore } from './app-state';

const { getAuthenticatedHeaders, fetchMock } = vi.hoisted(() => ({
  getAuthenticatedHeaders: vi.fn(),
  fetchMock: vi.fn()
}));

vi.mock('$lib/authenticated-fetch', () => ({
  getAuthenticatedHeaders
}));

function createRevisionTopic(overrides: Partial<RevisionTopic> = {}): RevisionTopic {
  return {
    lessonSessionId: 'revision-session-1',
    nodeId: 'graph-subtopic-fractions',
    subjectId: 'subject-1',
    subject: 'Mathematics',
    topicTitle: 'Fractions',
    curriculumReference: 'CAPS Grade 6',
    confidenceScore: 0.42,
    previousIntervalDays: 3,
    nextRevisionAt: '2026-03-30T08:00:00.000Z',
    lastReviewedAt: '2026-03-27T08:00:00.000Z',
    retentionStability: 0.44,
    forgettingVelocity: 0.58,
    misconceptionSignals: [],
    calibration: {
      attempts: 1,
      averageSelfConfidence: 3,
      averageCorrectness: 0.42,
      confidenceGap: 0.18,
      overconfidenceCount: 0,
      underconfidenceCount: 0
    },
    ...overrides
  };
}

function createRevisionQuestion(
  topic: RevisionTopic,
  id: string,
  questionType: RevisionQuestion['questionType']
): RevisionQuestion {
  return {
    id,
    revisionTopicId: topic.lessonSessionId,
    nodeId: topic.nodeId ?? null,
    questionType,
    prompt: `${questionType} ${topic.topicTitle}`,
    expectedSkills: ['explain clearly', 'use one example'],
    misconceptionTags: [`${topic.topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-core-gap`],
    difficulty: questionType === 'apply' || questionType === 'teacher_mode' ? 'core' : 'foundation',
    helpLadder: {
      nudge: `Start with the core idea in ${topic.topicTitle}.`,
      hint: `Use one clear example from ${topic.subject}.`,
      workedStep: `1. Define ${topic.topicTitle}. 2. Explain the rule. 3. Give one example.`,
      miniReteach: `${topic.topicTitle} needs a slower rebuild from the definition upward.`,
      lessonRefer: `Go back to lesson mode for a step-by-step reteach of ${topic.topicTitle}.`
    }
  };
}

function buildMockRevisionPackPayload(request: RevisionPackRequest): RevisionPackResponse {
  const resolvedTopics = request.topics.map((topic, index) => ({
    ...topic,
    nodeId: topic.nodeId ?? `graph-topic-${index + 1}`
  }));
  const typePool: RevisionQuestion['questionType'][] =
    request.mode === 'quick_fire'
      ? ['recall']
      : request.mode === 'teacher_mode'
        ? ['teacher_mode', 'recall']
        : request.mode === 'shuffle'
          ? ['recall', 'apply', 'transfer']
          : ['recall', 'explain'];
  const questions = typePool.map((questionType, index) =>
    createRevisionQuestion(resolvedTopics[index % resolvedTopics.length]!, `question-${index + 1}`, questionType)
  );

  return {
    session: buildRevisionSession({
      topics: resolvedTopics,
      recommendationReason: request.recommendationReason,
      mode: request.mode,
      source: request.source,
      questions,
      nodeId: resolvedTopics[0]?.nodeId ?? null,
      revisionPackArtifactId: 'revision-pack-artifact-1',
      revisionQuestionArtifactId: 'revision-question-artifact-1',
      revisionPlanId: request.revisionPlanId,
      sessionTitle: request.mode === 'shuffle' ? 'Mixed shuffle session' : resolvedTopics[0]?.topicTitle ?? 'Revision',
      sessionRecommendations: ['Repair the weakest recall gap first.']
    }),
    resolvedTopics: resolvedTopics.map((topic) => ({
      lessonSessionId: topic.lessonSessionId,
      nodeId: topic.nodeId ?? null
    })),
    provider: 'github-models',
    revisionPackArtifactId: 'revision-pack-artifact-1',
    revisionQuestionArtifactId: 'revision-question-artifact-1',
    model: 'openai/gpt-4.1-mini'
  };
}

function createLessonSession(overrides: Partial<LessonSession> = {}): LessonSession {
  return {
    id: 'revision-session-1',
    studentId: 'student-1',
    subjectId: 'subject-1',
    subject: 'Mathematics',
    topicId: 'topic-1',
    topicTitle: 'Fractions',
    topicDescription: 'Fractions compare parts of a whole.',
    curriculumReference: 'CAPS Grade 6',
    matchedSection: 'Fractions',
    lessonId: 'generated-lesson-1',
    currentStage: 'complete',
    stagesCompleted: ['orientation', 'concepts', 'construction', 'examples', 'practice', 'check', 'complete'],
    messages: [],
    questionCount: 0,
    reteachCount: 0,
    confidenceScore: 0.42,
    needsTeacherReview: false,
    stuckConcept: null,
    startedAt: '2026-03-27T08:00:00.000Z',
    lastActiveAt: '2026-03-27T08:15:00.000Z',
    completedAt: '2026-03-27T08:15:00.000Z',
    status: 'complete',
    profileUpdates: [],
    ...overrides
  };
}

function createDiscoverySuggestion(
  overrides: Partial<DashboardTopicDiscoverySuggestion> = {}
): DashboardTopicDiscoverySuggestion {
  return {
    topicSignature: 'subject-1::caps::grade-6::equivalent fractions',
    topicLabel: 'Equivalent Fractions',
    nodeId: 'graph-topic-fractions',
    source: 'graph_existing',
    rank: 1,
    reason: 'Strong graph match',
    sampleSize: 3,
    thumbsUpCount: 2,
    thumbsDownCount: 0,
    completionRate: 0.8,
    freshness: 'stable',
    feedback: null,
    feedbackPending: false,
    ...overrides
  };
}

function createDeferredResponse() {
  let resolve!: (value: Response) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<Response>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

async function flushAsyncWork(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('domain store slices', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getAuthenticatedHeaders.mockResolvedValue({
      Authorization: 'Bearer token'
    });
    fetchMock.mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.endsWith('/api/ai/revision-pack')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as { request: RevisionPackRequest };
        return new Response(JSON.stringify(buildMockRevisionPackPayload(body.request)), {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }

      return new Response(JSON.stringify({ error: `Unhandled request for ${url}` }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  // T5.1a: derived slices return the correct sub-state
  it('lessonSessionStore returns active lesson sessions', () => {
    const sessions = get(lessonSessionStore);
    expect(Array.isArray(sessions)).toBe(true);
  });

  it('profileStore returns the user profile', () => {
    const profile = get(profileStore);
    expect(profile).toHaveProperty('id');
    expect(profile).toHaveProperty('fullName');
  });

  it('uiStore returns the ui slice', () => {
    const ui = get(uiStore);
    expect(ui).toHaveProperty('currentScreen');
    expect(ui).toHaveProperty('composerDraft');
  });

  it('revisionStore returns revision topics', () => {
    const revision = get(revisionStore);
    expect(Array.isArray(revision)).toBe(true);
  });
});

describe('revision session loop', () => {
  it('keeps the same question active after a weak answer that needs rechecking', async () => {
    const baseState = createInitialState();
    const topic = createRevisionTopic();
    const store = createAppStore({
      ...baseState,
      lessonSessions: [createLessonSession({ id: topic.lessonSessionId, subjectId: topic.subjectId, subject: topic.subject, topicTitle: topic.topicTitle, curriculumReference: topic.curriculumReference })],
      revisionTopics: [topic]
    });

    await store.runRevisionSession(topic);
    store.submitRevisionAnswer('Not sure.', 2);

    const state = get(store);

    expect(state.revisionSession?.questionIndex).toBe(0);
    expect(state.revisionSession?.lastTurnResult?.sessionDecision).toBe('reschedule');
    expect(state.revisionSession?.lastTurnResult?.nextQuestion?.id).toBe(
      state.revisionSession?.questions[0]?.id
    );
  });

  it('starts a revision session in the selected mode', async () => {
    const baseState = createInitialState();
    const topic = createRevisionTopic();
    const store = createAppStore({
      ...baseState,
      lessonSessions: [createLessonSession({ id: topic.lessonSessionId, subjectId: topic.subjectId, subject: topic.subject, topicTitle: topic.topicTitle, curriculumReference: topic.curriculumReference })],
      revisionTopics: [topic]
    });

    await store.runRevisionSession(topic, {
      mode: 'teacher_mode',
      source: 'manual',
      recommendationReason: 'Teach it back to lock the idea in'
    });

    const state = get(store);

    expect(state.revisionSession?.mode).toBe('teacher_mode');
    expect(state.revisionSession?.questions.some((question) => question.questionType === 'teacher_mode')).toBe(true);
    expect(state.revisionSession?.recommendationReason).toBe('Teach it back to lock the idea in');
  });

  it('updates the topic attached to the active shuffle question instead of always using the primary topic', async () => {
    const baseState = createInitialState();
    const firstTopic = createRevisionTopic();
    const secondTopic = createRevisionTopic({
      lessonSessionId: 'revision-session-2',
      topicTitle: 'Area',
      confidenceScore: 0.61
    });
    const store = createAppStore({
      ...baseState,
      lessonSessions: [
        createLessonSession({
          id: firstTopic.lessonSessionId,
          subjectId: firstTopic.subjectId,
          subject: firstTopic.subject,
          topicTitle: firstTopic.topicTitle,
          curriculumReference: firstTopic.curriculumReference
        }),
        createLessonSession({
          id: secondTopic.lessonSessionId,
          subjectId: secondTopic.subjectId,
          subject: secondTopic.subject,
          topicTitle: secondTopic.topicTitle,
          curriculumReference: secondTopic.curriculumReference
        })
      ],
      revisionTopics: [firstTopic, secondTopic]
    });

    await store.runRevisionSession(firstTopic, {
      mode: 'shuffle',
      source: 'do_today',
      recommendationReason: 'Mix the next revision moves',
      topicSet: [firstTopic, secondTopic]
    });

    store.submitRevisionAnswer(
      'Fractions compare parts of a whole because the denominator is the total and the numerator is the selected part with one example.',
      4
    );
    store.advanceRevisionTurn();
    store.submitRevisionAnswer('Not sure.', 2);

    const state = get(store);
    const latestAttempt = state.revisionAttempts[0];
    const updatedSecondTopic = state.revisionTopics.find((topic) => topic.lessonSessionId === secondTopic.lessonSessionId);

    expect(state.revisionSession?.questions[1]?.revisionTopicId).toBe(secondTopic.lessonSessionId);
    expect(latestAttempt?.revisionTopicId).toBe(secondTopic.lessonSessionId);
    expect(updatedSecondTopic?.lastReviewedAt).not.toBeNull();
  });

  it('persists calibration changes back onto the revision topic after an answer', async () => {
    const baseState = createInitialState();
    const topic = createRevisionTopic();
    const store = createAppStore({
      ...baseState,
      lessonSessions: [createLessonSession({ id: topic.lessonSessionId, subjectId: topic.subjectId, subject: topic.subject, topicTitle: topic.topicTitle, curriculumReference: topic.curriculumReference })],
      revisionTopics: [topic]
    });

    await store.runRevisionSession(topic);
    store.submitRevisionAnswer('I am completely sure, but I cannot explain it.', 5);

    const state = get(store);
    const updatedTopic = state.revisionTopics[0];

    expect(updatedTopic?.calibration.attempts).toBe(2);
    expect(updatedTopic?.calibration.averageSelfConfidence).toBeGreaterThan(3);
    expect(updatedTopic?.calibration.confidenceGap).toBeGreaterThan(0.18);
  });

  it('creates a focused mini-lesson handoff when revision escalates', async () => {
    const baseState = createInitialState();
    const topic = createRevisionTopic();
    const originalLessonSession = createLessonSession({
      id: topic.lessonSessionId,
      subjectId: topic.subjectId,
      subject: topic.subject,
      topicTitle: topic.topicTitle,
      curriculumReference: topic.curriculumReference
    });
    const store = createAppStore({
      ...baseState,
      lessonSessions: [originalLessonSession],
      revisionTopics: [topic]
    });

    await store.runRevisionSession(topic);
    store.markRevisionStuck();
    store.escalateToLesson();
    store.startRevisionLessonHandoff();

    const state = get(store);
    const handoffSession = state.lessonSessions[0];

    expect(handoffSession?.id).not.toBe(originalLessonSession.id);
    expect(handoffSession?.status).toBe('active');
    expect(handoffSession?.currentStage).toBe('concepts');
    expect(handoffSession?.messages.some((message) => /revision handoff|reteach/i.test(message.content))).toBe(true);
    expect(state.ui.currentScreen).toBe('lesson');
    expect(state.ui.activeLessonSessionId).toBe(handoffSession?.id);
  });

  it('can exit an active revision session back to the regular revision tab', async () => {
    const baseState = createInitialState();
    const topic = createRevisionTopic();
    const store = createAppStore({
      ...baseState,
      lessonSessions: [
        createLessonSession({
          id: topic.lessonSessionId,
          subjectId: topic.subjectId,
          subject: topic.subject,
          topicTitle: topic.topicTitle,
          curriculumReference: topic.curriculumReference
        })
      ],
      revisionTopics: [topic]
    });

    await store.runRevisionSession(topic, {
      mode: 'deep_revision',
      source: 'exam_plan',
      recommendationReason: 'Start revision for Math exam'
    });
    store.exitRevisionSession();

    const state = get(store);

    expect(state.revisionSession).toBeNull();
    expect(state.ui.currentScreen).toBe('revision');
    expect(state.ui.learningMode).toBe('revision');
    expect(state.ui.activeLessonSessionId).toBe(topic.lessonSessionId);
  });

  it('uses repeated misconception signals in the mini-lesson handoff brief', async () => {
    const baseState = createInitialState();
    const topic = createRevisionTopic({
      misconceptionSignals: [{ tag: 'fractions-core-gap', count: 2, lastSeenAt: '2026-03-29T08:00:00.000Z' }]
    });
    const originalLessonSession = createLessonSession({
      id: topic.lessonSessionId,
      subjectId: topic.subjectId,
      subject: topic.subject,
      topicTitle: topic.topicTitle,
      curriculumReference: topic.curriculumReference
    });
    const store = createAppStore({
      ...baseState,
      lessonSessions: [originalLessonSession],
      revisionTopics: [topic]
    });

    await store.runRevisionSession(topic);
    store.markRevisionStuck();
    store.escalateToLesson();
    store.startRevisionLessonHandoff();

    const state = get(store);
    const handoffSession = state.lessonSessions[0];

    expect(handoffSession?.messages.some((message) => /repeated gap|fractions core gap/i.test(message.content))).toBe(true);
  });

  it('keeps the revision session active when the student marks the question as stuck', async () => {
    const baseState = createInitialState();
    const topic = createRevisionTopic();
    const store = createAppStore({
      ...baseState,
      lessonSessions: [
        createLessonSession({
          id: topic.lessonSessionId,
          subjectId: topic.subjectId,
          subject: topic.subject,
          topicTitle: topic.topicTitle,
          curriculumReference: topic.curriculumReference
        })
      ],
      revisionTopics: [topic]
    });

    await store.runRevisionSession(topic);
    store.markRevisionStuck();

    const state = get(store);

    expect(state.revisionSession?.status).toBe('active');
    expect(state.revisionSession?.currentHelp?.type).toBe('worked_step');
    expect(state.revisionSession?.currentInterventionLevel).toBe('worked_step');
  });

  it('can explicitly escalate to lesson after showing worked steps', async () => {
    const baseState = createInitialState();
    const topic = createRevisionTopic();
    const store = createAppStore({
      ...baseState,
      lessonSessions: [
        createLessonSession({
          id: topic.lessonSessionId,
          subjectId: topic.subjectId,
          subject: topic.subject,
          topicTitle: topic.topicTitle,
          curriculumReference: topic.curriculumReference
        })
      ],
      revisionTopics: [topic]
    });

    await store.runRevisionSession(topic);
    store.markRevisionStuck();
    store.escalateToLesson();

    const state = get(store);

    expect(state.revisionSession?.status).toBe('escalated_to_lesson');
    expect(state.revisionSession?.currentHelp?.type).toBe('worked_step');
  });

  it('records an answer and waits for an explicit next-step action before advancing', async () => {
    const baseState = createInitialState();
    const topic = createRevisionTopic();
    const store = createAppStore({
      ...baseState,
      lessonSessions: [createLessonSession({ id: topic.lessonSessionId, subjectId: topic.subjectId, subject: topic.subject, topicTitle: topic.topicTitle, curriculumReference: topic.curriculumReference })],
      revisionTopics: [topic]
    });

    await store.runRevisionSession(topic);
    store.submitRevisionAnswer('Fractions compare parts of a whole because the denominator is the total and the numerator is the selected part with one example.', 4);

    const state = get(store);

    expect(state.revisionSession?.questionIndex).toBe(0);
    expect(state.revisionSession?.awaitingAdvance).toBe(true);
    expect(state.revisionSession?.lastTurnResult?.sessionDecision).toBe('continue');
  });

  it('force-advances to the next question after a weak answer when the student chooses next', async () => {
    const baseState = createInitialState();
    const topic = createRevisionTopic();
    const store = createAppStore({
      ...baseState,
      lessonSessions: [createLessonSession({ id: topic.lessonSessionId, subjectId: topic.subjectId, subject: topic.subject, topicTitle: topic.topicTitle, curriculumReference: topic.curriculumReference })],
      revisionTopics: [topic]
    });

    await store.runRevisionSession(topic);
    store.submitRevisionAnswer('Not sure.', 2);
    store.forceAdvanceRevision();

    const state = get(store);

    expect(state.revisionSession?.questionIndex).toBe(1);
    expect(state.revisionSession?.awaitingAdvance).toBe(false);
    expect(state.revisionSession?.skippedQuestionIds).toContain(state.revisionAttempts[0]?.questionId);
  });

  it('records stable revision artifact ids on new attempts', async () => {
    const baseState = createInitialState();
    const topic = createRevisionTopic();
    const store = createAppStore({
      ...baseState,
      lessonSessions: [createLessonSession({ id: topic.lessonSessionId, subjectId: topic.subjectId, subject: topic.subject, topicTitle: topic.topicTitle, curriculumReference: topic.curriculumReference })],
      revisionTopics: [topic]
    });

    await store.runRevisionSession(topic);
    store.submitRevisionAnswer('Fractions compare parts of a whole because the denominator is the total and the numerator is the selected part.', 4);

    const state = get(store);

    expect(state.revisionSession?.revisionPackArtifactId).toBe('revision-pack-artifact-1');
    expect(state.revisionSession?.revisionQuestionArtifactId).toBe('revision-question-artifact-1');
    expect(state.revisionAttempts[0]).toEqual(
      expect.objectContaining({
        revisionPackArtifactId: 'revision-pack-artifact-1',
        revisionQuestionArtifactId: 'revision-question-artifact-1',
        nodeId: 'graph-subtopic-fractions'
      })
    );
  });
});

describe('revision plans', () => {
  it('creates a saved revision plan and makes it active without overwriting earlier plans', () => {
    const baseState = createInitialState();
    const store = createAppStore(baseState);

    const first = store.createRevisionPlan({
      subjectId: baseState.curriculum.subjects[0]!.id,
      examName: 'Math mid-term',
      examDate: '2026-04-12',
      mode: 'weak_topics',
      timeBudgetMinutes: 20
    });
    const second = store.createRevisionPlan({
      subjectId: baseState.curriculum.subjects[0]!.id,
      examName: 'Math final',
      examDate: '2026-06-18',
      mode: 'full_subject',
      timeBudgetMinutes: 30
    });

    const state = get(store);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(state.revisionPlans).toHaveLength(2);
    expect(state.activeRevisionPlanId).toBe(state.revisionPlans[0]?.id);
    expect(state.revisionPlans.map((plan) => plan.examName)).toEqual(['Math final', 'Math mid-term']);
    expect(state.revisionPlan.examName).toBe('Math final');
    expect(state.revisionPlans.every((plan) => Array.isArray(plan.topicNodeIds) && plan.topicNodeIds.length === plan.topics.length)).toBe(true);
  });

  it('can switch the active revision plan and keep revisionPlan in sync as a compatibility alias', () => {
    const baseState = createInitialState();
    const firstPlan = {
      ...baseState.revisionPlan,
      id: 'plan-1',
      examName: 'Math mid-term',
      subjectName: 'Mathematics',
      planStyle: 'weak_topics' as const,
      status: 'active' as const,
      createdAt: '2026-03-31T08:00:00.000Z',
      updatedAt: '2026-03-31T08:00:00.000Z'
    };
    const secondPlan = {
      ...baseState.revisionPlan,
      id: 'plan-2',
      examName: 'Math final',
      subjectName: 'Mathematics',
      planStyle: 'full_subject' as const,
      studyMode: 'full_subject' as const,
      status: 'active' as const,
      createdAt: '2026-03-31T08:10:00.000Z',
      updatedAt: '2026-03-31T08:10:00.000Z'
    };
    const store = createAppStore({
      ...baseState,
      revisionPlan: firstPlan,
      revisionPlans: [firstPlan, secondPlan],
      activeRevisionPlanId: firstPlan.id
    });

    store.setActiveRevisionPlan(secondPlan.id);

    const state = get(store);

    expect(state.activeRevisionPlanId).toBe('plan-2');
    expect(state.revisionPlan.id).toBe('plan-2');
    expect(state.revisionPlan.examName).toBe('Math final');
  });

  it('removes the active revision plan, promotes the next saved plan, and clears the linked upcoming exam', () => {
    const baseState = createInitialState();
    const store = createAppStore(baseState);
    const manualTopic = baseState.curriculum.subjects[0]!.topics[0]!.name;

    store.createRevisionPlan({
      subjectId: baseState.curriculum.subjects[0]!.id,
      examName: 'Math mid-term',
      examDate: '2026-04-12',
      mode: 'manual',
      manualTopics: [manualTopic],
      timeBudgetMinutes: 20
    });
    store.createRevisionPlan({
      subjectId: baseState.curriculum.subjects[0]!.id,
      examName: 'Math final',
      examDate: '2026-06-18',
      mode: 'full_subject',
      timeBudgetMinutes: 30
    });

    const activePlanId = get(store).activeRevisionPlanId!;

    store.removeRevisionPlan(activePlanId);

    const state = get(store);

    expect(state.revisionPlans).toHaveLength(1);
    expect(state.revisionPlans[0]?.examName).toBe('Math mid-term');
    expect(state.activeRevisionPlanId).toBe(state.revisionPlans[0]?.id);
    expect(state.revisionPlan.examName).toBe('Math mid-term');
    expect(state.upcomingExams).toHaveLength(1);
    expect(state.upcomingExams[0]?.examName).toBe('Math mid-term');
  });

  it('ignores a manual plan request when the selected topics do not belong to the chosen subject', () => {
    const baseState = createInitialState();
    const store = createAppStore(baseState);
    const primarySubject = baseState.curriculum.subjects[0]!;
    const primaryTopics = new Set(primarySubject.topics.map((topic) => topic.name.toLowerCase()));
    const alternateSubject = baseState.curriculum.subjects.find((subject) => subject.id !== primarySubject.id)!;
    const foreignTopic = alternateSubject.topics.find((topic) => !primaryTopics.has(topic.name.toLowerCase()));

    expect(foreignTopic).toBeDefined();

    const result = store.createRevisionPlan({
      subjectId: primarySubject.id,
      examName: 'Broken plan',
      examDate: '2026-05-01',
      mode: 'manual',
      manualTopics: [foreignTopic!.name],
      timeBudgetMinutes: 15
    });

    const state = get(store);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/does not belong|resolve/i);
    expect(state.revisionPlans).toHaveLength(0);
    expect(state.activeRevisionPlanId).toBeNull();
  });

  it('creates a manual plan when the selected labels come from subject subtopics', () => {
    const baseState = createInitialState();
    const store = createAppStore(baseState);
    const subject = baseState.curriculum.subjects.find((item) => item.topics.some((topic) => topic.subtopics.length > 0))!;
    const manualTopics = subject.topics.slice(0, 2).map((topic) => topic.subtopics[0]!.name);

    store.createRevisionPlan({
      subjectId: subject.id,
      examName: 'Subtopic test',
      examDate: '2026-04-12',
      mode: 'manual',
      manualTopics,
      timeBudgetMinutes: 20
    });

    const state = get(store);

    expect(state.revisionPlans).toHaveLength(1);
    expect(state.revisionPlans[0]?.topics).toEqual(manualTopics);
  });

  it('removes the last saved revision plan and clears the active plan selection', () => {
    const baseState = createInitialState();
    const store = createAppStore(baseState);

    store.createRevisionPlan({
      subjectId: baseState.curriculum.subjects[0]!.id,
      examName: 'Math mid-term',
      examDate: '2026-04-12',
      mode: 'weak_topics',
      timeBudgetMinutes: 20
    });

    const activePlanId = get(store).activeRevisionPlanId!;

    store.removeRevisionPlan(activePlanId);

    const state = get(store);

    expect(state.revisionPlans).toHaveLength(0);
    expect(state.activeRevisionPlanId).toBeNull();
    expect(state.upcomingExams).toHaveLength(0);
    expect(state.revisionPlan.examName).toBeUndefined();
  });
});

describe('progress analytics instrumentation', () => {
  it('logs a session_started event when launching a brand new lesson', async () => {
    const baseState = createInitialState();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/ai/lesson-plan') {
        return new Response(
          JSON.stringify({
            provider: 'github-models',
            nodeId: 'graph-subtopic-1',
            lessonArtifactId: 'artifact-lesson-1',
            questionArtifactId: 'artifact-question-1',
            lesson: {
              ...baseState.lessons[0]!,
              id: 'artifact-lesson-runtime-1'
            },
            questions: baseState.questions
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const store = createAppStore({
      ...baseState,
      lessonSessions: []
    });
    const lessonId = baseState.lessons[0]!.id;

    await store.launchLesson(lessonId);

    const state = get(store);

    expect(state.analytics[0]?.type).toBe('session_started');
    expect(state.analytics[0]?.detail).toMatch(/started/i);
  });

  it('logs a session_resumed event when resuming an existing lesson session', () => {
    const baseState = createInitialState();
    const lesson = baseState.lessons[0]!;
    const session = createLessonSession({
      id: 'resume-target',
      lessonId: lesson.id,
      subjectId: lesson.subjectId,
      topicId: lesson.topicId,
      topicTitle: lesson.title.replace(/^.*?:\s*/, ''),
      status: 'active',
      completedAt: null,
      currentStage: 'practice',
      stagesCompleted: ['orientation', 'concepts', 'construction', 'examples']
    });
    const store = createAppStore({
      ...baseState,
      lessonSessions: [session]
    });

    store.resumeSession(session.id);

    const state = get(store);

    expect(state.analytics[0]?.type).toBe('session_resumed');
    expect(state.analytics[0]?.detail).toMatch(/resumed/i);
  });

  it('logs mastery_updated when answering a practice question', () => {
    const baseState = createInitialState();
    const questionId = baseState.questions[0]!.id;
    const store = createAppStore(baseState);

    store.answerQuestion(questionId, 'test answer');

    const state = get(store);

    expect(state.analytics.slice(0, 2).map((event) => event.type)).toEqual(['question_answered', 'mastery_updated']);
  });
});

describe('topic discovery dashboard state', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getAuthenticatedHeaders.mockResolvedValue({
      Authorization: 'Bearer token'
    });
  });

  it('loads topic discovery for the selected subject and ignores stale responses from a previous subject', async () => {
    const baseState = {
      ...createInitialState(),
      profile: {
        ...createInitialState().profile,
        curriculumId: 'caps',
        gradeId: 'grade-6'
      }
    };
    expect(baseState.curriculum.subjects.length).toBeGreaterThan(1);
    const firstSubject = baseState.curriculum.subjects[0]!;
    const secondSubject = baseState.curriculum.subjects[1]!;
    const firstRequest = createDeferredResponse();
    const secondRequest = createDeferredResponse();

    fetchMock.mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.endsWith('/api/curriculum/topic-discovery')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as { subjectId: string };

        if (body.subjectId === firstSubject.id) {
          return firstRequest.promise;
        }

        if (body.subjectId === secondSubject.id) {
          return secondRequest.promise;
        }
      }

      return new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const store = createAppStore(baseState);

    store.selectSubject(firstSubject.id);
    store.selectSubject(secondSubject.id);
    await flushAsyncWork();

    expect(get(store).topicDiscovery.discovery.status).toBe('loading');

    firstRequest.resolve(
      new Response(
        JSON.stringify({
          topics: [createDiscoverySuggestion({ topicLabel: 'Algebra Basics', topicSignature: `${firstSubject.id}::caps::grade-6::algebra basics` })],
          provider: 'github-models',
          model: 'openai/gpt-4.1-nano',
          refreshed: false
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    await flushAsyncWork();

    expect(get(store).topicDiscovery.discovery.topics).toEqual([]);

    secondRequest.resolve(
      new Response(
        JSON.stringify({
          topics: [createDiscoverySuggestion({ topicLabel: 'Cells', topicSignature: `${secondSubject.id}::caps::grade-6::cells`, nodeId: 'graph-topic-cells' })],
          provider: 'github-models',
          model: 'openai/gpt-4.1-nano',
          refreshed: false
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    await flushAsyncWork();

    const state = get(store);

    expect(state.topicDiscovery.selectedSubjectId).toBe(secondSubject.id);
    expect(state.topicDiscovery.discovery.status).toBe('ready');
    expect(state.topicDiscovery.discovery.topics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          topicLabel: 'Cells'
        })
      ])
    );
    expect(state.topicDiscovery.discovery.topics).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          topicLabel: 'Algebra Basics'
        })
      ])
    );
  });

  it('lets refresh supersede an in-flight initial discovery load', async () => {
    const baseState = {
      ...createInitialState(),
      profile: {
        ...createInitialState().profile,
        curriculumId: 'caps',
        gradeId: 'grade-6'
      }
    };
    const subject = baseState.curriculum.subjects[0]!;
    const initialRequest = createDeferredResponse();
    const refreshRequest = createDeferredResponse();
    let discoveryCallCount = 0;

    fetchMock.mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.endsWith('/api/curriculum/topic-discovery')) {
        discoveryCallCount += 1;
        const body = JSON.parse(String(init?.body ?? '{}')) as { forceRefresh?: boolean };
        expect(Boolean(body.forceRefresh)).toBe(discoveryCallCount === 2);
        return discoveryCallCount === 1 ? initialRequest.promise : refreshRequest.promise;
      }

      if (url.endsWith('/api/curriculum/topic-discovery/refresh')) {
        return new Response(JSON.stringify({ recorded: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const store = createAppStore(baseState);

    const initialLoad = store.loadTopicDiscovery(subject.id);
    await flushAsyncWork();
    const refreshLoad = store.refreshTopicDiscovery(subject.id);
    await flushAsyncWork();

    expect(get(store).topicDiscovery.discovery.status).toBe('refreshing');

    refreshRequest.resolve(
      new Response(
        JSON.stringify({
          topics: [createDiscoverySuggestion({ topicLabel: 'Ratios', topicSignature: `${subject.id}::caps::grade-6::ratios` })],
          provider: 'github-models',
          model: 'openai/gpt-4.1-nano',
          refreshed: true
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    await flushAsyncWork();

    initialRequest.resolve(
      new Response(
        JSON.stringify({
          topics: [createDiscoverySuggestion({ topicLabel: 'Old Load', topicSignature: `${subject.id}::caps::grade-6::old load` })],
          provider: 'github-models',
          model: 'openai/gpt-4.1-nano',
          refreshed: false
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await Promise.all([initialLoad, refreshLoad]);

    const state = get(store);

    expect(state.topicDiscovery.discovery.status).toBe('ready');
    expect(state.topicDiscovery.discovery.topics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          topicLabel: 'Ratios'
        })
      ])
    );
    expect(state.topicDiscovery.discovery.topics).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          topicLabel: 'Old Load'
        })
      ])
    );
  });

  it('records click and thumbs feedback with the active discovery request metadata', async () => {
    const baseState = {
      ...createInitialState(),
      profile: {
        ...createInitialState().profile,
        curriculumId: 'caps',
        gradeId: 'grade-6'
      }
    };
    const subject = baseState.curriculum.subjects[0]!;
    const discoveryTopic = createDiscoverySuggestion();

    fetchMock.mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.endsWith('/api/curriculum/topic-discovery/click')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as { requestId?: string; rankPosition?: number };
        expect(body.requestId).toBe('request-123');
        expect(body.rankPosition).toBe(1);
        return new Response(JSON.stringify({ recorded: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (url.endsWith('/api/curriculum/topic-discovery/feedback')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as { feedback?: string; requestId?: string };
        expect(body.feedback).toBe('up');
        expect(body.requestId).toBe('request-123');
        return new Response(JSON.stringify({ recorded: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const store = createAppStore({
      ...baseState,
      topicDiscovery: {
        ...baseState.topicDiscovery,
        selectedSubjectId: subject.id,
        discovery: {
          status: 'ready',
          topics: [discoveryTopic],
          provider: 'github-models',
          model: 'openai/gpt-4.1-nano',
          requestId: 'request-123',
          error: null,
          lastLoadedAt: '2026-04-02T12:00:00.000Z',
          refreshed: false,
          subjectId: subject.id
        }
      }
    });

    await store.recordTopicSuggestionClick(discoveryTopic.topicSignature);
    await store.recordTopicFeedback(discoveryTopic.topicSignature, 'up');

    const state = get(store);

    expect(state.topicDiscovery.discovery.topics[0]).toEqual(
      expect.objectContaining({
        feedback: 'up',
        feedbackPending: false
      })
    );
  });

  it('includes the currently shown topic signatures when refreshing discovery so refresh is not a no-op', async () => {
    const baseState = {
      ...createInitialState(),
      profile: {
        ...createInitialState().profile,
        curriculumId: 'caps',
        gradeId: 'grade-6'
      }
    };
    const subject = baseState.curriculum.subjects[0]!;
    const currentTopic = createDiscoverySuggestion();

    fetchMock.mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.endsWith('/api/curriculum/topic-discovery')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          forceRefresh?: boolean;
          excludeTopicSignatures?: string[];
        };
        expect(body.forceRefresh).toBe(true);
        expect(body.excludeTopicSignatures).toEqual([currentTopic.topicSignature]);
        return new Response(
          JSON.stringify({
            topics: [
              createDiscoverySuggestion({
                topicLabel: 'Ratios',
                topicSignature: `${subject.id}::caps::grade-6::ratios`,
                nodeId: null,
                source: 'model_candidate',
                reason: 'Fresh candidate',
                freshness: 'new'
              })
            ],
            provider: 'github-models',
            model: 'openai/gpt-4.1-nano',
            refreshed: true
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      if (url.endsWith('/api/curriculum/topic-discovery/refresh')) {
        return new Response(JSON.stringify({ recorded: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const store = createAppStore({
      ...baseState,
      topicDiscovery: {
        ...baseState.topicDiscovery,
        selectedSubjectId: subject.id,
        discovery: {
          status: 'ready',
          topics: [currentTopic],
          provider: 'github-models',
          model: 'openai/gpt-4.1-nano',
          requestId: 'request-123',
          error: null,
          lastLoadedAt: '2026-04-02T12:00:00.000Z',
          refreshed: false,
          subjectId: subject.id
        }
      }
    });

    await store.refreshTopicDiscovery(subject.id);

    expect(get(store).topicDiscovery.discovery.topics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          topicLabel: 'Ratios'
        })
      ])
    );
  });

  it('rolls back optimistic feedback when the backend does not record the thumbs event', async () => {
    const baseState = {
      ...createInitialState(),
      profile: {
        ...createInitialState().profile,
        curriculumId: 'caps',
        gradeId: 'grade-6'
      }
    };
    const subject = baseState.curriculum.subjects[0]!;
    const discoveryTopic = createDiscoverySuggestion();

    fetchMock.mockImplementation(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.endsWith('/api/curriculum/topic-discovery/feedback')) {
        return new Response(JSON.stringify({ recorded: false }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const store = createAppStore({
      ...baseState,
      topicDiscovery: {
        ...baseState.topicDiscovery,
        selectedSubjectId: subject.id,
        discovery: {
          status: 'ready',
          topics: [discoveryTopic],
          provider: 'github-models',
          model: 'openai/gpt-4.1-nano',
          requestId: 'request-123',
          error: null,
          lastLoadedAt: '2026-04-02T12:00:00.000Z',
          refreshed: false,
          subjectId: subject.id
        }
      }
    });

    await store.recordTopicFeedback(discoveryTopic.topicSignature, 'up');

    expect(get(store).topicDiscovery.discovery.topics[0]).toEqual(
      expect.objectContaining({
        feedback: null,
        feedbackPending: false
      })
    );
  });

  it('surfaces an error state when discovery fails before any topics have loaded', async () => {
    const baseState = {
      ...createInitialState(),
      profile: {
        ...createInitialState().profile,
        curriculumId: 'caps',
        gradeId: 'grade-6'
      }
    };
    const subject = baseState.curriculum.subjects[0]!;

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Discovery temporarily unavailable.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const store = createAppStore(baseState);

    await store.loadTopicDiscovery(subject.id);

    const state = get(store);

    expect(state.topicDiscovery.discovery.status).toBe('error');
    expect(state.topicDiscovery.discovery.topics).toEqual([]);
    expect(state.topicDiscovery.discovery.error).toMatch(/discovery temporarily unavailable/i);
  });

  it('keeps the previous topics visible as stale when a refresh fails', async () => {
    const baseState = {
      ...createInitialState(),
      profile: {
        ...createInitialState().profile,
        curriculumId: 'caps',
        gradeId: 'grade-6'
      }
    };
    const subject = baseState.curriculum.subjects[0]!;
    const existingTopic = createDiscoverySuggestion({
      topicLabel: 'Fractions',
      topicSignature: `${subject.id}::caps::grade-6::fractions`
    });

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Refresh timed out.' }), {
        status: 504,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const store = createAppStore({
      ...baseState,
      topicDiscovery: {
        ...baseState.topicDiscovery,
        selectedSubjectId: subject.id,
        discovery: {
          status: 'ready',
          subjectId: subject.id,
          topics: [existingTopic],
          provider: 'github-models',
          model: 'openai/gpt-4.1-nano',
          requestId: 'request-existing-1',
          error: null,
          lastLoadedAt: '2026-04-02T12:00:00.000Z',
          refreshed: false
        }
      }
    });

    await store.refreshTopicDiscovery(subject.id);

    const state = get(store);

    expect(state.topicDiscovery.discovery.status).toBe('stale');
    expect(state.topicDiscovery.discovery.topics).toEqual([existingTopic]);
    expect(state.topicDiscovery.discovery.error).toMatch(/refresh timed out/i);
  });
});

describe('unified lesson launch pipeline', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getAuthenticatedHeaders.mockResolvedValue({
      Authorization: 'Bearer token'
    });
  });

  it('uses the same lesson-plan route for curriculum launches and stores node/artifact ids on the session', async () => {
    const baseState = createInitialState();
    const lesson = baseState.lessons[0]!;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/ai/lesson-plan') {
        return new Response(
          JSON.stringify({
            provider: 'github-models',
            nodeId: 'graph-subtopic-equivalent-fractions',
            lessonArtifactId: 'artifact-lesson-1',
            questionArtifactId: 'artifact-questions-1',
            lesson: {
              ...lesson,
              id: 'artifact-lesson-runtime-1'
            },
            questions: baseState.questions
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const store = createAppStore(baseState);

    await store.launchLesson(lesson.id);

    const state = get(store);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/ai/lesson-plan',
      expect.objectContaining({
        method: 'POST'
      })
    );
    expect(state.lessonSessions[0]).toEqual(
      expect.objectContaining({
        nodeId: 'graph-subtopic-equivalent-fractions',
        lessonArtifactId: 'artifact-lesson-1',
        questionArtifactId: 'artifact-questions-1'
      })
    );
  });

  it('uses the same lesson-plan route for shortlist launches', async () => {
    const baseState = createInitialState();
    const subject = baseState.curriculum.subjects[0]!;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/ai/lesson-plan') {
        const body = JSON.parse(String(init?.body)) as { request: { nodeId: string; topicId: string } };

        expect(body.request.nodeId).toBe('graph-subtopic-equivalent-fractions');
        expect(body.request.topicId).toBe('graph-topic-fractions');

        return new Response(
          JSON.stringify({
            provider: 'github-models',
            nodeId: 'graph-subtopic-equivalent-fractions',
            lessonArtifactId: 'artifact-lesson-2',
            questionArtifactId: 'artifact-questions-2',
            lesson: {
              ...baseState.lessons[0]!,
              id: 'artifact-lesson-runtime-2',
              topicId: 'graph-topic-fractions',
              subtopicId: 'graph-subtopic-equivalent-fractions'
            },
            questions: baseState.questions
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const store = createAppStore({
      ...baseState,
      topicDiscovery: {
        ...baseState.topicDiscovery,
        selectedSubjectId: subject.id
      }
    });

    await store.startLessonFromShortlist({
      id: 'short-1',
      title: 'Equivalent Fractions',
      description: 'Fractions with the same value.',
      curriculumReference: 'CAPS · Grade 6 · Mathematics',
      relevance: 'Recommended topic',
      topicId: 'graph-topic-fractions',
      subtopicId: 'graph-subtopic-equivalent-fractions',
      lessonId: 'generated-equivalent-fractions'
    });

    const state = get(store);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/ai/lesson-plan',
      expect.objectContaining({
        method: 'POST'
      })
    );
    expect(state.lessonSessions[0]).toEqual(
      expect.objectContaining({
        nodeId: 'graph-subtopic-equivalent-fractions',
        lessonArtifactId: 'artifact-lesson-2',
        questionArtifactId: 'artifact-questions-2'
      })
    );
  });

  it('uses the same lesson-plan route for freeform launches', async () => {
    const baseState = createInitialState();
    const subject = baseState.curriculum.subjects[0]!;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/ai/lesson-plan') {
        const body = JSON.parse(String(init?.body)) as { request: { subjectId: string; topicTitle: string } };

        expect(body.request.subjectId).toBe(subject.id);
        expect(body.request.topicTitle).toBe('Equivalent Fractions');

        return new Response(
          JSON.stringify({
            provider: 'github-models',
            nodeId: 'custom-subtopic-equivalent-fractions',
            lessonArtifactId: 'artifact-lesson-3',
            questionArtifactId: 'artifact-questions-3',
            lesson: {
              ...baseState.lessons[0]!,
              id: 'artifact-lesson-runtime-3',
              topicId: 'custom-topic-equivalent-fractions',
              subtopicId: 'custom-subtopic-equivalent-fractions'
            },
            questions: baseState.questions
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const store = createAppStore(baseState);

    await store.startLessonFromSelection(subject.id, 'equivalent fractions');

    const state = get(store);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/ai/lesson-plan',
      expect.objectContaining({
        method: 'POST'
      })
    );
    expect(state.lessonSessions[0]).toEqual(
      expect.objectContaining({
        nodeId: 'custom-subtopic-equivalent-fractions',
        lessonArtifactId: 'artifact-lesson-3',
        questionArtifactId: 'artifact-questions-3'
      })
    );
  });

  it('uses the same lesson-plan route for graph-backed discovery launches and includes discovery metadata', async () => {
    const baseState = createInitialState();
    const subject = baseState.curriculum.subjects[0]!;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/ai/lesson-plan') {
        const body = JSON.parse(String(init?.body)) as {
          request: {
            nodeId: string;
            topicDiscovery: {
              topicSignature: string;
              topicLabel: string;
              source: string;
              requestId: string;
              rankPosition: number;
            };
          };
        };

        expect(body.request.nodeId).toBe('graph-topic-fractions');
        expect(body.request.topicDiscovery).toEqual(
          expect.objectContaining({
            topicSignature: 'subject-1::caps::grade-6::equivalent fractions',
            topicLabel: 'Equivalent Fractions',
            source: 'graph_existing',
            requestId: 'request-graph-1',
            rankPosition: 1
          })
        );

        return new Response(
          JSON.stringify({
            provider: 'github-models',
            nodeId: 'graph-topic-fractions',
            lessonArtifactId: 'artifact-lesson-discovery-1',
            questionArtifactId: 'artifact-questions-discovery-1',
            lesson: {
              ...baseState.lessons[0]!,
              id: 'artifact-lesson-runtime-discovery-1',
              topicId: 'graph-topic-fractions',
              subtopicId: 'graph-topic-fractions'
            },
            questions: baseState.questions
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url === '/api/curriculum/topic-discovery/click') {
        return new Response(JSON.stringify({ recorded: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const store = createAppStore({
      ...baseState,
      topicDiscovery: {
        ...baseState.topicDiscovery,
        selectedSubjectId: subject.id,
        discovery: {
          status: 'ready',
          topics: [
            createDiscoverySuggestion({
              topicSignature: 'subject-1::caps::grade-6::equivalent fractions',
              topicLabel: 'Equivalent Fractions',
              nodeId: 'graph-topic-fractions',
              source: 'graph_existing',
              rank: 1
            })
          ],
          provider: 'github-models',
          model: 'openai/gpt-4.1-nano',
          requestId: 'request-graph-1',
          error: null,
          lastLoadedAt: '2026-04-02T12:00:00.000Z',
          refreshed: false,
          subjectId: subject.id
        }
      }
    });

    await store.startLessonFromTopicDiscovery('subject-1::caps::grade-6::equivalent fractions');

    const state = get(store);

    expect(state.lessonSessions[0]).toEqual(
      expect.objectContaining({
        nodeId: 'graph-topic-fractions',
        lessonArtifactId: 'artifact-lesson-discovery-1',
        questionArtifactId: 'artifact-questions-discovery-1'
      })
    );
  });

  it('uses the same lesson-plan route for model-candidate discovery launches and omits node ids', async () => {
    const baseState = createInitialState();
    const subject = baseState.curriculum.subjects[0]!;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/ai/lesson-plan') {
        const body = JSON.parse(String(init?.body)) as {
          request: {
            nodeId: string | null;
            topicTitle: string;
            topicDiscovery: {
              topicSignature: string;
              topicLabel: string;
              source: string;
              requestId: string;
              rankPosition: number;
            };
          };
        };

        expect(body.request.nodeId).toBeNull();
        expect(body.request.topicTitle).toBe('Ratio Tables');
        expect(body.request.topicDiscovery).toEqual(
          expect.objectContaining({
            topicSignature: 'subject-1::caps::grade-6::ratio tables',
            topicLabel: 'Ratio Tables',
            source: 'model_candidate',
            requestId: 'request-model-1',
            rankPosition: 2
          })
        );

        return new Response(
          JSON.stringify({
            provider: 'github-models',
            nodeId: 'graph-topic-ratio-tables',
            lessonArtifactId: 'artifact-lesson-discovery-2',
            questionArtifactId: 'artifact-questions-discovery-2',
            lesson: {
              ...baseState.lessons[0]!,
              id: 'artifact-lesson-runtime-discovery-2',
              topicId: 'graph-topic-ratio-tables',
              subtopicId: 'graph-topic-ratio-tables'
            },
            questions: baseState.questions
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url === '/api/curriculum/topic-discovery/click') {
        return new Response(JSON.stringify({ recorded: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const store = createAppStore({
      ...baseState,
      topicDiscovery: {
        ...baseState.topicDiscovery,
        selectedSubjectId: subject.id,
        discovery: {
          status: 'ready',
          topics: [
            createDiscoverySuggestion({
              topicSignature: 'subject-1::caps::grade-6::ratio tables',
              topicLabel: 'Ratio Tables',
              nodeId: null,
              source: 'model_candidate',
              rank: 2,
              reason: 'High-interest adjacent candidate'
            })
          ],
          provider: 'github-models',
          model: 'openai/gpt-4.1-nano',
          requestId: 'request-model-1',
          error: null,
          lastLoadedAt: '2026-04-02T12:00:00.000Z',
          refreshed: false,
          subjectId: subject.id
        }
      }
    });

    await store.startLessonFromTopicDiscovery('subject-1::caps::grade-6::ratio tables');

    const state = get(store);

    expect(state.lessonSessions[0]).toEqual(
      expect.objectContaining({
        nodeId: 'graph-topic-ratio-tables',
        lessonArtifactId: 'artifact-lesson-discovery-2',
        questionArtifactId: 'artifact-questions-discovery-2'
      })
    );
  });

  it('restarts artifact-backed sessions through the same lesson-plan route and preserves node/artifact ids', async () => {
    const baseState = createInitialState();
    const lesson = baseState.lessons[0]!;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/ai/lesson-plan') {
        const body = JSON.parse(String(init?.body)) as { request: { nodeId: string; topicId: string } };

        expect(body.request.nodeId).toBe('graph-subtopic-equivalent-fractions');
        expect(body.request.topicId).toBe('graph-topic-fractions');

        return new Response(
          JSON.stringify({
            provider: 'github-models',
            nodeId: 'graph-subtopic-equivalent-fractions',
            lessonArtifactId: 'artifact-lesson-4',
            questionArtifactId: 'artifact-questions-4',
            lesson: {
              ...lesson,
              id: 'artifact-lesson-runtime-4',
              topicId: 'graph-topic-fractions',
              subtopicId: 'graph-subtopic-equivalent-fractions'
            },
            questions: baseState.questions
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const store = createAppStore({
      ...baseState,
      lessonSessions: [
        createLessonSession({
          id: 'artifact-session-1',
          lessonId: 'artifact-lesson-runtime-1',
          subjectId: lesson.subjectId,
          subject: baseState.curriculum.subjects[0]!.name,
          topicId: 'graph-topic-fractions',
          topicTitle: 'Equivalent Fractions',
          topicDescription: 'Fractions with the same value.',
          curriculumReference: 'CAPS · Grade 6 · Mathematics',
          nodeId: 'graph-subtopic-equivalent-fractions',
          lessonArtifactId: 'artifact-lesson-1',
          questionArtifactId: 'artifact-questions-1',
          status: 'complete'
        })
      ]
    });

    await store.restartLessonSession('artifact-session-1');

    const state = get(store);
    const restarted = state.lessonSessions[0]!;

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/ai/lesson-plan',
      expect.objectContaining({
        method: 'POST'
      })
    );
    expect(restarted.id).not.toBe('artifact-session-1');
    expect(restarted).toEqual(
      expect.objectContaining({
        nodeId: 'graph-subtopic-equivalent-fractions',
        lessonArtifactId: 'artifact-lesson-4',
        questionArtifactId: 'artifact-questions-4',
        status: 'active'
      })
    );
  });

  it('does not synthesize a local lesson when the lesson-plan route fails', async () => {
    const baseState = createInitialState();
    const lesson = baseState.lessons[0]!;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/ai/lesson-plan') {
        return new Response(JSON.stringify({ error: 'Lesson generation unavailable.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const store = createAppStore({
      ...baseState,
      lessonSessions: []
    });

    await store.launchLesson(lesson.id);

    const state = get(store);

    expect(state.lessonSessions).toHaveLength(0);
    expect(state.backend.lastSyncStatus).toBe('error');
    expect(state.backend.lastSyncError).toMatch(/lesson/i);
  });
});

describe('lesson artifact ratings', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getAuthenticatedHeaders.mockResolvedValue({
      Authorization: 'Bearer token'
    });
  });

  it('submits learner feedback for the completed lesson artifact and stores the submitted rating on the session', async () => {
    const baseState = createInitialState();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/lesson-artifacts/rate') {
        expect(init?.method).toBe('POST');
        const body = JSON.parse(String(init?.body)) as {
          lessonSessionId: string;
          lessonArtifactId: string;
          usefulness: number;
          clarity: number;
          confidenceGain: number;
          note: string;
        };

        expect(body).toEqual(
          expect.objectContaining({
            lessonSessionId: 'complete-session-1',
            lessonArtifactId: 'artifact-lesson-9',
            usefulness: 5,
            clarity: 4,
            confidenceGain: 5,
            note: 'Best explanation so far.'
          })
        );

        return new Response(JSON.stringify({ saved: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const store = createAppStore({
      ...baseState,
      lessonSessions: [
        createLessonSession({
          id: 'complete-session-1',
          studentId: 'student-1',
          subjectId: baseState.curriculum.subjects[0]!.id,
          subject: baseState.curriculum.subjects[0]!.name,
          lessonId: 'artifact-lesson-runtime-9',
          nodeId: 'graph-subtopic-equivalent-fractions',
          lessonArtifactId: 'artifact-lesson-9',
          questionArtifactId: 'artifact-questions-9',
          status: 'complete',
          completedAt: '2026-03-27T08:15:00.000Z'
        })
      ],
      ui: {
        ...baseState.ui,
        activeLessonSessionId: 'complete-session-1'
      }
    });

    await store.submitLessonRating('complete-session-1', {
      usefulness: 5,
      clarity: 4,
      confidenceGain: 5,
      note: 'Best explanation so far.'
    });

    const state = get(store);
    const session = state.lessonSessions.find((item) => item.id === 'complete-session-1');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/lesson-artifacts/rate',
      expect.objectContaining({
        method: 'POST'
      })
    );
    expect(session).toBeTruthy();
    if (!session) {
      throw new Error('Expected completed session to remain in state after rating submission.');
    }
    expect(session.lessonRating).toEqual(
      expect.objectContaining({
        usefulness: 5,
        clarity: 4,
        confidenceGain: 5,
        note: 'Best explanation so far.'
      })
    );
  });
});

describe('topic discovery completion linkage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getAuthenticatedHeaders.mockResolvedValue({
      Authorization: 'Bearer token'
    });
  });

  it('records a lesson_completed discovery event when a graph-backed suggestion lesson completes', async () => {
    const baseState = createInitialState();
    const subject = baseState.curriculum.subjects[0]!;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/ai/lesson-chat') {
        return new Response(
          JSON.stringify({
            displayContent: 'You completed this lesson well.',
            metadata: {
              action: 'complete',
              next_stage: null,
              reteach_style: null,
              reteach_count: 0,
              confidence_assessment: 0.84,
              profile_update: {
                engagement_level: 'high'
              }
            }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url === '/api/curriculum/topic-discovery/complete') {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;

        expect(body).toEqual(
          expect.objectContaining({
            subjectId: subject.id,
            curriculumId: baseState.profile.curriculumId,
            gradeId: baseState.profile.gradeId,
            topicSignature: 'subject-1::caps::grade-6::equivalent fractions',
            topicLabel: 'Equivalent Fractions',
            nodeId: 'graph-topic-fractions',
            source: 'graph_existing',
            lessonSessionId: 'discovery-session-1',
            requestId: 'request-graph-complete-1',
            rankPosition: 1,
            reteachCount: 0,
            questionCount: 2
          })
        );
        expect(body.completedAt).toEqual(expect.any(String));

        return new Response(JSON.stringify({ recorded: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: `Unhandled request for ${url}` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const store = createAppStore({
      ...baseState,
      profile: {
        ...baseState.profile,
        curriculumId: 'caps',
        gradeId: 'grade-6'
      },
      ui: {
        ...baseState.ui,
        currentScreen: 'lesson',
        learningMode: 'learn',
        activeLessonSessionId: 'discovery-session-1'
      },
      lessonSessions: [
        createLessonSession({
          id: 'discovery-session-1',
          status: 'active',
          currentStage: 'check',
          stagesCompleted: ['orientation', 'concepts', 'construction', 'examples', 'practice'],
          completedAt: null,
          lastActiveAt: '2026-04-02T11:30:00.000Z',
          questionCount: 2,
          topicId: 'graph-topic-fractions',
          topicTitle: 'Equivalent Fractions',
          topicDescription: 'Reason about fraction equivalence.',
          lessonId: baseState.lessons[0]!.id,
          nodeId: 'graph-topic-fractions',
          lessonArtifactId: 'artifact-lesson-discovery-11',
          questionArtifactId: 'artifact-questions-discovery-11',
          topicDiscovery: {
            topicSignature: 'subject-1::caps::grade-6::equivalent fractions',
            topicLabel: 'Equivalent Fractions',
            source: 'graph_existing',
            requestId: 'request-graph-complete-1',
            rankPosition: 1
          }
        })
      ]
    });

    await store.sendLessonMessage('I think I have it now.');

    const state = get(store);
    const requestedUrls = fetchMock.mock.calls.map(([input]) =>
      typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
    );

    expect(state.lessonSessions[0]?.status).toBe('complete');
    expect(requestedUrls).toContain('/api/curriculum/topic-discovery/complete');
    expect(requestedUrls).not.toContain('/api/lesson-artifacts/rate');
  });

  it('records a lesson_completed discovery event for model candidates and includes reteach pressure only as recommendation metadata', async () => {
    const baseState = createInitialState();
    const subject = baseState.curriculum.subjects[0]!;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/ai/lesson-chat') {
        return new Response(
          JSON.stringify({
            displayContent: 'You made it through, but this took a few retries.',
            metadata: {
              action: 'complete',
              next_stage: null,
              reteach_style: null,
              reteach_count: 3,
              confidence_assessment: 0.58,
              profile_update: {
                engagement_level: 'medium',
                struggled_with: ['ratio tables']
              }
            }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url === '/api/curriculum/topic-discovery/complete') {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;

        expect(body).toEqual(
          expect.objectContaining({
            subjectId: subject.id,
            curriculumId: baseState.profile.curriculumId,
            gradeId: baseState.profile.gradeId,
            topicSignature: 'subject-1::caps::grade-6::ratio tables',
            topicLabel: 'Ratio Tables',
            nodeId: 'graph-topic-ratio-tables',
            source: 'model_candidate',
            lessonSessionId: 'discovery-session-2',
            requestId: 'request-model-complete-1',
            rankPosition: 2,
            reteachCount: 3,
            questionCount: 4
          })
        );

        return new Response(JSON.stringify({ recorded: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: `Unhandled request for ${url}` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const store = createAppStore({
      ...baseState,
      profile: {
        ...baseState.profile,
        curriculumId: 'caps',
        gradeId: 'grade-6'
      },
      ui: {
        ...baseState.ui,
        currentScreen: 'lesson',
        learningMode: 'learn',
        activeLessonSessionId: 'discovery-session-2'
      },
      lessonSessions: [
        createLessonSession({
          id: 'discovery-session-2',
          status: 'active',
          currentStage: 'check',
          stagesCompleted: ['orientation', 'concepts', 'construction', 'examples', 'practice'],
          completedAt: null,
          lastActiveAt: '2026-04-02T12:05:00.000Z',
          questionCount: 4,
          reteachCount: 2,
          topicId: 'graph-topic-ratio-tables',
          topicTitle: 'Ratio Tables',
          topicDescription: 'Use ratio tables to compare equivalent quantities.',
          lessonId: baseState.lessons[0]!.id,
          nodeId: 'graph-topic-ratio-tables',
          lessonArtifactId: 'artifact-lesson-discovery-12',
          questionArtifactId: 'artifact-questions-discovery-12',
          topicDiscovery: {
            topicSignature: 'subject-1::caps::grade-6::ratio tables',
            topicLabel: 'Ratio Tables',
            source: 'model_candidate',
            requestId: 'request-model-complete-1',
            rankPosition: 2
          }
        })
      ]
    });

    await store.sendLessonMessage('I got there eventually.');

    const state = get(store);
    const requestedUrls = fetchMock.mock.calls.map(([input]) =>
      typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
    );

    expect(state.lessonSessions[0]).toEqual(
      expect.objectContaining({
        status: 'complete',
        nodeId: 'graph-topic-ratio-tables'
      })
    );
    expect(requestedUrls).toContain('/api/curriculum/topic-discovery/complete');
    expect(requestedUrls).not.toContain('/api/lesson-artifacts/rate');
  });
});

describe('degraded runtime handling', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getAuthenticatedHeaders.mockResolvedValue({
      Authorization: 'Bearer token'
    });
  });

  it('marks backend sync as errored when bootstrap fails instead of silently keeping local truth', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/state/bootstrap') {
        return new Response(JSON.stringify({ error: 'Bootstrap backend unavailable.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const store = createAppStore(createInitialState());

    await store.initializeRemoteState();

    const state = get(store);
    expect(state.backend.lastSyncStatus).toBe('error');
    expect(state.backend.lastSyncError).toMatch(/bootstrap/i);
  });
});
