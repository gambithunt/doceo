import type { QuestionPlan, QuestionPlanReview } from './planner-schema.ts';
import { tracedSourceUrlMatches } from './research-validation.ts';

export type PlannerValidationIssue = {
	code: string;
	path: string;
	message: string;
};

function host(value: string) {
	return new URL(value).hostname.replace(/^www\./, '');
}

function validHttpsUrl(value: string) {
	try {
		const url = new URL(value);
		return url.protocol === 'https:' && Boolean(url.hostname);
	} catch {
		return false;
	}
}

export function validateQuestionPlan(
	question: string,
	plan: QuestionPlan,
	researchedUrls: string[]
) {
	const issues: PlannerValidationIssue[] = [];
	const trimmedQuestion = question.trim();
	if (trimmedQuestion.length < 5 || trimmedQuestion.length > 240) {
		issues.push({
			code: 'invalid_question_length',
			path: 'question',
			message: 'Questions must contain between 5 and 240 characters.'
		});
	}

	if (plan.decision === 'reject') {
		if (!plan.rejectionReason?.trim()) {
			issues.push({
				code: 'missing_rejection_reason',
				path: 'rejectionReason',
				message: 'A rejected plan must explain why it cannot be safely narrowed.'
			});
		}
		return { passed: issues.length === 0, issues };
	}

	if (plan.rejectionReason !== null) {
		issues.push({
			code: 'unexpected_rejection_reason',
			path: 'rejectionReason',
			message: 'A proposed plan cannot carry a rejection reason.'
		});
	}
	if (plan.focusedIdea.length > 240 || plan.learnerOutcome.length > 240) {
		issues.push({
			code: 'plan_not_focused',
			path: 'focusedIdea',
			message: 'The focused idea and learner outcome must each fit within 240 characters.'
		});
	}
	if (plan.safeBoundary.length > 320) {
		issues.push({
			code: 'boundary_not_focused',
			path: 'safeBoundary',
			message: 'The safe boundary must fit within 320 characters.'
		});
	}
	if (plan.visualFamily === 'none' && plan.visualStates.length > 0) {
		issues.push({
			code: 'unexpected_visual_states',
			path: 'visualStates',
			message: 'A non-visual plan cannot define visual states.'
		});
	}
	if (
		plan.visualFamily !== 'none' &&
		(plan.visualStates.length < 2 || plan.visualStates.length > 6)
	) {
		issues.push({
			code: 'invalid_visual_state_count',
			path: 'visualStates',
			message: 'A visual plan needs between two and six canonical states.'
		});
	}
	if (plan.visualStates.length > 0 && plan.visualStates[0]?.relationshipToPrevious !== 'start') {
		issues.push({
			code: 'invalid_first_relationship',
			path: 'visualStates.0.relationshipToPrevious',
			message: 'The first canonical state must use the start relationship.'
		});
	}
	for (const [index, state] of plan.visualStates.entries()) {
		if (index > 0 && state.relationshipToPrevious === 'start') {
			issues.push({
				code: 'duplicate_start_relationship',
				path: `visualStates.${index}.relationshipToPrevious`,
				message: 'Only the first canonical state may use the start relationship.'
			});
		}
	}

	if (plan.sources.length < 2) {
		issues.push({
			code: 'too_few_sources',
			path: 'sources',
			message: 'A proposed contract needs at least two researched sources.'
		});
	}
	const sourceIds = new Set(plan.sources.map((source) => source.id));
	if (sourceIds.size !== plan.sources.length) {
		issues.push({
			code: 'duplicate_source_id',
			path: 'sources',
			message: 'Every source ID must be unique.'
		});
	}
	const validSources = plan.sources.filter((source) => validHttpsUrl(source.url));
	const sourceHosts = new Set(validSources.map((source) => host(source.url)));
	if (sourceHosts.size < 2) {
		issues.push({
			code: 'insufficient_source_diversity',
			path: 'sources',
			message: 'A proposed contract needs sources from at least two distinct hosts.'
		});
	}
	const allClaimIds = plan.sources.flatMap((source) => source.claims.map((claim) => claim.id));
	const knownClaimIds = new Set(allClaimIds);
	if (knownClaimIds.size !== allClaimIds.length) {
		issues.push({
			code: 'duplicate_claim_id',
			path: 'sources',
			message: 'Every source claim ID must be globally unique.'
		});
	}
	const checkClaimReferences = (path: string, claimIds: string[]) => {
		for (const claimId of claimIds) {
			if (!knownClaimIds.has(claimId)) {
				issues.push({
					code: 'unknown_claim_id',
					path,
					message: `Unknown source claim ID: ${claimId}`
				});
			}
		}
	};
	checkClaimReferences('focusedIdeaClaimIds', plan.focusedIdeaClaimIds);
	checkClaimReferences('learnerOutcomeClaimIds', plan.learnerOutcomeClaimIds);
	checkClaimReferences('safeBoundaryClaimIds', plan.safeBoundaryClaimIds);
	checkClaimReferences('optionalCheck.sourceClaimIds', plan.optionalCheck.sourceClaimIds);
	for (const [index, state] of plan.visualStates.entries()) {
		checkClaimReferences(`visualStates.${index}.sourceClaimIds`, state.sourceClaimIds);
	}
	for (const [index, misconception] of plan.likelyMisconceptions.entries()) {
		checkClaimReferences(
			`likelyMisconceptions.${index}.sourceClaimIds`,
			misconception.sourceClaimIds
		);
	}

	const researched = researchedUrls.filter(validHttpsUrl);
	for (const [index, source] of plan.sources.entries()) {
		if (!validHttpsUrl(source.url)) {
			issues.push({
				code: 'invalid_source_url',
				path: `sources.${index}.url`,
				message: 'Source URLs must be valid HTTPS URLs.'
			});
		} else if (!researched.some((tracedUrl) => tracedSourceUrlMatches(source.url, tracedUrl))) {
			issues.push({
				code: 'unresearched_source_url',
				path: `sources.${index}.url`,
				message: 'Every declared source URL must appear in the web-search trace.'
			});
		}
	}

	return { passed: issues.length === 0, issues };
}

export function validateQuestionPlanReview(plan: QuestionPlan, review: QuestionPlanReview) {
	const issues: PlannerValidationIssue[] = [];
	const knownClaimIds = new Set(
		plan.sources.flatMap((source) => source.claims.map((claim) => claim.id))
	);
	for (const [index, finding] of review.findings.entries()) {
		for (const claimId of finding.sourceClaimIds) {
			if (!knownClaimIds.has(claimId)) {
				issues.push({
					code: 'review_unknown_claim_id',
					path: `findings.${index}.sourceClaimIds`,
					message: `Reviewer cited unknown source claim ID: ${claimId}`
				});
			}
		}
	}
	const hasMajor = review.findings.some((finding) => finding.severity === 'major');
	if (review.decision === 'approve' && hasMajor) {
		issues.push({
			code: 'review_approval_has_major_finding',
			path: 'decision',
			message: 'A review with a major finding cannot approve the plan.'
		});
	}
	if (review.decision === 'reject' && !hasMajor) {
		issues.push({
			code: 'review_rejection_missing_major_finding',
			path: 'decision',
			message: 'A rejected plan must identify at least one major finding.'
		});
	}
	return { passed: issues.length === 0, issues };
}
