import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { toV2Contract } from './contracts.ts';
import { contractFingerprint } from './preflight-validation.ts';

const runDirectory = resolve('experiments/generation-pipeline-v2/runs');

async function main() {
	const args = process.argv.slice(2);
	const flag = args.indexOf('--contract');
	if (flag < 0 || !args[flag + 1]) throw new Error('Choose --contract <id>.');
	const contract = toV2Contract(args[flag + 1]);
	const fingerprint = contractFingerprint(contract);
	const names = (await readdir(runDirectory))
		.filter((name) => name.endsWith(`-${contract.id}-preflight.json`))
		.sort()
		.reverse();

	for (const name of names) {
		const path = resolve(runDirectory, name);
		const artifact = JSON.parse(await readFile(path, 'utf8')) as {
			status?: string;
			contractFingerprint?: string;
			validation?: { passed?: boolean };
		};
		if (
			artifact.status === 'passed' &&
			artifact.validation?.passed === true &&
			artifact.contractFingerprint === fingerprint
		) {
			console.log(`CACHED: ${path}`);
			return;
		}
	}
	process.exitCode = 3;
}

await main();
