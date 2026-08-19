import { z } from 'zod';
import { LessonDraftV2Schema, LessonReviewSchema } from './schema.ts';

export const RepairCandidateArtifactSchema = z
	.object({
		status: z.literal('rejected'),
		parentCandidatePath: z.never().optional(),
		preflightPath: z.string().min(1),
		contract: z.object({ id: z.string().min(1) }).passthrough(),
		draft: LessonDraftV2Schema,
		review: LessonReviewSchema
	})
	.refine(
		(artifact) =>
			artifact.review.decision === 'reject' &&
			artifact.review.findings.some((finding) => ['critical', 'major'].includes(finding.severity)),
		{
			message: 'Repair requires a rejected review with at least one critical or major finding.',
			path: ['review']
		}
	);

export type RepairCandidateArtifact = z.infer<typeof RepairCandidateArtifactSchema>;
