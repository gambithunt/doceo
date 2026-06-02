import { describe, expect, it } from 'vitest';
import {
  buildCheckpointInstructions,
  buildEvidenceInstructions,
  buildOrientationFirstResponseInstruction,
  buildSystemPrompt,
  createLessonChatBody
} from '$lib/ai/lesson-chat';
import { createInitialState } from '$lib/data/platform';
import { buildDynamicLessonFromTopic } from '$lib/lesson-system';
import type { Lesson, LessonMessage, LessonSession } from '$lib/types';

function makeMessage(i: number): LessonMessage {
  return {
    id: `msg-${i}`,
    role: i % 2 === 0 ? 'user' : 'assistant',
    type: 'teaching',
    content: `Message ${i}`,
    stage: 'orientation',
    timestamp: new Date().toISOString(),
    metadata: null
  };
}

function makeMockSession(lesson: { id: string }, overrides: Partial<LessonSession> = {}): LessonSession {
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

function makeV2Lesson(baseLesson: Lesson): Lesson {
  return {
    ...baseLesson,
    lessonFlowVersion: 'v2',
    flowV2: {
      groupedLabels: ['orientation', 'concepts', 'practice', 'check', 'complete'],
      start: { title: 'Start', body: 'Start body for AI context' },
      loops: [
        {
          id: 'loop-1',
          title: 'Loop 1',
          teaching: { title: 'Teach', body: 'Teach body' },
          example: { title: 'Example', body: 'Example body' },
          learnerTask: { title: 'Task', body: 'Task body' },
          retrievalCheck: { title: 'Check', body: 'Check body' },
          mustHitConcepts: ['core idea'],
          criticalMisconceptionTags: ['core-gap']
        }
      ],
      synthesis: { title: 'Synthesis', body: 'Synthesis body' },
      independentAttempt: { title: 'Independent Attempt', body: 'Attempt body' },
      exitCheck: { title: 'Exit Check', body: 'Exit body' }
    }
  };
}

describe('lesson-chat', () => {
  // T3.5: AI message history is capped at 20
  it('caps message history sent to AI at 20 messages', () => {
    const state = createInitialState();
    const lesson = state.lessons[0];
    const longSession = makeMockSession(lesson, {
      messages: Array.from({ length: 50 }, (_, i) => makeMessage(i))
    });

    const body = createLessonChatBody(
      {
        student: state.profile,
        learnerProfile: state.learnerProfile,
        lesson,
        lessonSession: longSession,
        message: 'Is this right?',
        messageType: 'response'
      },
      'gpt-4.1-mini'
    );

    // System message + up to 20 history messages + 1 current = at most 22
    const historyMessages = body.messages.filter((m) => m.role !== 'system');
    // The last message is always the current one, history before it is capped at 20
    expect(historyMessages.length).toBeLessThanOrEqual(21);
  });

  // ─── Phase 5: check stage system prompt ────────────────────────────────────

  it('P5: buildSystemPrompt includes commonMistakes body when stage is check', () => {
    const state = createInitialState();
    const lesson = state.lessons[0];
    const checkSession = makeMockSession(lesson, { currentStage: 'check' });
    const prompt = buildSystemPrompt({
      student: state.profile,
      learnerProfile: state.learnerProfile,
      lesson,
      lessonSession: checkSession,
      message: 'test',
      messageType: 'response'
    });
    expect(prompt).toContain(lesson.commonMistakes.body);
  });

  it('P5: buildSystemPrompt includes transferChallenge body when stage is check', () => {
    const state = createInitialState();
    const lesson = state.lessons[0];
    const checkSession = makeMockSession(lesson, { currentStage: 'check' });
    const prompt = buildSystemPrompt({
      student: state.profile,
      learnerProfile: state.learnerProfile,
      lesson,
      lessonSession: checkSession,
      message: 'test',
      messageType: 'response'
    });
    expect(prompt).toContain(lesson.transferChallenge.body);
  });

  it('P5: buildSystemPrompt does NOT include transferChallenge body for orientation stage', () => {
    const state = createInitialState();
    const lesson = buildDynamicLessonFromTopic({
      subjectId: 'subject-math',
      subjectName: 'Mathematics',
      grade: 'Grade 8',
      topicTitle: 'Patterns',
      topicDescription: 'Growing number patterns.',
      curriculumReference: 'CAPS · Grade 8 · Mathematics'
    });
    const orientationSession = makeMockSession(lesson, { currentStage: 'orientation' });
    const prompt = buildSystemPrompt({
      student: state.profile,
      learnerProfile: state.learnerProfile,
      lesson,
      lessonSession: orientationSession,
      message: 'test',
      messageType: 'response'
    });
    // transferChallenge is only injected during check stage
    expect(prompt).not.toContain(lesson.transferChallenge.body);
  });

  it('buildSystemPrompt concept card instruction uses "contains" not "begins with"', () => {
    const state = createInitialState();
    const lesson = state.lessons[0];
    const session = makeMockSession(lesson, { currentStage: 'concepts' });
    const prompt = buildSystemPrompt({
      student: state.profile,
      learnerProfile: state.learnerProfile,
      lesson,
      lessonSession: session,
      message: '[CONCEPT: test]',
      messageType: 'question'
    });
    // Must say "contains" not "begins with" since [STAGE:] wrapper precedes [CONCEPT:] in the actual message
    expect(prompt).toContain('contains [CONCEPT:');
    expect(prompt).not.toContain('begins with [CONCEPT:');
  });

  it('buildSystemPrompt says short but meaningful concepts answers can still qualify', () => {
    const state = createInitialState();
    const lesson = state.lessons[0];
    const session = makeMockSession(lesson, { currentStage: 'concepts' });
    const prompt = buildSystemPrompt({
      student: state.profile,
      learnerProfile: state.learnerProfile,
      lesson,
      lessonSession: session,
      message: 'It changes by 4 each time.',
      messageType: 'response'
    });

    expect(prompt).toContain('A short answer can still count if it shows real understanding');
    expect(prompt).toContain('names the key idea');
  });

  it('buildSystemPrompt caps concepts-stage same-point stays at two before resolution', () => {
    const state = createInitialState();
    const lesson = state.lessons[0];
    const session = makeMockSession(lesson, { currentStage: 'concepts', softStuckCount: 2 });
    const prompt = buildSystemPrompt({
      student: state.profile,
      learnerProfile: state.learnerProfile,
      lesson,
      lessonSession: session,
      message: 'ok',
      messageType: 'response'
    });

    expect(prompt).toContain('Do not stay on the exact same concepts-stage checkpoint more than 2 times');
    expect(prompt).toContain('Soft-Stuck Same-Point Stays: 2');
  });

  it('buildSystemPrompt tells the tutor to ask concrete answerable questions before open explanation', () => {
    const state = createInitialState();
    const lesson = state.lessons[0]!;
    const session = makeMockSession(lesson, { currentStage: 'check' });
    const prompt = buildSystemPrompt({
      student: state.profile,
      learnerProfile: state.learnerProfile,
      lesson,
      lessonSession: session,
      message: 'continue',
      messageType: 'response'
    });

    expect(prompt).toContain('Ask a concrete, answerable question first');
    expect(prompt).toContain('Do not default to asking for a practical or real-world example');
    expect(prompt).toContain('identify, choose, solve, quote, classify, correct, or complete the next step');
  });

  it('buildSystemPrompt tells the tutor not to append a new question for Help me start support replies', () => {
    const state = createInitialState();
    const lesson = state.lessons[0]!;
    const session = makeMockSession(lesson, {
      currentStage: 'practice',
      messages: [
        {
          id: 'msg-active-practice-prompt',
          role: 'assistant',
          type: 'teaching',
          content:
            'Exactly! By building ships, the Greeks could travel further for trade and fishing.\n\nNow, let’s wrap this up. Can you summarize how the ocean, as a key resource, influenced the Greek civilization in terms of food, trade, and shipbuilding? What’s the big picture?',
          stage: 'practice',
          timestamp: new Date().toISOString(),
          metadata: null
        }
      ]
    });
    const prompt = buildSystemPrompt({
      student: state.profile,
      learnerProfile: state.learnerProfile,
      lesson,
      lessonSession: session,
      message: 'Help me start this practice question with the first move only.',
      messageType: 'response',
      supportIntent: 'help_me_start'
    });

    expect(prompt).toContain('Support Intent: help_me_start');
    expect(prompt).toContain('Latest Tutor Prompt Awaiting Answer: Now, let’s wrap this up. Can you summarize how the ocean, as a key resource, influenced the Greek civilization in terms of food, trade, and shipbuilding? What’s the big picture?');
    expect(prompt).toContain('Latest Tutor Teaching Anchor: Exactly! By building ships, the Greeks could travel further for trade and fishing.');
    expect(prompt).toContain('Do not ask beyond the taught envelope.');
    expect(prompt).toContain('Reduce multi-part prompts to the first unresolved part.');
    expect(prompt).toContain('Do not add a new bottom-of-bubble question');
    expect(prompt).toContain('Give one concrete first move');
  });

  it('buildOrientationFirstResponseInstruction labels the orientation instruction section', () => {
    expect(buildOrientationFirstResponseInstruction()).toContain('ORIENTATION INSTRUCTION');
  });

  it('buildOrientationFirstResponseInstruction says the student has not seen lesson content', () => {
    expect(buildOrientationFirstResponseInstruction()).toContain('has NOT yet seen the lesson content');
  });

  it('buildSystemPrompt injects orientation instruction for the first v1 orientation user reply', () => {
    const state = createInitialState();
    const lesson = state.lessons[0]!;
    const session = makeMockSession(lesson, {
      currentStage: 'orientation',
      messages: [
        {
          id: 'user-prior-knowledge',
          role: 'user',
          type: 'response',
          content: 'I know this has something to do with patterns.',
          stage: 'orientation',
          timestamp: new Date().toISOString(),
          metadata: null
        }
      ]
    });

    const prompt = buildSystemPrompt({ student: state.profile, learnerProfile: state.learnerProfile, lesson, lessonSession: session, message: 'I know this has something to do with patterns.', messageType: 'response' });

    expect(prompt).toContain('ORIENTATION INSTRUCTION');
  });

  it('buildSystemPrompt does not inject orientation instruction before a v1 orientation user reply exists', () => {
    const state = createInitialState();
    const lesson = state.lessons[0]!;
    const session = makeMockSession(lesson, { currentStage: 'orientation', messages: [] });

    const prompt = buildSystemPrompt({ student: state.profile, learnerProfile: state.learnerProfile, lesson, lessonSession: session, message: 'hello', messageType: 'response' });

    expect(prompt).not.toContain('ORIENTATION INSTRUCTION');
  });

  it('buildSystemPrompt does not inject orientation instruction after more than one v1 orientation user reply', () => {
    const state = createInitialState();
    const lesson = state.lessons[0]!;
    const session = makeMockSession(lesson, {
      currentStage: 'orientation',
      messages: [
        {
          id: 'user-prior-knowledge-1',
          role: 'user',
          type: 'response',
          content: 'I know one thing.',
          stage: 'orientation',
          timestamp: new Date().toISOString(),
          metadata: null
        },
        {
          id: 'assistant-orientation-1',
          role: 'assistant',
          type: 'teaching',
          content: 'Let us build from that.',
          stage: 'orientation',
          timestamp: new Date().toISOString(),
          metadata: null
        },
        {
          id: 'user-prior-knowledge-2',
          role: 'user',
          type: 'response',
          content: 'I also know another thing.',
          stage: 'orientation',
          timestamp: new Date().toISOString(),
          metadata: null
        }
      ]
    });

    const prompt = buildSystemPrompt({ student: state.profile, learnerProfile: state.learnerProfile, lesson, lessonSession: session, message: 'I also know another thing.', messageType: 'response' });

    expect(prompt).not.toContain('ORIENTATION INSTRUCTION');
  });

  it('buildSystemPrompt injects orientation instruction for the first v2 start user reply', () => {
    const state = createInitialState();
    const lesson = makeV2Lesson(state.lessons[0]!);
    const session = makeMockSession(lesson, {
      lessonFlowVersion: 'v2',
      currentStage: 'orientation',
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'start',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'orientation',
        skippedGaps: [],
        needsTeacherReview: false
      },
      messages: [
        {
          id: 'user-v2-prior-knowledge',
          role: 'user',
          type: 'response',
          content: 'I have heard the word before.',
          stage: 'orientation',
          timestamp: new Date().toISOString(),
          metadata: null
        }
      ]
    });

    const prompt = buildSystemPrompt({ student: state.profile, learnerProfile: state.learnerProfile, lesson, lessonSession: session, message: 'I have heard the word before.', messageType: 'response' });

    expect(prompt).toContain('ORIENTATION INSTRUCTION');
  });

  it('buildSystemPrompt does not inject orientation instruction for v1 concepts stage', () => {
    const state = createInitialState();
    const lesson = state.lessons[0]!;
    const session = makeMockSession(lesson, {
      currentStage: 'concepts',
      messages: [
        {
          id: 'user-concepts',
          role: 'user',
          type: 'response',
          content: 'The key idea is change.',
          stage: 'concepts',
          timestamp: new Date().toISOString(),
          metadata: null
        }
      ]
    });

    const prompt = buildSystemPrompt({ student: state.profile, learnerProfile: state.learnerProfile, lesson, lessonSession: session, message: 'The key idea is change.', messageType: 'response' });

    expect(prompt).not.toContain('ORIENTATION INSTRUCTION');
  });

  it('buildSystemPrompt does not inject orientation instruction for a v2 loop_teach checkpoint', () => {
    const state = createInitialState();
    const lesson = makeV2Lesson(state.lessons[0]!);
    const session = makeMockSession(lesson, {
      lessonFlowVersion: 'v2',
      currentStage: 'concepts',
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_teach',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false
      },
      messages: [
        {
          id: 'user-v2-loop',
          role: 'user',
          type: 'response',
          content: 'I am ready.',
          stage: 'concepts',
          timestamp: new Date().toISOString(),
          metadata: null
        }
      ]
    });

    const prompt = buildSystemPrompt({ student: state.profile, learnerProfile: state.learnerProfile, lesson, lessonSession: session, message: 'I am ready.', messageType: 'response' });

    expect(prompt).not.toContain('ORIENTATION INSTRUCTION');
  });

  it('buildSystemPrompt includes v2 checkpoint and rubric metadata fields for loop sessions', () => {
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
    const session = makeMockSession(lesson, {
      lessonFlowVersion: 'v2',
      currentStage: 'concepts',
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_check',
        revisionAttemptCount: 1,
        remediationStep: 'hint',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false
      }
    });

    const prompt = buildSystemPrompt({
      student: state.profile,
      learnerProfile: state.learnerProfile,
      lesson,
      lessonSession: session,
      message: 'My answer',
      messageType: 'response'
    });

    expect(prompt).toContain('Lesson Flow Version: v2');
    expect(prompt).toContain('Current V2 Checkpoint: loop_check');
    expect(prompt).toContain('Current Remediation Step: hint');
    expect(prompt).toContain('"lesson_score": null');
    expect(prompt).toContain('"critical_misconceptions": []');
    expect(prompt).toContain('Use the optional lesson_score');
  });

  // --- Prompt 4: Adaptive teacher prompt ---

  it('buildCheckpointInstructions returns teaching instruction for loop_teach', () => {
    expect(buildCheckpointInstructions('loop_teach')).toContain('CHECKPOINT: Teaching');
  });

  it('buildCheckpointInstructions returns practice instruction for loop_practice', () => {
    expect(buildCheckpointInstructions('loop_practice')).toContain('CHECKPOINT: Learner Practice');
  });

  it('buildCheckpointInstructions returns synthesis instruction for synthesis', () => {
    expect(buildCheckpointInstructions('synthesis')).toContain('CHECKPOINT: Synthesis');
  });

  it('buildEvidenceInstructions returns empty string for null evidence', () => {
    expect(buildEvidenceInstructions(null)).toBe('');
  });

  it('buildEvidenceInstructions with a passing loop contains "passed cleanly"', () => {
    const evidence = {
      loops: [{
        loopId: 'l1', loopIndex: 0, loopTitle: 'Loop 1',
        conceptsMet: ['core idea'], gaps: [], misconceptions: [],
        score: 0.9, attemptCount: 1,
        styleSignals: {
          neededScaffolding: false, askedClarifyingQuestion: false, answeredOnFirstAttempt: true,
          explanationWasVague: false, usedConcreteLanguage: true
        },
        evaluatedAt: '2026-05-21T10:00:00.000Z'
      }],
      pace: 'normal' as const, criticalGaps: [], confirmedMisconceptions: [],
      independentAttemptScore: null, exitCheckPassed: null
    };
    expect(buildEvidenceInstructions(evidence)).toContain('passed cleanly');
  });

  it('buildEvidenceInstructions with gaps contains the gap label', () => {
    const evidence = {
      loops: [{
        loopId: 'l1', loopIndex: 0, loopTitle: 'Loop 1',
        conceptsMet: [], gaps: ['chain rule'], misconceptions: [],
        score: 0.4, attemptCount: 2,
        styleSignals: {
          neededScaffolding: false, askedClarifyingQuestion: false, answeredOnFirstAttempt: false,
          explanationWasVague: false, usedConcreteLanguage: false
        },
        evaluatedAt: '2026-05-21T10:00:00.000Z'
      }],
      pace: 'normal' as const, criticalGaps: [], confirmedMisconceptions: [],
      independentAttemptScore: null, exitCheckPassed: null
    };
    expect(buildEvidenceInstructions(evidence)).toContain('chain rule');
  });

  it('buildEvidenceInstructions with criticalGaps contains CRITICAL and the gap', () => {
    const evidence = {
      loops: [],
      pace: 'normal' as const,
      criticalGaps: ['integration by parts'],
      confirmedMisconceptions: [],
      independentAttemptScore: null,
      exitCheckPassed: null
    };
    const result = buildEvidenceInstructions(evidence);
    expect(result).toContain('CRITICAL');
    expect(result).toContain('integration by parts');
  });

  it('buildEvidenceInstructions with pace=fast emits a direct pacing instruction', () => {
    const evidence = {
      loops: [{
        loopId: 'l1', loopIndex: 0, loopTitle: 'L1',
        conceptsMet: ['x'], gaps: [], misconceptions: [], score: 0.9, attemptCount: 1,
        styleSignals: {
          neededScaffolding: false, askedClarifyingQuestion: false, answeredOnFirstAttempt: true,
          explanationWasVague: false, usedConcreteLanguage: true
        },
        evaluatedAt: '2026-05-21T10:00:00.000Z'
      }],
      pace: 'fast' as const, criticalGaps: [], confirmedMisconceptions: [],
      independentAttemptScore: null, exitCheckPassed: null
    };
    const result = buildEvidenceInstructions(evidence);
    expect(result).toContain('PACE: Student is fast');
    expect(result).toContain('Skip the worked example restatement');
  });

  it('buildEvidenceInstructions slow pace emits an anchoring directive', () => {
    const evidence = {
      loops: [{
        loopId: 'l1', loopIndex: 0, loopTitle: 'L1',
        conceptsMet: [], gaps: ['first step'], misconceptions: [], score: 0.4, attemptCount: 3,
        styleSignals: {
          neededScaffolding: true, askedClarifyingQuestion: true, answeredOnFirstAttempt: false,
          explanationWasVague: true, usedConcreteLanguage: false
        },
        evaluatedAt: '2026-05-21T10:00:00.000Z'
      }],
      pace: 'slow' as const, criticalGaps: [], confirmedMisconceptions: [],
      independentAttemptScore: null, exitCheckPassed: null
    };
    const result = buildEvidenceInstructions(evidence);
    expect(result).toMatch(/anchor sentence|concrete sentence/i);
  });

  it('buildEvidenceInstructions critical gap emits a per-gap correction directive', () => {
    const evidence = {
      loops: [],
      pace: 'normal' as const,
      criticalGaps: ['y-intercept'],
      confirmedMisconceptions: [],
      independentAttemptScore: null,
      exitCheckPassed: null
    };
    const result = buildEvidenceInstructions(evidence);
    expect(result).toMatch(/CRITICAL GAP.*y-intercept/);
    expect(result).toMatch(/Restate the rule/i);
  });

  it('buildEvidenceInstructions confirmed misconception emits a named correction directive', () => {
    const evidence = {
      loops: [],
      pace: 'normal' as const,
      criticalGaps: [],
      confirmedMisconceptions: ['gradient is always positive'],
      independentAttemptScore: null,
      exitCheckPassed: null
    };
    const result = buildEvidenceInstructions(evidence);
    expect(result).toMatch(/CONFIRMED MISCONCEPTION.*gradient is always positive/);
    expect(result).toMatch(/correct version/i);
  });

  it('buildSystemPrompt for a v2 session at loop_teach contains checkpoint instruction', () => {
    const state = createInitialState();
    const lesson = state.lessons[0]!;
    const session = makeMockSession(lesson, {
      lessonFlowVersion: 'v2',
      v2State: {
        totalLoops: 2, activeLoopIndex: 0, activeCheckpoint: 'loop_teach',
        revisionAttemptCount: 0, remediationStep: 'none', labelBucket: 'concepts',
        skippedGaps: [], needsTeacherReview: false
      }
    });
    const prompt = buildSystemPrompt({ student: state.profile, learnerProfile: state.learnerProfile, lesson, lessonSession: session, message: 'Hello', messageType: 'response' });
    expect(prompt).toContain('CHECKPOINT: Teaching');
  });

  it('buildSystemPrompt for a v2 session with v2Evidence contains IN-SESSION EVIDENCE', () => {
    const state = createInitialState();
    const lesson = state.lessons[0]!;
    const session = makeMockSession(lesson, {
      lessonFlowVersion: 'v2',
      v2State: {
        totalLoops: 2, activeLoopIndex: 1, activeCheckpoint: 'loop_teach',
        revisionAttemptCount: 0, remediationStep: 'none', labelBucket: 'concepts',
        skippedGaps: [], needsTeacherReview: false
      },
      v2Evidence: {
        loops: [{
          loopId: 'l1', loopIndex: 0, loopTitle: 'Loop 1',
          conceptsMet: ['core idea'], gaps: [], misconceptions: [], score: 0.9, attemptCount: 1,
          styleSignals: {
            neededScaffolding: false, askedClarifyingQuestion: false, answeredOnFirstAttempt: true,
            explanationWasVague: false, usedConcreteLanguage: true
          },
          evaluatedAt: '2026-05-21T10:00:00.000Z'
        }],
        pace: 'fast', criticalGaps: [], confirmedMisconceptions: [],
        independentAttemptScore: null, exitCheckPassed: null
      }
    });
    const prompt = buildSystemPrompt({ student: state.profile, learnerProfile: state.learnerProfile, lesson, lessonSession: session, message: 'Hello', messageType: 'response' });
    expect(prompt).toContain('IN-SESSION EVIDENCE');
  });

  it('buildSystemPrompt for a v1 session does NOT contain CHECKPOINT:', () => {
    const state = createInitialState();
    const lesson = state.lessons[0]!;
    const session = makeMockSession(lesson);
    const prompt = buildSystemPrompt({ student: state.profile, learnerProfile: state.learnerProfile, lesson, lessonSession: session, message: 'Hello', messageType: 'response' });
    expect(prompt).not.toContain('CHECKPOINT:');
  });

  // --- Prompt 6: routing flag injection ---

  it('buildCheckpointInstructions loop_teach with bridgeNeeded=true contains BRIDGE REQUIRED', () => {
    const result = buildCheckpointInstructions('loop_teach', {
      totalLoops: 2, activeLoopIndex: 1, activeCheckpoint: 'loop_teach',
      revisionAttemptCount: 0, remediationStep: 'none', labelBucket: 'concepts',
      skippedGaps: [], needsTeacherReview: false,
      compress: false, bridgeNeeded: true, misconceptionTarget: null
    });
    expect(result).toContain('BRIDGE REQUIRED');
  });

  it('buildCheckpointInstructions loop_teach with misconceptionTarget contains the target', () => {
    const result = buildCheckpointInstructions('loop_teach', {
      totalLoops: 2, activeLoopIndex: 1, activeCheckpoint: 'loop_teach',
      revisionAttemptCount: 0, remediationStep: 'none', labelBucket: 'concepts',
      skippedGaps: [], needsTeacherReview: false,
      compress: false, bridgeNeeded: false, misconceptionTarget: 'sign error'
    });
    expect(result).toContain('sign error');
  });

  it('buildCheckpointInstructions loop_teach with compress=true contains PACE', () => {
    const result = buildCheckpointInstructions('loop_teach', {
      totalLoops: 2, activeLoopIndex: 1, activeCheckpoint: 'loop_teach',
      revisionAttemptCount: 0, remediationStep: 'none', labelBucket: 'concepts',
      skippedGaps: [], needsTeacherReview: false,
      compress: true, bridgeNeeded: false, misconceptionTarget: null
    });
    expect(result).toContain('PACE');
  });

  it('buildCheckpointInstructions loop_teach with compress omits worked example', () => {
    const result = buildCheckpointInstructions('loop_teach', {
      totalLoops: 2, activeLoopIndex: 1, activeCheckpoint: 'loop_teach',
      revisionAttemptCount: 0, remediationStep: 'none', labelBucket: 'concepts',
      skippedGaps: [], needsTeacherReview: false,
      compress: true, bridgeNeeded: false, misconceptionTarget: null
    });
    expect(result).toMatch(/omit the worked example/i);
  });

  it('buildCheckpointInstructions loop_teach with no flags does NOT contain BRIDGE REQUIRED or PACE or CORRECT FIRST', () => {
    const result = buildCheckpointInstructions('loop_teach', {
      totalLoops: 2, activeLoopIndex: 1, activeCheckpoint: 'loop_teach',
      revisionAttemptCount: 0, remediationStep: 'none', labelBucket: 'concepts',
      skippedGaps: [], needsTeacherReview: false,
      compress: false, bridgeNeeded: false, misconceptionTarget: null
    });
    expect(result).not.toContain('BRIDGE REQUIRED');
    expect(result).not.toContain('PACE');
    expect(result).not.toContain('CORRECT FIRST');
  });
});
