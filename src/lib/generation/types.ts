export const generatableContractIds = ['health-vaccines', 'space-before-big-bang'] as const;

export type GeneratableContractId = (typeof generatableContractIds)[number];
export type GenerationPhase =
	'queued' | 'preflight' | 'drafting' | 'reviewing' | 'approved' | 'rejected' | 'failed';

export type GenerationJobView = {
	id: string;
	contractId: GeneratableContractId;
	phase: GenerationPhase;
	message: string;
	createdAt: string;
	updatedAt: string;
	artifact?: unknown;
};
