import { describe, expect, it } from 'vitest';
import { createLessonChatBody } from '$lib/ai/lesson-chat';
import { createInitialState } from '$lib/data/platform';
import type { LessonMessage } from '$lib/types';

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

describe('lesson-chat', () => {
  // T3.5: AI message history is capped at 20
  it('caps message history sent to AI at 20 messages', () => {
    const state = createInitialState();
    const session = state.lessonSessions[0];
    // Create a session with 50 messages
    const longSession = {
      ...session,
      messages: Array.from({ length: 50 }, (_, i) => makeMessage(i))
    };

    const lesson = state.lessons.find((l) => l.id === session.lessonId) ?? state.lessons[0];
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
});
