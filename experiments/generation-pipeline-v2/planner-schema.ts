import { z } from 'zod';

export const PlannerSourceSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1),
	authority: z.string().min(1),
	url: z.string().min(1),
	sourceTier: z.enum(['primary_authority', 'scholarly', 'established_educational']),
	claims: z
		.array(
			z.object({
				id: z.string().min(1),
				text: z.string().min(1)
			})
		)
		.min(1)
		.max(5)
});

export const QuestionPlanSchema = z.object({
	decision: z.enum(['propose', 'reject']),
	rejectionReason: z.string().nullable(),
	normalizedQuestion: z.string().min(1),
	domain: z.enum(['science', 'math', 'history', 'practical', 'arts', 'language', 'other']),
	learnerAudience: z.enum(['young', 'general', 'advanced']),
	focusedIdea: z.string().min(1),
	focusedIdeaClaimIds: z.array(z.string().min(1)).min(1),
	learnerOutcome: z.string().min(1),
	learnerOutcomeClaimIds: z.array(z.string().min(1)).min(1),
	startingPoint: z.string().min(1),
	visualFamily: z.enum([
		'timeline',
		'process',
		'comparison',
		'spatial',
		'cause_and_effect',
		'classification',
		'quantity',
		'none'
	]),
	visualRationale: z.string().min(1),
	visualStates: z
		.array(
			z.object({
				id: z.string().min(1),
				label: z.string().min(1),
				sourceClaimIds: z.array(z.string().min(1)).min(1),
				relationshipToPrevious: z.enum([
					'start',
					'same_event',
					'earlier_to_later',
					'causes',
					'transforms_into',
					'contrasts_with',
					'contains',
					'part_of',
					'increases',
					'decreases',
					'answers'
				])
			})
		)
		.max(6),
	likelyMisconceptions: z
		.array(
			z.object({
				text: z.string().min(1),
				sourceClaimIds: z.array(z.string().min(1)).min(1)
			})
		)
		.max(4),
	safeBoundary: z.string().min(1),
	safeBoundaryClaimIds: z.array(z.string().min(1)),
	optionalCheck: z.object({
		prompt: z.string().min(1),
		successEvidence: z.string().min(1),
		sourceClaimIds: z.array(z.string().min(1)).min(1)
	}),
	sources: z.array(PlannerSourceSchema).max(4)
});

export const QuestionPlanReviewSchema = z.object({
	decision: z.enum(['approve', 'reject']),
	summary: z.string().min(1),
	findings: z.array(
		z.object({
			severity: z.enum(['major', 'minor']),
			path: z.string().min(1),
			sourceClaimIds: z.array(z.string()),
			explanation: z.string().min(1)
		})
	)
});

export const ResearchBasedProposalSchema = QuestionPlanSchema.omit({
	decision: true,
	rejectionReason: true,
	visualFamily: true,
	sources: true
}).extend({
	visualFamily: z.enum([
		'timeline',
		'process',
		'comparison',
		'spatial',
		'cause_and_effect',
		'classification',
		'quantity'
	])
});

export const ResearchBasedPlanSchema = z.object({
	decision: z.enum(['propose', 'reject']),
	rejectionReason: z.string().nullable(),
	proposal: ResearchBasedProposalSchema.nullable()
});

export type QuestionPlan = z.infer<typeof QuestionPlanSchema>;
export type QuestionPlanReview = z.infer<typeof QuestionPlanReviewSchema>;
export type ResearchBasedPlan = z.infer<typeof ResearchBasedPlanSchema>;
