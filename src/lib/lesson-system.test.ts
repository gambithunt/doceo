import { describe, expect, it } from 'vitest';
import {
  applyLessonAssistantResponse,
  buildDynamicLessonFromTopic,
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
});
