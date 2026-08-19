import type { VisualLessonFixture } from './types';

export const approvedVisualHistoryKey = 'doceo:approved-visual-history:v1';

export type VisualHistoryEntry = {
	lesson: VisualLessonFixture;
	completedAt: string;
	checkOutcome?: {
		responseId: string;
		supported: boolean;
		answeredAt: string;
	};
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function parseHistory(raw: string | null): VisualHistoryEntry[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(entry): entry is VisualHistoryEntry =>
				typeof entry === 'object' &&
				entry !== null &&
				typeof entry.completedAt === 'string' &&
				typeof entry.lesson === 'object' &&
				entry.lesson !== null &&
				typeof entry.lesson.id === 'string' &&
				typeof entry.lesson.artifactVersion === 'string'
		);
	} catch {
		return [];
	}
}

export function loadVisualHistory(storage: StorageLike) {
	return parseHistory(storage.getItem(approvedVisualHistoryKey)).sort((a, b) =>
		b.completedAt.localeCompare(a.completedAt)
	);
}

export function saveApprovedVisualLesson(
	storage: StorageLike,
	lesson: VisualLessonFixture,
	completedAt = new Date().toISOString()
) {
	if (lesson.artifactVersion.startsWith('renderer-fixture-')) {
		throw new Error('Renderer fixtures cannot be saved as approved lesson history.');
	}
	const previous = loadVisualHistory(storage);
	const sameVersion = previous.find(
		(entry) =>
			entry.lesson.id === lesson.id && entry.lesson.artifactVersion === lesson.artifactVersion
	);
	const withoutSameVersion = previous.filter(
		(entry) =>
			entry.lesson.id !== lesson.id || entry.lesson.artifactVersion !== lesson.artifactVersion
	);
	const next = [
		{
			lesson: structuredClone(lesson),
			completedAt,
			checkOutcome: sameVersion?.checkOutcome
		},
		...withoutSameVersion
	];
	storage.setItem(approvedVisualHistoryKey, JSON.stringify(next));
	return next;
}

export function saveVisualCheckOutcome(
	storage: StorageLike,
	lesson: VisualLessonFixture,
	responseId: string,
	supported: boolean,
	answeredAt = new Date().toISOString()
) {
	const previous = loadVisualHistory(storage);
	const hasLesson = previous.some(
		(entry) =>
			entry.lesson.id === lesson.id && entry.lesson.artifactVersion === lesson.artifactVersion
	);
	const entries = hasLesson
		? previous
		: [{ lesson: structuredClone(lesson), completedAt: answeredAt }, ...previous];
	const next = entries.map((entry) =>
		entry.lesson.id === lesson.id && entry.lesson.artifactVersion === lesson.artifactVersion
			? {
					...entry,
					checkOutcome: { responseId, supported, answeredAt }
				}
			: entry
	);
	storage.setItem(approvedVisualHistoryKey, JSON.stringify(next));
	return next;
}
