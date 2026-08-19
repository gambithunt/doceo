import { z } from 'zod';

export const TeachingPatternSchema = z.enum([
	'contrast viewpoints',
	'concrete to abstract',
	'process and consequence',
	'compare and distinguish',
	'worked example',
	'narrative and perspective',
	'evidence to inference'
]);

export const LessonContractSchema = z.object({
	id: z.string().min(1),
	domain: z.enum([
		'space and physical science',
		'everyday science and how things work',
		'foundational mathematics',
		'human body and health'
	]),
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
	sourceBasis: z
		.array(
			z.object({
				title: z.string().min(1),
				authority: z.string().min(1),
				url: z.string().url(),
				claims: z.array(z.string()).min(1)
			})
		)
		.min(1),
	mediaRationale: z.string().min(1),
	optionalEvidenceTarget: z.string().min(1),
	safeBoundary: z.string().min(1)
});

export const LessonOutlineSchema = z.object({
	title: z.string().min(1),
	focusedIdea: z.string().min(1),
	learnerOutcome: z.string().min(1),
	scenes: z
		.array(
			z.object({
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
				purpose: z.string().min(1),
				visualJob: z.string().min(1),
				sourceIds: z.array(z.string())
			})
		)
		.min(3)
		.max(10),
	checkPlan: z.object({
		interactionType: z.enum([
			'prediction',
			'choice',
			'sort',
			'construct',
			'match',
			'short explanation'
		]),
		action: z.string().min(1),
		evidenceTarget: z.string().min(1)
	})
});

export const GeneratedSceneSchema = z.object({
	role: LessonOutlineSchema.shape.scenes.element.shape.role,
	title: z.string().min(1),
	durationSeconds: z.number().int().min(8).max(35),
	narration: z.string().min(1),
	captions: z.array(z.string()).min(1),
	visualDirection: z.string().min(1),
	motionRationale: z.string().min(1),
	sourceSupport: z.array(z.string())
});

export const GeneratedCheckSchema = z.object({
	invitation: z.string().min(1),
	interactionType: LessonOutlineSchema.shape.checkPlan.shape.interactionType,
	action: z.string().min(1),
	prompt: z.string().min(1),
	choices: z.array(
		z.object({
			id: z.string().min(1),
			label: z.string().min(1)
		})
	),
	supportedResponseIds: z.array(z.string()),
	successEvidence: z.string().min(1),
	misconceptionEvidence: z.string().min(1),
	feedbackWhenSupported: z.string().min(1),
	feedbackWhenNotYet: z.string().min(1)
});

export type LessonContract = z.infer<typeof LessonContractSchema>;
export type LessonOutline = z.infer<typeof LessonOutlineSchema>;
export type GeneratedScene = z.infer<typeof GeneratedSceneSchema>;
export type GeneratedCheck = z.infer<typeof GeneratedCheckSchema>;
