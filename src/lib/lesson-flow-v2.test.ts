import { describe, expect, it } from 'vitest';
import { createInitialState } from '$lib/data/platform';
import {
  createEmptyLessonFlowV2SessionState,
  normalizeLessonRecord,
  normalizeLessonSessionRecord
} from '$lib/lesson-flow-v2';
import type { LessonSession } from '$lib/types';

describe('lesson-flow-v2', () => {
  it('normalizes legacy lessons to the v1 flow boundary', () => {
    const lesson = createInitialState().lessons[0]!;

    const normalized = normalizeLessonRecord(lesson);

    expect(normalized.lessonFlowVersion).toBe('v1');
    expect(normalized.flowV2).toBeNull();
  });

  it('provides default runtime state for v2 sessions', () => {
    const lesson = createInitialState().lessons[0]!;
    const normalized = normalizeLessonSessionRecord({
      id: 'session-v2',
      studentId: 'student-1',
      subjectId: lesson.subjectId,
      subject: 'Mathematics',
      lessonFlowVersion: 'v2',
      topicId: lesson.topicId,
      topicTitle: 'Fractions',
      topicDescription: 'Equivalent fractions',
      curriculumReference: 'CAPS · Grade 6 · Mathematics',
      matchedSection: 'Fractions',
      lessonId: lesson.id,
      currentStage: 'orientation',
      stagesCompleted: [],
      messages: [],
      questionCount: 0,
      reteachCount: 0,
      softStuckCount: 0,
      confidenceScore: 0.5,
      needsTeacherReview: false,
      stuckConcept: null,
      startedAt: '2026-04-21T10:00:00.000Z',
      lastActiveAt: '2026-04-21T10:00:00.000Z',
      completedAt: null,
      status: 'active',
      profileUpdates: []
    } satisfies LessonSession);

    expect(normalized.lessonFlowVersion).toBe('v2');
    expect(normalized.v2State).toEqual(createEmptyLessonFlowV2SessionState());
    expect(normalized.residue).toBeNull();
  });
});
