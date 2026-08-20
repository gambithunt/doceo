import { env } from '$env/dynamic/private';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { AnswerJobView, QuickAnswer } from '$lib/answers/types';
import { findReusableResearchPath } from './research-cache';

type InternalJob = AnswerJobView & { researchPath?: string };

const jobs = new Map<string, InternalJob>();
const cachedByQuestion = new Map<string, string>();

function normalizedQuestion(question: string) {
	return question.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function update(job: InternalJob, phase: InternalJob['phase'], message: string) {
	job.phase = phase;
	job.message = message;
	job.updatedAt = new Date().toISOString();
}

function fallbackAnswer(): QuickAnswer {
	return {
		text: 'I could not verify a reliable answer quickly enough. Your question is saved, but I will not pretend an uncertain answer is ready.',
		sources: []
	};
}

function commandEnvironment() {
	return {
		...process.env,
		MODEL_API_KEY: env.MODEL_API_KEY,
		MODEL_BASE_URL: env.MODEL_BASE_URL,
		MODEL_ID: env.MODEL_ID,
		REVIEW_MODEL_ID: env.REVIEW_MODEL_ID,
		RESEARCH_MODEL_ID: env.RESEARCH_MODEL_ID,
		RESEARCH_AUDIT_MODEL_ID: env.RESEARCH_AUDIT_MODEL_ID
	};
}

async function loadAnswer(job: InternalJob, path: string) {
	const artifact = JSON.parse(await readFile(path, 'utf8')) as {
		status?: unknown;
		answer?: { text?: unknown; sources?: unknown };
	};
	if (typeof artifact.answer?.text !== 'string' || !Array.isArray(artifact.answer.sources)) {
		throw new Error('The research artifact did not contain a usable answer.');
	}
	const sources = artifact.answer.sources.filter(
		(source): source is { title: string; authority: string; url: string } =>
			typeof source === 'object' &&
			source !== null &&
			typeof (source as Record<string, unknown>).title === 'string' &&
			typeof (source as Record<string, unknown>).authority === 'string' &&
			typeof (source as Record<string, unknown>).url === 'string'
	);
	if (artifact.status === 'fallback') return false;
	job.answer = { text: artifact.answer.text, sources };
	job.researchPath = path;
	update(job, 'answered', 'A sourced answer is ready.');
	return true;
}

async function researchOnce(job: InternalJob) {
	let output = '';
	await new Promise<void>((resolveCommand, rejectCommand) => {
		const child = spawn(
			process.execPath,
			[
				'--import',
				'tsx',
				'experiments/generation-pipeline-v2/research-question.ts',
				'--question',
				job.question,
				'--answer-only'
			],
			{ cwd: process.cwd(), env: commandEnvironment(), stdio: ['ignore', 'pipe', 'pipe'] }
		);
		const receive = (chunk: Buffer) => {
			output += chunk.toString();
		};
		child.stdout.on('data', receive);
		child.stderr.on('data', receive);
		child.once('error', rejectCommand);
		child.once('close', () => resolveCommand());
	});
	const path = output.match(/^ANSWER_READY: (.+)$/m)?.[1]?.trim();
	return path ? loadAnswer(job, path) : false;
}

async function execute(job: InternalJob) {
	const cachedPath = await findReusableResearchPath(job.question);
	if (cachedPath && (await loadAnswer(job, cachedPath))) {
		update(job, 'answered', 'A checked answer was ready to reopen.');
		return;
	}
	if (!env.MODEL_API_KEY) {
		job.answer = fallbackAnswer();
		update(job, 'answered', 'The researcher is not connected. You can retry after restarting it.');
		return;
	}
	update(job, 'researching', 'Finding a small set of trustworthy sources…');
	try {
		if (await researchOnce(job)) return;
		update(job, 'researching', 'The first pass missed. Trying one cleaner route…');
		if (await researchOnce(job)) return;
		throw new Error('Research ended without a sourced learner response.');
	} catch {
		job.answer = fallbackAnswer();
		update(job, 'answered', 'The researcher could not verify this attempt. It is safe to retry.');
	}
}

export function createAnswerJob(question: string) {
	const trimmed = question.trim().replace(/\s+/g, ' ');
	if (trimmed.length < 3 || trimmed.length > 240) {
		throw new Error('Questions must contain between 3 and 240 characters.');
	}
	const key = normalizedQuestion(trimmed);
	const cachedId = cachedByQuestion.get(key);
	if (cachedId) {
		const cached = jobs.get(cachedId);
		if (cached && (cached.phase !== 'answered' || cached.answer?.sources.length)) {
			return publicJob(cached);
		}
		cachedByQuestion.delete(key);
	}
	const now = new Date().toISOString();
	const job: InternalJob = {
		id: randomUUID(),
		question: trimmed,
		phase: 'queued',
		message: 'Following your question to its sources…',
		createdAt: now,
		updatedAt: now
	};
	jobs.set(job.id, job);
	cachedByQuestion.set(key, job.id);
	void execute(job);
	return publicJob(job);
}

export function getAnswerJob(id: string) {
	const job = jobs.get(id);
	return job ? publicJob(job) : null;
}

export function getAnswerResearchPath(id: string) {
	const job = jobs.get(id);
	return job?.phase === 'answered' && job.answer?.sources.length ? job.researchPath : undefined;
}

function publicJob(job: InternalJob): AnswerJobView {
	return {
		id: job.id,
		question: job.question,
		phase: job.phase,
		message: job.message,
		createdAt: job.createdAt,
		updatedAt: job.updatedAt,
		answer: job.phase === 'answered' ? job.answer : undefined
	};
}
