import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { structuredCall } from './api.ts';
import { normalizeSourceResearch } from './research-normalization.ts';
import { ResearchSufficiencySchema, SourceResearchSchema } from './research-schema.ts';
import { validateResearchSufficiency, validateSourceResearch } from './research-validation.ts';

const baseURL = process.env.MODEL_BASE_URL ?? 'https://api.openai.com/v1';
const researchModel = process.env.RESEARCH_MODEL_ID ?? process.env.MODEL_ID ?? 'gpt-5.4-mini';
const auditModel = process.env.RESEARCH_AUDIT_MODEL_ID ?? process.env.REVIEW_MODEL_ID ?? 'gpt-5.4';
const outputDirectory = resolve('experiments/generation-pipeline-v2/runs');

const researchSystem = `Research one learner question and return a concise sourced answer plus an atomic evidence ledger.
Use web search. Prefer primary authorities, scholarly sources, museums, archives, universities, and established educational institutions. Use two to four sources from at least two hosts. Prefer at least one primary or scholarly source when the question has an appropriate one, but do not reject a sound everyday explanation supported by independent universities or public educational institutions. Avoid blogs, social posts, SEO summaries, and commercial product pages. Apple Podcasts, Spotify, YouTube, TikTok, Facebook, Instagram, X, Reddit, Medium, and Substack are distribution or publishing platforms, not source authorities; never use or label them as primary sources.

First classify the learner's exact intent. A question asking who, when, where, what year, or how many is normally fact or timeline—not mechanism. Do not silently turn "who?" into "who and why?", or add purpose, cause, biography, or background the learner did not request.

The quickAnswer is one to three plain-language sentences, no more than 500 characters. A simple fact should usually be one sentence. Do not put URLs, markdown citations, or source names inside it; sources are returned separately. It answers only what the exact question asks and what the cited literal claims directly support. Give every claim a globally unique ID. quickAnswerClaimIds lists every claim needed by the answer.

The learningTarget restates only what the learner asked to know. Create one to four atomic requirements containing only facts indispensable to that target. A simple fact question normally has exactly one fact requirement. Include a cause, purpose, equation, spatial relationship, temporal order, comparison, or exception only when the learner's question requires it. For every requirement, cite every literal claim that directly supports it and prefer the claim whose wording most exactly entails the statement. Do not add likely misconceptions, lesson activities, enrichment, or decorative facts.

For requests for personal medical, legal, or financial diagnosis/advice, instructions that could cause harm, or questions that cannot be answered responsibly from reliable sources, set decision=decline. Give a brief useful boundary and offer a safe general learning alternative in quickAnswer. A decline has no sources, claims, or requirements.

This artifact is research, not a lesson and not approval to publish a visual explanation.`;

const auditSystem = `Audit a source-research artifact using only its literal claim ledger.
Do not use your own knowledge, source titles, authorities, or URLs as evidence.
Assess the quick answer and every requirement exactly once. Search the entire literal claim ledger, not only the claim IDs originally attached to a requirement. In each coverage item and in quickAnswerClaimIds, return the exact known claim IDs that actually support the text; this is the canonical citation alignment. A claim must directly entail the wording. Related background is insufficient.
Pass only when the entire quick answer and every requirement are supported. Otherwise reject. Do not repair or rewrite the research.`;

function tracedUrls(response: OpenAI.Responses.Response) {
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

function tokenCost(
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

async function save(kind: string, fingerprint: string, artifact: unknown) {
	await mkdir(outputDirectory, { recursive: true });
	const outputPath = resolve(
		outputDirectory,
		`${timestamp()}-question-${kind}-${fingerprint.slice(0, 10)}.json`
	);
	await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
	return outputPath;
}

async function researchQuestion(client: OpenAI, question: string, answerOnly = false) {
	const fingerprint = createHash('sha256').update(question.trim().toLowerCase()).digest('hex');
	const started = performance.now();
	try {
		const response = await client.responses.parse({
			model: researchModel,
			input: [
				{ role: 'system', content: researchSystem },
				{ role: 'user', content: `Learner question:\n${question}` }
			],
			reasoning: { effort: 'low' },
			tools: [{ type: 'web_search', search_context_size: 'low' }],
			tool_choice: 'required',
			include: ['web_search_call.action.sources'],
			text: { format: zodTextFormat(SourceResearchSchema, 'source_research') },
			max_output_tokens: 4500,
			store: false
		});
		if (!response.output_parsed) throw new Error('No parsed source research was returned.');
		const parsedResearch = SourceResearchSchema.parse(response.output_parsed);
		const research = SourceResearchSchema.parse(normalizeSourceResearch(parsedResearch));
		const researchedUrls = tracedUrls(response);
		const validation = validateSourceResearch(question, research, researchedUrls);
		const usage = usageOf(response);
		const usable = validation.passed;
		const artifact = {
			status: usable ? (research.decision === 'answer' ? 'answered' : 'declined') : 'fallback',
			createdAt: new Date().toISOString(),
			question,
			questionFingerprint: fingerprint,
			answer: {
				text: usable
					? research.quickAnswer
					: 'I could not verify a reliable answer quickly enough. Your question is saved, but I will not pretend an uncertain answer is ready.',
				sources:
					usable && research.decision === 'answer'
						? research.sources.map(({ title, authority, url }) => ({ title, authority, url }))
						: []
			},
			research,
			researchedUrls,
			validation,
			measurement: {
				wallClockMs: Math.round(performance.now() - started),
				model: researchModel,
				requestId: response._request_id ?? response.id ?? null,
				usage,
				estimatedModelTokenCostUsd: tokenCost(usage, {
					input: 0.75,
					cached: 0.075,
					output: 4.5
				}),
				costNote: 'Token estimate excludes the web-search fee.'
			}
		};
		const researchPath = await save('research', fingerprint, artifact);
		console.log(`ANSWER_READY: ${researchPath}`);
		if (answerOnly || !usable || research.decision === 'decline') {
			return { artifact, researchPath };
		}

		const auditStarted = performance.now();
		try {
			const auditResult = await structuredCall({
				client,
				model: auditModel,
				name: 'audit_source_sufficiency',
				description: 'Audit whether the literal source ledger supports the answer and mechanism.',
				schema: ResearchSufficiencySchema,
				system: auditSystem,
				user: `Learner question:\n${question}\n\nSource research:\n${JSON.stringify(research)}`,
				maxCompletionTokens: 6000,
				reasoningEffort: 'medium'
			});
			const validation = validateResearchSufficiency(research, auditResult.value);
			const passed = validation.passed && auditResult.value.decision === 'pass';
			const auditArtifact = {
				status: passed ? 'passed' : 'rejected',
				createdAt: new Date().toISOString(),
				question,
				questionFingerprint: fingerprint,
				researchPath,
				audit: auditResult.value,
				validation,
				measurement: {
					wallClockMs: Math.round(performance.now() - auditStarted),
					model: auditModel,
					reasoningEffort: 'medium',
					requestId: auditResult.requestId,
					usage: auditResult.usage,
					estimatedModelTokenCostUsd: tokenCost(auditResult.usage, {
						input: 2.5,
						cached: 0.25,
						output: 15
					})
				}
			};
			const auditPath = await save('audit', fingerprint, auditArtifact);
			console.log(`${passed ? 'AUDIT_PASSED' : 'AUDIT_REJECTED'}: ${auditPath}`);
			return { artifact, researchPath, auditArtifact, auditPath };
		} catch (error) {
			const auditArtifact = {
				status: 'error',
				createdAt: new Date().toISOString(),
				question,
				questionFingerprint: fingerprint,
				researchPath,
				error: error instanceof Error ? error.message : 'The source audit failed.'
			};
			const auditPath = await save('audit', fingerprint, auditArtifact);
			console.log(`AUDIT_ERROR: ${auditPath}`);
			return { artifact, researchPath, auditArtifact, auditPath };
		}
	} catch (error) {
		const artifact = {
			status: 'fallback',
			createdAt: new Date().toISOString(),
			question,
			questionFingerprint: fingerprint,
			answer: {
				text: 'I could not verify a reliable answer quickly enough. Your question is saved, but I will not pretend an uncertain answer is ready.',
				sources: []
			},
			error: error instanceof Error ? error.message : 'Research failed.',
			measurement: { wallClockMs: Math.round(performance.now() - started) }
		};
		const researchPath = await save('research', fingerprint, artifact);
		console.log(`ANSWER_READY: ${researchPath}`);
		return { artifact, researchPath };
	}
}

async function main() {
	if (!process.env.MODEL_API_KEY) throw new Error('MODEL_API_KEY is required in .env.local.');
	const args = process.argv.slice(2);
	const questionFlag = args.indexOf('--question');
	const question = questionFlag >= 0 ? args[questionFlag + 1] : null;
	if (!question) throw new Error('Provide --question "...".');
	const client = new OpenAI({ apiKey: process.env.MODEL_API_KEY, baseURL, maxRetries: 2 });
	console.log(`Researching: ${question}`);
	await researchQuestion(client, question, args.includes('--answer-only'));
}

await main();
