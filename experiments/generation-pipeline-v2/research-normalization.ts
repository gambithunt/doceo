import type { SourceResearch } from './research-schema.ts';

export function cleanQuickAnswer(value: string) {
	return value
		.replace(/\s*\(\[[^\]]+\]\(https?:\/\/[^)]+\)\)/g, '')
		.replace(/\s*\[[^\]]+\]\(https?:\/\/[^)]+\)/g, '')
		.trim();
}

export function normalizeSourceResearch(research: SourceResearch): SourceResearch {
	return {
		...research,
		quickAnswer: cleanQuickAnswer(research.quickAnswer),
		quickAnswerClaimIds: [
			...new Set([
				...research.quickAnswerClaimIds,
				...research.requirements.flatMap((requirement) => requirement.sourceClaimIds)
			])
		]
	};
}
