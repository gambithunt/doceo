import { describe, expect, it } from 'vitest';
import { VisualPrimitiveSchema, validateVisualPrimitive } from './visual-primitives.ts';

describe('typed visual primitives', () => {
	it('rejects a vaccine entry-barrier meaning at the schema boundary', () => {
		const result = VisualPrimitiveSchema.safeParse({
			kind: 'immune_response',
			antigenFormsDisplay: 'one_example',
			stages: [
				{ id: 'vaccination', label: 'Vaccination', type: 'vaccination', sequenceIndex: 0 },
				{ id: 'memory', label: 'Memory', type: 'memory', sequenceIndex: 1 }
			],
			protectionMeanings: ['blocks_entry']
		});
		expect(result.success).toBe(false);
	});

	it('rejects observed evidence placed before inferred inflation', () => {
		const primitive = VisualPrimitiveSchema.parse({
			kind: 'timeline',
			direction: 'earlier_to_later',
			events: [
				{
					id: 'evidence',
					label: 'Later evidence',
					concept: 'observed_evidence',
					epistemicStatus: 'observed',
					sequenceIndex: 0
				},
				{
					id: 'inflation',
					label: 'Inflation',
					concept: 'inflation',
					epistemicStatus: 'inferred',
					sequenceIndex: 1
				}
			],
			evidenceLinks: [
				{
					fromEventId: 'evidence',
					toEventId: 'inflation',
					relationship: 'supports_inference'
				}
			]
		});
		expect(validateVisualPrimitive(primitive)).toContainEqual(
			expect.objectContaining({ code: 'reversed_timeline_evidence' })
		);
	});

	it('accepts evidence later than inferred inflation with an explicit support link', () => {
		const primitive = VisualPrimitiveSchema.parse({
			kind: 'timeline',
			direction: 'earlier_to_later',
			events: [
				{
					id: 'unknown',
					label: 'Unknown before inflation',
					concept: 'unknown_before',
					epistemicStatus: 'unknown',
					sequenceIndex: 0
				},
				{
					id: 'inflation',
					label: 'Inflation',
					concept: 'inflation',
					epistemicStatus: 'inferred',
					sequenceIndex: 1
				},
				{
					id: 'evidence',
					label: 'Later observed evidence',
					concept: 'observed_evidence',
					epistemicStatus: 'observed',
					sequenceIndex: 2
				}
			],
			evidenceLinks: [
				{
					fromEventId: 'evidence',
					toEventId: 'inflation',
					relationship: 'supports_inference'
				}
			]
		});
		expect(validateVisualPrimitive(primitive)).toEqual([]);
	});
});
