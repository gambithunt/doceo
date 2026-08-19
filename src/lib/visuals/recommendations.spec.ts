import { describe, expect, it } from 'vitest';
import { cosmologyFixture } from './fixtures';
import type { VisualHistoryEntry } from './history';
import { getRecommendationMode } from './recommendations';

function soapEntry(supported?: boolean): VisualHistoryEntry {
	return {
		lesson: { ...cosmologyFixture, id: 'everyday-soap', artifactVersion: 'approved-soap-v1' },
		completedAt: '2026-08-18T12:00:00.000Z',
		checkOutcome:
			supported === undefined
				? undefined
				: {
						responseId: supported ? 'a' : 'b',
						supported,
						answeredAt: '2026-08-18T12:01:00.000Z'
					}
	};
}

describe('next-curiosity recommendations', () => {
	it('offers adjacent ideas when the learner skips the check', () => {
		expect(getRecommendationMode([soapEntry()])).toBe('soap-adjacent');
	});

	it('offers deeper ideas after supported evidence', () => {
		expect(getRecommendationMode([soapEntry(true)])).toBe('soap-deeper');
	});

	it('offers reinforcement after a misconception response', () => {
		expect(getRecommendationMode([soapEntry(false)])).toBe('soap-reinforcement');
	});

	it('does not adapt from an older lesson when another visual lesson is newer', () => {
		const newer = {
			lesson: cosmologyFixture,
			completedAt: '2026-08-18T13:00:00.000Z'
		};
		expect(getRecommendationMode([soapEntry(true), newer])).toBe('default');
	});
});
