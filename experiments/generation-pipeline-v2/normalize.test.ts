import { describe, expect, it } from 'vitest';
import { normalizeDuration } from './normalize.ts';
import type { LessonDraftV2 } from './schema.ts';

function draftWithDurations(durations: number[]) {
	return {
		scenes: durations.map((durationSeconds) => ({ durationSeconds }))
	} as LessonDraftV2;
}

describe('normalizeDuration', () => {
	it('leaves an in-range duration unchanged', () => {
		const result = normalizeDuration(draftWithDurations([20, 20, 20, 20, 20]));
		expect(result.adjustments).toEqual([]);
		expect(result.draft.scenes.map((scene) => scene.durationSeconds)).toEqual([20, 20, 20, 20, 20]);
	});

	it('distributes a shortfall deterministically without exceeding scene limits', () => {
		const result = normalizeDuration(draftWithDurations([18, 16, 18, 16, 18]));
		expect(result.draft.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0)).toBe(100);
		expect(result.adjustments.length).toBeGreaterThan(0);
		expect(result.draft.scenes.every((scene) => scene.durationSeconds <= 30)).toBe(true);
	});
});
