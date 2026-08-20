import { getApprovedLesson } from '$lib/visuals/approved-lessons';
import { error } from '@sveltejs/kit';

export function load({ params, url }) {
	const lesson = getApprovedLesson(params.id);
	const requestedVersion = url.searchParams.get('version');
	if (!lesson && !requestedVersion) error(404, 'Lesson not found');
	return {
		id: params.id,
		lesson,
		requestedVersion
	};
}
