import { describe, expect, it } from 'vitest';
import { deriveDashboardHeroState } from '$lib/components/dashboard-hero';
import type {
  DashboardTopicDiscoverySuggestion,
  LessonSession,
  Subject
} from '$lib/types';

function createSession(overrides: Partial<LessonSession> = {}): LessonSession {
  return {
    id: 'lesson-session-1',
    studentId: 'student-1',
    lessonId: 'lesson-1',
    subjectId: 'subject-1',
    subject: 'Mathematics',
    topicId: 'topic-1',
    topicTitle: 'Number patterns',
    topicDescription: 'Work with linear number patterns.',
    curriculumReference: 'CAPS Grade 6',
    matchedSection: 'Patterns and relationships',
    currentStage: 'orientation',
    stagesCompleted: [],
    messages: [],
    questionCount: 0,
    reteachCount: 0,
    confidenceScore: 0.5,
    needsTeacherReview: false,
    stuckConcept: null,
    startedAt: '2026-03-23T08:00:00.000Z',
    lastActiveAt: '2026-03-23T08:00:00.000Z',
    completedAt: null,
    status: 'active',
    profileUpdates: [],
    ...overrides
  };
}

function createSuggestion(
  overrides: Partial<DashboardTopicDiscoverySuggestion> = {}
): DashboardTopicDiscoverySuggestion {
  return {
    topicSignature: 'subject-1::caps::grade-6::equivalent fractions',
    topicLabel: 'Equivalent Fractions',
    nodeId: 'graph-topic-fractions',
    source: 'graph_existing',
    rank: 1,
    reason: 'Strong match for your current path.',
    sampleSize: 4,
    thumbsUpCount: 3,
    thumbsDownCount: 0,
    completionRate: 0.78,
    freshness: 'stable',
    feedback: null,
    feedbackPending: false,
    ...overrides
  };
}

function createSubject(overrides: Partial<Subject> = {}): Subject {
  return {
    id: 'subject-1',
    name: 'Mathematics',
    topics: [],
    ...overrides
  };
}

describe('deriveDashboardHeroState', () => {
  it('returns resume mission when an active session exists even if discovery suggestions are available', () => {
    const currentSession = createSession();
    const selectedSubject = createSubject();
    const firstSuggestion = createSuggestion();

    const hero = deriveDashboardHeroState({
      currentSession,
      selectedSubject,
      discoveryTopics: [firstSuggestion],
      summary: {
        completedLessons: 2,
        totalLessons: 3,
        averageMastery: 74
      }
    });

    expect(hero.mode).toBe('resume');
    if (hero.mode !== 'resume') {
      throw new Error(`Expected resume hero, received ${hero.mode}`);
    }
    expect(hero.session).toBe(currentSession);
    expect(hero.kicker).toBe('Current Mission');
    expect(hero.title).toBe('Number patterns');
    expect(hero.primaryCtaLabel).toBe('Resume →');
  });

  it('returns recommended next mission when there is no active session and discovery suggestions exist', () => {
    const selectedSubject = createSubject({ name: 'Physical Sciences' });
    const firstSuggestion = createSuggestion({
      topicLabel: 'Forces and Motion',
      reason: 'A strong next step for your current subject focus.'
    });

    const hero = deriveDashboardHeroState({
      currentSession: null,
      selectedSubject,
      discoveryTopics: [firstSuggestion],
      summary: {
        completedLessons: 1,
        totalLessons: 1,
        averageMastery: 81
      }
    });

    expect(hero.mode).toBe('recommended');
    if (hero.mode !== 'recommended') {
      throw new Error(`Expected recommended hero, received ${hero.mode}`);
    }
    expect(hero.suggestion).toBe(firstSuggestion);
    expect(hero.kicker).toBe('Recommended Next Mission');
    expect(hero.title).toBe('Forces and Motion');
    expect(hero.primaryCtaLabel).toBe('Start mission');
    expect(hero.secondaryCtaLabel).toBe('Show other options');
    expect(hero.recommendationReason).toBe('A strong next step for your current subject focus.');
  });

  it('returns guided start when there is no active session and no usable discovery suggestion exists', () => {
    const hero = deriveDashboardHeroState({
      currentSession: null,
      selectedSubject: createSubject({ name: 'History' }),
      discoveryTopics: [],
      summary: {
        completedLessons: 0,
        totalLessons: 0,
        averageMastery: 0
      }
    });

    expect(hero).toMatchObject({
      mode: 'guided_start',
      kicker: 'Start Your Next Mission',
      title: 'Pick a topic to begin',
      primaryCtaLabel: 'Explore topics'
    });
  });

  it('emits stable copy fields for each mode without requiring the component to reconstruct them', () => {
    const resumeHero = deriveDashboardHeroState({
      currentSession: createSession({ topicTitle: 'Fractions' }),
      selectedSubject: createSubject(),
      discoveryTopics: [createSuggestion()],
      summary: {
        completedLessons: 3,
        totalLessons: 4,
        averageMastery: 76
      }
    });

    const recommendedHero = deriveDashboardHeroState({
      currentSession: null,
      selectedSubject: createSubject(),
      discoveryTopics: [createSuggestion({ topicLabel: 'Ratio Tables' })],
      summary: {
        completedLessons: 3,
        totalLessons: 4,
        averageMastery: 76
      }
    });

    const guidedHero = deriveDashboardHeroState({
      currentSession: null,
      selectedSubject: createSubject(),
      discoveryTopics: [],
      summary: {
        completedLessons: 3,
        totalLessons: 4,
        averageMastery: 76
      }
    });

    expect(resumeHero.supportingLine.length).toBeGreaterThan(0);
    expect(recommendedHero.supportingLine.length).toBeGreaterThan(0);
    expect(guidedHero.supportingLine.length).toBeGreaterThan(0);
    expect(resumeHero.primaryCtaLabel).toBe('Resume →');
    expect(recommendedHero.primaryCtaLabel).toBe('Start mission');
    expect(guidedHero.primaryCtaLabel).toBe('Explore topics');
  });
});
