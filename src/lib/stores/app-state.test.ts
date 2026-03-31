import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { createInitialState } from '$lib/data/platform';
import type { LessonSession, RevisionTopic } from '$lib/types';
import { appState, createAppStore, lessonSessionStore, profileStore, uiStore, revisionStore } from './app-state';

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
    store.startRevisionLessonHandoff();

    const state = get(store);
    const handoffSession = state.lessonSessions[0];

    expect(handoffSession?.messages.some((message) => /repeated gap|fractions core gap/i.test(message.content))).toBe(true);
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

    store.createRevisionPlan({
      subjectId: baseState.curriculum.subjects[0]!.id,
      examName: 'Math mid-term',
      examDate: '2026-04-12',
      mode: 'manual',
      manualTopics: ['Fractions'],
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
  it('logs a session_started event when launching a brand new lesson', () => {
    const baseState = createInitialState();
    const store = createAppStore({
      ...baseState,
      lessonSessions: []
    });
    const lessonId = baseState.lessons[0]!.id;

    store.launchLesson(lessonId);

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
