import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readdir, writeFile, readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { authoredBlackHoleControl } from './authored-control.ts';
import type { BlindLesson } from './blind-types.ts';

type SuccessfulRun = {
	status: 'succeeded';
	provider: string;
	model: string;
	contract: {
		id: string;
		sourceBasis: Array<{ title: string; authority: string; url: string }>;
	};
	outline: {
		title: string;
		focusedIdea: string;
		learnerOutcome: string;
	};
	scenes: BlindLesson['scenes'];
	check: BlindLesson['check'];
};

type Entry = {
	origin: 'generated' | 'authored-control';
	sourceId: string;
	sourceFile: string | null;
	lesson: BlindLesson;
};

const expectedGeneratedCount = 12;
const runDirectory = resolve('experiments/generation-spike/runs');
const blindDirectory = resolve('experiments/generation-spike/blind');
const packetDirectory = resolve(blindDirectory, 'packets');

function seededRandom(seed: string) {
	let state = createHash('sha256').update(seed).digest().readUInt32LE(0);
	return () => {
		state += 0x6d2b79f5;
		let value = state;
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
	};
}

function shuffle<T>(values: T[], seed: string) {
	const result = [...values];
	const random = seededRandom(seed);
	for (let index = result.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(random() * (index + 1));
		[result[index], result[swapIndex]] = [result[swapIndex], result[index]];
	}
	return result;
}

function asBlindLesson(run: SuccessfulRun): BlindLesson {
	return {
		title: run.outline.title,
		focusedIdea: run.outline.focusedIdea,
		learnerOutcome: run.outline.learnerOutcome,
		lessonDurationSeconds: run.scenes.reduce((total, scene) => total + scene.durationSeconds, 0),
		sourceBasis: run.contract.sourceBasis.map(({ title, authority, url }) => ({
			title,
			authority,
			url
		})),
		scenes: run.scenes,
		check: run.check
	};
}

function renderPacket(blindId: string, lesson: BlindLesson) {
	const scenes = lesson.scenes
		.map(
			(scene, index) => `## Scene ${index + 1}: ${scene.title}

- Role: ${scene.role}
- Duration: ${scene.durationSeconds} seconds

### Narration

${scene.narration}

### Captions

${scene.captions.map((caption) => `- ${caption}`).join('\n')}

### Visual direction

${scene.visualDirection}

### Why the motion matters

${scene.motionRationale}

### Source support

${scene.sourceSupport.map((source) => `- ${source}`).join('\n')}`
		)
		.join('\n\n');

	return `# ${blindId}: ${lesson.title}

## Lesson brief

- Focused idea: ${lesson.focusedIdea}
- Learner outcome: ${lesson.learnerOutcome}
- Total lesson duration: ${lesson.lessonDurationSeconds} seconds

## Source basis

${lesson.sourceBasis.map((source) => `- ${source.authority}, [${source.title}](${source.url})`).join('\n')}

${scenes}

## Optional check

- Invitation: ${lesson.check.invitation}
- Interaction: ${lesson.check.interactionType}
- Action: ${lesson.check.action}
- Prompt: ${lesson.check.prompt}

### Choices

${lesson.check.choices.map((choice) => `- ${choice.id}: ${choice.label}`).join('\n') || '- No fixed choices.'}

### Evidence and feedback

- Supported response IDs: ${lesson.check.supportedResponseIds.join(', ') || 'None'}
- Success evidence: ${lesson.check.successEvidence}
- Misconception evidence: ${lesson.check.misconceptionEvidence}
- Feedback when supported: ${lesson.check.feedbackWhenSupported}
- Feedback when not yet supported: ${lesson.check.feedbackWhenNotYet}
`;
}

function renderGradingSheet(blindIds: string[]) {
	const gates = [
		'Teaches one coherent idea',
		'First useful content begins without a conventional loading screen',
		'Orientation choices materially affect the result',
		'Important visuals explain rather than decorate',
		'Claims have an appropriate source basis',
		'Narrative ending stands on its own',
		'Optional check is optional and concept-matched',
		'Evidence claims are narrower than the observed action',
		'Works with captions, muted audio, reduced motion, and fallback media',
		'Replay from history can be stable',
		'Difficult to reproduce with one good general-chat prompt'
	];

	const forms = blindIds
		.map(
			(blindId) => `## ${blindId}

${gates.map((gate, index) => `${index + 1}. ${gate}: **Pass / Fail** — Notes:`).join('\n')}

- Factual errors and severity:
- Coherent idea or drift:
- Explanatory versus decorative visuals:
- Check-to-concept fit:
- Human-authored guess: **Yes / No**
- Overall notes:`
		)
		.join('\n\n');

	return `# Doceo blind lesson grading sheet

Grade every packet before opening \`answer-key.json\`. Assess the material as
received: do not rewrite, rescue, or compare prompts while grading. Complete the
human-authored guess for every packet.

${forms}
`;
}

async function main() {
	const files = (await readdir(runDirectory)).filter((file) => file.endsWith('.json'));
	const latestByContract = new Map<string, { file: string; run: SuccessfulRun }>();

	for (const file of files.sort()) {
		const candidate = JSON.parse(
			await readFile(resolve(runDirectory, file), 'utf8')
		) as Partial<SuccessfulRun>;
		if (
			candidate.status !== 'succeeded' ||
			candidate.provider !== 'openai' ||
			candidate.model !== 'gpt-5.4-mini' ||
			!candidate.contract?.id
		) {
			continue;
		}
		latestByContract.set(candidate.contract.id, {
			file,
			run: candidate as SuccessfulRun
		});
	}

	if (latestByContract.size !== expectedGeneratedCount) {
		throw new Error(
			`Expected ${expectedGeneratedCount} successful GPT-5.4 mini lessons, found ${latestByContract.size}.`
		);
	}

	const generated: Entry[] = [...latestByContract.entries()].map(([sourceId, value]) => ({
		origin: 'generated',
		sourceId,
		sourceFile: value.file,
		lesson: asBlindLesson(value.run)
	}));
	const control: Entry = {
		origin: 'authored-control',
		sourceId: 'black-hole-route-a',
		sourceFile: null,
		lesson: authoredBlackHoleControl
	};
	const seed = process.env.BLIND_SET_SEED ?? randomBytes(16).toString('hex');
	const entries = shuffle([...generated, control], seed);

	await mkdir(packetDirectory, { recursive: true });
	const key: Array<{
		blindId: string;
		origin: Entry['origin'];
		sourceId: string;
		sourceFile: string | null;
	}> = [];

	for (const [index, entry] of entries.entries()) {
		const blindId = `Lesson ${String(index + 1).padStart(2, '0')}`;
		const packetPath = resolve(packetDirectory, `${blindId.toLowerCase().replace(' ', '-')}.md`);
		await writeFile(packetPath, renderPacket(blindId, entry.lesson), 'utf8');
		key.push({
			blindId,
			origin: entry.origin,
			sourceId: entry.sourceId,
			sourceFile: entry.sourceFile ? basename(entry.sourceFile) : null
		});
	}

	await writeFile(
		resolve(blindDirectory, 'grading-sheet.md'),
		renderGradingSheet(key.map((entry) => entry.blindId)),
		'utf8'
	);
	await writeFile(
		resolve(blindDirectory, 'answer-key.json'),
		`${JSON.stringify({ createdAt: new Date().toISOString(), seed, entries: key }, null, 2)}\n`,
		'utf8'
	);

	console.log(`Prepared ${entries.length} blind packets in ${packetDirectory}.`);
	console.log(`Grading sheet: ${resolve(blindDirectory, 'grading-sheet.md')}`);
	console.log('Answer key created separately. Do not open it before grading is complete.');
}

await main();
