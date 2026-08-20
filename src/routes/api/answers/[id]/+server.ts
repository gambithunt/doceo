import { getAnswerJob } from '$lib/server/answers/jobs';
import { json } from '@sveltejs/kit';

export function GET({ params }) {
	const job = getAnswerJob(params.id);
	return job ? json(job) : json({ message: 'Answer not found.' }, { status: 404 });
}
