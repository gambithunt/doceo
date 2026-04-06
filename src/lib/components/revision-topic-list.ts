import type { AppState, RevisionPlan, RevisionTopic } from '$lib/types';
import type { RevisionRecommendation, RevisionHomeModel } from '$lib/revision/ranking';

export interface TopicListItem {
  topic: RevisionTopic;
  subjectColor: string;
  confidencePercent: number;
  dueLabel: string;
  suggestedMode: RevisionRecommendation['suggestedMode'];
  recommendation: RevisionRecommendation | null;
}

/**
 * Sort revision topics by lastActiveAt descending (most recent lesson first),
 * then by ranking priority from the home model.
 */
export function sortTopicsForList(
  topics: RevisionTopic[],
  homeModel: RevisionHomeModel,
  lessonSessions: AppState['lessonSessions']
): TopicListItem[] {
  const priorityMap = new Map<string, RevisionRecommendation>();
  for (const rec of [...homeModel.doToday, ...homeModel.focusWeaknesses]) {
    if (!priorityMap.has(rec.topic.lessonSessionId)) {
      priorityMap.set(rec.topic.lessonSessionId, rec);
    }
  }
  if (homeModel.hero) {
    priorityMap.set(homeModel.hero.topic.lessonSessionId, homeModel.hero);
  }

  const sessionMap = new Map<string, string>();
  for (const session of lessonSessions) {
    sessionMap.set(session.id, session.lastActiveAt);
  }

  const sorted = topics.slice().sort((a, b) => {
    const aTime = sessionMap.get(a.lessonSessionId) ?? '';
    const bTime = sessionMap.get(b.lessonSessionId) ?? '';

    // Most recent first
    if (aTime && bTime) {
      const diff = new Date(bTime).getTime() - new Date(aTime).getTime();
      if (diff !== 0) return diff;
    }
    if (aTime && !bTime) return -1;
    if (!aTime && bTime) return 1;

    // Then by ranking priority
    const aPriority = priorityMap.get(a.lessonSessionId)?.priority ?? 0;
    const bPriority = priorityMap.get(b.lessonSessionId)?.priority ?? 0;
    return bPriority - aPriority;
  });

  return sorted.map((topic) => {
    const rec = priorityMap.get(topic.lessonSessionId) ?? null;
    return {
      topic,
      subjectColor: subjectColorClass(topic.subject),
      confidencePercent: Math.round(topic.confidenceScore * 100),
      dueLabel: formatDueLabel(topic.nextRevisionAt),
      suggestedMode: rec?.suggestedMode ?? 'deep_revision',
      recommendation: rec
    };
  });
}

export function subjectColorClass(name: string): string {
  const n = (name ?? '').toLowerCase();
  if (n.includes('math')) return 'blue';
  if (n.includes('physics')) return 'yellow';
  if (n.includes('chemistry')) return 'orange';
  if (n.includes('biology') || n.includes('life')) return 'green';
  if (n.includes('english')) return 'purple';
  if (n.includes('history') || n.includes('social')) return 'orange';
  if (n.includes('accounting')) return 'blue';
  if (n.includes('economics')) return 'green';
  if (n.includes('afrikaans')) return 'red';
  if (n.includes('art')) return 'purple';
  if (n.includes('business')) return 'orange';
  if (n.includes('geography')) return 'green';
  return 'blue';
}

export type TopicFilter = 'all' | 'due_today' | 'weak' | 'exam';

export interface TopicFilterChip {
  id: TopicFilter;
  label: string;
  count: number;
}

export function buildTopicFilterChips(
  topics: RevisionTopic[],
  activePlan: RevisionPlan | null
): TopicFilterChip[] {
  const now = Date.now();

  const dueTodayCount = topics.filter((t) => new Date(t.nextRevisionAt).getTime() <= now).length;
  const weakCount = topics.filter((t) => t.confidenceScore < 0.55).length;

  let examCount = 0;
  if (activePlan) {
    const planTitles = new Set(activePlan.topics.map((t) => t.trim().toLowerCase()));
    examCount = topics.filter(
      (t) => t.subjectId === activePlan.subjectId && planTitles.has(t.topicTitle.trim().toLowerCase())
    ).length;
  }

  return [
    { id: 'all', label: 'All', count: topics.length },
    { id: 'due_today', label: 'Due today', count: dueTodayCount },
    { id: 'weak', label: 'Weak', count: weakCount },
    { id: 'exam', label: 'Exam topics', count: examCount }
  ];
}

export function filterTopicListItems(
  items: TopicListItem[],
  filter: TopicFilter,
  activePlan: RevisionPlan | null
): TopicListItem[] {
  if (filter === 'all') return items;

  if (filter === 'due_today') {
    const now = Date.now();
    return items.filter((item) => new Date(item.topic.nextRevisionAt).getTime() <= now);
  }

  if (filter === 'weak') {
    return items.filter((item) => item.topic.confidenceScore < 0.55);
  }

  if (filter === 'exam') {
    if (!activePlan) return [];
    const planTitles = new Set(activePlan.topics.map((t) => t.trim().toLowerCase()));
    return items.filter(
      (item) =>
        item.topic.subjectId === activePlan.subjectId &&
        planTitles.has(item.topic.topicTitle.trim().toLowerCase())
    );
  }

  return items;
}

/**
 * Detect the "just completed" topic — matched by activeLessonSessionId.
 * Returns the lessonSessionId or null.
 */
export function findJustCompletedTopicId(
  topics: RevisionTopic[],
  activeLessonSessionId: string | null,
  _lessonSessions: AppState['lessonSessions']
): string | null {
  if (!activeLessonSessionId) return null;
  const match = topics.find((t) => t.lessonSessionId === activeLessonSessionId);
  return match ? match.lessonSessionId : null;
}

/**
 * Filter topic list items by title substring match (case-insensitive).
 */
export function searchTopics(items: TopicListItem[], query: string): TopicListItem[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return items;
  return items.filter((item) => item.topic.topicTitle.toLowerCase().includes(trimmed));
}

export function formatDueLabel(dateValue: string): string {
  const dueDate = new Date(dateValue);
  const now = new Date();
  const dayMs = 86400000;
  const diff = Math.ceil((dueDate.getTime() - now.getTime()) / dayMs);

  if (diff <= 0) {
    return diff < 0 ? `Overdue by ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'}` : 'Due today';
  }

  if (diff === 1) {
    return 'Due tomorrow';
  }

  return `Due in ${diff} days`;
}
