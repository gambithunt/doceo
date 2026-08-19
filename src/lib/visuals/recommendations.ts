import type { VisualHistoryEntry } from './history';

export type RecommendationMode = 'default' | 'soap-deeper' | 'soap-reinforcement' | 'soap-adjacent';

export function getRecommendationMode(history: VisualHistoryEntry[]): RecommendationMode {
	const latest = [...history].sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
	if (latest?.lesson.id !== 'everyday-soap') return 'default';
	if (!latest.checkOutcome) return 'soap-adjacent';
	return latest.checkOutcome.supported ? 'soap-deeper' : 'soap-reinforcement';
}
