import { describe, expect, it } from 'vitest';
import { deriveDashboardLessonLists } from '$lib/components/dashboard-lessons';
import type { LessonSession } from '$lib/types';

function createSession(overrides: Partial<LessonSession>): LessonSession {
  return {
    id: 'lesson-session-1',
    studentId: 'student-1',
    lessonId: 'lesson-1',
    subjectId: 'subject-1',
    subject: 'Mathematics',
    topicId: 'topic-1',
    topicTitle: 'Number patterns',
    topicDescription: 'Work with linear number patterns.',
    curriculumReference: 'CAPS Grade 6',
    matchedSection: 'Patterns and relationships',
    currentStage: 'orientation',
    stagesCompleted: [],
    messages: [],
    questionCount: 0,
    reteachCount: 0,
    confidenceScore: 0.5,
    needsTeacherReview: false,
    stuckConcept: null,
    startedAt: '2026-03-23T08:00:00.000Z',
    lastActiveAt: '2026-03-23T08:00:00.000Z',
    completedAt: null,
    status: 'active',
    profileUpdates: [],
    ...overrides
  };
}

describe('deriveDashboardLessonLists', () => {
  it('shows the current lesson in recents when it is the only available lesson', () => {
    const onlySession = createSession({});

    expect(deriveDashboardLessonLists([onlySession])).toEqual({
      currentSession: onlySession,
      recentLessons: [onlySession]
    });
  });

  it('keeps the current lesson in the resume strip and excludes it from recents when other lessons exist', () => {
    const currentSession = createSession({
      id: 'lesson-session-current',
      lastActiveAt: '2026-03-23T09:00:00.000Z'
    });
    const olderSession = createSession({
      id: 'lesson-session-older',
      topicTitle: 'Fractions',
      lastActiveAt: '2026-03-22T09:00:00.000Z',
      status: 'complete',
      completedAt: '2026-03-22T09:10:00.000Z'
    });

    expect(deriveDashboardLessonLists([olderSession, currentSession])).toEqual({
      currentSession,
      recentLessons: [olderSession]
    });
  });
});
