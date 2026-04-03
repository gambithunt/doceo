export const MAX_TOPIC_DISCOVERY_RESULTS = 12;
export const MAX_MODEL_CANDIDATES = 8;

export interface DashboardTopicDiscoveryRequest {
  subjectId: string;
  curriculumId: string;
  gradeId: string;
  forceRefresh: boolean;
  provider?: string;
  model?: string;
  excludeTopicSignatures: string[];
  limit: number;
}

export interface DashboardTopicDiscoveryModelResponse {
  topics: string[];
}

function cleanLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeKey(value: string): string {
  return cleanLabel(value).toLowerCase();
}

function toTopicLabel(value: string): string {
  const cleaned = cleanLabel(value);

  if (cleaned.length === 0) {
    return cleaned;
  }

  return cleaned.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isGenericTopicLabel(value: string): boolean {
  return new Set([
    'key concepts',
    'core ideas',
    'introduction',
    'summary',
    'revision',
    'study tips',
    'practice questions',
    'problem solving',
    'examples'
  ]).has(normalizeKey(value));
}

export function parseDashboardTopicDiscoveryRequest(
  value: unknown
): { success: true; data: DashboardTopicDiscoveryRequest } | { success: false; error: string } {
  if (!value || typeof value !== 'object') {
    return { success: false, error: 'Invalid JSON body.' };
  }

  const body = value as Record<string, unknown>;

  if (!isNonEmptyString(body.subjectId) || !isNonEmptyString(body.curriculumId) || !isNonEmptyString(body.gradeId)) {
    return { success: false, error: 'subjectId, curriculumId, and gradeId are required.' };
  }

  if (body.forceRefresh !== undefined && typeof body.forceRefresh !== 'boolean') {
    return { success: false, error: 'forceRefresh must be a boolean when provided.' };
  }

  if (body.provider !== undefined && typeof body.provider !== 'string') {
    return { success: false, error: 'provider must be a string when provided.' };
  }

  if (body.model !== undefined && typeof body.model !== 'string') {
    return { success: false, error: 'model must be a string when provided.' };
  }

  if (
    body.excludeTopicSignatures !== undefined &&
    (!Array.isArray(body.excludeTopicSignatures) ||
      body.excludeTopicSignatures.some((item) => typeof item !== 'string' || item.trim().length === 0))
  ) {
    return { success: false, error: 'excludeTopicSignatures must be a string array when provided.' };
  }

  const rawLimit = typeof body.limit === 'number' && Number.isFinite(body.limit) ? Math.floor(body.limit) : MAX_TOPIC_DISCOVERY_RESULTS;

  return {
    success: true,
    data: {
      subjectId: cleanLabel(String(body.subjectId)),
      curriculumId: cleanLabel(String(body.curriculumId)),
      gradeId: cleanLabel(String(body.gradeId)),
      forceRefresh: Boolean(body.forceRefresh),
      provider: typeof body.provider === 'string' ? body.provider : undefined,
      model: typeof body.model === 'string' ? body.model : undefined,
      excludeTopicSignatures: Array.isArray(body.excludeTopicSignatures)
        ? body.excludeTopicSignatures
            .map((item) => cleanLabel(String(item)))
            .filter((item) => item.length > 0)
            .slice(0, MAX_TOPIC_DISCOVERY_RESULTS)
        : [],
      limit: Math.max(1, Math.min(MAX_TOPIC_DISCOVERY_RESULTS, rawLimit))
    }
  };
}

export function normalizeDiscoveryCandidateLabels(labels: string[]): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const label of labels) {
    const cleaned = toTopicLabel(label);
    const key = normalizeKey(cleaned);

    if (cleaned.length === 0 || key.length === 0 || isGenericTopicLabel(cleaned) || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(cleaned);

    if (normalized.length >= MAX_MODEL_CANDIDATES) {
      break;
    }
  }

  return normalized;
}

export function parseDashboardTopicDiscoveryModelResponse(content: string): DashboardTopicDiscoveryModelResponse | null {
  try {
    const parsed = JSON.parse(content) as { topics?: unknown };

    if (!Array.isArray(parsed.topics)) {
      return null;
    }

    const topics = parsed.topics.filter((item): item is string => typeof item === 'string');

    if (topics.length === 0) {
      return null;
    }

    return { topics };
  } catch {
    return null;
  }
}
