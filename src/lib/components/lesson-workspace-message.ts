export interface TutorPromptSplit {
  body: string;
  prompt: string | null;
}

const TUTOR_PROMPT_CUE = /[?]|^(ask|tell|try|put|explain|show|share|start)\b/i;

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

  if (!prompt || bodyBlocks.length === 0 || !TUTOR_PROMPT_CUE.test(prompt)) {
    return { body: content, prompt: null };
  }

  return {
    body: bodyBlocks.join('\n\n'),
    prompt
  };
}
