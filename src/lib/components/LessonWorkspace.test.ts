import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import { beforeAll, describe, expect, it } from 'vitest';
import LessonWorkspace from './LessonWorkspace.svelte';
import { createInitialState } from '$lib/data/platform';
import type { AppState, LessonMessage, LessonSession } from '$lib/types';

function createSession(overrides: Partial<LessonSession> = {}): LessonSession {
  return {
    id: 'lesson-session-1',
    studentId: 'student-1',
    lessonId: 'lesson-1',
    subjectId: 'subject-1',
    subject: 'Economics',
    topicId: 'topic-1',
    topicTitle: 'market structures',
    topicDescription: 'Learn how firms compete in different market structures.',
    curriculumReference: 'CAPS Grade 11',
    matchedSection: 'Microeconomics',
    currentStage: 'orientation',
    stagesCompleted: [],
    messages: [],
    questionCount: 0,
    reteachCount: 0,
    confidenceScore: 0.5,
    needsTeacherReview: false,
    stuckConcept: null,
    startedAt: '2026-04-16T05:00:00.000Z',
    lastActiveAt: '2026-04-16T05:00:00.000Z',
    completedAt: null,
    status: 'active',
    profileUpdates: [],
    ...overrides
  };
}

function createMessage(overrides: Partial<LessonMessage>): LessonMessage {
  return {
    id: crypto.randomUUID(),
    role: 'user',
    type: 'response',
    content: 'yes',
    stage: 'orientation',
    timestamp: '2026-04-16T05:00:00.000Z',
    metadata: null,
    ...overrides
  };
}

function renderWorkspace(messages: LessonMessage[]): AppState {
  const state = createInitialState();
  const session = createSession({ messages });

  const nextState: AppState = {
    ...state,
    lessonSessions: [session],
    ui: {
      ...state.ui,
      currentScreen: 'lesson',
      activeLessonSessionId: session.id
    }
  };

  render(LessonWorkspace, {
    props: {
      state: nextState
    }
  });

  return nextState;
}

describe('LessonWorkspace compact user replies', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLDivElement.prototype, 'scrollTo', {
      value: () => {},
      writable: true
    });
  });

  it('uses the compact reply bubble for short learner responses', () => {
    renderWorkspace([
      createMessage({
        content: 'yes eskom south africa'
      })
    ]);

    const bubble = screen.getByText('yes eskom south africa').closest('article');
    expect(bubble).toHaveClass('bubble', 'user', 'compact-reply');
  });

  it('does not use the compact reply bubble for learner questions', () => {
    renderWorkspace([
      createMessage({
        type: 'question',
        content: 'Why is Eskom a monopoly?'
      })
    ]);

    const bubble = screen.getByText('Why is Eskom a monopoly?').closest('article');
    expect(bubble).toHaveClass('bubble', 'user', 'question');
    expect(bubble).not.toHaveClass('compact-reply');
  });
});
