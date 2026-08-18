import type { StartingPoint } from './types';

export type BlackHoleSceneId =
	'scale' | 'horizon' | 'viewpoints' | 'observer' | 'traveler' | 'tidal' | 'synthesis';

export type BlackHoleScene = {
	id: BlackHoleSceneId;
	start: number;
	end: number;
	kicker: string;
	title: string;
	subtitle: string;
	caption: string;
};

const openingCaptions: Record<StartingPoint, string> = {
	'From the beginning':
		'Imagine falling toward a supermassive black hole. We’ll choose a quiet one, without a blazing disk of hot material. This is still a thought experiment—but it lets us focus on what gravity does to space and time.',
	'I know the basics':
		'Picture a quiet supermassive black hole. Its enormous size lets us isolate what gravity does to space and time before the strongest tidal forces arrive.',
	'Take me deeper':
		'Start with a quiet supermassive black hole. Near a sufficiently massive horizon, its curvature gradient can remain gentle even while escape paths have already closed.'
};

export const blackHoleLessonDuration = 116;

export function createBlackHoleScenes(startingPoint: StartingPoint): BlackHoleScene[] {
	return [
		{
			id: 'scale',
			start: 0,
			end: 12,
			kicker: 'Our thought experiment',
			title: 'Falling into a black hole',
			subtitle: 'Two people. Two very different views.',
			caption: openingCaptions[startingPoint]
		},
		{
			id: 'horizon',
			start: 12,
			end: 29,
			kicker: 'The event horizon',
			title: 'A boundary, not a surface',
			subtitle: 'There is no wall to strike and no edge to stand on.',
			caption:
				'Around the black hole is an event horizon. It isn’t a wall or a surface. After you cross this boundary, every possible path forward remains inside. Even light can no longer reach the outside universe.'
		},
		{
			id: 'viewpoints',
			start: 29,
			end: 42,
			kicker: 'Watch from two places',
			title: 'One fall. Two clocks.',
			subtitle: 'Gravity makes the viewpoints disagree.',
			caption:
				'Now watch the same fall from two viewpoints. One person stays far away. The other travels with the spacecraft. Their clocks begin together, but gravity makes them disagree.'
		},
		{
			id: 'observer',
			start: 42,
			end: 66,
			kicker: 'Seen from far away',
			title: 'The traveler slows and fades',
			subtitle: 'Each new signal arrives later, redder, and weaker.',
			caption:
				'To the distant observer, signals from the traveler arrive more slowly. Their light is stretched, reddened, and weakened. The traveler seems to slow and fade near the horizon. No signal sent from inside ever reaches the observer.'
		},
		{
			id: 'traveler',
			start: 66,
			end: 88,
			kicker: 'With the traveler',
			title: 'Their own clock feels normal',
			subtitle: 'The horizon passes without a flash or impact.',
			caption:
				'For the traveler, their own clock feels normal. At a sufficiently large, quiet black hole, crossing the event horizon need not feel like hitting anything. They pass it in a finite time—but can no longer send news back out.'
		},
		{
			id: 'tidal',
			start: 88,
			end: 104,
			kicker: 'Deeper inside',
			title: 'Gravity pulls unevenly',
			subtitle: 'The nearer end is pulled harder than the farther end.',
			caption:
				'Deeper in, gravity can pull much harder on the nearer part of an object than the farther part. That tidal stretching is called spaghettification. For a smaller black hole, it could happen before the horizon.'
		},
		{
			id: 'synthesis',
			start: 104,
			end: blackHoleLessonDuration,
			kicker: 'So which view is real?',
			title: 'Both.',
			subtitle: '“What happens now?” depends on where you watch from.',
			caption:
				'Far away, you see the traveler slow and fade. For the traveler, the horizon passes and the journey continues. A black hole makes “what happens now?” depend on where you are watching from.'
		}
	];
}

export function getBlackHoleScene(scenes: BlackHoleScene[], elapsed: number) {
	return scenes.find((scene) => elapsed >= scene.start && elapsed < scene.end) ?? scenes.at(-1)!;
}
