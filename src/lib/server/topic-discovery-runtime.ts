interface TopicDiscoveryCacheEntry<T> {
  payload: T;
  expiresAt: number;
}

const DEFAULT_TOPIC_DISCOVERY_CACHE_TTL_MS = 30_000;
const DEFAULT_TOPIC_DISCOVERY_EDGE_TIMEOUT_MS = 4_500;
const topicDiscoveryCache = new Map<string, TopicDiscoveryCacheEntry<unknown>>();

function parsePositiveIntegerEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export function isDashboardTopicDiscoveryEnabled(): boolean {
  return process.env.DOCEO_ENABLE_DASHBOARD_TOPIC_DISCOVERY !== 'false';
}

export function getTopicDiscoveryCacheTtlMs(): number {
  return parsePositiveIntegerEnv(process.env.DOCEO_TOPIC_DISCOVERY_CACHE_TTL_MS, DEFAULT_TOPIC_DISCOVERY_CACHE_TTL_MS);
}

export function getTopicDiscoveryEdgeTimeoutMs(): number {
  return parsePositiveIntegerEnv(
    process.env.DOCEO_TOPIC_DISCOVERY_EDGE_TIMEOUT_MS,
    DEFAULT_TOPIC_DISCOVERY_EDGE_TIMEOUT_MS
  );
}

export function buildTopicDiscoveryCacheKey(input: {
  subjectId: string;
  curriculumId: string;
  gradeId: string;
  provider: string;
  model: string;
}): string {
  return [input.subjectId, input.curriculumId, input.gradeId, input.provider, input.model].join('::');
}

export function getCachedTopicDiscoveryPayload<T>(key: string, now = Date.now()): T | null {
  const cached = topicDiscoveryCache.get(key);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= now) {
    topicDiscoveryCache.delete(key);
    return null;
  }

  return cached.payload as T;
}

export function setCachedTopicDiscoveryPayload<T>(key: string, payload: T, ttlMs = getTopicDiscoveryCacheTtlMs()): void {
  topicDiscoveryCache.set(key, {
    payload,
    expiresAt: Date.now() + ttlMs
  });
}

export function clearTopicDiscoveryRouteCache(): void {
  topicDiscoveryCache.clear();
}

export function logTopicDiscoveryRoute(
  level: 'info' | 'warn' | 'error',
  event: string,
  data: Record<string, unknown>
): void {
  console[level](
    JSON.stringify({
      event,
      ...data
    })
  );
}
