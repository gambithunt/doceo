export type VisualNodeStatus =
	| 'fact'
	| 'unknown'
	| 'inferred'
	| 'observed'
	| 'vaccination'
	| 'immune-response'
	| 'memory'
	| 'reexposure'
	| 'rapid-response'
	| 'possible-infection'
	| 'reduced-severity'
	| 'on-surface'
	| 'soap-interacting'
	| 'dispersed-in-water-inside-micelles'
	| 'carried-away';

export type VisualNode = {
	id: string;
	label: string;
	sequenceIndex: number;
	status: VisualNodeStatus;
	relationshipToPrevious?:
		| 'start'
		| 'same_event'
		| 'earlier_to_later'
		| 'causes'
		| 'transforms_into'
		| 'contrasts_with'
		| 'contains'
		| 'part_of'
		| 'increases'
		| 'decreases'
		| 'answers';
};

export type VisualFrame = {
	kicker: string;
	title: string;
	caption: string;
	activeStateIds: string[];
};

export type VisualChoiceLessonCheck = {
	kind: 'choice';
	invitation: string;
	prompt: string;
	choices: Array<{ id: string; label: string }>;
	supportedResponseIds: string[];
	feedbackWhenSupported: string;
	feedbackWhenNotYet: string;
};

export type VisualRecallLessonCheck = {
	kind: 'recall';
	invitation: string;
	prompt: string;
	answer: string;
	choices?: never;
	supportedResponseIds?: never;
	feedbackWhenSupported?: never;
	feedbackWhenNotYet?: never;
};

export type VisualLessonCheck = VisualChoiceLessonCheck | VisualRecallLessonCheck;

export type VisualLessonFixture = {
	id: string;
	artifactVersion: string;
	kind:
		'timeline' | 'immune-response' | 'containment-sequence' | 'concept-sequence' | 'fact-reveal';
	title: string;
	nodes: VisualNode[];
	evidenceLinks: Array<{ from: string; to: string }>;
	frames: VisualFrame[];
	check?: VisualLessonCheck;
	provenance?: {
		approval: 'independently-reviewed';
		sources: Array<{ title: string; authority: string; url: string }>;
		reviewSummary: string;
		reviewNotes: string[];
	};
};
