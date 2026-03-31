import type { RevisionPlan, RevisionTopic } from '$lib/types';

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

export function getPlanPreviewTopics(plan: RevisionPlan): string[] {
  return plan.topics.slice(0, 3);
}

export function getPlanOverflowTopicCount(plan: RevisionPlan): number {
  return Math.max(0, plan.topics.length - getPlanPreviewTopics(plan).length);
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
