import { buildLocalLessonChatResponse, parseDoceoMeta, stripDoceoMeta } from '$lib/lesson-system';
import type { Lesson, LessonChatRequest, LessonChatResponse } from '$lib/types';

export interface GithubModelsMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GithubModelsRequestBody {
  model: string;
  messages: GithubModelsMessage[];
  temperature: number;
}

export interface GithubModelsSuccessResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

function getLastMessageType(lessonSession: LessonChatRequest['lessonSession']): string {
  return lessonSession.messages.at(-1)?.type ?? 'none';
}

function getCurrentStageContent(request: LessonChatRequest): string {
  const stage = request.lessonSession.currentStage;
  const lesson = request.lesson;

  if (stage === 'orientation') return lesson.orientation.body;
  if (stage === 'concepts') return lesson.concepts.body;
  if (stage === 'construction') return lesson.guidedConstruction.body;
  if (stage === 'examples') return lesson.workedExample.body;
  if (stage === 'practice') return lesson.practicePrompt.body;
  if (stage === 'complete') return lesson.summary.body;

  return 'Ask the learner to explain the idea in their own words and apply it to a small example.';
}

const SIGNAL_THRESHOLD_HIGH = 0.65;
const SIGNAL_THRESHOLD_LOW = 0.35;

function buildLearnerInstructions(profile: LessonChatRequest['learnerProfile']): string {
  const instructions: string[] = [];

  if (profile.step_by_step >= SIGNAL_THRESHOLD_HIGH) {
    instructions.push('This learner prefers step-by-step explanations. Break every concept into numbered steps and do not skip ahead.');
  }
  if (profile.analogies_preference >= SIGNAL_THRESHOLD_HIGH) {
    instructions.push('This learner responds well to analogies. Connect new ideas to familiar real-world situations.');
  }
  if (profile.visual_learner >= SIGNAL_THRESHOLD_HIGH) {
    instructions.push('This learner is visual. Use structured layouts, bullet points, and spatial descriptions where possible.');
  }
  if (profile.real_world_examples >= SIGNAL_THRESHOLD_HIGH) {
    instructions.push('This learner benefits from real-world examples. Ground every concept in a concrete, everyday scenario.');
  }
  if (profile.needs_repetition >= SIGNAL_THRESHOLD_HIGH) {
    instructions.push('This learner needs repetition. Briefly restate the key rule before introducing the next idea.');
  }
  if (profile.abstract_thinking <= SIGNAL_THRESHOLD_LOW) {
    instructions.push('This learner finds abstract reasoning difficult. Keep explanations concrete and avoid symbolic notation unless necessary.');
  }

  const struggledWith = profile.concepts_struggled_with.slice(0, 10);
  if (struggledWith.length > 0) {
    instructions.push(`Topics this learner has found difficult before: ${struggledWith.join(', ')}. Be patient and thorough if these come up.`);
  }

  if (instructions.length === 0) {
    instructions.push('Adapt your explanation style based on how the learner responds during the session.');
  }

  return instructions.join('\n');
}

export function buildSystemPrompt(request: LessonChatRequest): string {
  const lesson = request.lesson;

  const doceoMetaSchema = `After every response, end with this exact block (replace values appropriately):
<!-- DOCEO_META
{
  "action": "advance" | "reteach" | "side_thread" | "complete" | "stay",
  "next_stage": "orientation" | "concepts" | "construction" | "examples" | "practice" | "check" | "complete" | null,
  "reteach_style": "analogy" | "example" | "step_by_step" | "visual" | null,
  "reteach_count": <integer>,
  "confidence_assessment": <float 0.0–1.0>,
  "needs_teacher_review": false,
  "stuck_concept": null,
  "profile_update": {
    "step_by_step": <float 0–1 or omit>,
    "analogies_preference": <float 0–1 or omit>,
    "visual_learner": <float 0–1 or omit>,
    "real_world_examples": <float 0–1 or omit>,
    "abstract_thinking": <float 0–1 or omit>,
    "needs_repetition": <float 0–1 or omit>,
    "quiz_performance": <float 0–1 or omit>,
    "struggled_with": [],
    "excelled_at": []
  }
}
DOCEO_META -->

Rules:
- Set "action" to "advance" ONLY when the learner has answered a check question with a substantive response that demonstrates real understanding. A learner saying "continue", "next", "ok", "yes", "sure", "I think I understand this", or any single-word or short acknowledgement does NOT qualify — respond by asking a specific check question instead (e.g. "Can you explain why...?" or "What do you think would happen if...?").
- Set "action" to "reteach" when the learner is confused or stuck.
- Set "action" to "side_thread" when the learner asks an off-topic question.
- Set "action" to "complete" only when the final check stage is done with confidence >= 0.7.
- Set "action" to "stay" when uncertain or when waiting for a substantive answer before advancing.
- When advancing, write only a brief 1–2 sentence acknowledgment. Do NOT include or summarise the next stage content — the system loads it automatically.
- "next_stage" must be the next stage name when action is "advance", otherwise null.
- "confidence_assessment" reflects how well the learner understood this exchange (0 = no understanding, 1 = full mastery).`;

  return [
    `You are Doceo, an adaptive tutor for South African school students.`,
    ``,
    `--- STUDENT ---`,
    `Name: ${request.student.fullName}`,
    `Country: ${request.student.country}`,
    `Curriculum: ${request.student.curriculum}`,
    `Grade: ${request.student.grade}`,
    `Subject: ${request.lessonSession.subject}`,
    `Term: ${request.student.term}`,
    `Year: ${request.student.schoolYear}`,
    ``,
    `--- LESSON ---`,
    `Topic: ${request.lessonSession.topicTitle}`,
    `Description: ${request.lessonSession.topicDescription}`,
    `Curriculum Reference: ${request.lessonSession.curriculumReference}`,
    `Lesson Orientation: ${lesson?.orientation?.body ?? ''}`,
    `Lesson Key Concepts: ${lesson?.concepts?.body ?? ''}`,
    ...(lesson?.keyConcepts?.length
      ? [`Lesson Key Concept Cards (pre-loaded for student):\n${lesson.keyConcepts.map((c, i) => `  ${i + 1}. ${c.name}: ${c.summary}`).join('\n')}`]
      : []),
    `Lesson Guided Construction: ${lesson?.guidedConstruction?.body ?? ''}`,
    `Lesson Worked Example: ${lesson?.workedExample?.body ?? ''}`,
    ``,
    `--- SESSION ---`,
    `Current Stage: ${request.lessonSession.currentStage}`,
    `Current Stage Content: ${getCurrentStageContent(request)}`,
    `Stages Completed: ${request.lessonSession.stagesCompleted.join(', ') || 'none'}`,
    `Questions Asked This Session: ${request.lessonSession.questionCount}`,
    `Reteach Attempts on Current Concept: ${request.lessonSession.reteachCount}`,
    `Last Message Type: ${getLastMessageType(request.lessonSession)}`,
    ``,
    `--- LEARNER PROFILE ---`,
    `Learner Profile:`,
    buildLearnerInstructions(request.learnerProfile),
    ``,
    `--- INSTRUCTIONS ---`,
    `Always speak directly to ${request.student.fullName} using "you" and "your" — never "students", "learners", "they", or "their". Use their name naturally once or twice per response, especially when encouraging or redirecting.`,
    `Teach only the chosen topic. Do not substitute a different topic.`,
    `When the student asks a question, answer it within the topic and always return to the lesson.`,
    `Use markdown for readability. Short sentences. Explicit reasoning.`,
    `In the concepts stage: introduce no more than 2–3 ideas before checking understanding. Connect each concept to the previous one. Do not dump a flat list — teach each idea with a reason and a brief example, then ask the learner to engage before moving to the next.`,
    `Within your teaching content, always include a specific question that requires the learner to think, explain, or apply — not a yes/no question. Never rely on "Does this make sense?" alone as your only question.`,
    ``,
    `--- DOCEO_META FORMAT (required at end of every response) ---`,
    doceoMetaSchema
  ].join('\n');
}

const MAX_HISTORY_MESSAGES = 20;

export function createLessonChatBody(
  request: LessonChatRequest,
  model: string
): GithubModelsRequestBody {
  const history = request.lessonSession.messages
    .filter((message) => message.role === 'assistant' || message.role === 'user')
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({
      role: message.role as 'user' | 'assistant',
      content: message.content
    }));

  return {
    model,
    temperature: 0.4,
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(request)
      },
      ...history,
      {
        role: 'user',
        content: `[STAGE: ${request.lessonSession.currentStage}, TYPE: ${request.messageType}]\n\n${request.message}`
      }
    ]
  };
}

export function parseLessonChatResponse(
  payload: GithubModelsSuccessResponse
): LessonChatResponse | null {
  const content = payload.choices[0]?.message.content;

  if (!content) {
    return null;
  }

  return {
    displayContent: stripDoceoMeta(content),
    metadata: parseDoceoMeta(content),
    provider: 'github-models'
  };
}

export function buildFallbackLessonChatResponse(
  request: LessonChatRequest,
  lesson: Lesson
): LessonChatResponse {
  return buildLocalLessonChatResponse(request, lesson);
}
