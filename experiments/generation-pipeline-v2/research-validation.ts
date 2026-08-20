import type { ResearchSufficiency, SourceResearch } from './research-schema.ts';

export type ResearchIssue = { code: string; path: string; message: string };

function parsedHttpsUrl(value: string) {
	try {
		const url = new URL(value);
		return url.protocol === 'https:' && url.hostname ? url : null;
	} catch {
		return null;
	}
}

function normalizedUrl(value: string) {
	const url = new URL(value);
	url.hash = '';
	for (const key of [...url.searchParams.keys()]) {
		if (key.startsWith('utm_')) url.searchParams.delete(key);
	}
	url.pathname = url.pathname.replace(/\/$/, '');
	return url.toString();
}

export function tracedSourceUrlMatches(sourceValue: string, tracedValue: string) {
	if (normalizedUrl(sourceValue) === normalizedUrl(tracedValue)) return true;
	const source = new URL(sourceValue);
	const traced = new URL(tracedValue);
	return (
		source.origin === traced.origin &&
		source.pathname.replace(/\/$/, '') === traced.pathname.replace(/\/$/, '') &&
		(source.search === '' || traced.search === '')
	);
}

function asksForDiscreteFact(question: string) {
	return /^(?:who|when|where|what\s+year|how\s+many)\b/i.test(question.trim());
}

const disallowedSourceHosts = new Set([
	'podcasts.apple.com',
	'open.spotify.com',
	'spotify.com',
	'youtube.com',
	'youtu.be',
	'tiktok.com',
	'facebook.com',
	'instagram.com',
	'x.com',
	'twitter.com',
	'reddit.com',
	'medium.com',
	'substack.com'
]);

function disallowedSourceHost(hostname: string) {
	const normalized = hostname.replace(/^www\./, '').toLowerCase();
	return [...disallowedSourceHosts].some(
		(host) => normalized === host || normalized.endsWith(`.${host}`)
	);
}

export function validateSourceResearch(
	question: string,
	research: SourceResearch,
	researchedUrls: string[]
) {
	const issues: ResearchIssue[] = [];
	if (question.trim().length < 3 || question.trim().length > 240) {
		issues.push({
			code: 'invalid_question_length',
			path: 'question',
			message: 'Questions must contain between 3 and 240 characters.'
		});
	}
	if (research.quickAnswer.length > 700) {
		issues.push({
			code: 'answer_too_long',
			path: 'quickAnswer',
			message: 'The quick answer must fit within 700 characters.'
		});
	}
	if (research.decision === 'decline') {
		if (!research.declineReason?.trim()) {
			issues.push({
				code: 'missing_decline_reason',
				path: 'declineReason',
				message: 'A declined question must explain the boundary.'
			});
		}
		if (
			research.sources.length ||
			research.quickAnswerClaimIds.length ||
			research.requirements.length
		) {
			issues.push({
				code: 'decline_contains_research',
				path: 'sources',
				message: 'A declined question must not masquerade as researched content.'
			});
		}
		return { passed: issues.length === 0, issues };
	}

	if (research.declineReason !== null) {
		issues.push({
			code: 'unexpected_decline_reason',
			path: 'declineReason',
			message: 'An answered question cannot carry a decline reason.'
		});
	}
	if (research.sources.length < 2) {
		issues.push({
			code: 'too_few_sources',
			path: 'sources',
			message: 'A sourced answer needs at least two sources.'
		});
	}
	if (research.requirements.length < 1 || research.requirements.length > 4) {
		issues.push({
			code: 'invalid_requirement_count',
			path: 'requirements',
			message: 'Research needs between one and four atomic requirements.'
		});
	}
	if (asksForDiscreteFact(question)) {
		if (!['fact', 'timeline'].includes(research.questionType)) {
			issues.push({
				code: 'fact_question_misclassified',
				path: 'questionType',
				message: 'A who, when, where, what-year, or how-many question must stay factual.'
			});
		}
		if (research.requirements.length > 2) {
			issues.push({
				code: 'fact_question_overexpanded',
				path: 'requirements',
				message: 'A discrete factual question may have at most two indispensable requirements.'
			});
		}
		for (const [index, requirement] of research.requirements.entries()) {
			const allowedKinds = /^(?:where)\b/i.test(question.trim())
				? ['fact', 'definition', 'spatial', 'exception']
				: ['fact', 'definition', 'temporal'];
			if (!allowedKinds.includes(requirement.kind)) {
				issues.push({
					code: 'fact_question_scope_drift',
					path: `requirements.${index}.kind`,
					message: 'A discrete factual question cannot silently add a causal or explanatory target.'
				});
			}
		}
	}
	const sourceIds = research.sources.map((source) => source.id);
	if (new Set(sourceIds).size !== sourceIds.length) {
		issues.push({
			code: 'duplicate_source_id',
			path: 'sources',
			message: 'Source IDs must be unique.'
		});
	}
	const claimIds = research.sources.flatMap((source) => source.claims.map((claim) => claim.id));
	const knownClaimIds = new Set(claimIds);
	if (knownClaimIds.size !== claimIds.length) {
		issues.push({
			code: 'duplicate_claim_id',
			path: 'sources',
			message: 'Claim IDs must be globally unique.'
		});
	}
	const requirementIds = research.requirements.map((requirement) => requirement.id);
	if (new Set(requirementIds).size !== requirementIds.length) {
		issues.push({
			code: 'duplicate_requirement_id',
			path: 'requirements',
			message: 'Requirement IDs must be unique.'
		});
	}
	const checkClaimIds = (path: string, ids: string[]) => {
		for (const id of ids) {
			if (!knownClaimIds.has(id)) {
				issues.push({
					code: 'unknown_claim_id',
					path,
					message: `Unknown source claim ID: ${id}`
				});
			}
		}
	};
	if (!research.quickAnswerClaimIds.length) {
		issues.push({
			code: 'answer_missing_claims',
			path: 'quickAnswerClaimIds',
			message: 'A quick answer must cite at least one claim.'
		});
	}
	checkClaimIds('quickAnswerClaimIds', research.quickAnswerClaimIds);
	for (const [index, requirement] of research.requirements.entries()) {
		checkClaimIds(`requirements.${index}.sourceClaimIds`, requirement.sourceClaimIds);
	}

	const validSources = research.sources
		.map((source) => ({ source, url: parsedHttpsUrl(source.url) }))
		.filter((entry): entry is { source: SourceResearch['sources'][number]; url: URL } =>
			Boolean(entry.url)
		);
	if (new Set(validSources.map((entry) => entry.url.hostname.replace(/^www\./, ''))).size < 2) {
		issues.push({
			code: 'insufficient_source_diversity',
			path: 'sources',
			message: 'A sourced answer needs at least two distinct source hosts.'
		});
	}
	const tracedUrls = researchedUrls.filter((url) => parsedHttpsUrl(url));
	for (const [index, source] of research.sources.entries()) {
		const parsed = parsedHttpsUrl(source.url);
		if (!parsed) {
			issues.push({
				code: 'invalid_source_url',
				path: `sources.${index}.url`,
				message: 'Source URLs must be valid HTTPS URLs.'
			});
		} else if (disallowedSourceHost(parsed.hostname)) {
			issues.push({
				code: 'disallowed_source_platform',
				path: `sources.${index}.url`,
				message: 'Distribution, social, and self-publishing platforms are not source authorities.'
			});
		} else if (!tracedUrls.some((tracedUrl) => tracedSourceUrlMatches(source.url, tracedUrl))) {
			issues.push({
				code: 'unresearched_source_url',
				path: `sources.${index}.url`,
				message: 'Every source must appear in the web-search trace.'
			});
		}
	}
	return { passed: issues.length === 0, issues };
}

export function validateResearchSufficiency(research: SourceResearch, audit: ResearchSufficiency) {
	const issues: ResearchIssue[] = [];
	const knownClaims = new Set(
		research.sources.flatMap((source) => source.claims.map((claim) => claim.id))
	);
	const requiredIds = new Set(research.requirements.map((requirement) => requirement.id));
	const coveredIds = audit.coverage.map((coverage) => coverage.requirementId);
	if (new Set(coveredIds).size !== coveredIds.length) {
		issues.push({
			code: 'duplicate_coverage',
			path: 'coverage',
			message: 'Each requirement may be audited only once.'
		});
	}
	for (const requiredId of requiredIds) {
		if (!coveredIds.includes(requiredId)) {
			issues.push({
				code: 'missing_coverage',
				path: 'coverage',
				message: `Missing coverage for requirement: ${requiredId}`
			});
		}
	}
	for (const [index, coverage] of audit.coverage.entries()) {
		if (!requiredIds.has(coverage.requirementId)) {
			issues.push({
				code: 'unknown_requirement_id',
				path: `coverage.${index}.requirementId`,
				message: `Unknown requirement ID: ${coverage.requirementId}`
			});
		}
		for (const claimId of coverage.sourceClaimIds) {
			if (!knownClaims.has(claimId)) {
				issues.push({
					code: 'audit_unknown_claim_id',
					path: `coverage.${index}.sourceClaimIds`,
					message: `Audit cited unknown claim: ${claimId}`
				});
			}
		}
	}
	for (const claimId of audit.quickAnswerClaimIds) {
		if (!knownClaims.has(claimId)) {
			issues.push({
				code: 'audit_unknown_claim_id',
				path: 'quickAnswerClaimIds',
				message: `Audit cited unknown claim: ${claimId}`
			});
		}
	}
	const allSupported =
		audit.quickAnswerStatus === 'supported' &&
		audit.coverage.length === requiredIds.size &&
		audit.coverage.every((coverage) => coverage.status === 'supported');
	if ((audit.decision === 'pass') !== allSupported) {
		issues.push({
			code: 'inconsistent_audit_decision',
			path: 'decision',
			message: 'The audit may pass only when the answer and every requirement are supported.'
		});
	}
	return { passed: issues.length === 0, issues };
}
