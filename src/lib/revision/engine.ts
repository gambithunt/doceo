import type {
  ActiveRevisionSession,
  RevisionHelpLadder,
  RevisionIntervention,
  RevisionInterventionType,
  RevisionQuestion,
  RevisionTopic,
  RevisionTurnResult,
  RevisionTurnScores
} from '$lib/types';

function isoNow(now = new Date()): string {
  return now.toISOString();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(' ')
    .filter((item) => item.length > 2);
}

export function buildRevisionSession(input: {
  topics: RevisionTopic[];
  recommendationReason: string;
  mode: ActiveRevisionSession['mode'];
  source: ActiveRevisionSession['source'];
  questions: RevisionQuestion[];
  nodeId?: string | null;
  revisionPackArtifactId?: string | null;
  revisionQuestionArtifactId?: string | null;
  revisionPlanId?: string;
  sessionTitle?: string;
  sessionRecommendations?: string[];
  now?: Date;
}): ActiveRevisionSession {
  const topics = input.topics;
  const primaryTopic = topics[0];

  if (!primaryTopic) {
    throw new Error('buildRevisionSession requires at least one revision topic');
  }
  const now = input.now ?? new Date();
  const questions = input.questions;

  if (questions.length === 0) {
    throw new Error('buildRevisionSession requires at least one authored revision question');
  }

  return {
    revisionPlanId: input.revisionPlanId,
    id: `revision-session-${crypto.randomUUID()}`,
    revisionTopicId: primaryTopic.lessonSessionId,
    revisionTopicIds: topics.map((topic) => topic.lessonSessionId),
    nodeId: input.nodeId ?? primaryTopic.nodeId ?? null,
    revisionPackArtifactId: input.revisionPackArtifactId ?? null,
    revisionQuestionArtifactId: input.revisionQuestionArtifactId ?? null,
    mode: input.mode,
    source: input.source,
    topicTitle:
      input.sessionTitle ??
      (input.mode === 'shuffle' && topics.length > 1 ? 'Mixed shuffle session' : primaryTopic.topicTitle),
    recommendationReason: input.recommendationReason,
    sessionRecommendations: input.sessionRecommendations ?? [],
    questions,
    questionIndex: 0,
    currentInterventionLevel: 'none',
    currentHelp: null,
    awaitingAdvance: false,
    skippedQuestionIds: [],
    selfConfidenceHistory: [],
    lastTurnResult: null,
    status: 'active',
    startedAt: isoNow(now),
    lastActiveAt: isoNow(now)
  };
}

function getHelpContent(
  ladder: RevisionHelpLadder | undefined,
  type: RevisionInterventionType
): string {
  if (!ladder) {
    return '';
  }

  switch (type) {
    case 'nudge':
      return ladder.nudge;
    case 'hint':
      return ladder.hint;
    case 'worked_step':
      return ladder.workedStep;
    case 'mini_reteach':
      return ladder.miniReteach;
    case 'lesson_refer':
      return ladder.lessonRefer;
    case 'none':
    default:
      return '';
  }
}

function keywordCoverage(answer: string, topic: RevisionTopic, question: RevisionQuestion): number {
  const answerTokens = tokenize(answer);
  const topicTokens = unique([topic.topicTitle, topic.subject, topic.curriculumReference].flatMap(tokenize));
  const questionTokens = unique([question.prompt, ...question.expectedSkills].flatMap(tokenize));
  const allTokens = unique([...topicTokens, ...questionTokens]);

  if (answerTokens.length === 0 || allTokens.length === 0) {
    return 0;
  }

  const matches = allTokens.filter((token) => answerTokens.includes(token)).length;
  return clamp(matches / Math.max(2, allTokens.length), 0, 1);
}

function unique(values: string[]): string[] {
  return values.filter((value, index, all) => all.indexOf(value) === index);
}

export function buildScores(answer: string, topic: RevisionTopic, question: RevisionQuestion, selfConfidence: number) {
  const normalized = normalize(answer);
  const coverage = keywordCoverage(answer, topic, question);
  const completeness = clamp(answer.trim().length / 120, 0, 1);
  const selfConfidenceScore = clamp(selfConfidence / 5, 0, 1);
  const reasoning = /(because|therefore|so that|which means|step|rule)/i.test(answer)
    ? clamp(0.45 + completeness * 0.45, 0, 1)
    : clamp(coverage * 0.7 + completeness * 0.15, 0, 1);
  const correctness = clamp(coverage * 0.55 + completeness * 0.35 + (normalized.includes('example') ? 0.1 : 0), 0, 1);
  const calibrationGap = clamp(selfConfidenceScore - correctness, -1, 1);
  const confidenceAlignment = clamp(1 - Math.abs(calibrationGap), 0, 1);

  return {
    correctness,
    reasoning,
    completeness,
    confidenceAlignment,
    selfConfidenceScore,
    calibrationGap
  };
}

function buildCalibrationUpdate(topic: RevisionTopic, scores: ReturnType<typeof buildScores>, selfConfidence: number) {
  const attempts = topic.calibration.attempts + 1;
  const averageSelfConfidence =
    ((topic.calibration.averageSelfConfidence * topic.calibration.attempts) + selfConfidence) / attempts;
  const averageCorrectness =
    ((topic.calibration.averageCorrectness * topic.calibration.attempts) + scores.correctness) / attempts;
  const confidenceGap = clamp(averageSelfConfidence / 5 - averageCorrectness, -1, 1);

  return {
    attempts,
    averageSelfConfidence,
    averageCorrectness,
    confidenceGap,
    overconfidenceCount:
      topic.calibration.overconfidenceCount + (scores.calibrationGap >= 0.2 ? 1 : 0),
    underconfidenceCount:
      topic.calibration.underconfidenceCount + (scores.calibrationGap <= -0.2 ? 1 : 0)
  };
}

function buildRetentionProfile(topic: RevisionTopic, scores: ReturnType<typeof buildScores>) {
  const retentionStability = clamp(
    topic.retentionStability * 0.68 +
      scores.correctness * 0.24 +
      scores.reasoning * 0.12 -
      (scores.calibrationGap > 0.2 ? 0.08 : 0),
    0.1,
    0.98
  );
  const forgettingVelocity = clamp(
    topic.forgettingVelocity * 0.72 +
      (1 - scores.correctness) * 0.2 +
      (topic.previousIntervalDays >= 5 && scores.correctness < 0.72 ? 0.08 : 0) +
      (retentionStability < 0.4 ? 0.06 : -0.04),
    0.05,
    0.98
  );

  return {
    retentionStability,
    forgettingVelocity
  };
}

function buildMisconceptionSignals(
  topic: RevisionTopic,
  diagnosisType: RevisionTurnResult['diagnosis']['type'],
  misconceptionTags: string[],
  now: Date
) {
  if (diagnosisType === 'underconfidence' || misconceptionTags.length === 0) {
    return topic.misconceptionSignals;
  }

  const nextSignals = [...topic.misconceptionSignals];

  for (const tag of misconceptionTags) {
    const existingIndex = nextSignals.findIndex((signal) => signal.tag === tag);

    if (existingIndex === -1) {
      nextSignals.push({
        tag,
        count: 1,
        lastSeenAt: now.toISOString()
      });
      continue;
    }

    nextSignals[existingIndex] = {
      ...nextSignals[existingIndex]!,
      count: nextSignals[existingIndex]!.count + 1,
      lastSeenAt: now.toISOString()
    };
  }

  return nextSignals
    .slice()
    .sort((left, right) => right.count - left.count || Date.parse(right.lastSeenAt) - Date.parse(left.lastSeenAt))
    .slice(0, 5);
}

function buildDiagnosisType(
  answer: string,
  scores: ReturnType<typeof buildScores>,
  selfConfidence: number
): RevisionTurnResult['diagnosis']['type'] {
  if (scores.correctness < 0.4 && selfConfidence >= 4) {
    return 'false_confidence';
  }

  if ((scores.correctness >= 0.55 || (scores.reasoning >= 0.65 && scores.completeness >= 0.6)) && selfConfidence <= 2) {
    return 'underconfidence';
  }

  if (/don't know|dont know|not sure|stuck|idk/i.test(answer) || answer.trim().length < 10) {
    return 'forgotten_fact';
  }

  if (scores.reasoning < 0.4) {
    return 'weak_explanation';
  }

  return 'misconception';
}

function buildDiagnosisSummary(type: RevisionTurnResult['diagnosis']['type'], topic: RevisionTopic): string {
  switch (type) {
    case 'false_confidence':
      return `You answered confidently, but the explanation for ${topic.topicTitle} is still shaky.`;
    case 'underconfidence':
      return `You know more than you think in ${topic.topicTitle}. The structure is stronger than your confidence says.`;
    case 'forgotten_fact':
      return `The core rule for ${topic.topicTitle} is not secure yet. Start by rebuilding the definition.`;
    case 'weak_explanation':
      return `You remembered parts of ${topic.topicTitle}, but the explanation still needs clearer logic.`;
    default:
      return `There is still a gap in how ${topic.topicTitle} is being explained or applied.`;
  }
}

function nextInterventionLevel(
  current: RevisionInterventionType,
  scores: ReturnType<typeof buildScores>,
  attemptNumber: number
): RevisionInterventionType {
  if (scores.correctness >= 0.7) {
    return 'none';
  }

  if (current === 'none') return 'nudge';
  if (current === 'nudge') return 'hint';
  if (current === 'hint') return 'worked_step';
  if (current === 'worked_step' || (current === 'mini_reteach' && attemptNumber < 3)) return 'mini_reteach';
  return 'lesson_refer';
}

function buildNextReviewDate(
  topic: RevisionTopic,
  scores: ReturnType<typeof buildScores>,
  retention: ReturnType<typeof buildRetentionProfile>,
  now: Date
): { nextRevisionAt: string; previousIntervalDays: number } {
  const baseInterval =
    scores.correctness >= 0.75
      ? Math.max(4, Math.round(topic.previousIntervalDays * 1.6))
      : scores.correctness >= 0.5
        ? Math.max(2, Math.round(topic.previousIntervalDays * 1.1))
        : 1;
  const fragilityModifier = clamp(
    0.72 + retention.retentionStability * 0.45 - retention.forgettingVelocity * 0.52,
    0.35,
    1.2
  );
  const nextInterval = Math.max(
    scores.correctness >= 0.75 ? 2 : 1,
    Math.round(baseInterval * fragilityModifier)
  );

  const due = new Date(now);
  due.setDate(due.getDate() + nextInterval);

  return {
    nextRevisionAt: due.toISOString(),
    previousIntervalDays: nextInterval
  };
}

export function evaluateRevisionAnswer(input: {
  topic: RevisionTopic;
  question: RevisionQuestion;
  answer: string;
  selfConfidence: number;
  currentInterventionLevel: RevisionInterventionType;
  attemptNumber: number;
  scores?: RevisionTurnScores;
  now?: Date;
}): RevisionTurnResult {
  const now = input.now ?? new Date();
  const scores = input.scores ?? buildScores(input.answer, input.topic, input.question, input.selfConfidence);
  const diagnosisType = buildDiagnosisType(input.answer, scores, input.selfConfidence);
  const nextIntervention = nextInterventionLevel(input.currentInterventionLevel, scores, input.attemptNumber);
  const retention = buildRetentionProfile(input.topic, scores);
  const reviewTiming = buildNextReviewDate(input.topic, scores, retention, now);
  const misconceptionSignals = buildMisconceptionSignals(
    input.topic,
    diagnosisType,
    input.question.misconceptionTags,
    now
  );
  const calibration = buildCalibrationUpdate(input.topic, scores, input.selfConfidence);
  const isStrongEnoughToAdvance =
    scores.correctness >= 0.6 || (scores.reasoning >= 0.6 && scores.completeness >= 0.55);
  const sessionDecision =
    nextIntervention === 'lesson_refer'
      ? 'lesson_revisit'
      : isStrongEnoughToAdvance
        ? 'continue'
        : 'reschedule';
 
  return {
    scores,
    diagnosis: {
      type: diagnosisType,
      summary: buildDiagnosisSummary(diagnosisType, input.topic),
      misconceptionTags: input.question.misconceptionTags ?? []
    },
    intervention: {
      type: nextIntervention,
      content: getHelpContent(input.question.helpLadder, nextIntervention)
    },
    nextQuestion: null,
    topicUpdate: {
      confidenceScore: input.topic.confidenceScore,
      nextRevisionAt: reviewTiming.nextRevisionAt,
      previousIntervalDays: reviewTiming.previousIntervalDays,
      lastReviewedAt: isoNow(now),
      retentionStability: retention.retentionStability,
      forgettingVelocity: retention.forgettingVelocity,
      misconceptionSignals,
      calibration
    },
    sessionDecision,
    scoringProvider: 'heuristic'
  };
}

export function getRequestedIntervention(input: {
  topic: RevisionTopic;
  question: RevisionQuestion;
  requestedType: 'nudge' | 'hint' | 'worked_step';
  currentInterventionLevel: RevisionInterventionType;
}): RevisionIntervention {
  const type: RevisionInterventionType =
    input.requestedType === 'hint' && input.currentInterventionLevel === 'none'
      ? 'nudge'
      : input.requestedType;

  return {
    type,
    content: getHelpContent(input.question.helpLadder, type)
  };
}

export function applyRevisionTurn(
  session: ActiveRevisionSession,
  result: RevisionTurnResult,
  options: { forceAdvance?: boolean; now?: Date } = {}
): ActiveRevisionSession {
  const now = options.now ?? new Date();
  const forceAdvance = options.forceAdvance ?? false;
  const isLastQuestion = session.questionIndex >= session.questions.length - 1;
  const shouldAdvance = (result.sessionDecision === 'continue' || forceAdvance) && !isLastQuestion;
  const shouldRepeat = result.sessionDecision === 'reschedule' && !forceAdvance;
  const nextQuestionIndex = shouldAdvance ? session.questionIndex + 1 : session.questionIndex;
  const skippedQuestionIds =
    forceAdvance && session.questions[session.questionIndex]
      ? Array.from(new Set([...session.skippedQuestionIds, session.questions[session.questionIndex]!.id]))
      : session.skippedQuestionIds;
  const nextStatus =
    result.sessionDecision === 'lesson_revisit'
      ? 'escalated_to_lesson'
      : shouldRepeat
        ? 'active'
        : shouldAdvance
          ? 'active'
          : 'completed';

  return {
    ...session,
    questionIndex: nextQuestionIndex,
    currentInterventionLevel: nextStatus === 'active' && !shouldAdvance && !forceAdvance
      ? result.intervention.type
      : 'none',
    currentHelp: null,
    awaitingAdvance: false,
    skippedQuestionIds,
    lastTurnResult: {
      ...result,
      nextQuestion:
        shouldRepeat
          ? session.questions[session.questionIndex]
          : shouldAdvance
            ? session.questions[nextQuestionIndex]
            : null
    },
    status: nextStatus,
    lastActiveAt: isoNow(now)
  };
}
