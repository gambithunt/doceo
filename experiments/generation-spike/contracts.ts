import { LessonContractSchema, type LessonContract } from './schema.ts';

const contracts: LessonContract[] = [
	{
		id: 'space-orbits',
		domain: 'space and physical science',
		difficulty: 'representative',
		topic: 'Why planets keep orbiting instead of falling into their stars',
		learnerIntent: 'Understand what keeps a planet in orbit.',
		startingPoint: 'The learner knows that gravity pulls objects together.',
		chosenApproach: 'A moving visual thought experiment with a sideways-thrown object.',
		focusedIdea:
			'An orbit is continuous falling in which sideways motion keeps missing the central body.',
		learnerOutcome:
			'Predict how changing sideways speed changes a path from impact to orbit or escape.',
		prerequisites: ['Gravity pulls masses together.', 'Moving objects have speed and direction.'],
		likelyMisconceptions: [
			'There is no gravity in space.',
			'A separate outward force exactly cancels gravity.',
			'Orbits require engines to keep pushing.'
		],
		teachingPattern: 'process and consequence',
		sourceBasis: [
			{
				title: 'How did our Solar System form?',
				authority: 'NASA Science',
				url: 'https://science.nasa.gov/astrobiology/learning-resources/alp/how-did-our-solar-system-form/',
				claims: ['Planets and moons are held in orbit around the Sun by gravitational pull.']
			}
		],
		mediaRationale:
			'A path that bends more or less as speed changes makes continuous falling visible.',
		optionalEvidenceTarget:
			'The learner distinguishes impact, orbit, and escape from a change in sideways speed.',
		safeBoundary: 'Do not describe orbit as two balanced forces or imply that gravity disappears.'
	},
	{
		id: 'space-starlight',
		domain: 'space and physical science',
		difficulty: 'representative',
		topic: 'How stars make light',
		learnerIntent: 'Understand where a star’s light and heat come from.',
		startingPoint:
			'The learner recognizes the Sun as a star but may think it is burning like a fire.',
		chosenApproach:
			'Travel from a star’s gravity-compressed core to energy escaping from its surface.',
		focusedIdea:
			'A star shines because fusion in its hot, compressed core converts a small amount of mass into energy.',
		learnerOutcome: 'Distinguish nuclear fusion in a star from chemical burning in a flame.',
		prerequisites: ['Matter is made of atoms.', 'Gravity compresses massive objects.'],
		likelyMisconceptions: [
			'The Sun is made of fire and needs oxygen.',
			'Light is produced across the whole star in the same way.',
			'Fusion means atoms simply stick together without an energy change.'
		],
		teachingPattern: 'process and consequence',
		sourceBasis: [
			{
				title: 'Chapter 1 — A Star Is Born',
				authority: 'NASA Science',
				url: 'https://science.nasa.gov/exoplanets/resources/life-and-death/chapter-1/',
				claims: [
					'A protostar becomes a star when its core is hot enough for hydrogen fusion.',
					'Fusion of hydrogen into helium releases enormous amounts of energy.'
				]
			}
		],
		mediaRationale:
			'Scale changes from crushing gravity to nuclei colliding, then follows energy outward.',
		optionalEvidenceTarget:
			'The learner selects fusion rather than combustion as the source of starlight.',
		safeBoundary:
			'Do not imply that energy travels instantly from the core or that all stellar fusion is identical.'
	},
	{
		id: 'space-before-big-bang',
		domain: 'space and physical science',
		difficulty: 'hard',
		topic: 'What, if anything, came before the Big Bang',
		learnerIntent: 'Understand what science can honestly say about “before” the Big Bang.',
		startingPoint: 'The learner has heard that the Big Bang was the beginning of the universe.',
		chosenApproach:
			'Separate observation, model, and speculation using a rewindable evidence timeline.',
		focusedIdea:
			'The hot early universe is strongly evidenced, while what triggered it or whether “before” is meaningful remains unknown.',
		learnerOutcome:
			'Distinguish established evidence about the early universe from hypotheses about an earlier state.',
		prerequisites: ['Looking farther into space also looks farther back in time.'],
		likelyMisconceptions: [
			'The Big Bang was an explosion from one point into empty space.',
			'Cosmologists have directly observed the first instant.',
			'Any proposed pre-Big-Bang model is established fact.'
		],
		teachingPattern: 'evidence to inference',
		sourceBasis: [
			{
				title: 'Webb Telescope & The Big Bang',
				authority: 'NASA Science',
				url: 'https://science.nasa.gov/mission/webb/big-bang-q-and-a/',
				claims: [
					'The Big Bang itself is not directly visible.',
					'Expansion and the all-sky leftover heat support a hot early universe.'
				]
			},
			{
				title: 'Hubble Big Bang',
				authority: 'NASA Science',
				url: 'https://science.nasa.gov/mission/hubble/science/science-behind-the-discoveries/hubble-big-bang/',
				claims: ['We do not know what triggered the initial rapid expansion.']
			}
		],
		mediaRationale:
			'A timeline that becomes observationally foggy communicates the boundary of evidence without presenting uncertainty as emptiness.',
		optionalEvidenceTarget: 'The learner classifies claims as observed, inferred, or speculative.',
		safeBoundary:
			'State uncertainty explicitly; do not present inflation, cyclic universes, or quantum proposals as settled.'
	},
	{
		id: 'everyday-soap',
		domain: 'everyday science and how things work',
		difficulty: 'representative',
		topic: 'Why soap helps water remove grease and dirt',
		learnerIntent: 'Understand why rinsing with water alone often leaves greasy dirt behind.',
		startingPoint: 'The learner has used soap but may think it mainly kills germs.',
		chosenApproach: 'Zoom into soap molecules surrounding oily dirt, followed by rinsing.',
		focusedIdea:
			'Soap helps water carry away grease by forming structures that trap oily material and lift it from a surface.',
		learnerOutcome:
			'Explain why soap plus rubbing and rinsing removes greasy dirt better than water alone.',
		prerequisites: ['Oil and water do not mix easily.'],
		likelyMisconceptions: [
			'Plain soap works mainly by killing every germ.',
			'Hot water alone reliably kills germs on hands.',
			'Lather is only decorative foam.'
		],
		teachingPattern: 'process and consequence',
		sourceBasis: [
			{
				title: 'Hand Hygiene Frequently Asked Questions',
				authority: 'US Centers for Disease Control and Prevention',
				url: 'https://www.cdc.gov/clean-hands/faq/index.html',
				claims: [
					'Soap lather forms micelles that trap and remove germs, chemicals, and dirt.',
					'Scrubbing and rinsing physically remove material from skin.'
				]
			}
		],
		mediaRationale:
			'A molecular-scale transformation shows oil becoming transportable rather than mysteriously vanishing.',
		optionalEvidenceTarget:
			'The learner orders wetting, lathering and rubbing, then rinsing by their functional roles.',
		safeBoundary:
			'Do not claim plain soap sterilizes skin or that more foam necessarily means better cleaning.'
	},
	{
		id: 'everyday-refrigerator',
		domain: 'everyday science and how things work',
		difficulty: 'representative',
		topic: 'How a refrigerator makes its inside cold',
		learnerIntent: 'Understand where the heat inside a refrigerator goes.',
		startingPoint: 'The learner knows a refrigerator uses electricity.',
		chosenApproach: 'Follow a packet of heat through the refrigerant loop from inside to the room.',
		focusedIdea:
			'A refrigerator does not create cold; it uses work to move heat from inside the cabinet into the room.',
		learnerOutcome: 'Trace heat from the food compartment to the coils outside the refrigerator.',
		prerequisites: ['Heat tends to flow from warmer objects to cooler surroundings.'],
		likelyMisconceptions: [
			'The refrigerator produces cold as a substance.',
			'Opening the door cools the room.',
			'The rear coils should be cold.'
		],
		teachingPattern: 'process and consequence',
		sourceBasis: [
			{
				title: 'Technical Support Document for Refrigerators and Freezers',
				authority: 'US Department of Energy',
				url: 'https://www1.eere.energy.gov/buildings/appliance_standards/pdfs/refrig_finalrule_tsd.pdf',
				claims: [
					'Residential refrigerators and freezers work by removing heat from their interior.'
				]
			}
		],
		mediaRationale:
			'A closed-loop animation makes the direction of energy transfer and the warm external coils visible.',
		optionalEvidenceTarget:
			'The learner predicts that opening the door cannot cool a closed room overall.',
		safeBoundary:
			'Do not imply refrigerant is consumed each cycle or ignore the compressor’s added energy.'
	},
	{
		id: 'everyday-airplane-lift',
		domain: 'everyday science and how things work',
		difficulty: 'hard',
		topic: 'How an airplane wing produces lift',
		learnerIntent: 'Understand why a heavy airplane can stay in the air.',
		startingPoint:
			'The learner knows moving air matters but may have heard the equal-transit explanation.',
		chosenApproach: 'Compare real airflow around a wing with the popular equal-transit story.',
		focusedIdea:
			'A wing produces lift by shaping a pressure distribution and turning airflow downward; Bernoulli and Newton describe the same flow, not rival causes.',
		learnerOutcome:
			'Reject equal-transit reasoning and identify pressure distribution plus airflow turning as compatible descriptions of lift.',
		prerequisites: ['Forces change motion.', 'Air is a moving fluid that exerts pressure.'],
		likelyMisconceptions: [
			'Air split at the front must meet again at the trailing edge.',
			'Bernoulli and Newton provide mutually exclusive explanations.',
			'Only the lower surface pushes the airplane upward.'
		],
		teachingPattern: 'compare and distinguish',
		sourceBasis: [
			{
				title: 'Bernoulli and Newton',
				authority: 'NASA Glenn Research Center',
				url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/bernoulli-and-newton/',
				claims: [
					'Pressure and velocity descriptions can both determine aerodynamic force.',
					'The equal-transit or longer-path theory is incorrect.',
					'Both upper and lower wing surfaces contribute to turning airflow.'
				]
			}
		],
		mediaRationale:
			'Paired particle paths and pressure fields can falsify equal transit while connecting two valid descriptions.',
		optionalEvidenceTarget:
			'The learner identifies the false assumption in an equal-transit diagram.',
		safeBoundary:
			'Avoid claiming that wing curvature alone or angle of attack alone universally explains lift.'
	},
	{
		id: 'math-equivalent-fractions',
		domain: 'foundational mathematics',
		difficulty: 'representative',
		topic: 'Why equivalent fractions name the same amount',
		learnerIntent:
			'Understand why multiplying a numerator and denominator by the same number does not change a fraction.',
		startingPoint: 'The learner reads a fraction as equal parts of one whole.',
		chosenApproach: 'Keep one bar fixed while subdividing each part into smaller equal pieces.',
		focusedIdea:
			'Equivalent fractions preserve the same quantity because the whole is repartitioned while the selected portion stays fixed.',
		learnerOutcome:
			'Construct an equivalent fraction and justify it by the unchanged portion of the same whole.',
		prerequisites: ['A fraction describes equal parts of a defined whole.'],
		likelyMisconceptions: [
			'A larger denominator always means a larger fraction.',
			'The numerator and denominator may be changed independently.',
			'Two drawings can be compared without using the same whole.'
		],
		teachingPattern: 'concrete to abstract',
		sourceBasis: [
			{
				title: 'Visualize Fractions',
				authority: 'OpenStax, Rice University',
				url: 'https://openstax.org/books/prealgebra/pages/4-1-visualize-fractions',
				claims: ['Fraction tiles can show that many fractions are equivalent to one half.']
			},
			{
				title: 'Multiply and Divide Fractions',
				authority: 'OpenStax, Rice University',
				url: 'https://openstax.org/books/prealgebra-2e/pages/4-2-multiply-and-divide-fractions',
				claims: ['A visual fraction model shows that six eighths is equivalent to three fourths.']
			}
		],
		mediaRationale:
			'An invariant filled region makes the symbolic multiplication a description of repartitioning.',
		optionalEvidenceTarget: 'The learner constructs three fourths using eighth-size pieces.',
		safeBoundary:
			'Always hold the whole constant and do not teach cross-multiplication as the explanation.'
	},
	{
		id: 'math-rectangle-area',
		domain: 'foundational mathematics',
		difficulty: 'representative',
		topic: 'Why rectangle area is length times width',
		learnerIntent: 'Understand the area formula rather than memorize it.',
		startingPoint: 'The learner can count objects in rows and columns.',
		chosenApproach:
			'Cover rectangles with unit squares, then compress repeated counting into multiplication.',
		focusedIdea:
			'Length times width counts the unit squares in equal rows that cover a rectangle without gaps or overlaps.',
		learnerOutcome: 'Explain and apply the rectangle area formula using square units.',
		prerequisites: [
			'Multiplication can count equal groups.',
			'A unit square has side length one unit.'
		],
		likelyMisconceptions: [
			'Area and perimeter measure the same thing.',
			'Area is measured in linear units.',
			'The formula is an arbitrary rule unrelated to covering.'
		],
		teachingPattern: 'concrete to abstract',
		sourceBasis: [
			{
				title: 'Use Properties of Rectangles, Triangles, and Trapezoids',
				authority: 'OpenStax, Rice University',
				url: 'https://openstax.org/books/prealgebra-2e/pages/9-4-use-properties-of-rectangles-triangles-and-trapezoids',
				claims: [
					'Area measures the region needed to cover a surface in square units.',
					'A two-by-three rectangle contains six unit squares, showing area equals length times width.'
				]
			}
		],
		mediaRationale:
			'Unit squares appear first individually and then organize into rows, making multiplication a compression of visible counting.',
		optionalEvidenceTarget:
			'The learner predicts area after one row or column is added and explains the change.',
		safeBoundary: 'Do not introduce the formula before defining the unit square and covered region.'
	},
	{
		id: 'math-conditional-probability',
		domain: 'foundational mathematics',
		difficulty: 'hard',
		topic: 'Why new information changes a probability',
		learnerIntent: 'Understand conditional probability without beginning from a formula.',
		startingPoint: 'The learner can count outcomes in a simple sample space.',
		chosenApproach: 'Filter a visible set of possibilities after receiving one new fact.',
		focusedIdea:
			'A conditional probability is recalculated within the smaller set of outcomes still possible after the condition is known.',
		learnerOutcome:
			'Update a probability by restricting the sample space before counting favorable outcomes.',
		prerequisites: ['Probability compares favorable outcomes with possible outcomes.'],
		likelyMisconceptions: [
			'New information changes the favorable count but not the possible count.',
			'P(A given B) always equals P(B given A).',
			'Conditional probability implies that B causes A.'
		],
		teachingPattern: 'concrete to abstract',
		sourceBasis: [
			{
				title: 'Statistics 3.1 — Terminology',
				authority: 'OpenStax, Rice University',
				url: 'https://openstax.org/books/statistics/pages/3-1-terminology',
				claims: [
					'Conditional probability reduces the sample space.',
					'P(A given B) is calculated from the outcomes within B.'
				]
			}
		],
		mediaRationale:
			'Physically dimming impossible outcomes makes the denominator change visible before notation appears.',
		optionalEvidenceTarget:
			'The learner filters the sample space correctly for a new condition before calculating.',
		safeBoundary: 'Do not conflate conditioning with causation or reverse the condition silently.'
	},
	{
		id: 'health-exercise-heart-rate',
		domain: 'human body and health',
		difficulty: 'representative',
		topic: 'Why the heart beats faster during exercise',
		learnerIntent: 'Understand what a rising heart rate accomplishes during activity.',
		startingPoint: 'The learner knows the heart pumps blood.',
		chosenApproach: 'Follow oxygen from lungs to working muscle as demand rises.',
		focusedIdea:
			'During exercise the heart beats faster to deliver more oxygen-rich blood to working muscles.',
		learnerOutcome: 'Connect increased muscle demand with increased blood flow and heart rate.',
		prerequisites: ['Blood carries oxygen.', 'Muscles need energy to work.'],
		likelyMisconceptions: [
			'A fast heart rate means the heart is failing.',
			'The heart speeds up only because the body gets hot.',
			'One resting heart-rate number is normal for everyone.'
		],
		teachingPattern: 'process and consequence',
		sourceBasis: [
			{
				title: 'How the Heart Beats',
				authority: 'National Heart, Lung, and Blood Institute, NIH',
				url: 'https://www.nhlbi.nih.gov/health/heart/heart-beats',
				claims: [
					'A heartbeat is a contraction that pumps blood to the lungs and body.',
					'During exercise heart rate increases to get more oxygen to muscles.'
				]
			}
		],
		mediaRationale:
			'A synchronized heart-lung-muscle flow shows the functional reason for the rate change.',
		optionalEvidenceTarget:
			'The learner predicts what happens to delivery demand when muscle activity increases.',
		safeBoundary:
			'Do not diagnose abnormal heart rates or prescribe exercise; note that individual responses vary.'
	},
	{
		id: 'health-vaccines',
		domain: 'human body and health',
		difficulty: 'representative',
		topic: 'How vaccines prepare the immune system',
		learnerIntent: 'Understand how vaccination can protect before an infection occurs.',
		startingPoint: 'The learner knows the immune system fights infection.',
		chosenApproach: 'Contrast a first encounter with a faster prepared response after vaccination.',
		focusedIdea:
			'Vaccines safely expose the immune system to an antigen so it can build a targeted response before the disease is encountered.',
		learnerOutcome:
			'Explain why prior immune preparation can make a later response faster and safer.',
		prerequisites: ['The immune system recognizes foreign material.'],
		likelyMisconceptions: [
			'Vaccines always contain a full-strength disease.',
			'Protection is immediate and perfect.',
			'Antibodies are the only part of immune memory.'
		],
		teachingPattern: 'contrast viewpoints',
		sourceBasis: [
			{
				title: 'Explaining How Vaccines Work',
				authority: 'US Centers for Disease Control and Prevention',
				url: 'https://www.cdc.gov/vaccines/basics/explaining-how-vaccines-work.html',
				claims: [
					'Vaccines imitate an infection to engage natural defenses without the dangers of full disease.',
					'Vaccine antigens may be weakened or killed organisms, pieces, genetic material, or treated toxins.',
					'Protection is not perfect.'
				]
			}
		],
		mediaRationale:
			'A repeated-threat timeline can show recognition and response speed without depicting the immune system as a literal army.',
		optionalEvidenceTarget:
			'The learner distinguishes immune preparation from treatment after becoming ill.',
		safeBoundary:
			'Do not give personal vaccination advice, claim perfect protection, or imply all vaccine types work identically.'
	},
	{
		id: 'health-antibiotics',
		domain: 'human body and health',
		difficulty: 'hard',
		topic: 'Why antibiotics do not treat viral infections',
		learnerIntent: 'Understand when antibiotics can and cannot help with an infection.',
		startingPoint: 'The learner knows antibiotics are medicines used for some infections.',
		chosenApproach:
			'Compare bacterial structures targeted by antibiotics with a virus using a host cell.',
		focusedIdea:
			'Antibiotics target features or processes of bacteria, so they do not act on viruses, which reproduce using host cells.',
		learnerOutcome:
			'Distinguish bacterial from viral infections as a reason antibiotics may or may not be useful.',
		prerequisites: ['Bacteria and viruses are different kinds of infectious agents.'],
		likelyMisconceptions: [
			'Antibiotics are strong general-purpose medicine for any infection.',
			'Green mucus or symptom severity alone proves a bacterial infection.',
			'Stopping treatment or sharing leftover antibiotics is harmless.'
		],
		teachingPattern: 'compare and distinguish',
		sourceBasis: [
			{
				title: 'Antibiotic Do’s and Don’ts',
				authority: 'US Centers for Disease Control and Prevention',
				url: 'https://www.cdc.gov/antibiotic-use/about/',
				claims: [
					'Antibiotics treat certain bacterial infections and do not work on viruses.',
					'Unnecessary antibiotics can cause side effects and contribute to antimicrobial resistance.',
					'Some bacterial infections improve without antibiotics.'
				]
			}
		],
		mediaRationale:
			'Side-by-side cellular targets show why the same drug mechanism cannot be assumed to affect both agents.',
		optionalEvidenceTarget:
			'The learner refuses to infer antibiotic need from “infection” alone and identifies that the cause matters.',
		safeBoundary:
			'Never diagnose from symptoms or advise starting, stopping, saving, or sharing medication; direct treatment decisions to a qualified clinician.'
	}
];

export const lessonContracts = contracts.map((contract) => LessonContractSchema.parse(contract));

export function getContract(id: string) {
	return lessonContracts.find((contract) => contract.id === id);
}
