import type { ActiveRevisionSession, RevisionPlan, RevisionTopic, RevisionTopicCalibration } from '$lib/types';

export function sortRevisionPlans(plans: RevisionPlan[]): RevisionPlan[] {
  const statusWeight: Record<RevisionPlan['status'], number> = {
    active: 0,
    completed: 1,
    archived: 2
  };

  return plans
    .slice()
    .sort((left, right) => {
      if (statusWeight[left.status] !== statusWeight[right.status]) {
        return statusWeight[left.status] - statusWeight[right.status];
      }

      const leftExamDate = Date.parse(left.examDate);
      const rightExamDate = Date.parse(right.examDate);

      if (Number.isNaN(leftExamDate) || Number.isNaN(rightExamDate)) {
        return Date.parse(right.createdAt) - Date.parse(left.createdAt);
      }

      return leftExamDate - rightExamDate;
    });
}

export function formatPlanStyleLabel(style: RevisionPlan['planStyle']): string {
  switch (style) {
    case 'full_subject':
      return 'Full subject';
    case 'manual':
      return 'Manual plan';
    default:
      return 'Weak topics';
  }
}

export function describePlanStyle(style: RevisionPlan['planStyle']): string {
  switch (style) {
    case 'full_subject':
      return 'Covers the whole subject in a broad exam-prep sweep.';
    case 'manual':
      return 'Targets only the exact topics you chose.';
    default:
      return 'Pushes the weakest topics to the front first.';
  }
}

export function formatPlanTiming(examDate: string, now = new Date()): string {
  const exam = new Date(examDate);
  const diff = Math.ceil((exam.getTime() - now.getTime()) / 86400000);

  if (Number.isNaN(exam.getTime())) {
    return 'Exam date not set';
  }

  if (diff <= 0) {
    return diff < 0 ? `Exam passed ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} ago` : 'Exam is today';
  }

  if (diff === 1) {
    return 'Exam in 1 day';
  }

  return `Exam in ${diff} days`;
}

export function formatPlanDailyLabel(timeBudgetMinutes?: number): string {
  return `${timeBudgetMinutes ?? 20} min daily`;
}

export function getPlanPreviewTopics(plan: RevisionPlan): string[] {
  return plan.topics.slice(0, 3);
}

export function getPlanOverflowTopicCount(plan: RevisionPlan): number {
  return Math.max(0, plan.topics.length - getPlanPreviewTopics(plan).length);
}

const EMPTY_CALIBRATION: RevisionTopicCalibration = {
  attempts: 0,
  averageSelfConfidence: 0,
  averageCorrectness: 0,
  confidenceGap: 0,
  overconfidenceCount: 0,
  underconfidenceCount: 0
};

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function buildSyntheticTopic(
  plan: RevisionPlan,
  topicTitle: string,
  now: Date,
  subjectOverride?: { subjectId: string; subjectName: string }
): RevisionTopic {
  const subjectId = subjectOverride?.subjectId ?? plan.subjectId;
  const subjectName = subjectOverride?.subjectName ?? plan.subjectName;

  return {
    lessonSessionId: `synthetic-${subjectId}-${slugify(topicTitle)}`,
    subjectId,
    subject: subjectName,
    topicTitle,
    curriculumReference: `${subjectName} · ${topicTitle}`,
    confidenceScore: 0,
    previousIntervalDays: 1,
    nextRevisionAt: now.toISOString(),
    lastReviewedAt: null,
    retentionStability: 0.5,
    forgettingVelocity: 0.5,
    misconceptionSignals: [],
    calibration: { ...EMPTY_CALIBRATION },
    isSynthetic: true,
    hasLesson: false
  };
}

const sortByNeed = (left: RevisionTopic, right: RevisionTopic) => {
  const dueDiff = Date.parse(left.nextRevisionAt) - Date.parse(right.nextRevisionAt);
  return dueDiff !== 0 ? dueDiff : left.confidenceScore - right.confidenceScore;
};

function inferSubjectOverride(
  plan: RevisionPlan,
  topicTitle: string,
  revisionTopics: RevisionTopic[]
): { subjectId: string; subjectName: string } | undefined {
  const matches = revisionTopics.filter((topic) => topic.topicTitle.toLowerCase() === topicTitle.toLowerCase());

  if (matches.length !== 1) {
    return undefined;
  }

  const match = matches[0]!;

  if (match.subjectId === plan.subjectId) {
    return undefined;
  }

  return {
    subjectId: match.subjectId,
    subjectName: match.subject
  };
}

/**
 * Build the full ordered topic set for a plan session.
 * Topics named in the plan are included first; if a named topic has no RevisionTopic
 * (no lesson taken yet), a synthetic placeholder is created and flagged with isSynthetic.
 */
export function buildPlanTopicSet(
  plan: RevisionPlan,
  revisionTopics: RevisionTopic[],
  now = new Date()
): RevisionTopic[] {
  const sameSubject = revisionTopics.filter((t) => t.subjectId === plan.subjectId);

  if (plan.planStyle === 'full_subject') {
    // Use all topics the student has studied in this subject, sorted by need
    return sameSubject.length > 0 ? sameSubject.slice().sort(sortByNeed) : [];
  }

  // weak_topics and manual: build set from plan.topics names, preserving order
  const seen = new Set<string>();
  const result: RevisionTopic[] = [];

  for (const topicName of plan.topics) {
    const match = sameSubject.find((t) => t.topicTitle.toLowerCase() === topicName.toLowerCase());
    if (match && !seen.has(match.lessonSessionId)) {
      result.push(match);
      seen.add(match.lessonSessionId);
    } else if (!match) {
      const synthetic = buildSyntheticTopic(plan, topicName, now, inferSubjectOverride(plan, topicName, revisionTopics));
      if (!seen.has(synthetic.lessonSessionId)) {
        result.push(synthetic);
        seen.add(synthetic.lessonSessionId);
      }
    }
  }

  if (result.length === 0) {
    // Fallback: use same-subject topics sorted by need
    return sameSubject.slice().sort(sortByNeed);
  }

  // For weak_topics, sort real topics by need (synthetic stay as-is — all overdue)
  if (plan.planStyle === 'weak_topics') {
    return result.sort(sortByNeed);
  }

  return result;
}

/** Map a plan's style to the appropriate session mode. */
export function inferSessionMode(plan: RevisionPlan): ActiveRevisionSession['mode'] {
  if (plan.planStyle === 'full_subject') return 'shuffle';
  if (plan.planStyle === 'manual' && plan.topics.length >= 3) return 'shuffle';
  return 'deep_revision';
}

/** Calculate the target number of questions from a time budget (~6 min per question). */
export function inferQuestionCount(timeBudgetMinutes?: number, topicCount = 1): number {
  const budget = timeBudgetMinutes ?? 20;
  const raw = Math.round(budget / 6);
  return Math.max(topicCount, Math.min(12, raw));
}

export function pickPlanStartTopic(plan: RevisionPlan, topics: RevisionTopic[]): RevisionTopic | null {
  const sameSubjectTopics = topics.filter((topic) => topic.subjectId === plan.subjectId);

  const sortByNeed = (left: RevisionTopic, right: RevisionTopic) => {
    const dueDiff = Date.parse(left.nextRevisionAt) - Date.parse(right.nextRevisionAt);
    if (dueDiff !== 0) {
      return dueDiff;
    }

    return left.confidenceScore - right.confidenceScore;
  };

  const planNamedTopics = sameSubjectTopics
    .filter((topic) => plan.topics.some((item) => item.toLowerCase() === topic.topicTitle.toLowerCase()))
    .sort(sortByNeed);

  if (planNamedTopics[0]) {
    return planNamedTopics[0];
  }

  const sortedSameSubjectTopics = sameSubjectTopics.slice().sort(sortByNeed);

  if (sortedSameSubjectTopics[0]) {
    return sortedSameSubjectTopics[0];
  }

  return topics.slice().sort(sortByNeed)[0] ?? null;
}
