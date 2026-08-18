import { describe, expect, it } from 'vitest';
import {
	blackHoleLessonDuration,
	createBlackHoleScenes,
	getBlackHoleScene
} from './black-hole-lesson';

describe('black-hole lesson fixture', () => {
	const scenes = createBlackHoleScenes('From the beginning');

	it('covers the complete 116-second journey without timing gaps', () => {
		expect(scenes).toHaveLength(7);
		expect(scenes[0].start).toBe(0);
		expect(scenes.at(-1)?.end).toBe(blackHoleLessonDuration);
		expect(scenes.slice(1).every((scene, index) => scene.start === scenes[index].end)).toBe(true);
	});

	it('selects scenes at their exact boundaries', () => {
		expect(getBlackHoleScene(scenes, 0).id).toBe('scale');
		expect(getBlackHoleScene(scenes, 12).id).toBe('horizon');
		expect(getBlackHoleScene(scenes, 104).id).toBe('synthesis');
	});

	it('adapts the opening while preserving the lesson sequence', () => {
		const deeper = createBlackHoleScenes('Take me deeper');
		expect(deeper[0].caption).not.toBe(scenes[0].caption);
		expect(deeper.map((scene) => scene.id)).toEqual(scenes.map((scene) => scene.id));
	});
});
