import { describe, expect, it } from 'vitest';
import {
	createRealExampleScenes,
	getRealExampleScene,
	realExampleLessonDuration
} from './real-example-lesson';

describe('real-example lesson fixture', () => {
	const scenes = createRealExampleScenes('From the beginning');

	it('uses the six scenes required by the idea', () => {
		expect(scenes).toHaveLength(6);
		expect(scenes[0].start).toBe(0);
		expect(scenes.at(-1)?.end).toBe(realExampleLessonDuration);
		expect(scenes.slice(1).every((scene, index) => scene.start === scenes[index].end)).toBe(true);
	});

	it('selects the evidence scenes at exact boundaries', () => {
		expect(getRealExampleScene(scenes, 15).id).toBe('orbits');
		expect(getRealExampleScene(scenes, 38).id).toBe('mass');
		expect(getRealExampleScene(scenes, 98).id).toBe('evidence');
	});

	it('adapts framing without changing the evidence sequence', () => {
		const deeper = createRealExampleScenes('Take me deeper');
		expect(deeper[0].caption).not.toBe(scenes[0].caption);
		expect(deeper.map(({ id }) => id)).toEqual(scenes.map(({ id }) => id));
	});
});
