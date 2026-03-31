import type { RevisionHomeModel, RevisionRecommendation } from '$lib/revision/ranking';
import type { AppState, RevisionPlan, RevisionTopic } from '$lib/types';

export type RevisionFocusTab = 'do_today' | 'focus_weaknesses' | 'prepare_exam' | 'choose_topic';
export type RevisionFocusMatchKind = 'recommended' | 'plan_topic' | 'subject_fallback' | 'library';

export interface RevisionFocusItem {
  topic: RevisionTopic;
  recommendation: RevisionRecommendation | null;
  matchKind: RevisionFocusMatchKind;
}

export interface RevisionFocusTabOption {
  id: RevisionFocusTab;
  label: string;
  count: number;
}

export interface RevisionFocusPanel {
  title: string;
  summary: string;
  emptyTitle: string;
  emptyCopy: string;
  items: RevisionFocusItem[];
}

export interface RevisionFocusModel {
  defaultTab: RevisionFocusTab;
  tabs: RevisionFocusTabOption[];
  panels: Record<RevisionFocusTab, RevisionFocusPanel>;
}

function normalizeTitle(value: string): string {
  return value.trim().toLowerCase();
}

function toTimestamp(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function compareTopics(left: RevisionTopic, right: RevisionTopic): number {
  const dueComparison = toTimestamp(left.nextRevisionAt) - toTimestamp(right.nextRevisionAt);

  if (dueComparison !== 0) {
    return dueComparison;
  }

  const titleComparison = left.topicTitle.localeCompare(right.topicTitle);

  if (titleComparison !== 0) {
    return titleComparison;
  }

  return left.subject.localeCompare(right.subject);
}

function buildRecommendationMap(homeModel: RevisionHomeModel): Map<string, RevisionRecommendation> {
  const map = new Map<string, RevisionRecommendation>();

  if (homeModel.hero) {
    map.set(homeModel.hero.topic.lessonSessionId, homeModel.hero);
  }

  for (const item of [...homeModel.doToday, ...homeModel.focusWeaknesses]) {
    if (!map.has(item.topic.lessonSessionId) || (map.get(item.topic.lessonSessionId)?.priority ?? -1) < item.priority) {
      map.set(item.topic.lessonSessionId, item);
    }
  }

  return map;
}

function createFocusItem(
  topic: RevisionTopic,
  recommendations: Map<string, RevisionRecommendation>,
  matchKind: RevisionFocusMatchKind = 'recommended'
): RevisionFocusItem {
  return {
    topic,
    recommendation: recommendations.get(topic.lessonSessionId) ?? null,
    matchKind
  };
}

function sortPlanTopics(
  topics: RevisionTopic[],
  recommendations: Map<string, RevisionRecommendation>
): RevisionTopic[] {
  return topics.slice().sort((left, right) => {
    const leftPriority = recommendations.get(left.lessonSessionId)?.priority ?? -1;
    const rightPriority = recommendations.get(right.lessonSessionId)?.priority ?? -1;

    if (leftPriority !== rightPriority) {
      return rightPriority - leftPriority;
    }

    return compareTopics(left, right);
  });
}

function buildPrepareExamItems(
  state: AppState,
  activePlan: RevisionPlan | null,
  recommendations: Map<string, RevisionRecommendation>
): RevisionFocusItem[] {
  if (!activePlan) {
    return [];
  }

  const plannedTitles = new Set(activePlan.topics.map(normalizeTitle));
  const sameSubjectTopics = state.revisionTopics.filter((topic) => topic.subjectId === activePlan.subjectId);
  const matchingTopics = sameSubjectTopics.filter((topic) => plannedTitles.has(normalizeTitle(topic.topicTitle)));

  if (matchingTopics.length > 0) {
    return sortPlanTopics(matchingTopics, recommendations).map((topic) =>
      createFocusItem(topic, recommendations, 'plan_topic')
    );
  }

  return sortPlanTopics(sameSubjectTopics, recommendations).map((topic) =>
    createFocusItem(topic, recommendations, 'subject_fallback')
  );
}

export function deriveRevisionFocusModel(
  state: AppState,
  homeModel: RevisionHomeModel,
  activePlan: RevisionPlan | null,
  _now = new Date()
): RevisionFocusModel {
  const recommendations = buildRecommendationMap(homeModel);
  const doTodayItems = homeModel.doToday.map((item) => createFocusItem(item.topic, recommendations));
  const focusWeaknessItems = homeModel.focusWeaknesses.map((item) => createFocusItem(item.topic, recommendations));
  const prepareExamItems = buildPrepareExamItems(state, activePlan, recommendations);
  const chooseTopicItems = state.revisionTopics
    .slice()
    .sort(compareTopics)
    .map((topic) => createFocusItem(topic, recommendations, 'library'));

  const defaultTab: RevisionFocusTab =
    activePlan && prepareExamItems.length > 0
      ? 'prepare_exam'
      : doTodayItems.length > 0
        ? 'do_today'
        : focusWeaknessItems.length > 0
          ? 'focus_weaknesses'
          : chooseTopicItems.length > 0
            ? 'choose_topic'
            : 'do_today';

  return {
    defaultTab,
    tabs: [
      { id: 'do_today', label: 'Do Today', count: doTodayItems.length },
      { id: 'focus_weaknesses', label: 'Focus Weaknesses', count: focusWeaknessItems.length },
      { id: 'prepare_exam', label: 'Prepare For Exam', count: prepareExamItems.length },
      { id: 'choose_topic', label: 'Choose Topic', count: chooseTopicItems.length }
    ],
    panels: {
      do_today: {
        title: 'Best next revision moves',
        summary: 'Start with the highest-priority topics across due dates, weakness signals, and exam pressure.',
        emptyTitle: 'Nothing urgent right now',
        emptyCopy: 'When topics become due again, they will land here first.',
        items: doTodayItems
      },
      focus_weaknesses: {
        title: 'Topics that still feel unstable',
        summary: 'Use this lane when you want the biggest improvement per session, not just the next due item.',
        emptyTitle: 'No major weak spots right now',
        emptyCopy: 'Doceo will surface this list again when confidence, calibration, or retention starts slipping.',
        items: focusWeaknessItems
      },
      prepare_exam: {
        title: activePlan?.examName ? `${activePlan.examName} runway` : 'Exam preparation runway',
        summary: activePlan
          ? 'These are the topics from your active exam plan that deserve attention next.'
          : 'Build a plan to turn exam preparation into a clearer daily queue.',
        emptyTitle: activePlan ? 'No revision topics matched this plan yet' : 'No active exam plan yet',
        emptyCopy: activePlan
          ? 'Complete more lessons or adjust the plan topics to build a stronger exam runway.'
          : 'Create a revision plan and this lane will collect the plan topics for you.',
        items: prepareExamItems
      },
      choose_topic: {
        title: 'Jump into any topic',
        summary: 'Use the full queue when you already know the chapter or skill you want to attack.',
        emptyTitle: 'No topics available yet',
        emptyCopy: 'Finish a lesson first and Doceo will turn it into a revision topic here.',
        items: chooseTopicItems
      }
    }
  };
}
