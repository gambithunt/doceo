import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import OpenAI from 'openai';
import { structuredCall } from './api.ts';
import { composeAuditedFactPlan } from './fact-plan.ts';
import { removeUnsupportedMisconceptions } from './plan-normalization.ts';
import {
	QuestionPlanReviewSchema,
	QuestionPlanSchema,
	ResearchBasedPlanSchema,
	ResearchBasedProposalSchema
} from './planner-schema.ts';
import { validateQuestionPlan, validateQuestionPlanReview } from './planner-validation.ts';
import { ResearchSufficiencySchema, SourceResearchSchema } from './research-schema.ts';
import { validateResearchSufficiency, validateSourceResearch } from './research-validation.ts';

const baseURL = process.env.MODEL_BASE_URL ?? 'https://api.openai.com/v1';
const plannerModel = process.env.PLANNER_MODEL_ID ?? process.env.MODEL_ID ?? 'gpt-5.4-mini';
const reviewModel = process.env.PLANNER_REVIEW_MODEL_ID ?? process.env.REVIEW_MODEL_ID ?? 'gpt-5.4';
const outputDirectory = resolve('experiments/generation-pipeline-v2/runs');

const plannerSystem = `Compose a visual micro-lesson plan using only the supplied, already audited evidence ledger.
Never browse, add facts, alter claims, or infer beyond the literal claims. Every factual field must cite exact claim IDs that directly entail it. Use only the requirements needed to answer the learner's exact question. Treat the passed audit's claim IDs as the canonical citation alignment.

This planner is called only after the learner explicitly asks for a playable lesson, so a proposal must use a meaningful interactive visual family. A simple factual question may use classification or timeline to make identities or dates memorable, but must not invent roles, biographies, distractor facts, or background. Use two to six short canonical states. The first state uses relationshipToPrevious=start and no later state may use start. Use same_event when two states describe the same dated event; never encode simultaneous facts as earlier_to_later. A state may not be decorative or broader than its cited claims. Reject if the evidence cannot support a useful interactive visual rather than returning a text-only plan.

likelyMisconceptions should normally be empty. Include one only when a cited literal claim explicitly identifies it as a misconception, common myth, or belief people often hold. Do not relabel a correct claim, missing detail, or ordinary omission as a misconception.

Use the smallest exact claim set for every field. Do not attach a merely related claim when another claim fully entails the field. A safe boundary that only limits lesson scope is policy, not a factual claim, and must use an empty safeBoundaryClaimIds list.

The optional check must be quick and optional. It should ask the learner to predict, place, choose, or apply something that the cited evidence directly supports.

Return decision=propose with rejectionReason=null and a complete proposal when the ledger supports a coherent plan. Return decision=reject with a concise rejectionReason and proposal=null when it does not. Do not fill missing evidence by guessing.`;

const reviewSystem = `Independently try to falsify a proposed visual lesson plan using only its literal source-claim ledger.
Do not use your own knowledge, source titles, authorities, or URLs as evidence. A cited claim must directly entail the exact field or visual state that cites it.

Reject for any major unsupported, contradictory, misleading, scope-drifting, or visually mismatched element. Approve only when there are no major findings.`;

type ResearchArtifact = {
	status: string;
	question: string;
	questionFingerprint: string;
	research: unknown;
	researchedUrls: string[];
};

type AuditArtifact = {
	status: string;
	questionFingerprint: string;
	researchPath: string;
	audit: unknown;
};

function usageCost(
	usage: { inputTokens: number; cachedInputTokens: number; outputTokens: number },
	prices: { input: number; cached: number; output: number }
) {
	return (
		((usage.inputTokens - usage.cachedInputTokens) * prices.input +
			usage.cachedInputTokens * prices.cached +
			usage.outputTokens * prices.output) /
		1_000_000
	);
}

function timestamp() {
	return new Date().toISOString().replaceAll(':', '-');
}

async function loadInputs(researchFile: string, auditFile: string) {
	const researchPath = resolve(researchFile);
	const auditPath = resolve(auditFile);
	const researchArtifact = JSON.parse(await readFile(researchPath, 'utf8')) as ResearchArtifact;
	const auditArtifact = JSON.parse(await readFile(auditPath, 'utf8')) as AuditArtifact;
	const research = SourceResearchSchema.parse(researchArtifact.research);
	const audit = ResearchSufficiencySchema.parse(auditArtifact.audit);
	const fingerprint = createHash('sha256')
		.update(researchArtifact.question.trim().toLowerCase())
		.digest('hex');
	if (researchArtifact.status !== 'answered') throw new Error('Research is not answer-ready.');
	if (researchArtifact.questionFingerprint !== fingerprint) {
		throw new Error('Research question fingerprint does not match its question.');
	}
	if (auditArtifact.status !== 'passed') throw new Error('The source audit did not pass.');
	if (auditArtifact.questionFingerprint !== fingerprint) {
		throw new Error('Audit and research question fingerprints do not match.');
	}
	if (resolve(auditArtifact.researchPath) !== researchPath) {
		throw new Error('Audit does not refer to the supplied immutable research artifact.');
	}
	const researchValidation = validateSourceResearch(
		researchArtifact.question,
		research,
		researchArtifact.researchedUrls
	);
	const auditValidation = validateResearchSufficiency(research, audit);
	if (!researchValidation.passed || !auditValidation.passed || audit.decision !== 'pass') {
		throw new Error('Research or audit failed deterministic validation.');
	}
	return { researchPath, auditPath, researchArtifact, research, audit };
}

async function main() {
	if (!process.env.MODEL_API_KEY) throw new Error('MODEL_API_KEY is required in .env.local.');
	const args = process.argv.slice(2);
	const researchIndex = args.indexOf('--research-file');
	const auditIndex = args.indexOf('--audit-file');
	const researchFile = researchIndex >= 0 ? args[researchIndex + 1] : null;
	const auditFile = auditIndex >= 0 ? args[auditIndex + 1] : null;
	if (!researchFile || !auditFile) {
		throw new Error('Provide --research-file <path> and --audit-file <path>.');
	}
	const { researchPath, auditPath, researchArtifact, research, audit } = await loadInputs(
		researchFile,
		auditFile
	);
	const started = performance.now();
	if (['fact', 'timeline'].includes(research.questionType)) {
		const { plan, review } = composeAuditedFactPlan(research, audit);
		const validation = validateQuestionPlan(
			researchArtifact.question,
			plan,
			researchArtifact.researchedUrls
		);
		const reviewValidation = validateQuestionPlanReview(plan, review);
		if (!validation.passed || !reviewValidation.passed) {
			throw new Error('The deterministic fact plan failed validation.');
		}
		const proposal = ResearchBasedProposalSchema.parse(plan);
		const artifact = {
			status: 'reviewed-proposal',
			createdAt: new Date().toISOString(),
			question: researchArtifact.question,
			questionFingerprint: researchArtifact.questionFingerprint,
			researchPath,
			auditPath,
			composition: { decision: 'propose', rejectionReason: null, proposal },
			plan,
			validation,
			review,
			reviewValidation,
			measurement: {
				wallClockMs: Math.round(performance.now() - started),
				planning: {
					model: 'deterministic-fact-v1',
					requestId: null,
					usage: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, totalTokens: 0 },
					estimatedModelTokenCostUsd: 0
				},
				review: {
					model: 'passed-evidence-audit-plus-deterministic-validation',
					requestId: null,
					usage: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, totalTokens: 0 },
					estimatedModelTokenCostUsd: 0
				}
			}
		};
		await mkdir(outputDirectory, { recursive: true });
		const outputPath = resolve(
			outputDirectory,
			`${timestamp()}-question-research-plan-${researchArtifact.questionFingerprint.slice(0, 10)}.json`
		);
		await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
		console.log(`REVIEWED-PROPOSAL: ${outputPath}`);
		return;
	}
	const client = new OpenAI({ apiKey: process.env.MODEL_API_KEY, baseURL, maxRetries: 2 });
	const planned = await structuredCall({
		client,
		model: plannerModel,
		name: 'compose_plan_from_passed_research',
		description: 'Compose or reject a fully evidence-traced visual lesson plan.',
		schema: ResearchBasedPlanSchema,
		system: plannerSystem,
		user: `Learner question:\n${researchArtifact.question}\n\nPassed source research:\n${JSON.stringify(research)}\n\nPassed audit and canonical claim alignment:\n${JSON.stringify(audit)}`,
		maxCompletionTokens: 5500,
		reasoningEffort: 'low'
	});
	const compositionConsistent =
		planned.value.decision === 'reject'
			? planned.value.proposal === null && Boolean(planned.value.rejectionReason?.trim())
			: planned.value.proposal !== null && planned.value.rejectionReason === null;
	let status = !compositionConsistent
		? 'invalid'
		: planned.value.decision === 'reject'
			? 'planner-rejected'
			: 'invalid';
	let plan = null;
	let validation = null;
	let review = null;
	let reviewValidation = null;
	let reviewMeasurement = null;
	let removedUnsupportedMisconceptions = 0;
	if (
		compositionConsistent &&
		planned.value.decision === 'propose' &&
		planned.value.proposal &&
		planned.value.rejectionReason === null
	) {
		const normalized = removeUnsupportedMisconceptions(planned.value.proposal, research);
		removedUnsupportedMisconceptions = normalized.removed;
		plan = QuestionPlanSchema.parse({
			...normalized.proposal,
			decision: 'propose',
			rejectionReason: null,
			sources: research.sources
		});
		validation = validateQuestionPlan(
			researchArtifact.question,
			plan,
			researchArtifact.researchedUrls
		);
		status = validation.passed ? 'proposed' : 'invalid';
		if (validation.passed) {
			console.log('REVIEWING_PLAN');
			const reviewStarted = performance.now();
			const reviewed = await structuredCall({
				client,
				model: reviewModel,
				name: 'review_research_based_plan',
				description: 'Falsify a proposed plan against its immutable claim ledger.',
				schema: QuestionPlanReviewSchema,
				system: reviewSystem,
				user: `Learner question:\n${researchArtifact.question}\n\nProposed plan:\n${JSON.stringify(plan)}`,
				maxCompletionTokens: 6000,
				reasoningEffort: 'medium'
			});
			review = reviewed.value;
			reviewValidation = validateQuestionPlanReview(plan, review);
			status =
				review.decision === 'approve' && reviewValidation.passed
					? 'reviewed-proposal'
					: 'review-rejected';
			reviewMeasurement = {
				wallClockMs: Math.round(performance.now() - reviewStarted),
				model: reviewModel,
				requestId: reviewed.requestId,
				usage: reviewed.usage,
				estimatedModelTokenCostUsd: usageCost(reviewed.usage, {
					input: 2.5,
					cached: 0.25,
					output: 15
				})
			};
		}
	}
	const artifact = {
		status,
		createdAt: new Date().toISOString(),
		question: researchArtifact.question,
		questionFingerprint: researchArtifact.questionFingerprint,
		researchPath,
		auditPath,
		composition: planned.value,
		plan,
		validation,
		review,
		reviewValidation,
		measurement: {
			wallClockMs: Math.round(performance.now() - started),
			deterministicAdjustments: { removedUnsupportedMisconceptions },
			planning: {
				model: plannerModel,
				requestId: planned.requestId,
				usage: planned.usage,
				estimatedModelTokenCostUsd: usageCost(planned.usage, {
					input: 0.75,
					cached: 0.075,
					output: 4.5
				})
			},
			review: reviewMeasurement
		}
	};
	await mkdir(outputDirectory, { recursive: true });
	const outputPath = resolve(
		outputDirectory,
		`${timestamp()}-question-research-plan-${researchArtifact.questionFingerprint.slice(0, 10)}.json`
	);
	await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
	console.log(`${status.toUpperCase()}: ${outputPath}`);
	if (status !== 'reviewed-proposal') process.exitCode = 2;
}

await main();
