import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { structuredCall } from './api.ts';
import { QuestionPlanReviewSchema, QuestionPlanSchema } from './planner-schema.ts';
import { validateQuestionPlan, validateQuestionPlanReview } from './planner-validation.ts';

const baseURL = process.env.MODEL_BASE_URL ?? 'https://api.openai.com/v1';
const model = process.env.PLANNER_MODEL_ID ?? process.env.MODEL_ID ?? 'gpt-5.4-mini';
const reviewModel = process.env.PLANNER_REVIEW_MODEL_ID ?? process.env.REVIEW_MODEL_ID ?? 'gpt-5.4';
const outputDirectory = resolve('experiments/generation-pipeline-v2/runs');

const system = `You are the source-research and lesson-contract planner for a visual micro-learning product.
Research the learner's exact question on the web before proposing anything. Prefer primary authorities, scholarly sources, and established educational institutions. Avoid blogs, SEO summaries, social posts, and commercial product pages.

Narrow the question to exactly one useful idea that can be learned in roughly two minutes. Choose the learner audience from wording in the question; otherwise use general. Do not write the lesson.

Propose a canonical visual relationship with two to six short states only when a visual materially improves understanding. The first state uses relationshipToPrevious=start and no later state may use start. State IDs are short lowercase kebab-case identifiers.

For each source, copy the exact URL you actually researched and list only short factual claims directly supported by that page. Give every claim a globally unique stable ID such as source-1-claim-1. Use two to four sources from at least two distinct hosts, including at least one primary authority or scholarly source.

Attach exact source claim IDs to the focused idea, learner outcome, every visual state, every misconception, and the optional check. Attach claim IDs to the safe boundary when it contains a factual limit; policy-only boundaries may use an empty list. A citation is valid only when its literal claim directly entails the field. Related background is not enough.

Choose a visual family that explains the question's mechanism, not merely a sequence that accompanies it. Geometry and changing viewpoints usually need spatial relationships. Do not add an attractive final state that is outside the focused idea. Never make a label broader than its cited claims.

Reject rather than guess when the question cannot be narrowed safely, requests personal medical/legal/financial diagnosis or advice, lacks adequate authoritative support, or would require pretending a disputed claim is settled. A rejection explains the reason but still fills all required fields with concise boundary-safe placeholders and an empty source list.

The result is only a proposal. It does not approve facts or authorize publication.`;

const reviewSystem = `Independently try to falsify a proposed visual lesson contract using only its literal source-claim ledger.
Do not use your own factual knowledge, source titles, authorities, or URLs as evidence. A cited claim must directly entail the exact field or visual state that cites it.

Check whether the focused idea and learner outcome answer the learner's actual question; whether the visual family explains the relevant mechanism rather than merely showing an associated sequence; whether every canonical state is necessary, correctly ordered, and no broader than its cited claims; whether misconceptions and the optional check are supported; and whether the safe boundary prevents obvious overclaiming.

Reject for any major unsupported, contradictory, misleading, scope-drifting, or visually mismatched element. A dangling or decorative state is major when it changes the explanation. Minor wording imprecision may be approved with a minor finding. Approve only when there are no major findings.`;

function researchedUrls(response: OpenAI.Responses.Response) {
	const urls = new Set<string>();
	for (const item of response.output) {
		if (item.type !== 'web_search_call') continue;
		if (item.action.type === 'search') {
			for (const source of item.action.sources ?? []) urls.add(source.url);
		} else if (item.action.type === 'open_page' && item.action.url) {
			urls.add(item.action.url);
		} else if (item.action.type === 'find_in_page') {
			urls.add(item.action.url);
		}
	}
	return [...urls];
}

function usageOf(response: OpenAI.Responses.Response) {
	return {
		inputTokens: response.usage?.input_tokens ?? 0,
		cachedInputTokens: response.usage?.input_tokens_details?.cached_tokens ?? 0,
		outputTokens: response.usage?.output_tokens ?? 0,
		totalTokens: response.usage?.total_tokens ?? 0
	};
}

function estimatedModelTokenCost(usage: ReturnType<typeof usageOf>) {
	return (
		((usage.inputTokens - usage.cachedInputTokens) * 0.75 +
			usage.cachedInputTokens * 0.075 +
			usage.outputTokens * 4.5) /
		1_000_000
	);
}

function estimatedReviewTokenCost(usage: ReturnType<typeof usageOf>) {
	return (
		((usage.inputTokens - usage.cachedInputTokens) * 2.5 +
			usage.cachedInputTokens * 0.25 +
			usage.outputTokens * 15) /
		1_000_000
	);
}

async function planQuestion(client: OpenAI, question: string) {
	const started = performance.now();
	const response = await client.responses.parse({
		model,
		input: [
			{ role: 'system', content: system },
			{ role: 'user', content: `Learner question:\n${question}` }
		],
		reasoning: { effort: 'low' },
		tools: [{ type: 'web_search', search_context_size: 'medium' }],
		tool_choice: 'required',
		include: ['web_search_call.action.sources'],
		text: { format: zodTextFormat(QuestionPlanSchema, 'question_contract_plan') },
		max_output_tokens: 5000,
		store: false
	});
	if (!response.output_parsed) throw new Error('No parsed question plan was returned.');
	const plan = QuestionPlanSchema.parse(response.output_parsed);
	const searchedUrls = researchedUrls(response);
	const validation = validateQuestionPlan(question, plan, searchedUrls);
	const usage = usageOf(response);
	let review = null;
	let reviewValidation = null;
	let reviewMeasurement = null;
	let reviewError = null;
	if (plan.decision === 'propose' && validation.passed) {
		console.log(`Reviewing plan independently with ${reviewModel} (medium)...`);
		const reviewStarted = performance.now();
		try {
			const result = await structuredCall({
				client,
				model: reviewModel,
				name: 'review_question_contract_plan',
				description: 'Submit an independent falsification review of the proposed lesson contract.',
				schema: QuestionPlanReviewSchema,
				system: reviewSystem,
				user: `Learner question:\n${question}\n\nProposed plan and literal source-claim ledger:\n${JSON.stringify(plan)}`,
				maxCompletionTokens: 8000,
				reasoningEffort: 'medium'
			});
			review = result.value;
			reviewValidation = validateQuestionPlanReview(plan, review);
			reviewMeasurement = {
				wallClockMs: Math.round(performance.now() - reviewStarted),
				model: reviewModel,
				reasoningEffort: 'medium',
				requestId: result.requestId,
				usage: result.usage,
				estimatedModelTokenCostUsd: estimatedReviewTokenCost(result.usage)
			};
		} catch (error) {
			reviewError = error instanceof Error ? error.message : 'Independent review failed.';
			reviewMeasurement = {
				wallClockMs: Math.round(performance.now() - reviewStarted),
				model: reviewModel,
				reasoningEffort: 'medium',
				requestId: null,
				usage: null,
				estimatedModelTokenCostUsd: null
			};
		}
	}
	const reviewApproved = review?.decision === 'approve' && reviewValidation?.passed === true;
	const artifact = {
		status:
			plan.decision === 'reject'
				? 'planner-rejected'
				: !validation.passed
					? 'invalid'
					: reviewError
						? 'review-error'
						: reviewApproved
							? 'reviewed-proposal'
							: 'review-rejected',
		createdAt: new Date().toISOString(),
		question,
		questionFingerprint: createHash('sha256').update(question.trim().toLowerCase()).digest('hex'),
		plan,
		researchedUrls: searchedUrls,
		validation,
		review,
		reviewValidation,
		reviewError,
		measurement: {
			wallClockMs: Math.round(performance.now() - started),
			planning: {
				model,
				requestId: response._request_id ?? response.id ?? null,
				usage,
				estimatedModelTokenCostUsd: estimatedModelTokenCost(usage),
				costNote: 'Token estimate excludes any web-search tool-call fee.'
			},
			review: reviewMeasurement
		}
	};
	await mkdir(outputDirectory, { recursive: true });
	const timestamp = new Date().toISOString().replaceAll(':', '-');
	const shortFingerprint = artifact.questionFingerprint.slice(0, 10);
	const outputPath = resolve(
		outputDirectory,
		`${timestamp}-question-plan-${shortFingerprint}.json`
	);
	await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
	return { artifact, outputPath };
}

async function main() {
	if (!process.env.MODEL_API_KEY) throw new Error('MODEL_API_KEY is required in .env.local.');
	const args = process.argv.slice(2);
	const questions = args.flatMap((arg, index) => (arg === '--question' ? [args[index + 1]] : []));
	if (questions.length === 0 || questions.some((question) => !question)) {
		throw new Error('Provide one or more --question "..." arguments.');
	}
	const client = new OpenAI({ apiKey: process.env.MODEL_API_KEY, baseURL, maxRetries: 2 });
	let failed = false;
	for (const question of questions) {
		console.log(`Planning: ${question}`);
		const { artifact, outputPath } = await planQuestion(client, question);
		console.log(`${artifact.status.toUpperCase()}: ${outputPath}`);
		if (artifact.status !== 'reviewed-proposal') failed = true;
	}
	if (failed) process.exitCode = 2;
}

await main();
