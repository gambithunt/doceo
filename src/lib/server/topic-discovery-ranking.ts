export type TopicDiscoverySource = 'graph_existing' | 'model_candidate';
export type TopicDiscoveryFreshness = 'new' | 'rising' | 'stable';

export interface TopicDiscoverySignatureInput {
  subjectId: string;
  curriculumId: string;
  gradeId: string;
  topicLabel: string;
}

export interface TopicDiscoveryAggregate {
  subjectId: string;
  curriculumId: string;
  gradeId: string;
  nodeId: string | null;
  topicSignature: string;
  topicLabel: string;
  source: TopicDiscoverySource;
  impressionCount: number;
  refreshCount: number;
  clickCount: number;
  uniqueClickCount: number;
  thumbsUpCount: number;
  thumbsDownCount: number;
  lessonStartCount: number;
  lessonCompleteCount: number;
  lessonAbandonedCount: number;
  recentClickCount: number;
  recentThumbsUpCount: number;
  recentThumbsDownCount: number;
  recentLessonStartCount: number;
  recentLessonCompleteCount: number;
  recentLessonAbandonedCount: number;
  lessonCompleteReteachTotal: number;
  recentLessonCompleteReteachTotal: number;
  sampleSize: number;
  completionRate: number | null;
  lastSeenAt: string | null;
  lastSelectedAt: string | null;
}

export interface TopicDiscoveryScore extends TopicDiscoveryAggregate {
  organicScore: number;
  recentScore: number;
  freshnessScore: number;
  explorationBoost: number;
  finalScore: number;
  freshness: TopicDiscoveryFreshness;
}

export interface TopicDiscoveryScoreOptions {
  now?: Date;
  explorationWeight?: number;
  recencyHalfLifeDays?: number;
}

function roundToThree(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function daysBetween(earlier: string | null, later: Date): number {
  if (!earlier) {
    return 365;
  }

  const deltaMs = later.getTime() - Date.parse(earlier);

  if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
    return 0;
  }

  return deltaMs / (1000 * 60 * 60 * 24);
}

function recencyDecay(daysSinceSeen: number, halfLifeDays: number): number {
  if (halfLifeDays <= 0) {
    return 0;
  }

  return Math.exp((-Math.log(2) * daysSinceSeen) / halfLifeDays);
}

function recentAnchor(aggregate: TopicDiscoveryAggregate): number {
  if (!aggregate.lastSeenAt) {
    return 1;
  }

  if (aggregate.lastSelectedAt) {
    return 0.75;
  }

  return 0.3;
}

function freshnessLabel(
  aggregate: TopicDiscoveryAggregate,
  freshnessScore: number,
  recentScore: number
): TopicDiscoveryFreshness {
  if (aggregate.sampleSize <= 1 && freshnessScore >= 0.4) {
    return 'new';
  }

  if (recentScore >= 1.25 || (aggregate.sampleSize <= 3 && freshnessScore >= 0.2)) {
    return 'rising';
  }

  return 'stable';
}

function candidatePreference(candidate: {
  nodeId: string | null;
  source: TopicDiscoverySource;
  sampleSize?: number;
  finalScore?: number;
}): number {
  return (
    (candidate.nodeId ? 10_000 : 0) +
    (candidate.source === 'graph_existing' ? 5_000 : 0) +
    ((candidate.sampleSize ?? 0) * 10) +
    (candidate.finalScore ?? 0)
  );
}

export function normalizeTopicLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function cleanTopicLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function buildTopicSignature(input: TopicDiscoverySignatureInput): string {
  return [
    input.subjectId.trim(),
    input.curriculumId.trim(),
    input.gradeId.trim(),
    normalizeTopicLabel(input.topicLabel)
  ].join('::');
}

export function dedupeTopicDiscoveryCandidates<
  T extends {
    topicSignature: string;
    topicLabel: string;
    nodeId: string | null;
    source: TopicDiscoverySource;
    sampleSize?: number;
    finalScore?: number;
  }
>(candidates: T[]): T[] {
  const deduped = new Map<string, T>();

  for (const candidate of candidates) {
    const existing = deduped.get(candidate.topicSignature);

    if (!existing || candidatePreference(candidate) > candidatePreference(existing)) {
      deduped.set(candidate.topicSignature, {
        ...candidate,
        topicLabel: cleanTopicLabel(candidate.topicLabel)
      });
    }
  }

  return Array.from(deduped.values());
}

export function scoreTopicDiscoveryAggregate(
  aggregate: TopicDiscoveryAggregate,
  options: TopicDiscoveryScoreOptions = {}
): TopicDiscoveryScore {
  const now = options.now ?? new Date();
  const recency = recencyDecay(daysBetween(aggregate.lastSeenAt, now), options.recencyHalfLifeDays ?? 21);
  const averageReteachCount =
    aggregate.lessonCompleteCount > 0
      ? aggregate.lessonCompleteReteachTotal / aggregate.lessonCompleteCount
      : 0;
  const recentAverageReteachCount =
    aggregate.recentLessonCompleteCount > 0
      ? aggregate.recentLessonCompleteReteachTotal / aggregate.recentLessonCompleteCount
      : 0;
  const organicScore = roundToThree(
    aggregate.uniqueClickCount * 1.2 +
      aggregate.clickCount * 0.25 +
      aggregate.thumbsUpCount * 3.5 -
      aggregate.thumbsDownCount * 4 +
      aggregate.lessonStartCount * 1.1 +
      aggregate.lessonCompleteCount * 3 -
      aggregate.lessonAbandonedCount * 2 +
      (aggregate.completionRate ?? 0) * 1.25 -
      averageReteachCount * 0.45
  );
  const recentSignal =
    aggregate.recentClickCount * 0.6 +
    aggregate.recentThumbsUpCount * 2.25 -
    aggregate.recentThumbsDownCount * 2.5 +
    aggregate.recentLessonStartCount * 1 +
    aggregate.recentLessonCompleteCount * 2.4 -
    aggregate.recentLessonAbandonedCount * 1.5 -
    recentAverageReteachCount * 0.35;
  const freshnessScore = roundToThree(recency * recentAnchor(aggregate));
  const recentScore = roundToThree(recency * (recentSignal + recentAnchor(aggregate)));
  const explorationBoost = roundToThree((options.explorationWeight ?? 1) * (2 / Math.sqrt(aggregate.sampleSize + 1)));
  const confidencePenalty =
    aggregate.sampleSize >= 3 && aggregate.thumbsDownCount > aggregate.thumbsUpCount
      ? (aggregate.thumbsDownCount - aggregate.thumbsUpCount) * -0.6
      : 0;
  const finalScore = roundToThree(organicScore + recentScore + explorationBoost + confidencePenalty);

  return {
    ...aggregate,
    topicLabel: cleanTopicLabel(aggregate.topicLabel),
    organicScore,
    recentScore,
    freshnessScore,
    explorationBoost,
    finalScore,
    freshness: freshnessLabel(aggregate, freshnessScore, recentScore)
  };
}
