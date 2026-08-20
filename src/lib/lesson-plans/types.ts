export type LessonPlanPhase =
	'queued' | 'auditing' | 'planning' | 'reviewing' | 'ready' | 'rejected' | 'failed';

export type LessonPlanPreview = {
	focusedIdea: string;
	learnerOutcome: string;
	visualFamily: string;
	visualStates: string[];
};

export type LessonPlanJobView = {
	id: string;
	answerId: string;
	question: string;
	phase: LessonPlanPhase;
	message: string;
	createdAt: string;
	updatedAt: string;
	preview?: LessonPlanPreview;
	lesson?: VisualLessonFixture;
	boundaryStage?: 'evidence' | 'visual';
};
import type { VisualLessonFixture } from '$lib/visuals/types';
