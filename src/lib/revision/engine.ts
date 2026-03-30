import type {
  ActiveRevisionSession,
  RevisionIntervention,
  RevisionInterventionType,
  RevisionQuestion,
  RevisionQuestionType,
  RevisionTopic,
  RevisionTurnResult
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

function buildPrompt(topic: RevisionTopic, type: RevisionQuestionType): string {
  switch (type) {
    case 'explain':
      return `Explain how ${topic.topicTitle} works and name one mistake to avoid.`;
    case 'apply':
      return `Apply ${topic.topicTitle} to one short example in ${topic.subject}.`;
    case 'spot_error':
      return `Spot one common mistake a student could make in ${topic.topicTitle} and fix it clearly.`;
    case 'transfer':
      return `Connect ${topic.topicTitle} to a different situation or new problem in ${topic.subject}.`;
    case 'teacher_mode':
      return `Teach ${topic.topicTitle} back to a student who is completely lost.`;
    default:
      return `Without looking at notes, what is the key idea in ${topic.topicTitle}?`;
  }
}

function buildQuestion(topic: RevisionTopic, type: RevisionQuestionType, index: number): RevisionQuestion {
  return {
    id: `${topic.lessonSessionId}-${type}-${index}`,
    revisionTopicId: topic.lessonSessionId,
    questionType: type,
    prompt: buildPrompt(topic, type),
    expectedSkills:
      type === 'recall'
        ? ['state the key idea', 'name one rule']
        : ['explain clearly', 'give one example', 'name one mistake'],
    misconceptionTags: [`${normalize(topic.topicTitle)}-core-gap`],
    difficulty: type === 'apply' || type === 'teacher_mode' ? 'core' : 'foundation'
  };
}

export function buildRevisionSession(
  topicOrTopics: RevisionTopic | RevisionTopic[],
  recommendationReason: string,
  mode: ActiveRevisionSession['mode'] = 'deep_revision',
  source: ActiveRevisionSession['source'] = 'do_today',
  now = new Date()
): ActiveRevisionSession {
  const topics = Array.isArray(topicOrTopics) ? topicOrTopics : [topicOrTopics];
  const primaryTopic = topics[0];

  if (!primaryTopic) {
    throw new Error('buildRevisionSession requires at least one revision topic');
  }

  const questionTypes: RevisionQuestionType[] =
    mode === 'quick_fire'
      ? ['recall']
      : mode === 'teacher_mode'
        ? ['recall', 'teacher_mode']
        : mode === 'shuffle'
          ? ['recall', 'apply', 'transfer']
          : ['recall', 'explain'];
  const questions =
    mode === 'shuffle' && topics.length > 1
      ? topics.map((topic, index) => buildQuestion(topic, questionTypes[index % questionTypes.length]!, index))
      : questionTypes.map((type, index) => buildQuestion(primaryTopic, type, index));

  return {
    id: `revision-session-${crypto.randomUUID()}`,
    revisionTopicId: primaryTopic.lessonSessionId,
    revisionTopicIds: topics.map((topic) => topic.lessonSessionId),
    mode,
    source,
    topicTitle: mode === 'shuffle' && topics.length > 1 ? 'Mixed shuffle session' : primaryTopic.topicTitle,
    recommendationReason,
    questions,
    questionIndex: 0,
    currentInterventionLevel: 'none',
    currentHelp: null,
    selfConfidenceHistory: [],
    lastTurnResult: null,
    status: 'active',
    startedAt: isoNow(now),
    lastActiveAt: isoNow(now)
  };
}

function buildInterventionContent(type: RevisionInterventionType, topic: RevisionTopic): string {
  switch (type) {
    case 'nudge':
      return `Start with the core rule for ${topic.topicTitle}, then give one concrete example from ${topic.subject}.`;
    case 'hint':
      return `Define ${topic.topicTitle}, explain how it works, then name one mistake to avoid.`;
    case 'worked_step':
      return `Use this structure: 1. define the idea, 2. explain the rule, 3. give one worked example.`;
    case 'mini_reteach':
      return `Reset the topic: state the idea, walk through the rule slowly, then connect it to one example in ${topic.subject}.`;
    case 'lesson_refer':
      return `This topic needs a fuller walkthrough. Go back into lesson mode so Doceo can reteach it step by step.`;
    case 'none':
    default:
      return '';
  }
}

function keywordCoverage(answer: string, topic: RevisionTopic): number {
  const answerTokens = tokenize(answer);
  const topicTokens = unique([topic.topicTitle, topic.subject, topic.curriculumReference].flatMap(tokenize));

  if (answerTokens.length === 0 || topicTokens.length === 0) {
    return 0;
  }

  const matches = topicTokens.filter((token) => answerTokens.includes(token)).length;
  return clamp(matches / Math.max(2, topicTokens.length), 0, 1);
}

function unique(values: string[]): string[] {
  return values.filter((value, index, all) => all.indexOf(value) === index);
}

function buildScores(answer: string, topic: RevisionTopic, selfConfidence: number) {
  const normalized = normalize(answer);
  const coverage = keywordCoverage(answer, topic);
  const completeness = clamp(answer.trim().length / 120, 0, 1);
  const reasoning = /(because|therefore|so that|which means|step|rule)/i.test(answer)
    ? clamp(0.45 + completeness * 0.45, 0, 1)
    : clamp(coverage * 0.7 + completeness * 0.15, 0, 1);
  const correctness = clamp(coverage * 0.55 + completeness * 0.35 + (normalized.includes('example') ? 0.1 : 0), 0, 1);
  const confidenceAlignment = clamp(1 - Math.abs(selfConfidence / 5 - correctness), 0, 1);

  return {
    correctness,
    reasoning,
    completeness,
    confidenceAlignment
  };
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

function buildNextReviewDate(topic: RevisionTopic, scores: ReturnType<typeof buildScores>, now: Date): { nextRevisionAt: string; previousIntervalDays: number } {
  const nextInterval =
    scores.correctness >= 0.75
      ? Math.max(4, Math.round(topic.previousIntervalDays * 1.6))
      : scores.correctness >= 0.5
        ? Math.max(2, Math.round(topic.previousIntervalDays * 1.1))
        : 1;

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
  now?: Date;
}): RevisionTurnResult {
  const now = input.now ?? new Date();
  const scores = buildScores(input.answer, input.topic, input.selfConfidence);
  const diagnosisType = buildDiagnosisType(input.answer, scores, input.selfConfidence);
  const nextIntervention = nextInterventionLevel(input.currentInterventionLevel, scores, input.attemptNumber);
  const reviewTiming = buildNextReviewDate(input.topic, scores, now);
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
      misconceptionTags: input.question.misconceptionTags
    },
    intervention: {
      type: nextIntervention,
      content: buildInterventionContent(nextIntervention, input.topic)
    },
    nextQuestion: null,
    topicUpdate: {
      confidenceScore: clamp((input.topic.confidenceScore + scores.correctness) / 2, 0, 1),
      nextRevisionAt: reviewTiming.nextRevisionAt,
      previousIntervalDays: reviewTiming.previousIntervalDays,
      lastReviewedAt: isoNow(now)
    },
    sessionDecision
  };
}

export function getRequestedIntervention(input: {
  topic: RevisionTopic;
  question: RevisionQuestion;
  requestedType: 'nudge' | 'hint';
  currentInterventionLevel: RevisionInterventionType;
}): RevisionIntervention {
  const type: RevisionInterventionType =
    input.requestedType === 'hint' && input.currentInterventionLevel === 'none' ? 'nudge' : input.requestedType;

  return {
    type,
    content: buildInterventionContent(type, input.topic)
  };
}

export function applyRevisionTurn(
  session: ActiveRevisionSession,
  result: RevisionTurnResult,
  now = new Date()
): ActiveRevisionSession {
  const shouldAdvance = result.sessionDecision === 'continue' && session.questionIndex < session.questions.length - 1;
  const shouldRepeat = result.sessionDecision === 'reschedule';
  const nextQuestionIndex = shouldAdvance ? session.questionIndex + 1 : session.questionIndex;

  return {
    ...session,
    questionIndex: nextQuestionIndex,
    currentInterventionLevel: result.intervention.type,
    currentHelp: null,
    lastTurnResult: {
      ...result,
      nextQuestion:
        shouldRepeat ? session.questions[session.questionIndex] :
        shouldAdvance ? session.questions[nextQuestionIndex] :
        null
    },
    status:
      result.sessionDecision === 'lesson_revisit'
        ? 'escalated_to_lesson'
        : shouldAdvance || shouldRepeat
          ? 'active'
          : 'completed',
    lastActiveAt: isoNow(now)
  };
}
