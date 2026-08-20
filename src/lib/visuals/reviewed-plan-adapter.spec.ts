import { describe, expect, it } from 'vitest';
import { adaptReviewedPlanArtifact } from './reviewed-plan-adapter';

function artifact() {
	return {
		status: 'reviewed-proposal',
		createdAt: '2026-08-19T14:21:37.013Z',
		questionFingerprint: 'a142d593aa43892f50be',
		validation: { passed: true },
		review: { decision: 'approve', summary: 'All states are supported.', findings: [] },
		reviewValidation: { passed: true },
		plan: {
			normalizedQuestion: 'Who founded Apple Computer?',
			focusedIdea: 'Apple Computer was founded by Steve Jobs, Steve Wozniak, and Ronald Wayne.',
			learnerOutcome: 'Identify the founders.',
			startingPoint: 'The founding date and people.',
			visualFamily: 'timeline',
			visualRationale: 'One dated founding event.',
			visualStates: [
				{ id: 's1', label: 'April 1, 1976', relationshipToPrevious: 'start' },
				{ id: 's2', label: 'Jobs, Wozniak, and Wayne', relationshipToPrevious: 'same_event' }
			],
			optionalCheck: { prompt: 'Name the founders.', successEvidence: 'Jobs, Wozniak, Wayne' },
			sources: [{ title: 'A source', authority: 'Smithsonian', url: 'https://example.com' }]
		}
	};
}

describe('adaptReviewedPlanArtifact', () => {
	it('turns an approved plan into a playable fixture without adding facts', () => {
		const lesson = adaptReviewedPlanArtifact(artifact());
		expect(lesson.kind).toBe('concept-sequence');
		expect(lesson.nodes.map((node) => node.label)).toEqual([
			'April 1, 1976',
			'Jobs, Wozniak, and Wayne'
		]);
		expect(lesson.frames[1].activeStateIds).toEqual(['s1', 's2']);
		expect(lesson.check).toMatchObject({ kind: 'recall', answer: 'Jobs, Wozniak, Wayne' });
	});

	it('refuses a proposal that did not pass independent review', () => {
		const value = artifact();
		value.review.decision = 'reject';
		expect(() => adaptReviewedPlanArtifact(value)).toThrow();
	});

	it('uses a compact two-moment reveal for structured fact answers', () => {
		const value = artifact();
		value.plan.visualStates = [
			{ id: 'question', label: 'Who founded Apple?', relationshipToPrevious: 'start' },
			{ id: 'jobs', label: 'Steve Jobs', relationshipToPrevious: 'answers' },
			{ id: 'wozniak', label: 'Steve Wozniak', relationshipToPrevious: 'same_event' },
			{ id: 'wayne', label: 'Ronald Wayne', relationshipToPrevious: 'same_event' }
		];
		const lesson = adaptReviewedPlanArtifact(value);
		expect(lesson.kind).toBe('fact-reveal');
		expect(lesson.frames).toHaveLength(2);
		expect(lesson.frames[0].activeStateIds).toEqual(['question']);
		expect(lesson.frames[1].activeStateIds).toEqual(['question', 'jobs', 'wozniak', 'wayne']);
	});
});
