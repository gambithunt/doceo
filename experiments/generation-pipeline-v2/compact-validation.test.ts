import { describe, expect, it } from 'vitest';
import { toV2Contract } from './contracts.ts';
import { normalizeCompactDraft, validateCompactDraft } from './compact-validation.ts';
import type { CompactLessonDraft } from './compact-schema.ts';

function validDraft(): CompactLessonDraft {
	return {
		title: 'What science can say before the Big Bang',
		scenes: [
			{
				role: 'invitation',
				title: 'Begin with the unknown',
				narration: 'What preceded inflation remains unknown.',
				visualModelStateIds: ['unknown-before']
			},
			{
				role: 'grounding',
				title: 'Inflation is inferred',
				narration: 'Observations provide evidence for inflation without showing it directly.',
				visualModelStateIds: ['unknown-before', 'inflation']
			},
			{
				role: 'explanatory move',
				title: 'Evidence comes later',
				narration: 'Later observations provide evidence about the early universe.',
				visualModelStateIds: ['inflation', 'observed-evidence']
			},
			{
				role: 'synthesis',
				title: 'Keep the categories clear',
				narration: 'Separate what is observed, inferred, and unknown.',
				visualModelStateIds: ['unknown-before', 'inflation', 'observed-evidence']
			}
		],
		check: {
			invitation: 'Try a quick classification.',
			prompt: 'Which sequence is supported?',
			choices: [
				{ id: 'a', label: 'Unknown, inferred, observed' },
				{ id: 'b', label: 'Observed, known, inferred' },
				{ id: 'c', label: 'Known, observed, unknown' }
			],
			supportedResponseIds: ['a'],
			feedbackWhenSupported: 'Yes.',
			feedbackWhenNotYet: 'Try the evidence order again.'
		}
	};
}

describe('validateCompactDraft', () => {
	it('accepts a compact draft using the canonical timeline', () => {
		expect(validateCompactDraft(toV2Contract('space-before-big-bang'), validDraft()).passed).toBe(
			true
		);
	});

	it('rejects reversed canonical state order', () => {
		const draft = validDraft();
		draft.scenes[3].visualModelStateIds = ['observed-evidence', 'inflation', 'unknown-before'];
		expect(
			validateCompactDraft(toV2Contract('space-before-big-bang'), draft).issues
		).toContainEqual(expect.objectContaining({ code: 'reversed_visual_states' }));
	});

	it('normalizes visual state order without another model call', () => {
		const contract = toV2Contract('space-before-big-bang');
		const draft = validDraft();
		draft.scenes[3].visualModelStateIds = [
			'observed-evidence',
			'inflation',
			'unknown-before',
			'inflation'
		];
		const normalized = normalizeCompactDraft(contract, draft);
		expect(normalized.scenes[3].visualModelStateIds).toEqual([
			'unknown-before',
			'inflation',
			'observed-evidence'
		]);
		expect(validateCompactDraft(contract, normalized).passed).toBe(true);
	});

	it('rejects a check answer that is not present', () => {
		const draft = validDraft();
		draft.check.supportedResponseIds = ['missing'];
		expect(
			validateCompactDraft(toV2Contract('space-before-big-bang'), draft).issues
		).toContainEqual(expect.objectContaining({ code: 'unknown_supported_choice' }));
	});
});
