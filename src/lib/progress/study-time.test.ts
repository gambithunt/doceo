import { describe, expect, it } from 'vitest';
import { estimateLessonSessionStudyMinutes } from '$lib/progress/study-time';
import type { LessonSession, LessonMessage } from '$lib/types';

function createMessage(timestamp: string): LessonMessage {
  return {
    id: `msg-${timestamp}`,
    role: 'user',
    type: 'question',
    content: 'Help me understand this step.',
    stage: 'practice',
    timestamp,
    metadata: null
  };
}

function createSession(overrides: Partial<LessonSession> = {}): LessonSession {
  return {
    id: 'session-1',
    studentId: 'student-1',
    subjectId: 'subject-1',
    subject: 'Mathematics',
    topicId: 'topic-1',
    topicTitle: 'Fractions',
    topicDescription: 'Fractions basics',
    curriculumReference: 'CAPS Grade 6',
    matchedSection: 'Fractions',
    lessonId: 'lesson-1',
    currentStage: 'practice',
    stagesCompleted: ['orientation', 'concepts', 'construction', 'examples'],
    messages: [],
    questionCount: 0,
    reteachCount: 0,
    confidenceScore: 0.64,
    needsTeacherReview: false,
    stuckConcept: null,
    startedAt: '2026-03-31T08:00:00.000Z',
    lastActiveAt: '2026-03-31T08:22:00.000Z',
    completedAt: null,
    status: 'active',
    profileUpdates: [],
    ...overrides
  };
}

describe('estimateLessonSessionStudyMinutes', () => {
  it('adds active gaps but caps long idle spans', () => {
    const session = createSession({
      messages: [
        createMessage('2026-03-31T08:03:00.000Z'),
        createMessage('2026-03-31T08:09:00.000Z'),
        createMessage('2026-03-31T08:22:00.000Z')
      ]
    });

    expect(estimateLessonSessionStudyMinutes(session)).toBe(17);
  });

  it('falls back to the started-to-last-active window when there are no messages', () => {
    const session = createSession({
      messages: [],
      startedAt: '2026-03-31T08:00:00.000Z',
      lastActiveAt: '2026-03-31T08:05:00.000Z'
    });

    expect(estimateLessonSessionStudyMinutes(session)).toBe(5);
  });
});
