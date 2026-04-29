import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { render, screen, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import NotesLibraryView from './NotesLibraryView.svelte';
import { createInitialState } from '$lib/data/platform';
import type { AppState, LessonNote, LessonSession } from '$lib/types';

function createLessonSession(overrides: Partial<LessonSession> = {}): LessonSession {
  return {
    id: 'session-algebra-1',
    studentId: 'student-1',
    subjectId: 'math',
    subject: 'Mathematics',
    lessonId: 'lesson-algebra-1',
    topicId: 'linear-equations',
    topicTitle: 'Linear equations',
    topicDescription: 'Solving equations with one unknown.',
    curriculumReference: 'Grade 9 Algebra',
    matchedSection: 'Algebra',
    currentStage: 'concepts',
    stagesCompleted: ['orientation'],
    messages: [],
    questionCount: 0,
    reteachCount: 0,
    softStuckCount: 0,
    confidenceScore: 0.5,
    needsTeacherReview: false,
    stuckConcept: null,
    startedAt: '2026-04-27T08:00:00.000Z',
    lastActiveAt: '2026-04-27T08:20:00.000Z',
    completedAt: null,
    status: 'active',
    profileUpdates: [],
    ...overrides
  };
}

function createLessonNote(overrides: Partial<LessonNote> = {}): LessonNote {
  return {
    id: 'note-1',
    lessonSessionId: 'session-algebra-1',
    lessonId: 'lesson-algebra-1',
    topicTitle: 'Linear equations',
    subject: 'Mathematics',
    text: 'Move the constant term before dividing both sides.',
    sourceText: '2x + 3 = 11 means isolate the x term first.',
    conceptTitle: 'Inverse operations',
    createdAt: '2026-04-27T08:15:00.000Z',
    ...overrides
  };
}

function createState(overrides: Partial<AppState> = {}): AppState {
  return {
    ...createInitialState(),
    auth: {
      status: 'signed_in',
      error: null
    },
    onboarding: {
      ...createInitialState().onboarding,
      completed: true
    },
    ...overrides
  };
}

describe('NotesLibraryView', () => {
  it('renders persisted notes grouped by subject and topic with source context', () => {
    const state = createState({
      lessonSessions: [createLessonSession()],
      lessonNotes: [
        createLessonNote(),
        createLessonNote({
          id: 'note-2',
          lessonSessionId: 'session-bio-1',
          lessonId: 'lesson-bio-1',
          topicTitle: 'Cell structure',
          subject: 'Life Sciences',
          text: 'The nucleus controls cell activities.',
          sourceText: null,
          conceptTitle: 'Organelles',
          createdAt: '2026-04-26T09:00:00.000Z'
        })
      ]
    });

    render(NotesLibraryView, { props: { state } });

    const algebraGroup = screen.getByRole('region', { name: 'Mathematics: Linear equations' });
    expect(within(algebraGroup).getByText('Move the constant term before dividing both sides.')).toBeInTheDocument();
    expect(within(algebraGroup).getByText('Inverse operations')).toBeInTheDocument();
    expect(within(algebraGroup).getByText('2x + 3 = 11 means isolate the x term first.')).toBeInTheDocument();
    expect(within(algebraGroup).getByText('Saved Apr 27, 2026')).toBeInTheDocument();

    expect(screen.getByRole('region', { name: 'Life Sciences: Cell structure' })).toBeInTheDocument();
  });

  it('links a note back to its originating lesson when the session is still available', () => {
    const state = createState({
      lessonSessions: [createLessonSession()],
      lessonNotes: [createLessonNote()]
    });

    render(NotesLibraryView, { props: { state } });

    expect(screen.getByRole('link', { name: 'Open lesson' })).toHaveAttribute(
      'href',
      '/lesson/session-algebra-1'
    );
  });

  it('keeps notes visible without a lesson link when the originating session is unavailable', () => {
    const state = createState({
      lessonSessions: [],
      lessonNotes: [createLessonNote()]
    });

    render(NotesLibraryView, { props: { state } });

    expect(screen.getByText('Move the constant term before dividing both sides.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open lesson' })).not.toBeInTheDocument();
    expect(screen.getByText('Lesson unavailable')).toBeInTheDocument();
  });

  it('renders an empty state for learners with no notes', () => {
    render(NotesLibraryView, {
      props: {
        state: createState({
          lessonNotes: []
        })
      }
    });

    expect(screen.getByRole('heading', { name: 'No notes yet' })).toBeInTheDocument();
    expect(screen.getByText('Capture an idea during a lesson and it will appear here.')).toBeInTheDocument();
  });

  it('keeps the notes surface card-based for mobile layouts', () => {
    const source = readFileSync('src/lib/components/NotesLibraryView.svelte', 'utf8');

    expect(source).toContain('@media (max-width: 720px)');
    expect(source).toContain('.note-card');
    expect(source).not.toContain('<table');
  });
});
