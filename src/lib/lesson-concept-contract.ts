import type { ConceptCurriculumAlignment, ConceptItem } from '$lib/types';

interface ConceptValidationContext {
  topicTitle: string;
  grade: string;
  subject: string;
}

interface RawConceptRecord {
  name: string;
  oneLineDefinition: string;
  example: string;
  quickCheck: string;
  conceptType: string;
  curriculumAlignment: ConceptCurriculumAlignment;
  whyItMatters?: string;
  prerequisites?: string[];
  commonMisconception?: string;
  extendedExample?: string;
  difficultyLevel?: string;
  synonyms?: string[];
  tags?: string[];
  visualHint?: string;
  followUpQuestions?: string[];
}

export interface ConceptValidationResult {
  concepts: ConceptItem[];
  hardFailures: string[];
  softFailures: string[];
}

const GENERIC_CONCEPT_NAME_PATTERN =
  /^(understanding|introduction to|intro to|overview of|basics of|about|all about)\b/i;
const GENERIC_DEFINITION_PATTERN =
  /\b(this topic|this lesson|helps you understand|about the topic|in many questions|important idea)\b/i;
const GENERIC_EXAMPLE_PATTERN =
  /\b(you will use this|in many questions|real life example|quick test|read the problem again)\b/i;
const GENERIC_QUICK_CHECK_PATTERN =
  /\b(in your own words|what do you think|how do you feel|explain the topic again)\b/i;
const ACTIONABLE_QUICK_CHECK_PATTERN =
  /\b(identify|solve|calculate|quote|label|rewrite|compare|classify|correct|complete|justify|check|state|factor|apply|predict|interpret|explain)\b/i;
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'the',
  'of',
  'to',
  'in',
  'on',
  'for',
  'with',
  'by',
  'is',
  'are',
  'be',
  'this',
  'that',
  'what',
  'why',
  'how',
  'write',
  'using'
]);

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value
    .map((entry) => readString(entry))
    .filter((entry): entry is string => Boolean(entry));

  return items.length > 0 ? items : undefined;
}

function readOptionalString(record: Record<string, unknown>, camelKey: string, snakeKey: string): string | undefined {
  return readString(record[camelKey]) ?? readString(record[snakeKey]) ?? undefined;
}

function readAlignment(value: unknown): ConceptCurriculumAlignment | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const topicMatch = readString(record.topicMatch) ?? readString(record.topic_match);
  const gradeMatch = readString(record.gradeMatch) ?? readString(record.grade_match);
  const alignmentNote = readString(record.alignmentNote) ?? readString(record.alignment_note);

  if (!topicMatch || !gradeMatch || !alignmentNote) {
    return null;
  }

  return {
    topicMatch,
    gradeMatch,
    alignmentNote
  };
}

function normalizeTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0 && !STOP_WORDS.has(token));
}

function tokenOverlap(a: string, b: string): number {
  const aTokens = new Set(normalizeTokens(a));
  const bTokens = new Set(normalizeTokens(b));

  if (aTokens.size === 0 || bTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.min(aTokens.size, bTokens.size);
}

function includesTopicMatch(value: string, topicTitle: string): boolean {
  const valueTokens = normalizeTokens(value);
  const topicTokens = normalizeTokens(topicTitle);

  if (valueTokens.length === 0 || topicTokens.length === 0) {
    return false;
  }

  const valueSet = new Set(valueTokens);
  const overlap = topicTokens.filter((token) => valueSet.has(token));
  return overlap.length >= Math.max(1, Math.ceil(topicTokens.length / 2));
}

export function createConceptItem(record: RawConceptRecord): ConceptItem {
  const detailParts = [record.oneLineDefinition];

  if (record.whyItMatters) {
    detailParts.push(`**Why it matters:** ${record.whyItMatters}`);
  }

  if (record.commonMisconception) {
    detailParts.push(`**Common misconception:** ${record.commonMisconception}`);
  }

  return {
    name: record.name,
    summary: record.oneLineDefinition,
    detail: detailParts.join('\n\n'),
    example: record.extendedExample ?? record.example,
    oneLineDefinition: record.oneLineDefinition,
    quickCheck: record.quickCheck,
    conceptType: record.conceptType,
    curriculumAlignment: record.curriculumAlignment,
    whyItMatters: record.whyItMatters,
    prerequisites: record.prerequisites,
    commonMisconception: record.commonMisconception,
    extendedExample: record.extendedExample,
    difficultyLevel: record.difficultyLevel,
    synonyms: record.synonyms,
    tags: record.tags,
    visualHint: record.visualHint,
    followUpQuestions: record.followUpQuestions
  };
}

export function parseConceptRecord(value: unknown): ConceptItem | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const name = readString(record.name);
  const oneLineDefinition =
    readString(record.oneLineDefinition) ?? readString(record.one_line_definition);
  const example = readString(record.example);
  const quickCheck = readString(record.quickCheck) ?? readString(record.quick_check);
  const conceptType = readString(record.conceptType) ?? readString(record.concept_type);
  const curriculumAlignment = readAlignment(
    record.curriculumAlignment ?? record.curriculum_alignment
  );

  if (!name || !oneLineDefinition || !example || !quickCheck || !conceptType || !curriculumAlignment) {
    return null;
  }

  return createConceptItem({
    name,
    oneLineDefinition,
    example,
    quickCheck,
    conceptType,
    curriculumAlignment,
    whyItMatters: readOptionalString(record, 'whyItMatters', 'why_it_matters'),
    prerequisites: readStringArray(record.prerequisites),
    commonMisconception: readOptionalString(record, 'commonMisconception', 'common_misconception'),
    extendedExample: readOptionalString(record, 'extendedExample', 'extended_example'),
    difficultyLevel: readOptionalString(record, 'difficultyLevel', 'difficulty_level'),
    synonyms: readStringArray(record.synonyms),
    tags: readStringArray(record.tags),
    visualHint: readOptionalString(record, 'visualHint', 'visual_hint'),
    followUpQuestions: readStringArray(record.followUpQuestions ?? record.follow_up_questions)
  });
}

function validateSingleConcept(
  concept: ConceptItem,
  context: ConceptValidationContext,
  index: number
): { hardFailures: string[]; softFailures: string[] } {
  const label = `concept ${index + 1} (${concept.name})`;
  const hardFailures: string[] = [];
  const softFailures: string[] = [];

  if (!concept.oneLineDefinition || !concept.quickCheck || !concept.conceptType || !concept.curriculumAlignment) {
    hardFailures.push(`${label} is missing required concept-contract fields.`);
    return { hardFailures, softFailures };
  }

  if (GENERIC_CONCEPT_NAME_PATTERN.test(concept.name) || tokenOverlap(concept.name, context.topicTitle) >= 1) {
    hardFailures.push(`${label} uses a generic topic wrapper instead of a specific concept name.`);
  }

  if (GENERIC_DEFINITION_PATTERN.test(concept.oneLineDefinition)) {
    hardFailures.push(`${label} has a vague one-line definition.`);
  }

  if (GENERIC_EXAMPLE_PATTERN.test(concept.example)) {
    hardFailures.push(`${label} does not include a concrete example.`);
  }

  if (GENERIC_QUICK_CHECK_PATTERN.test(concept.quickCheck) || !ACTIONABLE_QUICK_CHECK_PATTERN.test(concept.quickCheck)) {
    hardFailures.push(`${label} does not include an assessable quick check.`);
  }

  if (!includesTopicMatch(concept.curriculumAlignment.topicMatch, context.topicTitle)) {
    hardFailures.push(`${label} is not clearly aligned to the requested topic.`);
  }

  if (concept.curriculumAlignment.gradeMatch.toLowerCase() !== context.grade.toLowerCase()) {
    hardFailures.push(`${label} is not clearly aligned to the requested grade.`);
  }

  if (!concept.whyItMatters || concept.whyItMatters.length < 24) {
    softFailures.push(`${label} does not explain why the concept matters clearly enough.`);
  }

  if (!concept.curriculumAlignment.alignmentNote || concept.curriculumAlignment.alignmentNote.length < 24) {
    softFailures.push(`${label} has a weak curriculum alignment note.`);
  }

  return { hardFailures, softFailures };
}

export function validateConceptRecords(
  values: unknown,
  context: ConceptValidationContext
): ConceptValidationResult {
  if (!Array.isArray(values) || values.length < 2 || values.length > 4) {
    return {
      concepts: [],
      hardFailures: ['Concept record collections must contain 2 to 4 items.'],
      softFailures: []
    };
  }

  const concepts: ConceptItem[] = [];
  const hardFailures: string[] = [];
  const softFailures: string[] = [];

  for (const [index, value] of values.entries()) {
    const concept = parseConceptRecord(value);

    if (!concept) {
      hardFailures.push(`Concept ${index + 1} is missing required concept-contract fields.`);
      continue;
    }

    const validation = validateSingleConcept(concept, context, index);
    hardFailures.push(...validation.hardFailures);
    softFailures.push(...validation.softFailures);
    concepts.push(concept);
  }

  for (let index = 0; index < concepts.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < concepts.length; compareIndex += 1) {
      const current = concepts[index];
      const compare = concepts[compareIndex];

      if (
        tokenOverlap(current.name, compare.name) >= 0.8 ||
        tokenOverlap(current.oneLineDefinition ?? current.summary, compare.oneLineDefinition ?? compare.summary) >= 0.8
      ) {
        hardFailures.push(
          `Concepts "${current.name}" and "${compare.name}" are duplicates or near-duplicates.`
        );
      }
    }
  }

  return {
    concepts,
    hardFailures,
    softFailures
  };
}
