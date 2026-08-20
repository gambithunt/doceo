import { createLessonPlanJob } from '$lib/server/lesson-plans/jobs';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
	let body: { answerId?: unknown };
	try {
		body = (await request.json()) as { answerId?: unknown };
	} catch {
		return json({ message: 'A JSON request body is required.' }, { status: 400 });
	}
	if (typeof body.answerId !== 'string') {
		return json({ message: 'answerId is required.' }, { status: 400 });
	}
	try {
		return json(createLessonPlanJob(body.answerId), { status: 202 });
	} catch (error) {
		return json(
			{ message: error instanceof Error ? error.message : 'Could not start the lesson plan.' },
			{ status: 400 }
		);
	}
}
