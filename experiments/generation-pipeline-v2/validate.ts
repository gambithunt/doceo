import type { LessonContractV2, LessonDraftV2 } from './schema.ts';
import { validateVisualPrimitive } from './visual-primitives.ts';

export type ValidationIssue = {
	level: 'error' | 'warning';
	code: string;
	path: string;
	message: string;
};

const fixedChoiceTypes = new Set(['choice', 'prediction', 'match']);
const leakedLanguage = [
	/lesson contract/i,
	/approved (?:outline|outcome|claim)/i,
	/source claim ids?/i,
	/safe boundary/i,
	/system prompt/i
];
const requiredPrimitiveKinds = new Map<string, string>([
	['health-vaccines', 'immune_response'],
	['everyday-soap', 'containment_sequence'],
	['space-before-big-bang', 'timeline']
]);

function normalized(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

function learnerFacingText(draft: LessonDraftV2) {
	return [
		draft.title,
		draft.focusedIdea,
		draft.learnerOutcome,
		...draft.scenes.flatMap((scene) => [scene.title, scene.narration, ...scene.captions]),
		draft.check.invitation,
		draft.check.action,
		draft.check.prompt,
		...draft.check.choices.map((choice) => choice.label),
		draft.check.feedbackWhenSupported,
		draft.check.feedbackWhenNotYet
	];
}

export function validateDraft(contract: LessonContractV2, draft: LessonDraftV2) {
	const issues: ValidationIssue[] = [];
	const claimIds = new Set(
		contract.sources.flatMap((source) => source.claims.map((claim) => claim.id))
	);
	const totalDuration = draft.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
	const visualModelIssues = contract.visualModel
		? validateVisualPrimitive(contract.visualModel)
		: [];
	for (const primitiveIssue of visualModelIssues) {
		issues.push({
			level: 'error',
			code: primitiveIssue.code,
			path: 'contract.visualModel',
			message: primitiveIssue.message
		});
	}
	const visualModelStateIds = new Set<string>();
	if (contract.visualModel?.kind === 'timeline') {
		for (const event of contract.visualModel.events) visualModelStateIds.add(event.id);
	} else if (contract.visualModel?.kind === 'immune_response') {
		for (const stage of contract.visualModel.stages) visualModelStateIds.add(stage.id);
	} else if (contract.visualModel?.kind === 'containment_sequence') {
		for (const state of contract.visualModel.states) visualModelStateIds.add(state.id);
	}

	if (totalDuration < 90 || totalDuration > 120) {
		issues.push({
			level: 'error',
			code: 'duration_out_of_range',
			path: 'scenes',
			message: `Lesson is ${totalDuration}s; required range is 90–120s.`
		});
	}

	let pressureLegendEstablished = false;
	for (const [index, scene] of draft.scenes.entries()) {
		const citedClaimIds = [
			...scene.sourceClaimIds,
			...scene.visualAssertions.flatMap((assertion) => assertion.sourceClaimIds)
		];
		for (const claimId of citedClaimIds) {
			if (!claimIds.has(claimId)) {
				issues.push({
					level: 'error',
					code: 'unknown_source_claim',
					path: `scenes.${index}.sourceClaimIds`,
					message: `Unknown source claim ID: ${claimId}`
				});
			}
		}
		const visual = scene.visualDirection;
		for (const stateId of scene.visualModelStateIds) {
			if (!visualModelStateIds.has(stateId)) {
				issues.push({
					level: 'error',
					code: 'unknown_visual_model_state',
					path: `scenes.${index}.visualModelStateIds`,
					message: `Scene references unknown visual-model state: ${stateId}`
				});
			}
		}
		const usesPressureColor = /pressure[- ]?colou?r/i.test(visual);
		const definesPressureColor = /(lower|higher|legend|key)/i.test(visual);
		if (usesPressureColor && !definesPressureColor && !pressureLegendEstablished) {
			issues.push({
				level: 'error',
				code: 'ambiguous_pressure_encoding',
				path: `scenes.${index}.visualDirection`,
				message: 'Pressure colors need explicit lower/higher labels or a visible legend.'
			});
		}
		if (usesPressureColor && definesPressureColor) pressureLegendEstablished = true;
	}

	const requiredPrimitiveKind = requiredPrimitiveKinds.get(contract.id);
	if (requiredPrimitiveKind && contract.visualModel?.kind !== requiredPrimitiveKind) {
		issues.push({
			level: 'error',
			code: 'missing_required_visual_primitive',
			path: 'contract.visualModel',
			message: `${contract.id} requires a ${requiredPrimitiveKind} visual primitive.`
		});
	}
	if (contract.id === 'health-vaccines' && contract.visualModel?.kind === 'immune_response') {
		const stageTypes = new Set(contract.visualModel.stages.map((stage) => stage.type));
		for (const requiredStage of [
			'vaccination',
			'memory',
			'reexposure',
			'rapid_antibody_response'
		] as const) {
			if (!stageTypes.has(requiredStage)) {
				issues.push({
					level: 'error',
					code: 'missing_required_immune_stage',
					path: 'visualModel',
					message: `Vaccine visual model requires stage: ${requiredStage}`
				});
			}
		}
		for (const requiredMeaning of [
			'rapid_antibody_response',
			'infection_still_possible'
		] as const) {
			if (!contract.visualModel.protectionMeanings.includes(requiredMeaning)) {
				issues.push({
					level: 'error',
					code: 'missing_required_protection_meaning',
					path: 'visualModel',
					message: `Vaccine visual model requires meaning: ${requiredMeaning}`
				});
			}
		}
	}
	if (contract.id === 'space-before-big-bang' && contract.visualModel?.kind === 'timeline') {
		const byConcept = new Map(contract.visualModel.events.map((event) => [event.concept, event]));
		const requiredStatuses = new Map([
			['unknown_before', 'unknown'],
			['inflation', 'inferred'],
			['observed_evidence', 'observed']
		] as const);
		for (const [concept, status] of requiredStatuses) {
			const event = byConcept.get(concept);
			if (!event || event.epistemicStatus !== status) {
				issues.push({
					level: 'error',
					code: 'missing_required_cosmology_event',
					path: 'visualModel',
					message: `Cosmology timeline requires ${concept} with ${status} status.`
				});
			}
		}
		const inflation = byConcept.get('inflation');
		const evidence = byConcept.get('observed_evidence');
		if (
			inflation &&
			evidence &&
			!contract.visualModel.evidenceLinks.some(
				(link) =>
					link.fromEventId === evidence.id &&
					link.toEventId === inflation.id &&
					link.relationship === 'supports_inference'
			)
		) {
			issues.push({
				level: 'error',
				code: 'missing_inflation_evidence_link',
				path: 'visualModel',
				message: 'Observed evidence must explicitly support the inflation inference.'
			});
		}
	}

	const coverageCounts = new Map<number, number>();
	for (const [index, coverage] of draft.constraintCoverage.entries()) {
		coverageCounts.set(
			coverage.constraintIndex,
			(coverageCounts.get(coverage.constraintIndex) ?? 0) + 1
		);
		if (coverage.constraintIndex >= contract.visualConstraints.length) {
			issues.push({
				level: 'error',
				code: 'unknown_visual_constraint',
				path: `constraintCoverage.${index}.constraintIndex`,
				message: `Visual constraint ${coverage.constraintIndex} does not exist.`
			});
		}
		for (const sceneNumber of coverage.sceneNumbers) {
			if (sceneNumber > draft.scenes.length) {
				issues.push({
					level: 'error',
					code: 'unknown_constraint_scene',
					path: `constraintCoverage.${index}.sceneNumbers`,
					message: `Constraint coverage refers to missing scene ${sceneNumber}.`
				});
			}
		}
	}
	for (const constraintIndex of contract.visualConstraints.keys()) {
		const count = coverageCounts.get(constraintIndex) ?? 0;
		if (count !== 1) {
			issues.push({
				level: 'error',
				code: count === 0 ? 'missing_visual_constraint' : 'duplicate_visual_constraint',
				path: 'constraintCoverage',
				message: `Visual constraint ${constraintIndex} must be covered exactly once.`
			});
		}
	}

	for (const [index, value] of learnerFacingText(draft).entries()) {
		if (leakedLanguage.some((pattern) => pattern.test(value))) {
			issues.push({
				level: 'error',
				code: 'contract_language_leak',
				path: `learnerText.${index}`,
				message: `Internal generation language appears in learner-facing text: ${value}`
			});
		}
	}

	const repeatedFields: Array<[string, string]> = draft.scenes.flatMap((scene, index) => [
		[`scenes.${index}.narration`, scene.narration] as [string, string],
		[`scenes.${index}.visualDirection`, scene.visualDirection] as [string, string]
	]);
	const firstPathByText = new Map<string, string>();
	for (const [path, value] of repeatedFields) {
		const key = normalized(value);
		const firstPath = firstPathByText.get(key);
		if (key.length >= 12 && firstPath) {
			issues.push({
				level: 'error',
				code: 'duplicate_content',
				path,
				message: `Duplicates learner content at ${firstPath}.`
			});
		} else {
			firstPathByText.set(key, path);
		}
	}

	const choiceIds = draft.check.choices.map((choice) => choice.id);
	const choiceIdSet = new Set(choiceIds);
	if (choiceIdSet.size !== choiceIds.length) {
		issues.push({
			level: 'error',
			code: 'duplicate_choice_id',
			path: 'check.choices',
			message: 'Choice IDs must be unique.'
		});
	}
	for (const supportedId of draft.check.supportedResponseIds) {
		if (!choiceIdSet.has(supportedId)) {
			issues.push({
				level: 'error',
				code: 'dangling_supported_response',
				path: 'check.supportedResponseIds',
				message: `Supported response ${supportedId} is not a choice.`
			});
		}
	}

	if (fixedChoiceTypes.has(draft.check.interactionType)) {
		if (draft.check.choices.length < 3) {
			issues.push({
				level: 'error',
				code: 'guessable_fixed_choice',
				path: 'check.choices',
				message: 'A fixed-choice evidence check needs at least three plausible choices.'
			});
		}
		if (draft.check.supportedResponseIds.length === 0) {
			issues.push({
				level: 'error',
				code: 'missing_supported_response',
				path: 'check.supportedResponseIds',
				message: 'A fixed-choice check needs at least one supported response.'
			});
		}
	} else if (draft.check.choices.length > 0 || draft.check.supportedResponseIds.length > 0) {
		issues.push({
			level: 'error',
			code: 'invalid_free_response_choices',
			path: 'check',
			message: 'Free-response interactions must use empty choices and supportedResponseIds arrays.'
		});
	}

	if (normalized(draft.focusedIdea) !== normalized(contract.focusedIdea)) {
		issues.push({
			level: 'warning',
			code: 'focused_idea_changed',
			path: 'focusedIdea',
			message: 'Draft rephrased the focused idea; reviewer must confirm it stayed narrow.'
		});
	}

	return {
		passed: !issues.some((issue) => issue.level === 'error'),
		totalDurationSeconds: totalDuration,
		issues
	};
}
