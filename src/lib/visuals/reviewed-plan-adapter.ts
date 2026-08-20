import { z } from 'zod';
import type { VisualLessonFixture, VisualNode } from './types';

const RelationshipSchema = z.enum([
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
]);

const ReviewedPlanArtifactSchema = z.object({
	status: z.literal('reviewed-proposal'),
	createdAt: z.string().min(1),
	questionFingerprint: z.string().min(10),
	validation: z.object({ passed: z.literal(true) }),
	review: z.object({
		decision: z.literal('approve'),
		summary: z.string().min(1),
		findings: z.array(z.object({ explanation: z.string().min(1) }))
	}),
	reviewValidation: z.object({ passed: z.literal(true) }),
	plan: z.object({
		normalizedQuestion: z.string().min(1),
		focusedIdea: z.string().min(1),
		learnerOutcome: z.string().min(1),
		startingPoint: z.string().min(1),
		visualFamily: z.string().min(1),
		visualRationale: z.string().min(1),
		visualStates: z
			.array(
				z.object({
					id: z.string().min(1),
					label: z.string().min(1),
					relationshipToPrevious: RelationshipSchema
				})
			)
			.min(2)
			.max(6),
		optionalCheck: z.object({
			prompt: z.string().min(1),
			successEvidence: z.string().min(1)
		}),
		sources: z.array(
			z.object({
				title: z.string().min(1),
				authority: z.string().min(1),
				url: z.string().url()
			})
		)
	})
});

export type ReviewedPlanArtifact = z.infer<typeof ReviewedPlanArtifactSchema>;

function relationshipKicker(relationship: VisualNode['relationshipToPrevious']) {
	switch (relationship) {
		case 'same_event':
			return 'In the same moment';
		case 'earlier_to_later':
			return 'What came next';
		case 'causes':
			return 'What this changes';
		case 'transforms_into':
			return 'Watch the change';
		case 'contrasts_with':
			return 'See the difference';
		case 'contains':
		case 'part_of':
			return 'Look inside';
		case 'increases':
		case 'decreases':
			return 'Follow the amount';
		case 'answers':
			return 'The checked answer';
		default:
			return 'Start here';
	}
}

export function adaptReviewedPlanArtifact(value: unknown): VisualLessonFixture {
	const artifact = ReviewedPlanArtifactSchema.parse(value);
	const { plan } = artifact;
	const nodes: VisualNode[] = plan.visualStates.map((state, sequenceIndex) => ({
		id: state.id,
		label: state.label,
		sequenceIndex,
		status: 'fact',
		relationshipToPrevious: state.relationshipToPrevious
	}));
	const factReveal = nodes.some((node) => node.relationshipToPrevious === 'answers');
	const frames = factReveal
		? [
				{
					kicker: 'Quick recall',
					title: plan.normalizedQuestion,
					caption: plan.startingPoint,
					activeStateIds: [nodes[0].id]
				},
				{
					kicker: 'The checked answer',
					title: plan.normalizedQuestion,
					caption: plan.focusedIdea,
					activeStateIds: nodes.map((node) => node.id)
				}
			]
		: nodes.map((node, index) => ({
				kicker: relationshipKicker(node.relationshipToPrevious),
				title: node.label,
				caption: index === nodes.length - 1 ? plan.focusedIdea : plan.startingPoint,
				activeStateIds: nodes.slice(0, index + 1).map((state) => state.id)
			}));

	return {
		id: `generated-${artifact.questionFingerprint.slice(0, 12)}`,
		artifactVersion: artifact.createdAt,
		kind: factReveal ? 'fact-reveal' : 'concept-sequence',
		title: plan.normalizedQuestion,
		nodes,
		evidenceLinks: [],
		frames,
		check: {
			kind: 'recall',
			invitation: 'Say it to yourself, then reveal the checked answer.',
			prompt: plan.optionalCheck.prompt,
			answer: plan.optionalCheck.successEvidence
		},
		provenance: {
			approval: 'independently-reviewed',
			sources: plan.sources,
			reviewSummary: artifact.review.summary,
			reviewNotes: artifact.review.findings.map((finding) => finding.explanation)
		}
	};
}
