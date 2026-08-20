import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import OpenAI from 'openai';
import { structuredCall } from './api.ts';
import { composeNarrowedResearch, narrowingSchemaFor } from './research-narrowing.ts';
import { ResearchSufficiencySchema, SourceResearchSchema } from './research-schema.ts';
import { validateSourceResearch } from './research-validation.ts';

const baseURL = process.env.MODEL_BASE_URL ?? 'https://api.openai.com/v1';
const narrowingModel =
	process.env.RESEARCH_NARROWING_MODEL_ID ?? process.env.MODEL_ID ?? 'gpt-5.4-mini';
const outputDirectory = resolve('experiments/generation-pipeline-v2/runs');

const narrowingSystem = `Narrow a rejected source-research answer so every learner-facing statement is directly entailed by its existing literal claim ledger.
Use only the supplied claims and the independent audit findings. Do not browse, add facts, add sources, change the question, or broaden its intent.
Prefer the exact terminology and qualifiers used by the supporting claims. Remove a detail when the ledger supports only a weaker statement. Keep a direct fact answer short, usually one sentence and one indispensable requirement.
Return only the revised quick answer, its exact supporting claim IDs, the narrow learning target, and one to four atomic requirements. Claim IDs must already exist in the supplied ledger. This is the only narrowing attempt; do not defend the rejected wording.`;

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

function estimatedCost(usage: {
	inputTokens: number;
	cachedInputTokens: number;
	outputTokens: number;
}) {
	return (
		((usage.inputTokens - usage.cachedInputTokens) * 0.75 +
			usage.cachedInputTokens * 0.075 +
			usage.outputTokens * 4.5) /
		1_000_000
	);
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
	const researchPath = resolve(researchFile);
	const auditPath = resolve(auditFile);
	const researchArtifact = JSON.parse(await readFile(researchPath, 'utf8')) as ResearchArtifact;
	const auditArtifact = JSON.parse(await readFile(auditPath, 'utf8')) as AuditArtifact;
	if (researchArtifact.status !== 'answered') throw new Error('Research is not answer-ready.');
	if (auditArtifact.status !== 'rejected') throw new Error('Narrowing requires a rejected audit.');
	if (
		auditArtifact.questionFingerprint !== researchArtifact.questionFingerprint ||
		resolve(auditArtifact.researchPath) !== researchPath
	) {
		throw new Error('The rejected audit does not belong to the supplied research artifact.');
	}
	const research = SourceResearchSchema.parse(researchArtifact.research);
	const audit = ResearchSufficiencySchema.parse(auditArtifact.audit);
	const client = new OpenAI({ apiKey: process.env.MODEL_API_KEY, baseURL, maxRetries: 2 });
	const started = performance.now();
	const result = await structuredCall({
		client,
		model: narrowingModel,
		name: 'narrow_rejected_source_research',
		description: 'Return a narrower claim-faithful answer using the immutable evidence ledger.',
		schema: narrowingSchemaFor(research),
		system: narrowingSystem,
		user: `Learner question:\n${researchArtifact.question}\n\nImmutable source research:\n${JSON.stringify(research)}\n\nRejected audit:\n${JSON.stringify(audit)}`,
		maxCompletionTokens: 3000,
		reasoningEffort: 'low'
	});
	const narrowed = composeNarrowedResearch(research, result.value);
	const validation = validateSourceResearch(
		researchArtifact.question,
		narrowed,
		researchArtifact.researchedUrls
	);
	const artifact = {
		status: validation.passed ? 'answered' : 'invalid',
		narrowingVersion: 'claim-ledger-v4',
		createdAt: new Date().toISOString(),
		question: researchArtifact.question,
		questionFingerprint: researchArtifact.questionFingerprint,
		parentResearchPath: researchPath,
		rejectedAuditPath: auditPath,
		answer: {
			text: narrowed.quickAnswer,
			sources: narrowed.sources.map(({ title, authority, url }) => ({ title, authority, url }))
		},
		research: narrowed,
		researchedUrls: researchArtifact.researchedUrls,
		validation,
		measurement: {
			wallClockMs: Math.round(performance.now() - started),
			model: narrowingModel,
			requestId: result.requestId,
			usage: result.usage,
			estimatedModelTokenCostUsd: estimatedCost(result.usage)
		}
	};
	await mkdir(outputDirectory, { recursive: true });
	const timestamp = new Date().toISOString().replaceAll(':', '-');
	const outputPath = resolve(
		outputDirectory,
		`${timestamp}-question-narrowed-research-${researchArtifact.questionFingerprint.slice(0, 10)}.json`
	);
	await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
	console.log(`${validation.passed ? 'NARROWED_RESEARCH' : 'NARROWING_INVALID'}: ${outputPath}`);
	if (!validation.passed) process.exitCode = 2;
}

await main();
