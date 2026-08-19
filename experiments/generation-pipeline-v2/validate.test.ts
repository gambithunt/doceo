import { describe, expect, it } from 'vitest';
import { toV2Contract } from './contracts.ts';
import type { LessonDraftV2 } from './schema.ts';
import { validateDraft } from './validate.ts';

const contract = toV2Contract('everyday-airplane-lift');
const claimId = contract.sources[0].claims[0].id;

function validDraft(): LessonDraftV2 {
	return {
		title: 'How a wing makes lift',
		focusedIdea: contract.focusedIdea,
		learnerOutcome: contract.learnerOutcome,
		scenes: [
			['invitation', 20, 'Start with the force question.', 'Show a flying wing.'],
			['contrast', 20, 'Test the equal transit story.', 'Compare marked air packets.'],
			['explanatory move', 20, 'Map the pressure around the wing.', 'Reveal a pressure field.'],
			['transformation', 20, 'Follow the air turning downward.', 'Bend streamlines behind it.'],
			['synthesis', 20, 'Join the two descriptions.', 'Combine the field and streamlines.']
		].map(([role, durationSeconds, narration, visualDirection], index) => ({
			role: role as LessonDraftV2['scenes'][number]['role'],
			title: `Scene ${index + 1}`,
			durationSeconds: durationSeconds as number,
			narration: narration as string,
			captions: [`Caption ${index + 1}`],
			visualDirection: visualDirection as string,
			visualModelStateIds: [],
			visualAssertions: [
				{
					statement: visualDirection as string,
					sourceClaimIds: [claimId]
				}
			],
			motionRationale: `Motion reason ${index + 1}`,
			sourceClaimIds: [claimId]
		})),
		constraintCoverage: contract.visualConstraints.map((_, constraintIndex) => ({
			constraintIndex,
			sceneNumbers: [Math.min(constraintIndex + 1, 5)]
		})),
		check: {
			invitation: 'Want to test it?',
			interactionType: 'choice',
			action: 'Choose the false assumption.',
			prompt: 'Which assumption breaks the explanation?',
			choices: [
				{ id: 'equal', label: 'The air must reunite.' },
				{ id: 'pressure', label: 'Air exerts pressure.' },
				{ id: 'turning', label: 'The wing turns air.' }
			],
			supportedResponseIds: ['equal'],
			successEvidence: 'The learner rejects forced reunion.',
			misconceptionEvidence: 'The learner selects a valid flow feature.',
			feedbackWhenSupported: 'Exactly—the reunion rule was invented.',
			feedbackWhenNotYet: 'Look for the claim that forces two packets to meet.'
		}
	};
}

describe('validateDraft', () => {
	it('accepts a structurally sound draft', () => {
		expect(validateDraft(contract, validDraft())).toMatchObject({ passed: true });
	});

	it('rejects the real failure modes from the first spike', () => {
		const draft = validDraft();
		draft.scenes[0].durationSeconds = 8;
		draft.scenes[0].sourceClaimIds = ['NASA said so'];
		draft.scenes[1].narration = draft.scenes[0].narration;
		draft.scenes[2].captions = ['Follow the approved outcome in the lesson contract.'];
		draft.check.choices = draft.check.choices.slice(0, 2);
		draft.check.supportedResponseIds = ['missing'];

		const codes = validateDraft(contract, draft).issues.map((issue) => issue.code);
		expect(codes).toEqual(
			expect.arrayContaining([
				'duration_out_of_range',
				'unknown_source_claim',
				'duplicate_content',
				'contract_language_leak',
				'guessable_fixed_choice',
				'dangling_supported_response'
			])
		);
	});

	it('rejects choice IDs without matching choices', () => {
		const draft = validDraft();
		draft.check.supportedResponseIds = ['A'];
		expect(validateDraft(contract, draft).passed).toBe(false);
	});

	it('rejects missing and unknown visual traceability', () => {
		const draft = validDraft();
		draft.scenes[0].visualAssertions[0].sourceClaimIds = ['missing-claim'];
		draft.constraintCoverage = draft.constraintCoverage.slice(1);
		const codes = validateDraft(contract, draft).issues.map((issue) => issue.code);
		expect(codes).toEqual(
			expect.arrayContaining(['unknown_source_claim', 'missing_visual_constraint'])
		);
	});

	it('rejects ambiguous pressure-color semantics', () => {
		const draft = validDraft();
		draft.scenes[0].visualDirection = 'Show a denser pressure-color field above the wing.';
		const result = validateDraft(contract, draft);
		expect(result.issues).toContainEqual(
			expect.objectContaining({ code: 'ambiguous_pressure_encoding' })
		);
	});

	it('allows a pressure legend to carry into a later scene', () => {
		const draft = validDraft();
		draft.scenes[0].visualDirection =
			'Show pressure colors with a visible legend: blue is lower and orange is higher.';
		draft.scenes[1].visualDirection = 'Reuse the same pressure colors on the same wing.';
		expect(validateDraft(contract, draft).passed).toBe(true);
	});

	it('does not treat internal production rationale as learner-facing text', () => {
		const draft = validDraft();
		draft.scenes[0].motionRationale = 'This protects the safe boundary in the contract.';
		expect(validateDraft(contract, draft).passed).toBe(true);
	});

	it('allows a stable legend caption to repeat across scenes', () => {
		const draft = validDraft();
		draft.scenes[0].captions = ['Lower pressure'];
		draft.scenes[1].captions = ['Lower pressure'];
		expect(validateDraft(contract, draft).passed).toBe(true);
	});

	it('requires the contract-specific visual model kind', () => {
		const draft = validDraft();
		const healthContract = { ...toV2Contract('health-vaccines'), visualModel: null };
		const result = validateDraft(healthContract, draft);
		expect(result.issues).toContainEqual(
			expect.objectContaining({ code: 'missing_required_visual_primitive' })
		);
	});

	it('rejects scene references to missing visual-model states', () => {
		const draft = validDraft();
		draft.scenes[0].visualModelStateIds = ['missing'];
		expect(validateDraft(contract, draft).issues).toContainEqual(
			expect.objectContaining({ code: 'unknown_visual_model_state' })
		);
	});
});
