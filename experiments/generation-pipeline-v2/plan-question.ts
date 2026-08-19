import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { QuestionPlanSchema } from './planner-schema.ts';
import { validateQuestionPlan } from './planner-validation.ts';

const baseURL = process.env.MODEL_BASE_URL ?? 'https://api.openai.com/v1';
const model = process.env.PLANNER_MODEL_ID ?? process.env.MODEL_ID ?? 'gpt-5.4-mini';
const outputDirectory = resolve('experiments/generation-pipeline-v2/runs');

const system = `You are the source-research and lesson-contract planner for a visual micro-learning product.
Research the learner's exact question on the web before proposing anything. Prefer primary authorities, scholarly sources, and established educational institutions. Avoid blogs, SEO summaries, social posts, and commercial product pages.

Narrow the question to exactly one useful idea that can be learned in roughly two minutes. Choose the learner audience from wording in the question; otherwise use general. Do not write the lesson.

Propose a canonical visual relationship with two to six short states only when a visual materially improves understanding. The first state uses relationshipToPrevious=start and no later state may use start. State IDs are short lowercase kebab-case identifiers.

For each source, copy the exact URL you actually researched and list only short factual claims directly supported by that page. Use two to four sources from at least two distinct hosts, including at least one primary authority or scholarly source.

Reject rather than guess when the question cannot be narrowed safely, requests personal medical/legal/financial diagnosis or advice, lacks adequate authoritative support, or would require pretending a disputed claim is settled. A rejection explains the reason but still fills all required fields with concise boundary-safe placeholders and an empty source list.

The result is only a proposal. It does not approve facts or authorize publication.`;

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
	const artifact = {
		status:
			plan.decision === 'reject' ? 'planner-rejected' : validation.passed ? 'proposed' : 'invalid',
		createdAt: new Date().toISOString(),
		question,
		questionFingerprint: createHash('sha256').update(question.trim().toLowerCase()).digest('hex'),
		plan,
		researchedUrls: searchedUrls,
		validation,
		measurement: {
			wallClockMs: Math.round(performance.now() - started),
			model,
			requestId: response._request_id ?? response.id ?? null,
			usage,
			estimatedModelTokenCostUsd: estimatedModelTokenCost(usage),
			costNote: 'Token estimate excludes any web-search tool-call fee.'
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
		if (artifact.status !== 'proposed') failed = true;
	}
	if (failed) process.exitCode = 2;
}

await main();
