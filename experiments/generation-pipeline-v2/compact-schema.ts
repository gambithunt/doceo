import { z } from 'zod';

export const CompactSceneSchema = z.object({
	role: z.enum([
		'invitation',
		'grounding',
		'explanatory move',
		'transformation',
		'contrast',
		'boundary',
		'synthesis'
	]),
	title: z.string().min(1).max(64),
	narration: z.string().min(1).max(420),
	visualModelStateIds: z.array(z.string().min(1)).min(1)
});

export const CompactCheckSchema = z.object({
	invitation: z.string().min(1).max(120),
	prompt: z.string().min(1).max(220),
	choices: z
		.array(z.object({ id: z.string().min(1).max(12), label: z.string().min(1).max(220) }))
		.min(3)
		.max(4),
	supportedResponseIds: z.array(z.string().min(1)).min(1),
	feedbackWhenSupported: z.string().min(1).max(220),
	feedbackWhenNotYet: z.string().min(1).max(220)
});

export const CompactLessonDraftSchema = z.object({
	title: z.string().min(1).max(90),
	scenes: z.array(CompactSceneSchema).min(4).max(5),
	check: CompactCheckSchema
});

export const CompactReviewFindingSchema = z.object({
	severity: z.enum(['critical', 'major', 'minor']),
	sceneNumber: z.number().int().min(1).nullable(),
	sourceClaimIds: z.array(z.string()).max(8),
	explanation: z.string().min(1).max(500)
});

export const CompactLessonReviewSchema = z.object({
	decision: z.enum(['approve', 'reject']),
	summary: z.string().min(1).max(400),
	findings: z.array(CompactReviewFindingSchema).max(4)
});

export type CompactLessonDraft = z.infer<typeof CompactLessonDraftSchema>;
export type CompactLessonReview = z.infer<typeof CompactLessonReviewSchema>;
