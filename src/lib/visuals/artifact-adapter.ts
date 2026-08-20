import { z } from 'zod';
import type { VisualLessonFixture, VisualNode } from './types';

const TimelineModelSchema = z.object({
	kind: z.literal('timeline'),
	direction: z.literal('earlier_to_later'),
	events: z.array(
		z.object({
			id: z.string().min(1),
			label: z.string().min(1),
			epistemicStatus: z.enum(['observed', 'inferred', 'unknown']),
			sequenceIndex: z.number().int().min(0)
		})
	),
	evidenceLinks: z.array(
		z.object({
			fromEventId: z.string().min(1),
			toEventId: z.string().min(1),
			relationship: z.literal('supports_inference')
		})
	)
});

const ImmuneModelSchema = z.object({
	kind: z.literal('immune_response'),
	stages: z.array(
		z.object({
			id: z.string().min(1),
			label: z.string().min(1),
			type: z.enum([
				'vaccination',
				'immune_response',
				'memory',
				'reexposure',
				'rapid_antibody_response',
				'possible_infection',
				'reduced_severity'
			]),
			sequenceIndex: z.number().int().min(0)
		})
	),
	protectionMeanings: z.array(z.string())
});

const ContainmentModelSchema = z.object({
	kind: z.literal('containment_sequence'),
	states: z.array(
		z.object({
			id: z.string().min(1),
			label: z.string().min(1),
			materialState: z.enum([
				'on_surface',
				'soap_interacting',
				'dispersed_in_water_inside_micelles',
				'carried_away'
			]),
			sequenceIndex: z.number().int().min(0)
		})
	)
});

const ApprovedVisualArtifactSchema = z.object({
	status: z.literal('approved'),
	createdAt: z.string().min(1),
	contract: z.object({
		id: z.string().min(1),
		topic: z.string().min(1),
		visualModel: z.discriminatedUnion('kind', [
			TimelineModelSchema,
			ImmuneModelSchema,
			ContainmentModelSchema
		]),
		sources: z
			.array(
				z.object({
					title: z.string().min(1),
					authority: z.string().min(1),
					url: z.string().url()
				})
			)
			.default([])
	}),
	draft: z.object({
		title: z.string().min(1),
		scenes: z
			.array(
				z.object({
					role: z.string().min(1),
					title: z.string().min(1),
					narration: z.string().min(1),
					visualModelStateIds: z.array(z.string().min(1)).min(1)
				})
			)
			.min(1),
		check: z
			.object({
				invitation: z.string().min(1),
				prompt: z.string().min(1),
				choices: z.array(z.object({ id: z.string().min(1), label: z.string().min(1) })).min(2),
				supportedResponseIds: z.array(z.string().min(1)).min(1),
				feedbackWhenSupported: z.string().min(1),
				feedbackWhenNotYet: z.string().min(1)
			})
			.optional()
	}),
	review: z.object({
		decision: z.literal('approve'),
		summary: z.string().min(1),
		findings: z.array(z.object({ explanation: z.string().min(1) })).default([])
	})
});

export type ApprovedVisualArtifact = z.infer<typeof ApprovedVisualArtifactSchema>;

function titleCase(value: string) {
	return value.replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function assertSceneReferences(artifact: ApprovedVisualArtifact, nodeIds: Set<string>) {
	for (const [sceneIndex, scene] of artifact.draft.scenes.entries()) {
		for (const stateId of scene.visualModelStateIds) {
			if (!nodeIds.has(stateId)) {
				throw new Error(`Scene ${sceneIndex + 1} references unknown visual state: ${stateId}`);
			}
		}
	}
}

export function adaptApprovedVisualArtifact(value: unknown): VisualLessonFixture {
	const artifact = ApprovedVisualArtifactSchema.parse(value);
	const model = artifact.contract.visualModel;
	const nodes: VisualNode[] =
		model.kind === 'timeline'
			? model.events.map((event) => ({
					id: event.id,
					label: event.label,
					sequenceIndex: event.sequenceIndex,
					status: event.epistemicStatus
				}))
			: model.kind === 'immune_response'
				? model.stages.map((stage) => ({
						id: stage.id,
						label: stage.label,
						sequenceIndex: stage.sequenceIndex,
						status:
							stage.type === 'rapid_antibody_response'
								? 'rapid-response'
								: stage.type === 'possible_infection'
									? 'possible-infection'
									: stage.type === 'reduced_severity'
										? 'reduced-severity'
										: stage.type === 'immune_response'
											? 'immune-response'
											: stage.type
					}))
				: model.states.map((state) => ({
						id: state.id,
						label: state.label,
						sequenceIndex: state.sequenceIndex,
						status: state.materialState.replaceAll('_', '-') as VisualNode['status']
					}));

	const orderedNodes = nodes.sort((a, b) => a.sequenceIndex - b.sequenceIndex);
	assertSceneReferences(artifact, new Set(orderedNodes.map((node) => node.id)));

	return {
		id: artifact.contract.id,
		artifactVersion: artifact.createdAt,
		kind:
			model.kind === 'timeline'
				? 'timeline'
				: model.kind === 'immune_response'
					? 'immune-response'
					: 'containment-sequence',
		title: artifact.draft.title,
		nodes: orderedNodes,
		evidenceLinks:
			model.kind === 'timeline'
				? model.evidenceLinks.map((link) => ({
						from: link.fromEventId,
						to: link.toEventId
					}))
				: [],
		frames: artifact.draft.scenes.map((scene) => ({
			kicker: titleCase(scene.role),
			title: scene.title,
			caption: scene.narration,
			activeStateIds: scene.visualModelStateIds
		})),
		check: artifact.draft.check ? { kind: 'choice', ...artifact.draft.check } : undefined,
		provenance: {
			approval: 'independently-reviewed',
			sources: artifact.contract.sources,
			reviewSummary: artifact.review.summary,
			reviewNotes: artifact.review.findings.map((finding) => finding.explanation)
		}
	};
}
