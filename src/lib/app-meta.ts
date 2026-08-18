export const productName = 'Doceo';
export const homePrompt = 'What are you curious about today?';

export const homeSuggestions = [
	{ question: 'Why do cats purr?', illustration: 'cat' },
	{ question: 'How does time work?', illustration: 'clock' },
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
