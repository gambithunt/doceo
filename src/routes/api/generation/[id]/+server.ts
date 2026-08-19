import { getGenerationJob } from '$lib/server/generation/jobs';
import { error, json } from '@sveltejs/kit';

export function GET({ params }) {
	const job = getGenerationJob(params.id);
	if (!job) error(404, 'Generation job not found.');
	return json(job);
}
