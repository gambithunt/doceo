import type { BlindLesson } from './blind-types.ts';

const sources = [
	{
		title: 'Black Holes',
		authority: 'NASA Science',
		url: 'https://science.nasa.gov/universe/black-holes/'
	},
	{
		title: 'Anatomy of a Black Hole',
		authority: 'NASA Science',
		url: 'https://science.nasa.gov/universe/black-holes/anatomy/'
	},
	{
		title: 'What Happens When Something Gets “Too Close” to a Black Hole?',
		authority: 'NASA Science',
		url: 'https://science.nasa.gov/universe/what-happens-when-something-gets-too-close-to-a-black-hole/'
	}
];

const sourceSupport = sources.map((source) => `${source.authority}: ${source.title}`);

export const authoredBlackHoleControl: BlindLesson = {
	title: 'Falling into a black hole',
	focusedIdea:
		'A distant observer and a falling traveler experience the same event-horizon crossing differently, and both descriptions are valid.',
	learnerOutcome:
		'Distinguish what a distant observer sees from what the traveler experiences while crossing an event horizon.',
	lessonDurationSeconds: 116,
	sourceBasis: sources,
	scenes: [
		{
			role: 'invitation',
			title: 'Choose the safer impossible trip',
			durationSeconds: 12,
			narration:
				'Imagine falling toward a supermassive black hole. We’ll choose a quiet one, without a blazing disk of hot material. This is still a thought experiment—but it lets us focus on what gravity does to space and time.',
			captions: [
				'Imagine falling toward a quiet supermassive black hole.',
				'This thought experiment lets us focus on what gravity does to space and time.'
			],
			visualDirection:
				'A tiny spacecraft passes a normal star, a stellar-mass black hole, and then an enormous supermassive black hole. The final object fills the frame.',
			motionRationale:
				'Establish the scenario and its scale without implying that falling into a black hole is a realistic safe journey.',
			sourceSupport
		},
		{
			role: 'grounding',
			title: 'A boundary, not a surface',
			durationSeconds: 17,
			narration:
				'Around the black hole is an event horizon. It isn’t a wall or a surface. It is a boundary: after you cross it, every possible path forward remains inside. Even light can no longer reach the outside universe.',
			captions: [
				'The event horizon is a boundary, not a wall or surface.',
				'After it is crossed, every possible path forward remains inside.'
			],
			visualDirection:
				'The dark centre is surrounded by a thin, unlabeled boundary. As the traveler approaches, the label “event horizon” resolves softly into view. No hard shell or portal is drawn.',
			motionRationale:
				'Replace the common image of a cosmic hole with a physical edge by showing a boundary that can be crossed without impact.',
			sourceSupport
		},
		{
			role: 'grounding',
			title: 'Split the viewpoint',
			durationSeconds: 13,
			narration:
				'Now watch the same fall from two viewpoints. One person stays far away. The other travels with the spacecraft. Gravity makes their clocks disagree.',
			captions: [
				'One person watches from far away.',
				'One travels with the spacecraft.',
				'Gravity makes their clocks disagree.'
			],
			visualDirection:
				'The composition divides without becoming a dashboard. One continuous space scene shows a distant observer on the left and the falling traveler on the right. Their clocks tick together at first.',
			motionRationale:
				'Establish one shared event and two viewpoints before showing how their observations diverge.',
			sourceSupport
		},
		{
			role: 'contrast',
			title: 'What the distant observer sees',
			durationSeconds: 24,
			narration:
				'To the distant observer, signals from the traveler arrive more slowly. Their light is stretched, reddened, and weakened. The traveler seems to slow and fade near the horizon. The observer never receives a signal sent from inside it.',
			captions: [
				'Signals arrive more slowly.',
				'Their light becomes redder and weaker.',
				'The traveler seems to slow and fade near the horizon.',
				'No signal sent from inside reaches the distant observer.'
			],
			visualDirection:
				'Pulses of light leave the spacecraft. Each later pulse takes longer to arrive, stretches toward red, and becomes dimmer. The distant observer’s view of the traveler appears to slow near the event horizon.',
			motionRationale:
				'Make observable slowing, redshift, and fading visible without claiming that the traveler literally freezes in their own experience.',
			sourceSupport
		},
		{
			role: 'contrast',
			title: 'What the traveler experiences',
			durationSeconds: 22,
			narration:
				'For the traveler, their own clock feels normal. At a sufficiently large, quiet black hole, crossing the event horizon need not feel like hitting anything. They pass the boundary in a finite amount of their own time—but can no longer send news back out.',
			captions: [
				'The traveler’s own clock feels normal.',
				'At a sufficiently large, quiet black hole, the horizon can pass without an impact.',
				'The traveler crosses in finite time but cannot send news back out.'
			],
			visualDirection:
				'The split dissolves into the traveler’s view. Their local clock ticks normally. The event-horizon line passes behind them without a flash, impact, or portal effect. The outside universe appears increasingly distorted.',
			motionRationale:
				'Deliver the counterintuitive second viewpoint while keeping it continuous with the same fall shown to the distant observer.',
			sourceSupport
		},
		{
			role: 'boundary',
			title: 'The danger is still real',
			durationSeconds: 16,
			narration:
				'Deeper in, gravity can pull much harder on the nearer part of an object than the farther part. That tidal stretching is called spaghettification. For a smaller black hole, it could happen before the horizon.',
			captions: [
				'Deeper in, gravity pulls unevenly across an object.',
				'Tidal stretching is called spaghettification.',
				'For a smaller black hole, it could happen before the horizon.'
			],
			visualDirection:
				'A gentle head-to-foot gravity gradient becomes dramatically uneven as the traveler moves deeper. The figure stretches into a simple line diagram, not graphic body horror.',
			motionRationale:
				'Show that the thought experiment is not a survivability claim and preserve the mass-dependent tidal-force nuance.',
			sourceSupport
		},
		{
			role: 'synthesis',
			title: 'So which view is real?',
			durationSeconds: 12,
			narration:
				'So which view is real? Both. Far away, you see the traveler slow and fade. For the traveler, the horizon passes and the journey continues. A black hole makes “what happens now?” depend on where you are watching from.',
			captions: [
				'Both views are real.',
				'Far away, the traveler slows and fades.',
				'For the traveler, the horizon passes and the journey continues.'
			],
			visualDirection:
				'Two clocks remain: one far away, one carried inward. The event horizon becomes a quiet boundary between what can and cannot send information outward.',
			motionRationale:
				'Reconcile the two valid viewpoints and resolve the lesson without adding a new idea or next action.',
			sourceSupport
		}
	],
	check: {
		invitation: 'Want a 10-second check?',
		interactionType: 'choice',
		action: 'Choose every view that fits.',
		prompt: 'Who experiences the traveler crossing the event horizon?',
		choices: [
			{
				id: 'distant-observer',
				label: 'The distant observer sees the traveler slow, redden, and fade.'
			},
			{
				id: 'traveler',
				label: 'The traveler crosses the horizon in their own finite time.'
			}
		],
		supportedResponseIds: ['distant-observer', 'traveler'],
		successEvidence: 'The learner selects both valid viewpoints.',
		misconceptionEvidence:
			'Selecting only the distant observer may indicate a “traveler freezes” misconception; selecting only the traveler may indicate uncertainty about which signals reach the observer.',
		feedbackWhenSupported:
			'Both views fit: the observer sees slowing and fading, while the traveler crosses in finite time.',
		feedbackWhenNotYet:
			'Rebuild the two views: ask what signals the distant observer receives, then follow the traveler’s own clock.'
	}
};
