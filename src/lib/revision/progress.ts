import type { AppState, RevisionAttemptRecord } from '$lib/types';

export interface RevisionActivityItem {
  id: string;
  topicTitle: string;
  label: string;
  summary: string;
  createdAt: string;
}

export interface RevisionInsightItem {
  id: string;
  title: string;
  summary: string;
  tone: 'risk' | 'recovery' | 'steady';
}

export interface RevisionActivityDay {
  label: string;
  count: number;
}

export interface RevisionTopicHistoryEntry {
  id: string;
  createdAt: string;
  label: string;
  summary: string;
  diagnosisType: RevisionAttemptRecord['result']['diagnosis']['type'];
  interventionContent: string;
  correctness: number;
  selfConfidence: number;
  scores: RevisionAttemptRecord['result']['scores'];
  scheduledAction: RevisionAttemptRecord['result']['sessionDecision'];
  questionId?: string;
  questionType?: RevisionAttemptRecord['questionType'];
  difficulty?: RevisionAttemptRecord['difficulty'];
  promptSnippet?: string;
}

export interface RevisionTopicHistoryModel {
  topicTitle: string;
  trend: 'improving' | 'slipping' | 'mixed' | 'limited';
  dominantIssue: string;
  entries: RevisionTopicHistoryEntry[];
}

export interface RevisionProgressModel {
  memoryStrength: number;
  consistencyDays: number;
  coveredTopicsCount: number;
  recentActivity: RevisionActivityItem[];
  insights: RevisionInsightItem[];
  weeklyActivity: RevisionActivityDay[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toStartOfDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function daysAgo(value: string, now: Date): number | null {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Math.round((toStartOfDay(now) - toStartOfDay(date)) / 86400000);
}

function dayLabel(value: Date): string {
  return value.toLocaleDateString(undefined, { weekday: 'short' });
}

function buildActivityLabel(attempt: RevisionAttemptRecord): string {
  switch (attempt.result.diagnosis.type) {
    case 'false_confidence':
      return 'Confidence check';
    case 'underconfidence':
      return 'Quiet progress';
    case 'forgotten_fact':
      return 'Needs recheck';
    case 'weak_explanation':
      return 'Explanation gap';
    default:
      return attempt.result.sessionDecision === 'continue' ? 'Good progress' : 'Needs reteach';
  }
}

export function deriveRevisionProgressModel(state: AppState, now = new Date()): RevisionProgressModel {
  const averageConfidence =
    state.revisionTopics.length > 0
      ? state.revisionTopics.reduce((total, topic) => total + topic.confidenceScore, 0) / state.revisionTopics.length
      : 0;
  const averageRetentionStability =
    state.revisionTopics.length > 0
      ? state.revisionTopics.reduce((total, topic) => total + topic.retentionStability, 0) / state.revisionTopics.length
      : 0;
  const averageForgettingVelocity =
    state.revisionTopics.length > 0
      ? state.revisionTopics.reduce((total, topic) => total + topic.forgettingVelocity, 0) / state.revisionTopics.length
      : 0;
  const coveredTopicsCount = state.revisionTopics.filter((topic) => {
    if (!topic.lastReviewedAt) {
      return false;
    }

    const diff = daysAgo(topic.lastReviewedAt, now);
    return diff !== null && diff <= 7;
  }).length;
  const recentAttemptDays = new Set(
    state.revisionAttempts
      .map((attempt) => daysAgo(attempt.createdAt, now))
      .filter((diff): diff is number => diff !== null && diff <= 6)
  );
  const consistencyDays = recentAttemptDays.size;
  const consistencyScore = clamp(consistencyDays / 4, 0, 1);
  const coverageScore =
    state.revisionTopics.length > 0 ? coveredTopicsCount / state.revisionTopics.length : 0;
  const memoryStrength = Math.round(
    clamp(
      averageConfidence * 0.38 +
        averageRetentionStability * 0.24 +
        (1 - averageForgettingVelocity) * 0.18 +
        consistencyScore * 0.12 +
        coverageScore * 0.08,
      0,
      1
    ) * 100
  );

  const recentActivity = state.revisionAttempts.slice(0, 4).map((attempt) => {
    const topic = state.revisionTopics.find((item) => item.lessonSessionId === attempt.revisionTopicId);

    return {
      id: attempt.id,
      topicTitle: topic?.topicTitle ?? 'Revision topic',
      label: buildActivityLabel(attempt),
      summary: attempt.result.diagnosis.summary,
      createdAt: attempt.createdAt
    };
  });

  const mostOverconfident = state.revisionTopics
    .slice()
    .sort((left, right) => right.calibration.confidenceGap - left.calibration.confidenceGap)[0];
  const mostFragile = state.revisionTopics
    .slice()
    .sort(
      (left, right) =>
        (right.forgettingVelocity - right.retentionStability) -
        (left.forgettingVelocity - left.retentionStability)
    )[0];
  const strongestRecovery = state.revisionTopics
    .filter((topic) => topic.confidenceScore >= 0.68 && topic.retentionStability >= 0.7)
    .slice()
    .sort((left, right) => right.retentionStability - left.retentionStability)[0];
  const insights: RevisionInsightItem[] = [];

  if (mostOverconfident && (mostOverconfident.calibration.confidenceGap >= 0.22 || mostOverconfident.calibration.overconfidenceCount >= 2)) {
    insights.push({
      id: `insight-overconfidence-${mostOverconfident.lessonSessionId}`,
      title: `Overconfidence in ${mostOverconfident.topicTitle}`,
      summary: 'Confidence is running ahead of answer quality here. Use explanation and error-spotting before speeding up.',
      tone: 'risk'
    });
  }

  if (mostFragile && (mostFragile.retentionStability <= 0.5 || mostFragile.forgettingVelocity >= 0.58)) {
    insights.push({
      id: `insight-fragility-${mostFragile.lessonSessionId}`,
      title: `${mostFragile.topicTitle} is still fragile`,
      summary: 'This topic improves, then slips again. Keep it on a shorter loop until the recall holds without help.',
      tone: 'risk'
    });
  }

  if (strongestRecovery) {
    insights.push({
      id: `insight-recovery-${strongestRecovery.lessonSessionId}`,
      title: `${strongestRecovery.topicTitle} is in steady recovery`,
      summary: 'Recent answers and retention now look more durable. Keep revisiting it, but it no longer needs rescue mode.',
      tone: 'recovery'
    });
  }

  const weeklyActivity = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    const count = state.revisionAttempts.filter((attempt) => {
      const diff = daysAgo(attempt.createdAt, now);
      return diff === 6 - index;
    }).length;

    return {
      label: dayLabel(date),
      count
    };
  });

  return {
    memoryStrength,
    consistencyDays,
    coveredTopicsCount,
    recentActivity,
    insights,
    weeklyActivity
  };
}

function mapDiagnosisToIssue(type: RevisionAttemptRecord['result']['diagnosis']['type']): string {
  switch (type) {
    case 'false_confidence':
      return 'confidence mismatch';
    case 'underconfidence':
      return 'confidence lag';
    case 'forgotten_fact':
      return 'recall breakdown';
    case 'weak_explanation':
      return 'explanation gap';
    case 'misconception':
      return 'misconception pattern';
    default:
      return 'revision gap';
  }
}

function deriveTrend(attempts: RevisionAttemptRecord[]): RevisionTopicHistoryModel['trend'] {
  if (attempts.length < 3) {
    return 'limited';
  }

  const [latest, middle, oldest] = attempts.slice(0, 3).map((attempt) => attempt.result.scores.correctness);

  if (latest > middle && middle > oldest) {
    return 'improving';
  }

  if (latest < middle && middle < oldest) {
    return 'slipping';
  }

  return 'mixed';
}

export function deriveRevisionTopicHistoryModel(
  state: AppState,
  revisionTopicId: string
): RevisionTopicHistoryModel | null {
  const topic = state.revisionTopics.find((item) => item.lessonSessionId === revisionTopicId);

  if (!topic) {
    return null;
  }

  const attempts = state.revisionAttempts
    .filter((attempt) => attempt.revisionTopicId === revisionTopicId)
    .slice()
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, 5);
  const issueCounts = attempts.reduce<Record<string, number>>((accumulator, attempt) => {
    const issue = mapDiagnosisToIssue(attempt.result.diagnosis.type);
    return {
      ...accumulator,
      [issue]: (accumulator[issue] ?? 0) + 1
    };
  }, {});
  const dominantIssue =
    Object.entries(issueCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ??
    'not enough history yet';

  return {
    topicTitle: topic.topicTitle,
    trend: deriveTrend(attempts),
    dominantIssue,
    entries: attempts.map((attempt) => ({
      id: attempt.id,
      createdAt: attempt.createdAt,
      label: buildActivityLabel(attempt),
      summary: attempt.result.diagnosis.summary,
      diagnosisType: attempt.result.diagnosis.type,
      interventionContent: attempt.result.intervention.content,
      correctness: attempt.result.scores.correctness,
      selfConfidence: attempt.selfConfidence,
      scores: attempt.result.scores,
      questionId: attempt.questionId,
      questionType: attempt.questionType,
      difficulty: attempt.difficulty,
      promptSnippet: attempt.promptSnippet,
      scheduledAction: attempt.result.sessionDecision
    }))
  };
}
