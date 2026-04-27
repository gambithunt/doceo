import { buildConceptDiagnostic } from '$lib/concept-diagnostics';
import type {
  ConceptCurriculumAlignment,
  ConceptDiagnostic,
  ConceptItem,
  LessonResource,
  QuestionOption
} from '$lib/types';

interface ConceptValidationContext {
  topicTitle: string;
  grade: string;
  subject: string;
}

interface RawConceptRecord {
  name: string;
  simpleDefinition: string;
  example: string;
  explanation: string;
  quickCheck: string;
  diagnostic?: ConceptDiagnostic;
  conceptType?: string;
  curriculumAlignment?: ConceptCurriculumAlignment;
  whyItMatters?: string;
  prerequisites?: string[];
  commonMisconception?: string;
  extendedExample?: string;
  difficultyLevel?: string;
  synonyms?: string[];
  tags?: string[];
  visualHint?: string;
  resource?: LessonResource;
  followUpQuestions?: string[];
}

export interface ConceptValidationResult {
  concepts: ConceptItem[];
  hardFailures: string[];
  softFailures: string[];
}

const GENERIC_WRAPPER_NAME_PATTERN =
  /^(core rule|worked pattern|check and apply|overview|introduction|understanding|introduction to|intro to|overview of|basics of|about|all about|ai[- ]suggested topic|exploration candidate|real-world case|reflection check)\b/i;
const META_INSTRUCTION_PATTERN =
  /\b(identify the rule|show the first step|use the evidence|name the clue|apply the rule)\b/i;
const GENERIC_FILLER_PATTERN =
  /\b(this topic|this lesson|helps you understand|about the topic|in many questions|important idea)\b/i;
const GENERIC_EXAMPLE_PATTERN =
  /\b(real life example|quick test|read the problem again|you will use this|exploration candidate)\b/i;
const INSTRUCTIONAL_EXAMPLE_PATTERN =
  /^(quote|identify|define|state|explain|compare|choose|use|look at)\b|^(a worked example shows|a final check compares|the example shows how)\b/i;
const EXTERNAL_RESOURCE_REFERENCE_PATTERN =
  /\b(look at|use|refer to|study|read|watch|listen to|examine)\s+(?:the|this|a|an)?\s*(?:[a-z-]+\s+){0,3}(diagram|image|picture|graph|table|map|chart|passage|extract|text|article|video|audio|source)\b|\b(diagram|image|picture|graph|table|map|chart|passage|extract|article|video|audio|source)\s+(?:above|below|shown|provided|given)\b/i;
const GENERIC_QUICK_CHECK_PATTERN =
  /\b(in your own words|what do you think|how do you feel|explain the topic again)\b/i;
const ASSESSABLE_QUICK_CHECK_PATTERN =
  /\b(what|which|why|how|where|when|who|identify|solve|calculate|quote|label|rewrite|compare|classify|correct|complete|justify|check|state|factor|predict|interpret|explain)\b/i;
const OPENING_EXPLANATION_SIGNAL_PATTERN =
  /\b(because|so|therefore|means|shows|suggests|creates|reveals|makes|helps)\b/i;
const SUBJECT_GROUNDING_PROFILES: Array<{ pattern: RegExp; anchors: string[] }> = [
  {
    pattern: /\b(english|language|literature)\b/i,
    anchors: ['metaphor', 'imagery', 'tone', 'symbol', 'simile', 'repetition', 'alliteration', 'onomatopoeia', 'stanza', 'poem', 'prose', 'quote', 'phrase', 'speaker', 'narrator']
  },
  {
    pattern: /\b(math|mathematics|algebra|geometry)\b/i,
    anchors: ['equation', 'quadratic', 'fraction', 'factor', 'formula', 'graph', 'angle', 'variable', 'ratio', 'denominator', 'numerator', 'coefficient', 'solve']
  },
  {
    pattern: /\b(science|physics|chemistry|biology|life sciences)\b/i,
    anchors: ['cell', 'membrane', 'energy', 'force', 'molecule', 'atom', 'water', 'reaction', 'photosynthesis', 'osmosis', 'motion', 'mass', 'plant', 'pollen', 'pollination', 'fertilisation', 'seed', 'germination', 'flower', 'stigma', 'anther']
  },
  {
    pattern: /\b(history)\b/i,
    anchors: ['war', 'treaty', 'revolution', 'empire', 'government', 'leader', 'event', 'assassination', 'colony', 'alliance']
  },
  {
    pattern: /\b(accounting|economics|business)\b/i,
    anchors: ['debit', 'credit', 'account', 'transaction', 'market', 'revenue', 'cost', 'profit', 'asset', 'liability']
  },
  {
    pattern: /\b(life orientation|social)\b/i,
    anchors: ['identity', 'values', 'belonging', 'influence', 'choices', 'relationships', 'community', 'self concept']
  }
];
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
  'home',
  'grade',
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

function readQuestionOption(value: unknown): QuestionOption | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = readString(record.id);
  const label = readString(record.label);
  const text = readString(record.text);

  if (!id || !label || !text) {
    return null;
  }

  return { id, label, text };
}

function readQuestionOptions(value: unknown): QuestionOption[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const options = value
    .map((entry) => readQuestionOption(entry))
    .filter((entry): entry is QuestionOption => Boolean(entry));

  return options.length === value.length ? options : null;
}

function readLessonResource(value: unknown): LessonResource | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const type = readString(record.type);
  const title = readString(record.title);
  const description = readString(record.description) ?? undefined;
  const content = readString(record.content) ?? undefined;
  const url = readString(record.url) ?? undefined;
  const altText = readString(record.altText) ?? readString(record.alt_text);

  if (
    (type !== 'inline_diagram' && type !== 'text_diagram' && type !== 'inline_text' && type !== 'trusted_link') ||
    !title ||
    !altText
  ) {
    return null;
  }

  if ((type === 'inline_diagram' || type === 'text_diagram' || type === 'inline_text') && !content) {
    return null;
  }

  if (type === 'trusted_link' && !url) {
    return null;
  }

  return {
    type,
    title,
    ...(description ? { description } : {}),
    ...(content ? { content } : {}),
    ...(url ? { url } : {}),
    altText
  };
}

function readConceptDiagnostic(value: unknown): ConceptDiagnostic | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const prompt = readString(record.prompt);
  const options = readQuestionOptions(record.options);
  const correctOptionId =
    readString(record.correctOptionId) ?? readString(record.correct_option_id);
  const rationale = readString(record.rationale) ?? undefined;

  if (!prompt || !options || !correctOptionId) {
    return null;
  }

  return {
    prompt,
    options,
    correctOptionId,
    rationale
  };
}

function normalizeTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0 && !STOP_WORDS.has(token));
}

function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function includesBannedPhrase(value: string): boolean {
  return META_INSTRUCTION_PATTERN.test(value) || GENERIC_FILLER_PATTERN.test(value);
}

function requiresExternalResource(value: string): boolean {
  return EXTERNAL_RESOURCE_REFERENCE_PATTERN.test(value);
}

function containsAnchor(text: string, anchors: string[]): boolean {
  const normalized = normalizeLabel(text);
  return anchors.some((anchor) => normalized.includes(normalizeLabel(anchor)));
}

function getSubjectAnchors(subject: string): string[] {
  return SUBJECT_GROUNDING_PROFILES.find((profile) => profile.pattern.test(subject))?.anchors ?? [];
}

function hasConcreteExample(value: string): boolean {
  if (GENERIC_EXAMPLE_PATTERN.test(value) || INSTRUCTIONAL_EXAMPLE_PATTERN.test(value.trim())) {
    return false;
  }

  const normalized = normalizeLabel(value);
  if (/^[a-z\s-]{3,40}$/.test(normalized) && normalized.split(/\s+/).length <= 3) {
    return false;
  }

  return /["“”'‘’0-9:=()\-]/.test(value) || value.split(/\s+/).length >= 6;
}

function isTopicSlotLabel(name: string, topicTitle: string): boolean {
  const normalizedName = normalizeLabel(name);
  const normalizedTopic = normalizeLabel(topicTitle);

  if (!normalizedName || !normalizedTopic) {
    return false;
  }

  if (normalizedName === normalizedTopic) {
    return true;
  }

  return [
    'example',
    'check',
    'effect',
    'detail',
    'background',
    'trigger',
    'impact',
    'setup',
    'movement',
    'result'
  ].some((suffix) => normalizedName === `${normalizedTopic} ${suffix}`);
}

function buildConceptText(concept: ConceptItem): string {
  return [
    concept.name,
    concept.simpleDefinition ?? concept.oneLineDefinition ?? concept.summary,
    concept.example,
    concept.explanation ?? concept.detail,
    concept.quickCheck ?? ''
  ].join(' ');
}

function isGroundedInRequestedContext(concepts: ConceptItem[], context: ConceptValidationContext): boolean {
  const combinedText = concepts.map((concept) => buildConceptText(concept)).join(' ');
  const combinedTokens = new Set(normalizeTokens(combinedText));
  const topicTokens = normalizeTokens(context.topicTitle).filter((token) => token.length >= 4);
  const subjectTokens = normalizeTokens(context.subject).filter((token) => token.length >= 4);
  const subjectAnchors = getSubjectAnchors(context.subject);
  const topicOverlap = topicTokens.filter((token) => combinedTokens.has(token)).length;

  if (subjectAnchors.length > 0) {
    const matchedAnchorCount = subjectAnchors.filter((anchor) => combinedText.toLowerCase().includes(anchor)).length;
    return topicOverlap >= 1 || matchedAnchorCount >= 2;
  }

  const subjectOverlap = subjectTokens.filter((token) => combinedTokens.has(token)).length;
  return topicOverlap >= 1 || subjectOverlap >= 1;
}

function hasStrongOpeningConcept(concept: ConceptItem, context: ConceptValidationContext): boolean {
  const name = concept.name.trim();
  const explanation = concept.explanation ?? concept.detail;
  const openingText = buildConceptText(concept);
  const subjectAnchors = getSubjectAnchors(context.subject);

  if (!name || GENERIC_WRAPPER_NAME_PATTERN.test(name)) {
    return false;
  }

  if (!hasConcreteExample(concept.example)) {
    return false;
  }

  if (!OPENING_EXPLANATION_SIGNAL_PATTERN.test(explanation)) {
    return false;
  }

  if (!concept.quickCheck || GENERIC_QUICK_CHECK_PATTERN.test(concept.quickCheck)) {
    return false;
  }

  if (subjectAnchors.length > 0 && !containsAnchor(openingText, subjectAnchors)) {
    return false;
  }

  return true;
}

export function createConceptItem(record: RawConceptRecord): ConceptItem {
  const detailParts = [record.explanation];

  if (record.whyItMatters) {
    detailParts.push(`**Why it matters:** ${record.whyItMatters}`);
  }

  if (record.commonMisconception) {
    detailParts.push(`**Common misconception:** ${record.commonMisconception}`);
  }

  return {
    name: record.name,
    summary: record.simpleDefinition,
    detail: detailParts.join('\n\n'),
    example: record.extendedExample ?? record.example,
    simpleDefinition: record.simpleDefinition,
    explanation: record.explanation,
    oneLineDefinition: record.simpleDefinition,
    quickCheck: record.quickCheck,
    diagnostic:
      record.diagnostic ??
      buildConceptDiagnostic({
        name: record.name,
        simpleDefinition: record.simpleDefinition,
        example: record.extendedExample ?? record.example,
        explanation: record.explanation,
        quickCheck: record.quickCheck,
        commonMisconception: record.commonMisconception,
        whyItMatters: record.whyItMatters
      }),
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
    resource: record.resource,
    followUpQuestions: record.followUpQuestions
  };
}

export function parseConceptRecord(value: unknown): ConceptItem | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const name = readString(record.name);
  const simpleDefinition =
    readString(record.simpleDefinition) ??
    readString(record.simple_definition);
  const example = readString(record.example);
  const explanation = readString(record.explanation);
  const quickCheck = readString(record.quickCheck) ?? readString(record.quick_check);
  const diagnostic = readConceptDiagnostic(record.diagnostic);
  const conceptType = readString(record.conceptType) ?? readString(record.concept_type) ?? undefined;
  const curriculumAlignment = readAlignment(
    record.curriculumAlignment ?? record.curriculum_alignment
  ) ?? undefined;
  const resource = readLessonResource(record.resource) ?? undefined;

  if (!name || !simpleDefinition || !example || !explanation || !quickCheck || !diagnostic) {
    return null;
  }

  return createConceptItem({
    name,
    simpleDefinition,
    example,
    explanation,
    quickCheck,
    diagnostic,
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
    resource,
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
  const simpleDefinition = concept.simpleDefinition ?? concept.oneLineDefinition ?? concept.summary;
  const explanation = concept.explanation ?? concept.detail;
  const diagnostic = concept.diagnostic;

  if (!simpleDefinition || !concept.example || !explanation || !concept.quickCheck) {
    hardFailures.push(`${label} is missing required concept-contract fields.`);
    return { hardFailures, softFailures };
  }

  if (GENERIC_WRAPPER_NAME_PATTERN.test(concept.name)) {
    hardFailures.push(`${label} uses a generic wrapper instead of a real concept name.`);
  } else if (isTopicSlotLabel(concept.name, context.topicTitle)) {
    hardFailures.push(`${label} uses a generic slot label instead of a real concept name.`);
  }

  if (includesBannedPhrase(simpleDefinition)) {
    hardFailures.push(`${label} has a generic or meta-instruction definition.`);
  }

  if (!hasConcreteExample(concept.example) || includesBannedPhrase(concept.example)) {
    hardFailures.push(`${label} does not include a concrete topic-shaped example.`);
  }

  if (includesBannedPhrase(explanation)) {
    hardFailures.push(`${label} has a generic or meta-instruction explanation.`);
  }

  if (
    (requiresExternalResource(concept.example) || requiresExternalResource(concept.quickCheck)) &&
    !concept.resource
  ) {
    hardFailures.push(`${label} asks for an external resource without embedding that resource.`);
  }

  if (GENERIC_QUICK_CHECK_PATTERN.test(concept.quickCheck) || includesBannedPhrase(concept.quickCheck)) {
    hardFailures.push(`${label} uses a generic quick check.`);
  } else if (!ASSESSABLE_QUICK_CHECK_PATTERN.test(concept.quickCheck)) {
    hardFailures.push(`${label} does not include a focused assessable quick check.`);
  }

  if (
    concept.curriculumAlignment &&
    concept.curriculumAlignment.gradeMatch.toLowerCase() !== context.grade.toLowerCase()
  ) {
    hardFailures.push(`${label} is not clearly aligned to the requested grade.`);
  }

  if (index === 0 && !hasStrongOpeningConcept(concept, context)) {
    hardFailures.push(`${label} is too weak to open the lesson clearly.`);
  }

  if (!diagnostic) {
    hardFailures.push(`${label} is missing a diagnostic block.`);
    return { hardFailures, softFailures };
  }

  if (diagnostic.prompt !== concept.quickCheck) {
    hardFailures.push(`${label} diagnostic prompt must match quick_check exactly.`);
  }

  if (diagnostic.options.length !== 4) {
    hardFailures.push(`${label} diagnostic must contain exactly 4 options.`);
  }

  const optionIds = new Set<string>();
  const optionLabels = new Set<string>();
  const optionTexts = new Set<string>();
  for (const option of diagnostic.options) {
    const normalizedId = option.id.trim().toLowerCase();
    const normalizedLabel = option.label.trim().toLowerCase();
    const normalizedText = option.text.trim().toLowerCase();

    if (!normalizedId || !normalizedLabel || !normalizedText) {
      hardFailures.push(`${label} diagnostic options must include id, label, and text.`);
      continue;
    }

    if (optionIds.has(normalizedId) || optionLabels.has(normalizedLabel) || optionTexts.has(normalizedText)) {
      hardFailures.push(`${label} diagnostic options must be unique.`);
      break;
    }

    optionIds.add(normalizedId);
    optionLabels.add(normalizedLabel);
    optionTexts.add(normalizedText);

    if (includesBannedPhrase(option.text) || GENERIC_FILLER_PATTERN.test(option.text)) {
      hardFailures.push(`${label} diagnostic contains generic or meta-instruction answer options.`);
      break;
    }
  }

  if (!optionIds.has(diagnostic.correctOptionId.trim().toLowerCase())) {
    hardFailures.push(`${label} diagnostic correct_option_id must match one option id.`);
  }

  const correctOption = diagnostic.options.find(
    (option) => option.id.trim().toLowerCase() === diagnostic.correctOptionId.trim().toLowerCase()
  );

  if (correctOption) {
    const normalizedCorrect = normalizeLabel(correctOption.text);
    const normalizedDefinition = normalizeLabel(simpleDefinition);

    if (/(what does|what effect|what tone|which sense|what mood|what does this reveal)/i.test(concept.quickCheck)) {
      if (normalizedCorrect === normalizedDefinition) {
        hardFailures.push(`${label} diagnostic correct answer does not answer the prompt directly.`);
      }
    }
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
      const currentDefinition = current.simpleDefinition ?? current.oneLineDefinition ?? current.summary;
      const compareDefinition = compare.simpleDefinition ?? compare.oneLineDefinition ?? compare.summary;

      if (
        tokenOverlap(current.name, compare.name) >= 0.8 ||
        tokenOverlap(currentDefinition, compareDefinition) >= 0.8
      ) {
        hardFailures.push(
          `Concepts "${current.name}" and "${compare.name}" are duplicates or near-duplicates.`
        );
      }
    }
  }

  if (concepts.length > 0 && !isGroundedInRequestedContext(concepts, context)) {
    hardFailures.push('Concept set is not clearly grounded in the requested subject/topic.');
  }

  return {
    concepts,
    hardFailures,
    softFailures
  };
}
