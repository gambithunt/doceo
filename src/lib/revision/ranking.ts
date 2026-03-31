import type { AppState, RevisionTopic } from '$lib/types';

type RecommendedRevisionMode = 'quick_fire' | 'deep_revision' | 'teacher_mode';

export interface RevisionRecommendation {
  topic: RevisionTopic;
  priority: number;
  reason: string;
  cues: string[];
  suggestedMode: RecommendedRevisionMode;
  suggestedModeReason: string;
}

export interface RevisionHeroRecommendation extends RevisionRecommendation {
  heading: string;
  summary: string;
  ctaLabel: string;
}

export interface RevisionExamSnapshot {
  subjectId: string;
  examDate: string;
  daysUntilExam: number;
}

export interface RevisionHomeModel {
  hero: RevisionHeroRecommendation | null;
  doToday: RevisionRecommendation[];
  focusWeaknesses: RevisionRecommendation[];
  nearestExam: RevisionExamSnapshot | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toStartOfDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function differenceInCalendarDays(left: Date, right: Date): number {
  return Math.round((toStartOfDay(left) - toStartOfDay(right)) / 86400000);
}

function getActiveRevisionPlan(state: AppState) {
  return (
    state.revisionPlans.find((plan) => plan.id === state.activeRevisionPlanId) ??
    state.revisionPlans[0] ??
    state.revisionPlan
  );
}

function getNearestExam(state: AppState, now: Date): RevisionExamSnapshot | null {
  const activePlan = getActiveRevisionPlan(state);
  const activePlanDate = new Date(activePlan.examDate);

  if (activePlan && !Number.isNaN(activePlanDate.getTime())) {
    return {
      subjectId: activePlan.subjectId,
      examDate: activePlan.examDate,
      daysUntilExam: differenceInCalendarDays(activePlanDate, now)
    };
  }

  const upcomingExam = state.upcomingExams
    .slice()
    .sort((left, right) => new Date(left.examDate).getTime() - new Date(right.examDate).getTime())
    .find((exam) => !Number.isNaN(new Date(exam.examDate).getTime()));

  if (upcomingExam) {
    const examDate = new Date(upcomingExam.examDate);

    return {
      subjectId: upcomingExam.subjectId,
      examDate: upcomingExam.examDate,
      daysUntilExam: differenceInCalendarDays(examDate, now)
    };
  }

  const examDate = new Date(state.revisionPlan.examDate);

  if (Number.isNaN(examDate.getTime())) {
    return null;
  }

  return {
    subjectId: state.revisionPlan.subjectId,
    examDate: state.revisionPlan.examDate,
    daysUntilExam: differenceInCalendarDays(examDate, now)
  };
}

function buildExamReason(exam: RevisionExamSnapshot): string {
  if (exam.daysUntilExam <= 1) {
    return 'Exam topic for tomorrow';
  }

  if (exam.daysUntilExam <= 7) {
    return 'Exam topic for next week';
  }

  return `Exam topic for the next ${exam.daysUntilExam} days`;
}

function getCalibrationCue(topic: RevisionTopic): { weight: number; text: string } | null {
  const gap = topic.calibration.confidenceGap;

  if (gap >= 0.22 || topic.calibration.overconfidenceCount >= 2) {
    return {
      weight: 46 + Math.round(gap * 18),
      text: 'You felt sure here, but the answer quality slipped'
    };
  }

  if (gap <= -0.22 || topic.calibration.underconfidenceCount >= 2) {
    return {
      weight: 20 + Math.round(Math.abs(gap) * 16),
      text: 'You know more than you think here'
    };
  }

  return null;
}

function getFragilityCue(topic: RevisionTopic): { weight: number; text: string } | null {
  if (topic.retentionStability <= 0.35 || topic.forgettingVelocity >= 0.72) {
    return {
      weight: 40 + Math.round((1 - topic.retentionStability) * 12 + topic.forgettingVelocity * 10),
      text: 'This one improves, then slips again'
    };
  }

  if (topic.retentionStability <= 0.5 || topic.forgettingVelocity >= 0.58) {
    return {
      weight: 22 + Math.round((1 - topic.retentionStability) * 10),
      text: 'Still fragile without a recent recheck'
    };
  }

  return null;
}

function getMisconceptionCue(topic: RevisionTopic): { weight: number; text: string } | null {
  const strongestSignal = topic.misconceptionSignals
    .slice()
    .sort((left, right) => right.count - left.count)[0];

  if (!strongestSignal || strongestSignal.count < 2) {
    return null;
  }

  return {
    weight: 26 + strongestSignal.count * 6,
    text: 'Repeated misconception signal'
  };
}

function getSuggestedMode(topic: RevisionTopic): {
  mode: RecommendedRevisionMode;
  reason: string;
} {
  const repeatedMisconception = topic.misconceptionSignals.some((signal) => signal.count >= 2);
  const overconfidence = topic.calibration.confidenceGap >= 0.22 || topic.calibration.overconfidenceCount >= 2;
  const fragile = topic.retentionStability <= 0.5 || topic.forgettingVelocity >= 0.58 || topic.confidenceScore < 0.5;
  const stable = topic.confidenceScore >= 0.72 && topic.retentionStability >= 0.68 && topic.forgettingVelocity <= 0.35;

  if (repeatedMisconception || overconfidence) {
    return {
      mode: 'teacher_mode',
      reason: 'Explain it back to expose the gap clearly.'
    };
  }

  if (fragile) {
    return {
      mode: 'deep_revision',
      reason: 'This topic needs a structured recall-and-recheck loop.'
    };
  }

  if (stable) {
    return {
      mode: 'quick_fire',
      reason: 'A short recall check is enough to keep this topic warm.'
    };
  }

  return {
    mode: 'deep_revision',
    reason: 'Use a full revision pass to check understanding and application.'
  };
}

function createRecommendation(topic: RevisionTopic, state: AppState, now: Date): RevisionRecommendation {
  const cues: Array<{ weight: number; text: string }> = [];
  const dueDate = new Date(topic.nextRevisionAt);
  const lastReviewedAt = topic.lastReviewedAt ? new Date(topic.lastReviewedAt) : null;
  const daysUntilDue = differenceInCalendarDays(dueDate, now);
  const daysOverdue = Math.max(0, -daysUntilDue);
  const nearestExam = getNearestExam(state, now);
  const isExamSubject = nearestExam?.subjectId === topic.subjectId;
  const activePlan = getActiveRevisionPlan(state);
  const isExamTopic =
    activePlan.topics.some((item) => item.toLowerCase() === topic.topicTitle.toLowerCase()) && isExamSubject;

  let priority = 0;

  if (daysOverdue > 0) {
    const weight = 70 + clamp(daysOverdue, 1, 7) * 8;
    priority += weight;
    cues.push({ weight, text: daysOverdue > 1 ? `Overdue by ${daysOverdue} days` : 'Due today' });
  } else if (daysUntilDue === 0) {
    priority += 62;
    cues.push({ weight: 62, text: 'Due today' });
  } else if (daysUntilDue <= 2) {
    priority += 32 - daysUntilDue * 6;
    cues.push({ weight: 30, text: 'Ready for recall before it slips' });
  }

  if (topic.confidenceScore < 0.45) {
    const weight = 54 + Math.round((0.45 - topic.confidenceScore) * 50);
    priority += weight;
    cues.push({ weight, text: 'You were shaky on this last time' });
  } else if (topic.confidenceScore < 0.65) {
    const weight = 28 + Math.round((0.65 - topic.confidenceScore) * 30);
    priority += weight;
    cues.push({ weight, text: 'Still needs tightening' });
  }

  if (nearestExam && nearestExam.daysUntilExam >= 0 && (isExamTopic || isExamSubject)) {
    const examWeightBase = clamp(35 - nearestExam.daysUntilExam * 3, 8, 35);
    const weight = isExamTopic ? examWeightBase + 12 : examWeightBase;
    priority += weight;
    cues.push({ weight, text: buildExamReason(nearestExam) });
  }

  const calibrationCue = getCalibrationCue(topic);
  if (calibrationCue) {
    priority += calibrationCue.weight;
    cues.push(calibrationCue);
  }

  const fragilityCue = getFragilityCue(topic);
  if (fragilityCue) {
    priority += fragilityCue.weight;
    cues.push(fragilityCue);
  }

  const misconceptionCue = getMisconceptionCue(topic);
  if (misconceptionCue) {
    priority += misconceptionCue.weight;
    cues.push(misconceptionCue);
  }

  if (lastReviewedAt) {
    const daysSinceReview = differenceInCalendarDays(now, lastReviewedAt);
    if (daysSinceReview <= 2 && topic.confidenceScore < 0.5) {
      priority += 18;
      cues.push({ weight: 18, text: 'You struggled with this recently' });
    }

    if (daysSinceReview <= 1 && daysOverdue === 0 && topic.confidenceScore >= 0.75) {
      priority -= 24;
    }
  } else {
    priority += 14;
    cues.push({ weight: 14, text: 'Recently learned and ready for reinforcement' });
  }

  cues.sort((left, right) => right.weight - left.weight);
  const suggestedMode = getSuggestedMode(topic);

  return {
    topic,
    priority,
    reason: cues[0]?.text ?? 'Ready for reinforcement',
    cues: cues.map((cue) => cue.text),
    suggestedMode: suggestedMode.mode,
    suggestedModeReason: suggestedMode.reason
  };
}

function buildHero(recommendation: RevisionRecommendation, exam: RevisionExamSnapshot | null): RevisionHeroRecommendation {
  const examContext =
    exam && exam.subjectId === recommendation.topic.subjectId
      ? exam.daysUntilExam <= 0
        ? 'Exam day is here.'
        : `Exam in ${exam.daysUntilExam} day${exam.daysUntilExam === 1 ? '' : 's'}.`
      : 'Revision is due now.';

  return {
    ...recommendation,
    heading: 'Revise this now',
    summary: `${examContext} ${recommendation.topic.topicTitle} needs attention next.`,
    ctaLabel:
      recommendation.suggestedMode === 'teacher_mode'
        ? 'Start teacher mode'
        : recommendation.suggestedMode === 'quick_fire'
          ? 'Start quick-fire'
          : 'Start deep revision'
  };
}

export function deriveRevisionHomeModel(state: AppState, now = new Date()): RevisionHomeModel {
  const recommendations = state.revisionTopics
    .map((topic) => createRecommendation(topic, state, now))
    .sort((left, right) => right.priority - left.priority);

  const nearestExam = getNearestExam(state, now);
  const doToday = recommendations.slice(0, 6);
  const focusWeaknesses = recommendations
    .filter(
      (item) =>
        item.topic.confidenceScore < 0.55 ||
        item.reason.includes('shaky') ||
        Math.abs(item.topic.calibration.confidenceGap) >= 0.22 ||
        item.topic.retentionStability <= 0.5 ||
        item.topic.forgettingVelocity >= 0.58 ||
        item.topic.misconceptionSignals.some((signal) => signal.count >= 2)
    )
    .slice(0, 4);
  const hero = doToday[0] ? buildHero(doToday[0], nearestExam) : null;

  return {
    hero,
    doToday,
    focusWeaknesses,
    nearestExam
  };
}
