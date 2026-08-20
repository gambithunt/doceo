import { describe, expect, it } from 'vitest';
import type { ResearchSufficiency, SourceResearch } from './research-schema.ts';
import { validateResearchSufficiency, validateSourceResearch } from './research-validation.ts';

function research(): SourceResearch {
	return {
		decision: 'answer',
		declineReason: null,
		normalizedQuestion: 'Why does ice float?',
		questionType: 'mechanism',
		learnerAudience: 'general',
		quickAnswer: 'Ice floats because it is less dense than liquid water.',
		quickAnswerClaimIds: ['source-1-claim-1'],
		learningTarget: 'Understand how freezing changes water density.',
		requirements: [
			{
				id: 'requirement-1',
				kind: 'causal',
				statement: 'Freezing creates a structure that is less dense than liquid water.',
				sourceClaimIds: ['source-1-claim-1', 'source-2-claim-1']
			}
		],
		sources: [
			{
				id: 'source-1',
				title: 'Water and ice',
				authority: 'NOAA',
				url: 'https://www.noaa.gov/ice',
				sourceTier: 'primary_authority',
				claims: [{ id: 'source-1-claim-1', text: 'Ice is less dense than liquid water.' }]
			},
			{
				id: 'source-2',
				title: 'Density of ice',
				authority: 'OpenStax',
				url: 'https://openstax.org/ice',
				sourceTier: 'established_educational',
				claims: [
					{
						id: 'source-2-claim-1',
						text: 'Freezing arranges water molecules farther apart.'
					}
				]
			}
		]
	};
}

function audit(): ResearchSufficiency {
	return {
		decision: 'pass',
		summary: 'The ledger supports the answer and mechanism.',
		quickAnswerStatus: 'supported',
		quickAnswerClaimIds: ['source-1-claim-1'],
		coverage: [
			{
				requirementId: 'requirement-1',
				status: 'supported',
				sourceClaimIds: ['source-1-claim-1', 'source-2-claim-1'],
				explanation: 'The two claims state the density difference and structural cause.'
			}
		]
	};
}

const urls = ['https://www.noaa.gov/ice', 'https://openstax.org/ice'];

describe('source research validation', () => {
	it('accepts a traced sourced answer', () => {
		expect(validateSourceResearch('Why does ice float?', research(), urls)).toEqual({
			passed: true,
			issues: []
		});
	});

	it('accepts the same traced page with a search-only tracking query', () => {
		const candidate = research();
		const traced = ['https://www.noaa.gov/ice?vm=r', 'https://openstax.org/ice'];
		expect(validateSourceResearch('Why does ice float?', candidate, traced).passed).toBe(true);
	});

	it('does not treat two different query-selected sources as the same page', () => {
		const candidate = research();
		candidate.sources[0].url = 'https://www.noaa.gov/ice?chapter=one';
		const traced = ['https://www.noaa.gov/ice?chapter=two', 'https://openstax.org/ice'];
		expect(validateSourceResearch('Why does ice float?', candidate, traced).issues).toContainEqual(
			expect.objectContaining({ code: 'unresearched_source_url' })
		);
	});

	it('accepts independent educational institutions for an everyday explanation', () => {
		const candidate = research();
		for (const source of candidate.sources) source.sourceTier = 'established_educational';
		expect(validateSourceResearch('Why does ice float?', candidate, urls).passed).toBe(true);
	});

	it('rejects a podcast listing mislabeled as a primary source', () => {
		const candidate = research();
		candidate.sources[1] = {
			...candidate.sources[1],
			url: 'https://podcasts.apple.com/us/podcast/example',
			sourceTier: 'primary_authority'
		};
		const candidateUrls = [candidate.sources[0].url, candidate.sources[1].url];
		expect(
			validateSourceResearch('Why does ice float?', candidate, candidateUrls).issues
		).toContainEqual(expect.objectContaining({ code: 'disallowed_source_platform' }));
	});

	it('rejects a quick answer with a dangling claim', () => {
		const candidate = research();
		candidate.quickAnswerClaimIds = ['missing'];
		expect(validateSourceResearch('Why does ice float?', candidate, urls).issues).toContainEqual(
			expect.objectContaining({ code: 'unknown_claim_id' })
		);
	});

	it('accepts a tightly scoped who question', () => {
		const candidate = research();
		candidate.normalizedQuestion = 'Who founded Apple Computer?';
		candidate.questionType = 'fact';
		candidate.quickAnswer =
			'Apple Computer was founded by Steve Jobs, Steve Wozniak, and Ronald Wayne.';
		candidate.learningTarget = 'Identify the founders of Apple Computer.';
		candidate.requirements = [
			{
				id: 'requirement-1',
				kind: 'fact',
				statement: 'Steve Jobs, Steve Wozniak, and Ronald Wayne founded Apple Computer.',
				sourceClaimIds: ['source-1-claim-1']
			}
		];
		expect(validateSourceResearch('Who founded Apple Computer?', candidate, urls).passed).toBe(
			true
		);
	});

	it('rejects causal scope drift in a who question before audit', () => {
		const candidate = research();
		candidate.questionType = 'fact';
		candidate.requirements[0].kind = 'causal';
		expect(
			validateSourceResearch('Who founded Apple Computer?', candidate, urls).issues
		).toContainEqual(expect.objectContaining({ code: 'fact_question_scope_drift' }));
	});

	it('allows a where question to use an exact spatial requirement', () => {
		const candidate = research();
		candidate.normalizedQuestion = 'Where do auroras occur?';
		candidate.questionType = 'fact';
		candidate.requirements[0].kind = 'spatial';
		expect(validateSourceResearch('Where do auroras occur?', candidate, urls).passed).toBe(true);
	});

	it('rejects a who question classified as a mechanism', () => {
		const candidate = research();
		candidate.questionType = 'mechanism';
		expect(
			validateSourceResearch('Who founded Apple Computer?', candidate, urls).issues
		).toContainEqual(expect.objectContaining({ code: 'fact_question_misclassified' }));
	});

	it('accepts a safe decline without pretending it was researched', () => {
		const candidate = research();
		candidate.decision = 'decline';
		candidate.declineReason = 'This asks for personal medical advice.';
		candidate.quickAnswer =
			'I cannot give personal medical advice, but I can explain the general biology instead.';
		candidate.quickAnswerClaimIds = [];
		candidate.requirements = [];
		candidate.sources = [];
		expect(validateSourceResearch('Should I take this medicine?', candidate, [])).toEqual({
			passed: true,
			issues: []
		});
	});
});

describe('research sufficiency validation', () => {
	it('accepts complete supported coverage', () => {
		expect(validateResearchSufficiency(research(), audit())).toEqual({ passed: true, issues: [] });
	});

	it('rejects a pass with partial coverage', () => {
		const candidate = audit();
		candidate.coverage[0].status = 'partial';
		expect(validateResearchSufficiency(research(), candidate).issues).toContainEqual(
			expect.objectContaining({ code: 'inconsistent_audit_decision' })
		);
	});

	it('rejects invented audit claim references', () => {
		const candidate = audit();
		candidate.coverage[0].sourceClaimIds = ['invented'];
		expect(validateResearchSufficiency(research(), candidate).issues).toContainEqual(
			expect.objectContaining({ code: 'audit_unknown_claim_id' })
		);
	});

	it('accepts a corrected claim alignment from elsewhere in the known ledger', () => {
		const sourceResearch = research();
		sourceResearch.requirements[0].sourceClaimIds = ['source-2-claim-1'];
		const candidate = audit();
		candidate.coverage[0].sourceClaimIds = ['source-1-claim-1', 'source-2-claim-1'];
		expect(validateResearchSufficiency(sourceResearch, candidate).passed).toBe(true);
	});
});
