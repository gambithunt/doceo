import { describe, expect, it } from 'vitest';
import { buildFallbackTopicShortlist } from '$lib/ai/topic-shortlist';

describe('topic shortlist', () => {
  it('preserves the learner topic as the first shortlist option', () => {
    const response = buildFallbackTopicShortlist({
      studentId: 'student-1',
      studentName: 'Delon',
      country: 'South Africa',
      curriculum: 'CAPS',
      grade: 'Grade 6',
      subject: 'English Home Language',
      term: 'Term 2',
      year: '2026',
      studentInput: 'verbs',
      availableTopics: [
        {
          topicId: 'topic-1',
          topicName: 'Writing foundations',
          subtopicId: 'subtopic-1',
          subtopicName: 'Complete sentences',
          lessonId: 'lesson-1',
          lessonTitle: 'Sentence Structure'
        }
      ]
    });

    expect(response.subtopics[0]?.title).toBe('Verbs');
    expect(response.subtopics[0]?.description.toLowerCase()).toContain('verbs');
  });
});
