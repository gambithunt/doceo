import { spawn } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { basename, resolve } from 'node:path';
import { findReusableResearchPath } from '../../src/lib/server/answers/research-cache.ts';

export const evaluationQuestions = [
	{ id: 'fact-person', kind: 'fact', question: 'Who discovered penicillin?' },
	{ id: 'timeline-date', kind: 'timeline', question: 'When did humans land on the Moon?' },
	{ id: 'location', kind: 'fact', question: 'Where do auroras occur?' },
	{ id: 'quantity', kind: 'fact', question: 'How many bones are in an adult human body?' },
	{ id: 'mechanism-biology', kind: 'mechanism', question: 'What is photosynthesis?' },
	{ id: 'mechanism-weather', kind: 'mechanism', question: 'How does rain form?' },
	{ id: 'uncertainty', kind: 'uncertainty', question: 'What came before the Big Bang?' }
] as const;

type Measurement = {
	wallClockMs?: number;
	estimatedModelTokenCostUsd?: number;
	planning?: Measurement;
	review?: Measurement | null;
};

type Artifact = {
	status?: string;
	question?: string;
	questionFingerprint?: string;
	researchPath?: string;
	auditPath?: string;
	parentResearchPath?: string;
	rejectedAuditPath?: string;
	narrowingVersion?: string;
	research?: { questionType?: string };
	answer?: { text?: string; sources?: unknown[] };
	audit?: { decision?: string; summary?: string };
	plan?: { visualFamily?: string; visualStates?: unknown[]; optionalCheck?: unknown };
	validation?: { errors?: unknown[]; issues?: { code?: string; message?: string }[] };
	review?: { decision?: string; findings?: { severity?: string }[] } | null;
	measurement?: Measurement;
};

type CommandResult = { exitCode: number; output: string; wallClockMs: number };

const outputDirectory = resolve('experiments/generation-pipeline-v2/runs');

function commandEnvironment() {
	return {
		...process.env,
		MODEL_API_KEY: process.env.MODEL_API_KEY,
		MODEL_BASE_URL: process.env.MODEL_BASE_URL,
		MODEL_ID: process.env.MODEL_ID,
		REVIEW_MODEL_ID: process.env.REVIEW_MODEL_ID,
		RESEARCH_MODEL_ID: process.env.RESEARCH_MODEL_ID,
		RESEARCH_AUDIT_MODEL_ID: process.env.RESEARCH_AUDIT_MODEL_ID,
		PLANNER_MODEL_ID: process.env.PLANNER_MODEL_ID,
		PLANNER_REVIEW_MODEL_ID: process.env.PLANNER_REVIEW_MODEL_ID
	};
}

async function run(args: string[]): Promise<CommandResult> {
	const started = performance.now();
	let output = '';
	const exitCode = await new Promise<number>((resolveCommand, rejectCommand) => {
		const child = spawn(process.execPath, ['--import', 'tsx', ...args], {
			cwd: process.cwd(),
			env: commandEnvironment(),
			stdio: ['ignore', 'pipe', 'pipe']
		});
		const receive = (chunk: Buffer) => {
			const text = chunk.toString();
			output += text;
			process.stdout.write(text);
		};
		child.stdout.on('data', receive);
		child.stderr.on('data', receive);
		child.once('error', rejectCommand);
		child.once('close', (code) => resolveCommand(code ?? 1));
	});
	return { exitCode, output, wallClockMs: Math.round(performance.now() - started) };
}

function pathFrom(output: string, labels: string[]) {
	for (const label of labels) {
		const path = output.match(new RegExp(`^${label}: (.+)$`, 'm'))?.[1]?.trim();
		if (path) return resolve(path);
	}
	return null;
}

async function loadArtifact(path: string) {
	return JSON.parse(await readFile(path, 'utf8')) as Artifact;
}

async function matchingArtifact(
	predicate: (artifact: Artifact) => boolean,
	filenamePattern: RegExp
) {
	let names: string[];
	try {
		names = await readdir(outputDirectory);
	} catch {
		return null;
	}
	for (const name of names
		.filter((item) => filenamePattern.test(item))
		.sort()
		.reverse()) {
		const path = resolve(outputDirectory, name);
		try {
			if (predicate(await loadArtifact(path))) return path;
		} catch {
			// Ignore incomplete local run artifacts.
		}
	}
	return null;
}

async function reusableAuditPath(researchPath: string) {
	return matchingArtifact(
		(artifact) =>
			['passed', 'rejected'].includes(artifact.status ?? '') &&
			resolve(artifact.researchPath ?? '') === researchPath,
		/-question-audit-[a-f0-9]{10}\.json$/
	);
}

async function reusableNarrowingPath(researchPath: string, auditPath: string) {
	return matchingArtifact(
		(artifact) =>
			artifact.status === 'answered' &&
			artifact.narrowingVersion === 'claim-ledger-v4' &&
			resolve(artifact.parentResearchPath ?? '') === researchPath &&
			resolve(artifact.rejectedAuditPath ?? '') === auditPath,
		/-question-narrowed-research-[a-f0-9]{10}\.json$/
	);
}

async function reusablePlanPath(researchPath: string, auditPath: string) {
	return matchingArtifact(
		(artifact) =>
			artifact.status === 'reviewed-proposal' &&
			resolve(artifact.researchPath ?? '') === researchPath &&
			resolve(artifact.auditPath ?? '') === auditPath,
		/-question-research-plan-[a-f0-9]{10}\.json$/
	);
}

export function modelCost(measurement?: Measurement): number {
	if (!measurement) return 0;
	return (
		(measurement.estimatedModelTokenCostUsd ?? 0) +
		modelCost(measurement.planning) +
		modelCost(measurement.review ?? undefined)
	);
}

export function summarizeResult(options: {
	id: string;
	kind: string;
	question: string;
	research: Artifact;
	researchPath: string;
	researchCacheHit: boolean;
	researchAttempts?: { path: string; artifact: Artifact }[];
	narrowing?: { path: string; artifact: Artifact };
	narrowingCacheHit?: boolean;
	audit?: Artifact;
	auditPath?: string;
	auditCacheHit?: boolean;
	auditAttempts?: { path: string; artifact: Artifact; cached?: boolean }[];
	plan?: Artifact;
	planPath?: string;
	planCacheHit?: boolean;
	observedWallClockMs: number;
}) {
	const researchAttempts = options.researchAttempts ?? [
		{ path: options.researchPath, artifact: options.research }
	];
	const auditAttempts =
		options.auditAttempts ??
		(options.audit && options.auditPath
			? [{ path: options.auditPath, artifact: options.audit, cached: options.auditCacheHit }]
			: []);
	const findings = options.plan?.review?.findings ?? [];
	const validationIssues = (artifact?: Artifact) => [
		...(artifact?.validation?.errors ?? []),
		...(artifact?.validation?.issues ?? [])
	];
	const issueCode = (issue: unknown) => {
		if (typeof issue === 'object' && issue !== null) {
			const value = issue as { code?: unknown; message?: unknown };
			if (typeof value.code === 'string') return value.code;
			if (typeof value.message === 'string') return value.message;
		}
		return 'local_validation';
	};
	const majorFindings = findings.filter((finding) =>
		['critical', 'major'].includes(finding.severity ?? '')
	).length;
	const ready = options.plan?.status === 'reviewed-proposal';
	const narrowingInvalid = Boolean(
		options.narrowing && options.narrowing.artifact.status !== 'answered'
	);
	const artifactModelCostUsd =
		researchAttempts.reduce((sum, attempt) => sum + modelCost(attempt.artifact.measurement), 0) +
		modelCost(options.narrowing?.artifact.measurement) +
		auditAttempts.reduce((sum, attempt) => sum + modelCost(attempt.artifact.measurement), 0) +
		modelCost(options.plan?.measurement);
	const incrementalModelCostUsd =
		(options.researchCacheHit
			? 0
			: researchAttempts.reduce(
					(sum, attempt) => sum + modelCost(attempt.artifact.measurement),
					0
				)) +
		(options.narrowingCacheHit ? 0 : modelCost(options.narrowing?.artifact.measurement)) +
		auditAttempts.reduce(
			(sum, attempt) => sum + (attempt.cached ? 0 : modelCost(attempt.artifact.measurement)),
			0
		) +
		(options.planCacheHit ? 0 : modelCost(options.plan?.measurement));
	const terminalStage = ready
		? 'ready'
		: options.research.status !== 'answered'
			? 'research'
			: narrowingInvalid
				? 'narrowing'
				: options.audit?.status !== 'passed'
					? 'audit'
					: 'plan';
	return {
		id: options.id,
		kind: options.kind,
		question: options.question,
		outcome: ready ? 'ready' : 'stopped',
		terminalStage,
		statuses: {
			research: options.research.status ?? 'missing',
			narrowing: options.narrowing?.artifact.status ?? 'not-run',
			audit: options.audit?.status ?? 'not-run',
			plan: options.plan?.status ?? 'not-run'
		},
		cache: {
			research: options.researchCacheHit,
			narrowing: options.narrowingCacheHit ?? false,
			audit: options.auditCacheHit ?? false,
			plan: options.planCacheHit ?? false
		},
		answer: {
			sourceCount: options.research.answer?.sources?.length ?? 0,
			questionType: options.research.research?.questionType ?? 'unknown'
		},
		lesson: ready
			? {
					visualFamily: options.plan?.plan?.visualFamily ?? 'unknown',
					stateCount: options.plan?.plan?.visualStates?.length ?? 0,
					hasOptionalCheck: Boolean(options.plan?.plan?.optionalCheck)
				}
			: null,
		quality: {
			majorReviewFindings: majorFindings,
			finalLocalValidationErrors:
				validationIssues(options.research).length +
				validationIssues(options.audit).length +
				validationIssues(options.plan).length,
			attemptLocalValidationErrors:
				researchAttempts.reduce(
					(sum, attempt) => sum + validationIssues(attempt.artifact).length,
					0
				) +
				validationIssues(options.narrowing?.artifact).length +
				auditAttempts.reduce((sum, attempt) => sum + validationIssues(attempt.artifact).length, 0) +
				validationIssues(options.plan).length,
			attemptIssueCodes: [
				...researchAttempts.flatMap((attempt) => validationIssues(attempt.artifact).map(issueCode)),
				...validationIssues(options.narrowing?.artifact).map(issueCode),
				...auditAttempts.flatMap((attempt) => validationIssues(attempt.artifact).map(issueCode)),
				...validationIssues(options.plan).map(issueCode)
			],
			stopReasons: [
				...validationIssues(options.research).map(issueCode),
				...validationIssues(options.audit).map(issueCode),
				...validationIssues(options.plan).map(issueCode),
				...findings
					.filter((finding) => ['critical', 'major'].includes(finding.severity ?? ''))
					.map((finding) => `review_${finding.severity}`),
				...(options.narrowing?.artifact.status === 'invalid' ? ['narrowing_invalid'] : []),
				...(options.audit?.status === 'rejected' && !narrowingInvalid ? ['audit_rejected'] : [])
			]
		},
		measurement: {
			observedWallClockMs: options.observedWallClockMs,
			artifactWallClockMs:
				researchAttempts.reduce(
					(sum, attempt) => sum + (attempt.artifact.measurement?.wallClockMs ?? 0),
					0
				) +
				(options.narrowing?.artifact.measurement?.wallClockMs ?? 0) +
				auditAttempts.reduce(
					(sum, attempt) => sum + (attempt.artifact.measurement?.wallClockMs ?? 0),
					0
				) +
				(options.plan?.measurement?.wallClockMs ?? 0),
			artifactModelTokenCostUsd: Number(artifactModelCostUsd.toFixed(6)),
			incrementalModelTokenCostUsd: Number(incrementalModelCostUsd.toFixed(6))
		},
		artifacts: {
			research: basename(options.researchPath),
			researchAttempts: researchAttempts.map((attempt) => basename(attempt.path)),
			narrowing: options.narrowing ? basename(options.narrowing.path) : null,
			audit: options.auditPath ? basename(options.auditPath) : null,
			auditAttempts: auditAttempts.map((attempt) => basename(attempt.path)),
			plan: options.planPath ? basename(options.planPath) : null
		}
	};
}

async function evaluateOne(testCase: (typeof evaluationQuestions)[number], fresh: boolean) {
	const started = performance.now();
	console.log(`\n=== ${testCase.id}: ${testCase.question} ===`);

	let researchPath = fresh ? null : await findReusableResearchPath(testCase.question);
	const researchCacheHit = Boolean(researchPath);
	const researchAttempts: { path: string; artifact: Artifact }[] = [];
	if (researchPath)
		researchAttempts.push({ path: researchPath, artifact: await loadArtifact(researchPath) });
	for (let attempt = researchPath ? 2 : 0; attempt < 2; attempt += 1) {
		const researched = await run([
			'experiments/generation-pipeline-v2/research-question.ts',
			'--question',
			testCase.question,
			'--answer-only'
		]);
		const attemptPath = pathFrom(researched.output, ['ANSWER_READY']);
		if (!attemptPath) continue;
		const attemptArtifact = await loadArtifact(attemptPath);
		researchAttempts.push({ path: attemptPath, artifact: attemptArtifact });
		researchPath = attemptPath;
		if (attemptArtifact.status === 'answered') break;
	}
	if (!researchPath) throw new Error(`Research returned no artifact for ${testCase.id}.`);
	let research = researchAttempts.at(-1)?.artifact ?? (await loadArtifact(researchPath));
	if (research.status !== 'answered') {
		return summarizeResult({
			...testCase,
			research,
			researchPath,
			researchCacheHit,
			researchAttempts,
			observedWallClockMs: Math.round(performance.now() - started)
		});
	}

	let auditPath = fresh ? null : await reusableAuditPath(researchPath);
	const auditCacheHit = Boolean(auditPath);
	const auditAttempts: { path: string; artifact: Artifact; cached?: boolean }[] = [];
	if (!auditPath) {
		const audited = await run([
			'experiments/generation-pipeline-v2/audit-research.ts',
			'--research-file',
			researchPath
		]);
		auditPath = pathFrom(audited.output, ['AUDIT_PASSED', 'AUDIT_REJECTED']);
	}
	let audit = auditPath ? await loadArtifact(auditPath) : undefined;
	if (auditPath && audit)
		auditAttempts.push({ path: auditPath, artifact: audit, cached: auditCacheHit });
	let narrowing: { path: string; artifact: Artifact } | undefined;
	let narrowingCacheHit = false;
	if (auditPath && audit?.status === 'rejected') {
		let narrowedPath = fresh ? null : await reusableNarrowingPath(researchPath, auditPath);
		narrowingCacheHit = Boolean(narrowedPath);
		let narrowingExitCode = 0;
		if (!narrowedPath) {
			const narrowed = await run([
				'experiments/generation-pipeline-v2/narrow-research.ts',
				'--research-file',
				researchPath,
				'--audit-file',
				auditPath
			]);
			narrowingExitCode = narrowed.exitCode;
			narrowedPath = pathFrom(narrowed.output, ['NARROWED_RESEARCH', 'NARROWING_INVALID']);
		}
		if (narrowedPath) {
			const narrowedArtifact = await loadArtifact(narrowedPath);
			narrowing = { path: narrowedPath, artifact: narrowedArtifact };
			if (narrowingExitCode === 0 && narrowedArtifact.status === 'answered') {
				researchPath = narrowedPath;
				research = narrowedArtifact;
				const cachedReauditPath = fresh ? null : await reusableAuditPath(researchPath);
				if (cachedReauditPath) {
					auditPath = cachedReauditPath;
				} else {
					const reaudited = await run([
						'experiments/generation-pipeline-v2/audit-research.ts',
						'--research-file',
						researchPath
					]);
					auditPath = pathFrom(reaudited.output, ['AUDIT_PASSED', 'AUDIT_REJECTED']);
				}
				audit = auditPath ? await loadArtifact(auditPath) : undefined;
				if (auditPath && audit)
					auditAttempts.push({
						path: auditPath,
						artifact: audit,
						cached: Boolean(cachedReauditPath)
					});
			}
		}
	}
	if (!auditPath || audit?.status !== 'passed') {
		return summarizeResult({
			...testCase,
			research,
			researchPath,
			researchCacheHit,
			researchAttempts,
			narrowing,
			narrowingCacheHit,
			audit,
			auditPath: auditPath ?? undefined,
			auditCacheHit,
			auditAttempts,
			observedWallClockMs: Math.round(performance.now() - started)
		});
	}

	let planPath = fresh ? null : await reusablePlanPath(researchPath, auditPath);
	const planCacheHit = Boolean(planPath);
	if (!planPath) {
		const planned = await run([
			'experiments/generation-pipeline-v2/plan-from-research.ts',
			'--research-file',
			researchPath,
			'--audit-file',
			auditPath
		]);
		planPath = pathFrom(planned.output, [
			'REVIEWED-PROPOSAL',
			'REVIEW-REJECTED',
			'PLANNER-REJECTED',
			'INVALID'
		]);
	}
	const plan = planPath ? await loadArtifact(planPath) : undefined;
	return summarizeResult({
		...testCase,
		research,
		researchPath,
		researchCacheHit,
		researchAttempts,
		narrowing,
		narrowingCacheHit,
		audit,
		auditPath,
		auditCacheHit,
		auditAttempts,
		plan,
		planPath: planPath ?? undefined,
		planCacheHit,
		observedWallClockMs: Math.round(performance.now() - started)
	});
}

async function main() {
	const args = process.argv.slice(2);
	if (args.includes('--list')) {
		for (const item of evaluationQuestions) console.log(`${item.id}\t${item.question}`);
		return;
	}
	if (!process.env.MODEL_API_KEY) throw new Error('MODEL_API_KEY is required in .env.local.');
	const limitIndex = args.indexOf('--limit');
	const requestedLimit = limitIndex >= 0 ? Number.parseInt(args[limitIndex + 1] ?? '', 10) : 3;
	const limit = Number.isFinite(requestedLimit)
		? Math.max(1, Math.min(evaluationQuestions.length, requestedLimit))
		: 3;
	const idsIndex = args.indexOf('--ids');
	const requestedIds =
		idsIndex >= 0
			? new Set(
					(args[idsIndex + 1] ?? '')
						.split(',')
						.map((id) => id.trim())
						.filter(Boolean)
				)
			: null;
	const selected = requestedIds
		? evaluationQuestions.filter((item) => requestedIds.has(item.id))
		: evaluationQuestions.slice(0, limit);
	if (!selected.length) throw new Error('No evaluation questions matched --ids.');
	const started = performance.now();
	const results = [];
	for (const testCase of selected)
		results.push(await evaluateOne(testCase, args.includes('--fresh')));
	const report = {
		createdAt: new Date().toISOString(),
		fresh: args.includes('--fresh'),
		summary: {
			ready: results.filter((result) => result.outcome === 'ready').length,
			total: results.length,
			yield: results.length
				? Number(
						(
							results.filter((result) => result.outcome === 'ready').length / results.length
						).toFixed(3)
					)
				: 0,
			observedWallClockMs: Math.round(performance.now() - started),
			incrementalModelTokenCostUsd: Number(
				results
					.reduce((sum, result) => sum + result.measurement.incrementalModelTokenCostUsd, 0)
					.toFixed(6)
			),
			artifactModelTokenCostUsd: Number(
				results
					.reduce((sum, result) => sum + result.measurement.artifactModelTokenCostUsd, 0)
					.toFixed(6)
			)
		},
		results
	};
	await mkdir(outputDirectory, { recursive: true });
	const timestamp = new Date().toISOString().replaceAll(':', '-');
	const outputPath = resolve(outputDirectory, `${timestamp}-question-evaluation.json`);
	await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
	console.log(`\nEVALUATION: ${outputPath}`);
	console.log(
		`${report.summary.ready}/${report.summary.total} ready in ${report.summary.observedWallClockMs}ms; incremental model token cost $${report.summary.incrementalModelTokenCostUsd}`
	);
	if (report.summary.ready !== report.summary.total) process.exitCode = 2;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
