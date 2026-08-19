import { describe, expect, it } from 'vitest';
import { cosmologyFixture } from './fixtures';
import { loadVisualHistory, saveApprovedVisualLesson, saveVisualCheckOutcome } from './history';

function memoryStorage() {
	const values = new Map<string, string>();
	return {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value)
	};
}

describe('approved visual history', () => {
	it('rejects renderer-only fixtures', () => {
		expect(() => saveApprovedVisualLesson(memoryStorage(), cosmologyFixture)).toThrow(
			'Renderer fixtures cannot be saved as approved lesson history.'
		);
	});

	it('stores one immutable replay entry per artifact version', () => {
		const storage = memoryStorage();
		const approvedLesson = {
			...cosmologyFixture,
			id: 'approved-space',
			artifactVersion: '2026-08-18T12:00:00.000Z'
		};
		saveApprovedVisualLesson(storage, approvedLesson, '2026-08-18T12:01:00.000Z');
		saveApprovedVisualLesson(storage, approvedLesson, '2026-08-18T12:02:00.000Z');
		const history = loadVisualHistory(storage);
		expect(history).toHaveLength(1);
		expect(history[0].completedAt).toBe('2026-08-18T12:02:00.000Z');
		expect(history[0].lesson.frames[0].caption).toBe(cosmologyFixture.frames[0].caption);
	});

	it('ignores malformed stored history', () => {
		const storage = memoryStorage();
		storage.setItem('doceo:approved-visual-history:v1', '{broken');
		expect(loadVisualHistory(storage)).toEqual([]);
	});

	it('records learner evidence beside the immutable lesson version', () => {
		const storage = memoryStorage();
		const approvedLesson = {
			...cosmologyFixture,
			id: 'approved-space',
			artifactVersion: '2026-08-18T12:00:00.000Z'
		};
		saveApprovedVisualLesson(storage, approvedLesson, '2026-08-18T12:01:00.000Z');
		saveVisualCheckOutcome(storage, approvedLesson, 'a', true, '2026-08-18T12:02:00.000Z');
		const [entry] = loadVisualHistory(storage);
		expect(entry.lesson.frames).toEqual(approvedLesson.frames);
		expect(entry.checkOutcome).toEqual({
			responseId: 'a',
			supported: true,
			answeredAt: '2026-08-18T12:02:00.000Z'
		});

		saveApprovedVisualLesson(storage, approvedLesson, '2026-08-18T12:03:00.000Z');
		expect(loadVisualHistory(storage)[0].checkOutcome?.supported).toBe(true);
	});
});
