import type { LessonSelectorRequest, LessonSelectorResponse } from '$lib/types';

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

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function getStudentName(fullName: string): string {
  const trimmed = fullName.trim();
  return trimmed.split(/\s+/)[0] || 'there';
}

function matchFallbackSection(request: LessonSelectorRequest): LessonSelectorResponse {
  const normalizedPrompt = normalize(request.studentPrompt);
  const exact = request.availableSections.find((section) => normalize(section) === normalizedPrompt);
  const partial = request.availableSections.find(
    (section) =>
      normalize(section).includes(normalizedPrompt) ||
      normalizedPrompt.includes(normalize(section))
  );
  const matchedSection = exact ?? partial ?? request.availableSections[0] ?? 'General foundations';
  const studentName = getStudentName(request.studentName);

  return {
    studentIntent: request.studentPrompt,
    matchedSection,
    matchedTopic: matchedSection,
    confidence: exact ? 'high' : partial ? 'medium' : 'low',
    reasoning: exact
      ? `${studentName}, that matches the formal section ${matchedSection}.`
      : partial
        ? `${studentName}, that sounds closest to ${matchedSection}, so I matched you there.`
        : `${studentName}, I could not match that confidently, so I picked the closest available section: ${matchedSection}.`,
    clarificationNeeded: !exact && !partial,
    candidateSections: request.availableSections.slice(0, 3)
  };
}

export function createLessonSelectorSystemPrompt(): string {
  return [
    'You match a student request to a formal curriculum section inside a structured school learning app.',
    'Never act like a chatbot.',
    'Address the student directly using their name when you explain your reasoning.',
    'Do not say "the student".',
    'Infer the closest curriculum section from the student wording.',
    'If confidence is low, set clarificationNeeded to true and include candidateSections.',
    'Return JSON only with exactly these keys: studentIntent, matchedSection, matchedTopic, confidence, reasoning, clarificationNeeded, candidateSections.'
  ].join(' ');
}

export function createLessonSelectorUserPrompt(request: LessonSelectorRequest): string {
  return JSON.stringify({
    mode: 'lesson-selector',
    subject: request.subject,
    studentName: request.studentName,
    studentPrompt: request.studentPrompt,
    availableSections: request.availableSections,
    required_output: {
      studentIntent: 'string',
      matchedSection: 'string',
      matchedTopic: 'string',
      confidence: 'low | medium | high',
      reasoning: 'string',
      clarificationNeeded: 'boolean',
      candidateSections: ['string']
    }
  });
}

export function createLessonSelectorBody(
  request: LessonSelectorRequest,
  model: string
): GithubModelsRequestBody {
  return {
    model,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: createLessonSelectorSystemPrompt()
      },
      {
        role: 'user',
        content: createLessonSelectorUserPrompt(request)
      }
    ]
  };
}

export function parseLessonSelectorResponse(
  payload: GithubModelsSuccessResponse
): LessonSelectorResponse | null {
  const content = payload.choices[0]?.message.content;

  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content) as Partial<LessonSelectorResponse>;

    if (
      parsed.studentIntent &&
      parsed.matchedSection &&
      parsed.matchedTopic &&
      parsed.confidence &&
      parsed.reasoning &&
      typeof parsed.clarificationNeeded === 'boolean' &&
      Array.isArray(parsed.candidateSections)
    ) {
      return parsed as LessonSelectorResponse;
    }

    return null;
  } catch {
    return null;
  }
}

export function buildFallbackLessonSelectorResponse(
  request: LessonSelectorRequest
): LessonSelectorResponse {
  return matchFallbackSection(request);
}
