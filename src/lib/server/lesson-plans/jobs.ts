import { env } from '$env/dynamic/private';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { LessonPlanJobView, LessonPlanPhase } from '$lib/lesson-plans/types';
import { lessonBoundaryMessage, lessonFailureMessage } from '$lib/lesson-plans/messages';
import { getAnswerJob, getAnswerResearchPath } from '$lib/server/answers/jobs';
import { adaptReviewedPlanArtifact } from '$lib/visuals/reviewed-plan-adapter';

type InternalJob = LessonPlanJobView;

const jobs = new Map<string, InternalJob>();
const activeByAnswer = new Map<string, string>();
const terminal = new Set<LessonPlanPhase>(['ready', 'rejected', 'failed']);

function update(job: InternalJob, phase: LessonPlanPhase, message: string) {
	job.phase = phase;
	job.message = message;
	job.updatedAt = new Date().toISOString();
}

function environment() {
	return {
		...process.env,
		MODEL_API_KEY: env.MODEL_API_KEY,
		MODEL_BASE_URL: env.MODEL_BASE_URL,
		MODEL_ID: env.MODEL_ID,
		REVIEW_MODEL_ID: env.REVIEW_MODEL_ID,
		RESEARCH_AUDIT_MODEL_ID: env.RESEARCH_AUDIT_MODEL_ID,
		RESEARCH_NARROWING_MODEL_ID: env.RESEARCH_NARROWING_MODEL_ID,
		PLANNER_MODEL_ID: env.PLANNER_MODEL_ID,
		PLANNER_REVIEW_MODEL_ID: env.PLANNER_REVIEW_MODEL_ID
	};
}

function run(args: string[], onOutput?: (text: string) => void) {
	return new Promise<{ exitCode: number; output: string }>((resolveCommand, rejectCommand) => {
		const child = spawn(process.execPath, ['--import', 'tsx', ...args], {
			cwd: process.cwd(),
			env: environment(),
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

function pathFrom(output: string, labels: string[]) {
	for (const label of labels) {
		const path = output.match(new RegExp(`${label}: (.+)$`, 'm'))?.[1]?.trim();
		if (path) return path;
	}
	return null;
}

async function execute(job: InternalJob, researchPath: string) {
	try {
		if (!env.MODEL_API_KEY) throw new Error('The lesson maker is not connected right now.');
		update(job, 'auditing', 'Checking whether the evidence is strong enough for a lesson…');
		let activeResearchPath = researchPath;
		let audit = await run([
			'experiments/generation-pipeline-v2/audit-research.ts',
			'--research-file',
			activeResearchPath
		]);
		let auditPath = pathFrom(audit.output, ['AUDIT_PASSED', 'AUDIT_REJECTED']);
		if (!auditPath) throw new Error('The evidence check did not return a usable result.');
		if (audit.exitCode !== 0) {
			update(job, 'auditing', 'Tightening the answer to exactly what its sources support…');
			const narrowed = await run([
				'experiments/generation-pipeline-v2/narrow-research.ts',
				'--research-file',
				activeResearchPath,
				'--audit-file',
				auditPath
			]);
			const narrowedPath = pathFrom(narrowed.output, ['NARROWED_RESEARCH', 'NARROWING_INVALID']);
			if (!narrowedPath || narrowed.exitCode !== 0) {
				job.boundaryStage = 'evidence';
				update(job, 'rejected', lessonBoundaryMessage('evidence'));
				return;
			}
			activeResearchPath = narrowedPath;
			update(job, 'auditing', 'Checking the narrower answer one final time…');
			audit = await run([
				'experiments/generation-pipeline-v2/audit-research.ts',
				'--research-file',
				activeResearchPath
			]);
			auditPath = pathFrom(audit.output, ['AUDIT_PASSED', 'AUDIT_REJECTED']);
			if (!auditPath) throw new Error('The final evidence check did not return a usable result.');
			if (audit.exitCode !== 0) {
				job.boundaryStage = 'evidence';
				update(job, 'rejected', lessonBoundaryMessage('evidence'));
				return;
			}
		}

		update(job, 'planning', 'Turning the passed evidence into a visual explanation…');
		const planned = await run(
			[
				'experiments/generation-pipeline-v2/plan-from-research.ts',
				'--research-file',
				activeResearchPath,
				'--audit-file',
				auditPath
			],
			(text) => {
				if (text.includes('REVIEWING_PLAN')) {
					update(job, 'reviewing', 'Trying to find anything the visual plan gets wrong…');
				}
			}
		);
		const planPath = pathFrom(planned.output, [
			'REVIEWED-PROPOSAL',
			'REVIEW-REJECTED',
			'PLANNER-REJECTED',
			'INVALID'
		]);
		if (!planPath) throw new Error('The visual planner did not return a usable result.');
		const artifact = JSON.parse(await readFile(planPath, 'utf8')) as {
			status?: string;
			composition?: { rejectionReason?: string };
			plan?: {
				focusedIdea?: string;
				learnerOutcome?: string;
				visualFamily?: string;
				visualStates?: { label?: string }[];
			};
			review?: { summary?: string };
		};
		if (planned.exitCode !== 0 || artifact.status !== 'reviewed-proposal' || !artifact.plan) {
			job.boundaryStage = 'visual';
			update(job, 'rejected', lessonBoundaryMessage('visual'));
			return;
		}
		job.preview = {
			focusedIdea: artifact.plan.focusedIdea ?? job.question,
			learnerOutcome: artifact.plan.learnerOutcome ?? 'Understand the focused idea.',
			visualFamily: artifact.plan.visualFamily ?? 'visual',
			visualStates: (artifact.plan.visualStates ?? [])
				.map((state) => state.label)
				.filter((label): label is string => Boolean(label))
		};
		job.lesson = adaptReviewedPlanArtifact(artifact);
		update(job, 'ready', 'Your checked visual lesson is ready.');
	} catch {
		update(job, 'failed', lessonFailureMessage());
	} finally {
		activeByAnswer.delete(job.answerId);
	}
}

export function createLessonPlanJob(answerId: string) {
	const answer = getAnswerJob(answerId);
	const researchPath = getAnswerResearchPath(answerId);
	if (!answer || answer.phase !== 'answered') throw new Error('The sourced answer is not ready.');
	if (!researchPath)
		throw new Error('This response does not have enough sourced research for a lesson.');
	const activeId = activeByAnswer.get(answerId);
	if (activeId) {
		const active = jobs.get(activeId);
		if (active && !terminal.has(active.phase)) return publicJob(active);
	}
	const now = new Date().toISOString();
	const job: InternalJob = {
		id: randomUUID(),
		answerId,
		question: answer.question,
		phase: 'queued',
		message: 'Gathering the saved evidence…',
		createdAt: now,
		updatedAt: now
	};
	jobs.set(job.id, job);
	activeByAnswer.set(answerId, job.id);
	void execute(job, researchPath);
	return publicJob(job);
}

export function getLessonPlanJob(id: string) {
	const job = jobs.get(id);
	return job ? publicJob(job) : null;
}

function publicJob(job: InternalJob): LessonPlanJobView {
	return {
		id: job.id,
		answerId: job.answerId,
		question: job.question,
		phase: job.phase,
		message: job.message,
		createdAt: job.createdAt,
		updatedAt: job.updatedAt,
		preview: job.phase === 'ready' ? job.preview : undefined,
		lesson: job.phase === 'ready' ? job.lesson : undefined,
		boundaryStage: job.phase === 'rejected' ? job.boundaryStage : undefined
	};
}
