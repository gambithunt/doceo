import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import OpenAI from 'openai';
import { structuredCall, type ApiUsage } from './api.ts';
import { toV2Contract, v2ContractIds } from './contracts.ts';
import { normalizeDuration } from './normalize.ts';
import { contractFingerprint } from './preflight-validation.ts';
import { RepairCandidateArtifactSchema } from './repair-validation.ts';
import {
	LessonDraftV2Schema,
	LessonReviewSchema,
	type LessonContractV2,
	type LessonDraftV2,
	type LessonReview
} from './schema.ts';
import { validateDraft } from './validate.ts';

const baseURL = process.env.MODEL_BASE_URL ?? 'https://api.openai.com/v1';
const draftModel = process.env.MODEL_ID ?? 'gpt-5.4-mini';
const reviewModel = process.env.REVIEW_MODEL_ID ?? 'gpt-5.4';
const runDirectory = resolve('experiments/generation-pipeline-v2/runs');

const draftSystem = `You create compact, visual learning experiences for Doceo.
Follow the supplied contract exactly and teach only its focused idea in 90–120 seconds.
Every scene must cite one or more exact source claim IDs from the contract. IDs are references, not learner-facing text.
Never add factual detail that is not entailed by the approved claims. Visual directions are factual claims too.
For every scene, list each atomic factual visual assertion and the exact claim IDs that entail it. Remove an assertion if the claim does not support its full causal, comparative, directional, spatial, or timing meaning. Citing a related claim is not enough.
The supplied contract owns the one canonical visualModel. Do not redesign it. Scenes reveal it by listing exact state IDs in visualModelStateIds; never create a second ordering in scene prose. Sequence indexes are authoritative and renderers derive position and motion from them. Vaccine protection may only use the model's allowed meanings—never substitute a shield, guard, wall, filter, opening, or blocked-particle metaphor.
Treat every visual constraint as mandatory. Number constraints from zero in their supplied order and cover each exactly once in constraintCoverage, naming every scene that implements it. Define the meaning of every comparative color, size, density, direction, and timing encoding in the scene where it appears.
Do not add side lessons, caveats, negations, causal arrows, spatial precision, or timing cues unless an approved claim explicitly supports them.
Use 4–7 non-repetitive scenes. The first scene must be immediately useful; the last must end cleanly.
Budget the scene durations before submission and target exactly 100 seconds total.
The optional check must assess the learner outcome. For a fixed-choice check use at least three plausible choices.
Do not mention contracts, prompts, source IDs, schemas, or generation instructions in learner-facing content.`;

const reviewSystem = `You are an independent factual reviewer of a short visual lesson.
Review narration, captions, and visual directions against the supplied approved claim ledger and safety boundary.
Actively try to falsify the draft rather than summarize it. Trace every directional, comparative, causal, and timing statement in every visual to a claim. Treat ambiguous visual encodings as major when they could teach the reverse relationship.
Treat the contract's visualModel as the renderer's authoritative relationship model. Reject any conflict between it and visualDirection, narration, captions, assertions, or scene state references. Verify timeline sequence indexes, evidence-link direction, immune-response order, allowed protection meanings, and containment-state order.
Look especially for a visual that implies the reverse of a cited claim, unsupported causal mechanisms, invented precision, scope drift, medical advice, and a check whose supposed answer is not justified by the lesson.
Reject for any critical or major factual, visual, source-support, or safety problem. Minor wording or style issues may be approved.
Do not repair the lesson. Record findings only. A polished lesson can still be dangerously wrong.`;

const repairSystem = `You repair a rejected Doceo visual lesson into a new immutable candidate.
Return the complete lesson, not a patch or explanation.
Address every reviewer finding directly, prioritizing critical and major findings. Preserve parts unrelated to those findings unless a small dependent change is necessary for coherence.
Follow the approved contract and claim ledger exactly. Never add factual detail that is not entailed by an approved claim. A related citation is not enough.
Every atomic factual visual assertion must cite the exact claims that entail its full causal, comparative, directional, spatial, and timing meaning.
Use the contract's visualModel as the authoritative relationship model and make scenes reference its state IDs. Never encode vaccine protection as a physical entry barrier. Never position timeline events manually in visualDirection; sequence indexes control their rendered order.
Keep every visual constraint covered exactly once in constraintCoverage. Keep total scene duration between 90 and 120 seconds.
Do not mention the review, repair, contract, source IDs, schemas, or generation instructions in learner-facing content.`;

function estimatedCost(usage: ApiUsage, input: number, cached: number, output: number) {
	const uncachedInput = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
	return (
		(uncachedInput * input + usage.cachedInputTokens * cached + usage.outputTokens * output) /
		1_000_000
	);
}

async function generateDraft(client: OpenAI, contract: LessonContractV2) {
	return structuredCall({
		client,
		model: draftModel,
		name: 'submit_lesson_draft_v2',
		description: 'Submit the complete source-bound lesson draft.',
		schema: LessonDraftV2Schema,
		system: draftSystem,
		user: `Lesson contract:\n${JSON.stringify(contract)}`
	});
}

async function reviewDraft(client: OpenAI, contract: LessonContractV2, draft: LessonDraftV2) {
	return structuredCall({
		client,
		model: reviewModel,
		name: 'submit_lesson_review',
		description: 'Submit the independent factual review.',
		schema: LessonReviewSchema,
		system: reviewSystem,
		user: `Approved contract and claim ledger:\n${JSON.stringify(contract)}\n\nCandidate lesson:\n${JSON.stringify(draft)}`,
		maxCompletionTokens: 5000,
		reasoningEffort: 'medium'
	});
}

async function repairDraft(
	client: OpenAI,
	contract: LessonContractV2,
	draft: LessonDraftV2,
	review: LessonReview
) {
	return structuredCall({
		client,
		model: draftModel,
		name: 'submit_repaired_lesson_draft_v2',
		description: 'Submit the complete repaired lesson as a new candidate.',
		schema: LessonDraftV2Schema,
		system: repairSystem,
		user: `Approved contract and claim ledger:\n${JSON.stringify(contract)}\n\nRejected candidate:\n${JSON.stringify(draft)}\n\nIndependent review findings to address:\n${JSON.stringify(review)}`
	});
}

async function saveArtifact(id: string, artifact: object, suffix = '') {
	await mkdir(runDirectory, { recursive: true });
	const timestamp = new Date().toISOString().replaceAll(':', '-');
	const outputPath = resolve(runDirectory, `${timestamp}-${id}${suffix}.json`);
	await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
	return outputPath;
}

async function main() {
	const args = process.argv.slice(2);
	if (args.includes('--list')) {
		console.log(v2ContractIds.join('\n'));
		return;
	}
	if (!process.env.MODEL_API_KEY) throw new Error('MODEL_API_KEY is required in .env.local.');
	const repairFileFlag = args.indexOf('--repair-file');
	if (repairFileFlag >= 0) {
		const candidatePath = resolve(args[repairFileFlag + 1]);
		const candidate = RepairCandidateArtifactSchema.parse(
			JSON.parse(await readFile(candidatePath, 'utf8'))
		);
		const contract = toV2Contract(candidate.contract.id);
		const preflightPath = resolve(candidate.preflightPath);
		const preflightArtifact = JSON.parse(await readFile(preflightPath, 'utf8')) as {
			status?: string;
			contractFingerprint?: string;
			validation?: { passed?: boolean };
		};
		if (
			preflightArtifact.status !== 'passed' ||
			preflightArtifact.validation?.passed !== true ||
			preflightArtifact.contractFingerprint !== contractFingerprint(contract)
		) {
			throw new Error('Repair requires a passed preflight matching the current contract exactly.');
		}

		const client = new OpenAI({ apiKey: process.env.MODEL_API_KEY, baseURL, maxRetries: 0 });
		const started = performance.now();
		console.log(`Repairing saved ${contract.id} candidate with ${draftModel}...`);
		const repairResult = await repairDraft(client, contract, candidate.draft, candidate.review);
		const normalized = normalizeDuration(repairResult.value);
		const validation = validateDraft(contract, normalized.draft);
		let reviewResult: Awaited<ReturnType<typeof reviewDraft>> | null = null;
		let reviewError: string | null = null;
		if (validation.passed) {
			console.log(`Reviewing repaired ${contract.id} candidate with ${reviewModel}...`);
			try {
				reviewResult = await reviewDraft(client, contract, normalized.draft);
			} catch (error) {
				reviewError = error instanceof Error ? error.message : String(error);
				console.log(
					`Reviewer failed; repaired candidate will be saved as rejected: ${reviewError}`
				);
			}
		} else {
			console.log('Repair failed deterministic validation; paid review skipped.');
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
			parentCandidatePath: candidatePath,
			preflightPath,
			contract,
			draft: normalized.draft,
			deterministicAdjustments: { duration: normalized.adjustments },
			validation,
			review: reviewResult?.value ?? null,
			reviewError,
			measurement: {
				wallClockMs: Math.round(performance.now() - started),
				repair: {
					model: draftModel,
					requestId: repairResult.requestId,
					usage: repairResult.usage,
					estimatedCostUsd: estimatedCost(repairResult.usage, 0.75, 0.075, 4.5)
				},
				review: reviewResult
					? {
							model: reviewModel,
							requestId: reviewResult.requestId,
							usage: reviewResult.usage,
							estimatedCostUsd: estimatedCost(reviewResult.usage, 2.5, 0.25, 15)
						}
					: null
			}
		};
		const outputPath = await saveArtifact(contract.id, artifact, '-repair');
		console.log(`${artifact.status.toUpperCase()}: ${outputPath}`);
		if (!publishable) process.exitCode = 2;
		return;
	}
	const reviewFileFlag = args.indexOf('--review-file');
	if (reviewFileFlag >= 0) {
		const candidatePath = resolve(args[reviewFileFlag + 1]);
		const candidate = JSON.parse(await readFile(candidatePath, 'utf8')) as {
			contract?: { id?: string };
			draft?: unknown;
		};
		if (!candidate.contract?.id || !candidate.draft) {
			throw new Error('Review file must contain contract.id and draft.');
		}
		const contract = toV2Contract(candidate.contract.id);
		const draft = LessonDraftV2Schema.parse(candidate.draft);
		const validation = validateDraft(contract, draft);
		if (!validation.passed) throw new Error('Review file does not pass current local validation.');
		const client = new OpenAI({ apiKey: process.env.MODEL_API_KEY, baseURL, maxRetries: 0 });
		const started = performance.now();
		console.log(`Reviewing saved ${contract.id} candidate with ${reviewModel}...`);
		const reviewResult = await reviewDraft(client, contract, draft);
		const approved =
			reviewResult.value.decision === 'approve' &&
			!reviewResult.value.findings.some((finding) =>
				['critical', 'major'].includes(finding.severity)
			);
		const artifact = {
			status: approved ? 'approved' : 'rejected',
			createdAt: new Date().toISOString(),
			sourceCandidatePath: candidatePath,
			contract,
			draft,
			validation,
			review: reviewResult.value,
			measurement: {
				wallClockMs: Math.round(performance.now() - started),
				draft: null,
				review: {
					model: reviewModel,
					requestId: reviewResult.requestId,
					usage: reviewResult.usage,
					estimatedCostUsd: estimatedCost(reviewResult.usage, 2.5, 0.25, 15)
				}
			}
		};
		const outputPath = await saveArtifact(contract.id, artifact, '-review');
		console.log(`${artifact.status.toUpperCase()}: ${outputPath}`);
		if (!approved) process.exitCode = 2;
		return;
	}
	const flag = args.indexOf('--contract');
	const id = flag >= 0 ? args[flag + 1] : 'everyday-airplane-lift';
	const contract = toV2Contract(id);
	const preflightFlag = args.indexOf('--preflight-file');
	if (preflightFlag < 0 || !args[preflightFlag + 1]) {
		throw new Error('Generation requires --preflight-file <passed-preflight.json>.');
	}
	const preflightPath = resolve(args[preflightFlag + 1]);
	const preflightArtifact = JSON.parse(await readFile(preflightPath, 'utf8')) as {
		status?: string;
		contractFingerprint?: string;
		validation?: { passed?: boolean };
	};
	if (
		preflightArtifact.status !== 'passed' ||
		preflightArtifact.validation?.passed !== true ||
		preflightArtifact.contractFingerprint !== contractFingerprint(contract)
	) {
		throw new Error('Preflight must be passed and match the current contract exactly.');
	}
	const client = new OpenAI({ apiKey: process.env.MODEL_API_KEY, baseURL, maxRetries: 0 });
	const started = performance.now();

	console.log(`Generating ${id} with ${draftModel}...`);
	const draftResult = await generateDraft(client, contract);
	const normalized = normalizeDuration(draftResult.value);
	const validation = validateDraft(contract, normalized.draft);
	let reviewResult: Awaited<ReturnType<typeof reviewDraft>> | null = null;
	let reviewError: string | null = null;
	if (validation.passed) {
		console.log(`Reviewing ${id} independently with ${reviewModel}...`);
		try {
			reviewResult = await reviewDraft(client, contract, normalized.draft);
		} catch (error) {
			reviewError = error instanceof Error ? error.message : String(error);
			console.log(`Reviewer failed; candidate will be saved as rejected: ${reviewError}`);
		}
	} else {
		console.log('Draft failed deterministic validation; paid review skipped.');
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
		preflightPath,
		contract,
		draft: normalized.draft,
		deterministicAdjustments: { duration: normalized.adjustments },
		validation,
		review: reviewResult?.value ?? null,
		reviewError,
		measurement: {
			wallClockMs: Math.round(performance.now() - started),
			draft: {
				model: draftModel,
				requestId: draftResult.requestId,
				usage: draftResult.usage,
				estimatedCostUsd: estimatedCost(draftResult.usage, 0.75, 0.075, 4.5)
			},
			review: reviewResult
				? {
						model: reviewModel,
						requestId: reviewResult.requestId,
						usage: reviewResult.usage,
						estimatedCostUsd: estimatedCost(reviewResult.usage, 2.5, 0.25, 15)
					}
				: null
		}
	};

	const outputPath = await saveArtifact(id, artifact);
	console.log(`${artifact.status.toUpperCase()}: ${outputPath}`);
	if (!publishable) process.exitCode = 2;
}

await main();
