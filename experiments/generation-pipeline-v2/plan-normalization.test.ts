import { describe, expect, it } from 'vitest';
import { removeUnsupportedMisconceptions } from './plan-normalization.ts';
import { SourceResearchSchema } from './research-schema.ts';

function research(claimText: string) {
	return SourceResearchSchema.parse({
		decision: 'answer',
		declineReason: null,
		normalizedQuestion: 'How does rain form?',
		questionType: 'mechanism',
		learnerAudience: 'general',
		quickAnswer: 'Cloud droplets combine and fall as rain.',
		quickAnswerClaimIds: ['c1'],
		learningTarget: 'Understand rain formation.',
		requirements: [
			{ id: 'r1', kind: 'causal', statement: 'Droplets combine.', sourceClaimIds: ['c1'] }
		],
		sources: [
			{
				id: 's1',
				title: 'Rain',
				authority: 'NOAA',
				url: 'https://example.com/rain',
				sourceTier: 'primary_authority',
				claims: [{ id: 'c1', text: claimText }]
			}
		]
	});
}

describe('research-based plan normalization', () => {
	it('removes a correct claim mislabeled as a misconception', () => {
		const result = removeUnsupportedMisconceptions(
			{
				likelyMisconceptions: [{ text: 'Droplets collide and combine.', sourceClaimIds: ['c1'] }]
			},
			research('Cloud droplets collide and combine into larger drops.')
		);
		expect(result.proposal.likelyMisconceptions).toEqual([]);
		expect(result.removed).toBe(1);
	});

	it('retains a misconception explicitly identified by the evidence', () => {
		const result = removeUnsupportedMisconceptions(
			{
				likelyMisconceptions: [
					{ text: 'Rain is water vapor falling as gas.', sourceClaimIds: ['c1'] }
				]
			},
			research('A common misconception is that rain is water vapor falling as a gas.')
		);
		expect(result.proposal.likelyMisconceptions).toHaveLength(1);
		expect(result.removed).toBe(0);
	});
});
