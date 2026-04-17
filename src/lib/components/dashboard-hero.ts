import type {
  DashboardTopicDiscoverySuggestion,
  LessonSession,
  Subject
} from '$lib/types';

interface DashboardHeroSummary {
  completedLessons: number;
  totalLessons: number;
  averageMastery: number;
}

interface DeriveDashboardHeroStateInput {
  currentSession: LessonSession | null;
  selectedSubject: Subject | undefined;
  discoveryTopics: DashboardTopicDiscoverySuggestion[];
  summary: DashboardHeroSummary;
}

interface DashboardHeroCopyContract {
  kicker: string;
  title: string;
  supportingLine: string;
  primaryCtaLabel: string;
  secondaryCtaLabel?: string;
  recommendationReason?: string;
}

export type DashboardHeroState =
  | (DashboardHeroCopyContract & {
      mode: 'resume';
      session: LessonSession;
    })
  | (DashboardHeroCopyContract & {
      mode: 'recommended';
      suggestion: DashboardTopicDiscoverySuggestion;
    })
  | (DashboardHeroCopyContract & {
      mode: 'guided_start';
    });

export function deriveDashboardHeroState({
  currentSession,
  selectedSubject,
  discoveryTopics,
  summary
}: DeriveDashboardHeroStateInput): DashboardHeroState {
  if (currentSession) {
    return {
      mode: 'resume',
      session: currentSession,
      kicker: 'Current Mission',
      title: currentSession.topicTitle,
      supportingLine: `${currentSession.subject} · Pick up where you left off.`,
      primaryCtaLabel: 'Resume →'
    };
  }

  const firstSuggestion = discoveryTopics[0];
  if (firstSuggestion) {
    const subjectName = selectedSubject?.name ?? 'this subject';
    return {
      mode: 'recommended',
      suggestion: firstSuggestion,
      kicker: 'Recommended Next Mission',
      title: firstSuggestion.topicLabel,
      supportingLine: `Best next step in ${subjectName}.`,
      primaryCtaLabel: 'Start mission',
      secondaryCtaLabel: 'Show other options',
      recommendationReason: firstSuggestion.reason || `A strong next step in ${subjectName}.`
    };
  }

  return {
    mode: 'guided_start',
    kicker: 'Start Your Next Mission',
    title: 'Pick a topic to begin',
    supportingLine:
      summary.completedLessons > 0
        ? `${summary.completedLessons} lesson${summary.completedLessons === 1 ? '' : 's'} completed. Choose where to go next.`
        : 'Choose a subject and start your next lesson.',
    primaryCtaLabel: 'Explore topics'
  };
}
