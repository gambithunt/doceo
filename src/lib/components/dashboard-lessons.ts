import type { LessonSession } from '$lib/types';

export function deriveDashboardLessonLists(lessonSessions: LessonSession[]): {
  currentSession: LessonSession | null;
  recentLessons: LessonSession[];
} {
  const nonArchivedSessions = lessonSessions
    .filter((session) => session.status !== 'archived')
    .sort((left, right) => Date.parse(right.lastActiveAt) - Date.parse(left.lastActiveAt));
  const activeLessons = nonArchivedSessions.filter((session) => session.status === 'active');
  const currentSession = activeLessons[0] ?? null;

  if (nonArchivedSessions.length <= 1) {
    return {
      currentSession,
      recentLessons: nonArchivedSessions.slice(0, 4)
    };
  }

  return {
    currentSession,
    recentLessons: nonArchivedSessions.filter((session) => session.id !== currentSession?.id).slice(0, 4)
  };
}

export function computeLearningStreak(lessonSessions: LessonSession[]): number {
  if (lessonSessions.length === 0) return 0;

  const activeDays = new Set(
    lessonSessions
      .filter((s) => s.status !== 'archived')
      .map((s) => {
        const d = new Date(s.lastActiveAt);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
  );

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
    if (activeDays.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return streak;
}
