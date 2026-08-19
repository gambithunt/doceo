import { env } from '$env/dynamic/private';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
	generatableContractIds,
	type GeneratableContractId,
	type GenerationJobView,
	type GenerationPhase
} from '$lib/generation/types';
import { getApprovedArtifact } from '$lib/visuals/approved-artifacts/library';

type InternalJob = GenerationJobView & { artifactPath?: string };
type CommandResult = { exitCode: number; output: string };

const jobs = new Map<string, InternalJob>();
const activeByContract = new Map<GeneratableContractId, string>();
const terminalPhases = new Set<GenerationPhase>(['approved', 'rejected', 'failed']);

function update(job: InternalJob, phase: GenerationPhase, message: string) {
	job.phase = phase;
	job.message = message;
	job.updatedAt = new Date().toISOString();
}

function commandEnvironment() {
	return {
		...process.env,
		MODEL_API_KEY: env.MODEL_API_KEY,
		MODEL_BASE_URL: env.MODEL_BASE_URL,
		MODEL_ID: env.MODEL_ID,
		REVIEW_MODEL_ID: env.REVIEW_MODEL_ID,
		PREFLIGHT_MODEL_ID: env.PREFLIGHT_MODEL_ID
	};
}

function runPipelineCommand(args: string[], onOutput?: (output: string) => void) {
	return new Promise<CommandResult>((resolveCommand, rejectCommand) => {
		const child = spawn(process.execPath, ['--import', 'tsx', ...args], {
			cwd: process.cwd(),
			env: commandEnvironment(),
			stdio: ['ignore', 'pipe', 'pipe']
		});
		let output = '';
		const receive = (chunk: Buffer) => {
			const text = chunk.toString();
			output += text;
			onOutput?.(text);
		};
		child.stdout.on('data', receive);
		child.stderr.on('data', receive);
		child.once('error', rejectCommand);
		child.once('close', (code) => resolveCommand({ exitCode: code ?? 1, output }));
	});
}

function artifactPathFrom(output: string, labels: string[]) {
	for (const label of labels) {
		const match = output.match(new RegExp(`${label}: (.+)$`, 'm'));
		if (match?.[1]) return match[1].trim();
	}
	return null;
}

async function execute(job: InternalJob) {
	try {
		const libraryArtifact = getApprovedArtifact(job.contractId);
		if (libraryArtifact) {
			job.artifact = libraryArtifact;
			update(job, 'approved', 'An approved lesson was already waiting for you.');
			return;
		}
		if (!env.MODEL_API_KEY) throw new Error('The server is missing MODEL_API_KEY.');
		update(job, 'preflight', 'Checking for an approved evidence boundary…');
		const cachedPreflight = await runPipelineCommand([
			'experiments/generation-pipeline-v2/resolve-preflight.ts',
			'--contract',
			job.contractId
		]);
		let preflightPath = artifactPathFrom(cachedPreflight.output, ['CACHED']);
		if (!preflightPath) {
			const preflight = await runPipelineCommand([
				'experiments/generation-pipeline-v2/preflight.ts',
				'--contract',
				job.contractId
			]);
			preflightPath = artifactPathFrom(preflight.output, ['PASSED', 'REJECTED']);
			if (!preflightPath || preflight.exitCode !== 0) {
				update(job, 'rejected', 'The source contract did not pass its evidence check.');
				return;
			}
		}

		update(job, 'drafting', 'Building a small visual journey…');
		const candidate = await runPipelineCommand(
			[
				'experiments/generation-pipeline-v2/run-compact.ts',
				'--contract',
				job.contractId,
				'--preflight-file',
				preflightPath
			],
			(output) => {
				if (output.includes('Reviewing compact')) {
					update(job, 'reviewing', 'Trying to find anything misleading before you see it…');
				}
			}
		);
		const artifactPath = artifactPathFrom(candidate.output, ['APPROVED', 'REJECTED']);
		if (!artifactPath) throw new Error('The pipeline finished without a candidate artifact.');
		job.artifactPath = artifactPath;
		const artifact = JSON.parse(await readFile(resolve(artifactPath), 'utf8')) as Record<
			string,
			unknown
		>;
		if (candidate.exitCode === 0 && artifact.status === 'approved') {
			job.artifact = {
				status: artifact.status,
				createdAt: artifact.createdAt,
				contract: artifact.contract,
				draft: artifact.draft,
				review: artifact.review
			};
			update(job, 'approved', 'Approved. Opening your lesson…');
		} else {
			const fallback = getApprovedArtifact(job.contractId);
			if (fallback) {
				job.artifact = fallback;
				update(job, 'approved', 'The new version needed work, so we opened the approved lesson.');
			} else {
				update(job, 'rejected', 'This candidate did not pass review, so it will not be shown.');
			}
		}
	} catch (error) {
		update(job, 'failed', error instanceof Error ? error.message : 'Generation failed.');
	} finally {
		activeByContract.delete(job.contractId);
	}
}

export function createGenerationJob(contractId: string) {
	if (!generatableContractIds.includes(contractId as GeneratableContractId)) {
		throw new Error('Unsupported generation contract.');
	}
	const supportedId = contractId as GeneratableContractId;
	const activeId = activeByContract.get(supportedId);
	if (activeId) {
		const active = jobs.get(activeId);
		if (active && !terminalPhases.has(active.phase)) return publicJob(active);
	}
	const now = new Date().toISOString();
	const job: InternalJob = {
		id: randomUUID(),
		contractId: supportedId,
		phase: 'queued',
		message: 'Gathering the pieces…',
		createdAt: now,
		updatedAt: now
	};
	jobs.set(job.id, job);
	activeByContract.set(supportedId, job.id);
	void execute(job);
	return publicJob(job);
}

export function getGenerationJob(id: string) {
	const job = jobs.get(id);
	return job ? publicJob(job) : null;
}

function publicJob(job: InternalJob): GenerationJobView {
	return {
		id: job.id,
		contractId: job.contractId,
		phase: job.phase,
		message: job.message,
		createdAt: job.createdAt,
		updatedAt: job.updatedAt,
		artifact: job.phase === 'approved' ? job.artifact : undefined
	};
}
