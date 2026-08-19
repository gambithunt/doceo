/**
 * Learner-facing projection of an independently approved compact pipeline artifact.
 * Source run: 2026-08-18T18-34-15.506Z-health-vaccines-compact.json
 */
export const healthVaccinesArtifact = {
	status: 'approved',
	createdAt: '2026-08-18T18:34:15.505Z',
	contract: {
		id: 'health-vaccines',
		topic: 'How vaccines prepare the immune system',
		visualModel: {
			kind: 'immune_response',
			antigenFormsDisplay: 'alternatives_not_combined',
			stages: [
				{
					id: 'vaccination',
					label: 'Vaccination',
					type: 'vaccination',
					sequenceIndex: 0
				},
				{
					id: 'memory',
					label: 'Immune memory',
					type: 'memory',
					sequenceIndex: 1
				},
				{
					id: 'reexposure',
					label: 'Later antigen exposure',
					type: 'reexposure',
					sequenceIndex: 2
				},
				{
					id: 'rapid-response',
					label: 'Rapid antibody production',
					type: 'rapid_antibody_response',
					sequenceIndex: 3
				},
				{
					id: 'possible-infection',
					label: 'Infection remains possible',
					type: 'possible_infection',
					sequenceIndex: 4
				},
				{
					id: 'reduced-severity',
					label: 'Lower risk of serious illness',
					type: 'reduced_severity',
					sequenceIndex: 5
				}
			],
			protectionMeanings: [
				'immune_preparation',
				'rapid_antibody_response',
				'reduced_severity',
				'infection_still_possible'
			]
		},
		sources: [
			{
				title: 'Explaining How Vaccines Work',
				authority: 'US Centers for Disease Control and Prevention',
				url: 'https://www.cdc.gov/vaccines/basics/explaining-how-vaccines-work.html'
			},
			{
				title: 'Principles of Vaccination',
				authority: 'US Centers for Disease Control and Prevention',
				url: 'https://www.cdc.gov/pinkbook/hcp/table-of-contents/chapter-1-principles-of-vaccination.html'
			},
			{
				title: 'Explaining How Vaccines Work — timing and limits',
				authority: 'US Centers for Disease Control and Prevention',
				url: 'https://www.cdc.gov/vaccines/basics/explaining-how-vaccines-work.html'
			}
		]
	},
	draft: {
		title: 'How vaccines prepare immune memory',
		scenes: [
			{
				role: 'invitation',
				title: 'Before the next exposure',
				narration:
					'Vaccination gives the immune system antigens to notice before the disease itself appears. That is preparation, not treatment of an existing illness.',
				visualModelStateIds: ['vaccination']
			},
			{
				role: 'grounding',
				title: 'Memory can form',
				narration:
					'After antigen exposure, memory B-cells can persist for years. They help the body respond when the antigen appears again.',
				visualModelStateIds: ['memory']
			},
			{
				role: 'explanatory move',
				title: 'Later exposure is different',
				narration:
					'On later exposure, the antigen is recognized again. This re-exposure can trigger a faster antibody response than an unprepared start.',
				visualModelStateIds: ['reexposure', 'rapid-response']
			},
			{
				role: 'contrast',
				title: 'Protection has limits',
				narration:
					'Vaccination does not make infection impossible. People can still become infected, and protection is not perfect.',
				visualModelStateIds: ['possible-infection']
			},
			{
				role: 'synthesis',
				title: 'Less severe is not guaranteed',
				narration:
					'Vaccines can reduce the risk of serious illness, but responses vary. Different antigens and immune responses do not all behave the same way.',
				visualModelStateIds: [
					'vaccination',
					'memory',
					'reexposure',
					'rapid-response',
					'possible-infection',
					'reduced-severity'
				]
			}
		],
		check: {
			invitation: 'Quick check',
			prompt: 'What best describes how vaccination helps before later exposure?',
			choices: [
				{
					id: 'a',
					label: 'It can prepare immune memory so antibodies may form rapidly later.'
				},
				{
					id: 'b',
					label: 'It always prevents any infection from happening.'
				},
				{
					id: 'c',
					label: 'It works only as immediate treatment for an illness already started.'
				}
			],
			supportedResponseIds: ['a'],
			feedbackWhenSupported:
				'Yes—vaccination can prepare immune memory for a faster later response, but it does not guarantee perfect protection.',
			feedbackWhenNotYet:
				'Not quite. Vaccination is preparation before later exposure, not guaranteed prevention or immediate treatment.'
		}
	},
	review: {
		decision: 'approve',
		summary:
			'Accurate, source-supported, and aligned with the approved sequence: vaccination before infection, memory persistence, faster later antibody response, infection still possible, and reduced severity without guarantee.',
		findings: []
	}
} as const;
