import { describe, expect, it } from 'vitest';
import { toV2Contract } from './contracts.ts';
import type { ContractPreflight } from './schema.ts';
import { validatePreflight } from './preflight-validation.ts';

const contract = toV2Contract('everyday-airplane-lift');
const claimId = contract.sources[0].claims[0].id;
const targets: ContractPreflight['coverage'][number]['target'][] = [
	'focusedIdea',
	'chosenApproach',
	'learnerOutcome',
	'optionalEvidenceTarget',
	'safeBoundary',
	'visualConstraints'
];

function passingPreflight(): ContractPreflight {
	return {
		decision: 'pass',
		summary: 'Every target is supported.',
		coverage: targets.map((target) => ({
			target,
			targetText: target,
			status: 'supported',
			sourceClaimIds: [claimId],
			explanation: 'Directly supported.',
			missingSupport: null
		}))
	};
}

describe('validatePreflight', () => {
	it('accepts complete source coverage', () => {
		expect(validatePreflight(contract, passingPreflight()).passed).toBe(true);
	});

	it('rejects partial coverage even when the model says pass', () => {
		const preflight = passingPreflight();
		preflight.coverage[0].status = 'partial';
		preflight.coverage[0].missingSupport = 'A causal step is absent.';
		const result = validatePreflight(contract, preflight);
		expect(result.passed).toBe(false);
		expect(result.unsupportedTargets).toContain('focusedIdea');
	});

	it('rejects missing targets and invented claim IDs', () => {
		const preflight = passingPreflight();
		preflight.coverage.pop();
		preflight.coverage[0].sourceClaimIds = ['invented'];
		expect(validatePreflight(contract, preflight).issues).toEqual(
			expect.arrayContaining([
				'Target visualConstraints must appear exactly once.',
				'Target focusedIdea cites unknown claim invented.'
			])
		);
	});

	it('accepts a non-factual target without a citation', () => {
		const preflight = passingPreflight();
		preflight.coverage[5].status = 'not_applicable';
		preflight.coverage[5].sourceClaimIds = [];
		preflight.coverage[5].missingSupport = null;
		expect(validatePreflight(contract, preflight).passed).toBe(true);
	});
});
