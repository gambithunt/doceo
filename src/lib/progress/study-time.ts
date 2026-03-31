import type { LessonSession } from '$lib/types';

const MAX_ACTIVE_GAP_MINUTES = 8;

function parseTime(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function estimateLessonSessionStudyMinutes(
  session: Pick<LessonSession, 'startedAt' | 'lastActiveAt' | 'messages'>
): number {
  const startedAt = parseTime(session.startedAt);
  const lastActiveAt = parseTime(session.lastActiveAt);

  if (startedAt === null || lastActiveAt === null || lastActiveAt <= startedAt) {
    return 0;
  }

  const timePoints = [
    startedAt,
    ...session.messages
      .map((message) => parseTime(message.timestamp))
      .filter((value): value is number => value !== null),
    lastActiveAt
  ].sort((left, right) => left - right);

  let totalMinutes = 0;

  for (let index = 1; index < timePoints.length; index += 1) {
    const gapMinutes = Math.max(0, Math.round((timePoints[index]! - timePoints[index - 1]!) / 60000));
    totalMinutes += Math.min(gapMinutes, MAX_ACTIVE_GAP_MINUTES);
  }

  if (totalMinutes > 0) {
    return totalMinutes;
  }

  return Math.max(1, Math.round((lastActiveAt - startedAt) / 60000));
}
