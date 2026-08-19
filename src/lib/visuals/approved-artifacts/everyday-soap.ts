/**
 * Learner-facing projection of an approved pipeline artifact.
 * Source run: 2026-08-18T15-19-49.126Z-everyday-soap.json
 * The app adapts this data at runtime and will reject it if approval or canonical
 * visual-state requirements are missing.
 */
export const everydaySoapArtifact = {
	status: 'approved',
	createdAt: '2026-08-18T15:19:49.124Z',
	contract: {
		id: 'everyday-soap',
		topic: 'Why soap helps water remove grease and dirt',
		visualModel: {
			kind: 'containment_sequence',
			states: [
				{
					id: 'surface-grease',
					label: 'Grease on the surface',
					materialState: 'on_surface',
					sequenceIndex: 0
				},
				{
					id: 'soap-interaction',
					label: 'Soap interacts with grease',
					materialState: 'soap_interacting',
					sequenceIndex: 1
				},
				{
					id: 'dispersed-micelles',
					label: 'Grease dispersed in water inside micelles',
					materialState: 'dispersed_in_water_inside_micelles',
					sequenceIndex: 2
				},
				{
					id: 'rinsed-away',
					label: 'Dispersed grease carried away',
					materialState: 'carried_away',
					sequenceIndex: 3
				}
			]
		},
		sources: [
			{
				title: 'Hand Hygiene Frequently Asked Questions',
				authority: 'US Centers for Disease Control and Prevention',
				url: 'https://www.cdc.gov/clean-hands/faq/index.html'
			},
			{
				title: 'Soap',
				authority: 'OpenStax, Rice University',
				url: 'https://openstax.org/books/organic-chemistry/pages/27-2-soap'
			},
			{
				title: 'Using Chemicals to Control Microorganisms — surfactants',
				authority: 'OpenStax, Rice University',
				url: 'https://openstax.org/books/microbiology/pages/13-3-using-chemicals-to-control-microorganisms'
			}
		]
	},
	draft: {
		title: 'How soap helps water carry away grease',
		scenes: [
			{
				role: 'invitation',
				title: 'Grease stays on water alone',
				narration:
					'Water can wet a greasy surface, but greasy dirt still clings. Soap changes what happens next.',
				visualModelStateIds: ['surface-grease']
			},
			{
				role: 'grounding',
				title: 'Soap meets oily dirt',
				narration:
					'When soap touches greasy dirt, the grease does not just vanish. Soap molecules interact with the oily material.',
				visualModelStateIds: ['soap-interaction']
			},
			{
				role: 'explanatory move',
				title: 'Micelles hold grease in water',
				narration:
					'Soap molecules coat the oily material inside micelles. That makes the grease and dirt dispersed in water instead of stuck on the surface.',
				visualModelStateIds: ['dispersed-micelles']
			},
			{
				role: 'transformation',
				title: 'Rubbing and rinsing carry it away',
				narration:
					'Scrubbing helps loosen the material from the skin, and rinsing carries the dispersed grease away in the water.',
				visualModelStateIds: ['rinsed-away']
			}
		],
		check: {
			invitation: 'See if you can explain the cleaning action.',
			prompt: 'Which sequence best explains why soap helps water remove greasy dirt?',
			choices: [
				{
					id: 'a',
					label: 'Soap surrounds the grease, helps loosen it, and lets rinsing carry it away.'
				},
				{
					id: 'b',
					label: 'Soap mainly kills every germ, so the grease disappears.'
				},
				{
					id: 'c',
					label: 'Water alone breaks grease into nothing, so rubbing is unnecessary.'
				}
			],
			supportedResponseIds: ['a'],
			feedbackWhenSupported:
				'Yes—soap helps lift greasy dirt into water, and rinsing carries it away.',
			feedbackWhenNotYet:
				'Look for the steps: soap interacts with grease, loosens it, and rinsing removes the dispersed material.'
		}
	},
	review: {
		decision: 'approve',
		summary:
			'The lesson’s core sequence matches the approved model: grease starts on a surface, soap interacts, grease is shown inside micelles dispersed in water, and rinsing carries it away. I did not find a major factual, visual-order, or safety violation. There are minor evidence-tracing and scope-wording issues worth noting.',
		findings: [
			{
				explanation:
					"Scene 1’s narration and captions make a water-alone comparison ('Water alone does not pull grease off well'), but the cited source claim is about soap surfactants loosening and lifting dirt from surfaces. The contract’s learnerIntent and prerequisite support the water-alone setup, so this is not a factual error, but the scene’s explicit source linkage does not directly support the stated comparison."
			},
			{
				explanation:
					"The lesson mostly frames the material as being on a generic 'surface,' but Scene 4 narration shifts to 'skin' specifically ('Scrubbing helps loosen the material from the skin'). This does not contradict the approved idea, but it narrows scope relative to the rest of the lesson and the visual model."
			}
		]
	}
} as const;
