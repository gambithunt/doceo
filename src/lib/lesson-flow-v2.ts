import type {
  Lesson,
  LessonFlowV2Checkpoint,
  LessonFlowV2SessionState,
  LessonFlowVersion,
  LessonSessionEvidence,
  LoopEvidence,
  LessonSession,
  LessonStage
} from '$lib/types';

export const DEFAULT_LESSON_FLOW_VERSION: LessonFlowVersion = 'v1';

export function normalizeLessonFlowVersion(value: unknown): LessonFlowVersion {
  return value === 'v2' ? 'v2' : DEFAULT_LESSON_FLOW_VERSION;
}

export function createEmptyLessonFlowV2SessionState(): LessonFlowV2SessionState {
  return {
    totalLoops: 0,
    activeLoopIndex: 0,
    activeCheckpoint: 'start',
    revisionAttemptCount: 0,
    remediationStep: 'none',
    labelBucket: 'orientation',
    skippedGaps: [],
    needsTeacherReview: false,
    cardSubstate: 'default',
    concept1EarlyDiagnosticCompleted: false,
    compress: false,
    bridgeNeeded: false,
    misconceptionTarget: null
  };
}

export function createLessonFlowV2SessionState(lesson: Pick<Lesson, 'flowV2'>): LessonFlowV2SessionState {
  return {
    totalLoops: lesson.flowV2?.loops.length ?? 0,
    activeLoopIndex: 0,
    activeCheckpoint: 'start',
    revisionAttemptCount: 0,
    remediationStep: 'none',
    labelBucket: 'orientation',
    skippedGaps: [],
    needsTeacherReview: false,
    cardSubstate: 'default',
    concept1EarlyDiagnosticCompleted: false,
    compress: false,
    bridgeNeeded: false,
    misconceptionTarget: null
  };
}

export function createEmptyLessonSessionEvidence(): LessonSessionEvidence {
  return {
    loops: [],
    pace: 'normal',
    criticalGaps: [],
    confirmedMisconceptions: [],
    independentAttemptScore: null,
    exitCheckPassed: null
  };
}

export function appendLoopEvidence(
  evidence: LessonSessionEvidence | null | undefined,
  loopEvidence: LoopEvidence
): LessonSessionEvidence {
  const base = evidence ?? createEmptyLessonSessionEvidence();
  const updatedLoops = [...base.loops, loopEvidence];

  const allFirstAttempt = updatedLoops.every((loop) => loop.attemptCount <= 1);
  const anySlowLoop = updatedLoops.some((loop) => loop.attemptCount >= 3);
  const pace = allFirstAttempt ? 'fast' : anySlowLoop ? 'slow' : 'normal';

  const gapCounts: Record<string, number> = {};
  for (const loop of updatedLoops) {
    for (const gap of loop.gaps) {
      gapCounts[gap] = (gapCounts[gap] ?? 0) + 1;
    }
  }
  const criticalGaps = Object.entries(gapCounts)
    .filter(([, count]) => count >= 2)
    .map(([gap]) => gap);
  const confirmedMisconceptions = Array.from(
    new Set(updatedLoops.flatMap((loop) => loop.misconceptions))
  );

  return {
    ...base,
    loops: updatedLoops,
    pace,
    criticalGaps,
    confirmedMisconceptions
  };
}

export function normalizeLessonRecord<T extends Lesson>(lesson: T): T {
  const lessonFlowVersion = normalizeLessonFlowVersion(lesson.lessonFlowVersion);

  return {
    ...lesson,
    lessonFlowVersion,
    flowV2: lessonFlowVersion === 'v2' ? lesson.flowV2 ?? null : null
  };
}

export function normalizeLessonSessionRecord<T extends LessonSession>(
  session: T
): T & Pick<LessonSession, 'lessonFlowVersion' | 'v2State' | 'v2Evidence' | 'residue'> {
  const lessonFlowVersion = normalizeLessonFlowVersion(session.lessonFlowVersion);

  return {
    ...session,
    lessonFlowVersion,
    v2State:
      lessonFlowVersion === 'v2'
        ? {
            ...createEmptyLessonFlowV2SessionState(),
            ...(session.v2State ?? {})
          }
        : null,
    v2Evidence: session.v2Evidence ?? null,
    residue: session.residue ?? null
  };
}

export function isLessonFlowV2Lesson(lesson: Pick<Lesson, 'lessonFlowVersion'>): boolean {
  return normalizeLessonFlowVersion(lesson.lessonFlowVersion) === 'v2';
}

export function isLessonFlowV2Session(session: Pick<LessonSession, 'lessonFlowVersion'>): boolean {
  return normalizeLessonFlowVersion(session.lessonFlowVersion) === 'v2';
}

export function getLessonStageForV2Checkpoint(checkpoint: LessonFlowV2Checkpoint): LessonStage {
  switch (checkpoint) {
    case 'start':
      return 'orientation';
    case 'loop_teach':
    case 'loop_example':
    case 'loop_practice':
    case 'loop_check':
    case 'synthesis':
      return 'concepts';
    case 'independent_attempt':
      return 'practice';
    case 'exit_check':
      return 'check';
    case 'complete':
      return 'complete';
  }
}

const ROUTING_FLAG_DEFAULTS = {
  compress: false,
  bridgeNeeded: false,
  misconceptionTarget: null
} as const;

export function advanceLessonFlowV2State(state: LessonFlowV2SessionState): LessonFlowV2SessionState {
  switch (state.activeCheckpoint) {
    case 'start':
      return {
        ...state,
        ...ROUTING_FLAG_DEFAULTS,
        activeCheckpoint: 'loop_teach',
        labelBucket: 'concepts'
      };
    case 'loop_teach':
      return {
        ...state,
        ...ROUTING_FLAG_DEFAULTS,
        activeCheckpoint: 'loop_example'
      };
    case 'loop_example':
      return {
        ...state,
        ...ROUTING_FLAG_DEFAULTS,
        activeCheckpoint: 'loop_practice'
      };
    case 'loop_practice':
      return {
        ...state,
        ...ROUTING_FLAG_DEFAULTS,
        activeCheckpoint: 'loop_check'
      };
    case 'loop_check':
      if (state.activeLoopIndex + 1 < state.totalLoops) {
        return {
          ...state,
          ...ROUTING_FLAG_DEFAULTS,
          activeLoopIndex: state.activeLoopIndex + 1,
          activeCheckpoint: 'loop_teach'
        };
      }

      return {
        ...state,
        ...ROUTING_FLAG_DEFAULTS,
        activeCheckpoint: 'synthesis'
      };
    case 'synthesis':
      return {
        ...state,
        ...ROUTING_FLAG_DEFAULTS,
        activeCheckpoint: 'independent_attempt',
        labelBucket: 'practice'
      };
    case 'independent_attempt':
      return {
        ...state,
        ...ROUTING_FLAG_DEFAULTS,
        activeCheckpoint: 'exit_check',
        labelBucket: 'check'
      };
    case 'exit_check':
      return {
        ...state,
        ...ROUTING_FLAG_DEFAULTS,
        activeCheckpoint: 'complete',
        labelBucket: 'complete'
      };
    case 'complete':
      return state;
  }
}

export function routeLessonFlowV2NextState(
  state: LessonFlowV2SessionState,
  loopEvidence: LoopEvidence
): LessonFlowV2SessionState {
  if (state.activeCheckpoint !== 'loop_check') {
    return advanceLessonFlowV2State(state);
  }

  const firstAttemptSuccess =
    loopEvidence.attemptCount === 1 &&
    loopEvidence.gaps.length === 0 &&
    loopEvidence.misconceptions.length === 0;

  const hasMisconception = loopEvidence.misconceptions.length > 0;
  const hasGaps = loopEvidence.gaps.length > 0;

  const advanced = advanceLessonFlowV2State(state);

  return {
    ...advanced,
    compress: firstAttemptSuccess && !hasGaps && !hasMisconception,
    bridgeNeeded: hasGaps || hasMisconception,
    misconceptionTarget: hasMisconception ? (loopEvidence.misconceptions[0] ?? null) : null
  };
}
