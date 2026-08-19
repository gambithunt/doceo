import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import OpenAI from 'openai';
import { zodFunction } from 'openai/helpers/zod';
import type { z } from 'zod';
import { getContract, lessonContracts } from './contracts.ts';
import {
	GeneratedCheckSchema,
	GeneratedSceneSchema,
	LessonOutlineSchema,
	type GeneratedCheck,
	type GeneratedScene,
	type LessonContract,
	type LessonOutline
} from './schema.ts';

type Usage = {
	inputTokens: number;
	cachedInputTokens: number;
	outputTokens: number;
	totalTokens: number;
};

type Attempt = {
	step: string;
	attempt: number;
	status: 'succeeded' | 'failed';
	elapsedMs: number;
	requestId: string | null;
	usage: Usage | null;
	error: string | null;
};

const systemPrompt = `You are generating one lesson for a controlled learning-quality experiment.
Follow the supplied Lesson Contract exactly. Teach one coherent idea in about 90–120 seconds total.
Use plain language for a curious adult. Every important visual must explain, compare, or demonstrate.
Do not add points, grades, streaks, generic encouragement, or a forced next lesson.
Treat source claims and the safe boundary as constraints. Never invent precision beyond them.
The optional check must ask for evidence of the narrow outcome, not recall of wording.`;

const provider = process.env.MODEL_PROVIDER ?? 'minimax';
const baseURL = process.env.MODEL_BASE_URL ?? 'https://api.minimax.io/v1';
const model = process.env.MODEL_ID ?? 'MiniMax-M3';
const maxRetries = Number(process.env.SPIKE_MAX_RETRIES ?? '1');
const price = {
	inputPerMillion: Number(process.env.MODEL_INPUT_USD_PER_M ?? '0.3'),
	cachedInputPerMillion: Number(process.env.MODEL_CACHED_INPUT_USD_PER_M ?? '0.06'),
	outputPerMillion: Number(process.env.MODEL_OUTPUT_USD_PER_M ?? '1.2')
};
const runDirectory = resolve('experiments/generation-spike/runs');
const attempts: Attempt[] = [];

function usageFrom(response: {
	usage?: {
		input_tokens?: number;
		output_tokens?: number;
		total_tokens?: number;
		input_tokens_details?: { cached_tokens?: number };
		prompt_tokens?: number;
		completion_tokens?: number;
		prompt_tokens_details?: { cached_tokens?: number };
	} | null;
}): Usage | null {
	if (!response.usage) return null;
	return {
		inputTokens: response.usage.input_tokens ?? response.usage.prompt_tokens ?? 0,
		cachedInputTokens:
			response.usage.input_tokens_details?.cached_tokens ??
			response.usage.prompt_tokens_details?.cached_tokens ??
			0,
		outputTokens: response.usage.output_tokens ?? response.usage.completion_tokens ?? 0,
		totalTokens: response.usage.total_tokens ?? 0
	};
}

async function parseStep<T>(
	client: OpenAI,
	step: string,
	schemaName: string,
	schema: z.ZodType<T>,
	input: Array<{ role: 'system' | 'user'; content: string }>
): Promise<T> {
	for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
		const started = performance.now();
		let requestId: string | null = null;
		let requestUsage: Usage | null = null;
		try {
			const toolName = `submit_${schemaName}`;
			const providerParameters =
				provider === 'minimax'
					? ({ thinking: { type: 'disabled' } } as Record<string, unknown>)
					: {};
			const response = await client.chat.completions.create({
				model,
				messages: input,
				max_completion_tokens: 3000,
				tools: [
					zodFunction({
						name: toolName,
						description: `Submit the completed ${schemaName}.`,
						parameters: schema
					})
				],
				tool_choice: { type: 'function', function: { name: toolName } },
				...providerParameters
			});
			requestId = response._request_id ?? response.id ?? null;
			requestUsage = usageFrom(response);
			const toolCall = response.choices[0]?.message.tool_calls?.find(
				(call) => call.type === 'function' && call.function.name === toolName
			);
			if (!toolCall || toolCall.type !== 'function') {
				throw new Error(`No ${toolName} function call returned for ${step}.`);
			}
			const parsed = schema.parse(JSON.parse(toolCall.function.arguments));
			const elapsedMs = Math.round(performance.now() - started);
			attempts.push({
				step,
				attempt: attempt + 1,
				status: 'succeeded',
				elapsedMs,
				requestId,
				usage: requestUsage,
				error: null
			});
			return parsed;
		} catch (error) {
			attempts.push({
				step,
				attempt: attempt + 1,
				status: 'failed',
				elapsedMs: Math.round(performance.now() - started),
				requestId,
				usage: requestUsage,
				error: error instanceof Error ? error.message : String(error)
			});
			if (attempt === maxRetries) throw error;
		}
	}
	throw new Error(`Unreachable generation state for ${step}.`);
}

function totalUsage() {
	return attempts.reduce<Usage>(
		(total, attempt) => {
			if (!attempt.usage) return total;
			total.inputTokens += attempt.usage.inputTokens;
			total.cachedInputTokens += attempt.usage.cachedInputTokens;
			total.outputTokens += attempt.usage.outputTokens;
			total.totalTokens += attempt.usage.totalTokens;
			return total;
		},
		{ inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, totalTokens: 0 }
	);
}

function estimatedCost(usage: Usage) {
	const uncachedInput = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
	return (
		(uncachedInput * price.inputPerMillion +
			usage.cachedInputTokens * price.cachedInputPerMillion +
			usage.outputTokens * price.outputPerMillion) /
		1_000_000
	);
}

function elapsedFor(step: string) {
	return attempts
		.filter((attempt) => attempt.step === step)
		.reduce((sum, attempt) => sum + attempt.elapsedMs, 0);
}

async function generateLesson(client: OpenAI, contract: LessonContract) {
	attempts.length = 0;
	const runStartedAt = new Date().toISOString();
	const runStarted = performance.now();
	let outline: LessonOutline | null = null;
	const scenes: GeneratedScene[] = [];
	let check: GeneratedCheck | null = null;

	try {
		outline = await parseStep(client, 'outline', 'lesson_outline', LessonOutlineSchema, [
			{ role: 'system', content: systemPrompt },
			{
				role: 'user',
				content: `Create the scene outline and check plan for this contract:\n${JSON.stringify(contract)}`
			}
		]);

		for (const [index, scenePlan] of outline.scenes.entries()) {
			const scene = await parseStep(
				client,
				`scene-${index + 1}`,
				'lesson_scene',
				GeneratedSceneSchema,
				[
					{ role: 'system', content: systemPrompt },
					{
						role: 'user',
						content: `Write scene ${index + 1} only.
Contract: ${JSON.stringify(contract)}
Approved outline: ${JSON.stringify(outline)}
Scene to write: ${JSON.stringify(scenePlan)}
Completed preceding scenes: ${JSON.stringify(scenes)}
Keep continuity with preceding scenes. Captions must preserve the teaching if audio is unavailable.`
					}
				]
			);
			scenes.push(scene);
		}

		check = await parseStep(client, 'check', 'lesson_check', GeneratedCheckSchema, [
			{ role: 'system', content: systemPrompt },
			{
				role: 'user',
				content: `Create the optional ten-second check only.
Contract: ${JSON.stringify(contract)}
Approved outline: ${JSON.stringify(outline)}
Completed lesson: ${JSON.stringify(scenes)}
Use an empty choices array when the interaction type does not use fixed choices.`
			}
		]);

		const usage = totalUsage();
		const result = {
			status: 'succeeded',
			runStartedAt,
			runCompletedAt: new Date().toISOString(),
			provider,
			baseURL,
			model,
			pricingUsdPerMillionTokens: price,
			contract,
			outline,
			scenes,
			check,
			measurement: {
				timeToFirstUsefulContentMs: elapsedFor('outline') + elapsedFor('scene-1'),
				perSceneMs: scenes.map((_, index) => elapsedFor(`scene-${index + 1}`)),
				totalWallClockMs: Math.round(performance.now() - runStarted),
				attempts,
				usage,
				estimatedApiCostUsd: estimatedCost(usage)
			}
		};
		await saveRun(contract.id, result);
		return result;
	} catch (error) {
		const usage = totalUsage();
		const result = {
			status: 'failed',
			runStartedAt,
			runCompletedAt: new Date().toISOString(),
			provider,
			baseURL,
			model,
			contract,
			outline,
			scenes,
			check,
			measurement: {
				totalWallClockMs: Math.round(performance.now() - runStarted),
				attempts,
				usage,
				estimatedApiCostUsd: estimatedCost(usage)
			},
			error: error instanceof Error ? error.message : String(error)
		};
		await saveRun(contract.id, result);
		throw error;
	}
}

async function saveRun(contractId: string, result: unknown) {
	await mkdir(runDirectory, { recursive: true });
	const timestamp = new Date().toISOString().replaceAll(':', '-');
	const path = resolve(runDirectory, `${timestamp}-${contractId}.json`);
	await writeFile(path, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
	console.log(path);
}

async function main() {
	const args = process.argv.slice(2);
	if (args.includes('--list')) {
		for (const contract of lessonContracts) {
			console.log(`${contract.id}\t${contract.difficulty}\t${contract.topic}`);
		}
		return;
	}

	if (!process.env.MODEL_API_KEY) {
		throw new Error(
			'MODEL_API_KEY is required. Add your MiniMax API key to .env.local or export it for this command.'
		);
	}

	const client = new OpenAI({ apiKey: process.env.MODEL_API_KEY, baseURL, maxRetries: 0 });
	const contractFlag = args.indexOf('--contract');
	const selected = args.includes('--all')
		? lessonContracts
		: contractFlag >= 0
			? [getContract(args[contractFlag + 1])].filter((value): value is LessonContract =>
					Boolean(value)
				)
			: [];

	if (selected.length === 0) {
		throw new Error('Choose --contract <id>, --all, or --list.');
	}

	for (const contract of selected) {
		console.log(`Generating ${contract.id} with ${provider}/${model}...`);
		await generateLesson(client, contract);
	}
}

await main();
