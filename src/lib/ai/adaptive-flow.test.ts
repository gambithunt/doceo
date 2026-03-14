import { describe, expect, it } from 'vitest';
import { createInitialState } from '$lib/data/platform';
import { buildSystemPrompt } from '$lib/ai/lesson-chat';
import { buildFallbackTopicShortlist } from '$lib/ai/topic-shortlist';

describe('adaptive flow helpers', () => {
  it('builds a lesson system prompt with student, lesson, and learner profile context', () => {
    const state = createInitialState();
    const prompt = buildSystemPrompt({
      student: state.profile,
      learnerProfile: state.learnerProfile,
      lessonSession: state.lessonSessions[0],
      message: 'I understand.',
      messageType: 'response'
    });

    expect(prompt).toContain(`Name: ${state.profile.fullName}`);
    expect(prompt).toContain(`Topic: ${state.lessonSessions[0].topicTitle}`);
    expect(prompt).toContain('Learner Profile:');
    expect(prompt).toContain(`Current Stage: ${state.lessonSessions[0].currentStage}`);
  });

  // T1.5: system prompt must include DOCEO_META schema with all required fields
  it('system prompt includes DOCEO_META JSON schema with all required fields', () => {
    const state = createInitialState();
    const prompt = buildSystemPrompt({
      student: state.profile,
      learnerProfile: state.learnerProfile,
      lessonSession: state.lessonSessions[0],
      message: 'I understand.',
      messageType: 'response'
    });

    // Must include the meta block format
    expect(prompt).toContain('DOCEO_META');
    // Must include all required fields
    expect(prompt).toContain('"action"');
    expect(prompt).toContain('"confidence_assessment"');
    expect(prompt).toContain('"next_stage"');
    expect(prompt).toContain('"reteach_style"');
    expect(prompt).toContain('"profile_update"');
    // Must include valid action values
    expect(prompt).toContain('advance');
    expect(prompt).toContain('reteach');
    expect(prompt).toContain('complete');
  });

  // T4.2: system prompt uses human-readable teaching instructions, not raw JSON dump
  it('system prompt uses readable teaching instructions for strong learner signals', () => {
    const state = createInitialState();
    // Give the learner a strong step-by-step preference
    const learnerProfile = {
      ...state.learnerProfile,
      step_by_step: 0.85,
      needs_repetition: 0.8,
      concepts_struggled_with: ['Fractions', 'Percentages', 'Decimals']
    };
    const prompt = buildSystemPrompt({
      student: state.profile,
      learnerProfile,
      lessonSession: state.lessonSessions[0],
      message: 'I understand.',
      messageType: 'response'
    });

    // Should include a human-readable instruction about step-by-step
    expect(prompt.toLowerCase()).toContain('step');
    // Should reference struggled concepts
    expect(prompt).toContain('Fractions');
  });

  it('returns a ranked topic shortlist from available topic options', () => {
    const state = createInitialState();
    const subject = state.curriculum.subjects[0];
    const result = buildFallbackTopicShortlist({
      studentId: state.profile.id,
      studentName: state.profile.fullName,
      country: state.profile.country,
      curriculum: state.profile.curriculum,
      grade: state.profile.grade,
      subject: subject.name,
      term: state.profile.term,
      year: state.profile.schoolYear,
      studentInput: 'number patterns',
      availableTopics: subject.topics.flatMap((topic) =>
        topic.subtopics.map((subtopic) => {
          const lessonId = subtopic.lessonIds[0];
          const lesson = state.lessons.find((item) => item.id === lessonId) ?? state.lessons[0];
          return {
            topicId: topic.id,
            topicName: topic.name,
            subtopicId: subtopic.id,
            subtopicName: subtopic.name,
            lessonId: lesson.id,
            lessonTitle: lesson.title
          };
        })
      )
    });

    expect(result.subtopics.length).toBeGreaterThan(0);
    expect(result.matchedSection.toLowerCase()).toContain('number');
  });
});
