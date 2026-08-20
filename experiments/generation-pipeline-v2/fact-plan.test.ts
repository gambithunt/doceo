import { describe, expect, it } from 'vitest';
import { composeAuditedFactPlan } from './fact-plan';
import { ResearchSufficiencySchema, SourceResearchSchema } from './research-schema';

describe('audited fact fast lane', () => {
	it('copies only the canonical audited answer into the lesson', () => {
		const research = SourceResearchSchema.parse({
			decision: 'answer',
			declineReason: null,
			normalizedQuestion: 'Who founded Apple Computer?',
			questionType: 'fact',
			learnerAudience: 'general',
			quickAnswer: 'Apple was founded by Steve Jobs, Steve Wozniak, and Ronald Wayne.',
			quickAnswerClaimIds: ['c1', 'c2'],
			learningTarget: 'Identify the founders.',
			requirements: [
				{ id: 'r1', kind: 'fact', statement: 'Identify the founders.', sourceClaimIds: ['c1'] }
			],
			sources: [
				{
					id: 's1',
					title: 'Source',
					authority: 'Museum',
					url: 'https://example.com/apple',
					sourceTier: 'primary_authority',
					claims: [
						{ id: 'c1', text: 'Apple was founded by Steve Jobs, Steve Wozniak, and Ronald Wayne.' }
					]
				}
			]
		});
		const audit = ResearchSufficiencySchema.parse({
			decision: 'pass',
			summary: 'Supported.',
			quickAnswerStatus: 'supported',
			quickAnswerClaimIds: ['c1'],
			coverage: [
				{ requirementId: 'r1', status: 'supported', sourceClaimIds: ['c1'], explanation: 'Direct.' }
			]
		});
		const { plan } = composeAuditedFactPlan(research, audit);
		expect(plan.focusedIdeaClaimIds).toEqual(['c1']);
		expect(plan.optionalCheck.sourceClaimIds).toEqual(['c1']);
		expect(JSON.stringify(plan)).not.toContain('Bill Gates');
		expect(plan.visualStates.slice(1).map((state) => state.label)).toEqual([
			'Steve Jobs',
			'Steve Wozniak',
			'Ronald Wayne'
		]);
		expect(plan.visualStates[1].relationshipToPrevious).toBe('answers');
	});

	it('keeps an audited date question on the deterministic direct-answer lane', () => {
		const research = SourceResearchSchema.parse({
			decision: 'answer',
			declineReason: null,
			normalizedQuestion: 'When did humans first land on the Moon?',
			questionType: 'timeline',
			learnerAudience: 'general',
			quickAnswer: 'Humans first landed on the Moon on July 20, 1969.',
			quickAnswerClaimIds: ['c1'],
			learningTarget: 'Recall the date of the first human Moon landing.',
			requirements: [
				{
					id: 'r1',
					kind: 'temporal',
					statement: 'The landing was July 20, 1969.',
					sourceClaimIds: ['c1']
				}
			],
			sources: [
				{
					id: 's1',
					title: 'Apollo 11',
					authority: 'NASA',
					url: 'https://example.com/apollo-11',
					sourceTier: 'primary_authority',
					claims: [{ id: 'c1', text: 'The first human Moon landing was July 20, 1969.' }]
				}
			]
		});
		const audit = ResearchSufficiencySchema.parse({
			decision: 'pass',
			summary: 'Supported.',
			quickAnswerStatus: 'supported',
			quickAnswerClaimIds: ['c1'],
			coverage: [
				{ requirementId: 'r1', status: 'supported', sourceClaimIds: ['c1'], explanation: 'Direct.' }
			]
		});
		const { plan } = composeAuditedFactPlan(research, audit);
		expect(plan.visualFamily).toBe('timeline');
		expect(plan.visualStates[1].label).toBe(research.quickAnswer);
		expect(plan.visualStates[1].relationshipToPrevious).toBe('answers');
	});
});
