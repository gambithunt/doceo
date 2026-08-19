import type { LessonContractV2 } from './schema.ts';
import type { CompactLessonDraft } from './compact-schema.ts';

export type CompactValidationIssue = { code: string; message: string };

function modelStateIds(contract: LessonContractV2) {
	const model = contract.visualModel;
	if (!model) return [];
	if (model.kind === 'timeline')
		return model.events.map(({ id, sequenceIndex }) => ({ id, sequenceIndex }));
	if (model.kind === 'immune_response') {
		return model.stages.map(({ id, sequenceIndex }) => ({ id, sequenceIndex }));
	}
	if (model.kind === 'containment_sequence') {
		return model.states.map(({ id, sequenceIndex }) => ({ id, sequenceIndex }));
	}
	return [];
}

export function normalizeCompactDraft(
	contract: LessonContractV2,
	draft: CompactLessonDraft
): CompactLessonDraft {
	const sequenceById = new Map(
		modelStateIds(contract).map((state) => [state.id, state.sequenceIndex])
	);
	return {
		...draft,
		scenes: draft.scenes.map((scene) => ({
			...scene,
			visualModelStateIds: [...new Set(scene.visualModelStateIds)].sort(
				(a, b) =>
					(sequenceById.get(a) ?? Number.MAX_SAFE_INTEGER) -
					(sequenceById.get(b) ?? Number.MAX_SAFE_INTEGER)
			)
		}))
	};
}

function wordCount(value: string) {
	return value.trim().split(/\s+/).filter(Boolean).length;
}

export function validateCompactDraft(contract: LessonContractV2, draft: CompactLessonDraft) {
	const issues: CompactValidationIssue[] = [];
	const states = modelStateIds(contract).sort((a, b) => a.sequenceIndex - b.sequenceIndex);
	const sequenceById = new Map(states.map((state) => [state.id, state.sequenceIndex]));
	const usedStates = new Set<string>();

	if (!states.length) {
		issues.push({
			code: 'missing_canonical_model',
			message: 'Compact lessons require a canonical visual model.'
		});
	}

	for (const [index, scene] of draft.scenes.entries()) {
		if (wordCount(scene.title) > 9) {
			issues.push({
				code: 'long_scene_title',
				message: `Scene ${index + 1} title exceeds nine words.`
			});
		}
		if (wordCount(scene.narration) > 55) {
			issues.push({
				code: 'long_scene_narration',
				message: `Scene ${index + 1} narration exceeds 55 words.`
			});
		}
		const indexes: number[] = [];
		for (const stateId of scene.visualModelStateIds) {
			const sequenceIndex = sequenceById.get(stateId);
			if (sequenceIndex === undefined) {
				issues.push({
					code: 'unknown_visual_state',
					message: `Scene ${index + 1} references unknown state ${stateId}.`
				});
				continue;
			}
			usedStates.add(stateId);
			indexes.push(sequenceIndex);
		}
		if (indexes.some((value, position) => position > 0 && value < indexes[position - 1])) {
			issues.push({
				code: 'reversed_visual_states',
				message: `Scene ${index + 1} must list visual states in canonical order.`
			});
		}
	}

	for (const state of states) {
		if (!usedStates.has(state.id)) {
			issues.push({
				code: 'unused_visual_state',
				message: `Canonical state ${state.id} is never used.`
			});
		}
	}

	const choiceIds = new Set(draft.check.choices.map((choice) => choice.id));
	if (choiceIds.size !== draft.check.choices.length) {
		issues.push({ code: 'duplicate_choice_id', message: 'Check choice IDs must be unique.' });
	}
	for (const supportedId of draft.check.supportedResponseIds) {
		if (!choiceIds.has(supportedId)) {
			issues.push({
				code: 'unknown_supported_choice',
				message: `Supported response ${supportedId} is not a choice.`
			});
		}
	}

	return { passed: issues.length === 0, issues };
}
