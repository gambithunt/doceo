import { describe, expect, it } from 'vitest';
import {
  applyLessonAssistantResponse,
  buildDynamicLessonFromTopic,
  buildDynamicQuestionsForLesson,
  buildLocalLessonChatResponse,
  calculateNextRevisionInterval,
  classifyLessonMessage,
  createDefaultLearnerProfile,
  parseDoceoMeta,
  stripDoceoMeta,
  updateLearnerProfile
} from '$lib/lesson-system';
import { createInitialState, normalizeAppState } from '$lib/data/platform';

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
    const lessonSession = state.lessonSessions[0];
    const updated = applyLessonAssistantResponse(lessonSession, {
      id: 'assistant-1',
      role: 'assistant',
      type: 'feedback',
      content: 'Good. Let us move on.',
      stage: 'overview',
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
    expect(updated.stagesCompleted).toContain('overview');
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

    expect(normalized.lessonSessions.length).toBeGreaterThan(0);
    expect(normalized.learnerProfile.studentId).toBe(initial.profile.id);
  });

  it('builds a lesson around the exact chosen subject and topic', () => {
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
    expect(lesson.overview.body.toLowerCase()).toContain('verbs');
    expect(lesson.deeperExplanation.body.toLowerCase()).toContain('verbs');
    expect(lesson.example.body.toLowerCase()).toContain('verbs');
  });

  // T1.2: detailedSteps is distinct from deeperExplanation
  it('detail stage has content distinct from concepts stage', () => {
    const lesson = buildDynamicLessonFromTopic({
      subjectId: 'subject-math',
      subjectName: 'Mathematics',
      grade: 'Grade 6',
      topicTitle: 'Fractions',
      topicDescription: 'Adding and subtracting fractions with unlike denominators.',
      curriculumReference: 'CAPS · Grade 6 · Mathematics'
    });

    expect(lesson.detailedSteps).toBeDefined();
    expect(lesson.detailedSteps!.body).not.toBe(lesson.deeperExplanation.body);
    expect(lesson.detailedSteps!.body.toLowerCase()).toContain('fractions');
  });

  // T1.3: fallback question reply must not echo student message
  it('fallback question reply does not echo the student message text', () => {
    const state = createInitialState();
    const lessonSession = state.lessonSessions[0];
    const lesson = state.lessons.find((l) => l.id === lessonSession.lessonId) ?? state.lessons[0];
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
      ...state.lessonSessions[0],
      id: `session-${i}`
    }));
    const testState = { ...state, lessonSessions: sessions };
    const serialized = JSON.stringify(testState);
    // "lessonPlan" must not appear as a key inside any session object
    // (it may still be in state.lessons but not embedded per-session)
    expect(serialized).not.toContain('"lessonPlan"');
  });
});
