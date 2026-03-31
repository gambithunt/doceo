import { getStageLabel } from '$lib/lesson-system';
import { deriveRevisionProgressModel } from '$lib/revision/progress';
import type { AppState, LearnerProfile, LessonSession, RevisionAttemptRecord, RevisionTopic } from '$lib/types';

export type ProgressTone = 'blue' | 'green' | 'yellow' | 'purple' | 'pink' | 'neutral';
export type ProgressCalibrationStatus = 'aligned' | 'overconfident' | 'underconfident' | 'mixed' | 'limited';
export type ProgressMasteryStatus = 'strong' | 'steady' | 'fragile' | 'active';
export type ProgressTimelineKind = 'revision_attempt' | 'lesson_complete' | 'lesson_active';

export interface ProgressHeroMetric {
  title: string;
  value: string;
  support: string;
  detail?: string;
  tone: ProgressTone;
}

export interface ProgressHeroMetrics {
  memoryStrength: ProgressHeroMetric;
  dueToday: ProgressHeroMetric;
  consistency: ProgressHeroMetric;
  calibration: ProgressHeroMetric;
}

export interface ProgressDueCounts {
  dueToday: number;
  overdue: number;
  reviewedThisWeek: number;
}

export interface ProgressCalibrationSummary {
  status: ProgressCalibrationStatus;
  label: string;
  summary: string;
  tone: ProgressTone;
  averageSelfConfidence: number;
  averageCorrectness: number;
}

export interface ProgressInsightCard {
  title: string;
  summary: string;
  tone: ProgressTone;
}

export interface ProgressInsights {
  breakthrough: ProgressInsightCard | null;
  watchNext: ProgressInsightCard | null;
  learningPattern: ProgressInsightCard;
}

export interface ProgressLearningMicroStat {
  label: string;
  value: string;
}

export interface ProgressLearningProfile {
  summary: string;
  supportChips: string[];
  microStats: ProgressLearningMicroStat[];
}

export interface ProgressMasteryTopic {
  topicTitle: string;
  status: ProgressMasteryStatus;
  statusLabel: string;
  confidenceScore: number;
  detail: string;
  revisionStatus: 'due_today' | 'overdue' | null;
}

export interface ProgressMasterySubjectGroup {
  subjectId: string;
  subject: string;
  topics: ProgressMasteryTopic[];
}

export interface ProgressTimelineItem {
  id: string;
  kind: ProgressTimelineKind;
  title: string;
  subject: string;
  summary: string;
  badge: string;
  tone: ProgressTone;
  occurredAt: string;
  relativeDate: string;
}

export interface ProgressRadarMetric {
  label: string;
  value: string;
  detail?: string;
  tone: ProgressTone;
}

export interface ProgressSessionHistoryItem {
  id: string;
  title: string;
  subject: string;
  curriculumReference: string;
  statusLabel: string;
  statusTone: ProgressTone;
  detail: string;
  lastActiveLabel: string;
  revisionBadge: string | null;
}

export interface ProgressViewModel {
  hero: ProgressHeroMetrics;
  dueCounts: ProgressDueCounts;
  calibration: ProgressCalibrationSummary;
  insights: ProgressInsights;
  learningProfile: ProgressLearningProfile;
  masteryMap: ProgressMasterySubjectGroup[];
  radar: ProgressRadarMetric[];
  timeline: ProgressTimelineItem[];
  sessionHistory: ProgressSessionHistoryItem[];
}

const DAY_MS = 86400000;

function startOfDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetween(earlier: Date, later: Date): number {
  return Math.round((startOfDay(later) - startOfDay(earlier)) / DAY_MS);
}

function relativeDateLabel(value: string, now: Date): string {
  const parsed = parseDate(value);

  if (!parsed) {
    return 'Recently';
  }

  const diff = daysBetween(parsed, now);

  if (diff <= 0) {
    return 'Today';
  }

  if (diff === 1) {
    return 'Yesterday';
  }

  if (diff < 7) {
    return `${diff} days ago`;
  }

  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatCalibrationLevel(status: ProgressCalibrationStatus): string {
  switch (status) {
    case 'aligned':
      return 'Aligned';
    case 'overconfident':
      return 'Overconfident';
    case 'underconfident':
      return 'Underconfident';
    case 'mixed':
      return 'Mixed';
    default:
      return 'Not enough data';
  }
}

function findTopMisconception(revisionTopics: RevisionTopic[]): string | null {
  const entries = revisionTopics
    .flatMap((topic) => topic.misconceptionSignals)
    .reduce<Record<string, number>>((accumulator, signal) => {
      return {
        ...accumulator,
        [signal.tag]: (accumulator[signal.tag] ?? 0) + signal.count
      };
    }, {});

  return Object.entries(entries).sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

function formatMisconceptionLabel(tag: string): string {
  return tag
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getLearningSignalRanking(profile: LearnerProfile) {
  return [
    { key: 'step_by_step', label: 'Step by step', value: profile.step_by_step },
    { key: 'real_world_examples', label: 'Real-world examples', value: profile.real_world_examples },
    { key: 'visual_learner', label: 'Visual breakdowns', value: profile.visual_learner },
    { key: 'analogies_preference', label: 'Analogy shortcuts', value: profile.analogies_preference },
    { key: 'needs_repetition', label: 'Quick revisits', value: profile.needs_repetition },
    { key: 'abstract_thinking', label: 'Big-picture thinking', value: profile.abstract_thinking }
  ].sort((left, right) => right.value - left.value);
}

function buildLearningSummary(profile: LearnerProfile): string {
  const ranked = getLearningSignalRanking(profile);
  const first = ranked[0];
  const second = ranked[1];

  if (!first || !second) {
    return 'Your learning pattern is still forming. A few more sessions will sharpen what helps most.';
  }

  const topLabels = [first.label.toLowerCase(), second.label.toLowerCase()];

  if (topLabels.includes('step by step') && topLabels.includes('real-world examples')) {
    return 'You usually learn best when lessons move step by step and connect ideas to real-world examples before practice.';
  }

  return `You usually learn best with ${first.label.toLowerCase()} and ${second.label.toLowerCase()} when the lesson starts getting harder.`;
}

export function deriveProgressLearningProfile(profile: LearnerProfile): ProgressLearningProfile {
  const ranked = getLearningSignalRanking(profile);
  const supportChips = ranked.slice(0, 4).map((item) => item.label);

  return {
    summary: buildLearningSummary(profile),
    supportChips: supportChips.length > 0 ? supportChips : ['Building your learning pattern'],
    microStats: [
      { label: 'Questions asked', value: `${profile.total_questions_asked}` },
      { label: 'Reteach moments', value: `${profile.total_reteach_events}` },
      { label: 'Subjects explored', value: `${profile.subjects_studied.length}` }
    ]
  };
}

export function deriveProgressDueCounts(
  revisionTopics: RevisionTopic[],
  now = new Date()
): ProgressDueCounts {
  const todayStart = startOfDay(now);
  const tomorrowStart = todayStart + DAY_MS;

  const dueToday = revisionTopics.filter((topic) => {
    const parsed = parseDate(topic.nextRevisionAt);
    return parsed ? parsed.getTime() < tomorrowStart : false;
  }).length;
  const overdue = revisionTopics.filter((topic) => {
    const parsed = parseDate(topic.nextRevisionAt);
    return parsed ? parsed.getTime() < todayStart : false;
  }).length;
  const reviewedThisWeek = revisionTopics.filter((topic) => {
    const parsed = parseDate(topic.lastReviewedAt);

    if (!parsed) {
      return false;
    }

    const diff = daysBetween(parsed, now);
    return diff >= 0 && diff <= 6;
  }).length;

  return {
    dueToday,
    overdue,
    reviewedThisWeek
  };
}

export function deriveProgressCalibrationSummary(
  revisionTopics: RevisionTopic[]
): ProgressCalibrationSummary {
  if (revisionTopics.length === 0) {
    return {
      status: 'limited',
      label: 'Not enough data',
      summary: 'A few revision rounds will unlock confidence coaching here.',
      tone: 'blue',
      averageSelfConfidence: 0,
      averageCorrectness: 0
    };
  }

  const totals = revisionTopics.reduce(
    (accumulator, topic) => {
      return {
        attempts: accumulator.attempts + Math.max(topic.calibration.attempts, 1),
        selfConfidence:
          accumulator.selfConfidence + topic.calibration.averageSelfConfidence * Math.max(topic.calibration.attempts, 1),
        correctness:
          accumulator.correctness + topic.calibration.averageCorrectness * Math.max(topic.calibration.attempts, 1),
        gap: accumulator.gap + topic.calibration.confidenceGap * Math.max(topic.calibration.attempts, 1),
        overconfidenceCount: accumulator.overconfidenceCount + topic.calibration.overconfidenceCount,
        underconfidenceCount: accumulator.underconfidenceCount + topic.calibration.underconfidenceCount
      };
    },
    {
      attempts: 0,
      selfConfidence: 0,
      correctness: 0,
      gap: 0,
      overconfidenceCount: 0,
      underconfidenceCount: 0
    }
  );

  const averageSelfConfidence = totals.attempts === 0 ? 0 : totals.selfConfidence / totals.attempts;
  const averageCorrectness = totals.attempts === 0 ? 0 : totals.correctness / totals.attempts;
  const averageGap = totals.attempts === 0 ? 0 : totals.gap / totals.attempts;

  if (averageGap >= 0.18 || totals.overconfidenceCount > totals.underconfidenceCount + 1) {
    return {
      status: 'overconfident',
      label: 'Overconfident',
      summary: 'Confidence is running ahead of accuracy. Slow down and explain each step before speeding up.',
      tone: 'yellow',
      averageSelfConfidence,
      averageCorrectness
    };
  }

  if (averageGap <= -0.18 || totals.underconfidenceCount > totals.overconfidenceCount + 1) {
    return {
      status: 'underconfident',
      label: 'Underconfident',
      summary: 'You know more than you think here. Trust the method you are already using.',
      tone: 'pink',
      averageSelfConfidence,
      averageCorrectness
    };
  }

  if (Math.abs(averageGap) <= 0.1) {
    return {
      status: 'aligned',
      label: 'Aligned',
      summary: 'Your confidence and answer quality are lining up well.',
      tone: 'blue',
      averageSelfConfidence,
      averageCorrectness
    };
  }

  return {
    status: 'mixed',
    label: 'Mixed',
    summary: 'Some topics feel aligned, while others still need calibration checks.',
    tone: 'purple',
    averageSelfConfidence,
    averageCorrectness
  };
}

export function deriveProgressHeroMetrics(
  state: AppState,
  now = new Date()
): ProgressHeroMetrics {
  const revisionProgress = deriveRevisionProgressModel(state, now);
  const dueCounts = deriveProgressDueCounts(state.revisionTopics, now);
  const calibration = deriveProgressCalibrationSummary(state.revisionTopics);
  const memoryStrength = state.revisionTopics.length === 0 ? 0 : revisionProgress.memoryStrength;

  return {
    memoryStrength: {
      title: 'Memory strength',
      value: `${memoryStrength}%`,
      support: 'How well your learning is holding',
      detail:
        revisionProgress.coveredTopicsCount > 0
          ? `${revisionProgress.coveredTopicsCount} topic${revisionProgress.coveredTopicsCount === 1 ? '' : 's'} revisited this week`
          : 'No recent revision yet',
      tone: 'blue'
    },
    dueToday: {
      title: 'Due today',
      value: `${dueCounts.dueToday}`,
      support: 'Topics ready for a quick revisit',
      detail: dueCounts.overdue > 0 ? `${dueCounts.overdue} overdue` : 'Nothing overdue',
      tone: dueCounts.dueToday > 0 ? 'yellow' : 'green'
    },
    consistency: {
      title: 'Consistency',
      value: `${revisionProgress.consistencyDays}/7`,
      support: 'Days you showed up this week',
      detail:
        revisionProgress.consistencyDays >= 4
          ? 'Momentum is building'
          : 'A couple more touchpoints will strengthen recall',
      tone: 'purple'
    },
    calibration: {
      title: 'Confidence coach',
      value: formatCalibrationLevel(calibration.status),
      support: 'How confidence compares with answer quality',
      detail: calibration.summary,
      tone: calibration.tone
    }
  };
}

export function deriveProgressInsights(state: AppState, now = new Date()): ProgressInsights {
  const progress = deriveRevisionProgressModel(state, now);
  const learningProfile = deriveProgressLearningProfile(state.learnerProfile);
  const breakthrough =
    progress.insights.find((item) => item.tone === 'recovery') &&
    ({
      title: progress.insights.find((item) => item.tone === 'recovery')!.title,
      summary: progress.insights.find((item) => item.tone === 'recovery')!.summary,
      tone: 'green' as const
    });
  const watchNext =
    progress.insights.find((item) => item.tone === 'risk') &&
    ({
      title: progress.insights.find((item) => item.tone === 'risk')!.title,
      summary: progress.insights.find((item) => item.tone === 'risk')!.summary,
      tone: 'yellow' as const
    });

  return {
    breakthrough: breakthrough ?? null,
    watchNext: watchNext ?? null,
    learningPattern: {
      title: 'How you learn best',
      summary: learningProfile.summary,
      tone: 'purple'
    }
  };
}

function getRevisionStatusForTopic(topicTitle: string, revisionTopics: RevisionTopic[], now: Date): 'due_today' | 'overdue' | null {
  const match = revisionTopics.find((topic) => topic.topicTitle === topicTitle);

  if (!match) {
    return null;
  }

  const parsed = parseDate(match.nextRevisionAt);

  if (!parsed) {
    return null;
  }

  const diff = parsed.getTime() - startOfDay(now);

  if (parsed.getTime() < startOfDay(now)) {
    return 'overdue';
  }

  if (diff < DAY_MS) {
    return 'due_today';
  }

  return null;
}

function mapSessionToMasteryStatus(session: LessonSession): ProgressMasteryStatus {
  if (session.status === 'active') {
    return 'active';
  }

  if (session.confidenceScore >= 0.8) {
    return 'strong';
  }

  if (session.confidenceScore >= 0.68) {
    return 'steady';
  }

  return 'fragile';
}

function masteryStatusLabel(status: ProgressMasteryStatus): string {
  switch (status) {
    case 'strong':
      return 'Strong';
    case 'steady':
      return 'Steady';
    case 'fragile':
      return 'Fragile';
    default:
      return 'In progress';
  }
}

export function deriveProgressMasteryMap(
  lessonSessions: LessonSession[],
  revisionTopics: RevisionTopic[] = [],
  now = new Date()
): ProgressMasterySubjectGroup[] {
  const latestBySubjectTopic = lessonSessions.reduce<Record<string, LessonSession>>((accumulator, session) => {
    const key = `${session.subjectId}::${session.topicTitle}`;
    const existing = accumulator[key];

    if (!existing || Date.parse(session.lastActiveAt) > Date.parse(existing.lastActiveAt)) {
      return {
        ...accumulator,
        [key]: session
      };
    }

    return accumulator;
  }, {});

  const grouped = Object.values(latestBySubjectTopic).reduce<Record<string, ProgressMasterySubjectGroup>>((accumulator, session) => {
    const current = accumulator[session.subjectId] ?? {
      subjectId: session.subjectId,
      subject: session.subject,
      topics: []
    };
    const status = mapSessionToMasteryStatus(session);

    current.topics.push({
      topicTitle: session.topicTitle,
      status,
      statusLabel: masteryStatusLabel(status),
      confidenceScore: session.confidenceScore,
      detail:
        session.status === 'active'
          ? `Stage ${Math.min(session.stagesCompleted.length + 1, 6)} · ${getStageLabel(session.currentStage)}`
          : `${Math.round(session.confidenceScore * 100)}% confidence`,
      revisionStatus: getRevisionStatusForTopic(session.topicTitle, revisionTopics, now)
    });

    accumulator[session.subjectId] = current;
    return accumulator;
  }, {});

  return Object.values(grouped)
    .map((group) => ({
      ...group,
      topics: group.topics.sort((left, right) => left.topicTitle.localeCompare(right.topicTitle))
    }))
    .sort((left, right) => left.subject.localeCompare(right.subject));
}

function buildRevisionAttemptBadge(attempt: RevisionAttemptRecord): string {
  switch (attempt.result.diagnosis.type) {
    case 'false_confidence':
      return 'Confidence check';
    case 'underconfidence':
      return 'Quiet progress';
    case 'weak_explanation':
      return 'Explanation gap';
    case 'forgotten_fact':
      return 'Needs recheck';
    default:
      return attempt.result.sessionDecision === 'continue' ? 'Good progress' : 'Needs reteach';
  }
}

export function deriveProgressActivityTimeline(
  input: Pick<AppState, 'lessonSessions' | 'revisionAttempts'>,
  now = new Date()
): ProgressTimelineItem[] {
  const sessionById = new Map(input.lessonSessions.map((session) => [session.id, session]));
  const lessonEntries = input.lessonSessions.map((session): ProgressTimelineItem => {
    if (session.status === 'active') {
      return {
        id: `lesson-active-${session.id}`,
        kind: 'lesson_active',
        title: session.topicTitle,
        subject: session.subject,
        summary:
          session.reteachCount > 0 && session.stuckConcept
            ? `Slowing down around ${session.stuckConcept}.`
            : `Working through ${getStageLabel(session.currentStage)}.`,
        badge: `Stage ${Math.min(session.stagesCompleted.length + 1, 6)} of 6`,
        tone: 'blue',
        occurredAt: session.lastActiveAt,
        relativeDate: relativeDateLabel(session.lastActiveAt, now)
      };
    }

    return {
      id: `lesson-complete-${session.id}`,
      kind: 'lesson_complete',
      title: session.topicTitle,
      subject: session.subject,
      summary:
        session.needsTeacherReview && session.stuckConcept
          ? `Completed with a lingering gap around ${session.stuckConcept}.`
          : 'Lesson completed and ready to build on.',
      badge: `${Math.round(session.confidenceScore * 100)}% confidence`,
      tone: session.confidenceScore >= 0.75 ? 'green' : 'yellow',
      occurredAt: session.completedAt ?? session.lastActiveAt,
      relativeDate: relativeDateLabel(session.completedAt ?? session.lastActiveAt, now)
    };
  });

  const revisionEntries = input.revisionAttempts.map((attempt): ProgressTimelineItem => {
    const session = sessionById.get(attempt.revisionTopicId);

    return {
      id: `revision-${attempt.id}`,
      kind: 'revision_attempt',
      title: session?.topicTitle ?? 'Revision check-in',
      subject: session?.subject ?? 'Revision',
      summary: attempt.result.diagnosis.summary,
      badge: buildRevisionAttemptBadge(attempt),
      tone:
        attempt.result.diagnosis.type === 'underconfidence'
          ? 'pink'
          : attempt.result.diagnosis.type === 'false_confidence'
            ? 'yellow'
            : 'purple',
      occurredAt: attempt.createdAt,
      relativeDate: relativeDateLabel(attempt.createdAt, now)
    };
  });

  return [...lessonEntries, ...revisionEntries]
    .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt))
    .slice(0, 12);
}

export function deriveProgressSessionHistory(
  lessonSessions: LessonSession[],
  revisionTopics: RevisionTopic[],
  now = new Date()
): ProgressSessionHistoryItem[] {
  return lessonSessions
    .slice()
    .sort((left, right) => Date.parse(right.lastActiveAt) - Date.parse(left.lastActiveAt))
    .slice(0, 8)
    .map((session) => {
      const revisionStatus = getRevisionStatusForTopic(session.topicTitle, revisionTopics, now);
      const statusTone =
        session.status === 'active'
          ? 'blue'
          : session.confidenceScore >= 0.75
            ? 'green'
            : session.needsTeacherReview
              ? 'yellow'
              : 'neutral';

      return {
        id: session.id,
        title: session.topicTitle,
        subject: session.subject,
        curriculumReference: session.curriculumReference,
        statusLabel:
          session.status === 'active'
            ? `Stage ${Math.min(session.stagesCompleted.length + 1, 6)}`
            : session.status === 'complete'
              ? 'Complete'
              : 'Archived',
        statusTone,
        detail:
          session.status === 'active'
            ? getStageLabel(session.currentStage)
            : `${Math.round(session.confidenceScore * 100)}% confidence${session.reteachCount > 0 ? ` · ${session.reteachCount} reteach` : ''}`,
        lastActiveLabel: relativeDateLabel(session.lastActiveAt, now),
        revisionBadge:
          revisionStatus === 'overdue'
            ? 'Revision overdue'
            : revisionStatus === 'due_today'
              ? 'Revision due today'
              : null
      };
    });
}

export function deriveProgressRadar(
  state: AppState,
  now = new Date()
): ProgressRadarMetric[] {
  const dueCounts = deriveProgressDueCounts(state.revisionTopics, now);
  const revisionProgress = deriveRevisionProgressModel(state, now);
  const topMisconception = findTopMisconception(state.revisionTopics);

  return [
    {
      label: 'Due today',
      value: `${dueCounts.dueToday}`,
      detail: dueCounts.overdue > 0 ? `${dueCounts.overdue} overdue` : 'All caught up',
      tone: dueCounts.dueToday > 0 ? 'yellow' : 'green'
    },
    {
      label: 'Reviewed this week',
      value: `${dueCounts.reviewedThisWeek}`,
      detail: `${revisionProgress.coveredTopicsCount} topics covered`,
      tone: 'blue'
    },
    {
      label: 'Consistency',
      value: `${revisionProgress.consistencyDays}/7`,
      detail: 'Active days this week',
      tone: 'purple'
    },
    {
      label: 'Main trap',
      value: topMisconception ? formatMisconceptionLabel(topMisconception) : 'No pattern yet',
      detail: topMisconception ? 'Most repeated misconception signal' : 'No repeated misconception signals yet',
      tone: topMisconception ? 'yellow' : 'neutral'
    }
  ];
}

export function deriveProgressViewModel(
  state: AppState,
  now = new Date()
): ProgressViewModel {
  const learningProfile = deriveProgressLearningProfile(state.learnerProfile);
  const calibration = deriveProgressCalibrationSummary(state.revisionTopics);

  return {
    hero: deriveProgressHeroMetrics(state, now),
    dueCounts: deriveProgressDueCounts(state.revisionTopics, now),
    calibration,
    insights: deriveProgressInsights(state, now),
    learningProfile,
    masteryMap: deriveProgressMasteryMap(state.lessonSessions, state.revisionTopics, now),
    radar: deriveProgressRadar(state, now),
    timeline: deriveProgressActivityTimeline(state, now),
    sessionHistory: deriveProgressSessionHistory(state.lessonSessions, state.revisionTopics, now)
  };
}
