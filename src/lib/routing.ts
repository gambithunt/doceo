import type { AppScreen, AppState } from '$lib/types';

export function dashboardPath(): string {
  return '/dashboard';
}

export function onboardingPath(): string {
  return '/onboarding';
}

export function progressPath(): string {
  return '/progress';
}

export function settingsPath(): string {
  return '/settings';
}

export function revisionPath(): string {
  return '/revision';
}

export function subjectPath(subjectId: string): string {
  return `/subjects/${encodeURIComponent(subjectId)}`;
}

export function lessonSessionPath(sessionId: string): string {
  return `/lesson/session/${encodeURIComponent(sessionId)}`;
}

export function pathForScreen(screen: AppScreen, state: AppState): string {
  switch (screen) {
    case 'dashboard':
      return dashboardPath();
    case 'onboarding':
      return onboardingPath();
    case 'progress':
      return progressPath();
    case 'settings':
      return settingsPath();
    case 'revision':
      return revisionPath();
    case 'subject':
      return subjectPath(state.ui.selectedSubjectId);
    case 'lesson':
      return state.ui.activeLessonSessionId ? lessonSessionPath(state.ui.activeLessonSessionId) : dashboardPath();
    case 'landing':
    default:
      return '/';
  }
}

export function entryPathForState(state: AppState): string {
  if (state.auth.status !== 'signed_in') {
    return '/';
  }

  return state.onboarding.completed ? dashboardPath() : onboardingPath();
}
