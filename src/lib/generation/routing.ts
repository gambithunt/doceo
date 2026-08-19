import type { GeneratableContractId } from './types';

export function generatableContractFor(question: string): GeneratableContractId | null {
	const normalized = question.trim();
	if (
		/\bvaccin(?:e|es|ation|ations)?\b|\bimmune\s+(?:system|memory|response)\b/i.test(normalized)
	) {
		return 'health-vaccines';
	}
	if (/\bbig\s+bang\b|\binflation\b|\bearly\s+universe\b/i.test(normalized)) {
		return 'space-before-big-bang';
	}
	return null;
}
