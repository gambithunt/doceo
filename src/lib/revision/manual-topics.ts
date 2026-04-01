import type { ShortlistedTopic } from '$lib/types';

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function parseManualTopicDraft(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  );
}

export function appendManualTopic(currentTopics: string[], topic: string): string[] {
  const next = topic.trim();

  if (!next) {
    return currentTopics;
  }

  if (currentTopics.some((item) => normalize(item) === normalize(next))) {
    return currentTopics;
  }

  return [...currentTopics, next];
}

export function resolveMatchedManualTopics(input: {
  selectedTopics: string[];
  draft: string;
  matches: Array<Pick<ShortlistedTopic, 'title'> | null>;
}): string[] {
  if (input.selectedTopics.length > 0) {
    return Array.from(new Set(input.selectedTopics.map((item) => item.trim()).filter((item) => item.length > 0)));
  }

  const draftTopics = parseManualTopicDraft(input.draft);

  return Array.from(
    new Set(
      draftTopics.map((topic, index) => input.matches[index]?.title?.trim() || topic).filter((item) => item.length > 0)
    )
  );
}
