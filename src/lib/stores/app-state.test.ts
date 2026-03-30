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
});
