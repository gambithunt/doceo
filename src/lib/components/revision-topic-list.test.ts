import { describe, it, expect } from 'vitest';
import {
  sortTopicsForList,
  subjectColorClass,
  formatDueLabel,
  buildTopicFilterChips,
  filterTopicListItems,
  findJustCompletedTopicId,
  searchTopics,
  type TopicFilter,
  type TopicFilterChip,
  type TopicListItem
} from './revision-topic-list';
import type { RevisionTopic, RevisionPlan } from '$lib/types';
import type { RevisionHomeModel } from '$lib/revision/ranking';

function makeTopic(overrides: Partial<RevisionTopic> & { lessonSessionId: string; topicTitle: string }): RevisionTopic {
  return {
    subjectId: 'subj-1',
    subject: 'Mathematics',
    curriculumReference: 'Mathematics · Algebra',
    confidenceScore: 0.6,
    previousIntervalDays: 3,
    nextRevisionAt: new Date(Date.now() + 86400000).toISOString(),
    lastReviewedAt: null,
    retentionStability: 0.7,
    forgettingVelocity: 0.3,
    misconceptionSignals: [],
    calibration: {
      attempts: 2,
      averageSelfConfidence: 0.7,
      averageCorrectness: 0.65,
      confidenceGap: 0.05,
      overconfidenceCount: 0,
      underconfidenceCount: 0
    },
    ...overrides
  };
}

function makeHomeModel(overrides?: Partial<RevisionHomeModel>): RevisionHomeModel {
  return {
    hero: null,
    doToday: [],
    focusWeaknesses: [],
    nearestExam: null,
    ...overrides
  };
}

describe('subjectColorClass', () => {
  it('returns blue for Mathematics', () => {
    expect(subjectColorClass('Mathematics')).toBe('blue');
  });

  it('returns yellow for Physics', () => {
    expect(subjectColorClass('Physics')).toBe('yellow');
  });

  it('returns purple for English', () => {
    expect(subjectColorClass('English Home Language')).toBe('purple');
  });

  it('returns green for Life Sciences', () => {
    expect(subjectColorClass('Life Sciences')).toBe('green');
  });

  it('returns blue as default for unknown subjects', () => {
    expect(subjectColorClass('Unknown Subject')).toBe('blue');
  });
});

describe('formatDueLabel', () => {
  it('returns "Due today" for a date that is now', () => {
    const now = new Date();
    expect(formatDueLabel(now.toISOString())).toBe('Due today');
  });

  it('returns "Due tomorrow" for a date 1 day ahead', () => {
    const tomorrow = new Date(Date.now() + 86400000 * 0.8);
    expect(formatDueLabel(tomorrow.toISOString())).toBe('Due tomorrow');
  });

  it('returns "Due in N days" for future dates', () => {
    const future = new Date(Date.now() + 86400000 * 5);
    const label = formatDueLabel(future.toISOString());
    expect(label).toMatch(/^Due in \d+ days$/);
  });

  it('returns overdue label for past dates', () => {
    const past = new Date(Date.now() - 86400000 * 3);
    const label = formatDueLabel(past.toISOString());
    expect(label).toMatch(/^Overdue by \d+ days?$/);
  });
});

describe('sortTopicsForList', () => {
  it('sorts topics by lastActiveAt descending (most recent first)', () => {
    const topicA = makeTopic({ lessonSessionId: 'a', topicTitle: 'Algebra' });
    const topicB = makeTopic({ lessonSessionId: 'b', topicTitle: 'Geometry' });
    const topicC = makeTopic({ lessonSessionId: 'c', topicTitle: 'Trig' });

    const sessions = [
      { id: 'a', lastActiveAt: '2026-01-01T10:00:00Z' },
      { id: 'b', lastActiveAt: '2026-01-03T10:00:00Z' },
      { id: 'c', lastActiveAt: '2026-01-02T10:00:00Z' }
    ] as any[];

    const result = sortTopicsForList([topicA, topicB, topicC], makeHomeModel(), sessions);

    expect(result.map((r) => r.topic.topicTitle)).toEqual(['Geometry', 'Trig', 'Algebra']);
  });

  it('falls back to ranking priority when lastActiveAt is the same', () => {
    const topicA = makeTopic({ lessonSessionId: 'a', topicTitle: 'Algebra' });
    const topicB = makeTopic({ lessonSessionId: 'b', topicTitle: 'Geometry' });

    const sessions = [
      { id: 'a', lastActiveAt: '2026-01-01T10:00:00Z' },
      { id: 'b', lastActiveAt: '2026-01-01T10:00:00Z' }
    ] as any[];

    const homeModel = makeHomeModel({
      doToday: [
        { topic: topicB, priority: 100, reason: 'test', cues: [], suggestedMode: 'deep_revision', suggestedModeReason: '' },
        { topic: topicA, priority: 50, reason: 'test', cues: [], suggestedMode: 'quick_fire', suggestedModeReason: '' }
      ]
    });

    const result = sortTopicsForList([topicA, topicB], homeModel, sessions);
    expect(result[0].topic.topicTitle).toBe('Geometry');
    expect(result[1].topic.topicTitle).toBe('Algebra');
  });

  it('includes subjectColor, confidencePercent, dueLabel, and suggestedMode', () => {
    const topic = makeTopic({
      lessonSessionId: 'a',
      topicTitle: 'Algebra',
      subject: 'Mathematics',
      confidenceScore: 0.73
    });

    const sessions = [{ id: 'a', lastActiveAt: '2026-01-01T10:00:00Z' }] as any[];

    const result = sortTopicsForList([topic], makeHomeModel(), sessions);

    expect(result[0].subjectColor).toBe('blue');
    expect(result[0].confidencePercent).toBe(73);
    expect(result[0].dueLabel).toBeTruthy();
    expect(result[0].suggestedMode).toBe('deep_revision');
  });

  it('uses suggestedMode from recommendation when available', () => {
    const topic = makeTopic({ lessonSessionId: 'a', topicTitle: 'Algebra' });

    const sessions = [{ id: 'a', lastActiveAt: '2026-01-01T10:00:00Z' }] as any[];
    const homeModel = makeHomeModel({
      doToday: [
        { topic, priority: 80, reason: 'test', cues: [], suggestedMode: 'teacher_mode', suggestedModeReason: '' }
      ]
    });

    const result = sortTopicsForList([topic], homeModel, sessions);
    expect(result[0].suggestedMode).toBe('teacher_mode');
    expect(result[0].recommendation).not.toBeNull();
  });

  it('handles topics with no matching lesson session', () => {
    const topicA = makeTopic({ lessonSessionId: 'a', topicTitle: 'Algebra' });
    const topicB = makeTopic({ lessonSessionId: 'b', topicTitle: 'Geometry' });

    const sessions = [{ id: 'b', lastActiveAt: '2026-01-01T10:00:00Z' }] as any[];

    const result = sortTopicsForList([topicA, topicB], makeHomeModel(), sessions);
    // topicB has a session, topicA doesn't → topicB comes first
    expect(result[0].topic.topicTitle).toBe('Geometry');
    expect(result[1].topic.topicTitle).toBe('Algebra');
  });

  it('returns empty array when no topics', () => {
    const result = sortTopicsForList([], makeHomeModel(), []);
    expect(result).toEqual([]);
  });
});

function makeItem(overrides: Partial<TopicListItem> & { topicTitle: string }): TopicListItem {
  const { topicTitle, ...rest } = overrides;
  return {
    topic: makeTopic({
      lessonSessionId: topicTitle,
      topicTitle,
      ...rest.topic as any
    }),
    subjectColor: 'blue',
    confidencePercent: 60,
    dueLabel: 'Due today',
    suggestedMode: 'deep_revision',
    recommendation: null,
    ...rest
  };
}

function makePlan(overrides?: Partial<RevisionPlan>): RevisionPlan {
  return {
    id: 'plan-1',
    subjectId: 'subj-1',
    subjectName: 'Mathematics',
    examName: 'Final Exam',
    examDate: new Date(Date.now() + 86400000 * 30).toISOString(),
    topics: ['Algebra', 'Geometry'],
    planStyle: 'weak_topics',
    quickSummary: '',
    keyConcepts: [],
    examFocus: [],
    weaknessDetection: '',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

describe('buildTopicFilterChips', () => {
  it('returns All, Due today, Weak, and Exam chips', () => {
    const topics = [
      makeTopic({ lessonSessionId: 'a', topicTitle: 'Algebra', nextRevisionAt: new Date(Date.now() - 86400000).toISOString(), confidenceScore: 0.4, subjectId: 'subj-1' }),
      makeTopic({ lessonSessionId: 'b', topicTitle: 'Geometry', nextRevisionAt: new Date(Date.now() + 86400000 * 5).toISOString(), confidenceScore: 0.8, subjectId: 'subj-1' })
    ];
    const plan = makePlan({ topics: ['Algebra', 'Geometry'], subjectId: 'subj-1' });

    const chips = buildTopicFilterChips(topics, plan);

    expect(chips.map((c) => c.id)).toEqual(['all', 'due_today', 'weak', 'exam']);
    expect(chips[0].label).toBe('All');
    expect(chips[0].count).toBe(2);
  });

  it('counts due today topics correctly', () => {
    const topics = [
      makeTopic({ lessonSessionId: 'a', topicTitle: 'Algebra', nextRevisionAt: new Date(Date.now() - 86400000).toISOString() }),
      makeTopic({ lessonSessionId: 'b', topicTitle: 'Geometry', nextRevisionAt: new Date(Date.now() - 100).toISOString() }),
      makeTopic({ lessonSessionId: 'c', topicTitle: 'Trig', nextRevisionAt: new Date(Date.now() + 86400000 * 5).toISOString() })
    ];

    const chips = buildTopicFilterChips(topics, null);
    const dueChip = chips.find((c) => c.id === 'due_today')!;
    expect(dueChip.count).toBe(2);
  });

  it('counts weak topics correctly (confidenceScore < 0.55)', () => {
    const topics = [
      makeTopic({ lessonSessionId: 'a', topicTitle: 'Algebra', confidenceScore: 0.3 }),
      makeTopic({ lessonSessionId: 'b', topicTitle: 'Geometry', confidenceScore: 0.54 }),
      makeTopic({ lessonSessionId: 'c', topicTitle: 'Trig', confidenceScore: 0.7 })
    ];

    const chips = buildTopicFilterChips(topics, null);
    const weakChip = chips.find((c) => c.id === 'weak')!;
    expect(weakChip.count).toBe(2);
  });

  it('counts exam topics matching active plan', () => {
    const topics = [
      makeTopic({ lessonSessionId: 'a', topicTitle: 'Algebra', subjectId: 'subj-1' }),
      makeTopic({ lessonSessionId: 'b', topicTitle: 'Geometry', subjectId: 'subj-1' }),
      makeTopic({ lessonSessionId: 'c', topicTitle: 'Trig', subjectId: 'subj-1' })
    ];
    const plan = makePlan({ topics: ['Algebra', 'Trig'], subjectId: 'subj-1' });

    const chips = buildTopicFilterChips(topics, plan);
    const examChip = chips.find((c) => c.id === 'exam')!;
    expect(examChip.count).toBe(2);
  });

  it('exam count is 0 when no active plan', () => {
    const topics = [makeTopic({ lessonSessionId: 'a', topicTitle: 'Algebra' })];

    const chips = buildTopicFilterChips(topics, null);
    const examChip = chips.find((c) => c.id === 'exam')!;
    expect(examChip.count).toBe(0);
  });
});

describe('filterTopicListItems', () => {
  const duePast = new Date(Date.now() - 86400000).toISOString();
  const dueFuture = new Date(Date.now() + 86400000 * 5).toISOString();

  const itemA = makeItem({
    topicTitle: 'Algebra',
    topic: makeTopic({ lessonSessionId: 'a', topicTitle: 'Algebra', nextRevisionAt: duePast, confidenceScore: 0.4, subjectId: 'subj-1' })
  });
  const itemB = makeItem({
    topicTitle: 'Geometry',
    topic: makeTopic({ lessonSessionId: 'b', topicTitle: 'Geometry', nextRevisionAt: dueFuture, confidenceScore: 0.8, subjectId: 'subj-1' })
  });
  const itemC = makeItem({
    topicTitle: 'Trig',
    topic: makeTopic({ lessonSessionId: 'c', topicTitle: 'Trig', nextRevisionAt: dueFuture, confidenceScore: 0.5, subjectId: 'subj-2' })
  });

  const plan = makePlan({ topics: ['Algebra', 'Geometry'], subjectId: 'subj-1' });

  it('returns all items for "all" filter', () => {
    const result = filterTopicListItems([itemA, itemB, itemC], 'all', null);
    expect(result).toHaveLength(3);
  });

  it('returns only due topics for "due_today" filter', () => {
    const result = filterTopicListItems([itemA, itemB, itemC], 'due_today', null);
    expect(result).toHaveLength(1);
    expect(result[0].topic.topicTitle).toBe('Algebra');
  });

  it('returns only weak topics for "weak" filter', () => {
    const result = filterTopicListItems([itemA, itemB, itemC], 'weak', null);
    expect(result.map((r) => r.topic.topicTitle)).toEqual(['Algebra', 'Trig']);
  });

  it('returns only exam-plan matching topics for "exam" filter', () => {
    const result = filterTopicListItems([itemA, itemB, itemC], 'exam', plan);
    expect(result.map((r) => r.topic.topicTitle)).toEqual(['Algebra', 'Geometry']);
  });

  it('returns empty for "exam" filter with no plan', () => {
    const result = filterTopicListItems([itemA, itemB, itemC], 'exam', null);
    expect(result).toHaveLength(0);
  });
});

describe('findJustCompletedTopicId', () => {
  it('returns activeLessonSessionId when it matches a topic', () => {
    const topics = [
      makeTopic({ lessonSessionId: 'a', topicTitle: 'Algebra' }),
      makeTopic({ lessonSessionId: 'b', topicTitle: 'Geometry' })
    ];

    const result = findJustCompletedTopicId(topics, 'b', []);
    expect(result).toBe('b');
  });

  it('returns null when activeLessonSessionId is null', () => {
    const topics = [makeTopic({ lessonSessionId: 'a', topicTitle: 'Algebra' })];
    const sessions = [{ id: 'a', lastActiveAt: '2026-01-01T10:00:00Z', status: 'complete' }] as any[];

    const result = findJustCompletedTopicId(topics, null, sessions);
    expect(result).toBeNull();
  });

  it('returns null when activeLessonSessionId does not match any topic', () => {
    const topics = [makeTopic({ lessonSessionId: 'a', topicTitle: 'Algebra' })];

    const result = findJustCompletedTopicId(topics, 'nonexistent', []);
    expect(result).toBeNull();
  });

  it('returns null when topics array is empty', () => {
    const result = findJustCompletedTopicId([], 'a', []);
    expect(result).toBeNull();
  });
});

describe('searchTopics', () => {
  const items = [
    makeItem({ topicTitle: 'Algebra' }),
    makeItem({ topicTitle: 'Geometry' }),
    makeItem({ topicTitle: 'Algebraic Fractions' })
  ];

  it('returns all items when query is empty', () => {
    expect(searchTopics(items, '')).toHaveLength(3);
  });

  it('filters by title substring match (case-insensitive)', () => {
    const result = searchTopics(items, 'algebra');
    expect(result.map((r) => r.topic.topicTitle)).toEqual(['Algebra', 'Algebraic Fractions']);
  });

  it('returns empty when no match', () => {
    expect(searchTopics(items, 'calculus')).toHaveLength(0);
  });

  it('trims whitespace from query', () => {
    const result = searchTopics(items, '  geometry  ');
    expect(result).toHaveLength(1);
  });
});
