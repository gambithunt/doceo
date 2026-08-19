import { describe, expect, it } from 'vitest';
import { adaptApprovedVisualArtifact } from './artifact-adapter';

function approvedTimelineArtifact() {
	return {
		status: 'approved',
		createdAt: '2026-08-18T12:00:00.000Z',
		contract: {
			id: 'space-example',
			topic: 'An ordered space lesson',
			visualModel: {
				kind: 'timeline',
				direction: 'earlier_to_later',
				events: [
					{
						id: 'later',
						label: 'Later evidence',
						epistemicStatus: 'observed',
						sequenceIndex: 2
					},
					{
						id: 'unknown',
						label: 'Unknown before',
						epistemicStatus: 'unknown',
						sequenceIndex: 0
					},
					{
						id: 'inference',
						label: 'Inferred event',
						epistemicStatus: 'inferred',
						sequenceIndex: 1
					}
				],
				evidenceLinks: [
					{
						fromEventId: 'later',
						toEventId: 'inference',
						relationship: 'supports_inference'
					}
				]
			}
		},
		draft: {
			title: 'A safe timeline',
			scenes: [
				{
					role: 'explanatory move',
					title: 'Follow the evidence',
					narration: 'Later evidence supports an inference about an earlier event.',
					visualModelStateIds: ['later', 'inference']
				}
			],
			check: {
				invitation: 'Try it if you want.',
				prompt: 'Which statement follows the evidence?',
				choices: [
					{ id: 'a', label: 'The supported statement' },
					{ id: 'b', label: 'An unsupported statement' }
				],
				supportedResponseIds: ['a'],
				feedbackWhenSupported: 'Yes.',
				feedbackWhenNotYet: 'Look again.'
			}
		},
		review: {
			decision: 'approve',
			summary: 'An independent reviewer approved this lesson.',
			findings: []
		}
	};
}

describe('adaptApprovedVisualArtifact', () => {
	it('accepts only approved artifacts and sorts canonical states', () => {
		const lesson = adaptApprovedVisualArtifact(approvedTimelineArtifact());
		expect(lesson.nodes.map((node) => node.id)).toEqual(['unknown', 'inference', 'later']);
		expect(lesson.artifactVersion).toBe('2026-08-18T12:00:00.000Z');
		expect(lesson.check?.supportedResponseIds).toEqual(['a']);
	});

	it('rejects a non-approved artifact', () => {
		expect(() =>
			adaptApprovedVisualArtifact({ ...approvedTimelineArtifact(), status: 'rejected' })
		).toThrow();
	});

	it('rejects an artifact without an independent approval', () => {
		const artifact = approvedTimelineArtifact();
		delete (artifact as Partial<typeof artifact>).review;
		expect(() => adaptApprovedVisualArtifact(artifact)).toThrow();
	});

	it('adapts a contract-owned containment sequence', () => {
		const artifact = approvedTimelineArtifact();
		artifact.contract.visualModel = {
			kind: 'containment_sequence',
			states: [
				{
					id: 'soap',
					label: 'Soap interacts with grease',
					materialState: 'soap_interacting',
					sequenceIndex: 1
				},
				{
					id: 'grease',
					label: 'Grease on the surface',
					materialState: 'on_surface',
					sequenceIndex: 0
				}
			]
		} as never;
		artifact.draft.scenes[0].visualModelStateIds = ['soap'];
		const lesson = adaptApprovedVisualArtifact(artifact);
		expect(lesson.kind).toBe('containment-sequence');
		expect(lesson.nodes.map((node) => node.id)).toEqual(['grease', 'soap']);
	});

	it('rejects scene references outside the canonical model', () => {
		const artifact = approvedTimelineArtifact();
		artifact.draft.scenes[0].visualModelStateIds = ['missing'];
		expect(() => adaptApprovedVisualArtifact(artifact)).toThrow(
			'Scene 1 references unknown visual state: missing'
		);
	});
});
