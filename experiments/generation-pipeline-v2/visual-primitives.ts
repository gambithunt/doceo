import { z } from 'zod';

const TimelineEventSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	concept: z.enum(['unknown_before', 'inflation', 'observed_evidence', 'other']),
	epistemicStatus: z.enum(['observed', 'inferred', 'unknown']),
	sequenceIndex: z.number().int().min(0)
});

const TimelinePrimitiveSchema = z.object({
	kind: z.literal('timeline'),
	direction: z.literal('earlier_to_later'),
	events: z.array(TimelineEventSchema).min(2),
	evidenceLinks: z.array(
		z.object({
			fromEventId: z.string().min(1),
			toEventId: z.string().min(1),
			relationship: z.literal('supports_inference')
		})
	)
});

const ImmuneResponsePrimitiveSchema = z.object({
	kind: z.literal('immune_response'),
	antigenFormsDisplay: z.enum(['one_example', 'alternatives_not_combined']),
	stages: z
		.array(
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
		)
		.min(2),
	protectionMeanings: z
		.array(
			z.enum([
				'immune_preparation',
				'rapid_antibody_response',
				'reduced_severity',
				'infection_still_possible'
			])
		)
		.min(1)
});

const ContainmentSequencePrimitiveSchema = z.object({
	kind: z.literal('containment_sequence'),
	states: z
		.array(
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
		.min(2)
});

const RelationshipDiagramPrimitiveSchema = z.object({
	kind: z.literal('relationship_diagram'),
	relationships: z
		.array(
			z.object({
				from: z.string().min(1),
				to: z.string().min(1),
				relation: z.enum(['supports', 'contrasts_with', 'contains', 'transforms_to'])
			})
		)
		.min(1)
});

export const VisualPrimitiveSchema = z.discriminatedUnion('kind', [
	TimelinePrimitiveSchema,
	ImmuneResponsePrimitiveSchema,
	ContainmentSequencePrimitiveSchema,
	RelationshipDiagramPrimitiveSchema
]);

export type VisualPrimitive = z.infer<typeof VisualPrimitiveSchema>;

export type PrimitiveIssue = {
	code: string;
	message: string;
};

function unique(values: Array<string | number>) {
	return new Set(values).size === values.length;
}

export function validateVisualPrimitive(primitive: VisualPrimitive): PrimitiveIssue[] {
	const issues: PrimitiveIssue[] = [];

	if (primitive.kind === 'timeline') {
		if (!unique(primitive.events.map((event) => event.id))) {
			issues.push({
				code: 'duplicate_timeline_event',
				message: 'Timeline event IDs must be unique.'
			});
		}
		if (!unique(primitive.events.map((event) => event.sequenceIndex))) {
			issues.push({
				code: 'duplicate_timeline_position',
				message: 'Timeline sequence indexes must be unique.'
			});
		}
		const eventById = new Map(primitive.events.map((event) => [event.id, event]));
		for (const link of primitive.evidenceLinks) {
			const from = eventById.get(link.fromEventId);
			const to = eventById.get(link.toEventId);
			if (!from || !to) {
				issues.push({
					code: 'dangling_timeline_evidence_link',
					message: 'Timeline evidence links must reference existing events.'
				});
				continue;
			}
			if (from.epistemicStatus !== 'observed' || to.epistemicStatus !== 'inferred') {
				issues.push({
					code: 'invalid_evidence_link_status',
					message: 'Evidence must link from an observed event to an inferred event.'
				});
			}
		}
		const inflation = primitive.events.find((event) => event.concept === 'inflation');
		const evidence = primitive.events.filter((event) => event.concept === 'observed_evidence');
		if (inflation && evidence.some((event) => event.sequenceIndex <= inflation.sequenceIndex)) {
			issues.push({
				code: 'reversed_timeline_evidence',
				message: 'Observed evidence for inflation must appear later than inferred inflation.'
			});
		}
		const unknownBefore = primitive.events.find((event) => event.concept === 'unknown_before');
		if (unknownBefore && inflation && unknownBefore.sequenceIndex >= inflation.sequenceIndex) {
			issues.push({
				code: 'reversed_unknown_before_inflation',
				message: 'The unknown-before region must precede inflation.'
			});
		}
	}

	if (primitive.kind === 'immune_response') {
		if (!unique(primitive.stages.map((stage) => stage.id))) {
			issues.push({ code: 'duplicate_immune_stage', message: 'Immune stage IDs must be unique.' });
		}
		if (!unique(primitive.stages.map((stage) => stage.sequenceIndex))) {
			issues.push({
				code: 'duplicate_immune_position',
				message: 'Immune stage sequence indexes must be unique.'
			});
		}
		const firstIndex = (type: (typeof primitive.stages)[number]['type']) =>
			primitive.stages.find((stage) => stage.type === type)?.sequenceIndex;
		const vaccination = firstIndex('vaccination');
		const memory = firstIndex('memory');
		const reexposure = firstIndex('reexposure');
		const rapidResponse = firstIndex('rapid_antibody_response');
		if (vaccination !== undefined && memory !== undefined && vaccination >= memory) {
			issues.push({
				code: 'reversed_vaccination_memory',
				message: 'Vaccination must precede established immune memory.'
			});
		}
		if (memory !== undefined && reexposure !== undefined && memory >= reexposure) {
			issues.push({
				code: 'reversed_memory_reexposure',
				message: 'Established immune memory must precede re-exposure.'
			});
		}
		if (reexposure !== undefined && rapidResponse !== undefined && reexposure >= rapidResponse) {
			issues.push({
				code: 'reversed_reexposure_response',
				message: 'Re-exposure must precede the rapid antibody response.'
			});
		}
	}

	if (primitive.kind === 'containment_sequence') {
		if (!unique(primitive.states.map((state) => state.id))) {
			issues.push({ code: 'duplicate_containment_state', message: 'State IDs must be unique.' });
		}
		if (!unique(primitive.states.map((state) => state.sequenceIndex))) {
			issues.push({
				code: 'duplicate_containment_position',
				message: 'Containment sequence indexes must be unique.'
			});
		}
		const dispersed = primitive.states.find(
			(state) => state.materialState === 'dispersed_in_water_inside_micelles'
		);
		const carriedAway = primitive.states.find((state) => state.materialState === 'carried_away');
		if (dispersed && carriedAway && dispersed.sequenceIndex >= carriedAway.sequenceIndex) {
			issues.push({
				code: 'reversed_dispersion_rinse',
				message: 'Dispersion inside micelles must precede being carried away.'
			});
		}
	}

	return issues;
}
