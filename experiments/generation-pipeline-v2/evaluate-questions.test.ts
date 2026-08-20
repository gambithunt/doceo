import { describe, expect, it } from 'vitest';
import { modelCost, summarizeResult } from './evaluate-questions.ts';

describe('question evaluation reporting', () => {
	it('sums nested stage costs', () => {
		expect(
			modelCost({
				estimatedModelTokenCostUsd: 0.01,
				planning: { estimatedModelTokenCostUsd: 0.02 },
				review: { estimatedModelTokenCostUsd: 0.03 }
			})
		).toBeCloseTo(0.06);
	});

	it('reports a reviewed proposal as a ready playable lesson', () => {
		const result = summarizeResult({
			id: 'fact-person',
			kind: 'fact',
			question: 'Who discovered penicillin?',
			research: {
				status: 'answered',
				answer: { sources: [{}, {}] },
				research: { questionType: 'fact' }
			},
			researchPath: '/tmp/research.json',
			researchCacheHit: false,
			audit: { status: 'passed' },
			auditPath: '/tmp/audit.json',
			plan: {
				status: 'reviewed-proposal',
				plan: { visualFamily: 'fact_reveal', visualStates: [{}, {}], optionalCheck: {} },
				review: { decision: 'approve', findings: [] }
			},
			planPath: '/tmp/plan.json',
			observedWallClockMs: 1200
		});

		expect(result.outcome).toBe('ready');
		expect(result.terminalStage).toBe('ready');
		expect(result.answer.sourceCount).toBe(2);
		expect(result.lesson).toEqual({
			visualFamily: 'fact_reveal',
			stateCount: 2,
			hasOptionalCheck: true
		});
		expect(result.measurement.incrementalModelTokenCostUsd).toBe(0);
	});

	it('preserves the stage where a question stopped', () => {
		const result = summarizeResult({
			id: 'uncertainty',
			kind: 'uncertainty',
			question: 'What came before the Big Bang?',
			research: { status: 'answered', answer: { sources: [{}] } },
			researchPath: '/tmp/research.json',
			researchCacheHit: true,
			audit: { status: 'rejected' },
			auditPath: '/tmp/audit.json',
			observedWallClockMs: 800
		});

		expect(result.outcome).toBe('stopped');
		expect(result.terminalStage).toBe('audit');
		expect(result.cache.research).toBe(true);
		expect(result.quality.stopReasons).toContain('audit_rejected');
	});
});
