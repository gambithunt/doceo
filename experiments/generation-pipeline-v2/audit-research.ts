import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import OpenAI from 'openai';
import { structuredCall } from './api.ts';
import { ResearchSufficiencySchema, SourceResearchSchema } from './research-schema.ts';
import { validateResearchSufficiency, validateSourceResearch } from './research-validation.ts';

const baseURL = process.env.MODEL_BASE_URL ?? 'https://api.openai.com/v1';
const auditModel = process.env.RESEARCH_AUDIT_MODEL_ID ?? process.env.REVIEW_MODEL_ID ?? 'gpt-5.4';
const outputDirectory = resolve('experiments/generation-pipeline-v2/runs');

const auditSystem = `Audit a source-research artifact using only its literal claim ledger.
Do not use your own knowledge, source titles, authorities, or URLs as evidence.
Assess the quick answer and every requirement exactly once. Search the entire literal claim ledger, not only the claim IDs originally attached to a requirement. In each coverage item and in quickAnswerClaimIds, return the exact known claim IDs that actually support the text; this becomes the canonical citation alignment. Every factual statement still needs direct support. Related background is insufficient.
Pass only when the entire quick answer and every requirement are supported. Otherwise reject. Do not repair or rewrite the research.`;

type ResearchArtifact = {
	status: string;
	question: string;
	questionFingerprint: string;
	research: unknown;
	researchedUrls: string[];
};

function timestamp() {
	return new Date().toISOString().replaceAll(':', '-');
}

function estimatedCost(usage: {
	inputTokens: number;
	cachedInputTokens: number;
	outputTokens: number;
}) {
	return (
		((usage.inputTokens - usage.cachedInputTokens) * 2.5 +
			usage.cachedInputTokens * 0.25 +
			usage.outputTokens * 15) /
		1_000_000
	);
}

async function main() {
	if (!process.env.MODEL_API_KEY) throw new Error('MODEL_API_KEY is required in .env.local.');
	const args = process.argv.slice(2);
	const fileIndex = args.indexOf('--research-file');
	const inputFile = fileIndex >= 0 ? args[fileIndex + 1] : null;
	if (!inputFile) throw new Error('Provide --research-file <path>.');
	const researchPath = resolve(inputFile);
	const artifact = JSON.parse(await readFile(researchPath, 'utf8')) as ResearchArtifact;
	if (artifact.status !== 'answered') throw new Error('Research is not answer-ready.');
	const research = SourceResearchSchema.parse(artifact.research);
	const localValidation = validateSourceResearch(
		artifact.question,
		research,
		artifact.researchedUrls
	);
	if (!localValidation.passed) throw new Error('Research failed deterministic validation.');

	const client = new OpenAI({ apiKey: process.env.MODEL_API_KEY, baseURL, maxRetries: 2 });
	const started = performance.now();
	const result = await structuredCall({
		client,
		model: auditModel,
		name: 'audit_saved_source_research',
		description: 'Audit whether the saved claim ledger supports the answer and mechanism.',
		schema: ResearchSufficiencySchema,
		system: auditSystem,
		user: `Learner question:\n${artifact.question}\n\nSaved source research:\n${JSON.stringify(research)}`,
		maxCompletionTokens: 6000,
		reasoningEffort: 'medium'
	});
	const validation = validateResearchSufficiency(research, result.value);
	const passed = validation.passed && result.value.decision === 'pass';
	const auditArtifact = {
		status: passed ? 'passed' : 'rejected',
		createdAt: new Date().toISOString(),
		question: artifact.question,
		questionFingerprint: artifact.questionFingerprint,
		researchPath,
		audit: result.value,
		validation,
		measurement: {
			wallClockMs: Math.round(performance.now() - started),
			model: auditModel,
			reasoningEffort: 'medium',
			requestId: result.requestId,
			usage: result.usage,
			estimatedModelTokenCostUsd: estimatedCost(result.usage)
		}
	};
	await mkdir(outputDirectory, { recursive: true });
	const outputPath = resolve(
		outputDirectory,
		`${timestamp()}-question-audit-${artifact.questionFingerprint.slice(0, 10)}.json`
	);
	await writeFile(outputPath, `${JSON.stringify(auditArtifact, null, 2)}\n`, 'utf8');
	console.log(`${passed ? 'AUDIT_PASSED' : 'AUDIT_REJECTED'}: ${outputPath}`);
	if (!passed) process.exitCode = 2;
}

await main();
