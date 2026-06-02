import { describe, expect, it } from 'vitest';
import { buildLocalLessonChatResponse } from '$lib/lesson-local-response';
import { buildDynamicLessonFromTopic } from '$lib/lesson-dynamic-builder';
import { createInitialState } from '$lib/data/platform';
import { createDefaultLearnerProfile } from '$lib/lesson-system';
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


describe('lesson-local-response', () => {
  it('buildLocalLessonChatResponse exists', () => {
    expect(buildLocalLessonChatResponse).toBeDefined();
  });

// T1.3: fallback question reply must not echo student message
  it('fallback question reply does not echo the student message text', () => {
    const state = createInitialState();
    const lesson = state.lessons[0];
    const lessonSession = makeMockSession(lesson);
    const studentMessage = 'What is the difference between a numerator and a denominator?';

    const result = buildLocalLessonChatResponse(
      {
        student: state.profile,
        learnerProfile: state.learnerProfile,
        lesson,
        lessonSession,
        message: studentMessage,
        messageType: 'question'
      },
      lesson
    );

    expect(result.displayContent).not.toContain('What is the difference between a numerator');
    expect(result.displayContent).not.toContain('numerator and a denominator');
    expect(result.displayContent.length).toBeGreaterThan(20);
  });

it('P1: complete action in local fallback includes transferChallenge body', () => {
    const state = createInitialState();
    const lesson = state.lessons[0];
    const checkSession = makeMockSession(lesson, { currentStage: 'check' });
    const result = buildLocalLessonChatResponse(
      {
        student: state.profile,
        learnerProfile: state.learnerProfile,
        lesson,
        lessonSession: checkSession,
        message: 'I understand — the rule is add the common difference to find the next term.',
        messageType: 'response'
      },
      lesson
    );
    expect(result.metadata?.action).toBe('complete');
    expect(result.displayContent).toContain(lesson.transferChallenge.body);
  });

it('local fallback treats a short but meaningful concepts answer as progression-ready', () => {
    const state = createInitialState();
    const lesson = state.lessons[0];
    const session = makeMockSession(lesson, { currentStage: 'concepts' });

    const result = buildLocalLessonChatResponse(
      {
        student: state.profile,
        learnerProfile: state.learnerProfile,
        lesson,
        lessonSession: session,
        message: 'It adds 4 each time.',
        messageType: 'response'
      },
      lesson
    );

    expect(result.metadata?.action).toBe('advance');
    expect(result.metadata?.next_stage).toBe('construction');
  });

  it('local fallback keeps concepts-stage acknowledgement-only replies on stay before the soft-stuck threshold', () => {
    const state = createInitialState();
    const lesson = state.lessons[0];
    const session = makeMockSession(lesson, {
      currentStage: 'concepts',
      softStuckCount: 1
    });

    const result = buildLocalLessonChatResponse(
      {
        student: state.profile,
        learnerProfile: state.learnerProfile,
        lesson,
        lessonSession: session,
        message: 'ok',
        messageType: 'response'
      },
      lesson
    );

    expect(result.metadata?.action).toBe('stay');
    expect(result.metadata?.next_stage).toBeNull();
  });

  it('local fallback keeps vague concepts replies on stay before the soft-stuck threshold', () => {
    const state = createInitialState();
    const lesson = state.lessons[0];
    const session = makeMockSession(lesson, {
      currentStage: 'concepts',
      softStuckCount: 1
    });

    const result = buildLocalLessonChatResponse(
      {
        student: state.profile,
        learnerProfile: state.learnerProfile,
        lesson,
        lessonSession: session,
        message: 'maybe',
        messageType: 'response'
      },
      lesson
    );

    expect(result.metadata?.action).toBe('stay');
    expect(result.metadata?.next_stage).toBeNull();
  });

  it('local fallback does not return another stay after the concepts soft-stuck threshold', () => {
    const state = createInitialState();
    const lesson = state.lessons[0];
    const session = makeMockSession(lesson, {
      currentStage: 'concepts',
      softStuckCount: 2
    });

    const result = buildLocalLessonChatResponse(
      {
        student: state.profile,
        learnerProfile: state.learnerProfile,
        lesson,
        lessonSession: session,
        message: 'ok',
        messageType: 'response'
      },
      lesson
    );

    expect(result.metadata?.action).not.toBe('stay');
    expect(result.metadata?.action).toBe('advance');
    expect(result.metadata?.next_stage).toBe('construction');
  });

  it('local fallback turns Help me start into a scaffold without a fresh bottom question', () => {
    const state = createInitialState();
    const lesson = state.lessons[0]!;
    const session = makeMockSession(lesson, {
      currentStage: 'practice',
      messages: [
        {
          id: 'assistant-practice-question',
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

    const result = buildLocalLessonChatResponse(
      {
        student: state.profile,
        learnerProfile: state.learnerProfile,
        lesson,
        lessonSession: session,
        message: 'Help me start this practice question with the first move only.',
        messageType: 'response',
        supportIntent: 'help_me_start'
      },
      lesson
    );

    expect(result.metadata?.action).toBe('stay');
    expect(result.metadata?.response_mode).toBe('support');
    expect(result.metadata?.support_intent).toBe('help_me_start');
    expect(result.displayContent).toContain('food, trade, shipbuilding');
    expect(result.displayContent).toContain('Start with one sentence that states the main idea');
    expect(result.displayContent).toContain('Try just that first move now.');
    expect(result.displayContent).not.toContain('Identify the rule, clue, category, or quantity');
  });

  it('local fallback narrows multi-part examples questions to the first concrete part when helping the learner start', () => {
    const state = createInitialState();
    const lesson = state.lessons[0]!;
    const session = makeMockSession(lesson, {
      currentStage: 'examples',
      messages: [
        {
          id: 'assistant-examples-question',
          role: 'assistant',
          type: 'teaching',
          content:
            "You've captured the essence of how Ancient Egypt functioned beautifully!\n\nNow, let’s connect this to the bigger picture. How do you think these elements would impact the daily lives of the people living in Ancient Egypt? What do you think they valued most based on these components?",
          stage: 'examples',
          timestamp: new Date().toISOString(),
          metadata: null
        }
      ]
    });

    const result = buildLocalLessonChatResponse(
      {
        student: state.profile,
        learnerProfile: state.learnerProfile,
        lesson,
        lessonSession: session,
        message: 'Help me start reading this example.',
        messageType: 'response',
        supportIntent: 'help_me_start'
      },
      lesson
    );

    expect(result.displayContent).toContain('Answer the first part only.');
    expect(result.displayContent).toContain('Choose one element already mentioned above');
    expect(result.displayContent).toContain('Try just that first move now.');
  });

  // ─── Concept card clarification via fallback ─────────────────────────────

  it('concept card question returns stay action when concept is found in keyConcepts', () => {
    const lesson = buildDynamicLessonFromTopic({
      subjectId: 'subject-geo',
      subjectName: 'Geography',
      grade: 'Grade 10',
      topicTitle: 'Climate Zones',
      topicDescription: 'Types of climate zones.',
      curriculumReference: 'CAPS · Grade 10 · Geography'
    });
    // Inject a known concept name
    lesson.keyConcepts = [
      {
        name: 'Impact on Ecosystems',
        summary: 'How climate affects ecosystems.',
        detail: 'Detailed explanation of ecosystem impact.',
        example: 'Example of ecosystem impact.'
      }
    ];
    const session = makeMockSession(lesson, { currentStage: 'concepts' });
    const message = '[CONCEPT: Impact on Ecosystems]\n[STUDENT_HAS_READ: How climate affects ecosystems. Detailed explanation.]\nCan you explain this differently?';

    const result = buildLocalLessonChatResponse(
      { student: { id: 's1', fullName: 'Test', email: '', role: 'student', grade: 'Grade 10', gradeId: 'grade-10', curriculum: 'CAPS', curriculumId: 'caps', country: 'ZA', countryId: 'za', term: 'Term 1', schoolYear: '2026', recommendedStartSubjectId: null, recommendedStartSubjectName: null },
        learnerProfile: createDefaultLearnerProfile('s1'),
        lesson, lessonSession: session, message, messageType: 'question' },
      lesson
    );

    expect(result.metadata?.action).toBe('stay');
    expect(result.displayContent).toContain('Impact on Ecosystems');
  });

  it('concept card question returns stay (not side_thread) when concept is NOT in keyConcepts but STUDENT_HAS_READ is present', () => {
    const lesson = buildDynamicLessonFromTopic({
      subjectId: 'subject-geo',
      subjectName: 'Geography',
      grade: 'Grade 10',
      topicTitle: 'Climate Zones',
      topicDescription: 'Types of climate zones.',
      curriculumReference: 'CAPS · Grade 10 · Geography'
    });
    // keyConcepts has generic names — concept name won't match
    const session = makeMockSession(lesson, { currentStage: 'concepts' });
    const message = '[CONCEPT: Impact on Ecosystems and Human Life]\n[STUDENT_HAS_READ: Plants and animals depend on stable climates. Rising sea levels threaten coastal communities.]\nCan you explain this differently?';

    const result = buildLocalLessonChatResponse(
      { student: { id: 's1', fullName: 'Test', email: '', role: 'student', grade: 'Grade 10', gradeId: 'grade-10', curriculum: 'CAPS', curriculumId: 'caps', country: 'ZA', countryId: 'za', term: 'Term 1', schoolYear: '2026', recommendedStartSubjectId: null, recommendedStartSubjectName: null },
        learnerProfile: createDefaultLearnerProfile('s1'),
        lesson, lessonSession: session, message, messageType: 'question' },
      lesson
    );

    expect(result.metadata?.action).toBe('stay');
    expect(result.displayContent).toContain('Impact on Ecosystems and Human Life');
  });
});
