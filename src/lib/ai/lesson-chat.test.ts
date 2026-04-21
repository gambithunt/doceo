import { describe, expect, it } from 'vitest';
import { buildSystemPrompt, createLessonChatBody } from '$lib/ai/lesson-chat';
import { createInitialState } from '$lib/data/platform';
import { buildDynamicLessonFromTopic } from '$lib/lesson-system';
import type { LessonMessage, LessonSession } from '$lib/types';

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
});
