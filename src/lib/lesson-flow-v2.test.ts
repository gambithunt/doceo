import { describe, expect, it } from 'vitest';
import { createInitialState } from '$lib/data/platform';
import {
  advanceLessonFlowV2State,
  createEmptyLessonFlowV2SessionState,
  createEmptyLessonSessionEvidence,
  appendLoopEvidence,
  normalizeLessonRecord,
  normalizeLessonSessionRecord,
  routeLessonFlowV2NextState
} from '$lib/lesson-flow-v2';
import type { LessonSession, LoopEvidence } from '$lib/types';

function createLoopEvidence(overrides: Partial<LoopEvidence> = {}): LoopEvidence {
  return {
    loopId: 'loop-1',
    loopIndex: 0,
    loopTitle: 'Equivalent parts',
    conceptsMet: ['same value'],
    gaps: [],
    misconceptions: [],
    score: 0.82,
    attemptCount: 1,
    styleSignals: {
      neededScaffolding: false,
      askedClarifyingQuestion: false,
      answeredOnFirstAttempt: true,
      explanationWasVague: false,
      usedConcreteLanguage: true
    },
    evaluatedAt: '2026-05-20T10:00:00.000Z',
    ...overrides
  };
}

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

  it('creates empty v2 lesson session evidence defaults', () => {
    expect(createEmptyLessonSessionEvidence()).toEqual({
      loops: [],
      pace: 'normal',
      criticalGaps: [],
      confirmedMisconceptions: [],
      independentAttemptScore: null,
      exitCheckPassed: null
    });
  });

  it('creates v2 evidence with a single loop when appending onto null evidence', () => {
    const loopEvidence = createLoopEvidence();

    expect(appendLoopEvidence(null, loopEvidence)).toEqual({
      loops: [loopEvidence],
      pace: 'fast',
      criticalGaps: [],
      confirmedMisconceptions: [],
      independentAttemptScore: null,
      exitCheckPassed: null
    });
  });

  it('promotes repeated gaps into critical gaps when appending loop evidence', () => {
    const existing = appendLoopEvidence(null, createLoopEvidence({ gaps: ['unit conversion'] }));
    const nextLoopEvidence = createLoopEvidence({
      loopId: 'loop-2',
      loopIndex: 1,
      loopTitle: 'Compare converted units',
      gaps: ['unit conversion', 'fraction scale']
    });

    expect(appendLoopEvidence(existing, nextLoopEvidence).criticalGaps).toEqual(['unit conversion']);
  });

  it('marks evidence pace as fast when all loops are answered in one attempt', () => {
    const first = appendLoopEvidence(null, createLoopEvidence({ attemptCount: 1 }));
    const second = appendLoopEvidence(first, createLoopEvidence({ loopId: 'loop-2', loopIndex: 1, attemptCount: 1 }));

    expect(second.pace).toBe('fast');
  });

  it('marks evidence pace as slow when any loop needs three or more attempts', () => {
    const first = appendLoopEvidence(null, createLoopEvidence({ attemptCount: 1 }));
    const second = appendLoopEvidence(first, createLoopEvidence({ loopId: 'loop-2', loopIndex: 1, attemptCount: 3 }));

    expect(second.pace).toBe('slow');
  });

  it('deduplicates confirmed misconceptions across all loop evidence', () => {
    const first = appendLoopEvidence(null, createLoopEvidence({ misconceptions: ['part-whole confusion'] }));
    const second = appendLoopEvidence(
      first,
      createLoopEvidence({
        loopId: 'loop-2',
        loopIndex: 1,
        misconceptions: ['part-whole confusion', 'denominator means size']
      })
    );

    expect(second.confirmedMisconceptions).toEqual(['part-whole confusion', 'denominator means size']);
  });

  // --- Prompt 5: Evidence-based loop routing ---

  function makeV2State(totalLoops: number, activeLoopIndex: number): ReturnType<typeof createEmptyLessonFlowV2SessionState> {
    return { ...createEmptyLessonFlowV2SessionState(), totalLoops, activeLoopIndex };
  }

  it('routeLessonFlowV2NextState at loop_check with perfect first-attempt sets compress=true', () => {
    const stateAtCheck = { ...makeV2State(2, 0), activeCheckpoint: 'loop_check' as const };
    const evidence = createLoopEvidence({ attemptCount: 1, gaps: [], misconceptions: [] });
    const result = routeLessonFlowV2NextState(stateAtCheck, evidence);
    expect(result.compress).toBe(true);
    expect(result.bridgeNeeded).toBe(false);
    expect(result.misconceptionTarget).toBeNull();
  });

  it('routeLessonFlowV2NextState with gaps sets bridgeNeeded=true and compress=false', () => {
    const stateAtCheck = { ...makeV2State(2, 0), activeCheckpoint: 'loop_check' as const };
    const evidence = createLoopEvidence({ gaps: ['chain rule'], misconceptions: [] });
    const result = routeLessonFlowV2NextState(stateAtCheck, evidence);
    expect(result.bridgeNeeded).toBe(true);
    expect(result.compress).toBe(false);
  });

  it('routeLessonFlowV2NextState with misconceptions sets misconceptionTarget and bridgeNeeded', () => {
    const stateAtCheck = { ...makeV2State(2, 0), activeCheckpoint: 'loop_check' as const };
    const evidence = createLoopEvidence({ misconceptions: ['sign error'] });
    const result = routeLessonFlowV2NextState(stateAtCheck, evidence);
    expect(result.misconceptionTarget).toBe('sign error');
    expect(result.bridgeNeeded).toBe(true);
  });

  it('routeLessonFlowV2NextState at loop_teach (not loop_check) falls through to advanceLessonFlowV2State', () => {
    const stateAtTeach = { ...makeV2State(2, 0), activeCheckpoint: 'loop_teach' as const };
    const evidence = createLoopEvidence();
    const routed = routeLessonFlowV2NextState(stateAtTeach, evidence);
    const advanced = advanceLessonFlowV2State(stateAtTeach);
    expect(routed.activeCheckpoint).toBe(advanced.activeCheckpoint);
    expect(routed.activeLoopIndex).toBe(advanced.activeLoopIndex);
  });

  it('advanceLessonFlowV2State always clears routing flags regardless of input flags', () => {
    const state = {
      ...makeV2State(2, 0),
      activeCheckpoint: 'loop_teach' as const,
      compress: true,
      bridgeNeeded: true,
      misconceptionTarget: 'some error'
    };
    const result = advanceLessonFlowV2State(state);
    expect(result.compress).toBe(false);
    expect(result.bridgeNeeded).toBe(false);
    expect(result.misconceptionTarget).toBeNull();
  });

  it('routeLessonFlowV2NextState at loop_check with more loops advances to loop_teach at next index', () => {
    const stateAtCheck = { ...makeV2State(2, 0), activeCheckpoint: 'loop_check' as const };
    const evidence = createLoopEvidence({ attemptCount: 2, gaps: ['some gap'] });
    const result = routeLessonFlowV2NextState(stateAtCheck, evidence);
    expect(result.activeCheckpoint).toBe('loop_teach');
    expect(result.activeLoopIndex).toBe(1);
  });

  it('routeLessonFlowV2NextState at loop_check when all loops done advances to synthesis', () => {
    const stateAtCheck = { ...makeV2State(2, 1), activeCheckpoint: 'loop_check' as const };
    const evidence = createLoopEvidence({ loopIndex: 1 });
    const result = routeLessonFlowV2NextState(stateAtCheck, evidence);
    expect(result.activeCheckpoint).toBe('synthesis');
  });
});
