import { createGenerationJob } from '$lib/server/generation/jobs';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
	let body: { contractId?: unknown };
	try {
		body = (await request.json()) as { contractId?: unknown };
	} catch {
		return json({ message: 'A JSON request body is required.' }, { status: 400 });
	}
	if (typeof body.contractId !== 'string') {
		return json({ message: 'contractId is required.' }, { status: 400 });
	}
	try {
		return json(createGenerationJob(body.contractId), { status: 202 });
	} catch (error) {
		return json(
			{ message: error instanceof Error ? error.message : 'Could not create generation job.' },
			{ status: 400 }
		);
	}
}
