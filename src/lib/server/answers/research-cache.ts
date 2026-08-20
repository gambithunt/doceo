import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const runsDirectory = resolve('experiments/generation-pipeline-v2/runs');
const reuseWindowMs = 30 * 24 * 60 * 60 * 1000;

export function questionFingerprint(question: string) {
	return createHash('sha256').update(question.trim().toLowerCase()).digest('hex');
}

export function canonicalQuestionKey(question: string) {
	return question
		.trim()
		.replace(/\s+/g, ' ')
		.replace(/[?!.]+$/, '')
		.toLowerCase();
}

export function isReusableResearchArtifact(value: unknown, question: string, now = Date.now()) {
	if (typeof value !== 'object' || value === null) return false;
	const artifact = value as Record<string, unknown>;
	if (
		artifact.status !== 'answered' ||
		typeof artifact.question !== 'string' ||
		canonicalQuestionKey(artifact.question) !== canonicalQuestionKey(question) ||
		artifact.questionFingerprint !== questionFingerprint(artifact.question)
	)
		return false;
	const createdAt = typeof artifact.createdAt === 'string' ? Date.parse(artifact.createdAt) : NaN;
	if (!Number.isFinite(createdAt) || now - createdAt > reuseWindowMs || createdAt > now)
		return false;
	if (typeof artifact.answer !== 'object' || artifact.answer === null) return false;
	const answer = artifact.answer as Record<string, unknown>;
	return (
		typeof answer.text === 'string' &&
		answer.text.trim().length > 0 &&
		Array.isArray(answer.sources) &&
		answer.sources.length > 0
	);
}

export async function findReusableResearchPath(question: string) {
	let filenames: string[];
	try {
		filenames = await readdir(runsDirectory);
	} catch {
		return null;
	}
	const candidates = filenames
		.filter((name) => /-question-research-[a-f0-9]{10}\.json$/.test(name))
		.sort()
		.reverse();
	for (const filename of candidates) {
		const path = resolve(runsDirectory, filename);
		try {
			const artifact = JSON.parse(await readFile(path, 'utf8')) as unknown;
			if (isReusableResearchArtifact(artifact, question)) return path;
		} catch {
			// A partial or malformed artifact is never reusable; keep looking.
		}
	}
	return null;
}
