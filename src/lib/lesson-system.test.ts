import { describe, expect, it } from 'vitest';
import {
  LESSON_STAGE_ORDER,
  applyLessonAssistantResponse,
  buildInitialLessonMessages,
  buildInitialLessonMessagesForSession,
  buildStageLearnerPrompt,
  buildStageStartMessage,
  buildWarmLessonOpening,
  buildV2CheckpointMessages,
  buildLessonSessionFromTopic,
  buildLessonEvaluationAssistantMessage,
  buildLessonEvaluationRequest,
  calculateNextRevisionInterval,
  classifyLessonMessage,
  canonicalStageTeachingContent,
  createDefaultLearnerProfile,
  deriveLessonProgressDisplay,
  getLessonSectionForStage,
  getNextStage,
  getStageNumber,
  parseDoceoMeta,
  repairLessonSessionMessages,
  shouldRepairStageTeachingMessage,
  stripDoceoMeta,
  updateLearnerProfile
} from '$lib/lesson-system';
import { createInitialState, normalizeAppState } from '$lib/data/platform';
import type { Lesson, LessonSession } from '$lib/types';

function makeMockSession(lesson: Lesson, overrides: Partial<LessonSession> = {}): LessonSession {
  return {
    id: 'session-test',
    studentId: 'student-1',
    subjectId: 'subject-1',
    subject: 'Mathematics',
    topicId: 'topic-1',
    topicTitle: 'Test Topic',
    topicDescription: 'A test topic',
    curriculumReference: 'CAPS · Grade 8 · Mathematics',
    matchedSection: '',
    lessonId: lesson.id,
    currentStage: 'orientation',
    stagesCompleted: [],
    messages: [],
    questionCount: 0,
    reteachCount: 0,
    softStuckCount: 0,
    confidenceScore: 0,
    needsTeacherReview: false,
    stuckConcept: null,
    startedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    completedAt: null,
    status: 'active',
    profileUpdates: [],
    ...overrides
  };
}

function getSoftStuckCount(session: LessonSession): unknown {
  return Reflect.get(session, 'softStuckCount');
}

describe('lesson-system', () => {
  it('classifies question-like messages', () => {
    expect(classifyLessonMessage('How does this work?')).toBe('question');
    expect(classifyLessonMessage("I don't understand the example")).toBe('question');
    expect(classifyLessonMessage('I think the rule is add 4')).toBe('response');
  });

  it('parses and strips DOCEO metadata blocks', () => {
    const raw = `Hello there\n\n<!-- DOCEO_META\n{"action":"advance","next_stage":"concepts","reteach_style":null,"reteach_count":0,"confidence_assessment":0.75,"profile_update":{}}\nDOCEO_META -->`;
    const meta = parseDoceoMeta(raw);

    expect(meta?.action).toBe('advance');
    expect(meta?.next_stage).toBe('concepts');
    expect(stripDoceoMeta(raw)).toBe('Hello there');
  });

  it('updates learner profile with EMA and unique lists', () => {
    const profile = createDefaultLearnerProfile('student-1');
    const updated = updateLearnerProfile(
      profile,
      {
        step_by_step: 0.9,
        struggled_with: ['Fractions'],
        excelled_at: ['Patterns']
      },
      {
        subjectName: 'Mathematics',
        incrementQuestions: true,
        incrementReteach: true
      }
    );

    expect(updated.step_by_step).toBeGreaterThan(profile.step_by_step);
    expect(updated.concepts_struggled_with).toContain('Fractions');
    expect(updated.concepts_excelled_at).toContain('Patterns');
    expect(updated.subjects_studied).toContain('Mathematics');
    expect(updated.total_questions_asked).toBe(1);
    expect(updated.total_reteach_events).toBe(1);
  });

  it('applies assistant responses to advance a lesson session', () => {
    const state = createInitialState();
    const lessonSession = makeMockSession(state.lessons[0]);
    const updated = applyLessonAssistantResponse(lessonSession, {
      id: 'assistant-1',
      role: 'assistant',
      type: 'feedback',
      content: 'Good. Let us move on.',
      stage: 'orientation',
      timestamp: new Date().toISOString(),
      metadata: {
        action: 'advance',
        next_stage: 'concepts',
        reteach_style: null,
        reteach_count: 0,
        confidence_assessment: 0.74,
        profile_update: {}
      }
    });

    expect(updated.currentStage).toBe('concepts');
    expect(updated.stagesCompleted).toContain('orientation');
  });

  it('increments the soft-stuck counter on the first stay', () => {
    const state = createInitialState();
    const lessonSession = makeMockSession(state.lessons[0]);
    const updated = applyLessonAssistantResponse(lessonSession, {
      id: 'assistant-stay-1',
      role: 'assistant',
      type: 'teaching',
      content: 'Stay with this point.',
      stage: 'orientation',
      timestamp: new Date().toISOString(),
      metadata: {
        action: 'stay',
        next_stage: null,
        reteach_style: null,
        reteach_count: 0,
        confidence_assessment: 0.55,
        profile_update: {}
      }
    });

    expect(getSoftStuckCount(updated)).toBe(1);
  });

  it('reaches the soft-stuck threshold on the second same-stage stay', () => {
    const state = createInitialState();
    const lessonSession = {
      ...makeMockSession(state.lessons[0]),
      softStuckCount: 1
    } as LessonSession;
    const updated = applyLessonAssistantResponse(lessonSession, {
      id: 'assistant-stay-2',
      role: 'assistant',
      type: 'teaching',
      content: 'One more pass here.',
      stage: 'orientation',
      timestamp: new Date().toISOString(),
      metadata: {
        action: 'stay',
        next_stage: null,
        reteach_style: null,
        reteach_count: 0,
        confidence_assessment: 0.56,
        profile_update: {}
      }
    });

    expect(getSoftStuckCount(updated)).toBe(2);
  });

  it('resets the soft-stuck counter on advance', () => {
    const state = createInitialState();
    const lessonSession = {
      ...makeMockSession(state.lessons[0]),
      softStuckCount: 2
    } as LessonSession;
    const updated = applyLessonAssistantResponse(lessonSession, {
      id: 'assistant-advance-reset',
      role: 'assistant',
      type: 'feedback',
      content: 'Let us move on.',
      stage: 'orientation',
      timestamp: new Date().toISOString(),
      metadata: {
        action: 'advance',
        next_stage: 'concepts',
        reteach_style: null,
        reteach_count: 0,
        confidence_assessment: 0.74,
        profile_update: {}
      }
    });

    expect(updated.currentStage).toBe('concepts');
    expect(getSoftStuckCount(updated)).toBe(0);
  });

  it('resets the soft-stuck counter on reteach', () => {
    const state = createInitialState();
    const lessonSession = {
      ...makeMockSession(state.lessons[0]),
      softStuckCount: 2
    } as LessonSession;
    const updated = applyLessonAssistantResponse(lessonSession, {
      id: 'assistant-reteach-reset',
      role: 'assistant',
      type: 'teaching',
      content: 'Let me reteach that.',
      stage: 'orientation',
      timestamp: new Date().toISOString(),
      metadata: {
        action: 'reteach',
        next_stage: null,
        reteach_style: 'step_by_step',
        reteach_count: 1,
        confidence_assessment: 0.4,
        profile_update: {}
      }
    });

    expect(updated.reteachCount).toBe(1);
    expect(getSoftStuckCount(updated)).toBe(0);
  });

  it('does not carry stale soft-stuck count into the next stage', () => {
    const state = createInitialState();
    const lessonSession = {
      ...makeMockSession(state.lessons[0], {
        currentStage: 'concepts',
        stagesCompleted: ['orientation']
      }),
      softStuckCount: 2
    } as LessonSession;
    const updated = applyLessonAssistantResponse(lessonSession, {
      id: 'assistant-stage-change-reset',
      role: 'assistant',
      type: 'feedback',
      content: 'Build on that.',
      stage: 'concepts',
      timestamp: new Date().toISOString(),
      metadata: {
        action: 'advance',
        next_stage: 'construction',
        reteach_style: null,
        reteach_count: 0,
        confidence_assessment: 0.7,
        profile_update: {}
      }
    });

    expect(updated.currentStage).toBe('construction');
    expect(getSoftStuckCount(updated)).toBe(0);
  });

  it('normalizes explicit completion into a completed session shape', () => {
    const state = createInitialState();
    const lessonSession = makeMockSession(state.lessons[0], {
      currentStage: 'check',
      stagesCompleted: ['orientation', 'concepts', 'construction', 'examples', 'practice']
    });
    const timestamp = '2026-04-18T09:15:00.000Z';
    const updated = applyLessonAssistantResponse(lessonSession, {
      id: 'assistant-complete-1',
      role: 'assistant',
      type: 'teaching',
      content: 'You completed this lesson.',
      stage: 'check',
      timestamp,
      metadata: {
        action: 'complete',
        next_stage: null,
        reteach_style: null,
        reteach_count: 0,
        confidence_assessment: 0.84,
        profile_update: {}
      }
    });

    expect(updated.status).toBe('complete');
    expect(updated.currentStage).toBe('complete');
    expect(updated.completedAt).toBe(timestamp);
    expect(updated.stagesCompleted).toEqual([
      'orientation',
      'concepts',
      'construction',
      'examples',
      'practice',
      'check'
    ]);
  });

  it('normalizes terminal advance metadata into the same completed session shape', () => {
    const state = createInitialState();
    const lessonSession = makeMockSession(state.lessons[0], {
      currentStage: 'check',
      stagesCompleted: ['orientation', 'concepts', 'construction', 'examples', 'practice']
    });
    const timestamp = '2026-04-18T09:20:00.000Z';
    const updated = applyLessonAssistantResponse(lessonSession, {
      id: 'assistant-complete-2',
      role: 'assistant',
      type: 'feedback',
      content: 'Great. You are done.',
      stage: 'check',
      timestamp,
      metadata: {
        action: 'advance',
        next_stage: 'complete',
        reteach_style: null,
        reteach_count: 0,
        confidence_assessment: 0.81,
        profile_update: {}
      }
    });

    expect(updated.status).toBe('complete');
    expect(updated.currentStage).toBe('complete');
    expect(updated.completedAt).toBe(timestamp);
    expect(updated.stagesCompleted).toEqual([
      'orientation',
      'concepts',
      'construction',
      'examples',
      'practice',
      'check'
    ]);
  });

  it('calculates spaced repetition intervals', () => {
    expect(calculateNextRevisionInterval(0.95, 4)).toBe(10);
    expect(calculateNextRevisionInterval(0.75, 4)).toBe(8);
    expect(calculateNextRevisionInterval(0.52, 4)).toBe(5);
    expect(calculateNextRevisionInterval(0.2, 4)).toBe(1);
  });

  it('normalizes older snapshots that do not include adaptive lesson fields', () => {
    const initial = createInitialState();
    const normalized = normalizeAppState({
      profile: initial.profile,
      onboarding: initial.onboarding,
      curriculum: initial.curriculum,
      lessons: initial.lessons,
      questions: initial.questions,
      ui: initial.ui
    });

    // lessonSessions default to empty (no auto-creation without a topic choice)
    expect(Array.isArray(normalized.lessonSessions)).toBe(true);
    // learnerProfile is always initialized with the profile's student id
    expect(normalized.learnerProfile.studentId).toBe(initial.profile.id);
  });

  it('normalizes older lesson sessions that do not include soft-stuck state', () => {
    const initial = createInitialState();
    const legacySession = {
      ...makeMockSession(initial.lessons[0]),
      currentStage: 'concepts'
    } as unknown as Record<string, unknown>;

    delete legacySession.softStuckCount;

    const normalized = normalizeAppState({
      ...initial,
      lessonSessions: [legacySession as unknown as LessonSession]
    });

    expect(getSoftStuckCount(normalized.lessonSessions[0])).toBe(0);
  });

  it('normalizes nested legacy stage names inside saved lesson messages', () => {
    const initial = createInitialState();
    const legacySession = {
      ...makeMockSession(initial.lessons[0]),
      currentStage: 'overview',
      stagesCompleted: ['detail'],
      messages: [
        {
          id: 'legacy-stage-message',
          role: 'assistant',
          type: 'feedback',
          content: 'Moving on.',
          stage: 'detail',
          timestamp: '2026-04-21T10:00:00.000Z',
          metadata: {
            action: 'advance',
            next_stage: 'detail',
            reteach_style: null,
            reteach_count: 0,
            confidence_assessment: 0.7,
            profile_update: {}
          }
        }
      ]
    } as unknown as LessonSession;

    const normalized = normalizeAppState({
      ...initial,
      lessonSessions: [legacySession]
    });

    expect(normalized.lessonSessions[0]?.currentStage).toBe('orientation');
    expect(normalized.lessonSessions[0]?.stagesCompleted).toEqual(['construction']);
    expect(normalized.lessonSessions[0]?.messages[0]?.stage).toBe('construction');
    expect(normalized.lessonSessions[0]?.messages[0]?.metadata?.next_stage).toBe('construction');
  });

  it('preserves v2 session state during bootstrap normalization', () => {
    const initial = createInitialState();
    const v2Session = {
      ...makeMockSession(initial.lessons[0]),
      lessonFlowVersion: 'v2' as const,
      v2State: {
        totalLoops: 3,
        activeLoopIndex: 1,
        activeCheckpoint: 'loop_example' as const,
        revisionAttemptCount: 0,
        remediationStep: 'none' as const,
        labelBucket: 'concepts' as const,
        skippedGaps: [],
        needsTeacherReview: false
      },
      residue: null
    };

    const normalized = normalizeAppState({
      ...initial,
      lessonSessions: [v2Session]
    });

    expect(normalized.lessonSessions[0]?.lessonFlowVersion).toBe('v2');
    expect(normalized.lessonSessions[0]?.v2State).toEqual({
      ...v2Session.v2State,
      cardSubstate: 'default',
      concept1EarlyDiagnosticCompleted: false,
      compress: false,
      bridgeNeeded: false,
      misconceptionTarget: null
    });
  });

  // --- New lesson structure tests ---

  it('LESSON_STAGE_ORDER is the 7-stage pipeline', () => {
    expect(LESSON_STAGE_ORDER).toEqual([
      'orientation', 'concepts', 'construction', 'examples', 'practice', 'check', 'complete'
    ]);
  });

  it('getNextStage advances through the pipeline correctly', () => {
    expect(getNextStage('orientation')).toBe('concepts');
    expect(getNextStage('concepts')).toBe('construction');
    expect(getNextStage('construction')).toBe('examples');
    expect(getNextStage('examples')).toBe('practice');
    expect(getNextStage('practice')).toBe('check');
    expect(getNextStage('check')).toBe('complete');
    expect(getNextStage('complete')).toBeNull();
  });

  it('getStageNumber returns 1-based index capped at 6', () => {
    expect(getStageNumber('orientation')).toBe(1);
    expect(getStageNumber('concepts')).toBe(2);
    expect(getStageNumber('construction')).toBe(3);
    expect(getStageNumber('examples')).toBe(4);
    expect(getStageNumber('practice')).toBe(5);
    expect(getStageNumber('check')).toBe(6);
    expect(getStageNumber('complete')).toBe(6);
  });

  it('derives initial lesson progress for an active orientation session', () => {
    expect(
      deriveLessonProgressDisplay({
        currentStage: 'orientation',
        status: 'active'
      })
    ).toEqual({
      stageNumber: 1,
      visibleStageCount: 6,
      progressPercent: 8
    });
  });

  it('increments lesson step and progress coherently for an advanced session', () => {
    expect(
      deriveLessonProgressDisplay({
        currentStage: 'concepts',
        status: 'active'
      })
    ).toEqual({
      stageNumber: 2,
      visibleStageCount: 6,
      progressPercent: 17
    });
  });

  it('returns terminal lesson progress for a completed session', () => {
    expect(
      deriveLessonProgressDisplay({
        currentStage: 'complete',
        status: 'complete'
      })
    ).toEqual({
      stageNumber: 6,
      visibleStageCount: 6,
      progressPercent: 100
    });
  });

  it('buildLessonSessionFromTopic initialises currentStage to orientation', () => {
    const state = createInitialState();
    const lesson = state.lessons[0];
    const subject = state.curriculum.subjects[0];
    const topic = subject.topics[0];
    const subtopic = topic.subtopics[0];
    const session = buildLessonSessionFromTopic(
      state.profile,
      subject,
      topic,
      subtopic,
      lesson
    );

    expect(session.currentStage).toBe('orientation');
    expect(session.stagesCompleted).toEqual([]);
    expect(getSoftStuckCount(session)).toBe(0);
  });

  it('buildLessonSessionFromTopic can initialize a v2 session scaffold without breaking legacy fields', () => {
    const state = createInitialState();
    const lesson = {
      ...state.lessons[0],
      lessonFlowVersion: 'v2' as const,
      flowV2: {
        groupedLabels: ['orientation', 'concepts', 'practice', 'check', 'complete'] as const,
        start: { title: 'Start', body: 'Start block' },
        concepts: [
          {
            name: 'Equivalent fractions',
            summary: 'Fractions can look different and still have the same value.',
            detail: 'Equivalent fractions name the same amount even when the numerator and denominator change.',
            example: '1/2 and 2/4 represent the same amount.',
            oneLineDefinition: 'Equivalent fractions represent the same value with different numbers.',
            quickCheck: 'Which statement best matches equivalent fractions?',
            conceptType: 'core_rule',
            whyItMatters: 'It helps the learner compare value instead of surface form.',
            commonMisconception: 'Bigger numbers must always mean a bigger fraction.'
          }
        ],
        loops: [
          {
            id: 'loop-1',
            title: 'Loop 1',
            teaching: { title: 'Teach', body: 'Teach body' },
            example: { title: 'Example', body: 'Example body' },
            learnerTask: { title: 'Task', body: 'Task body' },
            retrievalCheck: { title: 'Check', body: 'Check body' },
            mustHitConcepts: ['equivalence'],
            criticalMisconceptionTags: ['wrong-denominator']
          }
        ],
        synthesis: { title: 'Synthesis', body: 'Synthesis body' },
        independentAttempt: { title: 'Independent Attempt', body: 'Attempt body' },
        exitCheck: { title: 'Exit Check', body: 'Exit body' }
      }
    };
    const subject = state.curriculum.subjects[0];
    const topic = subject.topics[0];
    const subtopic = topic.subtopics[0];

    const session = buildLessonSessionFromTopic(
      state.profile,
      subject,
      topic,
      subtopic,
      lesson
    );

    expect(session.lessonFlowVersion).toBe('v2');
    expect(session.currentStage).toBe('orientation');
    expect(session.v2State).toEqual(
      expect.objectContaining({
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'start',
        labelBucket: 'orientation',
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: false
      })
    );
    expect(session.residue).toBeNull();
    expect(session.messages[1]?.content).toBe(buildWarmLessonOpening(lesson));
    expect(session.messages[2]?.content).toBe(buildStageLearnerPrompt(lesson, 'orientation'));
    expect(session.messages[2]?.content).not.toContain('Start block');
  });

  it('buildV2CheckpointMessages for start returns stage start plus warm opener and teaching message', () => {
    const state = createInitialState();
    const lesson = {
      ...state.lessons[0]!,
      lessonFlowVersion: 'v2' as const,
      flowV2: {
        groupedLabels: ['orientation', 'concepts', 'practice', 'check', 'complete'] as const,
        start: { title: 'Start', body: 'Start block' },
        loops: [],
        synthesis: { title: 'Synthesis', body: 'Synthesis body' },
        independentAttempt: { title: 'Independent Attempt', body: 'Attempt body' },
        exitCheck: { title: 'Exit Check', body: 'Exit body' }
      }
    };
    const session = makeMockSession(lesson, {
      lessonFlowVersion: 'v2',
      v2State: {
        totalLoops: 0,
        activeLoopIndex: 0,
        activeCheckpoint: 'start',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'orientation',
        skippedGaps: [],
        needsTeacherReview: false
      }
    });

    const messages = buildV2CheckpointMessages(lesson, session);

    expect(messages).toHaveLength(3);
    expect(messages[0]?.type).toBe('stage_start');
    expect(messages[1]?.type).toBe('teaching');
    expect(messages[2]?.type).toBe('teaching');
  });

  it('buildV2CheckpointMessages for start does not reveal flowV2 start body before the student answers', () => {
    const state = createInitialState();
    const lesson = {
      ...state.lessons[0]!,
      lessonFlowVersion: 'v2' as const,
      flowV2: {
        groupedLabels: ['orientation', 'concepts', 'practice', 'check', 'complete'] as const,
        start: { title: 'Start', body: 'Start block' },
        loops: [],
        synthesis: { title: 'Synthesis', body: 'Synthesis body' },
        independentAttempt: { title: 'Independent Attempt', body: 'Attempt body' },
        exitCheck: { title: 'Exit Check', body: 'Exit body' }
      }
    };
    const session = makeMockSession(lesson, {
      lessonFlowVersion: 'v2',
      v2State: {
        totalLoops: 0,
        activeLoopIndex: 0,
        activeCheckpoint: 'start',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'orientation',
        skippedGaps: [],
        needsTeacherReview: false
      }
    });

    const teaching = buildV2CheckpointMessages(lesson, session)[2];

    expect(teaching?.content).not.toContain(lesson.flowV2.start.body);
  });

  it('buildV2CheckpointMessages for start uses the orientation prior knowledge prompt', () => {
    const state = createInitialState();
    const lesson = {
      ...state.lessons[0]!,
      lessonFlowVersion: 'v2' as const,
      flowV2: {
        groupedLabels: ['orientation', 'concepts', 'practice', 'check', 'complete'] as const,
        start: { title: 'Start', body: 'Start block' },
        loops: [],
        synthesis: { title: 'Synthesis', body: 'Synthesis body' },
        independentAttempt: { title: 'Independent Attempt', body: 'Attempt body' },
        exitCheck: { title: 'Exit Check', body: 'Exit body' }
      }
    };
    const session = makeMockSession(lesson, {
      lessonFlowVersion: 'v2',
      v2State: {
        totalLoops: 0,
        activeLoopIndex: 0,
        activeCheckpoint: 'start',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'orientation',
        skippedGaps: [],
        needsTeacherReview: false
      }
    });

    const teaching = buildV2CheckpointMessages(lesson, session)[2];

    expect(teaching?.content).toBe(buildStageLearnerPrompt(lesson, 'orientation'));
  });

  it('buildV2CheckpointMessages for start inserts a warm opener before the prior knowledge prompt', () => {
    const state = createInitialState();
    const lesson = {
      ...state.lessons[0]!,
      lessonFlowVersion: 'v2' as const,
      flowV2: {
        groupedLabels: ['orientation', 'concepts', 'practice', 'check', 'complete'] as const,
        start: { title: 'Start', body: 'Start block' },
        loops: [],
        synthesis: { title: 'Synthesis', body: 'Synthesis body' },
        independentAttempt: { title: 'Independent Attempt', body: 'Attempt body' },
        exitCheck: { title: 'Exit Check', body: 'Exit body' }
      }
    };
    const session = makeMockSession(lesson, {
      lessonFlowVersion: 'v2',
      v2State: {
        totalLoops: 0,
        activeLoopIndex: 0,
        activeCheckpoint: 'start',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'orientation',
        skippedGaps: [],
        needsTeacherReview: false
      }
    });
    const topicName = lesson.title.split(':')[1]?.trim() || lesson.title;

    const messages = buildV2CheckpointMessages(lesson, session);

    expect(messages).toHaveLength(3);
    expect(messages[1]?.content).toContain(topicName);
    expect(messages[1]?.content).not.toMatch(/what do you already know/i);
    expect(messages[2]?.content).toBe(buildStageLearnerPrompt(lesson, 'orientation'));
  });

  it('advances v2 loop checkpoints in order while keeping learner-facing labels simple', () => {
    const state = createInitialState();
    const lesson = {
      ...state.lessons[0],
      lessonFlowVersion: 'v2' as const,
      flowV2: {
        groupedLabels: ['orientation', 'concepts', 'practice', 'check', 'complete'] as const,
        start: { title: 'Start', body: 'Start block' },
        loops: [
          {
            id: 'loop-1',
            title: 'Loop 1',
            teaching: { title: 'Teach', body: 'Teach body' },
            example: { title: 'Example', body: 'Example body' },
            learnerTask: { title: 'Task', body: 'Task body' },
            retrievalCheck: { title: 'Check', body: 'Check body' },
            mustHitConcepts: ['equivalence'],
            criticalMisconceptionTags: ['wrong-denominator']
          },
          {
            id: 'loop-2',
            title: 'Loop 2',
            teaching: { title: 'Teach', body: 'Teach body 2' },
            example: { title: 'Example', body: 'Example body 2' },
            learnerTask: { title: 'Task', body: 'Task body 2' },
            retrievalCheck: { title: 'Check', body: 'Check body 2' },
            mustHitConcepts: ['simplifying'],
            criticalMisconceptionTags: ['lost-equivalence']
          }
        ],
        synthesis: { title: 'Synthesis', body: 'Synthesis body' },
        independentAttempt: { title: 'Independent Attempt', body: 'Attempt body' },
        exitCheck: { title: 'Exit Check', body: 'Exit body' }
      }
    };
    const subject = state.curriculum.subjects[0];
    const topic = subject.topics[0];
    const subtopic = topic.subtopics[0];
    let session = buildLessonSessionFromTopic(state.profile, subject, topic, subtopic, lesson);

    const advance = () => {
      session = applyLessonAssistantResponse(session, {
        id: `assistant-${session.messages.length + 1}`,
        role: 'assistant',
        type: 'feedback',
        content: 'Move ahead.',
        stage: session.currentStage,
        timestamp: new Date().toISOString(),
        metadata: {
          action: 'advance',
          next_stage: 'concepts',
          reteach_style: null,
          reteach_count: 0,
          confidence_assessment: 0.74,
          profile_update: {}
        }
      });
      session = {
        ...session,
        messages: [...session.messages, ...buildInitialLessonMessagesForSession(lesson, session)]
      };
    };

    advance();
    expect(session.v2State?.activeCheckpoint).toBe('loop_teach');
    expect(session.currentStage).toBe('concepts');

    advance();
    expect(session.v2State?.activeCheckpoint).toBe('loop_example');
    expect(session.currentStage).toBe('concepts');

    advance();
    expect(session.v2State?.activeCheckpoint).toBe('loop_practice');
    expect(session.currentStage).toBe('concepts');

    advance();
    expect(session.v2State?.activeCheckpoint).toBe('loop_check');
    expect(session.currentStage).toBe('concepts');

    advance();
    expect(session.v2State?.activeLoopIndex).toBe(1);
    expect(session.v2State?.activeCheckpoint).toBe('loop_teach');
    expect(session.currentStage).toBe('concepts');

    advance();
    advance();
    advance();
    advance();
    expect(session.v2State?.activeCheckpoint).toBe('synthesis');
    expect(session.currentStage).toBe('concepts');

    advance();
    expect(session.v2State?.activeCheckpoint).toBe('independent_attempt');
    expect(session.currentStage).toBe('practice');

    advance();
    expect(session.v2State?.activeCheckpoint).toBe('exit_check');
    expect(session.currentStage).toBe('check');
  });

  it('builds lesson evaluation requests from the active v2 checkpoint', () => {
    const state = createInitialState();
    const lesson = {
      ...state.lessons[0],
      lessonFlowVersion: 'v2' as const,
      flowV2: {
        groupedLabels: ['orientation', 'concepts', 'practice', 'check', 'complete'] as const,
        start: { title: 'Start', body: 'Start block' },
        loops: [
          {
            id: 'loop-1',
            title: 'Loop 1',
            teaching: { title: 'Teach', body: 'Teach body' },
            example: { title: 'Example', body: 'Example body' },
            learnerTask: { title: 'Task', body: 'Task body' },
            retrievalCheck: { title: 'Check', body: 'Check body' },
            mustHitConcepts: ['equivalent fractions'],
            criticalMisconceptionTags: ['wrong-denominator']
          }
        ],
        synthesis: { title: 'Synthesis', body: 'Synthesis body' },
        independentAttempt: { title: 'Independent Attempt', body: 'Attempt body' },
        exitCheck: { title: 'Exit Check', body: 'Exit body' }
      }
    };
    const subject = state.curriculum.subjects[0];
    const topic = subject.topics[0];
    const subtopic = topic.subtopics[0];
    let session = buildLessonSessionFromTopic(state.profile, subject, topic, subtopic, lesson);
    session = applyLessonAssistantResponse(session, {
      id: 'assistant-advance',
      role: 'assistant',
      type: 'feedback',
      content: 'Move ahead.',
      stage: session.currentStage,
      timestamp: new Date().toISOString(),
      metadata: {
        action: 'advance',
        next_stage: 'concepts',
        reteach_style: null,
        reteach_count: 0,
        confidence_assessment: 0.74,
        profile_update: {}
      }
    });

    const request = buildLessonEvaluationRequest(session, lesson, 'Equivalent fractions have the same value.');

    expect(request.lesson.loopTitle).toBe('Loop 1');
    expect(request.lesson.mustHitConcepts).toEqual(['equivalent fractions']);
    expect(request.lesson.criticalMisconceptionTags).toEqual(['wrong-denominator']);
  });

  it('uses a single targeted revision chance before remediation in v2 sessions', () => {
    const state = createInitialState();
    const lesson = {
      ...state.lessons[0],
      lessonFlowVersion: 'v2' as const,
      flowV2: {
        groupedLabels: ['orientation', 'concepts', 'practice', 'check', 'complete'] as const,
        start: { title: 'Start', body: 'Start block' },
        loops: [
          {
            id: 'loop-1',
            title: 'Loop 1',
            teaching: { title: 'Teach', body: 'Teach body' },
            example: { title: 'Example', body: 'Example body' },
            learnerTask: { title: 'Task', body: 'Task body' },
            retrievalCheck: { title: 'Check', body: 'Check body' },
            mustHitConcepts: ['equivalent fractions'],
            criticalMisconceptionTags: ['wrong-denominator']
          }
        ],
        synthesis: { title: 'Synthesis', body: 'Synthesis body' },
        independentAttempt: { title: 'Independent Attempt', body: 'Attempt body' },
        exitCheck: { title: 'Exit Check', body: 'Exit body' }
      }
    };
    const subject = state.curriculum.subjects[0];
    const topic = subject.topics[0];
    const subtopic = topic.subtopics[0];
    let session = buildLessonSessionFromTopic(state.profile, subject, topic, subtopic, lesson);

    session = applyLessonAssistantResponse(session, {
      id: 'assistant-enter-loop',
      role: 'assistant',
      type: 'feedback',
      content: 'Move ahead.',
      stage: session.currentStage,
      timestamp: new Date().toISOString(),
      metadata: {
        action: 'advance',
        next_stage: 'concepts',
        reteach_style: null,
        reteach_count: 0,
        confidence_assessment: 0.74,
        profile_update: {}
      }
    });

    const revisionMessage = buildLessonEvaluationAssistantMessage(session, {
      score: 0.63,
      mustHitConceptsMet: [],
      missingMustHitConcepts: ['equivalent fractions'],
      criticalMisconceptions: [],
      feedback: 'Name the equal-value idea explicitly.',
      mode: 'targeted_revision',
      provider: 'local-heuristic',
      model: 'local-heuristic'
    });
    session = applyLessonAssistantResponse(session, revisionMessage);

    expect(session.currentStage).toBe('concepts');
    expect(session.v2State?.revisionAttemptCount).toBe(1);

    const remediationMessage = buildLessonEvaluationAssistantMessage(session, {
      score: 0.49,
      mustHitConceptsMet: [],
      missingMustHitConcepts: ['equivalent fractions'],
      criticalMisconceptions: [],
      feedback: 'The equal-value idea is still missing.',
      mode: 'remediation',
      provider: 'local-heuristic',
      model: 'local-heuristic'
    });
    session = applyLessonAssistantResponse(session, remediationMessage);

    expect(session.reteachCount).toBe(1);
    expect(session.v2State?.remediationStep).toBe('hint');
  });

  it('blocks advancement on critical misconceptions and escalates teacher review for repeated fundamental gaps', () => {
    const state = createInitialState();
    const lesson = {
      ...state.lessons[0],
      lessonFlowVersion: 'v2' as const,
      flowV2: {
        groupedLabels: ['orientation', 'concepts', 'practice', 'check', 'complete'] as const,
        start: { title: 'Start', body: 'Start block' },
        loops: [
          {
            id: 'loop-1',
            title: 'Loop 1',
            teaching: { title: 'Teach', body: 'Teach body' },
            example: { title: 'Example', body: 'Example body' },
            learnerTask: { title: 'Task', body: 'Task body' },
            retrievalCheck: { title: 'Check', body: 'Check body' },
            mustHitConcepts: ['equivalent fractions'],
            criticalMisconceptionTags: ['wrong-denominator']
          }
        ],
        synthesis: { title: 'Synthesis', body: 'Synthesis body' },
        independentAttempt: { title: 'Independent Attempt', body: 'Attempt body' },
        exitCheck: { title: 'Exit Check', body: 'Exit body' }
      }
    };
    const subject = state.curriculum.subjects[0];
    const topic = subject.topics[0];
    const subtopic = topic.subtopics[0];
    let session = buildLessonSessionFromTopic(state.profile, subject, topic, subtopic, lesson);
    session = applyLessonAssistantResponse(session, {
      id: 'assistant-enter-loop-critical',
      role: 'assistant',
      type: 'feedback',
      content: 'Move ahead.',
      stage: session.currentStage,
      timestamp: new Date().toISOString(),
      metadata: {
        action: 'advance',
        next_stage: 'concepts',
        reteach_style: null,
        reteach_count: 0,
        confidence_assessment: 0.74,
        profile_update: {}
      }
    });
    session = {
      ...session,
      v2State: {
        ...session.v2State!,
        revisionAttemptCount: 1,
        remediationStep: 'mini_reteach'
      }
    };

    const message = buildLessonEvaluationAssistantMessage(session, {
      score: 0.2,
      mustHitConceptsMet: [],
      missingMustHitConcepts: ['equivalent fractions'],
      criticalMisconceptions: ['wrong-denominator'],
      feedback: 'You changed the denominator incorrectly.',
      mode: 'remediation',
      provider: 'local-heuristic',
      model: 'local-heuristic'
    });
    session = applyLessonAssistantResponse(session, message);

    expect(session.currentStage).toBe('concepts');
    expect(session.needsTeacherReview).toBe(true);
    expect(session.v2State?.remediationStep).toBe('worked_example');
  });

  it('escalates teacher review for repeated non-critical must-hit gaps after the remediation ladder is exhausted', () => {
    const state = createInitialState();
    const lesson = {
      ...state.lessons[0],
      lessonFlowVersion: 'v2' as const,
      flowV2: {
        groupedLabels: ['orientation', 'concepts', 'practice', 'check', 'complete'] as const,
        start: { title: 'Start', body: 'Start block' },
        loops: [
          {
            id: 'loop-1',
            title: 'Loop 1',
            teaching: { title: 'Teach', body: 'Teach body' },
            example: { title: 'Example', body: 'Example body' },
            learnerTask: { title: 'Task', body: 'Task body' },
            retrievalCheck: { title: 'Check', body: 'Check body' },
            mustHitConcepts: ['equivalent fractions'],
            criticalMisconceptionTags: ['wrong-denominator']
          }
        ],
        synthesis: { title: 'Synthesis', body: 'Synthesis body' },
        independentAttempt: { title: 'Independent Attempt', body: 'Attempt body' },
        exitCheck: { title: 'Exit Check', body: 'Exit body' }
      }
    };
    const subject = state.curriculum.subjects[0];
    const topic = subject.topics[0];
    const subtopic = topic.subtopics[0];
    let session = buildLessonSessionFromTopic(state.profile, subject, topic, subtopic, lesson);
    session = applyLessonAssistantResponse(session, {
      id: 'assistant-enter-loop-repeated-gap',
      role: 'assistant',
      type: 'feedback',
      content: 'Move ahead.',
      stage: session.currentStage,
      timestamp: new Date().toISOString(),
      metadata: {
        action: 'advance',
        next_stage: 'concepts',
        reteach_style: null,
        reteach_count: 0,
        confidence_assessment: 0.74,
        profile_update: {}
      }
    });
    session = {
      ...session,
      v2State: {
        ...session.v2State!,
        revisionAttemptCount: 1,
        remediationStep: 'worked_example'
      }
    };

    const message = buildLessonEvaluationAssistantMessage(session, {
      score: 0.34,
      mustHitConceptsMet: [],
      missingMustHitConcepts: ['equivalent fractions'],
      criticalMisconceptions: [],
      feedback: 'The equal-value idea is still missing.',
      mode: 'skip_with_accountability',
      provider: 'local-heuristic',
      model: 'local-heuristic'
    });
    session = applyLessonAssistantResponse(session, message);

    expect(session.needsTeacherReview).toBe(true);
    expect(session.v2State?.needsTeacherReview).toBe(true);
    expect(session.v2State?.skippedGaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          concept: 'equivalent fractions',
          needsTeacherReview: true
        })
      ])
    );
  });

  it('records skip-with-accountability gaps instead of silently advancing cleanly', () => {
    const state = createInitialState();
    const lesson = {
      ...state.lessons[0],
      lessonFlowVersion: 'v2' as const,
      flowV2: {
        groupedLabels: ['orientation', 'concepts', 'practice', 'check', 'complete'] as const,
        start: { title: 'Start', body: 'Start block' },
        loops: [
          {
            id: 'loop-1',
            title: 'Loop 1',
            teaching: { title: 'Teach', body: 'Teach body' },
            example: { title: 'Example', body: 'Example body' },
            learnerTask: { title: 'Task', body: 'Task body' },
            retrievalCheck: { title: 'Check', body: 'Check body' },
            mustHitConcepts: ['equivalent fractions'],
            criticalMisconceptionTags: ['wrong-denominator']
          }
        ],
        synthesis: { title: 'Synthesis', body: 'Synthesis body' },
        independentAttempt: { title: 'Independent Attempt', body: 'Attempt body' },
        exitCheck: { title: 'Exit Check', body: 'Exit body' }
      }
    };
    const subject = state.curriculum.subjects[0];
    const topic = subject.topics[0];
    const subtopic = topic.subtopics[0];
    let session = buildLessonSessionFromTopic(state.profile, subject, topic, subtopic, lesson);
    session = applyLessonAssistantResponse(session, {
      id: 'assistant-enter-loop-skip',
      role: 'assistant',
      type: 'feedback',
      content: 'Move ahead.',
      stage: session.currentStage,
      timestamp: new Date().toISOString(),
      metadata: {
        action: 'advance',
        next_stage: 'concepts',
        reteach_style: null,
        reteach_count: 0,
        confidence_assessment: 0.74,
        profile_update: {}
      }
    });

    const message = buildLessonEvaluationAssistantMessage(session, {
      score: 0.35,
      mustHitConceptsMet: [],
      missingMustHitConcepts: ['equivalent fractions'],
      criticalMisconceptions: [],
      feedback: 'This core idea still needs revisiting.',
      mode: 'skip_with_accountability',
      provider: 'local-heuristic',
      model: 'local-heuristic'
    });
    session = applyLessonAssistantResponse(session, message);

    expect(session.v2State?.skippedGaps).toEqual(
      expect.arrayContaining([expect.objectContaining({ concept: 'equivalent fractions', status: 'skipped' })])
    );
    expect(session.v2State?.activeCheckpoint).toBe('loop_example');
  });

  it('buildStageLearnerPrompt asks a direct prior knowledge question for orientation', () => {
    const state = createInitialState();
    const lesson = state.lessons[0]!;

    const prompt = buildStageLearnerPrompt(lesson, 'orientation');

    expect(prompt).toMatch(/what do you already know/i);
    expect(prompt).not.toMatch(/connect with/i);
  });

  it('buildWarmLessonOpening frames the extracted topic without asking the prior knowledge question', () => {
    const state = createInitialState();
    const lesson = state.lessons[0]!;
    const topicName = lesson.title.split(':')[1]?.trim() || lesson.title;

    const opening = buildWarmLessonOpening(lesson);

    expect(opening).toContain(`**${topicName}**`);
    expect(opening).not.toMatch(/what do you already know/i);
  });

  it('buildInitialLessonMessages for orientation returns stage start plus two teaching messages', () => {
    const state = createInitialState();
    const lesson = state.lessons[0]!;
    const messages = buildInitialLessonMessages(lesson, 'orientation');

    expect(messages.length).toBe(3);
    expect(messages[0].type).toBe('stage_start');
  });

  it('buildInitialLessonMessages for orientation inserts a warm opener before the prior knowledge prompt', () => {
    const state = createInitialState();
    const lesson = state.lessons[0]!;
    const topicName = lesson.title.split(':')[1]?.trim() || lesson.title;
    const messages = buildInitialLessonMessages(lesson, 'orientation');

    expect(messages).toHaveLength(3);
    expect(messages[1]?.content).toContain(topicName);
    expect(messages[1]?.content).not.toMatch(/what do you already know/i);
    expect(messages[2]?.content).toMatch(/what do you already know/i);
  });

  it('buildInitialLessonMessages for orientation emits teaching assistant messages after the stage start', () => {
    const state = createInitialState();
    const lesson = state.lessons[0]!;
    const messages = buildInitialLessonMessages(lesson, 'orientation');

    expect(messages[1].role).toBe('assistant');
    expect(messages[1].type).toBe('teaching');
    expect(messages[2].role).toBe('assistant');
    expect(messages[2].type).toBe('teaching');
  });

  it('buildInitialLessonMessages for orientation does not reveal the orientation body before the student answers', () => {
    const state = createInitialState();
    const lesson = state.lessons[0]!;
    const messages = buildInitialLessonMessages(lesson, 'orientation');

    expect(messages[1]?.content).not.toContain(lesson.orientation.body);
  });

  it('buildInitialLessonMessages for orientation contains the prior knowledge prompt', () => {
    const state = createInitialState();
    const lesson = state.lessons[0]!;
    const messages = buildInitialLessonMessages(lesson, 'orientation');

    expect(messages[2]?.content).toBe(buildStageLearnerPrompt(lesson, 'orientation'));
  });

  it('buildInitialLessonMessages for construction still prepends guided construction body', () => {
    const state = createInitialState();
    const lesson = state.lessons[0]!;
    const messages = buildInitialLessonMessages(lesson, 'construction');

    expect(messages).toHaveLength(2);
    expect(messages[1]?.content).toContain(lesson.guidedConstruction.body);
  });

  it('canonicalStageTeachingContent for orientation resolves to the prior knowledge prompt', () => {
    const state = createInitialState();
    const lesson = state.lessons[0]!;

    expect(canonicalStageTeachingContent(lesson, 'orientation', 1)).toBe(buildWarmLessonOpening(lesson));
    expect(canonicalStageTeachingContent(lesson, 'orientation', 2)).toBe(
      buildStageLearnerPrompt(lesson, 'orientation')
    );
  });

  it('shouldRepairStageTeachingMessage does not flag the new orientation prior knowledge prompt', () => {
    const state = createInitialState();
    const lesson = state.lessons[0]!;

    expect(
      shouldRepairStageTeachingMessage(
        { content: buildStageLearnerPrompt(lesson, 'orientation'), stage: 'orientation' },
        1
      )
    ).toBe(false);
  });

  // Backward-compatibility: old stage names must not crash
  it('old session with currentStage overview does not crash applyLessonAssistantResponse', () => {
    const state = createInitialState();
    const oldSession = { ...makeMockSession(state.lessons[0]), currentStage: 'overview' as never };
    expect(() => applyLessonAssistantResponse(oldSession, {
      id: 'msg-1',
      role: 'assistant',
      type: 'teaching',
      content: 'Good.',
      stage: 'overview' as never,
      timestamp: new Date().toISOString(),
      metadata: {
        action: 'stay',
        next_stage: null,
        reteach_style: null,
        reteach_count: 0,
        confidence_assessment: 0.5,
        profile_update: {}
      }
    })).not.toThrow();
  });

  it('old session with currentStage detail does not crash applyLessonAssistantResponse', () => {
    const state = createInitialState();
    const oldSession = { ...makeMockSession(state.lessons[0]), currentStage: 'detail' as never };
    expect(() => applyLessonAssistantResponse(oldSession, {
      id: 'msg-1',
      role: 'assistant',
      type: 'teaching',
      content: 'Good.',
      stage: 'detail' as never,
      timestamp: new Date().toISOString(),
      metadata: {
        action: 'stay',
        next_stage: null,
        reteach_style: null,
        reteach_count: 0,
        confidence_assessment: 0.5,
        profile_update: {}
      }
    })).not.toThrow();
  });

  it('normalizeAppState migrates old overview/detail stages to new names', () => {
    const initial = createInitialState();
    const oldSession = {
      ...makeMockSession(initial.lessons[0]),
      currentStage: 'overview',
      stagesCompleted: ['detail']
    };
    const normalized = normalizeAppState({
      ...initial,
      lessonSessions: [oldSession]
    });

    expect(normalized.lessonSessions[0].currentStage).toBe('orientation');
    expect(normalized.lessonSessions[0].stagesCompleted).toContain('construction');
  });

  // T3.5: AI message history is capped at 20
  it('capped learner profile lists at max 25 entries', () => {
    let profile = createDefaultLearnerProfile('student-1');

    for (let i = 0; i < 30; i++) {
      profile = updateLearnerProfile(profile, { struggled_with: [`concept-${i}`] });
    }

    expect(profile.concepts_struggled_with.length).toBeLessThanOrEqual(25);
  });

  // T3.6: excelled_at list is capped
  it('capped excelled_at list at max 25 entries', () => {
    let profile = createDefaultLearnerProfile('student-1');

    for (let i = 0; i < 30; i++) {
      profile = updateLearnerProfile(profile, { excelled_at: [`concept-${i}`] });
    }

    expect(profile.concepts_excelled_at.length).toBeLessThanOrEqual(25);
  });

  // T3.3a: LessonSession must not embed the full lesson plan object (no structural duplication)
  it('serialised LessonSession does not contain a lessonPlan JSON key', () => {
    const state = createInitialState();
    // Simulate 10 sessions for the same lesson
    const sessions = Array.from({ length: 10 }, (_, i) => ({
      ...makeMockSession(state.lessons[0]),
      id: `session-${i}`
    }));
    const testState = { ...state, lessonSessions: sessions };
    const serialized = JSON.stringify(testState);
    // "lessonPlan" must not appear as a key inside any session object
    // (it may still be in state.lessons but not embedded per-session)
    expect(serialized).not.toContain('"lessonPlan"');
  });

  // ─── Phase 1: Surface dead sections ────────────────────────────────────────

  it('P1: buildInitialLessonMessages for concepts stage prepends mentalModel as framing message', () => {
    const state = createInitialState();
    const lesson = state.lessons[0];
    const messages = buildInitialLessonMessages(lesson, 'concepts');

    // stage_start + mentalModel framing + concepts content (at minimum)
    expect(messages.length).toBeGreaterThanOrEqual(3);
    const mentalModelMsg = messages.find(
      (m) => m.role === 'assistant' && m.type === 'teaching' && m.content.includes(lesson.mentalModel.body)
    );
    expect(mentalModelMsg).toBeDefined();
  });

  it('P1: mentalModel message in concepts stage has correct shape', () => {
    const state = createInitialState();
    const lesson = state.lessons[0];
    const messages = buildInitialLessonMessages(lesson, 'concepts');
    // The mentalModel message should appear before the concepts content message
    const stageStart = messages[0];
    const mentalModelMsg = messages[1];
    expect(stageStart.type).toBe('stage_start');
    expect(mentalModelMsg.role).toBe('assistant');
    expect(mentalModelMsg.type).toBe('teaching');
    expect(mentalModelMsg.content).toContain(lesson.mentalModel.body);
  });

  it('P1: buildInitialLessonMessages for check stage includes commonMistakes as feedback message', () => {
    const state = createInitialState();
    const lesson = state.lessons[0];
    const messages = buildInitialLessonMessages(lesson, 'check');

    const feedbackMsg = messages.find((m) => m.type === 'feedback' && m.content.includes(lesson.commonMistakes.body));
    expect(feedbackMsg).toBeDefined();
  });

  it('P1: check stage teaching message asks for the first move on the task, not a vague restatement', () => {
    const state = createInitialState();
    const lesson = state.lessons[0]!;
    const messages = buildInitialLessonMessages(lesson, 'check');

    const teachingMsg = messages.find((m) => m.role === 'assistant' && m.type === 'teaching');
    expect(teachingMsg?.content).toContain('Answer the task above.');
    expect(teachingMsg?.content).toContain('first step');
    expect(teachingMsg?.content).not.toContain('Put it in your own words');
    expect(teachingMsg?.content).not.toContain('main idea here');
  });

  it('P1: check stage feedback message has system role', () => {
    const state = createInitialState();
    const lesson = state.lessons[0];
    const messages = buildInitialLessonMessages(lesson, 'check');

    const feedbackMsg = messages.find((m) => m.type === 'feedback');
    expect(feedbackMsg?.role).toBe('system');
  });

  it('P1: getLessonSectionForStage returns commonMistakes body for check stage', () => {
    const state = createInitialState();
    const lesson = state.lessons[0];
    const content = getLessonSectionForStage(lesson, 'check');
    expect(content).toBe(lesson.commonMistakes.body);
  });

  it('P1: getLessonSectionForStage returns summary body for complete stage', () => {
    const state = createInitialState();
    const lesson = state.lessons[0];
    const content = getLessonSectionForStage(lesson, 'complete');
    expect(content).toBe(lesson.summary.body);
  });

  it('P1: stage opening prompts are concrete and bounded instead of using the old slow-down wording', () => {
    const state = createInitialState();
    const lesson = state.lessons[0]!;

    const conceptsPrompt = buildInitialLessonMessages(lesson, 'concepts')
      .filter((message) => message.role === 'assistant' && message.type === 'teaching')
      .at(-1)?.content ?? '';
    const constructionPrompt = buildInitialLessonMessages(lesson, 'construction')[1]?.content ?? '';
    const practicePrompt = buildInitialLessonMessages(lesson, 'practice')[1]?.content ?? '';

    expect(conceptsPrompt).not.toContain('What feels clear so far?');
    expect(conceptsPrompt).not.toContain('Tell me where you want to slow down.');
    expect(conceptsPrompt).toMatch(/Which|What/);

    expect(constructionPrompt).not.toContain('Tell me where you want to slow down.');
    expect(constructionPrompt).toMatch(/first/i);

    expect(practicePrompt).not.toContain('Apply what you have learned');
    expect(practicePrompt).toContain('Start with the task above');
  });

  it('P1: repairLessonSessionMessages replaces legacy generic prompts with the current stage-specific message', () => {
    const state = createInitialState();
    const lesson = state.lessons[0]!;
    const repaired = repairLessonSessionMessages(
      {
        ...makeMockSession(lesson, { currentStage: 'practice' }),
        messages: [
          buildStageStartMessage('practice'),
          {
            id: 'legacy-practice-message',
            role: 'assistant',
            type: 'teaching',
            content:
              'Now try it yourself. Apply what you have learned about **Sequences** to a similar problem. Write out each step, explain your reasoning, and check your answer before moving on.\n\nWhat feels clear so far? Tell me where you want to slow down.',
            stage: 'practice',
            timestamp: '2026-04-21T12:00:00.000Z',
            metadata: null
          }
        ]
      },
      lesson
    );

    const repairedMessage = repaired.messages.find((message) => message.id === 'legacy-practice-message');

    expect(repairedMessage?.content).toContain('Start with the task above');
    expect(repairedMessage?.content).not.toContain('Apply what you have learned');
    expect(repairedMessage?.content).not.toContain('Tell me where you want to slow down.');
  });

  // --- Prompt 6: Wire routing ---

  function makeV2LoopCheckSession(lesson: Lesson): LessonSession {
    return makeMockSession(lesson, {
      lessonFlowVersion: 'v2',
      v2State: {
        totalLoops: 2,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_check',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false
      }
    });
  }

  it('applyLessonAssistantResponse at loop_check with clean first-attempt result sets compress=true', () => {
    const state = createInitialState();
    const lesson = state.lessons[0];
    const session = makeV2LoopCheckSession(lesson);
    const updated = applyLessonAssistantResponse(session, {
      id: 'msg-advance-1',
      role: 'assistant',
      type: 'feedback',
      content: 'Great work.',
      stage: 'concepts',
      timestamp: new Date().toISOString(),
      metadata: {
        action: 'advance',
        next_stage: 'concepts',
        reteach_style: null,
        reteach_count: 0,
        confidence_assessment: 0.9,
        lesson_score: 0.9,
        must_hit_concepts_met: ['gradient'],
        missing_must_hit_concepts: [],
        critical_misconceptions: [],
        profile_update: {}
      }
    });
    expect(updated.v2State?.compress).toBe(true);
  });

  it('applyLessonAssistantResponse at loop_check with missing concepts sets bridgeNeeded=true', () => {
    const state = createInitialState();
    const lesson = state.lessons[0];
    const session = makeV2LoopCheckSession(lesson);
    const updated = applyLessonAssistantResponse(session, {
      id: 'msg-advance-2',
      role: 'assistant',
      type: 'feedback',
      content: 'Not quite.',
      stage: 'concepts',
      timestamp: new Date().toISOString(),
      metadata: {
        action: 'advance',
        next_stage: 'concepts',
        reteach_style: null,
        reteach_count: 0,
        confidence_assessment: 0.55,
        lesson_score: 0.55,
        must_hit_concepts_met: [],
        missing_must_hit_concepts: ['y-intercept'],
        critical_misconceptions: [],
        profile_update: {}
      }
    });
    expect(updated.v2State?.bridgeNeeded).toBe(true);
  });

  it('applyLessonAssistantResponse at loop_check with misconception sets misconceptionTarget', () => {
    const state = createInitialState();
    const lesson = state.lessons[0];
    const session = makeV2LoopCheckSession(lesson);
    const updated = applyLessonAssistantResponse(session, {
      id: 'msg-advance-3',
      role: 'assistant',
      type: 'feedback',
      content: 'Address the misconception.',
      stage: 'concepts',
      timestamp: new Date().toISOString(),
      metadata: {
        action: 'advance',
        next_stage: 'concepts',
        reteach_style: null,
        reteach_count: 0,
        confidence_assessment: 0.3,
        lesson_score: 0.3,
        must_hit_concepts_met: [],
        missing_must_hit_concepts: [],
        critical_misconceptions: ['gradient is always positive'],
        profile_update: {}
      }
    });
    expect(updated.v2State?.misconceptionTarget).toBe('gradient is always positive');
  });
});
