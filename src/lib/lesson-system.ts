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

  if (update.struggled_with?.length) {
    next.concepts_struggled_with = Array.from(
      new Set([...next.concepts_struggled_with, ...update.struggled_with])
    );
  }

  if (update.excelled_at?.length) {
    next.concepts_excelled_at = Array.from(
      new Set([...next.concepts_excelled_at, ...update.excelled_at])
    );
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
    return `${lesson.deeperExplanation.body}\n\nThink of the method one careful step at a time so the rule stays clear.`;
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
    lessonPlan: lesson,
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
      body: `Today we are learning **${topicTitle}** in ${input.subjectName}. Start by naming the main ${lens.conceptWord} and what the learner should notice first. ${input.topicDescription}`
    },
    deeperExplanation: {
      title: 'Key Concepts',
      body: `Focus on ${topicTitle} as a ${lens.conceptWord} in ${input.subjectName}. A strong explanation should ${lens.actionWord}. Keep the explanation precise, use curriculum language where it helps, and avoid ${lens.misconception}.`
    },
    example: {
      title: 'Worked Example',
      body: `Worked example for **${topicTitle}**: ${lens.example} Then explain why the example matches ${topicTitle}, what clue to look for, and how to avoid ${lens.misconception}.`
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
      prompt: `In your own words, what is the main idea behind ${topicTitle} in ${subjectName}?`,
      expectedAnswer: topicTitle.toLowerCase(),
      acceptedAnswers: [topicTitle, topicTitle.toLowerCase()],
      rubric: `The answer should identify ${topicTitle} and explain the key idea clearly.`,
      explanation: `A strong answer names ${topicTitle} and explains what it does or how it works in ${subjectName}.`,
      hintLevels: [
        `Name the idea first: ${topicTitle}.`,
        `Then explain how it works in ${subjectName}.`
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
      prompt: `Give one example of ${topicTitle} in ${subjectName} and explain why it fits.`,
      expectedAnswer: topicTitle.toLowerCase(),
      acceptedAnswers: [topicTitle, topicTitle.toLowerCase()],
      rubric: `The answer should include an example and a brief explanation connected to ${topicTitle}.`,
      explanation: `The learner should be able to produce or identify an example and justify it.`,
      hintLevels: [
        'Use one small example instead of a long one.',
        `Point to the clue that shows ${topicTitle}.`
      ],
      misconceptionTags: [slugify(`${topicTitle}-example`)],
      difficulty: 'core',
      topicId: lesson.topicId,
      subtopicId: lesson.subtopicId
    }
  ];
}

function buildQuestionReply(session: LessonSession, lesson: Lesson, message: string): LessonChatResponse {
  const recap =
    session.currentStage === 'overview'
      ? lesson.overview.body
      : session.currentStage === 'concepts'
        ? lesson.deeperExplanation.body
        : session.currentStage === 'detail'
          ? lesson.deeperExplanation.body
          : session.currentStage === 'examples'
            ? lesson.example.body
            : 'we were checking how the idea works in practice';

  const reply = [
    `That question fits this topic, so let me answer it directly.`,
    '',
    `**Short answer:** ${message.replace(/\?+$/, '')} connects back to ${lesson.title.toLowerCase()} because the important move is to focus on the rule before the final answer.`,
    '',
    '---',
    '',
    `↩ **Back to where we were** — we were looking at ${recap.toLowerCase()}. Let's continue from there.`
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

  const nextBody =
    nextStage === 'concepts'
      ? lesson.deeperExplanation.body
      : nextStage === 'detail'
        ? `${lesson.deeperExplanation.body}\n\nLet's slow the reasoning down and make every move explicit.`
        : nextStage === 'examples'
          ? `${lesson.example.body}\n\n**Exam tip:** explain why each step works, not just what the answer is.`
          : `Let's check your understanding now.\n\n1. What is the main idea here?\n2. How would you apply it in a similar problem?\n3. What mistake should you avoid?`;

  return {
    displayContent: `Good. Let's build on that.\n\n${nextBody}`,
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
