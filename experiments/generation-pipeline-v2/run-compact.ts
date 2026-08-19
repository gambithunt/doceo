import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import OpenAI from 'openai';
import { structuredCall, type ApiUsage } from './api.ts';
import {
	CompactLessonDraftSchema,
	CompactLessonReviewSchema,
	type CompactLessonReview
} from './compact-schema.ts';
import { normalizeCompactDraft, validateCompactDraft } from './compact-validation.ts';
import { toV2Contract } from './contracts.ts';
import { contractFingerprint } from './preflight-validation.ts';

const baseURL = process.env.MODEL_BASE_URL ?? 'https://api.openai.com/v1';
const draftModel = process.env.MODEL_ID ?? 'gpt-5.4-mini';
const reviewModel = process.env.REVIEW_MODEL_ID ?? 'gpt-5.4';
const reviewEffort = (process.env.REVIEW_REASONING_EFFORT ?? 'medium') as 'low' | 'medium';
const runDirectory = resolve('experiments/generation-pipeline-v2/runs');

const draftSystem = `Create one compact visual micro-lesson from the supplied approved contract.
Return only learner-facing text and canonical visual state IDs. The renderer owns all visual layout, labels, ordering, color, and motion; do not describe or redesign those visuals.
Use four or five short scenes. Each title must use at most nine words and each narration at most 55 words.
List visual state IDs in the contract's canonical sequence order. Use every canonical state at least once.
Teach only facts directly entailed by the approved source claims. Preserve the safe boundary. Do not add examples, comparisons, causal mechanisms, timing, precision, or certainty absent from those claims.
For a timeline, say explicitly which ideas are observed, inferred, or unknown. Never turn an unknown into an unnamed stage waiting to be discovered.
The optional fixed-choice check must assess the learner outcome with three plausible choices and at least one supported response.
Do not mention the contract, claims, sources, schema, generation, or review.`;

const reviewSystem = `Independently review a compact visual lesson against its approved contract and source-claim ledger.
The canonical visual model is rendered directly by code. Review the learner-facing title, narration, state activation, and check; do not invent visual directions that are not present.
Reject for any critical or major factual, source-support, canonical-order, epistemic-status, check-answer, or safety-boundary problem. Minor style issues may be approved.
For timelines, require unknown ideas to be explicitly unknown and inflation to be inferred rather than directly observed.
For immune response lessons, preserve possible infection and avoid guaranteed protection or personal medical advice.
Be concise. Return at most four findings. Do not repair the lesson.`;

function estimatedCost(usage: ApiUsage, model: string) {
	const rates = model === 'gpt-5.4-mini' ? [0.75, 0.075, 4.5] : [2.5, 0.25, 15];
	const uncachedInput = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
	return (
		(uncachedInput * rates[0] +
			usage.cachedInputTokens * rates[1] +
			usage.outputTokens * rates[2]) /
		1_000_000
	);
}

async function main() {
	if (!process.env.MODEL_API_KEY) throw new Error('MODEL_API_KEY is required in .env.local.');
	const args = process.argv.slice(2);
	const contractFlag = args.indexOf('--contract');
	const preflightFlag = args.indexOf('--preflight-file');
	const candidateFlag = args.indexOf('--candidate-file');
	if (contractFlag < 0 || !args[contractFlag + 1]) throw new Error('Choose --contract <id>.');
	if (preflightFlag < 0 || !args[preflightFlag + 1]) {
		throw new Error('Generation requires --preflight-file <passed-preflight.json>.');
	}

	const contract = toV2Contract(args[contractFlag + 1]);
	if (!contract.visualModel)
		throw new Error('Compact generation requires a canonical visual model.');
	const preflightPath = resolve(args[preflightFlag + 1]);
	const preflight = JSON.parse(await readFile(preflightPath, 'utf8')) as {
		status?: string;
		contractFingerprint?: string;
		validation?: { passed?: boolean };
	};
	if (
		preflight.status !== 'passed' ||
		preflight.validation?.passed !== true ||
		preflight.contractFingerprint !== contractFingerprint(contract)
	) {
		throw new Error('Preflight must be passed and match the current contract exactly.');
	}

	const client = new OpenAI({ apiKey: process.env.MODEL_API_KEY, baseURL, maxRetries: 0 });
	const started = performance.now();
	let draftResult: {
		value: typeof CompactLessonDraftSchema._output;
		usage: ApiUsage;
		requestId: string | null;
	};
	if (candidateFlag >= 0 && args[candidateFlag + 1]) {
		const saved = JSON.parse(await readFile(resolve(args[candidateFlag + 1]), 'utf8')) as {
			draft?: unknown;
		};
		draftResult = {
			value: CompactLessonDraftSchema.parse(saved.draft),
			usage: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, totalTokens: 0 },
			requestId: null
		};
		console.log(`Reusing saved compact ${contract.id} candidate...`);
	} else {
		console.log(`Generating compact ${contract.id} with ${draftModel}...`);
		draftResult = await structuredCall({
			client,
			model: draftModel,
			name: 'submit_compact_lesson',
			description: 'Submit the compact learner-facing lesson.',
			schema: CompactLessonDraftSchema,
			system: draftSystem,
			user: `Approved contract:\n${JSON.stringify(contract)}`,
			maxCompletionTokens: 2400,
			reasoningEffort: 'none'
		});
	}
	const draft = normalizeCompactDraft(contract, draftResult.value);
	const validation = validateCompactDraft(contract, draft);
	let reviewResult: {
		value: CompactLessonReview;
		usage: ApiUsage;
		requestId: string | null;
	} | null = null;
	let reviewError: string | null = null;
	if (validation.passed) {
		console.log(
			`Reviewing compact ${contract.id} independently with ${reviewModel} (${reviewEffort})...`
		);
		try {
			reviewResult = await structuredCall({
				client,
				model: reviewModel,
				name: 'submit_compact_lesson_review',
				description: 'Submit the independent compact lesson review.',
				schema: CompactLessonReviewSchema,
				system: reviewSystem,
				user: `Approved contract and claim ledger:\n${JSON.stringify(contract)}\n\nCompact candidate:\n${JSON.stringify(draft)}`,
				maxCompletionTokens: 2600,
				reasoningEffort: reviewEffort
			});
		} catch (error) {
			reviewError = error instanceof Error ? error.message : String(error);
		}
	}

	const publishable =
		validation.passed &&
		reviewResult?.value.decision === 'approve' &&
		!reviewResult.value.findings.some((finding) =>
			['critical', 'major'].includes(finding.severity)
		);
	const artifact = {
		status: publishable ? 'approved' : 'rejected',
		createdAt: new Date().toISOString(),
		pipeline: 'compact-v1',
		preflightPath,
		contract,
		draft,
		validation,
		review: reviewResult?.value ?? null,
		reviewError,
		measurement: {
			wallClockMs: Math.round(performance.now() - started),
			draft: {
				model: draftModel,
				requestId: draftResult.requestId,
				usage: draftResult.usage,
				estimatedCostUsd: estimatedCost(draftResult.usage, draftModel)
			},
			review: reviewResult
				? {
						model: reviewModel,
						reasoningEffort: reviewEffort,
						requestId: reviewResult.requestId,
						usage: reviewResult.usage,
						estimatedCostUsd: estimatedCost(reviewResult.usage, reviewModel)
					}
				: null
		}
	};

	await mkdir(runDirectory, { recursive: true });
	const timestamp = new Date().toISOString().replaceAll(':', '-');
	const outputPath = resolve(runDirectory, `${timestamp}-${contract.id}-compact.json`);
	await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
	console.log(`${artifact.status.toUpperCase()}: ${outputPath}`);
	if (!publishable) process.exitCode = 2;
}

await main();
