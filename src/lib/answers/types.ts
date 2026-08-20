export type QuickAnswerSource = {
	title: string;
	authority: string;
	url: string;
};

export type QuickAnswer = {
	text: string;
	sources: QuickAnswerSource[];
};

export type AnswerPhase = 'queued' | 'researching' | 'answered';

export type AnswerJobView = {
	id: string;
	question: string;
	phase: AnswerPhase;
	message: string;
	createdAt: string;
	updatedAt: string;
	answer?: QuickAnswer;
};
