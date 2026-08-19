import { z } from 'zod';
import { TeachingPatternSchema } from '../generation-spike/schema.ts';
import { VisualPrimitiveSchema } from './visual-primitives.ts';

export const SourceClaimSchema = z.object({
	id: z.string().min(1),
	text: z.string().min(1)
});

export const SourceSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1),
	authority: z.string().min(1),
	url: z.string().url(),
	claims: z.array(SourceClaimSchema).min(1)
});

export const LessonContractV2Schema = z.object({
	id: z.string().min(1),
	domain: z.string().min(1),
	difficulty: z.enum(['representative', 'hard']),
	topic: z.string().min(1),
	learnerIntent: z.string().min(1),
	startingPoint: z.string().min(1),
	chosenApproach: z.string().min(1),
	focusedIdea: z.string().min(1),
	learnerOutcome: z.string().min(1),
	prerequisites: z.array(z.string()),
	likelyMisconceptions: z.array(z.string()).min(1),
	teachingPattern: TeachingPatternSchema,
	sources: z.array(SourceSchema).min(1),
	mediaRationale: z.string().min(1),
	visualModel: VisualPrimitiveSchema.nullable(),
	visualConstraints: z.array(z.string().min(1)).min(1),
	optionalEvidenceTarget: z.string().min(1),
	safeBoundary: z.string().min(1)
});

export const SceneV2Schema = z.object({
	role: z.enum([
		'invitation',
		'grounding',
		'explanatory move',
		'transformation',
		'contrast',
		'boundary',
		'synthesis'
	]),
	title: z.string().min(1),
	durationSeconds: z.number().int().min(8).max(30),
	narration: z.string().min(1),
	captions: z.array(z.string().min(1)).min(1),
	visualDirection: z.string().min(1),
	visualModelStateIds: z.array(z.string().min(1)),
	visualAssertions: z
		.array(
			z.object({
				statement: z.string().min(1),
				sourceClaimIds: z.array(z.string().min(1)).min(1)
			})
		)
		.min(1),
	motionRationale: z.string().min(1),
	sourceClaimIds: z.array(z.string().min(1)).min(1)
});

export const CheckV2Schema = z.object({
	invitation: z.string().min(1),
	interactionType: z.enum([
		'prediction',
		'choice',
		'sort',
		'construct',
		'match',
		'short explanation'
	]),
	action: z.string().min(1),
	prompt: z.string().min(1),
	choices: z.array(z.object({ id: z.string().min(1), label: z.string().min(1) })),
	supportedResponseIds: z.array(z.string().min(1)),
	successEvidence: z.string().min(1),
	misconceptionEvidence: z.string().min(1),
	feedbackWhenSupported: z.string().min(1),
	feedbackWhenNotYet: z.string().min(1)
});

export const LessonDraftV2Schema = z.object({
	title: z.string().min(1),
	focusedIdea: z.string().min(1),
	learnerOutcome: z.string().min(1),
	scenes: z.array(SceneV2Schema).min(4).max(7),
	constraintCoverage: z.array(
		z.object({
			constraintIndex: z.number().int().min(0),
			sceneNumbers: z.array(z.number().int().min(1).max(7)).min(1)
		})
	),
	check: CheckV2Schema
});

export const ReviewFindingSchema = z.object({
	severity: z.enum(['critical', 'major', 'minor']),
	sceneNumber: z.number().int().min(1).nullable(),
	sourceClaimIds: z.array(z.string()),
	explanation: z.string().min(1)
});

export const LessonReviewSchema = z.object({
	decision: z.enum(['approve', 'reject']),
	summary: z.string().min(1),
	findings: z.array(ReviewFindingSchema)
});

export const ContractTargetSchema = z.enum([
	'focusedIdea',
	'chosenApproach',
	'learnerOutcome',
	'optionalEvidenceTarget',
	'safeBoundary',
	'visualConstraints'
]);

export const ContractPreflightSchema = z.object({
	decision: z.enum(['pass', 'reject']),
	summary: z.string().min(1),
	coverage: z.array(
		z.object({
			target: ContractTargetSchema,
			targetText: z.string().min(1),
			status: z.enum(['supported', 'partial', 'unsupported', 'not_applicable']),
			sourceClaimIds: z.array(z.string()),
			explanation: z.string().min(1),
			missingSupport: z.string().nullable()
		})
	)
});

export type LessonContractV2 = z.infer<typeof LessonContractV2Schema>;
export type LessonDraftV2 = z.infer<typeof LessonDraftV2Schema>;
export type LessonReview = z.infer<typeof LessonReviewSchema>;
export type ContractPreflight = z.infer<typeof ContractPreflightSchema>;
