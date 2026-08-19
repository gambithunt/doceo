import type { VisualLessonFixture } from './types';

export const cosmologyFixture: VisualLessonFixture = {
	id: 'cosmology',
	artifactVersion: 'renderer-fixture-cosmology-v1',
	kind: 'timeline',
	title: 'Before the Big Bang?',
	nodes: [
		{ id: 'unknown-before', label: 'What preceded inflation', sequenceIndex: 0, status: 'unknown' },
		{ id: 'inflation', label: 'Inflation', sequenceIndex: 1, status: 'inferred' },
		{
			id: 'observed-evidence',
			label: 'Later observed evidence',
			sequenceIndex: 2,
			status: 'observed'
		}
	],
	evidenceLinks: [{ from: 'observed-evidence', to: 'inflation' }],
	frames: [
		{
			kicker: 'Start with the order',
			title: 'Earlier is always this way',
			caption:
				'The positions come from the lesson contract, so generated words cannot quietly reverse time.',
			activeStateIds: ['unknown-before', 'inflation', 'observed-evidence']
		},
		{
			kicker: 'What we can measure',
			title: 'The clues arrive later',
			caption:
				'Light and other observations give us evidence from a later era. They do not show inflation directly.',
			activeStateIds: ['observed-evidence']
		},
		{
			kicker: 'Follow the evidence',
			title: 'Clues support an inference',
			caption:
				'The evidence points backward toward inflation. The curved link means “supports,” not “directly observed.”',
			activeStateIds: ['inflation', 'observed-evidence']
		},
		{
			kicker: 'At the edge of the answer',
			title: 'Before that remains unknown',
			caption:
				'We can leave this question open without turning uncertainty into an empty wall or a made-up event.',
			activeStateIds: ['unknown-before', 'inflation']
		}
	]
};

export const vaccineFixture: VisualLessonFixture = {
	id: 'vaccines',
	artifactVersion: 'renderer-fixture-vaccines-v1',
	kind: 'immune-response',
	title: 'How vaccines prepare us',
	nodes: [
		{ id: 'vaccination', label: 'Vaccination', sequenceIndex: 0, status: 'vaccination' },
		{ id: 'memory', label: 'Immune memory', sequenceIndex: 1, status: 'memory' },
		{
			id: 'reexposure',
			label: 'Later antigen exposure',
			sequenceIndex: 2,
			status: 'reexposure'
		},
		{
			id: 'rapid-response',
			label: 'Rapid antibody production',
			sequenceIndex: 3,
			status: 'rapid-response'
		},
		{
			id: 'possible-infection',
			label: 'Infection remains possible',
			sequenceIndex: 4,
			status: 'possible-infection'
		},
		{
			id: 'reduced-severity',
			label: 'Lower risk of serious illness',
			sequenceIndex: 5,
			status: 'reduced-severity'
		}
	],
	evidenceLinks: [],
	frames: [
		{
			kicker: 'Preparation comes first',
			title: 'Vaccination builds memory',
			caption:
				'The sequence shows immune preparation—never a wall that physically blocks pathogens from entering.',
			activeStateIds: ['vaccination', 'memory']
		},
		{
			kicker: 'At a later encounter',
			title: 'Memory helps the response move quickly',
			caption:
				'The later exposure is not “faster.” The rapid part is antibody production after the antigen is encountered again.',
			activeStateIds: ['memory', 'reexposure', 'rapid-response']
		},
		{
			kicker: 'Keep the limit visible',
			title: 'Protection is not a force field',
			caption:
				'Infection can still happen. The visual describes an immune response and lower risk of serious illness, not blocked entry.',
			activeStateIds: ['possible-infection', 'reduced-severity']
		},
		{
			kicker: 'The complete relationship',
			title: 'Prepared, then ready to respond',
			caption:
				'Every state keeps its human-approved label and position, even when the lesson is generated again.',
			activeStateIds: [
				'vaccination',
				'memory',
				'reexposure',
				'rapid-response',
				'possible-infection',
				'reduced-severity'
			]
		}
	]
};

export const visualFixtures = {
	cosmology: cosmologyFixture,
	vaccines: vaccineFixture
} as const;
