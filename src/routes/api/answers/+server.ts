import { createAnswerJob } from '$lib/server/answers/jobs';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
	let body: { question?: unknown };
	try {
		body = (await request.json()) as { question?: unknown };
	} catch {
		return json({ message: 'A JSON request body is required.' }, { status: 400 });
	}
	if (typeof body.question !== 'string') {
		return json({ message: 'question is required.' }, { status: 400 });
	}
	try {
		return json(createAnswerJob(body.question), { status: 202 });
	} catch (error) {
		return json(
			{ message: error instanceof Error ? error.message : 'Could not research this question.' },
			{ status: 400 }
		);
	}
}
