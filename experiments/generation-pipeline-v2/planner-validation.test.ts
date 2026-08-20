import { describe, expect, it } from 'vitest';
import type { QuestionPlan } from './planner-schema.ts';
import { validateQuestionPlan, validateQuestionPlanReview } from './planner-validation.ts';

function validPlan(): QuestionPlan {
	return {
		decision: 'propose',
		rejectionReason: null,
		normalizedQuestion: 'Why does the Moon have phases?',
		domain: 'science',
		learnerAudience: 'general',
		focusedIdea: 'Moon phases are changing views of its sunlit half as it orbits Earth.',
		focusedIdeaClaimIds: ['source-1-claim-1', 'source-2-claim-1'],
		learnerOutcome: 'Predict the visible phase from the relative Sun, Earth, and Moon positions.',
		learnerOutcomeClaimIds: ['source-2-claim-1'],
		startingPoint: 'The learner knows the Moon orbits Earth.',
		visualFamily: 'spatial',
		visualRationale: 'A spatial model exposes which half is lit and which portion Earth sees.',
		visualStates: [
			{
				id: 'new',
				label: 'New Moon',
				sourceClaimIds: ['source-1-claim-1'],
				relationshipToPrevious: 'start'
			},
			{
				id: 'quarter',
				label: 'First quarter',
				sourceClaimIds: ['source-2-claim-1'],
				relationshipToPrevious: 'earlier_to_later'
			}
		],
		likelyMisconceptions: [
			{
				text: 'Earth’s shadow normally causes the phases.',
				sourceClaimIds: ['source-2-claim-1']
			}
		],
		safeBoundary: 'Do not confuse ordinary phases with a lunar eclipse.',
		safeBoundaryClaimIds: ['source-2-claim-1'],
		optionalCheck: {
			prompt: 'Place the Moon to make a first-quarter view.',
			successEvidence: 'The learner places it about a quarter orbit from new Moon.',
			sourceClaimIds: ['source-2-claim-1']
		},
		sources: [
			{
				id: 'source-1',
				title: 'Moon phases',
				authority: 'NASA',
				url: 'https://science.nasa.gov/moon/moon-phases',
				sourceTier: 'primary_authority',
				claims: [{ id: 'source-1-claim-1', text: 'Half of the Moon is illuminated by the Sun.' }]
			},
			{
				id: 'source-2',
				title: 'Lunar phases',
				authority: 'OpenStax',
				url: 'https://openstax.org/books/astronomy/pages/moon-phases',
				sourceTier: 'established_educational',
				claims: [
					{
						id: 'source-2-claim-1',
						text: 'The visible illuminated fraction changes during the orbit.'
					}
				]
			}
		]
	};
}

const researchedUrls = [
	'https://science.nasa.gov/moon/moon-phases',
	'https://openstax.org/books/astronomy/pages/moon-phases'
];

describe('question-plan validation', () => {
	it('accepts a narrow proposal grounded in its search trace', () => {
		expect(
			validateQuestionPlan('Why does the Moon have phases?', validPlan(), researchedUrls)
		).toEqual({
			passed: true,
			issues: []
		});
	});

	it('accepts a queryless source when the search trace used a tracking query', () => {
		const traced = [
			'https://science.nasa.gov/moon/moon-phases?vm=r',
			'https://openstax.org/books/astronomy/pages/moon-phases'
		];
		expect(validateQuestionPlan('Why does the Moon have phases?', validPlan(), traced).passed).toBe(
			true
		);
	});

	it('rejects a source URL that was not actually researched', () => {
		const plan = validPlan();
		plan.sources[1].url = 'https://example.com/invented';
		expect(
			validateQuestionPlan('Why does the Moon have phases?', plan, researchedUrls).issues
		).toContainEqual(expect.objectContaining({ code: 'unresearched_source_url' }));
	});

	it('rejects malformed source URLs locally', () => {
		const plan = validPlan();
		plan.sources[1].url = 'not a URL';
		expect(
			validateQuestionPlan('Why does the Moon have phases?', plan, researchedUrls).issues
		).toContainEqual(expect.objectContaining({ code: 'invalid_source_url' }));
	});

	it('rejects a single-host source monoculture', () => {
		const plan = validPlan();
		plan.sources[1].url = 'https://science.nasa.gov/moon/eclipses';
		expect(
			validateQuestionPlan('Why does the Moon have phases?', plan, [
				...researchedUrls,
				plan.sources[1].url
			]).issues
		).toContainEqual(expect.objectContaining({ code: 'insufficient_source_diversity' }));
	});

	it('accepts diverse established educational sources already approved by research', () => {
		const plan = validPlan();
		for (const source of plan.sources) source.sourceTier = 'established_educational';
		expect(
			validateQuestionPlan('Why does the Moon have phases?', plan, researchedUrls).passed
		).toBe(true);
	});

	it('requires a reason when the planner rejects a question', () => {
		const plan = validPlan();
		plan.decision = 'reject';
		plan.rejectionReason = null;
		expect(validateQuestionPlan('Diagnose me', plan, researchedUrls).issues).toContainEqual(
			expect.objectContaining({ code: 'missing_rejection_reason' })
		);
	});

	it('rejects contradictory visual-state starts', () => {
		const plan = validPlan();
		plan.visualStates[1].relationshipToPrevious = 'start';
		expect(
			validateQuestionPlan('Why does the Moon have phases?', plan, researchedUrls).issues
		).toContainEqual(expect.objectContaining({ code: 'duplicate_start_relationship' }));
	});

	it('rejects dangling visual-state claim references', () => {
		const plan = validPlan();
		plan.visualStates[1].sourceClaimIds = ['source-99-claim-1'];
		expect(
			validateQuestionPlan('Why does the Moon have phases?', plan, researchedUrls).issues
		).toContainEqual(expect.objectContaining({ code: 'unknown_claim_id' }));
	});

	it('rejects duplicate claim IDs across sources', () => {
		const plan = validPlan();
		plan.sources[1].claims[0].id = 'source-1-claim-1';
		expect(
			validateQuestionPlan('Why does the Moon have phases?', plan, researchedUrls).issues
		).toContainEqual(expect.objectContaining({ code: 'duplicate_claim_id' }));
	});

	it('rejects an internally contradictory review approval', () => {
		expect(
			validateQuestionPlanReview(validPlan(), {
				decision: 'approve',
				summary: 'Looks good despite a major issue.',
				findings: [
					{
						severity: 'major',
						path: 'visualStates.1',
						sourceClaimIds: ['source-2-claim-1'],
						explanation: 'The state is not entailed.'
					}
				]
			}).issues
		).toContainEqual(expect.objectContaining({ code: 'review_approval_has_major_finding' }));
	});

	it('rejects reviewer references to invented claim IDs', () => {
		expect(
			validateQuestionPlanReview(validPlan(), {
				decision: 'reject',
				summary: 'A state is unsupported.',
				findings: [
					{
						severity: 'major',
						path: 'visualStates.1',
						sourceClaimIds: ['invented-claim'],
						explanation: 'The state is not entailed.'
					}
				]
			}).issues
		).toContainEqual(expect.objectContaining({ code: 'review_unknown_claim_id' }));
	});

	it('accepts an empty misconception list for a direct factual plan', () => {
		const plan = validPlan();
		plan.likelyMisconceptions = [];
		expect(
			validateQuestionPlan('Why does the Moon have phases?', plan, researchedUrls).passed
		).toBe(true);
	});

	it('accepts zero states when a plan explicitly has no visual family', () => {
		const plan = validPlan();
		plan.visualFamily = 'none';
		plan.visualStates = [];
		expect(
			validateQuestionPlan('Why does the Moon have phases?', plan, researchedUrls).passed
		).toBe(true);
	});

	it('accepts two states that describe the same event', () => {
		const plan = validPlan();
		plan.visualStates[1].relationshipToPrevious = 'same_event';
		expect(
			validateQuestionPlan('Why does the Moon have phases?', plan, researchedUrls).passed
		).toBe(true);
	});
});
