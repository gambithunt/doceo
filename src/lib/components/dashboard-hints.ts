import type { Subject } from '$lib/types';

export interface HintChip {
  id: string;
  label: string;
}

export interface HintChipGroup {
  groupLabel: string;
  chips: HintChip[];
}

export function extractHintChipLabels(hintsText: string): string[] {
  return Array.from(
    new Set(
      hintsText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    )
  );
}

/**
 * Groups chips by matching them to the curriculum's topic/subtopic tree.
 * Falls back to a single flat group (groupLabel = '') when fewer than half
 * of the chips can be matched to a known topic.
 */
export function groupHintChips(chips: HintChip[], subject: Subject | undefined): HintChipGroup[] {
  if (!subject || chips.length === 0) return [];

  // Build lookup: normalized label → parent topic display name
  const lookup = new Map<string, string>();
  for (const topic of subject.topics) {
    lookup.set(topic.name.trim().toLowerCase(), topic.name);
    for (const subtopic of topic.subtopics) {
      lookup.set(subtopic.name.trim().toLowerCase(), topic.name);
    }
  }

  const grouped = new Map<string, HintChip[]>();
  const ungrouped: HintChip[] = [];

  for (const chip of chips) {
    const parentTopic = lookup.get(chip.label.trim().toLowerCase());
    if (parentTopic) {
      if (!grouped.has(parentTopic)) grouped.set(parentTopic, []);
      grouped.get(parentTopic)!.push(chip);
    } else {
      ungrouped.push(chip);
    }
  }

  const matchedCount = chips.length - ungrouped.length;

  // If fewer than half matched, show flat without group headers
  if (matchedCount < chips.length / 2) {
    return [{ groupLabel: '', chips }];
  }

  const result = Array.from(grouped.entries()).map(([groupLabel, groupChips]) => ({
    groupLabel,
    chips: groupChips
  }));

  if (ungrouped.length > 0) {
    result.push({ groupLabel: 'More', chips: ungrouped });
  }

  return result;
}
