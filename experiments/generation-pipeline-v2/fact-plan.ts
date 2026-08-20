import type { QuestionPlan, QuestionPlanReview } from './planner-schema.ts';
import type { ResearchSufficiency, SourceResearch } from './research-schema.ts';

function answerEntities(research: SourceResearch, audit: ResearchSufficiency) {
	if (!/^who\b/i.test(research.normalizedQuestion)) return [];
	const claimIds = new Set(audit.quickAnswerClaimIds);
	const claimText = research.sources
		.flatMap((source) => source.claims)
		.filter((claim) => claimIds.has(claim.id))
		.map((claim) => claim.text)
		.join(' ');
	const candidates = claimText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g) ?? [];
	const question = research.normalizedQuestion.toLowerCase();
	const answer = research.quickAnswer.toLowerCase();
	return [...new Set(candidates)].filter((candidate) => {
		const normalized = candidate.toLowerCase();
		return answer.includes(normalized) && !question.includes(normalized);
	});
}

export function composeAuditedFactPlan(
	research: SourceResearch,
	audit: ResearchSufficiency
): { plan: QuestionPlan; review: QuestionPlanReview } {
	if (
		research.decision !== 'answer' ||
		!['fact', 'timeline'].includes(research.questionType) ||
		audit.decision !== 'pass' ||
		audit.quickAnswerStatus !== 'supported' ||
		!audit.quickAnswerClaimIds.length
	) {
		throw new Error('The direct-answer fast lane requires a passed, sourced fact or date answer.');
	}
	const claimIds = [...audit.quickAnswerClaimIds];
	const entities = answerEntities(research, audit);
	const answerStates = (entities.length ? entities : [research.quickAnswer]).map(
		(label, index) => ({
			id: `answer-${index + 1}`,
			label,
			sourceClaimIds: claimIds,
			relationshipToPrevious: index === 0 ? ('answers' as const) : ('same_event' as const)
		})
	);
	const plan: QuestionPlan = {
		decision: 'propose',
		rejectionReason: null,
		normalizedQuestion: research.normalizedQuestion,
		domain: 'other',
		learnerAudience: research.learnerAudience,
		focusedIdea: research.quickAnswer,
		focusedIdeaClaimIds: claimIds,
		learnerOutcome: `Recall the checked answer to “${research.normalizedQuestion}”`,
		learnerOutcomeClaimIds: claimIds,
		startingPoint: 'Hold the exact question in mind before revealing the checked answer.',
		visualFamily: research.questionType === 'timeline' ? 'timeline' : 'classification',
		visualRationale:
			'A question-to-answer reveal keeps a discrete fact focused and avoids adding unsupported background or distractors.',
		visualStates: [
			{
				id: 'question',
				label: research.normalizedQuestion,
				sourceClaimIds: claimIds,
				relationshipToPrevious: 'start'
			},
			...answerStates
		],
		likelyMisconceptions: [],
		safeBoundary: 'This lesson stays with the exact checked answer and adds no background facts.',
		safeBoundaryClaimIds: [],
		optionalCheck: {
			prompt: research.normalizedQuestion,
			successEvidence: research.quickAnswer,
			sourceClaimIds: claimIds
		},
		sources: research.sources
	};
	return {
		plan,
		review: {
			decision: 'approve',
			summary:
				'The visual copies the independently audited fact answer and its canonical claim alignment without adding facts, distractors, or inferred relationships.',
			findings: []
		}
	};
}
