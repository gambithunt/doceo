import type { LessonMessage, LessonMessageType, LessonSession, LessonStage } from '$lib/types';

export interface TutorPromptSplit {
  body: string;
  prompt: string | null;
}

const TUTOR_PROMPT_CUE =
  /[?]|^(ask|answer|choose|classify|compare|complete|correct|identify|label|name|quote|rewrite|show|solve|start|tell|try)\b/i;
const NON_ACTIONABLE_TUTOR_PROMPT =
  /what feels clear so far|tell me where you want to slow down|does this connect for you\?\s*ask me anything|^if you want help, say\b/i;
const PROMPT_ELIGIBLE_MESSAGE_TYPES = new Set<LessonMessageType>(['teaching', 'feedback', 'question']);

export function splitTutorPrompt(content: string): TutorPromptSplit {
  const trimmed = content.trim();
  if (!trimmed) {
    return { body: content, prompt: null };
  }

  const blocks = trimmed
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  if (blocks.length < 2) {
    return { body: content, prompt: null };
  }

  const prompt = blocks.at(-1) ?? null;
  const bodyBlocks = blocks.slice(0, -1);

  if (
    !prompt ||
    bodyBlocks.length === 0 ||
    !TUTOR_PROMPT_CUE.test(prompt) ||
    NON_ACTIONABLE_TUTOR_PROMPT.test(prompt)
  ) {
    return { body: content, prompt: null };
  }

  return {
    body: bodyBlocks.join('\n\n'),
    prompt
  };
}

export function extractTutorPromptFromContent(content: string): string | null {
  const split = splitTutorPrompt(content);
  if (split.prompt) {
    return split.prompt;
  }

  const trimmed = content.trim();
  if (!trimmed || !TUTOR_PROMPT_CUE.test(trimmed) || NON_ACTIONABLE_TUTOR_PROMPT.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function isPromptEligibleMessage(
  message: LessonMessage | undefined,
  stage: LessonStage
): message is LessonMessage {
  return Boolean(
    message &&
      message.role === 'assistant' &&
      message.stage === stage &&
      PROMPT_ELIGIBLE_MESSAGE_TYPES.has(message.type)
  );
}

export function getLatestTutorPrompt(
  lessonSession: Pick<LessonSession, 'currentStage' | 'messages'>
): string | null {
  for (let index = lessonSession.messages.length - 1; index >= 0; index -= 1) {
    const message = lessonSession.messages[index];
    if (!isPromptEligibleMessage(message, lessonSession.currentStage)) {
      continue;
    }

    const prompt = extractTutorPromptFromContent(message.content);
    if (prompt) {
      return prompt;
    }
  }

  return null;
}

export function getLatestTutorTeachingAnchor(
  lessonSession: Pick<LessonSession, 'currentStage' | 'messages'>
): string | null {
  for (let index = lessonSession.messages.length - 1; index >= 0; index -= 1) {
    const message = lessonSession.messages[index];
    if (!isPromptEligibleMessage(message, lessonSession.currentStage)) {
      continue;
    }

    const split = splitTutorPrompt(message.content);
    const body = split.body.trim();
    if (body) {
      return body;
    }

    if (!split.prompt) {
      return message.content.trim() || null;
    }
  }

  return null;
}
