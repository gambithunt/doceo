/**
 * Learner-facing projection of an independently approved compact pipeline artifact.
 * Source run: 2026-08-18T18-31-12.503Z-space-before-big-bang-compact.json
 */
export const spaceBeforeBigBangArtifact = {
	status: 'approved',
	createdAt: '2026-08-18T18:31:12.502Z',
	contract: {
		id: 'space-before-big-bang',
		topic: 'What, if anything, came before the Big Bang',
		visualModel: {
			kind: 'timeline',
			direction: 'earlier_to_later',
			events: [
				{
					id: 'unknown-before',
					label: 'What preceded inflation',
					concept: 'unknown_before',
					epistemicStatus: 'unknown',
					sequenceIndex: 0
				},
				{
					id: 'inflation',
					label: 'Inflation',
					concept: 'inflation',
					epistemicStatus: 'inferred',
					sequenceIndex: 1
				},
				{
					id: 'observed-evidence',
					label: 'Later observed evidence',
					concept: 'observed_evidence',
					epistemicStatus: 'observed',
					sequenceIndex: 2
				}
			],
			evidenceLinks: [
				{
					fromEventId: 'observed-evidence',
					toEventId: 'inflation',
					relationship: 'supports_inference'
				}
			]
		},
		sources: [
			{
				title: 'Webb Telescope & The Big Bang',
				authority: 'NASA Science',
				url: 'https://science.nasa.gov/mission/webb/big-bang-q-and-a/'
			},
			{
				title: 'Hubble Big Bang',
				authority: 'NASA Science',
				url: 'https://science.nasa.gov/mission/hubble/science/science-behind-the-discoveries/hubble-big-bang/'
			},
			{
				title: 'Early Universe',
				authority: 'NASA Science',
				url: 'https://science.nasa.gov/mission/webb/early-universe/'
			},
			{
				title: 'NASA Beyond Einstein Program — inflation observability',
				authority: 'NASA and the National Research Council',
				url: 'https://assets.science.nasa.gov/content/dam/science/astro/programs/physics-of-the-cosmos/documents/brochures-factsheets/heritage/BeyondEinsteinReport-2007.pdf'
			}
		]
	},
	draft: {
		title: 'What Science Can Say About Before',
		scenes: [
			{
				role: 'invitation',
				title: 'Start With the Evidence',
				narration:
					'We can ask what science can honestly say about the universe’s earliest history. Some claims are observed, some are inferred, and some remain unknown.',
				visualModelStateIds: ['unknown-before']
			},
			{
				role: 'grounding',
				title: 'What We Can Observe',
				narration:
					'Expansion and the all-sky leftover heat support a hot early universe. The cosmic microwave background is the earliest cosmic history observable with light.',
				visualModelStateIds: ['observed-evidence']
			},
			{
				role: 'explanatory move',
				title: 'Inflation Is Inferred',
				narration:
					'Observations of the early universe provide evidence for a period of cosmic inflation. Inflation is not directly observed; it is inferred from evidence.',
				visualModelStateIds: ['inflation', 'observed-evidence']
			},
			{
				role: 'boundary',
				title: 'What Comes Earlier Is Unknown',
				narration:
					'Scientists are unsure what came before inflation, and unsure what powered it. The Big Bang itself is not directly visible.',
				visualModelStateIds: ['unknown-before', 'inflation']
			},
			{
				role: 'synthesis',
				title: 'Sort the Claims',
				narration:
					'Observed: later evidence, including the cosmic microwave background. Inferred: inflation. Unknown: what preceded inflation. Science does not treat those unknowns as settled.',
				visualModelStateIds: ['unknown-before', 'inflation', 'observed-evidence']
			}
		],
		check: {
			invitation: 'Quick check',
			prompt: 'Which statement best matches what science can honestly say here?',
			choices: [
				{
					id: 'a',
					label: 'Inflation is directly observed, and what came before it is settled.'
				},
				{
					id: 'b',
					label:
						'Later observations support a hot early universe; inflation is inferred; what preceded it is unknown.'
				},
				{
					id: 'c',
					label: 'The Big Bang was directly visible from the start.'
				}
			],
			supportedResponseIds: ['b'],
			feedbackWhenSupported:
				'Correct: the evidence supports a hot early universe, inflation is inferred, and what came before remains unknown.',
			feedbackWhenNotYet:
				'Not yet: keep observed evidence, inferred inflation, and unknown earlier history separate.'
		}
	},
	review: {
		decision: 'approve',
		summary:
			'Approved. The lesson stays within the evidence/inference/unknown boundary, keeps inflation inferred rather than directly observed, and the check answer aligns with the contract.',
		findings: [
			{
				severity: 'minor',
				sceneNumber: 1,
				sourceClaimIds: [],
				explanation:
					'The opening scene is titled “Start With the Evidence” and says observed, inferred, and unknown claims will be separated, but it activates only the unknown-before state. This is a small state-to-narration mismatch, not a factual error.'
			}
		]
	}
} as const;
