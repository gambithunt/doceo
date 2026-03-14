import type {
  DoceoMeta,
  LearnerProfile,
  LearnerProfileUpdate,
  Lesson,
  LessonChatRequest,
  LessonChatResponse,
  LessonMessage,
  LessonSession,
  LessonStage,
  Question,
  RevisionTopic,
  ShortlistedTopic,
  UserProfile
} from '$lib/types';

export const LESSON_STAGE_ORDER: LessonStage[] = [
  'overview',
  'concepts',
  'detail',
  'examples',
  'check',
  'complete'
];

export const LESSON_STAGE_ICONS: Record<Exclude<LessonStage, 'complete'>, string> = {
  overview: '◎',
  concepts: '◈',
  detail: '◉',
  examples: '◇',
  check: '△'
};

export const LESSON_STAGE_LABELS: Record<LessonStage, string> = {
  overview: 'Overview',
  concepts: 'Key Concepts',
  detail: 'Deep Dive',
  examples: 'Examples',
  check: 'Check Understanding',
  complete: 'Complete'
};

const META_PATTERN = /<!-- DOCEO_META\n([\s\S]*?)\nDOCEO_META -->/;

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function toTopicLabel(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return 'Core Ideas';
  }

  return trimmed.replace(/\s+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getSubjectLens(subjectName: string): {
  conceptWord: string;
  actionWord: string;
  evidenceWord: string;
  example: string;
  misconception: string;
} {
  const lower = subjectName.toLowerCase();

  if (lower.includes('math')) {
    return {
      conceptWord: 'rule or relationship',
      actionWord: 'state the pattern and apply it step by step',
      evidenceWord: 'worked steps',
      example: 'Use one short sequence or equation and explain the rule before giving the answer.',
      misconception: 'jumping to the final answer without naming the rule first'
    };
  }

  if (lower.includes('language') || lower.includes('english') || lower.includes('afrikaans')) {
    return {
      conceptWord: 'language feature',
      actionWord: 'identify it in context and explain how it works in the sentence or passage',
      evidenceWord: 'a clear sentence example',
      example: 'Use a short sentence and point directly to the word or phrase that shows the idea.',
      misconception: 'naming the term without showing where it appears or what it does'
    };
  }

  if (lower.includes('science')) {
    return {
      conceptWord: 'scientific idea',
      actionWord: 'name the concept, describe the process, and connect it to an observation',
      evidenceWord: 'a simple experiment or real-world observation',
      example: 'Use one familiar investigation or everyday example and explain what it shows.',
      misconception: 'remembering the word but not the process or cause-and-effect'
    };
  }

  return {
    conceptWord: 'core idea',
    actionWord: 'identify the idea, explain it clearly, and apply it to one example',
    evidenceWord: 'one concrete example',
    example: 'Use a familiar example from the subject and explain why it fits.',
    misconception: 'repeating a keyword without explaining the reasoning'
  };
}

function isoNow(): string {
  return new Date().toISOString();
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function getStageNumber(stage: LessonStage): number {
  const index = LESSON_STAGE_ORDER.indexOf(stage);
  return index === -1 ? 1 : Math.min(index + 1, 5);
}

export function getNextStage(stage: LessonStage): LessonStage | null {
  const index = LESSON_STAGE_ORDER.indexOf(stage);

  if (index === -1 || index >= LESSON_STAGE_ORDER.length - 2) {
    return stage === 'check' ? 'complete' : null;
  }

  return LESSON_STAGE_ORDER[index + 1];
}

export function getStageIcon(stage: LessonStage): string {
  if (stage === 'complete') {
    return '✓';
  }

  return LESSON_STAGE_ICONS[stage];
}

export function getStageLabel(stage: LessonStage): string {
  return LESSON_STAGE_LABELS[stage];
}

export function classifyLessonMessage(text: string): 'question' | 'response' {
  const lower = text.toLowerCase().trim();
  const isQuestion =
    text.includes('?') ||
    lower.startsWith('what') ||
    lower.startsWith('why') ||
    lower.startsWith('how') ||
    lower.startsWith('can you') ||
    lower.startsWith('could you') ||
    lower.startsWith('explain') ||
    lower.startsWith("i don't understand") ||
    lower.startsWith('i dont understand') ||
    lower.startsWith('what do you mean') ||
    lower.startsWith('tell me more about');

  return isQuestion ? 'question' : 'response';
}

export function createDefaultLearnerProfile(studentId: string): LearnerProfile {
  const timestamp = isoNow();

  return {
    studentId,
    analogies_preference: 0.5,
    step_by_step: 0.5,
    visual_learner: 0.5,
    real_world_examples: 0.5,
    abstract_thinking: 0.5,
    needs_repetition: 0.5,
    quiz_performance: 0.5,
    total_sessions: 0,
    total_questions_asked: 0,
    total_reteach_events: 0,
    concepts_struggled_with: [],
    concepts_excelled_at: [],
    subjects_studied: [],
    created_at: timestamp,
    last_updated_at: timestamp
  };
}

export function updateLearnerProfile(
  profile: LearnerProfile,
  update: LearnerProfileUpdate,
  options?: { subjectName?: string; incrementQuestions?: boolean; incrementReteach?: boolean }
): LearnerProfile {
  const alpha = 0.3;
  const next = {
    ...profile,
    last_updated_at: isoNow()
  };
  const signals: Array<keyof Pick<
    LearnerProfile,
    | 'analogies_preference'
    | 'step_by_step'
    | 'visual_learner'
    | 'real_world_examples'
    | 'abstract_thinking'
    | 'needs_repetition'
    | 'quiz_performance'
  >> = [
    'analogies_preference',
    'step_by_step',
    'visual_learner',
    'real_world_examples',
    'abstract_thinking',
    'needs_repetition',
    'quiz_performance'
  ];

  for (const signal of signals) {
    const value = update[signal];

    if (typeof value === 'number') {
      next[signal] = clamp01((1 - alpha) * next[signal] + alpha * value);
    }
  }

  const MAX_CONCEPT_LIST = 25;

  if (update.struggled_with?.length) {
    const merged = Array.from(new Set([...update.struggled_with, ...next.concepts_struggled_with]));
    next.concepts_struggled_with = merged.slice(0, MAX_CONCEPT_LIST);
  }

  if (update.excelled_at?.length) {
    const merged = Array.from(new Set([...update.excelled_at, ...next.concepts_excelled_at]));
    next.concepts_excelled_at = merged.slice(0, MAX_CONCEPT_LIST);
  }

  if (options?.subjectName) {
    next.subjects_studied = Array.from(new Set([...next.subjects_studied, options.subjectName]));
  }

  if (options?.incrementQuestions) {
    next.total_questions_asked += 1;
  }

  if (options?.incrementReteach) {
    next.total_reteach_events += 1;
  }

  return next;
}

export function parseDoceoMeta(rawContent: string): DoceoMeta | null {
  const match = rawContent.match(META_PATTERN);

  if (!match) {
    return null;
  }

  try {
    const parsed = JSON.parse(match[1]) as DoceoMeta;

    if (!parsed.action || typeof parsed.confidence_assessment !== 'number') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function stripDoceoMeta(rawContent: string): string {
  return rawContent.replace(META_PATTERN, '').trim();
}

export function buildStageStartMessage(stage: LessonStage): LessonMessage {
  return {
    id: `msg-${crypto.randomUUID()}`,
    role: 'system',
    type: 'stage_start',
    content: `${getStageIcon(stage)} ${getStageLabel(stage)}`,
    stage,
    timestamp: isoNow(),
    metadata: null
  };
}

function getLessonSectionForStage(lesson: Lesson, stage: LessonStage): string {
  if (stage === 'overview') {
    return lesson.overview.body;
  }

  if (stage === 'concepts') {
    return lesson.deeperExplanation.body;
  }

  if (stage === 'detail') {
    return (lesson.detailedSteps ?? { body: lesson.deeperExplanation.body }).body;
  }

  if (stage === 'examples') {
    return lesson.example.body;
  }

  return `Let's check how well this is landing before we move on.`;
}

export function buildInitialLessonMessages(lesson: Lesson, stage: LessonStage): LessonMessage[] {
  const intro = getLessonSectionForStage(lesson, stage);
  const closingPrompt =
    stage === 'overview'
      ? 'Does this make sense so far? Reply to continue or ask a question anytime.'
      : stage === 'check'
        ? 'Try answering in your own words. What stands out to you first?'
        : 'Does this make sense? Tell me what feels clear or where you want to slow down.';

  return [
    buildStageStartMessage(stage),
    {
      id: `msg-${crypto.randomUUID()}`,
      role: 'assistant',
      type: 'teaching',
      content: `${intro}\n\n${closingPrompt}`,
      stage,
      timestamp: isoNow(),
      metadata: {
        action: 'stay',
        next_stage: null,
        reteach_style: null,
        reteach_count: 0,
        confidence_assessment: 0.5,
        profile_update: {}
      }
    }
  ];
}

export function buildLessonSessionFromTopic(
  profile: UserProfile,
  lesson: Lesson,
  topic: ShortlistedTopic,
  subjectName: string
): LessonSession {
  return {
    id: `lesson-session-${crypto.randomUUID()}`,
    studentId: profile.id,
    subjectId: lesson.subjectId,
    subject: subjectName,
    topicId: topic.topicId,
    topicTitle: topic.title,
    topicDescription: topic.description,
    curriculumReference: topic.curriculumReference,
    matchedSection: topic.title,
    lessonId: lesson.id,
    currentStage: 'overview',
    stagesCompleted: [],
    messages: buildInitialLessonMessages(lesson, 'overview'),
    questionCount: 0,
    reteachCount: 0,
    confidenceScore: 0.5,
    needsTeacherReview: false,
    stuckConcept: null,
    startedAt: isoNow(),
    lastActiveAt: isoNow(),
    completedAt: null,
    status: 'active',
    profileUpdates: []
  };
}

export function buildDynamicLessonFromTopic(input: {
  subjectId: string;
  subjectName: string;
  grade: string;
  topicTitle: string;
  topicDescription: string;
  curriculumReference: string;
}): Lesson {
  const topicTitle = toTopicLabel(input.topicTitle);
  const lens = getSubjectLens(input.subjectName);
  const rootId = `generated-${input.subjectId}-${slugify(topicTitle)}`;
  const topicId = `${rootId}-topic`;
  const subtopicId = `${rootId}-subtopic`;

  return {
    id: `${rootId}-lesson`,
    topicId,
    subtopicId,
    subjectId: input.subjectId,
    grade: input.grade,
    title: `${input.subjectName}: ${topicTitle}`,
    overview: {
      title: 'Overview',
      body: `In this lesson you're studying **${topicTitle}** — a key topic in ${input.subjectName} (${input.grade}). By the end you should be able to name the key ${lens.conceptWord}, explain how it works, and apply it to an example.`
    },
    deeperExplanation: {
      title: 'Key Concepts',
      body: `The main ${lens.conceptWord} in **${topicTitle}** is what holds the idea together. To understand ${topicTitle} in ${input.subjectName}, you need to ${lens.actionWord}. The most important thing to remember is to avoid ${lens.misconception} — focus on the underlying rule, not just the final answer.`
    },
    detailedSteps: {
      title: 'Step-by-Step',
      body: `Here is how to work through **${topicTitle}** one step at a time:\n\n**Step 1.** Identify what ${topicTitle} is asking you to do — read the problem carefully and name the ${lens.conceptWord} you are working with.\n\n**Step 2.** Write down what you know and what you need to find out.\n\n**Step 3.** Apply the rule for ${topicTitle}: ${lens.actionWord}.\n\n**Step 4.** Check your answer by asking: does it match the ${lens.evidenceWord}? Have I avoided ${lens.misconception}?\n\nTake each step one at a time before moving to the next.`
    },
    example: {
      title: 'Worked Example',
      body: `**Example — ${topicTitle} in ${input.subjectName}:**\n\n${lens.example}\n\nThis example works because it shows the ${lens.conceptWord} in action. Notice how each step stays connected to the rule for ${topicTitle}. Avoid ${lens.misconception} — always name the rule before you write the answer.`
    },
    practiceQuestionIds: [`${rootId}-q-1`],
    masteryQuestionIds: [`${rootId}-q-2`]
  };
}

export function buildDynamicQuestionsForLesson(lesson: Lesson, subjectName: string, topicTitle: string): Question[] {
  return [
    {
      id: lesson.practiceQuestionIds[0],
      lessonId: lesson.id,
      type: 'short-answer',
      prompt: `Explain how ${topicTitle} works in ${subjectName}. What is the key rule and why does it matter?`,
      expectedAnswer: `explain how ${slugify(topicTitle)} works`,
      acceptedAnswers: [],
      rubric: `A strong answer names the key rule for ${topicTitle}, explains why it works, and does not just repeat the topic name. The learner should show understanding, not memorisation.`,
      explanation: `Understanding ${topicTitle} means being able to say what the rule is, why it applies, and how to use it — not just naming the topic.`,
      hintLevels: [
        `Start by naming the main rule or pattern for ${topicTitle}.`,
        `Then explain what that rule means in ${subjectName} and when you would use it.`
      ],
      misconceptionTags: [slugify(topicTitle), slugify(subjectName)],
      difficulty: 'foundation',
      topicId: lesson.topicId,
      subtopicId: lesson.subtopicId
    },
    {
      id: lesson.masteryQuestionIds[0],
      lessonId: lesson.id,
      type: 'step-by-step',
      prompt: `Show how you would apply ${topicTitle} to solve a problem in ${subjectName}. Walk through your reasoning step by step.`,
      expectedAnswer: `apply ${slugify(topicTitle)} step by step`,
      acceptedAnswers: [],
      rubric: `The answer should show at least two steps of reasoning connected to ${topicTitle}, not just a final answer. The learner must justify each step.`,
      explanation: `Applying ${topicTitle} means showing the method, not just the result. Each step should be explained so the reasoning is visible.`,
      hintLevels: [
        `Write down what ${topicTitle} is asking you to do first.`,
        `Then apply the rule one step at a time and explain each move.`
      ],
      misconceptionTags: [slugify(`${topicTitle}-application`)],
      difficulty: 'core',
      topicId: lesson.topicId,
      subtopicId: lesson.subtopicId
    }
  ];
}

function buildQuestionReply(session: LessonSession, lesson: Lesson, _message: string): LessonChatResponse {
  const stageContent =
    session.currentStage === 'overview'
      ? lesson.overview.body
      : session.currentStage === 'concepts'
        ? lesson.deeperExplanation.body
        : session.currentStage === 'detail'
          ? (lesson.detailedSteps ?? { body: lesson.deeperExplanation.body }).body
          : session.currentStage === 'examples'
            ? lesson.example.body
            : 'the check question where you explain the idea in your own words';

  const topicName = lesson.title.replace(/^.*?:\s*/, '');

  const reply = [
    `Good question — let me clarify this within **${topicName}**.`,
    '',
    `The key thing to hold onto here is the core rule for ${topicName}: ${lesson.deeperExplanation.body.split('.')[0]}.`,
    '',
    `If that is what you were asking about, that is the anchor to keep in mind. If your question was about something more specific, try phrasing it in your own words and I will work through it with you.`,
    '',
    '---',
    '',
    `↩ **Back to the lesson** — we were working through: *${stageContent.split('\n')[0].replace(/\*\*/g, '')}*. Let's pick up from there.`
  ].join('\n');

  return {
    displayContent: reply,
    provider: 'local-fallback',
    metadata: {
      action: 'side_thread',
      next_stage: null,
      reteach_style: null,
      reteach_count: session.reteachCount,
      confidence_assessment: session.confidenceScore,
      profile_update: {
        step_by_step: 0.65
      }
    }
  };
}

function buildResponseReply(session: LessonSession, lesson: Lesson, message: string): LessonChatResponse {
  const lower = message.toLowerCase();
  const indicatesConfusion =
    lower.includes("don't get") ||
    lower.includes('confused') ||
    lower.includes('not sure') ||
    lower.includes('stuck');

  if (session.currentStage === 'check' && !indicatesConfusion) {
    return {
      displayContent: `Nice. You explained the idea clearly enough to finish this lesson.\n\n**Summary:** ${lesson.overview.body}\n\nYou can move this topic into revision next.`,
      provider: 'local-fallback',
      metadata: {
        action: 'complete',
        next_stage: null,
        reteach_style: null,
        reteach_count: 0,
        confidence_assessment: 0.86,
        profile_update: {
          quiz_performance: 0.86,
          excelled_at: [lesson.title]
        }
      }
    };
  }

  if (indicatesConfusion) {
    return {
      displayContent: `No worries, let me try that a different way.\n\n**Step 1:** Keep the main rule in view.\n**Step 2:** Match it to this topic.\n**Step 3:** Test it on one small example before doing the whole task.\n\nTell me if that version feels clearer.`,
      provider: 'local-fallback',
      metadata: {
        action: 'reteach',
        next_stage: null,
        reteach_style: 'step_by_step',
        reteach_count: session.reteachCount + 1,
        confidence_assessment: 0.38,
        profile_update: {
          step_by_step: 0.8,
          needs_repetition: 0.72,
          struggled_with: [lesson.title]
        }
      }
    };
  }

  const nextStage = getNextStage(session.currentStage);

  if (!nextStage) {
    return {
      displayContent: `Good. Let's stay with this point for one more pass before moving on.`,
      provider: 'local-fallback',
      metadata: {
        action: 'stay',
        next_stage: null,
        reteach_style: null,
        reteach_count: session.reteachCount,
        confidence_assessment: 0.61,
        profile_update: {
          abstract_thinking: 0.62
        }
      }
    };
  }

  const transitionLine =
    nextStage === 'check'
      ? `Good. Let's see how much has landed.`
      : `Good. Let's build on that.`;

  return {
    displayContent: transitionLine,
    provider: 'local-fallback',
      metadata: {
        action: 'advance',
        next_stage: nextStage,
        reteach_style: null,
        reteach_count: 0,
        confidence_assessment: 0.74,
        profile_update: {
          abstract_thinking: 0.66,
          quiz_performance: nextStage === 'check' ? 0.72 : undefined
        }
      }
    };
  }

export function buildLocalLessonChatResponse(
  request: LessonChatRequest,
  lesson: Lesson
): LessonChatResponse {
  if (request.messageType === 'question') {
    return buildQuestionReply(request.lessonSession, lesson, request.message);
  }

  return buildResponseReply(request.lessonSession, lesson, request.message);
}

export function applyLessonAssistantResponse(
  lessonSession: LessonSession,
  assistantMessage: LessonMessage
): LessonSession {
  const metadata = assistantMessage.metadata;
  const next: LessonSession = {
    ...lessonSession,
    messages: [...lessonSession.messages, assistantMessage],
    lastActiveAt: assistantMessage.timestamp,
    confidenceScore: metadata?.confidence_assessment ?? lessonSession.confidenceScore
  };

  if (!metadata) {
    return next;
  }

  if (metadata.action === 'side_thread') {
    return {
      ...next,
      questionCount: lessonSession.questionCount + 1,
      profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
    };
  }

  if (metadata.action === 'reteach') {
    return {
      ...next,
      reteachCount: metadata.reteach_count,
      needsTeacherReview: metadata.needs_teacher_review ?? lessonSession.needsTeacherReview,
      stuckConcept: metadata.stuck_concept ?? lessonSession.stuckConcept,
      profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
    };
  }

  if (metadata.action === 'advance' && metadata.next_stage) {
    const completed = Array.from(new Set([...lessonSession.stagesCompleted, lessonSession.currentStage]));

    return {
      ...next,
      currentStage: metadata.next_stage,
      stagesCompleted: completed,
      reteachCount: 0,
      profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
    };
  }

  if (metadata.action === 'complete') {
    const completed = Array.from(new Set([...lessonSession.stagesCompleted, lessonSession.currentStage]));

    return {
      ...next,
      currentStage: 'complete',
      stagesCompleted: completed,
      status: 'complete',
      completedAt: next.lastActiveAt,
      profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
    };
  }

  return {
    ...next,
    profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
  };
}

export function buildRevisionTopicFromLesson(lessonSession: LessonSession): RevisionTopic {
  const baseDate = lessonSession.completedAt ?? lessonSession.lastActiveAt;
  const nextRevision = new Date(baseDate);
  nextRevision.setDate(nextRevision.getDate() + 3);

  return {
    lessonSessionId: lessonSession.id,
    subjectId: lessonSession.subjectId,
    subject: lessonSession.subject,
    topicTitle: lessonSession.topicTitle,
    curriculumReference: lessonSession.curriculumReference,
    confidenceScore: lessonSession.confidenceScore,
    previousIntervalDays: 3,
    nextRevisionAt: nextRevision.toISOString(),
    lastReviewedAt: null
  };
}

export function calculateNextRevisionInterval(
  confidenceScore: number,
  previousInterval: number
): number {
  if (confidenceScore >= 0.9) {
    return Math.round(previousInterval * 2.5);
  }

  if (confidenceScore >= 0.7) {
    return Math.round(previousInterval * 2);
  }

  if (confidenceScore >= 0.5) {
    return Math.max(1, Math.round(previousInterval * 1.3));
  }

  if (confidenceScore >= 0.3) {
    return Math.max(1, Math.round(previousInterval * 0.7));
  }

  return 1;
}
