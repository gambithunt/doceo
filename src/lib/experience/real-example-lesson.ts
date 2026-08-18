import type { StartingPoint } from './types';

export type RealExampleSceneId =
	'problem' | 'orbits' | 'mass' | 'alternatives' | 'image' | 'evidence';

export type RealExampleScene = {
	id: RealExampleSceneId;
	start: number;
	end: number;
	kicker: string;
	title: string;
	subtitle: string;
	caption: string;
};

const openingCaptions: Record<StartingPoint, string> = {
	'From the beginning':
		'Black holes give off no light. There is nothing to point a camera at. So astronomers stopped looking for the object—and started watching what it does to everything around it.',
	'I know the basics':
		'Because the black hole itself is dark, astronomers look for measurable effects: fast orbits, concentrated mass, and bent light around its shadow.',
	'Take me deeper':
		'Detecting a black hole is an inference problem: measure orbital dynamics, constrain mass and volume, then eliminate every stable luminous alternative.'
};

export const realExampleLessonDuration = 110;

export function createRealExampleScenes(startingPoint: StartingPoint): RealExampleScene[] {
	return [
		{
			id: 'problem',
			start: 0,
			end: 15,
			kicker: 'The detection problem',
			title: 'How we found a black hole',
			subtitle: 'You can’t photograph nothing. So look at what it moves.',
			caption: openingCaptions[startingPoint]
		},
		{
			id: 'orbits',
			start: 15,
			end: 38,
			kicker: 'Observe first',
			title: 'Watch the stars, not the dark',
			subtitle: 'A few stars race around one apparently empty point.',
			caption:
				'For nearly thirty years, astronomers tracked individual stars at the centre of our galaxy. Most barely drifted. A few raced—swinging around a single point in the dark, and returning.'
		},
		{
			id: 'mass',
			start: 38,
			end: 58,
			kicker: 'Measure the effect',
			title: 'An orbit weighs what it circles',
			subtitle: 'The star is visible. The mass at the focus is not.',
			caption:
				'The shape and speed of an orbit reveal the mass at its centre. The star S2 completes a lap in less than sixteen years. Its orbit points to roughly four million Suns packed inside a region no larger than our solar system.'
		},
		{
			id: 'alternatives',
			start: 58,
			end: 76,
			kicker: 'Test the inference',
			title: 'Rule out what else it could be',
			subtitle: 'The explanation must stay heavy, compact, and dark.',
			caption:
				'Could it be a dense swarm of ordinary stars? A cluster that tight would not remain stable. One colossal star? At that mass, its light would be impossible to miss. The alternatives fail.'
		},
		{
			id: 'image',
			start: 76,
			end: 98,
			kicker: 'Then came the image',
			title: 'They photographed the shadow',
			subtitle: 'Glowing gas revealed where the darkness bends light.',
			caption:
				'In 2019, radio telescopes across Earth combined into one virtual instrument and imaged the centre of M87. It was not a picture of the black hole itself, but glowing gas around its shadow. In 2022, they imaged our galaxy’s centre too.'
		},
		{
			id: 'evidence',
			start: 98,
			end: realExampleLessonDuration,
			kicker: 'Evidence for the invisible',
			title: 'Measure what it changes',
			subtitle: 'Orbit. Mass. Shadow.',
			caption:
				'We know black holes are there because of orbits we can measure, a mass we can calculate, and a shadow we can image. That is what evidence for an invisible thing looks like.'
		}
	];
}

export function getRealExampleScene(scenes: RealExampleScene[], elapsed: number) {
	return scenes.find((scene) => elapsed >= scene.start && elapsed < scene.end) ?? scenes.at(-1)!;
}
