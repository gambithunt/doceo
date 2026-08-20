import { describe, expect, it } from 'vitest';
import { isReusableResearchArtifact, questionFingerprint } from './research-cache';

describe('answer research cache', () => {
	it('reuses only recent, sourced, successful research', () => {
		const now = Date.parse('2026-08-20T08:00:00.000Z');
		const sourceQuestion = 'Who founded Apple Computer';
		const fingerprint = questionFingerprint(sourceQuestion);
		const artifact = {
			status: 'answered',
			createdAt: '2026-08-19T08:00:00.000Z',
			question: sourceQuestion,
			questionFingerprint: fingerprint,
			answer: { text: 'A checked answer.', sources: [{ url: 'https://example.com' }] }
		};
		expect(isReusableResearchArtifact(artifact, 'Who founded Apple Computer?', now)).toBe(true);
		expect(
			isReusableResearchArtifact({ ...artifact, status: 'fallback' }, sourceQuestion, now)
		).toBe(false);
		expect(
			isReusableResearchArtifact(
				{ ...artifact, answer: { text: 'No sources', sources: [] } },
				sourceQuestion,
				now
			)
		).toBe(false);
	});
});
