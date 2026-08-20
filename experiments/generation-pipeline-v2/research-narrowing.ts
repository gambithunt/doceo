import { z } from 'zod';
import { SourceResearchSchema, type SourceResearch } from './research-schema.ts';

export const ResearchNarrowingSchema = z.object({
	quickAnswer: z.string().min(1).max(700),
	quickAnswerClaimIds: z.array(z.string().min(1)).min(1),
	learningTarget: z.string().min(1),
	requirements: SourceResearchSchema.shape.requirements.min(1)
});

export const DirectQuestionNarrowingSchema = ResearchNarrowingSchema.extend({
	requirements: SourceResearchSchema.shape.requirements.min(1).max(2)
});

export type ResearchNarrowing = z.infer<typeof ResearchNarrowingSchema>;

export function narrowingSchemaFor(research: SourceResearch) {
	return ['fact', 'timeline'].includes(research.questionType)
		? DirectQuestionNarrowingSchema
		: ResearchNarrowingSchema;
}

export function composeNarrowedResearch(
	original: SourceResearch,
	narrowing: ResearchNarrowing
): SourceResearch {
	if (original.decision !== 'answer') {
		throw new Error('Only answered research can be narrowed.');
	}
	const claimTextById = new Map(
		original.sources.flatMap((source) =>
			source.claims.map((claim) => [claim.id, claim.text] as const)
		)
	);
	const requirements = narrowing.requirements.map((requirement) => {
		const claimTexts = requirement.sourceClaimIds.map((claimId) => {
			const claimText = claimTextById.get(claimId);
			if (!claimText) throw new Error(`The narrowed requirement cites unknown claim ${claimId}.`);
			return claimText.trim();
		});
		return {
			...requirement,
			statement: claimTexts.join(' ')
		};
	});
	const selectedQuickAnswerClaimIds = [
		...new Set(
			['fact', 'timeline'].includes(original.questionType)
				? requirements.map((requirement) => requirement.sourceClaimIds[0])
				: requirements.flatMap((requirement) => requirement.sourceClaimIds)
		)
	];
	const quickAnswer = [
		...new Set(selectedQuickAnswerClaimIds.map((claimId) => claimTextById.get(claimId)?.trim()))
	]
		.filter((claimText): claimText is string => Boolean(claimText))
		.map((claimText) => (/[.!?]$/.test(claimText) ? claimText : `${claimText}.`))
		.join(' ');
	if (quickAnswer.length > 700) {
		throw new Error('The supported requirements do not fit in a concise quick answer.');
	}
	return SourceResearchSchema.parse({
		...original,
		quickAnswer,
		quickAnswerClaimIds: selectedQuickAnswerClaimIds,
		learningTarget: narrowing.learningTarget,
		requirements
	});
}
