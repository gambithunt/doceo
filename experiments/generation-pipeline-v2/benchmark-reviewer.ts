import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import OpenAI from 'openai';
import { structuredCall } from './api.ts';
import { LessonReviewSchema, type LessonContractV2 } from './schema.ts';

const defaultFiles = [
	'2026-08-18T13-34-31.856Z-everyday-airplane-lift-review.json',
	'2026-08-18T13-36-06.784Z-math-conditional-probability.json',
	'2026-08-18T15-19-49.126Z-everyday-soap.json',
	'2026-08-18T13-04-42.860Z-everyday-airplane-lift-review.json',
	'2026-08-18T14-47-20.245Z-health-vaccines-review.json',
	'2026-08-18T18-19-08.157Z-space-before-big-bang.json'
];

const reviewSystem = `You are an independent factual reviewer of a short visual lesson.
Review narration, captions, and visual directions against the supplied approved claim ledger and safety boundary.
Actively try to falsify the draft. Trace directional, comparative, causal, and timing statements to approved claims.
Treat the canonical visualModel as authoritative and reject conflicts in ordering, epistemic status, immune-response meaning, or containment sequence.
Reject for any critical or major factual, visual, source-support, check-answer, or safety problem. Minor wording or style issues may be approved.
Do not repair the lesson. Be concise and return at most four findings.`;

async function main() {
	if (!process.env.MODEL_API_KEY) throw new Error('MODEL_API_KEY is required in .env.local.');
	const model = process.env.BENCHMARK_REVIEW_MODEL_ID ?? 'gpt-5.4-mini';
	const effort = (process.env.BENCHMARK_REVIEW_EFFORT ?? 'low') as 'low' | 'medium';
	const baseURL = process.env.MODEL_BASE_URL ?? 'https://api.openai.com/v1';
	const runDirectory = resolve('experiments/generation-pipeline-v2/runs');
	const client = new OpenAI({ apiKey: process.env.MODEL_API_KEY, baseURL, maxRetries: 0 });
	const results = [];

	for (const file of defaultFiles) {
		const path = resolve(runDirectory, file);
		const artifact = JSON.parse(await readFile(path, 'utf8')) as {
			status: 'approved' | 'rejected';
			contract: LessonContractV2;
			draft: unknown;
		};
		const started = performance.now();
		console.log(`Benchmarking ${file} with ${model} (${effort})...`);
		const response = await structuredCall({
			client,
			model,
			name: 'submit_benchmark_lesson_review',
			description: 'Submit the independent benchmark review.',
			schema: LessonReviewSchema,
			system: reviewSystem,
			user: `Approved contract and claim ledger:\n${JSON.stringify(artifact.contract)}\n\nCandidate lesson:\n${JSON.stringify(artifact.draft)}`,
			maxCompletionTokens: 3200,
			reasoningEffort: effort
		});
		const expected = artifact.status === 'approved' ? 'approve' : 'reject';
		results.push({
			file,
			expected,
			actual: response.value.decision,
			matched: expected === response.value.decision,
			wallClockMs: Math.round(performance.now() - started),
			usage: response.usage,
			review: response.value
		});
	}

	const artifact = {
		createdAt: new Date().toISOString(),
		model,
		reasoningEffort: effort,
		matched: results.filter((result) => result.matched).length,
		total: results.length,
		promotable: results.every((result) => result.matched),
		results
	};
	await mkdir(runDirectory, { recursive: true });
	const timestamp = new Date().toISOString().replaceAll(':', '-');
	const outputPath = resolve(runDirectory, `${timestamp}-reviewer-benchmark.json`);
	await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
	console.log(`BENCHMARK: ${outputPath}`);
	console.log(
		`${artifact.matched}/${artifact.total} decisions matched; promotable=${artifact.promotable}`
	);
	if (!artifact.promotable) process.exitCode = 2;
}

await main();
