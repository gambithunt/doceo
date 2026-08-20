import { getLessonPlanJob } from '$lib/server/lesson-plans/jobs';
import { json } from '@sveltejs/kit';

export function GET({ params }) {
	const job = getLessonPlanJob(params.id);
	return job ? json(job) : json({ message: 'Lesson plan not found.' }, { status: 404 });
}
