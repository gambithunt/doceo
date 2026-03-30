import type { AppState, RevisionTopic } from '$lib/types';

export interface RevisionRecommendation {
  topic: RevisionTopic;
  priority: number;
  reason: string;
  cues: string[];
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

function getNearestExam(state: AppState, now: Date): RevisionExamSnapshot | null {
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

function createRecommendation(topic: RevisionTopic, state: AppState, now: Date): RevisionRecommendation {
  const cues: Array<{ weight: number; text: string }> = [];
  const dueDate = new Date(topic.nextRevisionAt);
  const lastReviewedAt = topic.lastReviewedAt ? new Date(topic.lastReviewedAt) : null;
  const daysUntilDue = differenceInCalendarDays(dueDate, now);
  const daysOverdue = Math.max(0, -daysUntilDue);
  const nearestExam = getNearestExam(state, now);
  const isExamSubject = nearestExam?.subjectId === topic.subjectId;
  const isExamTopic =
    state.revisionPlan.topics.some((item) => item.toLowerCase() === topic.topicTitle.toLowerCase()) && isExamSubject;

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

  return {
    topic,
    priority,
    reason: cues[0]?.text ?? 'Ready for reinforcement',
    cues: cues.map((cue) => cue.text)
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
    ctaLabel: 'Start revision'
  };
}

export function deriveRevisionHomeModel(state: AppState, now = new Date()): RevisionHomeModel {
  const recommendations = state.revisionTopics
    .map((topic) => createRecommendation(topic, state, now))
    .sort((left, right) => right.priority - left.priority);

  const nearestExam = getNearestExam(state, now);
  const doToday = recommendations.slice(0, 6);
  const focusWeaknesses = recommendations
    .filter((item) => item.topic.confidenceScore < 0.55 || item.reason.includes('shaky'))
    .slice(0, 4);
  const hero = doToday[0] ? buildHero(doToday[0], nearestExam) : null;

  return {
    hero,
    doToday,
    focusWeaknesses,
    nearestExam
  };
}
