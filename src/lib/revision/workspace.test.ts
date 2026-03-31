import { describe, expect, it } from 'vitest';
import { deriveRevisionWorkspaceMode } from '$lib/revision/workspace';
import type { ActiveRevisionSession } from '$lib/types';

function createSession(overrides: Partial<ActiveRevisionSession> = {}): ActiveRevisionSession {
  return {
    id: 'revision-session-1',
    revisionTopicId: 'topic-1',
    revisionTopicIds: ['topic-1'],
    mode: 'deep_revision',
    source: 'do_today',
    topicTitle: 'Fractions',
    recommendationReason: 'Due today',
    questions: [],
    questionIndex: 0,
    currentInterventionLevel: 'none',
    currentHelp: null,
    selfConfidenceHistory: [],
    lastTurnResult: null,
    status: 'active',
    startedAt: '2026-03-31T08:00:00.000Z',
    lastActiveAt: '2026-03-31T08:00:00.000Z',
    ...overrides
  };
}

describe('deriveRevisionWorkspaceMode', () => {
  it('returns home when there is no active revision session', () => {
    expect(deriveRevisionWorkspaceMode(null)).toBe('home');
  });

  it('returns session while the revision loop is active', () => {
    expect(deriveRevisionWorkspaceMode(createSession())).toBe('session');
  });

  it('returns summary once a revision loop has completed', () => {
    expect(deriveRevisionWorkspaceMode(createSession({ status: 'completed' }))).toBe('summary');
  });

  it('returns summary for lesson-handoff states as well', () => {
    expect(deriveRevisionWorkspaceMode(createSession({ status: 'escalated_to_lesson' }))).toBe('summary');
  });
});
