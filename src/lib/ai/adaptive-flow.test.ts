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
