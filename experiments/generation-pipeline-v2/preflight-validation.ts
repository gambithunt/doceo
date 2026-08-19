import { createHash } from 'node:crypto';
import { ContractTargetSchema, type ContractPreflight, type LessonContractV2 } from './schema.ts';

export function contractFingerprint(contract: LessonContractV2) {
	return createHash('sha256').update(JSON.stringify(contract)).digest('hex');
}

export function validatePreflight(contract: LessonContractV2, preflight: ContractPreflight) {
	const issues: string[] = [];
	const requiredTargets = ContractTargetSchema.options;
	const claimIds = new Set(
		contract.sources.flatMap((source) => source.claims.map((claim) => claim.id))
	);

	for (const target of requiredTargets) {
		const matches = preflight.coverage.filter((item) => item.target === target);
		if (matches.length !== 1) issues.push(`Target ${target} must appear exactly once.`);
	}

	for (const item of preflight.coverage) {
		for (const claimId of item.sourceClaimIds) {
			if (!claimIds.has(claimId))
				issues.push(`Target ${item.target} cites unknown claim ${claimId}.`);
		}
		if (item.status === 'supported' && item.sourceClaimIds.length === 0) {
			issues.push(`Supported target ${item.target} has no source claim IDs.`);
		}
		if (['partial', 'unsupported'].includes(item.status) && !item.missingSupport) {
			issues.push(
				`Target ${item.target} is ${item.status} but has no missing-support explanation.`
			);
		}
		if (item.status === 'not_applicable' && item.sourceClaimIds.length > 0) {
			issues.push(`Not-applicable target ${item.target} must not cite source claims.`);
		}
	}

	const unsupportedTargets = preflight.coverage
		.filter((item) => ['partial', 'unsupported'].includes(item.status))
		.map((item) => item.target);
	if (preflight.decision === 'pass' && unsupportedTargets.length > 0) {
		issues.push('Model decision is pass despite partial or unsupported targets.');
	}

	return {
		passed: issues.length === 0 && unsupportedTargets.length === 0,
		issues,
		unsupportedTargets
	};
}
