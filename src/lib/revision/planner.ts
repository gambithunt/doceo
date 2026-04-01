import type { AppState, RevisionPlan, RevisionPlanTopicSelection, UpcomingExam } from '$lib/types';

export interface RevisionPlanInput {
  subjectId: string;
  subjectName?: string;
  examName: string;
  examDate: string;
  mode: 'weak_topics' | 'full_subject' | 'manual';
  manualTopics?: string[];
  manualTopicSelections?: RevisionPlanTopicSelection[];
  timeBudgetMinutes?: number;
}

function unique(values: string[]): string[] {
  return values.filter((value, index, all) => value.length > 0 && all.indexOf(value) === index);
}

function normalizeTopicTitle(value: string): string {
  return value.trim().toLowerCase();
}

function uniqueSelections(values: Array<{ label: string; nodeId: string | null }>): Array<{ label: string; nodeId: string | null }> {
  return values.filter(
    (value, index, all) =>
      value.label.length > 0 &&
      all.findIndex(
        (candidate) =>
          candidate.label === value.label &&
          candidate.nodeId === value.nodeId
      ) === index
  );
}

function collectValidTopicTitlesForSubject(state: AppState, subjectId: string): Set<string> {
  const subject = state.curriculum.subjects.find((item) => item.id === subjectId);
  const titles = new Set<string>();

  for (const topic of subject?.topics ?? []) {
    titles.add(normalizeTopicTitle(topic.name));

    for (const subtopic of topic.subtopics) {
      titles.add(normalizeTopicTitle(subtopic.name));

      for (const lessonId of subtopic.lessonIds) {
        const lesson = state.lessons.find((item) => item.id === lessonId);

        if (lesson?.title) {
          titles.add(normalizeTopicTitle(lesson.title));
        }
      }
    }
  }

  for (const topic of state.revisionTopics) {
    if (topic.subjectId === subjectId) {
      titles.add(normalizeTopicTitle(topic.topicTitle));
    }
  }

  return titles;
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

function buildWeakTopicSelections(state: AppState, subjectId: string, subjectTopicFallbacks: Array<{ label: string; nodeId: string | null }>) {
  const weakTopics = state.revisionTopics
    .filter((topic) => topic.subjectId === subjectId)
    .sort((left, right) => left.confidenceScore - right.confidenceScore)
    .filter((topic) => topic.confidenceScore < 0.7)
    .map((topic) => ({
      label: topic.topicTitle,
      nodeId: topic.nodeId ?? null
    }));

  return uniqueSelections(weakTopics.length > 0 ? weakTopics.slice(0, 5) : subjectTopicFallbacks.slice(0, 5));
}

function buildFullSubjectSelections(
  state: AppState,
  subjectId: string,
  subjectTopicFallbacks: Array<{ label: string; nodeId: string | null }>
) {
  const studiedTopics = uniqueSelections(
    state.revisionTopics
      .filter((topic) => topic.subjectId === subjectId)
      .sort((left, right) => Date.parse(left.nextRevisionAt) - Date.parse(right.nextRevisionAt) || left.confidenceScore - right.confidenceScore)
      .map((topic) => ({
        label: topic.topicTitle,
        nodeId: topic.nodeId ?? null
      }))
  );

  return studiedTopics.length > 0 ? studiedTopics : subjectTopicFallbacks;
}

export function buildRevisionPlanFromInput(
  state: AppState,
  input: RevisionPlanInput,
  now = new Date()
): { plan: RevisionPlan; exam: UpcomingExam } {
  const subject =
    state.curriculum.subjects.find((item) => item.id === input.subjectId) ??
    (input.subjectName ? state.curriculum.subjects.find((item) => item.name === input.subjectName) : undefined) ??
    state.curriculum.subjects[0];
  const subjectTopicFallbacks = subject.topics.map((topic) => ({
    label: topic.name,
    nodeId: topic.id
  }));

  const validTopicTitles = collectValidTopicTitlesForSubject(state, subject.id);
  const requestedManualTopics = unique(input.manualTopics ?? []);
  const manualTopics = requestedManualTopics.filter((topic) => validTopicTitles.has(normalizeTopicTitle(topic)));
  const invalidManualTopics = requestedManualTopics.filter((topic) => !validTopicTitles.has(normalizeTopicTitle(topic)));
  const manualTopicSelections = uniqueSelections(
    (input.manualTopicSelections ?? []).map((selection) => ({
      label: selection.label.trim(),
      nodeId: selection.nodeId
    }))
  );

  if (input.mode === 'manual' && input.manualTopicSelections && input.manualTopicSelections.length === 0) {
    throw new Error(`Add at least one resolved topic for ${subject.name}.`);
  }

  if (input.mode === 'manual' && !input.manualTopicSelections && invalidManualTopics.length > 0) {
    throw new Error(`Selected topic does not belong to ${subject.name}.`);
  }

  const selectedTopicRefs = uniqueSelections(
    input.mode === 'manual'
      ? input.manualTopicSelections
        ? manualTopicSelections
        : manualTopics.map((topic) => {
            const curriculumTopic = subject.topics.find((item) => normalizeTopicTitle(item.name) === normalizeTopicTitle(topic));
            const curriculumSubtopic =
              curriculumTopic?.subtopics.find((item) => normalizeTopicTitle(item.name) === normalizeTopicTitle(topic)) ??
              subject.topics.flatMap((item) => item.subtopics).find((item) => normalizeTopicTitle(item.name) === normalizeTopicTitle(topic));

            return {
              label: topic,
              nodeId: curriculumSubtopic?.id ?? curriculumTopic?.id ?? null
            };
          })
      : input.mode === 'weak_topics'
        ? buildWeakTopicSelections(state, subject.id, subjectTopicFallbacks)
        : buildFullSubjectSelections(state, subject.id, subjectTopicFallbacks)
  );
  const selectedTopics = selectedTopicRefs.map((topic) => topic.label);
  const timestamp = now.toISOString();

  const plan: RevisionPlan = {
    id: `revision-plan-${crypto.randomUUID()}`,
    subjectId: subject.id,
    subjectName: subject.name,
    examName: input.examName,
    examDate: input.examDate,
    topics: selectedTopics,
    topicNodeIds: selectedTopicRefs.map((topic) => topic.nodeId),
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
    revisionPlanId: plan.id,
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
