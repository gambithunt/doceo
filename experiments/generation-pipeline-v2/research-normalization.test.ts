import { describe, expect, it } from 'vitest';
import type { SourceResearch } from './research-schema.ts';
import { cleanQuickAnswer, normalizeSourceResearch } from './research-normalization.ts';

describe('quick-answer normalization', () => {
	it('removes a redundant parenthesized markdown citation', () => {
		expect(
			cleanQuickAnswer(
				'Onions release an irritant. ([University](https://example.edu/onions?utm_source=openai))'
			)
		).toBe('Onions release an irritant.');
	});

	it('does not alter ordinary prose', () => {
		expect(cleanQuickAnswer('Metal moves heat away from your skin quickly.')).toBe(
			'Metal moves heat away from your skin quickly.'
		);
	});

	it('carries all mechanism evidence into the answer-level claim set', () => {
		const research = {
			quickAnswer: 'The visible portion changes, except during an eclipse.',
			quickAnswerClaimIds: ['c1'],
			requirements: [{ sourceClaimIds: ['c1', 'c2'] }, { sourceClaimIds: ['c3'] }]
		} as SourceResearch;
		expect(normalizeSourceResearch(research).quickAnswerClaimIds).toEqual(['c1', 'c2', 'c3']);
	});
});
