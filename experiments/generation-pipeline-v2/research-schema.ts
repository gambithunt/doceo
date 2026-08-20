import { z } from 'zod';

export const ResearchClaimSchema = z.object({
	id: z.string().min(1),
	text: z.string().min(1)
});

export const ResearchSourceSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1),
	authority: z.string().min(1),
	url: z.string().min(1),
	sourceTier: z.enum(['primary_authority', 'scholarly', 'established_educational']),
	claims: z.array(ResearchClaimSchema).min(1).max(5)
});

export const SourceResearchSchema = z.object({
	decision: z.enum(['answer', 'decline']),
	declineReason: z.string().nullable(),
	normalizedQuestion: z.string().min(1),
	questionType: z.enum([
		'fact',
		'definition',
		'mechanism',
		'process',
		'comparison',
		'timeline',
		'application',
		'other'
	]),
	learnerAudience: z.enum(['young', 'general', 'advanced']),
	quickAnswer: z.string().min(1),
	quickAnswerClaimIds: z.array(z.string().min(1)),
	learningTarget: z.string().min(1),
	requirements: z
		.array(
			z.object({
				id: z.string().min(1),
				kind: z.enum([
					'fact',
					'definition',
					'causal',
					'spatial',
					'temporal',
					'comparative',
					'equation',
					'exception'
				]),
				statement: z.string().min(1),
				sourceClaimIds: z.array(z.string().min(1)).min(1)
			})
		)
		.max(4),
	sources: z.array(ResearchSourceSchema).max(4)
});

export const ResearchSufficiencySchema = z.object({
	decision: z.enum(['pass', 'reject']),
	summary: z.string().min(1),
	quickAnswerStatus: z.enum(['supported', 'partial', 'unsupported']),
	quickAnswerClaimIds: z.array(z.string()),
	coverage: z.array(
		z.object({
			requirementId: z.string().min(1),
			status: z.enum(['supported', 'partial', 'unsupported']),
			sourceClaimIds: z.array(z.string()),
			explanation: z.string().min(1)
		})
	)
});

export type SourceResearch = z.infer<typeof SourceResearchSchema>;
export type ResearchSufficiency = z.infer<typeof ResearchSufficiencySchema>;
