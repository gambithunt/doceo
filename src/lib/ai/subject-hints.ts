import { browser } from '$app/environment';
import type { SchoolTerm, Subject } from '$lib/types';

export const SUBJECT_HINT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SUBJECT_HINT_CACHE_PREFIX = 'doceo-subject-hints:v2';
const MIN_HINTS = 5;
const MAX_HINTS = 10;
const STOP_WORDS = new Set([
  'about',
  'after',
  'before',
  'between',
  'compare',
  'describe',
  'explain',
  'identify',
  'needed',
  'revise',
  'study',
  'their',
  'these',
  'those',
  'using',
  'what',
  'with',
  'work'
]);
const GENERIC_SECTION_NAMES = new Set([
  'application',
  'applying knowledge',
  'core ideas',
  'essential concepts',
  'foundations',
  'using what you know'
]);
const GENERIC_HINT_PATTERNS = [
  /\bapplying knowledge\b/,
  /\breal[- ]world\b/,
  /\bexamples?\b/,
  /\bbasics\b/,
  /\bterminology\b/,
  /\brevision\b/,
  /\bconcepts?\b/,
  /\bknowledge\b/
];

export interface SubjectHintRequest {
  curriculumId: string;
  curriculumName: string;
  gradeId: string;
  gradeLabel: string;
  term: SchoolTerm;
  subject: Subject;
}

interface SubjectHintsPayload {
  response?: {
    hints?: string[];
  };
  provider?: string;
}

export interface SubjectHintResult {
  hints: string[];
  provider: string;
}

interface CachedSubjectHintPack {
  hints: string[];
  createdAt: number;
  expiresAt: number;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?: (key: string) => void;
  readonly length?: number;
  key?: (index: number) => string | null;
}

type StorageAdapter = StorageLike | Map<string, string> | undefined;

interface ReferenceHintContext {
  curriculumName: string;
  gradeLabel: string;
  term: SchoolTerm;
  subjectName: string;
}

interface ResolveSubjectHintsInput {
  subject: Subject;
  curriculumId: string;
  curriculumName: string;
  gradeId: string;
  gradeLabel: string;
  term: SchoolTerm;
  forceRefresh?: boolean;
  fetcher?: typeof fetch;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  storage?: StorageAdapter;
  now?: number;
  ttlMs?: number;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function getStorageValue(storage: StorageAdapter, key: string): string | null {
  if (!storage) {
    return null;
  }

  if (storage instanceof Map) {
    return storage.get(key) ?? null;
  }

  return storage.getItem(key);
}

function setStorageValue(storage: StorageAdapter, key: string, value: string): void {
  if (!storage) {
    return;
  }

  if (storage instanceof Map) {
    storage.set(key, value);
    return;
  }

  storage.setItem(key, value);
}

function getDefaultStorage(): StorageAdapter {
  return browser ? window.localStorage : undefined;
}

function getSubjectHintCacheKey(curriculumId: string, gradeId: string, term: SchoolTerm, subjectId: string): string {
  return `${SUBJECT_HINT_CACHE_PREFIX}:${curriculumId}:${gradeId}:${term}:${subjectId}`;
}

export function getReferenceHintTopics(context: ReferenceHintContext): string[] {
  const curriculum = normalizeText(context.curriculumName);
  const grade = normalizeText(context.gradeLabel);
  const subject = normalizeText(context.subjectName);

  if (curriculum === 'ieb' && grade === 'grade 6' && context.term === 'Term 1' && subject === 'biology') {
    return [
      'Photosynthesis',
      'Nutrients in Food',
      'Nutrition and Diet-Related Diseases',
      'The Human Digestive System',
      'Ecosystems and Food Webs'
    ];
  }

  return [];
}


function getTermIndex(term: SchoolTerm): number {
  switch (term) {
    case 'Term 2':
      return 1;
    case 'Term 3':
      return 2;
    case 'Term 4':
      return 3;
    case 'Term 1':
    default:
      return 0;
  }
}

function selectTermWindow(sections: string[], term: SchoolTerm): string[] {
  if (sections.length <= 2) {
    return sections;
  }

  const chunkSize = Math.max(1, Math.ceil(sections.length / 4));
  const start = Math.min(getTermIndex(term) * chunkSize, Math.max(0, sections.length - chunkSize));
  const end = Math.min(sections.length, start + chunkSize);
  const windowed = sections.slice(start, end);

  return windowed.length > 0 ? windowed : sections.slice(0, chunkSize);
}

function looksLikeSentenceHint(hint: string): boolean {
  const normalized = normalizeText(hint);

  return (
    normalized.endsWith('.') ||
    normalized.split(/\s+/).length > 6 ||
    /^(define|apply|connect|analyze|analyse|explain|describe|identify|compare)\b/.test(normalized)
  );
}

function looksGeneric(hint: string): boolean {
  const normalized = normalizeText(hint);
  return GENERIC_HINT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function buildDeterministicSubjectHints(subject: Subject | null | undefined, term: SchoolTerm): string[] {
  if (!subject) {
    return [];
  }

  const orderedSections = subject.topics.flatMap((topic) =>
    topic.subtopics.length > 0 ? [topic.name, ...topic.subtopics.map((subtopic) => subtopic.name)] : [topic.name]
  );
  const filteredSections = Array.from(
    new Set(
      orderedSections
        .map((section) => section.trim())
        .filter((section) => section.length > 0 && !GENERIC_SECTION_NAMES.has(normalizeText(section)))
    )
  );

  if (filteredSections.length > 0) {
    return selectTermWindow(filteredSections, term).slice(0, MAX_HINTS);
  }

  return selectTermWindow(
    [
      `${subject.name} basics`,
      `${subject.name} terminology`,
      `${subject.name} diagrams`,
      `${subject.name} processes`,
      `${subject.name} practical work`,
      `${subject.name} revision`
    ],
    term
  ).slice(0, MAX_HINTS);
}

export function validateSubjectHints(hints: string[], _subject: Subject, _referenceTopics: string[] = []): string[] {
  const validated = Array.from(new Set(hints.map((hint) => hint.trim()).filter((hint) => hint.length > 0)))
    .filter((hint) => !GENERIC_SECTION_NAMES.has(normalizeText(hint)) && !looksLikeSentenceHint(hint) && !looksGeneric(hint))
    .filter((hint) => tokenize(hint).length > 0)
    .slice(0, MAX_HINTS);

  return validated.length >= MIN_HINTS ? validated : [];
}

function readSubjectHintCache(
  subject: Subject,
  curriculumId: string,
  gradeId: string,
  term: SchoolTerm,
  storage: StorageAdapter,
  now: number
): { fresh: SubjectHintResult | null; stale: SubjectHintResult | null } {
  const raw = getStorageValue(storage, getSubjectHintCacheKey(curriculumId, gradeId, term, subject.id));

  if (!raw) {
    return { fresh: null, stale: null };
  }

  try {
    const parsed = JSON.parse(raw) as CachedSubjectHintPack;
    const hints = validateSubjectHints(parsed.hints ?? [], subject);

    if (hints.length === 0) {
      return { fresh: null, stale: null };
    }

    const payload = {
      hints,
      provider: 'cache'
    };

    return parsed.expiresAt > now ? { fresh: payload, stale: payload } : { fresh: null, stale: payload };
  } catch {
    return { fresh: null, stale: null };
  }
}

export function clearStaleSubjectHintCaches(subjectId: string, activeKey: string, storage: StorageAdapter): void {
  if (!storage || storage instanceof Map) return;
  const realStorage = storage as { getItem: (k: string) => string | null; removeItem?: (k: string) => void; length?: number; key?: (i: number) => string | null };
  if (typeof realStorage.length !== 'number' || typeof realStorage.key !== 'function' || typeof realStorage.removeItem !== 'function') return;

  const suffix = `:${subjectId}`;
  const keysToDelete: string[] = [];

  for (let i = 0; i < realStorage.length; i++) {
    const k = realStorage.key(i);
    if (k && k.startsWith(SUBJECT_HINT_CACHE_PREFIX) && k.endsWith(suffix) && k !== activeKey) {
      keysToDelete.push(k);
    }
  }

  for (const k of keysToDelete) {
    realStorage.removeItem(k);
  }
}

function writeSubjectHintCache(
  subject: Subject,
  curriculumId: string,
  gradeId: string,
  term: SchoolTerm,
  storage: StorageAdapter,
  hints: string[],
  now: number,
  ttlMs: number
): void {
  const activeKey = getSubjectHintCacheKey(curriculumId, gradeId, term, subject.id);
  setStorageValue(
    storage,
    activeKey,
    JSON.stringify({
      hints,
      createdAt: now,
      expiresAt: now + ttlMs
    } satisfies CachedSubjectHintPack)
  );
  clearStaleSubjectHintCaches(subject.id, activeKey, storage);
}

export function createSubjectHintsSystemPrompt(): string {
  return [
    'You create short learning prompt hints for school students.',
    'Use the supplied curriculum, subject, grade, term, topic, and subtopic names.',
    'Return JSON only with exactly this key: hints.',
    'Return 7 to 10 concrete curriculum topic names.',
    'Each hint must be a short topic-like phrase with 1 to 6 words, not a full sentence.',
    'Do not start hints with verbs like define, explain, apply, connect, or analyze.',
    'Do not return generic study phrases like applying knowledge, real-world examples, or key concepts.',
    'Use specific topic names that match the requested school context.'
  ].join(' ');
}

export function createSubjectHintsUserPrompt(request: SubjectHintRequest): string {
  const referenceTopics = getReferenceHintTopics({
    curriculumName: request.curriculumName,
    gradeLabel: request.gradeLabel,
    term: request.term,
    subjectName: request.subject.name
  });

  return JSON.stringify({
    curriculumId: request.curriculumId,
    curriculum: request.curriculumName,
    gradeId: request.gradeId,
    grade: request.gradeLabel,
    term: request.term,
    subject: request.subject.name,
    reference_topics: referenceTopics,
    sections: request.subject.topics.map((topic) => ({
      topic: topic.name,
      subtopics: topic.subtopics.map((subtopic) => subtopic.name)
    }))
  });
}

export function createSubjectHintsBody(request: SubjectHintRequest, model: string) {
  return {
    model,
    temperature: 0.5,
    messages: [
      {
        role: 'system' as const,
        content: createSubjectHintsSystemPrompt()
      },
      {
        role: 'user' as const,
        content: createSubjectHintsUserPrompt(request)
      }
    ]
  };
}

export function parseSubjectHintsResponse(payload: { choices?: Array<{ message?: { content?: string } }> }): string[] | null {
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content) as { hints?: string[] };
    return Array.isArray(parsed.hints) ? parsed.hints : null;
  } catch {
    return null;
  }
}

export async function resolveSubjectHints(input: ResolveSubjectHintsInput): Promise<SubjectHintResult> {
  const storage = input.storage ?? getDefaultStorage();
  const now = input.now ?? Date.now();
  const ttlMs = input.ttlMs ?? SUBJECT_HINT_CACHE_TTL_MS;
  const cached = readSubjectHintCache(input.subject, input.curriculumId, input.gradeId, input.term, storage, now);

  if (!input.forceRefresh && cached.fresh) {
    return cached.fresh;
  }

  if (!input.fetcher) {
    throw new Error('Subject hints require an authenticated fetcher.');
  }

  const response = await input.fetcher('/api/ai/subject-hints', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(input.headers ?? {})
    },
    signal: input.signal,
    body: JSON.stringify({
      request: {
        curriculumId: input.curriculumId,
        curriculumName: input.curriculumName,
        gradeId: input.gradeId,
        gradeLabel: input.gradeLabel,
        term: input.term,
        subject: {
          id: input.subject.id,
          name: input.subject.name,
          topics: input.subject.topics.map((topic) => ({
            id: topic.id,
            name: topic.name,
            subtopics: topic.subtopics.map((subtopic) => ({
              id: subtopic.id,
              name: subtopic.name
            }))
          }))
        }
      }
    })
  });

  if (!response.ok) {
    if (cached.stale) {
      return {
        ...cached.stale,
        provider: 'stale-cache'
      };
    }

    const payload = (await response.json().catch(() => ({ error: 'Subject hint request failed.' }))) as { error?: string };
    throw new Error(payload.error ?? 'Subject hint request failed.');
  }

  const payload = (await response.json()) as SubjectHintsPayload;
  const validatedHints = validateSubjectHints(payload.response?.hints ?? [], input.subject);

  if (validatedHints.length > 0) {
    writeSubjectHintCache(input.subject, input.curriculumId, input.gradeId, input.term, storage, validatedHints, now, ttlMs);
    return {
      hints: validatedHints,
      provider: payload.provider ?? 'llm'
    };
  }

  if (cached.stale) {
    return {
      ...cached.stale,
      provider: 'stale-cache'
    };
  }

  throw new Error('Subject hints response was invalid.');
}
