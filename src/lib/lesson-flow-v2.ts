import type {
  Lesson,
  LessonFlowV2Checkpoint,
  LessonFlowV2SessionState,
  LessonFlowVersion,
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
    needsTeacherReview: false
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
    needsTeacherReview: false
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
): T & Pick<LessonSession, 'lessonFlowVersion' | 'v2State' | 'residue'> {
  const lessonFlowVersion = normalizeLessonFlowVersion(session.lessonFlowVersion);

  return {
    ...session,
    lessonFlowVersion,
    v2State: lessonFlowVersion === 'v2' ? session.v2State ?? createEmptyLessonFlowV2SessionState() : null,
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

export function advanceLessonFlowV2State(state: LessonFlowV2SessionState): LessonFlowV2SessionState {
  switch (state.activeCheckpoint) {
    case 'start':
      return {
        ...state,
        activeCheckpoint: 'loop_teach',
        labelBucket: 'concepts'
      };
    case 'loop_teach':
      return {
        ...state,
        activeCheckpoint: 'loop_example'
      };
    case 'loop_example':
      return {
        ...state,
        activeCheckpoint: 'loop_practice'
      };
    case 'loop_practice':
      return {
        ...state,
        activeCheckpoint: 'loop_check'
      };
    case 'loop_check':
      if (state.activeLoopIndex + 1 < state.totalLoops) {
        return {
          ...state,
          activeLoopIndex: state.activeLoopIndex + 1,
          activeCheckpoint: 'loop_teach'
        };
      }

      return {
        ...state,
        activeCheckpoint: 'synthesis'
      };
    case 'synthesis':
      return {
        ...state,
        activeCheckpoint: 'independent_attempt',
        labelBucket: 'practice'
      };
    case 'independent_attempt':
      return {
        ...state,
        activeCheckpoint: 'exit_check',
        labelBucket: 'check'
      };
    case 'exit_check':
      return {
        ...state,
        activeCheckpoint: 'complete',
        labelBucket: 'complete'
      };
    case 'complete':
      return state;
  }
}
