import type { LessonContractV2, LessonDraftV2 } from './schema.ts';

export type RenderState = {
	id: string;
	label: string;
	sequenceIndex: number;
	status: string;
};

export type SceneRenderPlan = {
	sceneNumber: number;
	states: RenderState[];
};

export function buildRenderPlan(
	contract: LessonContractV2,
	draft: LessonDraftV2
): SceneRenderPlan[] {
	const model = contract.visualModel;
	if (!model) {
		return draft.scenes.map((_, index) => ({ sceneNumber: index + 1, states: [] }));
	}

	const states: RenderState[] =
		model.kind === 'timeline'
			? model.events.map((event) => ({
					id: event.id,
					label: event.label,
					sequenceIndex: event.sequenceIndex,
					status: event.epistemicStatus
				}))
			: model.kind === 'immune_response'
				? model.stages.map((stage) => ({
						id: stage.id,
						label: stage.label,
						sequenceIndex: stage.sequenceIndex,
						status: stage.type
					}))
				: model.kind === 'containment_sequence'
					? model.states.map((state) => ({
							id: state.id,
							label: state.label,
							sequenceIndex: state.sequenceIndex,
							status: state.materialState
						}))
					: [];
	const stateById = new Map(states.map((state) => [state.id, state]));

	return draft.scenes.map((scene, index) => ({
		sceneNumber: index + 1,
		states: scene.visualModelStateIds
			.map((id) => stateById.get(id))
			.filter((state): state is RenderState => Boolean(state))
			.sort((a, b) => a.sequenceIndex - b.sequenceIndex)
	}));
}
