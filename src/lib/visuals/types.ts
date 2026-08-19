export type VisualNodeStatus =
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
};

export type VisualFrame = {
	kicker: string;
	title: string;
	caption: string;
	activeStateIds: string[];
};

export type VisualLessonCheck = {
	invitation: string;
	prompt: string;
	choices: Array<{ id: string; label: string }>;
	supportedResponseIds: string[];
	feedbackWhenSupported: string;
	feedbackWhenNotYet: string;
};

export type VisualLessonFixture = {
	id: string;
	artifactVersion: string;
	kind: 'timeline' | 'immune-response' | 'containment-sequence';
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
