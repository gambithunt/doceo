export const productName = 'Doceo';
export const homePrompt = 'What are you curious about today?';

export const homeSuggestions = [
	{ question: 'Why do cats purr?', illustration: 'cat' },
	{ question: 'What came before the Big Bang?', illustration: 'telescope' },
	{ question: 'Why do leaves change colour?', illustration: 'leaf' }
] as const;

export const returningHomeSuggestions = [
	{ question: 'Why does gravity change time?', illustration: 'clock' },
	{ question: 'How do we photograph something invisible?', illustration: 'telescope' },
	{ question: 'Why do cats purr?', illustration: 'cat' }
] as const;

export const exampleReturningHomeSuggestions = [
	{ question: "How do you weigh a star you can't touch?", illustration: 'clock' },
	{ question: 'What did the first black hole photograph show?', illustration: 'telescope' },
	{ question: 'Why do cats purr?', illustration: 'cat' }
] as const;

export const soapDeeperSuggestions = [
	{ question: 'How do micelles trap grease?', illustration: 'bubble' },
	{ question: "Why don't oil and water mix?", illustration: 'droplet' },
	{ question: 'How are detergents different from soap?', illustration: 'soap' }
] as const;

export const soapReinforcementSuggestions = [
	{ question: 'What happens when soap touches grease?', illustration: 'soap' },
	{ question: 'Where does the grease go when you rinse?', illustration: 'droplet' },
	{ question: "Why doesn't water remove grease by itself?", illustration: 'bubble' }
] as const;

export const soapAdjacentSuggestions = [
	{ question: 'Why do bubbles form?', illustration: 'bubble' },
	{ question: "Why don't oil and water mix?", illustration: 'droplet' },
	{ question: 'How does soap carry dirt away?', illustration: 'soap' }
] as const;
