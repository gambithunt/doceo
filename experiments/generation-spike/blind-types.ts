import type { GeneratedCheck, GeneratedScene } from './schema.ts';

export type BlindSource = {
	title: string;
	authority: string;
	url: string;
};

export type BlindLesson = {
	title: string;
	focusedIdea: string;
	learnerOutcome: string;
	lessonDurationSeconds: number;
	sourceBasis: BlindSource[];
	scenes: GeneratedScene[];
	check: GeneratedCheck;
};
