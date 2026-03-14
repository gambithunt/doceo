import { browser } from '$app/environment';
import type { SchoolTerm, Subject } from '$lib/types';

export const SUBJECT_HINT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SUBJECT_HINT_CACHE_PREFIX = 'doceo-subject-hints';
const MAX_HINTS = 8;
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

interface SubjectHintRequest {
  curriculumId: string;
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
}

type StorageAdapter = StorageLike | Map<string, string> | undefined;

interface ResolveSubjectHintsInput {
  subject: Subject;
  curriculumId: string;
  gradeId: string;
  gradeLabel: string;
  term: SchoolTerm;
  fetcher?: typeof fetch;
  headers?: Record<string, string>;
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

function buildSubjectVocabulary(subject: Subject): Set<string> {
  const vocabulary = new Set<string>();
  const sections = [
    subject.name,
    ...subject.topics.map((topic) => topic.name),
    ...subject.topics.flatMap((topic) => topic.subtopics.map((subtopic) => subtopic.name))
  ];

  for (const section of sections) {
    const normalized = normalizeText(section);
    if (normalized.length > 0) {
      vocabulary.add(normalized);
    }

    for (const token of tokenize(section)) {
      vocabulary.add(token);
    }
  }

  return vocabulary;
}

function isHintRelevantToSubject(hint: string, vocabulary: Set<string>): boolean {
  const normalized = normalizeText(hint);
  if (normalized.length === 0) {
    return false;
  }

  if ([...vocabulary].some((entry) => entry.includes(' ') && normalized.includes(entry))) {
    return true;
  }

  return tokenize(hint).some((token) => vocabulary.has(token));
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

export function validateSubjectHints(hints: string[], subject: Subject): string[] {
  const vocabulary = buildSubjectVocabulary(subject);

  return Array.from(new Set(hints.map((hint) => hint.trim()).filter((hint) => hint.length > 0))).filter(
    (hint) =>
      !GENERIC_SECTION_NAMES.has(normalizeText(hint)) &&
      !looksLikeSentenceHint(hint) &&
      isHintRelevantToSubject(hint, vocabulary)
  );
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
  setStorageValue(
    storage,
    getSubjectHintCacheKey(curriculumId, gradeId, term, subject.id),
    JSON.stringify({
      hints,
      createdAt: now,
      expiresAt: now + ttlMs
    } satisfies CachedSubjectHintPack)
  );
}

export function createSubjectHintsSystemPrompt(): string {
  return [
    'You create short learning prompt hints for school students.',
    'Use the supplied subject, grade, term, topic, and subtopic names.',
    'Return JSON only with exactly this key: hints.',
    'Each hint must be a short topic-like phrase with 2 to 5 words, not a full sentence.',
    'Do not start hints with verbs like define, explain, apply, connect, or analyze.',
    'Do not invent concepts outside the supplied curriculum sections.'
  ].join(' ');
}

export function createSubjectHintsUserPrompt(request: SubjectHintRequest): string {
  return JSON.stringify({
    curriculumId: request.curriculumId,
    gradeId: request.gradeId,
    grade: request.gradeLabel,
    term: request.term,
    subject: request.subject.name,
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

  if (cached.fresh) {
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
    body: JSON.stringify({
      request: {
        curriculumId: input.curriculumId,
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
