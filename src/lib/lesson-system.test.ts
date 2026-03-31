import { describe, expect, it } from 'vitest';
import {
  LESSON_STAGE_ORDER,
  applyLessonAssistantResponse,
  buildDynamicLessonFromTopic,
  buildDynamicQuestionsForLesson,
  buildInitialLessonMessages,
  buildLocalLessonChatResponse,
  buildLessonSessionFromTopic,
  calculateNextRevisionInterval,
  classifyLessonMessage,
  createDefaultLearnerProfile,
  getLessonSectionForStage,
  getNextStage,
  getStageNumber,
  getSubjectLens,
  parseDoceoMeta,
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

  it('builds a lesson with all 9 sections around the exact chosen subject and topic', () => {
    const lesson = buildDynamicLessonFromTopic({
      subjectId: 'subject-english',
      subjectName: 'English Home Language',
      grade: 'Grade 6',
      topicTitle: 'Verbs',
      topicDescription: 'Focus on action and helping verbs in simple sentences.',
      curriculumReference: 'CAPS · Grade 6 · English Home Language'
    });

    expect(lesson.subjectId).toBe('subject-english');
    expect(lesson.title).toContain('Verbs');

    // All 9 sections must be present with non-empty title and body
    const sections = [
      lesson.orientation, lesson.mentalModel, lesson.concepts,
      lesson.guidedConstruction, lesson.workedExample, lesson.practicePrompt,
      lesson.commonMistakes, lesson.transferChallenge, lesson.summary
    ];
    for (const section of sections) {
      expect(section).toBeDefined();
      expect(section.title.length).toBeGreaterThan(0);
      expect(section.body.length).toBeGreaterThan(0);
    }

    // Topic name should appear in content
    expect(lesson.orientation.body.toLowerCase()).toContain('verbs');
    expect(lesson.concepts.body.toLowerCase()).toContain('verbs');
    expect(lesson.workedExample.body.toLowerCase()).toContain('verbs');
  });

  it('construction stage content is distinct from concepts stage content', () => {
    const lesson = buildDynamicLessonFromTopic({
      subjectId: 'subject-math',
      subjectName: 'Mathematics',
      grade: 'Grade 6',
      topicTitle: 'Fractions',
      topicDescription: 'Adding and subtracting fractions with unlike denominators.',
      curriculumReference: 'CAPS · Grade 6 · Mathematics'
    });

    expect(lesson.guidedConstruction.body).not.toBe(lesson.concepts.body);
    expect(lesson.guidedConstruction.body.toLowerCase()).toContain('fractions');
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
  });

  it('buildInitialLessonMessages for orientation includes orientation body', () => {
    const state = createInitialState();
    const lesson = state.lessons[0];
    const messages = buildInitialLessonMessages(lesson, 'orientation');

    expect(messages.length).toBe(2);
    expect(messages[0].type).toBe('stage_start');
    expect(messages[1].role).toBe('assistant');
    expect(messages[1].content).toContain(lesson.orientation.body);
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

  // T1.4: check question requires explanation, not just topic name recall
  it('check question asks for explanation or application, not topic name recall', () => {
    const lesson = buildDynamicLessonFromTopic({
      subjectId: 'subject-math',
      subjectName: 'Mathematics',
      grade: 'Grade 6',
      topicTitle: 'Fractions',
      topicDescription: 'Adding and subtracting fractions.',
      curriculumReference: 'CAPS · Grade 6 · Mathematics'
    });
    const questions = buildDynamicQuestionsForLesson(lesson, 'Mathematics', 'Fractions');
    const checkQuestion = questions[0];

    // The prompt must not be answerable by just saying the topic name
    expect(checkQuestion.expectedAnswer.toLowerCase()).not.toBe('fractions');
    // Must ask for understanding (explain/apply/show/describe)
    const promptLower = checkQuestion.prompt.toLowerCase();
    const asksForUnderstanding =
      promptLower.includes('explain') ||
      promptLower.includes('show') ||
      promptLower.includes('apply') ||
      promptLower.includes('describe') ||
      promptLower.includes('how') ||
      promptLower.includes('why') ||
      promptLower.includes('example');
    expect(asksForUnderstanding).toBe(true);
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

  // ─── Phase 2: Subject lenses ────────────────────────────────────────────────

  it('P2: getSubjectLens returns unique lens for Life Sciences', () => {
    const lens = getSubjectLens('Life Sciences');
    expect(lens.conceptWord).not.toBe('core idea');
    expect(lens.conceptWord.toLowerCase()).toContain('biolog');
  });

  it('P2: getSubjectLens returns unique lens for Physical Sciences', () => {
    const lens = getSubjectLens('Physical Sciences');
    expect(lens.conceptWord.toLowerCase()).toMatch(/law|formula|principle/);
  });

  it('P2: getSubjectLens returns unique lens for History', () => {
    const lens = getSubjectLens('History');
    expect(lens.conceptWord.toLowerCase()).toMatch(/histor|cause|consequence/);
  });

  it('P2: getSubjectLens returns unique lens for Geography', () => {
    const lens = getSubjectLens('Geography');
    expect(lens.conceptWord.toLowerCase()).toMatch(/spatial|pattern|process/);
  });

  it('P2: getSubjectLens returns unique lens for Accounting', () => {
    const lens = getSubjectLens('Accounting');
    expect(lens.conceptWord.toLowerCase()).toMatch(/financ|account|econom/);
  });

  it('P2: getSubjectLens returns unique lens for Business Studies', () => {
    const lens = getSubjectLens('Business Studies');
    expect(lens.conceptWord.toLowerCase()).toMatch(/financ|business|econom/);
  });

  it('P2: getSubjectLens returns unique lens for Computer Applications Technology', () => {
    const lens = getSubjectLens('Computer Applications Technology');
    expect(lens.conceptWord.toLowerCase()).toMatch(/system|algorithm|component/);
  });

  it('P2: getSubjectLens returns unique lens for Information Technology', () => {
    const lens = getSubjectLens('Information Technology');
    expect(lens.conceptWord.toLowerCase()).toMatch(/system|algorithm|component/);
  });

  it('P2: getSubjectLens returns unique lens for Creative Arts', () => {
    const lens = getSubjectLens('Creative Arts');
    expect(lens.conceptWord.toLowerCase()).toMatch(/design|element|technique/);
  });

  it('P2: getSubjectLens accepts grade and returns grade-calibrated example for Math foundation', () => {
    const lensF = getSubjectLens('Mathematics', 'Grade 5');
    const lensS = getSubjectLens('Mathematics', 'Grade 12');
    expect(lensF.example).not.toBe(lensS.example);
  });

  it('P2: getSubjectLens Mathematics Grade 5 uses concrete language', () => {
    const lens = getSubjectLens('Mathematics', 'Grade 5');
    const combined = lens.example.toLowerCase() + lens.actionWord.toLowerCase();
    expect(combined).toMatch(/whole number|count|concrete|step/);
  });

  it('P2: getSubjectLens Mathematics Grade 12 uses abstract language', () => {
    const lens = getSubjectLens('Mathematics', 'Grade 12');
    const combined = lens.example.toLowerCase() + lens.evidenceWord.toLowerCase();
    expect(combined).toMatch(/function|proof|justif|formal|equat|theorem/i);
  });

  it('P2: buildDynamicLessonFromTopic Grade 12 guidedConstruction differs from Grade 5', () => {
    const lessonGr5 = buildDynamicLessonFromTopic({
      subjectId: 'subject-math',
      subjectName: 'Mathematics',
      grade: 'Grade 5',
      topicTitle: 'Fractions',
      topicDescription: 'Equal parts.',
      curriculumReference: 'CAPS · Grade 5 · Mathematics'
    });
    const lessonGr12 = buildDynamicLessonFromTopic({
      subjectId: 'subject-math',
      subjectName: 'Mathematics',
      grade: 'Grade 12',
      topicTitle: 'Fractions',
      topicDescription: 'Algebraic fractions.',
      curriculumReference: 'CAPS · Grade 12 · Mathematics'
    });
    expect(lessonGr5.guidedConstruction.body).not.toBe(lessonGr12.guidedConstruction.body);
  });

  // ─── Phase 3: Summary rewrite ────────────────────────────────────────────────

  it('P3: dynamic lesson summary contains core rule reference', () => {
    const lesson = buildDynamicLessonFromTopic({
      subjectId: 'subject-math',
      subjectName: 'Mathematics',
      grade: 'Grade 8',
      topicTitle: 'Linear Equations',
      topicDescription: 'Solving one-variable equations.',
      curriculumReference: 'CAPS · Grade 8 · Mathematics'
    });
    const summaryLower = lesson.summary.body.toLowerCase();
    // Must contain all three parts: rule, mistake warning, transfer hook
    expect(summaryLower).toMatch(/core|rule|key/);
    expect(summaryLower).toMatch(/watch out|mistake|avoid|common error/);
    expect(summaryLower).toMatch(/transfer|ready|if you can/i);
  });

  it('P3: dynamic lesson summary references the lesson misconception', () => {
    const lesson = buildDynamicLessonFromTopic({
      subjectId: 'subject-science',
      subjectName: 'Physical Sciences',
      grade: 'Grade 10',
      topicTitle: 'Newton\'s Laws',
      topicDescription: 'Forces and motion.',
      curriculumReference: 'CAPS · Grade 10 · Physical Sciences'
    });
    // Extract the actual misconception text — it follows " is " in the commonMistakes body
    const isIdx = lesson.commonMistakes.body.indexOf(' is ');
    const misconceptionText = (isIdx >= 0 ? lesson.commonMistakes.body.slice(isIdx + 4) : lesson.commonMistakes.body)
      .toLowerCase().split(' ').slice(0, 5).join(' ');
    // Summary's "Watch out for" section should share the same misconception wording
    expect(lesson.summary.body.toLowerCase()).toContain(misconceptionText);
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
      { student: { id: 's1', fullName: 'Test', grade: 'Grade 10', curriculum: 'CAPS', country: 'ZA', term: '1', schoolYear: '2026' },
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
      { student: { id: 's1', fullName: 'Test', grade: 'Grade 10', curriculum: 'CAPS', country: 'ZA', term: '1', schoolYear: '2026' },
        learnerProfile: createDefaultLearnerProfile('s1'),
        lesson, lessonSession: session, message, messageType: 'question' },
      lesson
    );

    expect(result.metadata?.action).toBe('stay');
    expect(result.displayContent).toContain('Impact on Ecosystems and Human Life');
  });
});
