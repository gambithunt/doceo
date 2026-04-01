import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { createInitialState } from '$lib/data/platform';
import type { LessonSession, RevisionTopic } from '$lib/types';
import { appState, createAppStore, lessonSessionStore, profileStore, uiStore, revisionStore } from './app-state';

const { getAuthenticatedHeaders } = vi.hoisted(() => ({
  getAuthenticatedHeaders: vi.fn()
}));

vi.mock('$lib/authenticated-fetch', () => ({
  getAuthenticatedHeaders
}));

function createRevisionTopic(overrides: Partial<RevisionTopic> = {}): RevisionTopic {
  return {
    lessonSessionId: 'revision-session-1',
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

describe('domain store slices', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getAuthenticatedHeaders.mockResolvedValue({
      Authorization: 'Bearer token'
    });
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
  it('keeps the same question active after a weak answer that needs rechecking', () => {
    const baseState = createInitialState();
    const topic = createRevisionTopic();
    const store = createAppStore({
      ...baseState,
      lessonSessions: [createLessonSession({ id: topic.lessonSessionId, subjectId: topic.subjectId, subject: topic.subject, topicTitle: topic.topicTitle, curriculumReference: topic.curriculumReference })],
      revisionTopics: [topic]
    });

    store.runRevisionSession(topic);
    store.submitRevisionAnswer('Not sure.', 2);

    const state = get(store);

    expect(state.revisionSession?.questionIndex).toBe(0);
    expect(state.revisionSession?.lastTurnResult?.sessionDecision).toBe('reschedule');
    expect(state.revisionSession?.lastTurnResult?.nextQuestion?.id).toBe(
      state.revisionSession?.questions[0]?.id
    );
  });

  it('starts a revision session in the selected mode', () => {
    const baseState = createInitialState();
    const topic = createRevisionTopic();
    const store = createAppStore({
      ...baseState,
      lessonSessions: [createLessonSession({ id: topic.lessonSessionId, subjectId: topic.subjectId, subject: topic.subject, topicTitle: topic.topicTitle, curriculumReference: topic.curriculumReference })],
      revisionTopics: [topic]
    });

    store.runRevisionSession(topic, {
      mode: 'teacher_mode',
      source: 'manual',
      recommendationReason: 'Teach it back to lock the idea in'
    });

    const state = get(store);

    expect(state.revisionSession?.mode).toBe('teacher_mode');
    expect(state.revisionSession?.questions.some((question) => question.questionType === 'teacher_mode')).toBe(true);
    expect(state.revisionSession?.recommendationReason).toBe('Teach it back to lock the idea in');
  });

  it('updates the topic attached to the active shuffle question instead of always using the primary topic', () => {
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

    store.runRevisionSession(firstTopic, {
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

  it('persists calibration changes back onto the revision topic after an answer', () => {
    const baseState = createInitialState();
    const topic = createRevisionTopic();
    const store = createAppStore({
      ...baseState,
      lessonSessions: [createLessonSession({ id: topic.lessonSessionId, subjectId: topic.subjectId, subject: topic.subject, topicTitle: topic.topicTitle, curriculumReference: topic.curriculumReference })],
      revisionTopics: [topic]
    });

    store.runRevisionSession(topic);
    store.submitRevisionAnswer('I am completely sure, but I cannot explain it.', 5);

    const state = get(store);
    const updatedTopic = state.revisionTopics[0];

    expect(updatedTopic?.calibration.attempts).toBe(2);
    expect(updatedTopic?.calibration.averageSelfConfidence).toBeGreaterThan(3);
    expect(updatedTopic?.calibration.confidenceGap).toBeGreaterThan(0.18);
  });

  it('creates a focused mini-lesson handoff when revision escalates', () => {
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

    store.runRevisionSession(topic);
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

  it('can exit an active revision session back to the regular revision tab', () => {
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

    store.runRevisionSession(topic, {
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

  it('uses repeated misconception signals in the mini-lesson handoff brief', () => {
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

    store.runRevisionSession(topic);
    store.markRevisionStuck();
    store.escalateToLesson();
    store.startRevisionLessonHandoff();

    const state = get(store);
    const handoffSession = state.lessonSessions[0];

    expect(handoffSession?.messages.some((message) => /repeated gap|fractions core gap/i.test(message.content))).toBe(true);
  });

  it('keeps the revision session active when the student marks the question as stuck', () => {
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

    store.runRevisionSession(topic);
    store.markRevisionStuck();

    const state = get(store);

    expect(state.revisionSession?.status).toBe('active');
    expect(state.revisionSession?.currentHelp?.type).toBe('worked_step');
    expect(state.revisionSession?.currentInterventionLevel).toBe('worked_step');
  });

  it('can explicitly escalate to lesson after showing worked steps', () => {
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

    store.runRevisionSession(topic);
    store.markRevisionStuck();
    store.escalateToLesson();

    const state = get(store);

    expect(state.revisionSession?.status).toBe('escalated_to_lesson');
    expect(state.revisionSession?.currentHelp?.type).toBe('worked_step');
  });

  it('records an answer and waits for an explicit next-step action before advancing', () => {
    const baseState = createInitialState();
    const topic = createRevisionTopic();
    const store = createAppStore({
      ...baseState,
      lessonSessions: [createLessonSession({ id: topic.lessonSessionId, subjectId: topic.subjectId, subject: topic.subject, topicTitle: topic.topicTitle, curriculumReference: topic.curriculumReference })],
      revisionTopics: [topic]
    });

    store.runRevisionSession(topic);
    store.submitRevisionAnswer('Fractions compare parts of a whole because the denominator is the total and the numerator is the selected part with one example.', 4);

    const state = get(store);

    expect(state.revisionSession?.questionIndex).toBe(0);
    expect(state.revisionSession?.awaitingAdvance).toBe(true);
    expect(state.revisionSession?.lastTurnResult?.sessionDecision).toBe('continue');
  });

  it('force-advances to the next question after a weak answer when the student chooses next', () => {
    const baseState = createInitialState();
    const topic = createRevisionTopic();
    const store = createAppStore({
      ...baseState,
      lessonSessions: [createLessonSession({ id: topic.lessonSessionId, subjectId: topic.subjectId, subject: topic.subject, topicTitle: topic.topicTitle, curriculumReference: topic.curriculumReference })],
      revisionTopics: [topic]
    });

    store.runRevisionSession(topic);
    store.submitRevisionAnswer('Not sure.', 2);
    store.forceAdvanceRevision();

    const state = get(store);

    expect(state.revisionSession?.questionIndex).toBe(1);
    expect(state.revisionSession?.awaitingAdvance).toBe(false);
    expect(state.revisionSession?.skippedQuestionIds).toContain(state.revisionAttempts[0]?.questionId);
  });
});

describe('revision plans', () => {
  it('creates a saved revision plan and makes it active without overwriting earlier plans', () => {
    const baseState = createInitialState();
    const store = createAppStore(baseState);

    store.createRevisionPlan({
      subjectId: baseState.curriculum.subjects[0]!.id,
      examName: 'Math mid-term',
      examDate: '2026-04-12',
      mode: 'weak_topics',
      timeBudgetMinutes: 20
    });
    store.createRevisionPlan({
      subjectId: baseState.curriculum.subjects[0]!.id,
      examName: 'Math final',
      examDate: '2026-06-18',
      mode: 'full_subject',
      timeBudgetMinutes: 30
    });

    const state = get(store);

    expect(state.revisionPlans).toHaveLength(2);
    expect(state.activeRevisionPlanId).toBe(state.revisionPlans[0]?.id);
    expect(state.revisionPlans.map((plan) => plan.examName)).toEqual(['Math final', 'Math mid-term']);
    expect(state.revisionPlan.examName).toBe('Math final');
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

    store.createRevisionPlan({
      subjectId: primarySubject.id,
      examName: 'Broken plan',
      examDate: '2026-05-01',
      mode: 'manual',
      manualTopics: [foreignTopic!.name],
      timeBudgetMinutes: 15
    });

    const state = get(store);

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
});
