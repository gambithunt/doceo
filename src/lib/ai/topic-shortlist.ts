import type { TopicShortlistRequest, TopicShortlistResponse } from '$lib/types';

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

function toTopicLabel(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');

  if (trimmed.length === 0) {
    return 'Chosen Topic';
  }

  return trimmed.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function createTopicShortlistSystemPrompt(): string {
  return [
    'You are a curriculum mapping assistant for South African school students.',
    'Map the student request to the official curriculum and return 4 to 6 specific subtopics.',
    'Return JSON only with exactly these keys: matchedSection, subtopics.',
    'Each subtopic item must include: id, title, description, curriculumReference, relevance, topicId, subtopicId, lessonId.',
    'Write every description in second person, speaking directly to the student — use "you will", "you\'ll explore", "you\'ll learn". Never write "students will" or "learners will".'
  ].join(' ');
}

export function createTopicShortlistUserPrompt(request: TopicShortlistRequest): string {
  return JSON.stringify({
    country: request.country,
    curriculum: request.curriculum,
    grade: request.grade,
    subject: request.subject,
    term: request.term,
    year: request.year,
    student_input: request.studentInput,
    available_topics: request.availableTopics
  });
}

export function createTopicShortlistBody(
  request: TopicShortlistRequest,
  model: string
): GithubModelsRequestBody {
  return {
    model,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: createTopicShortlistSystemPrompt()
      },
      {
        role: 'user',
        content: createTopicShortlistUserPrompt(request)
      }
    ]
  };
}

export function buildFallbackTopicShortlist(request: TopicShortlistRequest): TopicShortlistResponse {
  const prompt = normalize(request.studentInput);
  const scored = request.availableTopics
    .map((item) => {
      const target = normalize(`${item.topicName} ${item.subtopicName} ${item.lessonTitle}`);
      const score = target.includes(prompt) || prompt.includes(normalize(item.subtopicName))
        ? 3
        : prompt
            .split(/\s+/)
            .filter((word) => word.length > 2)
            .reduce((total, word) => total + (target.includes(word) ? 1 : 0), 0);
      return {
        item,
        score
      };
    })
    .sort((left, right) => right.score - left.score);

  const bestMatch = scored[0]?.item;
  const learnerTopic = {
    id: `shortlist-picked-${normalize(request.subject)}-${normalize(request.studentInput).replace(/[^a-z0-9]+/g, '-')}`,
    title: toTopicLabel(request.studentInput),
    description: `Focus directly on ${request.studentInput.trim().toLowerCase()} in ${request.subject}.`,
    curriculumReference: bestMatch
      ? `${request.curriculum} · ${request.grade} · ${bestMatch.topicName}`
      : `${request.curriculum} · ${request.grade} · ${request.subject}`,
    relevance: 'Based directly on what you typed. Start here if this is the exact topic you want.',
    topicId: bestMatch?.topicId ?? `custom-topic-${normalize(request.studentInput).replace(/[^a-z0-9]+/g, '-')}`,
    subtopicId: bestMatch?.subtopicId ?? `custom-subtopic-${normalize(request.studentInput).replace(/[^a-z0-9]+/g, '-')}`,
    lessonId: `generated-${normalize(request.subject).replace(/[^a-z0-9]+/g, '-')}-${normalize(request.studentInput).replace(/[^a-z0-9]+/g, '-')}`
  };

  const top = scored.slice(0, 5).map(({ item }, index) => ({
    id: `shortlist-${index + 1}-${item.lessonId}`,
    title: item.subtopicName,
    description: `Focus on ${item.subtopicName.toLowerCase()} within ${item.topicName.toLowerCase()}.`,
    curriculumReference: `${request.curriculum} · ${request.grade} · ${item.topicName}`,
    relevance:
      index === 0
        ? 'Closest match to the way you described the topic.'
        : 'Also sits near the same curriculum section.',
    topicId: item.topicId,
    subtopicId: item.subtopicId,
    lessonId: item.lessonId
  }));

  const deduped = [
    learnerTopic,
    ...top.filter((item) => normalize(item.title) !== normalize(learnerTopic.title))
  ].slice(0, 6);

  return {
    matchedSection:
      bestMatch?.subtopicName ??
      bestMatch?.topicName ??
      request.availableTopics[0]?.subtopicName ??
      request.availableTopics[0]?.topicName ??
      request.subject,
    subtopics: deduped
  };
}

export function parseTopicShortlistResponse(
  payload: GithubModelsSuccessResponse
): TopicShortlistResponse | null {
  const content = payload.choices[0]?.message.content;

  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content) as TopicShortlistResponse;
    if (parsed.matchedSection && Array.isArray(parsed.subtopics)) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}
