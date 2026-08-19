import { lessonContracts } from '../generation-spike/contracts.ts';
import { LessonContractV2Schema, type LessonContractV2 } from './schema.ts';
import type { VisualPrimitive } from './visual-primitives.ts';

type SourceInput = { title: string; authority: string; url: string; claims: string[] };

const additionalSources: Record<string, SourceInput[]> = {
	'everyday-airplane-lift': [
		{
			title: 'Bernoulli and Newton — expanded claim ledger',
			authority: 'NASA Glenn Research Center',
			url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/bernoulli-and-newton/',
			claims: [
				'Integrating either pressure variation or velocity variation around an object determines its aerodynamic force.',
				'Net turning of airflow produces a reaction aerodynamic force on the object, so Bernoulli and Newton descriptions are both correct.',
				'The equal-transit theory falsely assumes that air split at the leading edge must meet again at the trailing edge.',
				'The longer-path theory incorrectly claims that a longer upper path makes upper air move faster in order to meet lower air at the trailing edge.'
			]
		},
		{
			title: "Newton's Third Law — Action and Reaction",
			authority: 'NASA Glenn Research Center',
			url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/newtons-third-law-action-reaction/',
			claims: [
				'Air moving past an aircraft wing is deflected downward by the shape and motion of the wing, producing an opposite reaction on the wing.'
			]
		},
		{
			title: 'Incorrect Lift Theory',
			authority: 'NASA Glenn Research Center',
			url: 'https://www.grc.nasa.gov/www/k-12/VirtualAero/BottleRocket/airplane/wrong1.html',
			claims: [
				'Particles moving over the top of a lifting airfoil arrive at the trailing edge before particles moving under it.'
			]
		},
		{
			title: 'Downwash Effects on Lift',
			authority: 'NASA Glenn Research Center',
			url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/downwash-effects-on-lift/',
			claims: [
				'For a lifting wing, air pressure on top of the wing is lower than air pressure below the wing.'
			]
		}
	],
	'math-conditional-probability': [
		{
			title: 'Conditional Probability Notation and Formula',
			authority: 'OpenStax, Rice University',
			url: 'https://openstax.org/books/statistics/pages/3-1-terminology',
			claims: [
				'P(A given B) is the probability that an outcome is in A given that it is in B.',
				'P(A given B) equals P(A and B) divided by P(B), so outcomes in B define the denominator.',
				'Reversing the condition changes the notation and denominator from P(A given B) to P(B given A).'
			]
		}
	],
	'health-vaccines': [
		{
			title: 'Principles of Vaccination',
			authority: 'US Centers for Disease Control and Prevention',
			url: 'https://www.cdc.gov/pinkbook/hcp/table-of-contents/chapter-1-principles-of-vaccination.html',
			claims: [
				'After antigen exposure, memory B-cells can persist for years and rapidly produce antibody when the antigen is encountered again.',
				'Vaccines contain antigens that stimulate an immune response without subjecting the recipient to the disease and its potential complications.',
				'Vaccine immune responses vary with antigen type, dose, route, adjuvant, and characteristics of the recipient.'
			]
		},
		{
			title: 'Explaining How Vaccines Work — timing and limits',
			authority: 'US Centers for Disease Control and Prevention',
			url: 'https://www.cdc.gov/vaccines/basics/explaining-how-vaccines-work.html',
			claims: [
				'Immunity can take weeks to develop after vaccination, so vaccination is preparation rather than immediate treatment of an existing illness.',
				'Vaccinated people can still become infected, although they are less likely to die or become seriously ill than an unprepared person.'
			]
		}
	],
	'everyday-soap': [
		{
			title: 'Soap',
			authority: 'OpenStax, Rice University',
			url: 'https://openstax.org/books/organic-chemistry/pages/27-2-soap',
			claims: [
				'Grease and oil droplets become dispersed in water when soap molecules coat them inside micelles.',
				'Once grease is held in micelles, the grease and dirt can be rinsed away.'
			]
		},
		{
			title: 'Using Chemicals to Control Microorganisms — surfactants',
			authority: 'OpenStax, Rice University',
			url: 'https://openstax.org/books/microbiology/pages/13-3-using-chemicals-to-control-microorganisms',
			claims: [
				'Soap surfactants interact with nonpolar oils and grease to create emulsions in water, loosening and lifting dirt from surfaces.',
				'Plain soaps do not kill or inhibit microbial growth and are not considered antiseptics or disinfectants.'
			]
		}
	],
	'space-before-big-bang': [
		{
			title: 'Early Universe',
			authority: 'NASA Science',
			url: 'https://science.nasa.gov/mission/webb/early-universe/',
			claims: [
				'Observations of the early universe provide evidence for a period of cosmic inflation before what this source calls the Big Bang.',
				'Scientists are unsure what came before inflation or what powered it.',
				'The cosmic microwave background is the earliest cosmic history observable with light, not the end of all evidence or history.'
			]
		},
		{
			title: 'NASA Beyond Einstein Program — inflation observability',
			authority: 'NASA and the National Research Council',
			url: 'https://assets.science.nasa.gov/content/dam/science/astro/programs/physics-of-the-cosmos/documents/brochures-factsheets/heritage/BeyondEinsteinReport-2007.pdf',
			claims: [
				'The inflationary period cannot be observed directly, but it can leave distinct imprints that observations can use to constrain its properties.'
			]
		}
	]
};

const contractOverrides: Record<string, Partial<LessonContractV2>> = {
	'everyday-airplane-lift': {
		safeBoundary:
			'Do not use equal transit, claim that upper air speeds up merely to reunite with lower air at the trailing edge, or suggest that only the lower surface turns the flow.'
	},
	'math-conditional-probability': {
		safeBoundary:
			'Keep the condition and denominator explicit; do not silently replace P(A given B) with P(B given A).'
	},
	'health-vaccines': {
		chosenApproach:
			'Animate antigen exposure through vaccination, persistence of memory B-cells, and rapid antibody production on re-exposure.',
		focusedIdea:
			'Vaccines expose the immune system to antigens so immune memory can respond rapidly on later exposure without requiring the disease itself.',
		learnerOutcome:
			'Explain how antigen exposure before infection can establish memory that rapidly produces antibodies on later exposure without guaranteeing perfect protection.',
		optionalEvidenceTarget:
			'The learner distinguishes immune preparation before later exposure from immediate treatment or guaranteed protection.',
		safeBoundary:
			'Do not give personal vaccination advice, promise perfect protection, or imply that all vaccine types produce identical responses.'
	},
	'everyday-soap': {
		learnerOutcome:
			'Explain how soap, rubbing, and rinsing disperse greasy dirt in water, loosen it, and carry it away.',
		optionalEvidenceTarget:
			'The learner orders soap surrounding oily dirt, loosening it from the surface, and rinsing it away by their functional roles.',
		safeBoundary:
			'Do not claim plain soap kills or inhibits microbes, is an antiseptic or disinfectant, or makes grease disappear rather than dispersing and carrying it away.'
	},
	'space-before-big-bang': {
		focusedIdea:
			'Evidence supports a hot early universe and a period of inflation, while what preceded or powered inflation remains unknown.',
		learnerOutcome:
			'Distinguish observations of the early universe, inflationary inference, and unknown claims about what preceded inflation.',
		optionalEvidenceTarget:
			'The learner classifies claims about the early universe as observed, inferred, or unknown.',
		safeBoundary:
			'Do not present inflation as directly observed or any proposal about what preceded inflation as settled.'
	}
};

const visualConstraints: Record<string, string[]> = {
	'everyday-airplane-lift': [
		'If marked air particles are compared, the upper particle must reach the trailing edge before the lower particle.',
		'Any pressure colors must have a visible legend or labels and show lower pressure above than below for the depicted lifting wing.',
		'Do not use a longer upper path as the visual cause of faster airflow.'
	],
	'math-conditional-probability': [
		'Favorable outcomes must remain visibly inside the condition-defined set of possible outcomes.'
	],
	'health-vaccines': [
		'Do not label vaccination as making disease impossible; every protection visual must preserve the possibility of infection.',
		'Different vaccine forms may share an antigen-preparation abstraction, but must be labeled as different antigen forms rather than shown as identical contents.'
	],
	'everyday-soap': [
		'Show one unranked sequence of soap interacting with oily dirt, loosening it, and rinsing it away.',
		'Grease must remain present inside micelles until it is visibly carried away by rinsing.'
	],
	'space-before-big-bang': [
		'Direct visibility may have a boundary, but evidence and inference must not be shown ending at one hard line.',
		'Inflation must look inferred rather than directly observed; anything earlier must remain explicitly unknown.'
	]
};

const visualModels: Record<string, VisualPrimitive> = {
	'health-vaccines': {
		kind: 'immune_response',
		antigenFormsDisplay: 'alternatives_not_combined',
		stages: [
			{ id: 'vaccination', label: 'Vaccination', type: 'vaccination', sequenceIndex: 0 },
			{ id: 'memory', label: 'Immune memory', type: 'memory', sequenceIndex: 1 },
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
	'everyday-soap': {
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
	'space-before-big-bang': {
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
	}
};

export function toV2Contract(id: string): LessonContractV2 {
	const original = lessonContracts.find((contract) => contract.id === id);
	if (!original) throw new Error(`Unknown lesson contract: ${id}`);

	const sourceBasis = [...original.sourceBasis, ...(additionalSources[original.id] ?? [])];
	const sources = sourceBasis.map((source, sourceIndex) => {
		const sourceId = `${original.id}-source-${sourceIndex + 1}`;
		return {
			id: sourceId,
			title: source.title,
			authority: source.authority,
			url: source.url,
			claims: source.claims.map((text, claimIndex) => ({
				id: `${sourceId}-claim-${claimIndex + 1}`,
				text
			}))
		};
	});

	const rest = Object.fromEntries(
		Object.entries(original).filter(([key]) => key !== 'sourceBasis')
	);
	return LessonContractV2Schema.parse({
		...rest,
		...(contractOverrides[original.id] ?? {}),
		sources,
		visualModel: visualModels[original.id] ?? null,
		visualConstraints: visualConstraints[original.id] ?? [
			'Visuals must not imply the reverse of any approved source claim.'
		]
	});
}

export const v2ContractIds = lessonContracts.map((contract) => contract.id);
