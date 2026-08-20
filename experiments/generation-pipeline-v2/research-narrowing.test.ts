import { describe, expect, it } from 'vitest';
import { composeNarrowedResearch, narrowingSchemaFor } from './research-narrowing.ts';
import { SourceResearchSchema } from './research-schema.ts';

function originalResearch() {
	return SourceResearchSchema.parse({
		decision: 'answer',
		declineReason: null,
		normalizedQuestion: 'Where do auroras occur?',
		questionType: 'fact',
		learnerAudience: 'general',
		quickAnswer: 'Auroras occur near magnetic poles during strong geomagnetic storms.',
		quickAnswerClaimIds: ['c1'],
		learningTarget: 'Know where auroras occur.',
		requirements: [
			{ id: 'r1', kind: 'spatial', statement: 'Near magnetic poles.', sourceClaimIds: ['c1'] }
		],
		sources: [
			{
				id: 's1',
				title: 'Aurora',
				authority: 'NASA',
				url: 'https://example.com/aurora',
				sourceTier: 'primary_authority',
				claims: [{ id: 'c1', text: 'Auroras are observed near Earth’s poles.' }]
			}
		]
	});
}

describe('research narrowing', () => {
	it('changes only learner claims while preserving the immutable evidence ledger', () => {
		const original = originalResearch();
		const narrowed = composeNarrowedResearch(original, {
			quickAnswer: 'Auroras are observed near Earth’s poles.',
			quickAnswerClaimIds: ['c1'],
			learningTarget: 'Recall where auroras are observed.',
			requirements: [
				{
					id: 'r1',
					kind: 'spatial',
					statement: 'Auroras are observed near Earth’s poles.',
					sourceClaimIds: ['c1']
				}
			]
		});

		expect(narrowed.sources).toEqual(original.sources);
		expect(narrowed.normalizedQuestion).toBe(original.normalizedQuestion);
		expect(narrowed.quickAnswer).toBe('Auroras are observed near Earth’s poles.');
	});

	it('limits direct questions to two requirements in structured output', () => {
		const schema = narrowingSchemaFor(originalResearch());
		expect(() =>
			schema.parse({
				quickAnswer: 'Auroras are observed near Earth’s poles.',
				quickAnswerClaimIds: ['c1'],
				learningTarget: 'Recall where auroras are observed.',
				requirements: [
					{ id: 'r1', kind: 'spatial', statement: 'One', sourceClaimIds: ['c1'] },
					{ id: 'r2', kind: 'spatial', statement: 'Two', sourceClaimIds: ['c1'] },
					{ id: 'r3', kind: 'spatial', statement: 'Three', sourceClaimIds: ['c1'] }
				]
			})
		).toThrow();
	});

	it('drops an unsupported summary and builds the answer from supported requirements', () => {
		const narrowed = composeNarrowedResearch(originalResearch(), {
			quickAnswer: 'There is no confirmed answer.',
			quickAnswerClaimIds: ['c1'],
			learningTarget: 'Recall the supported boundary.',
			requirements: [
				{
					id: 'r1',
					kind: 'spatial',
					statement: 'Auroras are observed near Earth’s poles',
					sourceClaimIds: ['c1']
				}
			]
		});
		expect(narrowed.quickAnswer).toBe('Auroras are observed near Earth’s poles.');
		expect(narrowed.quickAnswerClaimIds).toEqual(['c1']);
	});

	it('removes unsupported wording from narrowed requirements by rebuilding them from cited claims', () => {
		const narrowed = composeNarrowedResearch(originalResearch(), {
			quickAnswer: 'Auroras appear near the poles and sometimes elsewhere.',
			quickAnswerClaimIds: ['c1'],
			learningTarget: 'Recall where auroras are observed.',
			requirements: [
				{
					id: 'r1',
					kind: 'spatial',
					statement: 'Auroras appear near the poles and sometimes elsewhere.',
					sourceClaimIds: ['c1']
				}
			]
		});

		expect(narrowed.requirements[0].statement).toBe('Auroras are observed near Earth’s poles.');
		expect(narrowed.quickAnswer).toBe('Auroras are observed near Earth’s poles.');
	});

	it('keeps direct answers concise while retaining every cited claim in the requirement', () => {
		const original = originalResearch();
		original.sources[0].claims.push({
			id: 'c2',
			text: 'During strong storms, auroras can extend farther from the poles.'
		});
		const narrowed = composeNarrowedResearch(original, {
			quickAnswer: 'Auroras usually appear near the poles but can extend farther during storms.',
			quickAnswerClaimIds: ['c1', 'c2'],
			learningTarget: 'Recall where auroras are observed.',
			requirements: [
				{
					id: 'r1',
					kind: 'spatial',
					statement: 'Auroras usually appear near the poles but can extend farther during storms.',
					sourceClaimIds: ['c1', 'c2']
				}
			]
		});

		expect(narrowed.quickAnswer).toBe('Auroras are observed near Earth’s poles.');
		expect(narrowed.quickAnswerClaimIds).toEqual(['c1']);
		expect(narrowed.requirements[0].statement).toContain('During strong storms');
	});
});
