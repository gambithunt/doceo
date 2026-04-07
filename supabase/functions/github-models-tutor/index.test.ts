import { assertEquals } from 'jsr:@std/assert';
import {
  buildRevisionPackSystemPrompt,
  buildRevisionPackUserPrompt,
  parseRevisionPackResponse
} from './revision-pack.ts';

Deno.test('parseRevisionPackResponse returns null for empty string', () => {
  const request = {} as any; // Mock request
  const result = parseRevisionPackResponse('', request);
  assertEquals(result, null);
});

Deno.test('parseRevisionPackResponse returns null for JSON missing questions', () => {
  const request = {} as any;
  const content = JSON.stringify({ sessionTitle: 'Test', sessionRecommendations: [] });
  const result = parseRevisionPackResponse(content, request);
  assertEquals(result, null);
});

Deno.test('parseRevisionPackResponse returns null for questions missing helpLadder.nudge', () => {
  const request = {} as any;
  const content = JSON.stringify({
    sessionTitle: 'Test',
    sessionRecommendations: [],
    questions: [{
      id: '1',
      revisionTopicId: 'topic1',
      prompt: 'What is 2+2?',
      expectedSkills: [],
      misconceptionTags: [],
      helpLadder: {} // Missing nudge
    }]
  });
  const result = parseRevisionPackResponse(content, request);
  assertEquals(result, null);
});

Deno.test('parseRevisionPackResponse returns valid payload for well-formed JSON', () => {
  const request = {} as any;
  const content = JSON.stringify({
    sessionTitle: 'Test Session',
    sessionRecommendations: ['Focus on basics'],
    questions: [{
      id: 'rq-1',
      revisionTopicId: 'topic1',
      questionType: 'recall',
      prompt: 'What is 2+2?',
      expectedSkills: ['basic arithmetic'],
      misconceptionTags: [],
      difficulty: 'foundation',
      helpLadder: {
        nudge: 'Think about addition.',
        hint: '2 plus 2 is 4.',
        workedStep: '2 + 2 = 4',
        miniReteach: 'Addition combines numbers.',
        lessonRefer: 'Review addition basics.'
      },
      transferPrompt: null
    }]
  });
  const result = parseRevisionPackResponse(content, request);
  assertEquals(result?.sessionTitle, 'Test Session');
  assertEquals(result?.questions.length, 1);
});

Deno.test('buildRevisionPackUserPrompt includes all topic lessonSessionId values', () => {
  const request = {
    student: {
      fullName: 'Test Student',
      grade: 'Grade 6',
      curriculum: 'CAPS',
      country: 'South Africa',
      term: 'Term 1',
      schoolYear: '2026'
    } as any,
    learnerProfile: {
      quiz_performance: 0.8,
      step_by_step: 0.7,
      needs_repetition: 0.5,
      concepts_struggled_with: [],
      concepts_excelled_at: [],
      total_sessions: 10
    } as any,
    topics: [
      { lessonSessionId: 'session1', subject: 'Math', topicTitle: 'Addition', curriculumReference: 'CAPS', confidenceScore: 0.8, retentionStability: 0.9, forgettingVelocity: 0.1, misconceptionSignals: [], calibration: {} as any },
      { lessonSessionId: 'session2', subject: 'Math', topicTitle: 'Subtraction', curriculumReference: 'CAPS', confidenceScore: 0.7, retentionStability: 0.8, forgettingVelocity: 0.2, misconceptionSignals: [], calibration: {} as any }
    ],
    mode: 'deep_revision' as const,
    source: 'do_today' as const,
    recommendationReason: 'Due today',
    targetQuestionCount: 5
  };
  const result = buildRevisionPackUserPrompt(request);
  const parsed = JSON.parse(result);
  assertEquals(parsed.topics[0].lessonSessionId, 'session1');
  assertEquals(parsed.topics[1].lessonSessionId, 'session2');
});

Deno.test('buildRevisionPackSystemPrompt contains the JSON schema description', () => {
  const prompt = buildRevisionPackSystemPrompt();
  assertEquals(prompt.includes('sessionTitle: string'), true);
  assertEquals(prompt.includes('questions: RevisionQuestion[]'), true);
  assertEquals(prompt.includes('helpLadder: { nudge, hint, workedStep, miniReteach, lessonRefer }'), true);
});