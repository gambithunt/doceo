import { getApprovedLesson } from '$lib/visuals/approved-lessons';
import { error } from '@sveltejs/kit';

export function load({ params, url }) {
	const lesson = getApprovedLesson(params.id);
	if (!lesson) error(404, 'Lesson not found');
	return {
		lesson,
		requestedVersion: url.searchParams.get('version')
	};
}
