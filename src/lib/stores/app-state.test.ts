import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { createInitialState } from '$lib/data/platform';
import { buildRevisionSession } from '$lib/revision/engine';
import type {
  DashboardTopicDiscoverySuggestion,
  Lesson,
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
    softStuckCount: 0,
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

function createV2Lesson(baseLesson: Lesson, overrides: Partial<Lesson> = {}): Lesson {
  return {
    ...baseLesson,
    id: 'lesson-v2-runtime-1',
    lessonFlowVersion: 'v2',
    flowV2: {
      groupedLabels: ['orientation', 'concepts', 'practice', 'check', 'complete'],
      start: {
        title: 'Start',
        body: 'Start with the big picture.'
      },
      concepts: [
        {
          name: 'Core idea one',
          summary: 'The first rule to notice.',
          detail: 'This is the first core idea in detail.',
          example: 'Use the first example to see the rule in action.',
          oneLineDefinition: 'Core idea one names the first rule before you do anything else.',
          quickCheck: 'Which statement best matches core idea one?',
          conceptType: 'core_rule',
          whyItMatters: 'It keeps the learner from guessing the method.',
          commonMisconception: 'Jump straight to an answer without naming the rule.'
        },
        {
          name: 'Core idea two',
          summary: 'The second rule to notice.',
          detail: 'This is the second core idea in detail.',
          example: 'Use the second example to extend the pattern.',
          oneLineDefinition: 'Core idea two checks that the same pattern still holds.',
          quickCheck: 'Which statement best matches core idea two?',
          conceptType: 'application_check',
          whyItMatters: 'It helps the learner verify the pattern on a new step.',
          commonMisconception: 'Assume the pattern still works without checking the clue.'
        }
      ],
      loops: [
        {
          id: 'lesson-v2-runtime-1-loop-1',
          title: 'Loop 1',
          teaching: {
            title: 'Teach Loop 1',
            body: 'Teach the first core idea.'
          },
          example: {
            title: 'Example Loop 1',
            body: 'Here is the first worked example.'
          },
          learnerTask: {
            title: 'Try Loop 1',
            body: 'Try the first task on your own.'
          },
          retrievalCheck: {
            title: 'Check Loop 1',
            body: 'Explain the first idea in your own words.'
          },
          mustHitConcepts: ['core idea one'],
          criticalMisconceptionTags: ['core-idea-one-gap']
        },
        {
          id: 'lesson-v2-runtime-1-loop-2',
          title: 'Loop 2',
          teaching: {
            title: 'Teach Loop 2',
            body: 'Teach the second core idea.'
          },
          example: {
            title: 'Example Loop 2',
            body: 'Here is the second worked example.'
          },
          learnerTask: {
            title: 'Try Loop 2',
            body: 'Try the second task on your own.'
          },
          retrievalCheck: {
            title: 'Check Loop 2',
            body: 'Explain the second idea in your own words.'
          },
          mustHitConcepts: ['core idea two'],
          criticalMisconceptionTags: ['core-idea-two-gap']
        }
      ],
      synthesis: {
        title: 'Synthesis',
        body: 'Bring the ideas together.'
      },
      independentAttempt: {
        title: 'Independent Attempt',
        body: 'Solve the new task on your own.'
      },
      exitCheck: {
        title: 'Exit Check',
        body: 'Summarize the main rule and apply it once.'
      }
    },
    ...overrides
  };
}

function createV2LessonSession(overrides: Partial<LessonSession> = {}): LessonSession {
  return createLessonSession({
    lessonFlowVersion: 'v2',
    lessonId: 'lesson-v2-runtime-1',
    currentStage: 'concepts',
    stagesCompleted: ['orientation'],
    status: 'active',
    completedAt: null,
    v2State: {
      totalLoops: 2,
      activeLoopIndex: 0,
      activeCheckpoint: 'loop_check',
      revisionAttemptCount: 0,
      remediationStep: 'none',
      labelBucket: 'concepts',
      skippedGaps: [],
      needsTeacherReview: false
    },
    ...overrides
  });
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
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/ai/lesson-plan') {
        const body = JSON.parse(String(init?.body)) as { request: { lessonFlowVersion: string } };

        expect(body.request.lessonFlowVersion).toBe('v2');

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

  it('marks lesson launch as quota-exceeded when the lesson-plan route returns 402', async () => {
    const baseState = createInitialState();
    const lesson = baseState.lessons[0]!;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/ai/lesson-plan') {
        return new Response(JSON.stringify({ error: 'QUOTA_EXCEEDED', remaining: 0, budget: 0.2 }), {
          status: 402,
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
    expect(state.ui.lessonLaunchQuotaExceeded).toBe(true);
    expect(state.backend.lastSyncError).toMatch(/monthly limit/i);
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

  it('normalizes terminal advance metadata from sendLessonMessage into a completed session shape', async () => {
    const baseState = createInitialState();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/ai/lesson-chat') {
        return new Response(
          JSON.stringify({
            displayContent: 'You reached the end of the lesson.',
            metadata: {
              action: 'advance',
              next_stage: 'complete',
              reteach_style: null,
              reteach_count: 0,
              confidence_assessment: 0.79,
              profile_update: {
                engagement_level: 'high'
              }
            }
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
      ui: {
        ...baseState.ui,
        currentScreen: 'lesson',
        learningMode: 'learn',
        activeLessonSessionId: 'terminal-advance-session-1'
      },
      lessonSessions: [
        createLessonSession({
          id: 'terminal-advance-session-1',
          status: 'active',
          currentStage: 'check',
          stagesCompleted: ['orientation', 'concepts', 'construction', 'examples', 'practice'],
          completedAt: null,
          lessonId: baseState.lessons[0]!.id,
          topicId: baseState.curriculum.subjects[0]!.topics[0]!.id
        })
      ]
    });

    await store.sendLessonMessage('Here is my explanation of the main idea.');

    const state = get(store);
    const session = state.lessonSessions.find((item) => item.id === 'terminal-advance-session-1');

    expect(session).toEqual(
      expect.objectContaining({
        status: 'complete',
        currentStage: 'complete',
        completedAt: expect.any(String),
        stagesCompleted: ['orientation', 'concepts', 'construction', 'examples', 'practice', 'check']
      })
    );
  });

  it('uses artifact-backed lesson content when an active session advances into concepts', async () => {
    const baseState = createInitialState();
    const artifactLesson = {
      ...baseState.lessons[0]!,
      id: 'artifact-lesson-vocabulary-1',
      title: 'English: Vocabulary Development',
      subjectId: baseState.curriculum.subjects[0]!.id,
      topicId: 'artifact-topic-vocabulary',
      subtopicId: 'artifact-subtopic-vocabulary',
      orientation: { title: 'Orientation', body: 'Artifact orientation body.' },
      mentalModel: { title: 'Big Picture', body: 'Artifact mental model body.' },
      concepts: { title: 'Key Concepts', body: 'Artifact concepts body.' }
    };
    const artifactQuestion = {
      ...baseState.questions[0]!,
      id: 'artifact-question-vocabulary-1',
      lessonId: artifactLesson.id,
      topicId: artifactLesson.topicId,
      subtopicId: artifactLesson.subtopicId
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/ai/lesson-chat') {
        return new Response(
          JSON.stringify({
            displayContent: 'Good. Let’s build on that.',
            metadata: {
              action: 'advance',
              next_stage: 'concepts',
              reteach_style: null,
              reteach_count: 0,
              confidence_assessment: 0.74,
              profile_update: {}
            }
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
      curriculum: {
        country: 'South Africa',
        name: 'CAPS',
        grade: 'Grade 6',
        subjects: []
      },
      onboarding: {
        ...baseState.onboarding,
        selectedSubjectNames: ['English'],
        customSubjects: []
      },
      lessons: [artifactLesson],
      questions: [artifactQuestion],
      ui: {
        ...baseState.ui,
        currentScreen: 'lesson',
        learningMode: 'learn',
        activeLessonSessionId: 'artifact-session-1'
      },
      lessonSessions: [
        createLessonSession({
          id: 'artifact-session-1',
          status: 'active',
          currentStage: 'orientation',
          stagesCompleted: [],
          lessonId: artifactLesson.id,
          lessonArtifactId: 'artifact-record-1',
          questionArtifactId: 'question-artifact-record-1',
          nodeId: 'artifact-node-vocabulary',
          topicId: artifactLesson.topicId,
          topicTitle: 'Vocabulary Development',
          topicDescription: 'Build stronger word knowledge.',
          messages: [
            {
              id: 'msg-orientation-stage',
              role: 'system',
              type: 'stage_start',
              content: '◎ Orientation',
              stage: 'orientation',
              timestamp: '2026-04-20T12:00:00.000Z',
              metadata: null
            },
            {
              id: 'msg-orientation-body',
              role: 'assistant',
              type: 'teaching',
              content: 'Artifact orientation body.',
              stage: 'orientation',
              timestamp: '2026-04-20T12:00:01.000Z',
              metadata: {
                action: 'stay',
                next_stage: null,
                reteach_style: null,
                reteach_count: 0,
                confidence_assessment: 0.5,
                profile_update: {}
              }
            }
          ]
        })
      ]
    });

    await store.sendLessonMessage('Ready for the next part.');

    const state = get(store);
    const session = state.lessonSessions.find((item) => item.id === 'artifact-session-1');

    expect(session?.currentStage).toBe('concepts');
    expect(session?.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ content: 'Artifact mental model body.' }),
        expect.objectContaining({
          content:
            'Artifact concepts body.\n\nWhich idea should we check first: the key idea above? Name one and tell me the key rule in your own words.'
        })
      ])
    );
    expect(session?.messages).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining('This lesson content is no longer generated locally')
        })
      ])
    );
  });

  it('progresses an unlocked lesson control without appending a synthetic learner bubble', async () => {
    const baseState = createInitialState();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/ai/lesson-chat') {
        throw new Error('Unlocked Next step should progress locally.');
      }

      return new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const store = createAppStore({
      ...baseState,
      ui: {
        ...baseState.ui,
        currentScreen: 'lesson',
        learningMode: 'learn',
        activeLessonSessionId: 'next-step-session-1'
      },
      lessonSessions: [
        createLessonSession({
          id: 'next-step-session-1',
          status: 'active',
          currentStage: 'concepts',
          stagesCompleted: ['orientation'],
          completedAt: null,
          lessonId: baseState.lessons[0]!.id,
          topicId: baseState.curriculum.subjects[0]!.topics[0]!.id,
          softStuckCount: 2,
          messages: []
        })
      ]
    });

    await store.sendLessonControl('next_step');

    const state = get(store);
    const session = state.lessonSessions.find((item) => item.id === 'next-step-session-1');
    const requestedUrls = fetchMock.mock.calls.map(([input]) =>
      typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
    );

    expect(session?.currentStage).toBe('construction');
    expect(session?.messages.some((message) => message.role === 'user')).toBe(false);
    expect(requestedUrls).not.toContain('/api/ai/lesson-chat');
  });

  it('records lesson controls separately from learner message analytics', async () => {
    const baseState = createInitialState();
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    ));

    const store = createAppStore({
      ...baseState,
      ui: {
        ...baseState.ui,
        currentScreen: 'lesson',
        learningMode: 'learn',
        activeLessonSessionId: 'next-step-session-analytics'
      },
      lessonSessions: [
        createLessonSession({
          id: 'next-step-session-analytics',
          status: 'active',
          currentStage: 'concepts',
          stagesCompleted: ['orientation'],
          completedAt: null,
          lessonId: baseState.lessons[0]!.id,
          topicId: baseState.curriculum.subjects[0]!.topics[0]!.id,
          softStuckCount: 2,
          messages: []
        })
      ]
    });

    await store.sendLessonControl('next_step');

    const state = get(store);

    expect(state.analytics[0]).toEqual(
      expect.objectContaining({
        type: 'lesson_control_used',
        detail: 'next_step'
      })
    );
    expect(state.analytics.map((event) => event.type)).not.toContain('lesson_message_sent');
  });

  it('sends Help me start as support intent and stores the reply as a support bubble', async () => {
    const baseState = createInitialState();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/ai/lesson-chat') {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;

        expect(body.supportIntent).toBe('help_me_start');

        return new Response(
          JSON.stringify({
            displayContent:
              'Start with the deciding rule from the task above.\n\nWhich resource would you classify first?',
            metadata: {
              action: 'stay',
              next_stage: null,
              reteach_style: 'step_by_step',
              reteach_count: 1,
              confidence_assessment: 0.41,
              profile_update: {}
            }
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
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
      ui: {
        ...baseState.ui,
        currentScreen: 'lesson',
        learningMode: 'learn',
        activeLessonSessionId: 'support-session-1'
      },
      lessonSessions: [
        createLessonSession({
          id: 'support-session-1',
          status: 'active',
          currentStage: 'practice',
          stagesCompleted: ['orientation', 'concepts', 'construction', 'examples'],
          completedAt: null,
          lessonId: baseState.lessons[0]!.id,
          topicId: baseState.curriculum.subjects[0]!.topics[0]!.id,
          messages: []
        })
      ]
    });

    await store.sendLessonMessage('Help me start this practice question with the first move only.');

    const state = get(store);
    const session = state.lessonSessions.find((item) => item.id === 'support-session-1');
    const assistantMessage = session?.messages.at(-1);

    expect(assistantMessage?.role).toBe('assistant');
    expect(assistantMessage?.metadata?.response_mode).toBe('support');
    expect(assistantMessage?.metadata?.support_intent).toBe('help_me_start');
  });

  it('inserts a wrap message before the next stage messages when unlocked Next step progresses', async () => {
    const baseState = createInitialState();
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const store = createAppStore({
      ...baseState,
      ui: {
        ...baseState.ui,
        currentScreen: 'lesson',
        learningMode: 'learn',
        activeLessonSessionId: 'next-step-session-2'
      },
      lessonSessions: [
        createLessonSession({
          id: 'next-step-session-2',
          status: 'active',
          currentStage: 'concepts',
          stagesCompleted: ['orientation'],
          completedAt: null,
          lessonId: baseState.lessons[0]!.id,
          topicId: baseState.curriculum.subjects[0]!.topics[0]!.id,
          softStuckCount: 2,
          messages: []
        })
      ]
    });

    await store.sendLessonControl('next_step');

    const state = get(store);
    const session = state.lessonSessions.find((item) => item.id === 'next-step-session-2');
    const wrapIndex = session?.messages.findIndex((message) => message.type === 'wrap') ?? -1;
    const stageStartIndex =
      session?.messages.findIndex(
        (message) => message.type === 'stage_start' && message.stage === 'construction'
      ) ?? -1;
    const stageContentIndex =
      session?.messages.findIndex(
        (message) =>
          message.role === 'assistant' &&
          message.type === 'teaching' &&
          message.stage === 'construction'
      ) ?? -1;

    expect(session?.messages[wrapIndex]).toEqual(
      expect.objectContaining({
        type: 'wrap',
        content: 'Good. Let\'s move into Guided Construction.'
      })
    );
    expect(wrapIndex).toBeGreaterThan(-1);
    expect(stageStartIndex).toBeGreaterThan(wrapIndex);
    expect(stageContentIndex).toBeGreaterThan(stageStartIndex);
  });

  it('routes v2 learner answers through lesson-evaluate and appends the next checkpoint content', async () => {
    const baseState = createInitialState();
    const v2Lesson = createV2Lesson(baseState.lessons[0]!, {
      id: 'lesson-v2-runtime-1',
      title: 'Mathematics: Equivalent Fractions'
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/ai/lesson-chat') {
        throw new Error('v2 checkpoint answers should not use lesson-chat.');
      }

      if (url === '/api/ai/lesson-evaluate') {
        const body = JSON.parse(String(init?.body)) as {
          request: {
            checkpoint: string;
            lessonSessionId: string;
            lessonArtifactId: string | null;
          };
        };

        expect(body.request.checkpoint).toBe('loop_check');
        expect(body.request.lessonSessionId).toBe('v2-evaluate-session-1');
        expect(body.request.lessonArtifactId).toBe('artifact-v2-lesson-1');

        return new Response(
          JSON.stringify({
            score: 0.86,
            mustHitConceptsMet: ['core idea one'],
            missingMustHitConcepts: [],
            criticalMisconceptions: [],
            feedback: 'That captures the first rule accurately.',
            mode: 'advance',
            provider: 'local-heuristic',
            model: 'heuristic'
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
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
      profile: {
        ...baseState.profile,
        curriculumId: 'caps',
        gradeId: 'grade-6'
      },
      lessons: [v2Lesson],
      ui: {
        ...baseState.ui,
        currentScreen: 'lesson',
        learningMode: 'learn',
        activeLessonSessionId: 'v2-evaluate-session-1'
      },
      lessonSessions: [
        createV2LessonSession({
          id: 'v2-evaluate-session-1',
          lessonId: v2Lesson.id,
          lessonArtifactId: 'artifact-v2-lesson-1',
          questionArtifactId: 'artifact-v2-question-1',
          nodeId: 'graph-topic-fractions',
          messages: [
            {
              id: 'msg-v2-check',
              role: 'assistant',
              type: 'teaching',
              content: 'Explain the first idea in your own words.',
              stage: 'concepts',
              timestamp: '2026-04-21T18:00:00.000Z',
              metadata: null
            }
          ]
        })
      ]
    });

    await store.sendLessonMessage('Equivalent fractions have the same value.');

    const state = get(store);
    const session = state.lessonSessions.find((item) => item.id === 'v2-evaluate-session-1');
    const requestedUrls = fetchMock.mock.calls.map(([input]) =>
      typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
    );

    expect(requestedUrls).toContain('/api/ai/lesson-evaluate');
    expect(requestedUrls).not.toContain('/api/ai/lesson-chat');
    expect(session).toEqual(
      expect.objectContaining({
        currentStage: 'concepts',
        lessonArtifactId: 'artifact-v2-lesson-1',
        nodeId: 'graph-topic-fractions',
        v2State: expect.objectContaining({
          activeLoopIndex: 1,
          activeCheckpoint: 'loop_teach',
          labelBucket: 'concepts'
        })
      })
    );
    expect(session?.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: 'Teach the second core idea.'
        })
      ])
    );
  });

  it('routes the first concept Next step into a one-time local early diagnostic substate before advancing checkpoints', async () => {
    const baseState = createInitialState();
    const v2Lesson = createV2Lesson(baseState.lessons[0]!, {
      id: 'lesson-v2-runtime-diagnostic-1',
      title: 'Mathematics: Equivalent Fractions'
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/ai/lesson-chat' || url === '/api/ai/lesson-evaluate') {
        throw new Error('The concept-1 early diagnostic should stay local.');
      }

      return new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const store = createAppStore({
      ...baseState,
      lessons: [v2Lesson],
      ui: {
        ...baseState.ui,
        currentScreen: 'lesson',
        learningMode: 'learn',
        activeLessonSessionId: 'v2-diagnostic-session-1'
      },
      lessonSessions: [
        createV2LessonSession({
          id: 'v2-diagnostic-session-1',
          lessonId: v2Lesson.id,
          currentStage: 'concepts',
          v2State: {
            totalLoops: 2,
            activeLoopIndex: 0,
            activeCheckpoint: 'loop_teach',
            revisionAttemptCount: 0,
            remediationStep: 'none',
            labelBucket: 'concepts',
            skippedGaps: [],
            needsTeacherReview: false,
            cardSubstate: 'default',
            concept1EarlyDiagnosticCompleted: false
          },
          messages: [
            {
              id: 'msg-v2-loop-teach',
              role: 'assistant',
              type: 'teaching',
              content: 'Teach the first core idea.',
              stage: 'concepts',
              timestamp: '2026-04-22T10:00:00.000Z',
              metadata: null
            }
          ]
        })
      ]
    });

    await store.sendLessonControl('next_step');

    const state = get(store);
    const updated = state.lessonSessions.find((item) => item.id === 'v2-diagnostic-session-1');

    expect(updated?.v2State).toEqual(
      expect.objectContaining({
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_teach',
        cardSubstate: 'concept1_early_diagnostic',
        concept1EarlyDiagnosticCompleted: false
      })
    );
    expect(updated?.messages).toHaveLength(1);
  });

  it('submits the concept-1 early diagnostic locally and advances into the existing loop example path', async () => {
    const baseState = createInitialState();
    const v2Lesson = createV2Lesson(baseState.lessons[0]!, {
      id: 'lesson-v2-runtime-diagnostic-2',
      title: 'Mathematics: Equivalent Fractions'
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/ai/lesson-chat' || url === '/api/ai/lesson-evaluate') {
        throw new Error('The concept-1 early diagnostic should stay local.');
      }

      return new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const store = createAppStore({
      ...baseState,
      lessons: [v2Lesson],
      ui: {
        ...baseState.ui,
        currentScreen: 'lesson',
        learningMode: 'learn',
        activeLessonSessionId: 'v2-diagnostic-session-2'
      },
      lessonSessions: [
        createV2LessonSession({
          id: 'v2-diagnostic-session-2',
          lessonId: v2Lesson.id,
          currentStage: 'concepts',
          v2State: {
            totalLoops: 2,
            activeLoopIndex: 0,
            activeCheckpoint: 'loop_teach',
            revisionAttemptCount: 0,
            remediationStep: 'none',
            labelBucket: 'concepts',
            skippedGaps: [],
            needsTeacherReview: false,
            cardSubstate: 'concept1_early_diagnostic',
            concept1EarlyDiagnosticCompleted: false
          },
          messages: [
            {
              id: 'msg-v2-loop-teach',
              role: 'assistant',
              type: 'teaching',
              content: 'Teach the first core idea.',
              stage: 'concepts',
              timestamp: '2026-04-22T10:00:00.000Z',
              metadata: null
            }
          ]
        })
      ]
    });

    await store.submitLessonDiagnostic('a');

    const state = get(store);
    const updated = state.lessonSessions.find((item) => item.id === 'v2-diagnostic-session-2');

    expect(updated?.v2State).toEqual(
      expect.objectContaining({
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_example',
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      })
    );
    expect(updated?.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: 'Here is the first worked example.'
        })
      ])
    );
  });

  it('uses the local unlocked Next step path for v2 checkpoints without falling back to legacy stage progression', async () => {
    const baseState = createInitialState();
    const v2Lesson = createV2Lesson(baseState.lessons[0]!, {
      id: 'lesson-v2-runtime-2',
      title: 'Mathematics: Equivalent Fractions'
    });
    const session = createV2LessonSession({
      id: 'v2-next-step-session-1',
      lessonId: v2Lesson.id,
      lessonArtifactId: 'artifact-v2-lesson-2',
      questionArtifactId: 'artifact-v2-question-2',
      currentStage: 'concepts',
      v2State: {
        totalLoops: 2,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_example',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false
      },
      messages: [
        {
          id: 'msg-v2-example',
          role: 'assistant',
          type: 'teaching',
          content: 'Here is the first worked example.',
          stage: 'concepts',
          timestamp: '2026-04-21T18:10:00.000Z',
          metadata: null
        }
      ]
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/ai/lesson-chat' || url === '/api/ai/lesson-evaluate') {
        throw new Error('Unlocked v2 Next step should progress locally.');
      }

      return new Response(JSON.stringify({ persisted: true }), {
        status: 200,
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
      lessons: [v2Lesson],
      ui: {
        ...baseState.ui,
        currentScreen: 'lesson',
        learningMode: 'learn',
        activeLessonSessionId: session.id
      },
      lessonSessions: [session]
    });

    await store.sendLessonControl('next_step');

    const state = get(store);
    const updated = state.lessonSessions.find((item) => item.id === session.id);
    const wrapMessage = updated?.messages.find((message) => message.type === 'wrap');

    expect(updated?.currentStage).toBe('concepts');
    expect(updated?.v2State).toEqual(
      expect.objectContaining({
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_practice',
        labelBucket: 'concepts'
      })
    );
    expect(updated?.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: 'Try the first task on your own.'
        })
      ])
    );
    expect(wrapMessage?.content).toContain('Active Practice');
  });

  it('persists final v2 residue on completion and includes it in the revision handoff topic', async () => {
    const baseState = createInitialState();
    const v2Lesson = createV2Lesson(baseState.lessons[0]!, {
      id: 'lesson-v2-runtime-3',
      title: 'Mathematics: Equivalent Fractions'
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/ai/lesson-evaluate') {
        return new Response(
          JSON.stringify({
            score: 0.91,
            mustHitConceptsMet: ['core idea one'],
            missingMustHitConcepts: [],
            criticalMisconceptions: [],
            feedback: 'That captures the rule clearly.',
            mode: 'advance',
            provider: 'local-heuristic',
            model: 'heuristic'
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(JSON.stringify({ recorded: true }), {
        status: 200,
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
      lessons: [v2Lesson],
      ui: {
        ...baseState.ui,
        currentScreen: 'lesson',
        learningMode: 'learn',
        activeLessonSessionId: 'v2-complete-session-1'
      },
      lessonSessions: [
        createV2LessonSession({
          id: 'v2-complete-session-1',
          lessonId: v2Lesson.id,
          currentStage: 'check',
          stagesCompleted: ['orientation', 'concepts', 'practice'],
          lessonArtifactId: 'artifact-v2-lesson-3',
          nodeId: 'graph-topic-fractions',
          topicDiscovery: {
            topicSignature: 'subject-1::caps::grade-6::equivalent fractions',
            topicLabel: 'Equivalent Fractions',
            source: 'graph_existing',
            requestId: 'request-v2-complete-1',
            rankPosition: 1
          },
          v2State: {
            totalLoops: 2,
            activeLoopIndex: 1,
            activeCheckpoint: 'exit_check',
            revisionAttemptCount: 0,
            remediationStep: 'none',
            labelBucket: 'check',
            skippedGaps: [
              {
                concept: 'core idea two',
                status: 'partial',
                critical: false,
                loopId: 'lesson-v2-runtime-3-loop-2',
                remediationStep: 'scaffold',
                needsTeacherReview: false
              }
            ],
            needsTeacherReview: false
          },
          messages: [
            {
              id: 'msg-v2-exit-check',
              role: 'assistant',
              type: 'teaching',
              content: 'Summarize the main rule and apply it once.',
              stage: 'check',
              timestamp: '2026-04-21T18:20:00.000Z',
              metadata: null
            },
            {
              id: 'msg-v2-user-exit',
              role: 'user',
              type: 'response',
              content: 'Equivalent fractions have the same value even when the numbers look different.',
              stage: 'check',
              timestamp: '2026-04-21T18:21:00.000Z',
              metadata: null
            }
          ]
        })
      ]
    });

    await store.sendLessonMessage('Equivalent fractions have the same value and represent the same amount.');

    const state = get(store);
    const session = state.lessonSessions.find((item) => item.id === 'v2-complete-session-1');
    const revisionTopic = state.revisionTopics.find((item) => item.lessonSessionId === 'v2-complete-session-1');

    expect(session?.status).toBe('complete');
    expect(session?.residue).toEqual(
      expect.objectContaining({
        taughtConcepts: expect.arrayContaining(['core idea one', 'core idea two']),
        masteredConcepts: ['core idea one'],
        partialConcepts: ['core idea two'],
        revisitNext: ['core idea two'],
        confidenceScore: 0.91,
        learnerReflection: 'Equivalent fractions have the same value and represent the same amount.',
        confidenceReflection: 'Equivalent fractions have the same value and represent the same amount.'
      })
    );
    expect(revisionTopic?.lessonResidue).toEqual(
      expect.objectContaining({
        masteredConcepts: ['core idea one'],
        partialConcepts: ['core idea two'],
        confidenceScore: 0.91,
        learnerReflection: 'Equivalent fractions have the same value and represent the same amount.'
      })
    );
  });

  it('persists mid-loop abandonment residue and records discovery abandonment without ending the session', async () => {
    const baseState = createInitialState();
    const v2Lesson = createV2Lesson(baseState.lessons[0]!, {
      id: 'lesson-v2-runtime-4',
      title: 'Mathematics: Equivalent Fractions'
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/curriculum/topic-discovery/abandon') {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;

        expect(body).toEqual(
          expect.objectContaining({
            subjectId: baseState.curriculum.subjects[0]!.id,
            curriculumId: baseState.profile.curriculumId,
            gradeId: baseState.profile.gradeId,
            topicSignature: 'subject-1::caps::grade-6::equivalent fractions',
            topicLabel: 'Equivalent Fractions',
            nodeId: 'graph-topic-fractions',
            source: 'graph_existing',
            lessonSessionId: 'v2-abandon-session-1',
            requestId: 'request-v2-abandon-1',
            rankPosition: 2,
            activeLoopIndex: 0,
            activeCheckpoint: 'loop_practice',
            remediationStep: 'hint',
            unresolvedGap: 'core idea one'
          })
        );

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
      profile: {
        ...baseState.profile,
        curriculumId: 'caps',
        gradeId: 'grade-6'
      },
      lessons: [v2Lesson],
      ui: {
        ...baseState.ui,
        currentScreen: 'lesson',
        learningMode: 'learn',
        activeLessonSessionId: 'v2-abandon-session-1'
      },
      lessonSessions: [
        createV2LessonSession({
          id: 'v2-abandon-session-1',
          lessonId: v2Lesson.id,
          status: 'active',
          completedAt: null,
          lessonArtifactId: 'artifact-v2-lesson-4',
          nodeId: 'graph-topic-fractions',
          topicDiscovery: {
            topicSignature: 'subject-1::caps::grade-6::equivalent fractions',
            topicLabel: 'Equivalent Fractions',
            source: 'graph_existing',
            requestId: 'request-v2-abandon-1',
            rankPosition: 2
          },
          v2State: {
            totalLoops: 2,
            activeLoopIndex: 0,
            activeCheckpoint: 'loop_practice',
            revisionAttemptCount: 1,
            remediationStep: 'hint',
            labelBucket: 'concepts',
            skippedGaps: [],
            needsTeacherReview: false
          },
          messages: [
            {
              id: 'msg-v2-practice',
              role: 'assistant',
              type: 'teaching',
              content: 'Try the first task on your own.',
              stage: 'concepts',
              timestamp: '2026-04-21T18:30:00.000Z',
              metadata: {
                action: 'stay',
                next_stage: null,
                reteach_style: null,
                reteach_count: 0,
                confidence_assessment: 0.58,
                lesson_score: 0.58,
                must_hit_concepts_met: [],
                missing_must_hit_concepts: ['core idea one'],
                critical_misconceptions: [],
                remediation_step: 'hint',
                revision_attempt_used: true,
                profile_update: {}
              }
            }
          ]
        })
      ]
    });

    await store.closeLessonToDashboard();

    const state = get(store);
    const session = state.lessonSessions.find((item) => item.id === 'v2-abandon-session-1');
    const requestedUrls = fetchMock.mock.calls.map(([input]) =>
      typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
    );

    expect(state.ui.currentScreen).toBe('dashboard');
    expect(session?.status).toBe('active');
    expect(session?.residue?.abandonment).toEqual(
      expect.objectContaining({
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_practice',
        remediationStep: 'hint',
        unresolvedGap: 'core idea one'
      })
    );
    expect(requestedUrls).toContain('/api/curriculum/topic-discovery/abandon');
  });

  describe('AI evaluation on demand (Phase 7)', () => {
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
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ error: `Unhandled request for ${url}` }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      });
      vi.stubGlobal('fetch', fetchMock);
    });

    it('7.10: requestAiEvaluation replaces heuristic scores with AI scores on lastTurnResult', async () => {
      const baseState = createInitialState();
      const topic = createRevisionTopic();
      const aiScores = {
        correctness: 0.85,
        reasoning: 0.8,
        completeness: 0.9,
        confidenceAlignment: 0.75,
        selfConfidenceScore: 0.6,
        calibrationGap: 0.15
      };

      fetchMock.mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        if (url.endsWith('/api/ai/revision-pack')) {
          const body = JSON.parse(String(init?.body ?? '{}')) as { request: RevisionPackRequest };
          return new Response(JSON.stringify(buildMockRevisionPackPayload(body.request)), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (url.endsWith('/api/ai/revision-evaluate')) {
          return new Response(JSON.stringify({ scores: aiScores }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ error: `Unhandled request for ${url}` }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      });

      const store = createAppStore({
        ...baseState,
        lessonSessions: [createLessonSession({ id: topic.lessonSessionId, subjectId: topic.subjectId, subject: topic.subject, topicTitle: topic.topicTitle, curriculumReference: topic.curriculumReference })],
        revisionTopics: [topic]
      });

      await store.runRevisionSession(topic);
      store.submitRevisionAnswer('Weak answer', 3);
      await flushAsyncWork();

      const heuristicResult = get(store).revisionSession?.lastTurnResult;
      expect(heuristicResult?.scoringProvider).toBe('heuristic');

      await store.requestAiEvaluation();
      await flushAsyncWork();

      const state = get(store);
      expect(state.revisionSession?.lastTurnResult?.scoringProvider).toBe('ai');
      expect(state.revisionSession?.lastTurnResult?.scores.correctness).toBe(0.85);
      expect(state.revisionSession?.evaluating).toBe(false);
    });

    it('7.11: borderline auto-trigger fires AI evaluation when correctness is in 0.45-0.65 zone', async () => {
      const baseState = createInitialState();
      const topic = createRevisionTopic();

      const evaluateRequests: string[] = [];
      fetchMock.mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        if (url.endsWith('/api/ai/revision-pack')) {
          const body = JSON.parse(String(init?.body ?? '{}')) as { request: RevisionPackRequest };
          return new Response(JSON.stringify(buildMockRevisionPackPayload(body.request)), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (url.endsWith('/api/ai/revision-evaluate')) {
          evaluateRequests.push(url);
          return new Response(JSON.stringify({ scores: { correctness: 0.6, reasoning: 0.5, completeness: 0.55 } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ error: `Unhandled request for ${url}` }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      });

      const store = createAppStore({
        ...baseState,
        lessonSessions: [createLessonSession({ id: topic.lessonSessionId, subjectId: topic.subjectId, subject: topic.subject, topicTitle: topic.topicTitle, curriculumReference: topic.curriculumReference })],
        revisionTopics: [topic]
      });

      await store.runRevisionSession(topic);
      // Answer that produces borderline heuristic score (0.45-0.65)
      await store.submitRevisionAnswer('Fractions compare parts of a whole because of denominator is the total number of equal parts and the numerator is the selected part with examples.', 3);
      await flushAsyncWork();

      const state = get(store);
      const lastTurnResult = state.revisionSession?.lastTurnResult;

      expect(lastTurnResult).toBeDefined();
      if (lastTurnResult) {
        // Borderline trigger should have called the evaluate endpoint
        expect(evaluateRequests.length).toBeGreaterThan(0);
        // After AI completes, scores should be updated
        expect(lastTurnResult.scoringProvider).toBe('ai');
      }
    });

    it('7.12: borderline auto-trigger does NOT fire when correctness is above 0.65', async () => {
      const baseState = createInitialState();
      const topic = createRevisionTopic();

      const evaluateRequests: string[] = [];
      fetchMock.mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        if (url.endsWith('/api/ai/revision-pack')) {
          const body = JSON.parse(String(init?.body ?? '{}')) as { request: RevisionPackRequest };
          return new Response(JSON.stringify(buildMockRevisionPackPayload(body.request)), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (url.endsWith('/api/ai/revision-evaluate')) {
          evaluateRequests.push(url);
          return new Response(JSON.stringify({ scores: { correctness: 0.9, reasoning: 0.9, completeness: 0.9 } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ error: `Unhandled request for ${url}` }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      });

      const store = createAppStore({
        ...baseState,
        lessonSessions: [createLessonSession({ id: topic.lessonSessionId, subjectId: topic.subjectId, subject: topic.subject, topicTitle: topic.topicTitle, curriculumReference: topic.curriculumReference })],
        revisionTopics: [topic]
      });

      await store.runRevisionSession(topic);
      // Very weak answer — should score below 0.45 (not in borderline zone)
      await store.submitRevisionAnswer('I do not know.', 1);
      await flushAsyncWork();

      const state = get(store);
      const lastTurnResult = state.revisionSession?.lastTurnResult;

      expect(lastTurnResult).toBeDefined();
      if (lastTurnResult) {
        // Score should be below borderline zone
        expect(lastTurnResult.scores.correctness).toBeLessThan(0.45);
        // AI evaluate endpoint should NOT have been called
        expect(evaluateRequests.length).toBe(0);
        expect(lastTurnResult.scoringProvider).toBe('heuristic');
      }
    });

    it('7.14: requestAiEvaluation preserves heuristic scores when endpoint returns non-ok', async () => {
      const baseState = createInitialState();
      const topic = createRevisionTopic();

      fetchMock.mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        if (url.endsWith('/api/ai/revision-pack')) {
          const body = JSON.parse(String(init?.body ?? '{}')) as { request: RevisionPackRequest };
          return new Response(JSON.stringify(buildMockRevisionPackPayload(body.request)), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (url.endsWith('/api/ai/revision-evaluate')) {
          return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ error: `Unhandled request for ${url}` }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      });

      const store = createAppStore({
        ...baseState,
        lessonSessions: [createLessonSession({ id: topic.lessonSessionId, subjectId: topic.subjectId, subject: topic.subject, topicTitle: topic.topicTitle, curriculumReference: topic.curriculumReference })],
        revisionTopics: [topic]
      });

      await store.runRevisionSession(topic);
      await store.submitRevisionAnswer('Weak answer', 3);
      await flushAsyncWork();

      const heuristicState = get(store);
      const heuristicCorrectness = heuristicState.revisionSession?.lastTurnResult?.scores.correctness;
      expect(heuristicState.revisionSession?.lastTurnResult?.scoringProvider).toBe('heuristic');

      await store.requestAiEvaluation();
      await flushAsyncWork();

      const state = get(store);
      expect(state.revisionSession?.lastTurnResult?.scoringProvider).toBe('heuristic');
      expect(state.revisionSession?.lastTurnResult?.scores.correctness).toBe(heuristicCorrectness);
      expect(state.revisionSession?.evaluating).toBe(false);
    });

    it('7.13: Check my answer properly button is hidden after AI evaluation completes', async () => {
      const baseState = createInitialState();
      const topic = createRevisionTopic();
      const aiScores = {
        correctness: 0.85,
        reasoning: 0.8,
        completeness: 0.9,
        confidenceAlignment: 0.75,
        selfConfidenceScore: 0.6,
        calibrationGap: 0.15
      };

      fetchMock.mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        if (url.endsWith('/api/ai/revision-pack')) {
          const body = JSON.parse(String(init?.body ?? '{}')) as { request: RevisionPackRequest };
          return new Response(JSON.stringify(buildMockRevisionPackPayload(body.request)), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (url.endsWith('/api/ai/revision-evaluate')) {
          return new Response(JSON.stringify({ scores: aiScores }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ error: `Unhandled request for ${url}` }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      });

      const store = createAppStore({
        ...baseState,
        lessonSessions: [createLessonSession({ id: topic.lessonSessionId, subjectId: topic.subjectId, subject: topic.subject, topicTitle: topic.topicTitle, curriculumReference: topic.curriculumReference })],
        revisionTopics: [topic]
      });

      await store.runRevisionSession(topic);
      store.submitRevisionAnswer('Test answer', 3);
      await flushAsyncWork();

      const stateBeforeAI = get(store);
      expect(stateBeforeAI.revisionSession?.lastTurnResult?.scoringProvider).toBe('heuristic');

      await store.requestAiEvaluation();
      await flushAsyncWork();

      const stateAfterAI = get(store);
      expect(stateAfterAI.revisionSession?.lastTurnResult?.scoringProvider).toBe('ai');
    });
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
