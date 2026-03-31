import type { AppState, RevisionPlan, UpcomingExam } from '$lib/types';

export interface RevisionPlanInput {
  subjectId: string;
  examName: string;
  examDate: string;
  mode: 'weak_topics' | 'full_subject' | 'manual';
  manualTopics?: string[];
  timeBudgetMinutes?: number;
}

function unique(values: string[]): string[] {
  return values.filter((value, index, all) => value.length > 0 && all.indexOf(value) === index);
}

function buildSummary(subjectName: string, topics: string[], timeBudgetMinutes?: number): string {
  const budgetText = timeBudgetMinutes ? ` in focused ${timeBudgetMinutes}-minute blocks` : '';
  return `Prioritize ${topics[0] ?? subjectName}${budgetText}, then move through the remaining ${subjectName} topics with active recall and exam-style prompts.`;
}

function buildExamFocus(subjectName: string, timeBudgetMinutes?: number): string[] {
  return [
    'Show your method clearly.',
    'Connect each answer to the underlying concept.',
    timeBudgetMinutes
      ? `Use ${timeBudgetMinutes}-minute revision blocks and leave the last minutes for one retrieval check.`
      : `Revise ${subjectName} mistakes before doing speed work.`
  ];
}

export function buildRevisionPlanFromInput(
  state: AppState,
  input: RevisionPlanInput,
  now = new Date()
): { plan: RevisionPlan; exam: UpcomingExam } {
  const subject =
    state.curriculum.subjects.find((item) => item.id === input.subjectId) ??
    state.curriculum.subjects[0];
  const subjectTopicNames = subject.topics.map((topic) => topic.name);

  const weakTopics = state.revisionTopics
    .filter((topic) => topic.subjectId === subject.id)
    .sort((left, right) => left.confidenceScore - right.confidenceScore)
    .filter((topic) => topic.confidenceScore < 0.7)
    .map((topic) => topic.topicTitle);

  const selectedTopics = unique(
    input.mode === 'manual'
      ? input.manualTopics ?? []
      : input.mode === 'weak_topics'
        ? weakTopics.length > 0 ? weakTopics.slice(0, 5) : subjectTopicNames.slice(0, 5)
        : subjectTopicNames
  );
  const timestamp = now.toISOString();

  const plan: RevisionPlan = {
    id: `revision-plan-${crypto.randomUUID()}`,
    subjectId: subject.id,
    subjectName: subject.name,
    examName: input.examName,
    examDate: input.examDate,
    topics: selectedTopics,
    planStyle: input.mode,
    studyMode: input.mode,
    timeBudgetMinutes: input.timeBudgetMinutes,
    quickSummary: buildSummary(subject.name, selectedTopics, input.timeBudgetMinutes),
    keyConcepts: [
      `State the key vocabulary in ${subject.name} before attempting the harder questions.`,
      `Explain each step clearly instead of jumping to the answer in ${subject.name}.`,
      `Use spaced repetition across ${selectedTopics.length || 1} topic areas.`
    ],
    examFocus: buildExamFocus(subject.name, input.timeBudgetMinutes),
    weaknessDetection: `Watch for places where the learner can state an answer in ${subject.name} but cannot justify the step.`,
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const exam: UpcomingExam = {
    id: `exam-${crypto.randomUUID()}`,
    subjectId: subject.id,
    subjectName: subject.name,
    examName: input.examName,
    examDate: input.examDate,
    topics: selectedTopics,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  return { plan, exam };
}
