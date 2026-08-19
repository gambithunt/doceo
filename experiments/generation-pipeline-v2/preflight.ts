import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import OpenAI from 'openai';
import { structuredCall } from './api.ts';
import { toV2Contract, v2ContractIds } from './contracts.ts';
import { contractFingerprint, validatePreflight } from './preflight-validation.ts';
import { ContractPreflightSchema } from './schema.ts';

const baseURL = process.env.MODEL_BASE_URL ?? 'https://api.openai.com/v1';
const model = process.env.PREFLIGHT_MODEL_ID ?? process.env.REVIEW_MODEL_ID ?? 'gpt-5.4';
const outputDirectory = resolve('experiments/generation-pipeline-v2/runs');

const system = `You audit whether a lesson contract's approved source-claim ledger is sufficient before generation.
Use only the literal approved claims. Do not fill factual gaps from your own knowledge, source titles, URLs, prerequisites, or likely misconceptions.
Assess each required target exactly once: focusedIdea, chosenApproach, learnerOutcome, optionalEvidenceTarget, safeBoundary, and visualConstraints.
Audit only factual, causal, comparative, directional, timing, and mechanism assertions. A teaching sequence, interaction format, visual layout, color legend, performance word such as "correctly," or product-policy instruction does not require a scientific citation.
For a mixed target, judge whether all factual assertions are supported and ignore its purely pedagogical or policy parts. A safe boundary's factual limit requires support, but a rule against personal advice does not. A visual constraint's depicted scientific relationship requires support, but its requirement for labels or a legend does not.
Use "not_applicable" only when a target contains no factual assertion at all; cite no claims for that status.
"Supported" means the cited claims directly entail all factual and causal content the target requires.
"Partial" means some but not all content is entailed. "Unsupported" means no cited claim entails it.
A chosen visual approach is partial if its depicted comparison, mechanism, direction, or timing is absent from the claims; presentation format alone is not a gap.
Reject if any target is partial or unsupported. Do not propose lesson wording or silently repair the contract.`;

function estimatedCost(inputTokens: number, cachedInputTokens: number, outputTokens: number) {
	return (
		((inputTokens - cachedInputTokens) * 2.5 + cachedInputTokens * 0.25 + outputTokens * 15) /
		1_000_000
	);
}

async function main() {
	const args = process.argv.slice(2);
	if (args.includes('--list')) {
		console.log(v2ContractIds.join('\n'));
		return;
	}
	if (!process.env.MODEL_API_KEY) throw new Error('MODEL_API_KEY is required in .env.local.');
	const flag = args.indexOf('--contract');
	if (flag < 0 || !args[flag + 1]) throw new Error('Choose --contract <id>.');
	const contract = toV2Contract(args[flag + 1]);
	const client = new OpenAI({ apiKey: process.env.MODEL_API_KEY, baseURL, maxRetries: 0 });
	const started = performance.now();

	console.log(`Preflighting ${contract.id} with ${model}...`);
	const result = await structuredCall({
		client,
		model,
		name: 'submit_contract_preflight',
		description: 'Submit the source-coverage audit for the lesson contract.',
		schema: ContractPreflightSchema,
		system,
		user: `Contract to audit:\n${JSON.stringify(contract)}`,
		maxCompletionTokens: 5000,
		reasoningEffort: 'medium'
	});
	const validation = validatePreflight(contract, result.value);
	const artifact = {
		status: validation.passed ? 'passed' : 'rejected',
		createdAt: new Date().toISOString(),
		contractFingerprint: contractFingerprint(contract),
		contract,
		preflight: result.value,
		validation,
		measurement: {
			wallClockMs: Math.round(performance.now() - started),
			model,
			requestId: result.requestId,
			usage: result.usage,
			estimatedCostUsd: estimatedCost(
				result.usage.inputTokens,
				result.usage.cachedInputTokens,
				result.usage.outputTokens
			)
		}
	};
	await mkdir(outputDirectory, { recursive: true });
	const timestamp = new Date().toISOString().replaceAll(':', '-');
	const outputPath = resolve(outputDirectory, `${timestamp}-${contract.id}-preflight.json`);
	await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
	console.log(`${artifact.status.toUpperCase()}: ${outputPath}`);
	if (!validation.passed) process.exitCode = 2;
}

await main();
