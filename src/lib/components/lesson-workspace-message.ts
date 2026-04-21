export interface TutorPromptSplit {
  body: string;
  prompt: string | null;
}

const TUTOR_PROMPT_CUE = /[?]|^(ask|answer|choose|classify|compare|complete|correct|identify|label|name|quote|rewrite|show|solve|start|tell|try)\b/i;
const NON_ACTIONABLE_TUTOR_PROMPT =
  /what feels clear so far|tell me where you want to slow down|does this connect for you\?\s*ask me anything|^if you want help, say\b/i;

export function splitTutorPrompt(content: string): TutorPromptSplit {
  const trimmed = content.trim();
  if (!trimmed) {
    return { body: content, prompt: null };
  }

  const blocks = trimmed.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
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
